import { z } from 'zod';

export const createSyntheseSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Le titre est requis').max(255),
    originalContent: z.string().min(1, 'Le contenu original est requis'),
    summaryContent: z.string().min(1, 'Le résumé est requis'),
    sourceType: z.enum(['text', 'voice', 'photo']).optional().default('text'),
    flashcards: z.array(z.object({
      front: z.string().min(1),
      back: z.string().min(1),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional()
    })).optional().default([]),
    quizQuestions: z.array(z.object({
      question: z.string().min(1),
      options: z.array(z.string()).min(2).max(6),
      correctAnswer: z.number().int().min(0),
      explanation: z.string().optional()
    })).optional().default([])
  })
});

export const updateTitleSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Le titre est requis').max(255)
  })
});

export const searchSchema = z.object({
  query: z.object({
    search: z.string().optional().default(''),
    limit: z.string().optional().transform(v => parseInt(v) || 50),
    offset: z.string().optional().transform(v => parseInt(v) || 0)
  })
});

export const flashcardProgressSchema = z.object({
  body: z.object({
    isCorrect: z.boolean()
  })
});

export const quizProgressSchema = z.object({
  body: z.object({
    questionId: z.number().int().positive(),
    isCorrect: z.boolean()
  })
});
