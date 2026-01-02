/**
 * Content Generation Service
 *
 * Gere la generation centralisee de contenu pedagogique via ChatGPT.
 * Ce service incarne la personnalite de Nora : calme, structuree, pedagogique.
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 4500;

/**
 * Prompt systeme definissant la personnalite de Nora
 */
const SYSTEM_PROMPT = `Tu es Nora, une application d'etude calme, structuree et pedagogique.

Ton role est d'aider les utilisateurs a comprendre et retenir leurs cours sans pression.
Tu transformes le contenu brut en materiel d'apprentissage clair et efficace.

Principes fondamentaux :
- Langage simple et accessible, pas de jargon inutile
- Ton neutre et bienveillant, jamais condescendant
- Fidelite absolue au contenu original
- Structure claire et logique
- Pas d'emojis, pas de formules excessives`;

/**
 * Prompt utilisateur pour la generation complete
 */
const buildUserPrompt = (content) => `Analyse ce contenu de cours et genere du materiel pedagogique complet.

CONTENU DU COURS :
"""
${content}
"""

Tu dois generer un JSON avec exactement cette structure :

{
  "title": "Titre court et precis du cours (maximum 50 caracteres)",
  "summary": "INSTRUCTIONS POUR LA SYNTHESE - Tu dois produire une vraie synthese structuree, pas un resume ultra-court et pas une reformulation longue. Contraintes obligatoires : La synthese doit etre claire, precise et complete sur l'essentiel. Elle doit etre nettement plus courte que le cours original, mais assez developpee pour reviser correctement. Tu conserves toutes les notions importantes, definitions cles, regles, mecanismes et liens logiques. Tu supprimes uniquement les exemples secondaires, anecdotes et repetitions. Tu expliques avec des mots simples, sans jargon inutile. Tu ne fais pas une synthese en 3 lignes : chaque idee importante doit etre expliquee en 1-2 phrases maximum. FORMAT OBLIGATOIRE : Utilise des titres clairs (## Titre), des bullet points (- item), des paragraphes courts, une idee par ligne. OBJECTIF : Que l'utilisateur puisse relire cette synthese et comprendre + memoriser le cours sans retourner au texte original.",
  "flashcards": [
    {"front": "Question ou concept a retenir", "back": "Reponse claire et complete", "difficulty": "easy"},
    {"front": "...", "back": "...", "difficulty": "easy"},
    {"front": "...", "back": "...", "difficulty": "medium"},
    {"front": "...", "back": "...", "difficulty": "medium"},
    {"front": "...", "back": "...", "difficulty": "medium"},
    {"front": "...", "back": "...", "difficulty": "hard"}
  ],
  "quizQuestions": [
    {
      "question": "Question claire et precise",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explication de pourquoi cette reponse est correcte"
    },
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": 0,
      "explanation": "..."
    },
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": 0,
      "explanation": "..."
    },
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": 0,
      "explanation": "..."
    }
  ]
}

REGLES STRICTES :
1. Exactement 6 flashcards : 2 easy, 3 medium, 1 hard
2. Exactement 4 questions quiz avec 4 options chacune
3. correctAnswer est l'index (0, 1, 2 ou 3) de la bonne reponse
4. Les flashcards et le quiz doivent etre bases sur la synthese
5. Tout doit etre coherent et couvrir les points essentiels du cours
6. Retourne UNIQUEMENT le JSON, sans texte avant ou apres`;

/**
 * Parse et valide la reponse JSON de l'API
 */
function parseAndValidateResponse(text) {
  // Nettoyer les eventuels marqueurs markdown
  let cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // Extraire l'objet JSON
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start === -1 || end === -1) {
    throw new Error('Format JSON invalide dans la reponse');
  }

  cleaned = cleaned.substring(start, end + 1);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error('Impossible de parser le JSON: ' + e.message);
  }

  // Valider la structure
  if (!parsed.title || typeof parsed.title !== 'string') {
    throw new Error('Titre manquant ou invalide');
  }

  if (!parsed.summary || typeof parsed.summary !== 'string') {
    throw new Error('Synthese manquante ou invalide');
  }

  if (!Array.isArray(parsed.flashcards) || parsed.flashcards.length !== 6) {
    throw new Error(`Nombre de flashcards incorrect: ${parsed.flashcards?.length || 0}/6`);
  }

  if (!Array.isArray(parsed.quizQuestions) || parsed.quizQuestions.length !== 4) {
    throw new Error(`Nombre de questions incorrect: ${parsed.quizQuestions?.length || 0}/4`);
  }

  // Normaliser et valider les flashcards
  const flashcards = parsed.flashcards.map((fc, index) => {
    if (!fc.front || !fc.back) {
      throw new Error(`Flashcard ${index + 1} incomplete (front ou back manquant)`);
    }
    return {
      front: String(fc.front).trim(),
      back: String(fc.back).trim(),
      difficulty: ['easy', 'medium', 'hard'].includes(fc.difficulty) ? fc.difficulty : 'medium'
    };
  });

  // Normaliser et valider les questions quiz
  const quizQuestions = parsed.quizQuestions.map((q, index) => {
    if (!q.question) {
      throw new Error(`Question ${index + 1} manquante`);
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`Question ${index + 1} doit avoir exactement 4 options`);
    }
    const correctAnswer = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
    if (correctAnswer < 0 || correctAnswer > 3) {
      throw new Error(`Index de reponse invalide pour question ${index + 1}`);
    }
    return {
      question: String(q.question).trim(),
      options: q.options.map(opt => String(opt).trim()),
      correctAnswer: correctAnswer,
      explanation: String(q.explanation || '').trim()
    };
  });

  return {
    title: parsed.title.trim().substring(0, 255),
    summary: parsed.summary.trim(),
    flashcards,
    quizQuestions
  };
}

/**
 * Genere le contenu pedagogique complet en un seul appel API
 *
 * @param {string} content - Le contenu du cours a analyser
 * @returns {Promise<Object>} - { title, summary, flashcards, quizQuestions }
 */
export async function generateEducationalContent(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('Contenu invalide');
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length < 30) {
    throw new Error('Le texte extrait est trop court. Prenez une photo plus nette avec plus de contenu visible.');
  }

  if (trimmedContent.length > 100000) {
    throw new Error('Contenu trop long (maximum 100000 caracteres)');
  }

  try {
    console.log('[ContentGen] Generation en cours...');
    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: buildUserPrompt(trimmedContent)
        }
      ],
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error('Reponse vide de l\'API');
    }

    const validatedContent = parseAndValidateResponse(rawContent);

    const duration = Date.now() - startTime;
    const tokens = response.usage?.total_tokens || 'N/A';
    console.log(`[ContentGen] Succes en ${duration}ms (${tokens} tokens)`);

    return validatedContent;

  } catch (error) {
    console.error('[ContentGen] Erreur:', error.message);

    // Erreurs specifiques OpenAI
    if (error.code === 'insufficient_quota') {
      throw new Error('Quota API depasse. Veuillez reessayer plus tard.');
    }

    if (error.code === 'rate_limit_exceeded') {
      throw new Error('Trop de requetes. Veuillez patienter quelques secondes.');
    }

    if (error.status === 401) {
      throw new Error('Erreur d\'authentification API');
    }

    // Erreurs de parsing
    if (error.message.includes('JSON') || error.message.includes('parser')) {
      throw new Error('Erreur de format. Veuillez reessayer.');
    }

    throw error;
  }
}

export default {
  generateEducationalContent
};
