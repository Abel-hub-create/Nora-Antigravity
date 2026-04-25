/**
 * Correction Agents — sous-agents spécialisés par type d'exercice
 *
 * - correctQCMAgent      : explique pourquoi la réponse choisie est fausse + pourquoi la bonne est correcte
 * - correctOpenAgent     : évalue une réponse ouverte selon les critères de la matière
 * - correctPracticalAgent: vérifie la démarche étape par étape, pas seulement le résultat
 * - dispatchCorrectionAgent : sélectionne l'agent selon item.type
 */

import OpenAI from 'openai';
import { SUBJECT_PROMPTS } from './subjectPrompts.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = 'gpt-4o-mini';

const SUBJECT_NAMES = {
  fr: {
    mathematics: 'Mathématiques', french: 'Français', physics: 'Physique',
    chemistry: 'Chimie', biology: 'Biologie', history: 'Histoire',
    geography: 'Géographie', english: 'Anglais', dutch: 'Néerlandais'
  },
  en: {
    mathematics: 'Mathematics', french: 'French', physics: 'Physics',
    chemistry: 'Chemistry', biology: 'Biology', history: 'History',
    geography: 'Geography', english: 'English', dutch: 'Dutch'
  }
};

function getSubjectName(subject, lang) {
  return (SUBJECT_NAMES[lang] || SUBJECT_NAMES.fr)[subject] || subject;
}

function getLangInstruction(lang) {
  return lang === 'en' ? 'Respond in English.' : 'Réponds en français.';
}

function getCorrectionRules(subject) {
  return SUBJECT_PROMPTS[subject]?.correctionRules?.trim() || '';
}

function langHeader(lang) {
  return `LANGUAGE RULE (mandatory): ${getLangInstruction(lang)} All feedback and tips MUST be written in this language exclusively.\n`;
}

// ─── Agent QCM ────────────────────────────────────────────────────────────────
// Explique pourquoi la réponse sélectionnée est fausse et pourquoi la bonne est correcte.

export async function correctQCMAgent({ subject, question, options = [], correctAnswer, userAnswer, lang = 'fr' }) {
  const subjectName = getSubjectName(subject, lang);
  const correctionRules = getCorrectionRules(subject);

  const optionsList = options.map((o, i) => `  ${String.fromCharCode(65 + i)}) ${o}`).join('\n');
  const correctLabel = `${String.fromCharCode(65 + (correctAnswer ?? 0))}) ${options[correctAnswer] ?? ''}`;
  const userIdx = typeof userAnswer === 'number' ? userAnswer : null;
  const userLabel = userIdx !== null
    ? `${String.fromCharCode(65 + userIdx)}) ${options[userIdx] ?? ''}`
    : String(userAnswer ?? '(sans réponse)');
  const isCorrect = userIdx !== null && userIdx === correctAnswer;

  const prompt = `${langHeader(lang)}
Tu es un professeur de ${subjectName}, exigeant mais bienveillant.

QUESTION :
${question}

OPTIONS :
${optionsList}

Bonne réponse : ${correctLabel}
Réponse de l'élève : ${userLabel}

${correctionRules ? `CRITÈRES D'ÉVALUATION POUR CETTE MATIÈRE :\n${correctionRules}\n` : ''}
${isCorrect
  ? `L'élève a répondu correctement. Confirme brièvement pourquoi ${correctLabel} est juste et renforce le concept-clé (1-2 phrases).`
  : `L'élève a répondu INCORRECTEMENT.
— Explique précisément pourquoi sa réponse est fausse : quel concept ou quelle règle a été mal compris(e).
— Explique pourquoi ${correctLabel} est la bonne réponse et le raisonnement derrière.
— Donne un conseil concret pour ne pas reproduire cette erreur.`}

Réponds UNIQUEMENT en JSON valide :
{
  "isCorrect": ${isCorrect},
  "isPartial": false,
  "feedback": "...",
  "tip": "..."
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 350,
    temperature: 0.3
  });

  return JSON.parse(response.choices[0].message.content);
}

// ─── Agent Open ───────────────────────────────────────────────────────────────
// Évalue une réponse ouverte : exactitude, complétude, formulation.

