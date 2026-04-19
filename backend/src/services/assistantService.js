/**
 * Assistant Service — NORA AI Assistant
 *
 * Gère :
 * - Chat général (GPT-4o-mini)
 * - Monk Mode : analyse des lacunes + génération d'exercices personnalisés
 * - /correct : correction commentée des réponses de l'étudiant
 * - /ana : analyse d'interro par photo
 *
 * Multilingue : fr, en, es, zh
 */

import OpenAI from 'openai';
import { chatCompletion } from './aiModelService.js';
import { query } from '../config/database.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = 'gpt-4o-mini';

async function getSystemPromptFromDB(name, fallback) {
  try {
    const rows = await query(`SELECT content FROM system_prompts WHERE name = ? LIMIT 1`, [name]);
    return rows[0]?.content || fallback;
  } catch {
    return fallback;
  }
}

// ─── Noms des matières par langue ─────────────────────────────────────────────

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

const LANG_INSTRUCTIONS = {
  fr: 'Réponds en français.',
  en: 'Respond in English.'
};

const SYSTEM_PROMPT = `You are Aron, an intelligent, calm and supportive educational assistant.
You help students understand their courses, revise and improve.
Always respond concisely, clearly and encouragingly.
IMPORTANT: Always respond in the exact same language the user writes in. If they write in French, respond in French. If they write in English, respond in English.`;

const NO_DATA_MESSAGES = {
  fr: (subject) => `Aucune donnée de quiz trouvée en ${subject}. Les exercices seront généraux.`,
  en: (subject) => `No quiz data found for ${subject}. Exercises will be general.`
};

function getSubjectName(subject, lang) {
  const map = SUBJECT_NAMES[lang] || SUBJECT_NAMES.fr;
  return map[subject] || subject;
}

function getLangInstruction(lang) {
  return LANG_INSTRUCTIONS[lang] || LANG_INSTRUCTIONS.fr;
}

// ─── Détection de langue du contenu ──────────────────────────────────────────

function detectContentLang(text) {
  if (!text) return null;
  const frenchWords = /\b(le|la|les|de|du|des|un|une|est|sont|dans|pour|avec|sur|par|que|qui|ce|cette|ces|nous|vous|ils|elles|mais|ou|et|donc|car|avoir|etre|faire|dit|peut|plus|tout|comme|bien|aussi|entre|deux|tres|sans|fait|encore|leurs|notre|votre|meme|quand|apres|avant|depuis|sous|chez|vers)\b/gi;
  const englishWords = /\b(the|a|an|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|must|can|this|that|these|those|it|its|they|them|their|we|our|you|your|he|she|him|her|his|with|for|from|into|about|after|before|between|through|during|without|because|since|until|while|where|when|which|who|what|how|but|and|or|not|only|also|just|very|really|quite|more|most|some|any|few|all|each|every)\b/gi;
  const fr = (text.match(frenchWords) || []).length;
  const en = (text.match(englishWords) || []).length;
  return en > fr ? 'en' : 'fr';
}

// ─── Chat général ─────────────────────────────────────────────────────────────

export async function chat(messages, lang = 'fr', userId = null) {
  const systemPrompt = await getSystemPromptFromDB('aron_main', SYSTEM_PROMPT);
  // If userId provided, use plan-aware model selection
  if (userId) {
    return chatCompletion(userId, {
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      purpose: 'chat'
    });
  }
  // Fallback to direct OpenAI call
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    max_tokens: 1000,
    temperature: 0.7
  });
  return response.choices[0].message.content.trim();
}

// ─── Monk Mode — Analyse des lacunes ─────────────────────────────────────────

