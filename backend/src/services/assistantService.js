/**
 * Assistant Service — NORA AI Assistant
 *
 * Gère :
 * - Chat général (GPT-4o-mini)
 * - Monk Mode : analyse des lacunes + génération d'exercices personnalisés
 * - /correct : correction commentée des réponses de l'étudiant
 */

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = 'gpt-4o-mini';

const SUBJECT_NAMES_FR = {
  mathematics: 'Mathématiques',
  french:      'Français',
  physics:     'Physique',
  chemistry:   'Chimie',
  biology:     'Biologie',
  history:     'Histoire',
  geography:   'Géographie',
  english:     'Anglais',
  dutch:       'Néerlandais'
};

// ─── Chat général ─────────────────────────────────────────────────────────────

export async function chat(messages) {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `Tu es NORA, un assistant pédagogique intelligent, calme et bienveillant.
Tu aides les étudiants à comprendre leurs cours, à réviser et à progresser.
Réponds toujours de façon concise, claire et encourageante.
Tu communiques en français par défaut sauf si l'étudiant t'écrit dans une autre langue.`
      },
      ...messages
    ],
    max_tokens: 1000,
    temperature: 0.7
  });
  return response.choices[0].message.content.trim();
}

// ─── Monk Mode — Analyse des lacunes ─────────────────────────────────────────

