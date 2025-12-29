/**
 * OpenAI Service - Generation de contenu educatif
 *
 * Ce service gere la generation de contenu pedagogique via le backend.
 * L'appel principal generateComplete() utilise /api/ai/generate-content
 * qui genere titre, synthese, flashcards et quiz en un seul appel.
 */

import api from '../lib/api';

// Les fonctions individuelles sont conservees pour le mode mock uniquement
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';
const API_URL = 'https://api.openai.com/v1/chat/completions';

// Verifier si l'API est configuree (mode mock si pas de cle)
const isApiConfigured = () => !!API_KEY && API_KEY !== '';

/**
 * Prompts optimisés pour la génération de contenu éducatif en français
 */
const PROMPTS = {
  // Génération d'un titre à partir du contenu
  title: (content) => `Tu es un assistant éducatif. Génère un titre court (max 50 caractères) pour ce contenu de cours:

"""
${content.substring(0, 500)}
"""

Réponds uniquement avec le titre, sans guillemets ni ponctuation finale.`,

  // Génération d'une synthèse
  summary: (content) => `Tu es un assistant éducatif expert en pédagogie. Crée une synthèse claire et structurée de ce contenu de cours en français.

Contenu du cours:
"""
${content}
"""

Instructions:
- Résume en 200-400 mots maximum
- Identifie et mets en avant les concepts clés
- Structure avec des paragraphes clairs
- Utilise un langage accessible
- Reste fidèle au contenu original

Synthèse:`,

  // Génération de flashcards
  flashcards: (content, count = 6) => `Tu es un assistant éducatif. Génère exactement ${count} flashcards éducatives au format JSON à partir de ce contenu.

Contenu:
"""
${content}
"""

Retourne UNIQUEMENT un tableau JSON valide (sans markdown, sans explication):
[
  {"front": "Question ou concept", "back": "Réponse ou explication", "difficulty": "easy"},
  {"front": "...", "back": "...", "difficulty": "medium"},
  ...
]

Critères:
- Exactement ${count} flashcards
- "front": question claire et concise
- "back": réponse complète mais synthétique
- "difficulty": "easy", "medium" ou "hard"
- Équilibre: 2 easy, 3 medium, 1 hard (pour 6 cartes)
- Couvrir les concepts les plus importants`,

  // Génération de quiz
  quiz: (content, count = 4) => `Tu es un assistant éducatif. Génère exactement ${count} questions à choix multiples au format JSON.

Contenu:
"""
${content}
"""

Retourne UNIQUEMENT un tableau JSON valide (sans markdown, sans explication):
[
  {
    "question": "Question claire et précise",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Explication de pourquoi c'est la bonne réponse"
  }
]

Critères:
- Exactement ${count} questions
- Toujours 4 options par question
- "correctAnswer": index de 0 à 3
- Distracteurs plausibles mais incorrects
- Questions variées en difficulté`
};

/**
 * Données mock pour le développement (quand l'API n'est pas configurée)
 */
const MOCK_DATA = {
  title: (content) => {
    const words = content.split(' ').slice(0, 5).join(' ');
    return words.length > 40 ? words.substring(0, 40) + '...' : words || 'Nouveau cours';
  },

  summary: (content) => `Ceci est une synthèse de démonstration.

Le contenu original traite des concepts suivants. Cette synthèse sera générée automatiquement par l'intelligence artificielle une fois l'API OpenAI connectée.

Points clés identifiés:
• Concept principal du cours
• Éléments importants à retenir
• Applications pratiques

Note: Connectez l'API OpenAI pour obtenir une vraie synthèse personnalisée.`,

  flashcards: [
    { front: "Qu'est-ce que ce cours présente ?", back: "Les concepts fondamentaux du sujet étudié.", difficulty: "easy" },
    { front: "Quel est le concept principal ?", back: "Le concept sera identifié automatiquement par l'IA.", difficulty: "easy" },
    { front: "Comment appliquer ces connaissances ?", back: "Par la pratique régulière et la révision espacée.", difficulty: "medium" },
    { front: "Pourquoi ce sujet est-il important ?", back: "Il constitue une base essentielle pour la compréhension.", difficulty: "medium" },
    { front: "Quels sont les points clés à retenir ?", back: "Les flashcards personnalisées seront générées par l'IA.", difficulty: "medium" },
    { front: "Comment approfondir ce sujet ?", back: "Consultez les ressources complémentaires et pratiquez.", difficulty: "hard" }
  ],

  quizQuestions: [
    {
      question: "Quel est l'objectif principal de cette leçon ?",
      options: ["Comprendre les bases", "Mémoriser par cœur", "Ignorer les détails", "Aucune de ces réponses"],
      correctAnswer: 0,
      explanation: "L'objectif est toujours de comprendre les bases pour construire des connaissances solides."
    },
    {
      question: "Quelle méthode d'apprentissage est recommandée ?",
      options: ["Lecture passive", "Révision espacée", "Bachotage intensif", "Aucune révision"],
      correctAnswer: 1,
      explanation: "La révision espacée est scientifiquement prouvée comme la méthode la plus efficace."
    },
    {
      question: "Comment valider sa compréhension ?",
      options: ["Relire plusieurs fois", "Tester ses connaissances avec des quiz", "Attendre l'examen", "Copier les notes"],
      correctAnswer: 1,
      explanation: "Se tester activement permet d'identifier les lacunes et de renforcer la mémorisation."
    },
    {
      question: "Que permet l'IA dans ce contexte ?",
      options: ["Remplacer l'étude", "Générer du contenu personnalisé", "Tricher aux examens", "Rien d'utile"],
      correctAnswer: 1,
      explanation: "L'IA aide à créer du contenu d'étude personnalisé comme des synthèses et des quiz."
    }
  ]
};