export async function analyzeDifficulties({ subject, quizAnswers, synthesesTitles, lang = 'fr', userId = null }) {
  const subjectName = getSubjectName(subject, lang);
  const langInstruction = getLangInstruction(lang);

  if (!quizAnswers || quizAnswers.length === 0) {
    const noDataMsg = NO_DATA_MESSAGES[lang] || NO_DATA_MESSAGES.fr;
    return {
      hasSufficientData: false,
      summary: noDataMsg(subjectName),
      weakTopics: [],
      strongTopics: []
    };
  }

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
  const sortedByDifficulty = [...questions].sort((a, b) => (a.correct / a.total) - (b.correct / b.total));
  const weakQuestions = questions.filter(q => q.total > 0 && (q.correct / q.total) < 0.6);
  const strongQuestions = questions.filter(q => q.total > 0 && (q.correct / q.total) >= 0.8);

  // Build a detailed picture: all questions sorted by success rate
  const allQuestionsDetail = sortedByDifficulty.slice(0, 20).map(q => {
    const rate = Math.round((q.correct / q.total) * 100);
    return `- [${rate}% success] "${q.question}" (${q.correct}/${q.total} correct) — chapter: "${q.synthese}"`;
  }).join('\n');

  const strongTexts = strongQuestions.slice(0, 5).map(q =>
    `- "${q.question}" (${q.correct}/${q.total} correct)`
  ).join('\n');

  const prompt = `LANGUAGE RULE (mandatory): ${langInstruction} Your entire response must be in this language.

You are a rigorous pedagogical expert in ${subjectName}. Your goal is to produce a precise, actionable analysis of a student's quiz performance to guide highly targeted exercise creation.

--- FULL QUIZ PERFORMANCE (sorted by difficulty, lowest success first) ---
${allQuestionsDetail || 'No data.'}

--- STRONG AREAS (≥80% success) ---
${strongTexts || 'None identified.'}

--- CONTEXT ---
Total quiz answers: ${quizAnswers.length}
Chapters/summaries covered: ${[...new Set(synthesesTitles)].join(', ')}

--- YOUR TASK ---
1. Identify 3-5 SPECIFIC weak areas — be precise (e.g. not just "conjugation" but "conjugation of irregular verbs in passé simple" or "subject-verb agreement when subject is inverted")
2. Identify recurring ERROR PATTERNS — what systematic mistakes does the student make? (e.g. "confuses passé composé and imparfait in narrative contexts", "incorrect formula application when two variables are unknown")
3. Note which prerequisite concepts seem missing based on the errors
4. Note genuine strengths to build on

${langInstruction}
Respond ONLY in valid JSON:
{
  "weakTopics": ["specific weak area 1", "specific weak area 2", ...],
  "errorPatterns": ["recurring error pattern 1", "recurring error pattern 2", ...],
  "strongTopics": ["strong area 1", ...],
  "summary": "2-3 sentence student learning profile: what they struggle with, what specific mistakes they make, and what they do well"
}`;

  const callAnalysis = async () => {
    if (userId) {
      return chatCompletion(userId, {
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 2000,
        temperature: 0.3,
        jsonMode: true,
        purpose: 'chat'
      });
    } else {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 2000,
        temperature: 0.3
      });
      return response.choices[0].message.content;
    }
  };

  let rawContent;
  try {
    rawContent = await callAnalysis();
    JSON.parse(rawContent); // validate
  } catch (firstErr) {
    console.warn('[analyzeDifficulties] First attempt failed, retrying...', firstErr.message);
    try {
      rawContent = await callAnalysis();
    } catch (retryErr) {
      throw retryErr;
    }
  }

  const result = JSON.parse(rawContent);
  return {
    hasSufficientData: true,
    summary: result.summary || '',
    weakTopics: result.weakTopics || [],
    errorPatterns: result.errorPatterns || [],
    strongTopics: result.strongTopics || [],
    totalAnswers: quizAnswers.length,
    weakQuestionsCount: weakQuestions.length
  };
}

// ─── Monk Mode — Génération des exercices ────────────────────────────────────

