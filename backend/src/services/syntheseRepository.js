import { query } from '../config/database.js';

// Syntheses CRUD
export const create = async ({ userId, title, originalContent, summaryContent, sourceType = 'text' }) => {
  const sql = `INSERT INTO syntheses (user_id, title, original_content, summary_content, source_type)
               VALUES (?, ?, ?, ?, ?)`;
  const result = await query(sql, [userId, title, originalContent, summaryContent, sourceType]);
  return { id: result.insertId, userId, title, summaryContent, sourceType };
};

export const findById = async (id, userId) => {
  const sql = `SELECT * FROM syntheses WHERE id = ? AND user_id = ? AND is_archived = 0`;
  const syntheses = await query(sql, [id, userId]);
  return syntheses[0] || null;
};

export const findAllByUser = async (userId, { search = '', limit = 50, offset = 0 } = {}) => {
  let sql = `SELECT id, title, summary_content, source_type, created_at, updated_at
             FROM syntheses WHERE user_id = ? AND is_archived = 0`;
  const params = [userId];

  if (search) {
    sql += ` AND (title LIKE ? OR summary_content LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return await query(sql, params);
};

export const updateTitle = async (id, userId, title) => {
  const sql = `UPDATE syntheses SET title = ?, updated_at = NOW() WHERE id = ? AND user_id = ?`;
  const result = await query(sql, [title, id, userId]);
  return result.affectedRows > 0;
};

export const archive = async (id, userId) => {
  const sql = `UPDATE syntheses SET is_archived = 1, updated_at = NOW() WHERE id = ? AND user_id = ?`;
  const result = await query(sql, [id, userId]);
  return result.affectedRows > 0;
};

export const remove = async (id, userId) => {
  const sql = `DELETE FROM syntheses WHERE id = ? AND user_id = ?`;
  const result = await query(sql, [id, userId]);
  return result.affectedRows > 0;
};

// Flashcards
export const createFlashcards = async (syntheseId, flashcards) => {
  if (!flashcards.length) return [];

  const sql = `INSERT INTO flashcards (synthese_id, front, back, difficulty) VALUES ?`;
  const values = flashcards.map(f => [syntheseId, f.front, f.back, f.difficulty || 'medium']);
  await query(sql, [values]);

  return await getFlashcardsBySynthese(syntheseId);
};

export const getFlashcardsBySynthese = async (syntheseId) => {
  const sql = `SELECT * FROM flashcards WHERE synthese_id = ? ORDER BY id`;
  return await query(sql, [syntheseId]);
};

export const updateFlashcardProgress = async (flashcardId, isCorrect) => {
  const sql = `UPDATE flashcards SET
    times_reviewed = times_reviewed + 1,
    times_correct = times_correct + ?,
    last_reviewed_at = NOW(),
    next_review_at = DATE_ADD(NOW(), INTERVAL ? DAY)
    WHERE id = ?`;

  // Spaced repetition: correct = review later, incorrect = review sooner
  const daysUntilNext = isCorrect ? 3 : 1;
  await query(sql, [isCorrect ? 1 : 0, daysUntilNext, flashcardId]);
};

// Quiz questions
export const createQuizQuestions = async (syntheseId, questions) => {
  if (!questions.length) return [];

  const sql = `INSERT INTO quiz_questions (synthese_id, question, options, correct_answer, explanation) VALUES ?`;
  const values = questions.map(q => [
    syntheseId,
    q.question,
    JSON.stringify(q.options),
    q.correctAnswer,
    q.explanation || null
  ]);
  await query(sql, [values]);

  return await getQuizQuestionsBySynthese(syntheseId);
};

export const getQuizQuestionsBySynthese = async (syntheseId) => {
  const sql = `SELECT * FROM quiz_questions WHERE synthese_id = ? ORDER BY id`;
  const questions = await query(sql, [syntheseId]);
  return questions.map(q => ({
    ...q,
    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
  }));
};

export const updateQuizProgress = async (questionId, isCorrect) => {
  const sql = `UPDATE quiz_questions SET
    times_answered = times_answered + 1,
    times_correct = times_correct + ?
    WHERE id = ?`;
  await query(sql, [isCorrect ? 1 : 0, questionId]);
};

// Get complete synthese with flashcards and quiz
export const getCompleteSynthese = async (id, userId) => {
  const synthese = await findById(id, userId);
  if (!synthese) return null;

  const flashcards = await getFlashcardsBySynthese(id);
  const quizQuestions = await getQuizQuestionsBySynthese(id);

  return {
    ...synthese,
    flashcards,
    quizQuestions
  };
};

// Stats
export const countByUser = async (userId) => {
  const sql = `SELECT COUNT(*) as count FROM syntheses WHERE user_id = ? AND is_archived = 0`;
  const result = await query(sql, [userId]);
  return result[0].count;
};
