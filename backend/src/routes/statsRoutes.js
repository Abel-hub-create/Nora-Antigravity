import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { query } from '../config/database.js';

const router = express.Router();

const SUBJECTS = ['mathematics', 'french', 'physics', 'chemistry', 'biology', 'history', 'geography', 'english', 'dutch'];

// GET /api/stats/subjects — score par matière pour le radar chart
router.get('/subjects', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Source 1 : précision sur les quiz answers (jointure syntheses.subject)
    const quizRows = await query(`
      SELECT s.subject,
        COUNT(qa.id)        AS total,
        SUM(qa.is_correct)  AS correct
      FROM quiz_answers qa
      JOIN syntheses s ON s.id = qa.synthese_id
      WHERE qa.user_id = ? AND s.subject IS NOT NULL
      GROUP BY s.subject
    `, [userId]);

    // Source 2 : mastery_score moyen par matière (fallback)
    const masteryRows = await query(`
      SELECT subject, AVG(mastery_score) AS avg_mastery
      FROM syntheses
      WHERE user_id = ? AND subject IS NOT NULL AND mastery_score IS NOT NULL
      GROUP BY subject
    `, [userId]);

    const scores = SUBJECTS.map(subject => {
      const quiz    = quizRows.find(r => r.subject === subject);
      const mastery = masteryRows.find(r => r.subject === subject);

      let score = 0;
      let source = 'none';

      if (quiz && Number(quiz.total) > 0) {
        score  = Math.round((Number(quiz.correct) / Number(quiz.total)) * 100);
        source = 'quiz';
      } else if (mastery && mastery.avg_mastery !== null) {
        score  = Math.round(Number(mastery.avg_mastery));
        source = 'mastery';
      }

      return { subject, score, source };
    });

    res.json({ scores });
  } catch (err) {
    next(err);
  }
});

export default router;