export async function generateExercises({
  subject,
  weakTopics,
  errorPatterns,
  analysisSummary,
  specificDifficulties,
  counts,
  difficulty = 'medium',
  lang = 'fr',
  userId = null
}) {
  const subjectName = getSubjectName(subject, lang);
  const langInstruction = getLangInstruction(lang);

  const difficultyProfile = {
    easy: {
      desc: 'easy — foundational level',
      instruction: `- Questions test RECOGNITION and basic recall only (definitions, simple identification, direct application of a single rule)
- MCQ options: one obviously correct answer, distractors are clearly different
- Open questions: short answers, one concept at a time
- Practical: guided step-by-step with explicit data given, only one unknown
- No multi-step reasoning, no edge cases`
    },
    medium: {
      desc: 'medium — intermediate level',
      instruction: `- Questions test UNDERSTANDING and standard application (applying a rule in a typical context, comparing two concepts)
- MCQ options: plausible distractors that reflect common mistakes
- Open questions: structured paragraph response, connect 2-3 concepts
- Practical: 2-3 calculation steps, some data interpretation required
- Include one edge case or variation per exercise`
    },
    hard: {
      desc: 'hard — advanced level',
      instruction: `- Questions test ANALYSIS, SYNTHESIS and complex application (multi-step reasoning, edge cases, unexpected contexts)
- MCQ options: all options plausible, requires deep understanding to distinguish
- Open questions: argumentation, critical thinking, multi-concept synthesis
- Practical: multi-step problems, require setting up the method before calculating, complex data
- Each exercise must force the student to confront their specific error pattern directly`
    }
  }[difficulty] || {};

  const sections = [];
  if (counts.qcm > 0) sections.push(`${counts.qcm} MCQ (type: "qcm", 4 options A/B/C/D)`);
  if (counts.open > 0) sections.push(`${counts.open} open questions (type: "open")`);
  if (counts.practical > 0) sections.push(`${counts.practical} practical exercises (type: "practical")`);

  const typeRules = [];
  if (counts.qcm === 0) typeRules.push('NO "qcm" items');
  if (counts.open === 0) typeRules.push('NO "open" items');
  if (counts.practical === 0) typeRules.push('NO "practical" items');

  const totalCount = (counts.qcm || 0) + (counts.open || 0) + (counts.practical || 0);

  const studentProfile = [
    analysisSummary ? `Student profile: ${analysisSummary}` : '',
    (weakTopics || []).length > 0 ? `Identified weak areas: ${weakTopics.join(' | ')}` : '',
    (errorPatterns || []).length > 0 ? `Recurring error patterns: ${errorPatterns.join(' | ')}` : '',
    specificDifficulties ? `⚠️ STUDENT-REPORTED DIFFICULTIES (highest priority): ${specificDifficulties}` : ''
  ].filter(Boolean).join('\n');

  const prompt = `LANGUAGE RULE (mandatory): ${langInstruction} Every single word of your response — questions, options, answers, titles — MUST be in this language exclusively. Never mix languages.

You are an expert teacher in ${subjectName} specialized in targeted remediation.

--- STUDENT PROFILE ---
${studentProfile || `General ${subjectName} exercises requested.`}

--- DIFFICULTY: ${difficultyProfile.desc} ---
${difficultyProfile.instruction}

--- GENERATE EXACTLY ---
${sections.join('\n')}
Total: ${totalCount} items

ABSOLUTE RULES:
- Every single exercise must directly target a specific weak area or error pattern from the student profile above
- If student-reported difficulties are listed, at least half the exercises must focus on them
- Each exercise must be designed to expose and correct the exact type of mistake the student makes — not just cover the topic broadly
- The question wording and the distractors/expected answers must be crafted to reveal understanding gaps
${typeRules.map(r => `- ${r}`).join('\n')}
MATH NOTATION: Always use unicode characters directly: x² (not x^2), H₂O (not H_2O), × ÷ ± ≥ ≤ ≠ ≈ √ ∞ π α β γ δ λ μ σ
${langInstruction}

Respond ONLY in valid JSON:
{
  "title": "Short descriptive title (e.g. '${subjectName} — Targeted Practice')",
  "items": [
    {
      "type": "qcm",
      "question": "...",
      "options": ["A text", "B text", "C text", "D text"],
      "correct_answer": 0,
      "expected_answer": "Why this answer is correct and why the others are wrong"
    },
    {
      "type": "open",
      "question": "...",
      "options": null,
      "correct_answer": null,
      "expected_answer": "Key elements expected in a complete answer"
    },
    {
      "type": "practical",
      "question": "Complete exercise with all data provided...",
      "options": null,
      "correct_answer": null,
      "expected_answer": "Full step-by-step solution with each step explained"
    }
  ]
}

Only include items of the types listed above. No extra items.`;

  const callGenerate = async () => {
    if (userId) {
      return chatCompletion(userId, {
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 10000,
        temperature: 0.7,
        jsonMode: true,
        purpose: 'chat'
      });
    } else {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 10000,
        temperature: 0.7
      });
      return response.choices[0].message.content;
    }
  };

  let rawContent;
  try {
    rawContent = await callGenerate();
    JSON.parse(rawContent); // validate
  } catch (firstErr) {
    console.warn('[generateExercises] First attempt failed, retrying...', firstErr.message);
    rawContent = await callGenerate();
  }

  const result = JSON.parse(rawContent);

  const items = (result.items || []).map((item, i) => ({
    type: ['qcm', 'open', 'practical'].includes(item.type) ? item.type : 'open',
    position: i,
    question: item.question || '',
    options: item.options || null,
    correct_answer: item.correct_answer ?? null,
    expected_answer: item.expected_answer || null,
    user_answer: null
  }));

  return { title: result.title || `${subjectName} Exercises`, items };
}