export async function correctOpenAgent({ subject, question, expectedAnswer, userAnswer, lang = 'fr' }) {
  const subjectName = getSubjectName(subject, lang);
  const correctionRules = getCorrectionRules(subject);

  const prompt = `${langHeader(lang)}
Tu es un professeur de ${subjectName}, rigoureux et encourageant. Évalue cette réponse ouverte.

QUESTION :
${question}

RÉPONSE ATTENDUE (éléments-clés) :
${expectedAnswer || 'Non spécifiée'}

RÉPONSE DE L'ÉLÈVE :
${userAnswer || '(sans réponse)'}

${correctionRules ? `CRITÈRES D'ÉVALUATION POUR CETTE MATIÈRE :\n${correctionRules}\n` : ''}
Critères d'évaluation :
- "isCorrect": true uniquement si la réponse est fondamentalement juste ET suffisamment complète.
- "isPartial": true si l'élève a la bonne idée mais il manque des éléments-clés, des unités, une précision terminologique, ou le raisonnement est incomplet.
- "feedback": si FAUX ou PARTIEL — explique exactement ce qui est manquant ou incorrect, quel est le raisonnement correct, ce qu'il aurait fallu écrire (2-4 phrases). Si CORRECT — confirme ce qui est bien et pourquoi (1-2 phrases).
- "tip": un conseil actionnable concret pour progresser.

Réponds UNIQUEMENT en JSON valide :
{
  "isCorrect": true ou false,
  "isPartial": true ou false,
  "feedback": "...",
  "tip": "..."
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 500,
    temperature: 0.4
  });

  return JSON.parse(response.choices[0].message.content);
}

// ─── Agent Practical ──────────────────────────────────────────────────────────
// Vérifie la démarche étape par étape. Un bon résultat avec une mauvaise démarche = isPartial.

export async function correctPracticalAgent({ subject, question, expectedAnswer, userAnswer, lang = 'fr' }) {
  const subjectName = getSubjectName(subject, lang);
  const correctionRules = getCorrectionRules(subject);

  const prompt = `${langHeader(lang)}
Tu es un professeur de ${subjectName}, méthodique et encourageant. Évalue cet exercice pratique.

ÉNONCÉ :
${question}

SOLUTION ATTENDUE (démarche complète) :
${expectedAnswer || 'Non spécifiée'}

RÉPONSE DE L'ÉLÈVE :
${userAnswer || '(sans réponse)'}

${correctionRules ? `CRITÈRES D'ÉVALUATION POUR CETTE MATIÈRE :\n${correctionRules}\n` : ''}
Critères d'évaluation :
- Évalue la DÉMARCHE, pas seulement le résultat final. Un résultat correct obtenu par une mauvaise méthode → "isPartial: true".
- Identifie précisément quelle étape est incorrecte (si applicable).
- "isPartial": true si l'approche est correcte mais l'exécution a des erreurs (erreur de calcul, unité manquante, étape incomplète).
- "feedback": si FAUX — explique la bonne démarche et où l'élève a dévié (2-4 phrases). Si PARTIEL — reconnaît ce qui est correct et cible l'erreur exacte. Si CORRECT — confirme que le raisonnement est solide (1-2 phrases).
- "tip": un conseil focalisé sur la méthode à retenir.

Réponds UNIQUEMENT en JSON valide :
{
  "isCorrect": true ou false,
  "isPartial": true ou false,
  "feedback": "...",
  "tip": "..."
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 600,
    temperature: 0.4
  });

  return JSON.parse(response.choices[0].message.content);
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function dispatchCorrectionAgent({ type, subject, question, options, correctAnswer, expectedAnswer, userAnswer, lang = 'fr' }) {
  if (type === 'qcm') {
    return correctQCMAgent({ subject, question, options, correctAnswer, userAnswer, lang });
  }
  if (type === 'practical') {
    return correctPracticalAgent({ subject, question, expectedAnswer, userAnswer, lang });
  }
  return correctOpenAgent({ subject, question, expectedAnswer, userAnswer, lang });
}
