export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DocTypeCatalog {
  id: string;
  code: string;
  nom: string;
  icone: string;
  is_active: boolean;
  delai_expiration_mois: number;
  created_at?: string;
  updated_at?: string;
}

/** Shape for the document declaration form (used by Declarer.tsx) */
export interface DocumentType {
  types: string[];
  nom_complet: string;
  numero_doc: string;
  date_delivrance: string;
  date_perte: string;
  lieu_perte: string;
  lieu_perte_detail: string;
  description: string;
  urgence: number;
  nom_owner: string;
  prenom_owner: string;
  email_owner: string;
  telephone_owner: string;
  photo: File | null;
}

export interface Document {
  id: string;
  type_id?: string;
  type_doc?: string;
  nom_sur_doc?: string;
  numero_doc?: string;
  photo_recto?: string;
  photo_verso?: string;
  is_lost?: boolean;
  is_verified?: boolean;
  date_delivrance?: string;
  date_expiration?: string;
  nom_autorite?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface Device {
  id: string;
  serial_number?: string;
  marque?: string;
  modele?: string;
  type: string;
  imei?: string;
  nom?: string;
  couleur?: string;
  is_lost?: boolean;
  is_verified?: boolean;
  verified_at?: string;
  created_at: string;
  updated_at?: string;
  // Extended fields matching the full HTML form
  category?: string;
  brand?: string;
  model?: string;
  serial_number_imei?: string;
  color?: string;
  purchase_date?: string;
  garantie_end?: string;
  purchase_value?: number;
  where_buy?: string;
  notes?: string;
  assurance?: string;
  status?: string;
  photos?: string[];
  [key: string]: unknown;
}

export interface Declaration {
  id: string;
  type: "lost" | "found";
  document_type?: string;
  document_id?: string;
  numero_document?: string;
  nom_complet?: string;
  description?: string;
  date_perte?: string;
  lieu_perte?: string;
  date_trouvee?: string;
  lieu_trouvee?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  // Extended fields from API
  declaration_type?: string;
  identifiant_doc_dm?: string;
  doc_type?: string;
  owner_name?: string;
  ville?: string;
  region?: string;
  pays?: string;
  photo_recto?: string;
  photo_verso?: string;
  etat_physique?: string;
  date_expiration?: string;
  document_number?: string;
  docTypeInfo?: { nom: string };
  // Declaration form fields
  nom_owner?: string;
  prenom_owner?: string;
  email_owner?: string;
  telephone_owner?: string;
  date_delivrance?: string;
  urgence?: number;
  recompense?: string;
  recompense_montant?: string;
  mode_contact?: string;
  consent?: boolean;
  found_location?: string;
  metadata?: Record<string, string>;
  is_lost?: boolean;
  is_found?: boolean;
  reference?: string;
}

export interface Notification {
  id: string;
  titre: string;
  message: string;
  type?: string;
  lue?: boolean;
  is_read?: boolean;
  created_at: string;
  [key: string]: unknown;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  duration_months: number;
  features: string[];
  is_active?: boolean;
  popular?: boolean;
  created_at?: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name?: string;
  status: "active" | "expired" | "cancelled" | "pending";
  start_date: string;
  expiry_date: string;
  created_at?: string;
}

export interface Referral {
  id: string;
  parrain_id?: string;
  filleul_id?: string;
  points_gagnes?: number;
  status: string;
  recompense_attribuee?: boolean;
  created_at?: string;
  nom?: string;
  prenom?: string;
  photo_url?: string;
  filleul_created_at?: string;
}

export interface EarningsRecord {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  currency: string;
  description: string | null;
  metadata: any;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id?: string;
  amount: number;
  currency?: string;
  method?: string;
  status: string;
  type?: string;
  reference?: string;
  created_at?: string;
}

export interface Claim {
  id: string;
  declaration_id: string;
  claimant_name?: string;
  claimant_email?: string;
  claimant_phone?: string;
  proof_url?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  pays?: string;
  ville?: string;
  role?: string;
  is_verified?: boolean;
  points?: number;
  wallet_balance?: number;
  photo_url?: string;
  date_naissance?: string;
  lieu_naissance?: string;
  code_invitation?: string;
  currency?: string;
  subscription?: Subscription;
  created_at?: string;
  updated_at?: string;
}