// ─── /ana — Analyse d'interro par OCR ────────────────────────────────────────

export async function analyzeExamDifficulties({ examText, subject, lang = 'fr' }) {
  const subjectName = getSubjectName(subject, lang);
  const langInstruction = getLangInstruction(lang);

  const prompt = `You are a pedagogical expert. A student sends you the text of their graded test or assignment in ${subjectName}.

Test text:
"""
${examText.substring(0, 3000)}
"""

Analyze this test and identify:
- The themes and concepts that seem difficult for the student (missed questions or complex concepts tested)
- The skills evaluated in this test

${langInstruction}
Respond ONLY in valid JSON:
{
  "weakTopics": ["topic 1", "topic 2", "topic 3"],
  "strongTopics": [],
  "summary": "Short 2-3 sentence summary of points to work on based on this test"
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

// ─── /ana — Note de feedback personnalisée ───────────────────────────────────

export async function generateAnaFeedback({ weakTopics = [], strongTopics = [], summary = '', examText = '', subject, lang = 'fr' }) {
  const subjectName = getSubjectName(subject, lang);

  // Détecter la note dans le texte du contrôle
  const gradeMatch = examText.match(/(\d+(?:[.,]\d+)?)\s*[/\/]\s*(\d+)/);
  const gradeInfo = gradeMatch ? `${gradeMatch[1]}/${gradeMatch[2]}` : null;

  const weakCount = weakTopics.length;
  const maxTokens = weakCount <= 2 ? 600 : weakCount <= 4 ? 1000 : 1500;

  // Langue du message
  const langMap = { fr: 'français', en: 'anglais', es: 'espagnol', zh: 'chinois mandarin' };
  const outputLang = langMap[lang] || 'français';

  const prompt = `Tu es un coach scolaire sympa, direct et vraiment utile. Tu parles comme un pote qui s'y connaît, pas comme un prof chiant.

TEXTE EXACT DU CONTRÔLE (source unique — ne mentionne JAMAIS un concept absent de ce texte) :
"""
${examText.substring(0, 3000)}
"""

Points faibles identifiés dans CE contrôle : ${weakTopics.join(', ') || 'aucun'}
Points forts identifiés dans CE contrôle : ${strongTopics.join(', ') || 'aucun'}
${gradeInfo ? `Note obtenue : ${gradeInfo}` : ''}

MISSION : Rédige un message vocal personnalisé en ${outputLang} pour aider cet élève à progresser.

RÈGLES ABSOLUES :
1. NE CITE JAMAIS un concept, une notion ou un terme qui n'est pas explicitement dans le texte du contrôle ci-dessus — même si tu le connais en ${subjectName}
2. Commence DIRECTEMENT par le fond, zero phrase d'intro ou de présentation
3. Ton : décontracté, direct, bienveillant — comme un grand frère/grande sœur calé(e) en ${subjectName}. Expressions naturelles autorisées ("ok donc", "voilà le truc", "en gros", "clairement")
4. Pour chaque point faible : donne un conseil CONCRET et ACTIONNABLE (pas "révise bien ça"). Dis exactement QUOI faire : quelle méthode, quel réflexe, comment s'entraîner
5. Une ou deux métaphores courtes si elles aident vraiment à comprendre, pas plus
6. Si la note est basse : sois encourageant SANS mentir ni minimiser les difficultés
7. Longueur adaptée : suffisamment long pour être vraiment utile, pas de remplissage
8. Aucun formatage markdown (pas de **, #, -)

Écris uniquement le texte du message. Rien d'autre.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature: 0.85
  });

  return response.choices[0].message.content.trim();
}

