/**
 * Content Generation Service
 *
 * Gere la generation centralisee de contenu pedagogique via ChatGPT.
 * Ce service incarne la personnalite de Nora : calme, structuree, pedagogique.
 */

import OpenAI from 'openai';
import { getSubjectPrompt } from './subjectPrompts.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 10000;

/**
 * Construit les consignes spécifiques à une matière
 * @param {string} subject - Identifiant de la matière
 * @returns {string} - Consignes formatées pour le prompt
 */
function buildSubjectGuidelines(subject) {
  const subjectPrompt = getSubjectPrompt(subject);
  if (!subjectPrompt) {
    return '(Matiere non reconnue - utilise les regles generales)';
  }

  console.log(`[ContentGen] Utilisation des prompts specialises pour: ${subject}`);

  return `
MATIERE SELECTIONNEE : ${subject.toUpperCase()}

${subjectPrompt.guidelines}

SECTIONS RECOMMANDEES POUR CETTE MATIERE :
${subjectPrompt.sections.map((section, idx) => `${idx + 1}. ${section}`).join('\n')}

ACCENT PARTICULIER : ${subjectPrompt.emphasis}

REGLES IMPORTANTES :
- Ces sections sont des RECOMMANDATIONS - n'inclus une section QUE si le contenu existe dans le cours
- N'inclus une section "Definitions" QUE SI l'utilisateur l'a explicitement demande dans ses instructions
- La derniere section doit etre "Tableaux et Donnees Structurees" SI des tableaux existent dans le cours
- N'invente PAS de sections si le contenu n'existe pas
- Adapte les titres de sections au contenu reel du cours
- Si le cours ne correspond pas a ces sections, cree des sections logiques basees sur la structure du cours
`;
}

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
- Structure claire et logique
- Pas d'emojis, pas de formules excessives

=== REGLE ABSOLUE DE FIDELITE AU CONTENU (NON NEGOCIABLE) ===

Tu dois respecter une FIDELITE ABSOLUE au contenu du cours fourni :

1. TU NE DOIS JAMAIS INVENTER de contenu :
   - Aucune notion qui n'est pas dans le cours
   - Aucun exemple qui n'est pas dans le cours
   - Aucune information complementaire de ta connaissance generale
   - Aucune definition qui n'est pas dans le cours

2. TU DOIS UNIQUEMENT :
   - Reformuler ce qui est DEJA dans le cours
   - Reorganiser les informations EXISTANTES
   - Simplifier le langage du cours SANS ajouter d'idees

3. SI une information n'est PAS dans le cours :
   - NE L'INCLUS PAS dans la synthese
   - NE L'INCLUS PAS dans les flashcards
   - NE L'INCLUS PAS dans le quiz
   - Meme si tu connais le sujet, IGNORE tes connaissances

4. VERIFICATION : Avant d'inclure quoi que ce soit, demande-toi :
   "Est-ce que cette information est EXPLICITEMENT dans le cours fourni ?"
   Si NON → Ne l'inclus pas

=== REGLE SUR LA LANGUE ===

