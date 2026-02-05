import { z } from 'zod';

// Schema for creating a review
export const createReviewSchema = z.object({
  body: z.object({
    content: z.string()
      .min(1, 'Le contenu est requis')
      .max(120, 'L\'avis ne peut pas dépasser 120 caractères')
  })
});

// Schema for creating a suggestion
export const createSuggestionSchema = z.object({
  body: z.object({
    content: z.string()
      .min(1, 'Le contenu est requis')
      .max(70, 'La suggestion ne peut pas dépasser 70 caractères')
  })
});

// Schema for voting
export const voteSchema = z.object({
  body: z.object({
    vote: z.number()
      .int()
      .min(-1, 'Vote invalide')
      .max(1, 'Vote invalide')
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID invalide')
  })
});

// Schema for deleting
export const deleteSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID invalide')
  })
});