// ─── TTS — Synthèse vocale (ElevenLabs) ──────────────────────────────────────

const ELEVENLABS_VOICES = {
  fr: 'pNInz6obpgDQGcFmaJgB', // Adam — voix française
  en: 'SOYHLrjzK2X1ezoPC6cr', // Harry — voix anglaise US
};

export async function generateTTS(text, lang = 'fr') {
  const voiceId = ELEVENLABS_VOICES[lang] || ELEVENLABS_VOICES.fr;
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.substring(0, 5000),
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0.1,
          use_speaker_boost: true,
          speed: 1.1,
        },
      }),
    }
  );
  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`ElevenLabs TTS error: ${response.status} — ${errBody}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString('base64');
}

// ─── /correct — Correction commentée ─────────────────────────────────────────

export async function correctSingleItem({ subject, question, userAnswer, expectedAnswer, type, lang = 'fr' }) {
  const subjectName = getSubjectName(subject, lang);
  const langInstruction = getLangInstruction(lang);
  const typeLabel = type === 'open' ? 'Open question' : 'Practical exercise';

  const prompt = `LANGUAGE RULE (mandatory): ${langInstruction} All feedback and tips MUST be written in this language exclusively.

You are a supportive teacher in ${subjectName}. Evaluate this student's answer.

Type: ${typeLabel}
Question: ${question}
Expected answer: ${expectedAnswer || 'N/A'}
Student's answer: ${userAnswer}

Evaluate and respond ONLY in valid JSON:
{
  "isCorrect": true or false,
  "isPartial": true or false,
  "feedback": "if WRONG or PARTIAL — explain precisely WHY: what was misunderstood, what the correct reasoning is (2-4 sentences). If CORRECT — confirm what is right in 1-2 sentences.",
  "tip": "one concrete actionable tip to help the student improve or not repeat this mistake"
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 400,
    temperature: 0.4
  });

  return JSON.parse(response.choices[0].message.content);
}

export async function correctExercises({ subject, items, lang = 'fr' }) {
  const subjectName = getSubjectName(subject, lang);
  const langInstruction = getLangInstruction(lang);

  const exercisesText = items.map((item, i) => {
    const num = i + 1;
    const typeLabel = item.type === 'qcm' ? 'MCQ' : item.type === 'open' ? 'Open question' : 'Practical exercise';
    let text = `--- Exercise ${num} (${typeLabel}) ---\n`;
    text += `Question: ${item.question}\n`;
    if (item.type === 'qcm' && item.options) {
      text += `Options: ${item.options.map((o, idx) => `${String.fromCharCode(65+idx)}) ${o}`).join(' | ')}\n`;
      text += `Expected answer: ${String.fromCharCode(65 + (item.correct_answer ?? 0))}\n`;
    } else {
      text += `Expected answer: ${item.expected_answer || 'N/A'}\n`;
    }
    text += `Student's answer: ${item.user_answer || '(no answer)'}\n`;
    return text;
  }).join('\n');

  const prompt = `LANGUAGE RULE (mandatory): ${langInstruction} All feedback, comments and tips MUST be written in this language exclusively.

You are a supportive teacher in ${subjectName}. Grade the following exercises and give personalized, encouraging feedback for each answer.

${exercisesText}

For each exercise:
- Evaluate if the answer is correct, partially correct, or incorrect
- "feedback": if WRONG or PARTIAL — explain precisely WHY it is wrong: what concept was misunderstood, what the correct reasoning is, and what the student should have written. Be clear and educational, 2-4 sentences. If CORRECT — confirm what is right and why in 1-2 sentences.
- "tip": a concrete, actionable advice to help the student not make this mistake again (1-2 sentences)

${langInstruction}
Respond ONLY in valid JSON:
{
  "corrections": [
    {
      "exerciseIndex": 0,
      "isCorrect": true,
      "isPartial": false,
      "feedback": "Explanation of why the answer is right or wrong",
      "tip": "Concrete tip to remember or improve"
    }
  ]
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
