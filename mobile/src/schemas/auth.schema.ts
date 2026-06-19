import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email('Email invalide'),
  mot_de_passe: z
    .string()
    .min(1, 'Le mot de passe est requis')
    .min(6, 'Au moins 6 caractères'),
});

export const registerSchema = z.object({
  nom: z
    .string()
    .min(1, 'Le nom est requis')
    .max(50, 'Maximum 50 caractères'),
  prenom: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(50, 'Maximum 50 caractères'),
  email: z
    .string()
    .min(1, "L'email est requis")
    .email('Email invalide'),
  mot_de_passe: z
    .string()
    .min(1, 'Le mot de passe est requis')
    .min(6, 'Au moins 6 caractères')
    .max(128, 'Maximum 128 caractères'),
  telephone: z
    .string()
    .regex(/^(\+33|0)[1-9](\d{2}){4}$/, 'Téléphone français invalide')
    .optional()
    .or(z.literal('')),
  pays: z.string().optional(),
  ville: z.string().optional(),
  code_parrainage: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email('Email invalide'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  mot_de_passe: z
    .string()
    .min(1, 'Le mot de passe est requis')
    .min(6, 'Au moins 6 caractères'),
});

export const verificationPinSchema = z.object({
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z
    .string()
    .regex(/^(\+33|0)[1-9](\d{2}){4}$/, 'Téléphone invalide')
    .optional()
    .or(z.literal('')),
});

export const emailPinSchema = z.object({
  email: z.string().email('Email invalide'),
  pin: z
    .string()
    .length(6, 'Le code doit faire 6 chiffres')
    .regex(/^\d{6}$/, 'Format invalide'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type VerificationPinFormData = z.infer<typeof verificationPinSchema>;
export type EmailPinFormData = z.infer<typeof emailPinSchema>;
