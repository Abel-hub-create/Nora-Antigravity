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

    // Source 3 : exercices Aron (/exs et /ana)
    // QCM : comparaison directe user_answer vs correct_answer
    // open/practical : colonne is_correct persistée après correction GPT
    const exoRows = await query(`
      SELECT e.subject,
        COUNT(*) AS total,
        SUM(
          CASE
            WHEN ei.type = 'qcm' AND CAST(ei.user_answer AS UNSIGNED) = ei.correct_answer THEN 1
            WHEN ei.type IN ('open', 'practical') AND ei.is_correct = 1 THEN 1
            ELSE 0
          END
        ) AS correct
      FROM exercise_items ei
      JOIN exercises e ON e.id = ei.exercise_set_id
      WHERE e.user_id = ?
        AND ei.user_answer IS NOT NULL AND ei.user_answer != ''
        AND (
          ei.type = 'qcm'
          OR (ei.type IN ('open', 'practical') AND ei.is_correct IS NOT NULL)
        )
      GROUP BY e.subject
    `, [userId]);

    const scores = SUBJECTS.map(subject => {
      const quiz    = quizRows.find(r => r.subject === subject);
      const mastery = masteryRows.find(r => r.subject === subject);
      const exo     = exoRows.find(r => r.subject === subject);

      const quizCorrect = quiz ? Number(quiz.correct) : 0;
      const quizTotal   = quiz ? Number(quiz.total)   : 0;
      const exoCorrect  = exo  ? Number(exo.correct)  : 0;
      const exoTotal    = exo  ? Number(exo.total)    : 0;

      const totalAnswers = quizTotal + exoTotal;
      const totalCorrect = quizCorrect + exoCorrect;

      let score = 0;
      let source = 'none';

      if (totalAnswers > 0) {
        score  = Math.round((totalCorrect / totalAnswers) * 100);
        source = quizTotal > 0 && exoTotal > 0 ? 'quiz+exo' : quizTotal > 0 ? 'quiz' : 'exo';
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
