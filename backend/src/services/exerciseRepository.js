import { query } from '../config/database.js';

const EXERCISE_LIMIT = 15;

// ─── Exercise Sets ────────────────────────────────────────────────────────────

export const countByUser = async (userId) => {
  const rows = await query(`SELECT COUNT(*) as count FROM exercises WHERE user_id = ?`, [userId]);
  return Number(rows[0].count);
};

export const createSet = async ({ userId, subject, title, difficultySummary, feedbackNote }) => {
  const result = await query(
    `INSERT INTO exercises (user_id, subject, title, difficulty_summary, feedback_note) VALUES (?, ?, ?, ?, ?)`,
    [userId, subject, title, difficultySummary || null, feedbackNote || null]
  );
  return { id: result.insertId, userId, subject, title };
};

export const findAllByUser = async (userId) => {
  return await query(
    `SELECT e.id, e.subject, e.title, e.created_at,
            COUNT(ei.id) as item_count
     FROM exercises e
     LEFT JOIN exercise_items ei ON ei.exercise_set_id = e.id
     WHERE e.user_id = ?
     GROUP BY e.id
     ORDER BY e.created_at DESC`,
    [userId]
  );
};

export const findById = async (id, userId) => {
  const sets = await query(
    `SELECT * FROM exercises WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  if (!sets[0]) return null;
  const items = await query(
    `SELECT * FROM exercise_items WHERE exercise_set_id = ? ORDER BY position ASC`,
    [id]
  );
  return { ...sets[0], items: items.map(parseItem) };
};

export const deleteSet = async (id, userId) => {
  await query(`DELETE FROM exercise_items WHERE exercise_set_id = ?`, [id]);
  await query(`DELETE FROM exercises WHERE id = ? AND user_id = ?`, [id, userId]);
};

export const deleteAllByUser = async (userId) => {
  await query(`DELETE ei FROM exercise_items ei JOIN exercises e ON ei.exercise_set_id = e.id WHERE e.user_id = ?`, [userId]);
  await query(`DELETE FROM exercises WHERE user_id = ?`, [userId]);
};

// ─── Exercise Items ───────────────────────────────────────────────────────────

export const createItems = async (exerciseSetId, items) => {
  if (!items || items.length === 0) return [];
  const values = items.map((item, i) => [
    exerciseSetId,
    item.type,
    i,
    item.question,
    item.options ? JSON.stringify(item.options) : null,
    item.correct_answer ?? null,
    item.expected_answer ?? null,
    null
  ]);
  await query(
    `INSERT INTO exercise_items
     (exercise_set_id, type, position, question, options, correct_answer, expected_answer, user_answer)
     VALUES ?`,
    [values]
  );
};

export const updateAnswer = async (itemId, userId, answer) => {
  // Vérifie que l'item appartient bien à cet user
  const rows = await query(
    `SELECT ei.id FROM exercise_items ei
     JOIN exercises e ON e.id = ei.exercise_set_id
     WHERE ei.id = ? AND e.user_id = ?`,
    [itemId, userId]
  );
  if (!rows[0]) return null;
  await query(`UPDATE exercise_items SET user_answer = ? WHERE id = ?`, [answer, itemId]);
  return true;
};

// ─── Quiz Answers ─────────────────────────────────────────────────────────────

export const logQuizAnswer = async ({ userId, questionId, syntheseId, selectedAnswer, isCorrect }) => {
  await query(
    `INSERT INTO quiz_answers (user_id, question_id, synthese_id, selected_answer, is_correct)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, questionId, syntheseId, selectedAnswer, isCorrect ? 1 : 0]
  );
};

export const getQuizAnswersForSubject = async (userId, subject) => {
  // Retourne toutes les réponses pour les synthèses d'une matière donnée
  // avec le contenu des questions pour que l'IA comprenne les lacunes
  return await query(
    `SELECT
       qa.question_id,
       qa.is_correct,
       qa.answered_at,
       qq.question,
       qq.options,
       qq.correct_answer,
       qq.times_answered,
       qq.times_correct,
       s.title as synthese_title,
       s.subject
     FROM quiz_answers qa
     JOIN quiz_questions qq ON qq.id = qa.question_id
     JOIN syntheses s ON s.id = qa.synthese_id
     WHERE qa.user_id = ? AND s.subject = ?
     ORDER BY qa.answered_at DESC`,
    [userId, subject]
  );
};

export const getSynthesesForSubject = async (userId, subject) => {
  return await query(
    `SELECT id, title, subject, mastery_score, created_at FROM syntheses
     WHERE user_id = ? AND subject = ? AND is_archived = 0`,
    [userId, subject]
  );
};

export { EXERCISE_LIMIT };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseItem(item) {
  return {
    ...item,
    options: item.options
      ? (typeof item.options === 'string' ? JSON.parse(item.options) : item.options)
      : null
  };
}
