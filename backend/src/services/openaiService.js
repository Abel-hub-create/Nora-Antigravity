/**
 * OpenAI Service Backend
 * Gère les appels à l'API OpenAI (Whisper, Vision, GPT)
 * La clé API est sécurisée côté serveur
 */

import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Transcription audio avec Whisper
 * @param {string} filePath - Chemin vers le fichier audio
 * @returns {Promise<string>} - Texte transcrit
 */
export async function transcribeAudio(filePath) {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: 'fr',
      response_format: 'text'
    });

    return transcription;
  } catch (error) {
    console.error('[OpenAI] Erreur transcription Whisper:', error);
    throw new Error(`Erreur transcription: ${error.message}`);
  }
}

/**
 * OCR avec GPT-4 Vision
 * @param {string} base64Image - Image encodée en base64
 * @returns {Promise<string>} - Texte extrait
 */
export async function extractTextFromImage(base64Image) {
  try {
    // Nettoyer le préfixe data URL si présent
    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Tu es un assistant d'extraction de texte. Extrais TOUT le texte visible dans cette image.

Instructions:
- Extrais le texte exactement comme il apparaît
- Préserve la structure (paragraphes, listes, titres)
- Si c'est un document manuscrit, fais de ton mieux pour lire l'écriture
- Si l'image ne contient pas de texte lisible, réponds "Aucun texte détecté"
- Ne fais aucun commentaire, retourne uniquement le texte extrait`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageData}`
              }
            }
          ]
        }
      ],
      max_tokens: 4096
    });

    return response.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('[OpenAI] Erreur OCR Vision:', error);
    throw new Error(`Erreur OCR: ${error.message}`);
  }
}

/**
 * OCR pour plusieurs images
 * @param {string[]} base64Images - Tableau d'images en base64
 * @returns {Promise<string>} - Texte combiné
 */
export async function extractTextFromImages(base64Images) {
  const results = [];

  for (const image of base64Images) {
    try {
      const text = await extractTextFromImage(image);
      if (text && text !== 'Aucun texte détecté') {
        results.push(text);
      }
    } catch (error) {
      console.error('[OpenAI] Erreur OCR pour une image:', error);
    }
  }

  return results.join('\n\n');
}

export default {
  transcribeAudio,
  extractTextFromImage,
  extractTextFromImages
};
