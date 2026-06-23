import type { Ionicons } from '@expo/vector-icons';

export type DocFieldKey =
  | 'titulaire'
  | 'numero'
  | 'date_naissance'
  | 'lieu_naissance'
  | 'date_delivrance'
  | 'date_expiration'
  | 'categorie'
  | 'banque_nom'
  | 'ville'
  | 'intitule'
  | 'specialite'
  | 'annee'
  | 'description';

export type DocFieldDef = {
  key: DocFieldKey | string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  required?: boolean;
  optional?: boolean;
  multiline?: boolean;
  type?: 'text' | 'date' | 'textarea' | 'tel' | 'email';
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  placeholder?: string;
};

export type DocTypeMeta = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  hasExpiration: boolean;
  fields: DocFieldDef[];
};
