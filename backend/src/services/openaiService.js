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
/**
 * Vérifie si la réponse OCR indique qu'il n'y a pas de texte
 */
function isNoTextResponse(text) {
  if (!text || text.length < 20) return true;

  const noTextPatterns = [
    /aucun texte/i,
    /pas de texte/i,
    /no text/i,
    /image ne contient pas/i,
    /ne contient aucun/i,
    /pas lisible/i,
    /illisible/i,
    /impossible.*lire/i,
    /je ne.*voir.*texte/i,
    /cette image.*montre/i,
    /l'image montre/i,
    /je vois/i,
    /on peut voir/i,
    /la photo montre/i
  ];

  return noTextPatterns.some(pattern => pattern.test(text));
}

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
              text: `TÂCHE: Extraire le texte d'un document/cours.

RÈGLES STRICTES:
1. Extrais UNIQUEMENT le texte écrit (imprimé ou manuscrit) visible dans l'image
2. NE DÉCRIS JAMAIS l'image ou ce qu'elle montre
3. Si tu ne vois PAS de texte de cours/document, réponds EXACTEMENT: AUCUN_TEXTE
4. Préserve la structure (paragraphes, titres, listes)
5. Pas de commentaires, pas d'explications

RÉPONSE: Le texte extrait OU "AUCUN_TEXTE"`
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

    const result = response.choices[0]?.message?.content?.trim() || '';

    // Vérifier si c'est une réponse "pas de texte"
    if (result === 'AUCUN_TEXTE' || isNoTextResponse(result)) {
      return '';
    }

    return result;
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