- Detecte automatiquement la langue du cours (francais, anglais, etc.)
- Reponds TOUJOURS dans la MEME LANGUE que le contenu original
- Ne melange jamais les langues`;

/**
 * Prompt utilisateur pour la generation complete
 * @param {string} content - Le contenu du cours
 * @param {string|null} specificInstructions - Instructions specifiques de l'utilisateur
 * @param {string|null} subject - Matière sélectionnée par l'utilisateur (ex: 'mathematics')
 */
const buildUserPrompt = (content, specificInstructions = null, subject = null) => {
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

===== REGLES STRICTES POUR LA SYNTHESE (A RESPECTER ABSOLUMENT) =====

⚠️ FORMAT OBLIGATOIRE : La synthese DOIT utiliser le format MARKDOWN avec des titres ## et ###
⚠️ NE JAMAIS ecrire un simple paragraphe de texte - TOUJOURS structurer avec des sections ##

1. LONGUEUR
   - Ta synthese doit etre PLUS COURTE que le cours original tout en restant COMPLETE
   - Adaptation a la longueur du cours :
     * Court cours (1-2 pages) → Synthese de 0.5 a 1 page
     * Cours moyen (3-5 pages) → Synthese de 1 a 2 pages
     * Long cours (6-10 pages) → Synthese de 2 a 4 pages
     * Tres long cours (10+ pages) → Synthese de 4 a 6+ pages
   - Une synthese courte mais vide est inutile : elle doit etre condensee MAIS complete

2. LANGAGE
   - Utilise un langage SIMPLE et ACCESSIBLE dans toute la synthese
   - EXCEPTION : Les definitions doivent rester RIGOUREUSES et PRECISES (vocabulaire technique exact)
   - Phrases courtes et claires

3. STRUCTURE MARKDOWN OBLIGATOIRE
   - Utilise OBLIGATOIREMENT les titres markdown : ## pour les sections, ### pour les sous-sections
   - Format des definitions : - **Terme** : definition rigoureuse
   - Ensuite une section "## NOM DU CONCEPT" pour CHAQUE concept principal

4. SECTIONS DYNAMIQUES
   - N'inclus une section QUE si elle contient du contenu pertinent trouve dans le cours
   - Ne cree JAMAIS de sections vides

5. REGLE CRITIQUE SUR LES DEFINITIONS
   - Par defaut, NE METS PAS de section "DEFINITIONS ET CONCEPTS IMPORTANTS"
   - Tu n'inclus une section definitions QUE SI l'utilisateur a explicitement demande des definitions dans ses instructions
   - Si l'utilisateur demande des definitions specifiques, inclus UNIQUEMENT celles qu'il a demandees (pas d'autres)
   - Sans instructions de l'utilisateur concernant les definitions → AUCUNE section definitions

5. TABLEAUX ET DONNEES STRUCTUREES (REGLE CRITIQUE)

   COMMENT IDENTIFIER UN TABLEAU DANS LE COURS - Un tableau peut se presenter sous PLUSIEURS formes :

   FORMAT 1 - Donnees en colonnes alignees :
   Nom         Age       Ville
   Pierre      25        Paris

   FORMAT 2 - Donnees separees par des tirets/pipes :
   Nom | Age | Ville

   FORMAT 3 - Liste avec structure repetitive :
   Type : Respiration, Presence O2 : Oui, Energie : Elevee
   Type : Fermentation, Presence O2 : Non, Energie : Faible

   FORMAT 4 - Comparaisons structurees :
   Respiration vs Fermentation :
   - Respiration : avec oxygene, beaucoup d'energie
   - Fermentation : sans oxygene, peu d'energie

   FORMAT 5 - Listes a puces avec categories et valeurs :
   Depenses energetiques :
   - Metabolisme de base : 60-70%
   - Digestion : 10%
   - Variables : 25%

   SI TU DETECTES UN DE CES FORMATS :
   → Cree OBLIGATOIREMENT une section "## TABLEAUX ET DONNEES STRUCTUREES"
   → Transforme les donnees en tableau markdown propre
   → Conserve TOUTES les informations

   FORMAT MARKDOWN OBLIGATOIRE :
   | En-tete 1 | En-tete 2 | En-tete 3 |
   |-----------|-----------|-----------|
   | Valeur A  | Valeur B  | Valeur C  |

   EXEMPLE DE TRANSFORMATION :
   ENTREE : "Depenses : Metabolisme 60-70%, Digestion 10%, Variables 25%"
   SORTIE :
   | Type de depense      | Pourcentage |
   |----------------------|-------------|
   | Metabolisme de base  | 60-70%      |
   | Digestion            | 10%         |
   | Depenses variables   | 25%         |

   ASTUCE - Cherche dans le cours :
   - Des pourcentages listes
   - Des comparaisons entre elements
   - Des categories avec valeurs associees
   - Des listes avec structure repetitive
   - Des donnees chiffrees organisees
   - Des classifications ou typologies
   → Si tu trouves ca, c'est probablement un tableau a creer !

   EXCEPTION : Si AUCUNE donnee structuree n'est trouvee → Ne cree PAS cette section

===== EXEMPLE DE SYNTHESE CORRECTEMENT FORMATEE =====
(Note: Cet exemple N'INCLUT PAS de section definitions car l'utilisateur ne les a pas demandees)

## LES DEPENSES ENERGETIQUES
Les depenses energetiques d'un adulte se repartissent en trois categories principales...

### Metabolisme de base (60-70%)
Energie necessaire pour maintenir les fonctions vitales au repos...

### Depenses de digestion (10%)
Energie utilisee pour digerer, absorber et stocker les nutriments...

### Depenses variables (25%)
Energie depensee lors du travail musculaire et des etats particuliers...

## LA RESPIRATION CELLULAIRE
La respiration cellulaire transforme le glucose et l'oxygene en energie utilisable par la cellule. Ce processus se deroule dans les mitochondries et suit l'equation :

C6H12O6 + 6O2 → 6CO2 + 6H2O + energie

Les dechets produits sont le dioxyde de carbone (CO2) et l'eau (H2O).

## LA FERMENTATION
En absence d'oxygene, les cellules utilisent la fermentation comme alternative a la respiration.

### Fermentation alcoolique
Produit de l'ethanol et du CO2. Utilisee dans la production de pain et de boissons alcoolisees.

### Fermentation lactique
Produit de l'acide lactique. Se produit dans les muscles lors d'efforts intenses.

## TABLEAUX ET DONNEES STRUCTUREES

| Type de processus | Presence d'O2 | Energie produite | Dechets principaux |
|-------------------|---------------|------------------|--------------------|
| Respiration       | Oui           | Elevee           | CO2 + H2O          |
| Fermentation      | Non           | Faible           | Ethanol ou Lactate |

===== FIN DE L'EXEMPLE =====

⚠️ RAPPEL CRITIQUE : Ta synthese DOIT ressembler a l'exemple ci-dessus avec des ## et ### - PAS un paragraphe de texte brut !

===== CONSIGNES SPECIFIQUES PAR MATIERE =====
${subject ? buildSubjectGuidelines(subject) : '(Aucune matiere specifiee - utilise les regles generales)'}

===== REGLES POUR FLASHCARDS ET QUIZ =====

1. Exactement 6 flashcards : 2 easy, 3 medium, 1 hard
2. Exactement 4 questions quiz avec 4 options chacune
3. correctAnswer est l'index (0, 1, 2 ou 3) de la bonne reponse
4. Les flashcards et le quiz doivent etre bases UNIQUEMENT sur le contenu du cours
5. Retourne UNIQUEMENT le JSON, sans texte avant ou apres
6. RAPPEL LANGUE : Respecte la langue indiquee au debut.

===== RAPPEL FINAL CRITIQUE =====

⚠️ AVANT DE GENERER, VERIFIE QUE :
- Chaque information dans ta synthese est PRESENTE dans le cours original
- Chaque flashcard porte sur un element DU COURS
- Chaque question quiz porte sur un element DU COURS
- Tu n'as RIEN AJOUTE de tes connaissances personnelles
- Tu n'as INVENTE aucune notion, aucun exemple, aucune definition

Si tu n'es pas sur qu'une information est dans le cours → NE L'INCLUS PAS`;

  // Ajouter les instructions specifiques si presentes
  if (specificInstructions && specificInstructions.trim()) {
    prompt += `

===== INSTRUCTIONS SPECIFIQUES DE L'UTILISATEUR =====

${specificInstructions.trim()}

===== REGLES ABSOLUES ET NON NEGOCIABLES =====

REGLE #1 - DEFINITIONS (CRITIQUE, A RESPECTER IMPERATIVEMENT) :
- Les instructions ci-dessus contiennent DEUX sections distinctes et SEPAREES :
  1. "DEFINITIONS A INCLURE ABSOLUMENT" = liste des termes dont l'utilisateur veut la definition
  2. "OBJECTIFS DE L'INTERROGATION" = points importants a couvrir (PAS des definitions!)

- SEULE la section "DEFINITIONS A INCLURE ABSOLUMENT" determine les definitions a inclure
- IGNORE COMPLETEMENT tout terme mentionne dans "OBJECTIFS DE L'INTERROGATION" pour les definitions
- Meme si l'utilisateur ecrit des noms de concepts dans les objectifs, ce ne sont PAS des definitions a inclure

- SI "DEFINITIONS A INCLURE ABSOLUMENT" contient des termes :
  → Cree "## DEFINITIONS ET CONCEPTS IMPORTANTS" en PREMIERE position
  → Inclus UNIQUEMENT les definitions des termes listes dans CETTE section specifique
  → Format : - **Terme** : definition rigoureuse (extraite du cours)

- SI "DEFINITIONS A INCLURE ABSOLUMENT" est VIDE ou contient seulement des espaces :
  → NE CREE AUCUNE section definitions
  → Meme si des termes apparaissent ailleurs, AUCUNE definition

REGLE #2 - OBJECTIFS DE L'INTERROGATION :
- Cette section indique les SUJETS a bien couvrir dans la synthese
- Ces sujets doivent etre expliques en detail dans le corps de la synthese
- Mais ils ne doivent PAS generer de section "Definitions"
- Traite-les comme des themes a approfondir, pas comme des termes a definir

REGLE #3 - FIDELITE AU COURS :
- Toute information doit provenir du cours original
- N'invente jamais de contenu`;
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
 * @param {string|null} subject - Matiere selectionnee par l'utilisateur (optionnel, ex: 'mathematics')
 * @returns {Promise<Object>} - { title, summary, flashcards, quizQuestions }
 */
export async function generateEducationalContent(content, specificInstructions = null, subject = null) {
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
    console.log('[ContentGen] Generation en cours...', subject ? `(matiere: ${subject})` : '');
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
          content: buildUserPrompt(trimmedContent, specificInstructions, subject)
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
