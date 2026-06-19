import { z } from 'zod';

export const registerDocumentSchema = z.object({
  type_id: z.string().min(1, "Le type de document est requis"),
  numero: z.string().min(1, 'Le numéro est requis'),
  nom_complet: z.string().optional(),
  date_naissance: z.string().optional(),
  lieu_naissance: z.string().optional(),
  date_delivrance: z.string().optional(),
  date_expiration: z.string().optional(),
  photo_url: z.string().url('URL invalide').optional().or(z.literal('')),
  recto_url: z.string().url('URL invalide').optional().or(z.literal('')),
  verso_url: z.string().url('URL invalide').optional().or(z.literal('')),
});

export const shareDocumentSchema = z.object({
  document_id: z.string().min(1, 'Document requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  code_partage: z.string().optional(),
});

export type RegisterDocumentFormData = z.infer<typeof registerDocumentSchema>;
export type ShareDocumentFormData = z.infer<typeof shareDocumentSchema>;
