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
const MAX_TOKENS = 10000;

/**
 * Detecte la langue dominante du contenu
 * @param {string} content - Le contenu a analyser
 * @returns {string} - 'english' ou 'french'
 */
function detectLanguage(content) {
  // Mots francais courants
  const frenchWords = /\b(le|la|les|de|du|des|un|une|est|sont|dans|pour|avec|sur|par|que|qui|ce|cette|ces|nous|vous|ils|elles|mais|ou|et|donc|car|avoir|etre|faire|dit|peut|plus|tout|comme|bien|aussi|entre|deux|tres|sans|fait|encore|leurs|notre|votre|meme|quand|apres|avant|depuis|sous|chez|vers|cette)\b/gi;

  // Mots anglais courants
  const englishWords = /\b(the|a|an|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can|this|that|these|those|it|its|they|them|their|we|our|you|your|he|she|him|her|his|with|for|from|into|onto|upon|about|after|before|between|through|during|without|within|along|among|against|because|since|until|while|where|when|which|who|whom|whose|what|how|why|but|and|or|nor|so|yet|both|either|neither|not|only|also|just|even|still|already|always|never|often|sometimes|usually|very|really|quite|rather|too|much|many|more|most|some|any|few|all|each|every)\b/gi;

  const frenchCount = (content.match(frenchWords) || []).length;
  const englishCount = (content.match(englishWords) || []).length;

  console.log(`[Lang] French words: ${frenchCount}, English words: ${englishCount}`);

  return englishCount > frenchCount ? 'english' : 'french';
}

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
- Pas d'emojis, pas de formules excessives

REGLE IMPORTANTE SUR LA LANGUE :
- Tu dois detecter automatiquement la langue du contenu du cours (francais, anglais, ou autre)
- Tu dois TOUJOURS repondre dans la MEME LANGUE que le contenu original
- Si le cours est en anglais, genere tout en anglais (titre, synthese, flashcards, quiz)
- Si le cours est en francais, genere tout en francais
- Ne melange jamais les langues`;

/**
 * Prompt utilisateur pour la generation complete
 * @param {string} content - Le contenu du cours
 * @param {string|null} specificInstructions - Instructions specifiques de l'utilisateur
 */
const buildUserPrompt = (content, specificInstructions = null) => {
  // Detecter la langue du contenu
  const detectedLang = detectLanguage(content);
  const langInstruction = detectedLang === 'english'
    ? 'The course content is in ENGLISH. You MUST generate ALL content (title, summary, flashcards, quiz) in ENGLISH. Do NOT translate to French.'
    : 'Le contenu du cours est en FRANCAIS. Tu DOIS generer TOUT le contenu (titre, synthese, flashcards, quiz) en FRANCAIS. Ne traduis PAS en anglais.';

  console.log(`[ContentGen] Detected language: ${detectedLang}`);

  let prompt = `MANDATORY LANGUAGE RULE / REGLE DE LANGUE OBLIGATOIRE:
${langInstruction}

Analyse ce contenu de cours et genere du materiel pedagogique complet.

CONTENU DU COURS :
"""
${content}
"""

Tu dois generer un JSON avec exactement cette structure :