export async function analyzeDifficulties({ subject, quizAnswers, synthesesTitles }) {
  const subjectName = SUBJECT_NAMES_FR[subject] || subject;

  if (!quizAnswers || quizAnswers.length === 0) {
    return {
      hasSufficientData: false,
      summary: `Aucune donnée de quiz trouvée en ${subjectName}. Les exercices seront généraux.`,
      weakTopics: [],
      strongTopics: []
    };
  }

  // Calcul du taux de réussite par question
  const questionStats = {};
  for (const answer of quizAnswers) {
    const key = answer.question_id;
    if (!questionStats[key]) {
      questionStats[key] = {
        question: answer.question,
        correct: 0,
        total: 0,
        synthese: answer.synthese_title
      };
    }
    questionStats[key].total++;
    if (answer.is_correct) questionStats[key].correct++;
  }

  const questions = Object.values(questionStats);
  const weakQuestions = questions.filter(q => q.total > 0 && (q.correct / q.total) < 0.6);
  const strongQuestions = questions.filter(q => q.total > 0 && (q.correct / q.total) >= 0.8);

  // Demander à GPT d'identifier les thèmes faibles depuis les questions ratées
  const weakTexts = weakQuestions.slice(0, 15).map(q =>
    `- "${q.question}" (${q.correct}/${q.total} correct, synthèse: ${q.synthese})`
  ).join('\n');

  const prompt = `Tu es un expert pédagogique. Analyse ces questions de quiz en ${subjectName} que l'étudiant a eu du mal à répondre correctement.

Questions difficiles pour l'étudiant :
${weakTexts || 'Aucune question clairement faible détectée.'}

Total de réponses analysées : ${quizAnswers.length}
Synthèses analysées : ${[...new Set(synthesesTitles)].join(', ')}

Identifie les 3-5 thèmes ou concepts principaux où l'étudiant a des lacunes.
Réponds UNIQUEMENT en JSON valide :
{
  "weakTopics": ["thème 1", "thème 2", ...],
  "strongTopics": ["thème fort 1", ...],
  "summary": "Résumé court en 2-3 phrases des lacunes détectées"
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 500,
    temperature: 0.3
  });

  const result = JSON.parse(response.choices[0].message.content);
  return {
    hasSufficientData: true,
    summary: result.summary || '',
    weakTopics: result.weakTopics || [],
    strongTopics: result.strongTopics || [],
    totalAnswers: quizAnswers.length,
    weakQuestionsCount: weakQuestions.length
  };
}

// ─── Monk Mode — Génération des exercices ────────────────────────────────────

export async function generateExercises({
  subject,
  weakTopics,
  specificDifficulties,
  counts  // { qcm: 0-5, open: 0-10, practical: 0-10 }
}) {
  const subjectName = SUBJECT_NAMES_FR[subject] || subject;

  const topicsContext = [
    ...(weakTopics || []),
    ...(specificDifficulties ? [specificDifficulties] : [])
  ].join(', ') || `notions générales en ${subjectName}`;

  const sections = [];
  if (counts.qcm > 0) sections.push(`${counts.qcm} QCM (questions à choix multiples, 4 options A/B/C/D)`);
  if (counts.open > 0) sections.push(`${counts.open} questions ouvertes (réponse rédigée)`);
  if (counts.practical > 0) sections.push(`${counts.practical} exercices pratiques (calculs, rédaction, manipulation de concepts)`);

  const prompt = `Tu es un professeur expert en ${subjectName}. Crée des exercices ciblés sur les lacunes suivantes de l'étudiant : ${topicsContext}.

Génère exactement :
${sections.join('\n')}

Les exercices doivent être directement liés aux lacunes identifiées et progressivement difficiles.

Réponds UNIQUEMENT en JSON valide avec cette structure :
{
  "title": "Titre du set d'exercices (court, ex: 'Entraînement Mathématiques - Dérivées & Intégrales')",
  "items": [
    {
      "type": "qcm",
      "question": "Énoncé de la question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "expected_answer": "Explication de la bonne réponse"
    },
    {
      "type": "open",
      "question": "Énoncé de la question ouverte",
      "options": null,
      "correct_answer": null,
      "expected_answer": "Éléments de réponse attendus pour la correction"
    },
    {
      "type": "practical",
      "question": "Énoncé de l'exercice pratique avec toutes les données nécessaires",
      "options": null,
      "correct_answer": null,
      "expected_answer": "Solution complète étape par étape"
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 4000,
    temperature: 0.7
  });

  const result = JSON.parse(response.choices[0].message.content);

  // Validation et nettoyage
  const items = (result.items || []).map((item, i) => ({
    type: ['qcm', 'open', 'practical'].includes(item.type) ? item.type : 'open',
    position: i,
    question: item.question || '',
    options: item.options || null,
    correct_answer: item.correct_answer ?? null,
    expected_answer: item.expected_answer || null,
    user_answer: null
  }));

  return { title: result.title || `Exercices ${subjectName}`, items };
}

// ─── /ana — Analyse d'interro par OCR ────────────────────────────────────────

export async function analyzeExamDifficulties({ examText, subject }) {
  const subjectName = SUBJECT_NAMES_FR[subject] || subject;

  const prompt = `Tu es un expert pédagogique. Un étudiant t'envoie le texte de son interro ou devoir corrigé en ${subjectName}.

Texte du contrôle :
"""
${examText.substring(0, 3000)}
"""

Analyse ce contrôle et identifie :
- Les thèmes et notions qui semblent difficiles pour l'étudiant (questions ratées ou concepts complexes testés)
- Les compétences évaluées dans ce contrôle

Réponds UNIQUEMENT en JSON valide :
{
  "weakTopics": ["thème 1", "thème 2", "thème 3"],
  "strongTopics": [],
  "summary": "Résumé court en 2-3 phrases des points à travailler d'après ce contrôle"
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 500,
    temperature: 0.3
  });

  const result = JSON.parse(response.choices[0].message.content);
  return {
    hasSufficientData: true,
    summary: result.summary || '',
    weakTopics: result.weakTopics || [],
    strongTopics: result.strongTopics || []
  };
}

// ─── /correct — Correction commentée ─────────────────────────────────────────

export async function correctExercises({ subject, items }) {
  const subjectName = SUBJECT_NAMES_FR[subject] || subject;

  const exercisesText = items.map((item, i) => {
    const num = i + 1;
    const typeLabel = item.type === 'qcm' ? 'QCM' : item.type === 'open' ? 'Question ouverte' : 'Exercice pratique';
    let text = `--- Exercice ${num} (${typeLabel}) ---\n`;
    text += `Question : ${item.question}\n`;
    if (item.type === 'qcm' && item.options) {
      text += `Options : ${item.options.map((o, idx) => `${String.fromCharCode(65+idx)}) ${o}`).join(' | ')}\n`;
      text += `Réponse attendue : ${String.fromCharCode(65 + (item.correct_answer ?? 0))}\n`;
    } else {
      text += `Réponse attendue : ${item.expected_answer || 'N/A'}\n`;
    }
    text += `Réponse de l'étudiant : ${item.user_answer || '(pas de réponse)'}\n`;
    return text;
  }).join('\n');

  const prompt = `Tu es un professeur bienveillant en ${subjectName}. Corrige les exercices suivants et donne un feedback personnalisé et encourageant pour chaque réponse.

${exercisesText}

Pour chaque exercice, donne :
- Si la réponse est correcte, partiellement correcte ou incorrecte
- Un commentaire pédagogique précis (ce qui est bien, ce qui manque, comment s'améliorer)
- Un conseil pour progresser sur ce point

Réponds UNIQUEMENT en JSON valide :
{
  "corrections": [
    {
      "exerciseIndex": 0,
      "isCorrect": true,
      "isPartial": false,
      "feedback": "Commentaire détaillé",
      "tip": "Conseil pour progresser"
    }
  ],
  "globalFeedback": "Bilan global encourageant en 2-3 phrases"
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 3000,
    temperature: 0.5
  });

  return JSON.parse(response.choices[0].message.content);
}
