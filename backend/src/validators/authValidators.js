import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, 'Le nom doit contenir au moins 2 caractères')
      .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
    email: z.string()
      .email('Adresse email invalide'),
    password: z.string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    language: z.enum(['fr', 'en', 'es', 'zh']).optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string()
      .email('Adresse email invalide'),
    password: z.string()
      .min(1, 'Le mot de passe est requis'),
    rememberMe: z.boolean().optional()
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string()
      .email('Adresse email invalide'),
    language: z.enum(['fr', 'en', 'es', 'zh']).optional()
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string()
      .min(1, 'Token requis'),
    password: z.string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  })
});

export const syncUserDataSchema = z.object({
  body: z.object({
    level: z.number().optional(),
    exp: z.number().optional(),
    next_level_exp: z.number().optional(),
    streak: z.number().optional(),
    eggs: z.number().optional(),
    collection: z.array(z.string()).optional()
  })
});
