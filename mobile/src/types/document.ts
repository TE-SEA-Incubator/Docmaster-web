export type DocumentFormData = {
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
};
