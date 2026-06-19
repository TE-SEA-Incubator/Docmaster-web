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
  key: DocFieldKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  required: boolean;
  multiline?: boolean;
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

export const PRIMARY = '#F5A64B';
export const GREEN_DARK = '#1E3A2F';
export const GREEN = '#16A34A';
export const GREEN_BG = '#ECFDF5';
export const GREEN_BORDER = '#A7F3D0';
export const RED = '#EF4444';
export const RED_BG = '#FEF2F2';
export const AMBER = '#F59E0B';
export const AMBER_BG = '#FFFBEB';
export const BLUE = '#3B82F6';
export const TEXT_MAIN = '#1A1A1A';
export const TEXT_MUTED = '#6B7280';
export const TEXT_SUBTLE = '#9CA3AF';
export const BORDER = '#EAE3D8';
export const BORDER_DARK = '#E0D5C4';
export const CREAM = '#FAF7F2';
