import { z } from 'zod';

const phoneRegex = /^(\+33|0)[1-9](\d{2}){4}$/;

export const lostDeclarationSchema = z.object({
  type_id: z.string().min(1, "Le type de document est requis"),
  nom_complet: z.string().min(1, 'Le nom complet est requis'),
  numero_document: z.string().min(1, 'Le numéro du document est requis'),
  date_delivrance: z.string().min(1, 'La date de délivrance est requise'),
  date_perte: z.string().min(1, 'La date de perte est requise'),
  lieu_perte: z.string().min(1, 'Le lieu de perte est requis'),
  lieu_perte_detail: z.string().optional(),
  description: z
    .string()
    .min(10, 'Au moins 10 caractères')
    .max(500, 'Maximum 500 caractères'),
  urgence: z.coerce
    .number()
    .min(1, 'Minimum 1')
    .max(5, 'Maximum 5'),
  nom_owner: z.string().min(1, 'Le nom du propriétaire est requis'),
  prenom_owner: z.string().min(1, 'Le prénom du propriétaire est requis'),
  email_owner: z.string().email('Email invalide'),
  telephone_owner: z
    .string()
    .regex(phoneRegex, 'Téléphone français invalide'),
  recompense: z.string().optional(),
  recompense_montant: z.string().optional(),
  mode_contact: z.string().optional(),
});

export const foundDeclarationSchema = z.object({
  type_id: z.string().min(1, "Le type de document est requis"),
  nom_complet: z.string().optional(),
  numero_document: z.string().optional(),
  date_trouvee: z.string().min(1, 'La date de trouvée est requise'),
  lieu_trouvee: z.string().min(1, 'Le lieu est requis'),
  description: z
    .string()
    .min(10, 'Au moins 10 caractères')
    .max(500, 'Maximum 500 caractères'),
  etat_physique: z.string().optional(),
  photo_recto: z.instanceof(File).optional(),
  photo_verso: z.instanceof(File).optional(),
});

export type LostDeclarationFormData = z.infer<typeof lostDeclarationSchema>;
export type FoundDeclarationFormData = z.infer<typeof foundDeclarationSchema>;