{
  "title": "Titre court et precis du cours (maximum 50 caracteres)",
  "summary": "La synthese complete selon les regles ci-dessous",
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

===== REGLES DETAILLEES POUR LA SYNTHESE =====

PRINCIPE FONDAMENTAL :
La synthese doit etre COMPLETE. Meme si elle est plus courte que le cours original, elle doit contenir TOUTES les informations importantes pour que l'utilisateur puisse reviser uniquement avec la synthese, sans retourner au cours original. Si le cours est long, la synthese peut faire plusieurs pages - c'est normal et souhaite.

REGLES GENERALES (OBLIGATOIRES) :
- La synthese est plus courte que le cours mais reste COMPLETE sur le fond
- Chaque notion importante du cours doit etre presente et bien expliquee
- Le langage doit etre : simple, familier, clair, sans jargon inutile
- La synthese doit rester : precise, rigoureuse, comprehensible par un collegien ou lyceen
- Aucun ajout d'information exterieure au cours

STRUCTURE DE LA SYNTHESE :

1. TITRE
   - Clair et representatif du contenu

2. DEFINITIONS (SEULEMENT si le cours contient des definitions)
   - Section "## Definitions" avec TOUTES les definitions du cours
   - Chaque definition doit etre claire et complete
   - Si le cours ne contient AUCUNE definition, ne PAS creer cette section
   - Format : **Terme** : definition complete

3. POINTS CLES DU COURS
   - Section "## Points cles" ou titre adapte au contenu
   - Extraire et expliquer TOUTES les idees importantes
   - Respecter l'ordre logique du cours
   - Chaque point doit etre suffisamment developpe pour etre compris seul
   - Ne pas sacrifier la clarte pour la brievete

4. LIENS ENTRE LES NOTIONS
   - Faire des liens explicites entre les differentes notions quand c'est pertinent
   - Expliquer les relations de cause a effet
   - Montrer comment les concepts s'articulent entre eux
   - Utiliser des phrases comme "Cela s'explique par...", "Ce qui entraine...", "A l'inverse de..."

5. ANALOGIES ET METAPHORES (pour les notions complexes)
   - Pour chaque notion difficile, proposer une analogie simple du quotidien
   - L'analogie doit aider a visualiser ou comprendre intuitivement le concept
   - Format suggere : "Pour comprendre simplement : [analogie]" ou "C'est comme si..."
   - L'analogie complete l'explication, elle ne la remplace pas

FORMAT DE LA SYNTHESE (TRES IMPORTANT) :
- Utilise des titres clairs avec ## pour les sections principales
- REDIGE DE VRAIES PHRASES EN PARAGRAPHES, pas uniquement des tirets
- Les bullet points (- item) sont autorises pour les listes, mais accompagnes d'explications
- La synthese PEUT et DOIT faire plusieurs pages si le cours est long
- Objectif : l'utilisateur doit pouvoir reexpliquer TOUT le cours avec la synthese seule
- Ne jamais tronquer ou simplifier a l'exces : une synthese incomplete est inutile

===== REGLES POUR FLASHCARDS ET QUIZ =====

1. Exactement 6 flashcards : 2 easy, 3 medium, 1 hard
2. Exactement 4 questions quiz avec 4 options chacune
3. correctAnswer est l'index (0, 1, 2 ou 3) de la bonne reponse
4. Les flashcards et le quiz doivent etre bases sur la synthese
5. Tout doit etre coherent et couvrir les points essentiels du cours
6. Retourne UNIQUEMENT le JSON, sans texte avant ou apres
7. RAPPEL LANGUE : Respecte la langue indiquee au debut. English content = English output. Contenu francais = sortie francaise.`;

  // Ajouter les instructions specifiques si presentes
  if (specificInstructions && specificInstructions.trim()) {
    prompt += `

===== ELEMENTS IMPORTANTS INDIQUES PAR L'UTILISATEUR =====

L'utilisateur a indique que les elements suivants sont importants :
"""
${specificInstructions.trim()}
"""

REGLES STRICTES POUR CES ELEMENTS :
- Ces elements DOIVENT toujours etre inclus dans la synthese
- Ils doivent etre clairement expliques, jamais supprimes ou dilues
- Tu ne peux les inclure QUE s'ils figurent reellement dans le contenu du cours
- Si un element demande n'existe PAS dans le cours, tu l'ignores completement
- Tu ne dois JAMAIS inventer ou ajouter des informations qui ne sont pas dans le cours original`;
  }

  return prompt;
};

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
 * @param {string|null} specificInstructions - Instructions specifiques de l'utilisateur (optionnel)
 * @returns {Promise<Object>} - { title, summary, flashcards, quizQuestions }
 */
export async function generateEducationalContent(content, specificInstructions = null) {
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
          content: buildUserPrompt(trimmedContent, specificInstructions)
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