/**
 * Appel à l'API OpenAI
 */
async function callOpenAI(prompt, maxTokens = 1000) {
  if (!isApiConfigured()) {
    throw new Error('API_NOT_CONFIGURED');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Tu es un assistant éducatif expert en pédagogie, spécialisé dans la création de contenu d\'apprentissage en français.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim() || '';
}

/**
 * Parse JSON depuis la réponse de l'API (gère les cas avec markdown)
 */
function parseJSON(text) {
  // Nettoyer le texte (enlever les backticks markdown si présents)
  let cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // Trouver le tableau JSON
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');

  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }

  return JSON.parse(cleaned);
}

/**
 * Génère un titre pour le contenu
 */
export async function generateTitle(content) {
  if (!isApiConfigured()) {
    console.log('[OpenAI] Mode mock - Génération titre simulée');
    return MOCK_DATA.title(content);
  }

  try {
    const title = await callOpenAI(PROMPTS.title(content), 100);
    return title.replace(/^["']|["']$/g, '').trim();
  } catch (error) {
    console.error('[OpenAI] Erreur génération titre:', error);
    return MOCK_DATA.title(content);
  }
}

/**
 * Génère une synthèse du contenu
 */
export async function generateSummary(content) {
  if (!isApiConfigured()) {
    console.log('[OpenAI] Mode mock - Génération synthèse simulée');
    await simulateDelay(1500);
    return MOCK_DATA.summary(content);
  }

  try {
    return await callOpenAI(PROMPTS.summary(content), 800);
  } catch (error) {
    console.error('[OpenAI] Erreur génération synthèse:', error);
    throw error;
  }
}

/**
 * Génère des flashcards à partir du contenu
 */
export async function generateFlashcards(content, count = 6) {
  if (!isApiConfigured()) {
    console.log('[OpenAI] Mode mock - Génération flashcards simulée');
    await simulateDelay(1200);
    return MOCK_DATA.flashcards.slice(0, count);
  }

  try {
    const response = await callOpenAI(PROMPTS.flashcards(content, count), 1200);
    const flashcards = parseJSON(response);

    // Valider et normaliser les données
    return flashcards.map(fc => ({
      front: fc.front || '',
      back: fc.back || '',
      difficulty: ['easy', 'medium', 'hard'].includes(fc.difficulty) ? fc.difficulty : 'medium'
    }));
  } catch (error) {
    console.error('[OpenAI] Erreur génération flashcards:', error);
    throw error;
  }
}

/**
 * Génère des questions de quiz à partir du contenu
 */
export async function generateQuizQuestions(content, count = 4) {
  if (!isApiConfigured()) {
    console.log('[OpenAI] Mode mock - Génération quiz simulée');
    await simulateDelay(1000);
    return MOCK_DATA.quizQuestions.slice(0, count);
  }

  try {
    const response = await callOpenAI(PROMPTS.quiz(content, count), 1500);
    const questions = parseJSON(response);

    // Valider et normaliser les données
    return questions.map(q => ({
      question: q.question || '',
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['A', 'B', 'C', 'D'],
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      explanation: q.explanation || ''
    }));
  } catch (error) {
    console.error('[OpenAI] Erreur génération quiz:', error);
    throw error;
  }
}

/**
 * Genere tout le contenu en une fois via le backend
 * Appel centralise cote serveur pour securite et optimisation
 *
 * @param {string} content - Le contenu du cours
 * @returns {Promise<Object>} - { title, summary, flashcards, quizQuestions }
 */
export async function generateComplete(content) {
  try {
    const data = await api.post('/ai/generate-content', { content });

    return {
      title: data.title,
      summary: data.summary,
      flashcards: data.flashcards,
      quizQuestions: data.quizQuestions
    };

  } catch (error) {
    console.error('[OpenAI] Erreur generation complete:', error);

    // Extraire le message d'erreur
    const errorMessage = error?.response?.data?.error || error?.message || 'Erreur lors de la génération';
    throw new Error(errorMessage);
  }
}

/**
 * Vérifie si l'API OpenAI est configurée et fonctionnelle
 */
export async function checkApiStatus() {
  if (!isApiConfigured()) {
    return {
      configured: false,
      working: false,
      message: 'API OpenAI non configurée. Mode démonstration actif.'
    };
  }

  try {
    // Test simple pour vérifier que l'API fonctionne
    await callOpenAI('Dis "ok"', 10);
    return {
      configured: true,
      working: true,
      message: 'API OpenAI connectée et fonctionnelle.'
    };
  } catch (error) {
    return {
      configured: true,
      working: false,
      message: `Erreur API: ${error.message}`
    };
  }
}

/**
 * Retourne si le mode mock est actif
 * Toujours false car on utilise le backend
 */
export function isMockMode() {
  return false;
}

/**
 * Simule un délai pour le mode mock (plus réaliste)
 */
function simulateDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  generateTitle,
  generateSummary,
  generateFlashcards,
  generateQuizQuestions,
  generateComplete,
  checkApiStatus,
  isMockMode
};
