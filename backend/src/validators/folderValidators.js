import { z } from 'zod';

export const createFolderSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Le nom est requis')
      .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
    color: z.string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide')
      .optional()
      .default('#6366f1')
  })
});

export const updateFolderSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Le nom est requis')
      .max(100, 'Le nom ne peut pas dépasser 100 caractères')
      .optional(),
    color: z.string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide')
      .optional()
  })
});

export const addSynthesesSchema = z.object({
  body: z.object({
    syntheseIds: z.array(z.number().int().positive())
      .min(1, 'Au moins une synthèse requise')
  })
});
