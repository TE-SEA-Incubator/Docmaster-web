export interface FormField {
  id: string;
  label: string;
  type: "text" | "tel" | "email" | "date" | "select" | "textarea";
  icon?: string;
  placeholder?: string;
  optional?: boolean;
  options?: string[];
}

export interface DocumentMetadata {
  label: string;
  icon: string;
  color: string;
  fields: FormField[];
}

/**
 * Static per-document-type metadata (icon, accent color, field set).
 * Used to render form fields consistently across the declaration flow.
 * Backend doc-type codes are matched case-insensitively against the keys.
 */
export const DOC_META: Record<string, DocumentMetadata> = {
  cni: {
    label: "declarer_doc_type_cni",
    icon: "ph ph-identification-card",
    color: "#E8923A",
    fields: [
      { id: "titulaire", label: "declarer_field_titulaire_cni", type: "text", icon: "ph ph-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_cni", type: "text", icon: "ph ph-barcode", optional: true, placeholder: "declarer_placeholder_numero_cni" },
      { id: "date_naissance", label: "declarer_field_date_naissance", type: "date", icon: "ph ph-calendar" },
      { id: "lieu_naissance", label: "declarer_field_lieu_naissance", type: "text", icon: "ph ph-map-pin", placeholder: "declarer_placeholder_ville_ex" },
      { id: "date_delivrance", label: "declarer_field_date_delivrance", type: "date", icon: "ph ph-calendar", optional: true },
    ],
  },
  passeport: {
    label: "declarer_doc_type_passeport",
    icon: "ph ph-book-open",
    color: "#2D5A42",
    fields: [
      { id: "titulaire", label: "declarer_field_titulaire", type: "text", icon: "ph ph-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_passeport", type: "text", icon: "ph ph-barcode", optional: true, placeholder: "declarer_placeholder_numero_passeport" },
      { id: "date_naissance", label: "declarer_field_date_naissance", type: "date", icon: "ph ph-calendar", optional: true },
      { id: "date_expiration", label: "declarer_field_date_expiration", type: "date", icon: "ph ph-calendar" },
    ],
  },
  permis: {
    label: "declarer_doc_type_permis",
    icon: "ph ph-car",
    color: "#3B82F6",
    fields: [
      { id: "titulaire", label: "declarer_field_titulaire_permis", type: "text", icon: "ph ph-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_permis", type: "text", icon: "ph ph-barcode", optional: true, placeholder: "declarer_placeholder_numero_permis" },
      { id: "categorie", label: "declarer_field_categorie", type: "text", icon: "ph ph-stack-simple", placeholder: "declarer_placeholder_categorie" },
    ],
  },
  acte: {
    label: "declarer_doc_type_acte",
    icon: "ph ph-invoice",
    color: "#EC4899",
    fields: [
      { id: "titulaire", label: "declarer_field_titulaire", type: "text", icon: "ph ph-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_acte", type: "text", icon: "ph ph-barcode", optional: true, placeholder: "declarer_placeholder_numero_acte" },
      { id: "date_naissance", label: "declarer_field_date_naissance", type: "date", icon: "ph ph-calendar" },
      { id: "lieu_naissance", label: "declarer_field_lieu_naissance_acte", type: "text", icon: "ph ph-map-pin", placeholder: "declarer_placeholder_ville_ex_douala" },
    ],
  },
  banque: {
    label: "declarer_doc_type_banque",
    icon: "ph ph-credit-card",
    color: "#EF4444",
    fields: [
      { id: "titulaire", label: "declarer_field_nom_carte", type: "text", icon: "ph ph-user", placeholder: "declarer_placeholder_nom_carte" },
      { id: "banque_nom", label: "declarer_field_nom_banque", type: "text", icon: "ph ph-bank", placeholder: "declarer_placeholder_nom_banque" },
      { id: "numero", label: "declarer_field_derniers_chiffres", type: "text", icon: "ph ph-hash", optional: true, placeholder: "declarer_placeholder_derniers_chiffres" },
    ],
  },
  titre: {
    label: "declarer_doc_type_titre",
    icon: "ph ph-house",
    color: "#F59E0B",
    fields: [
      { id: "titulaire", label: "declarer_field_proprietaire", type: "text", icon: "ph ph-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_titre", type: "text", icon: "ph ph-barcode", optional: true, placeholder: "declarer_placeholder_numero_titre" },
      { id: "ville", label: "declarer_field_localisation", type: "text", icon: "ph ph-map-pin", placeholder: "declarer_placeholder_ville_ex_kribi" },
    ],
  },
  diplome: {
    label: "declarer_doc_type_diplome",
    icon: "ph ph-graduation-cap",
    color: "#8B5CF6",
    fields: [
      { id: "titulaire", label: "declarer_field_laureat", type: "text", icon: "ph ph-user", placeholder: "declarer_placeholder_nom" },
      { id: "intitule", label: "declarer_field_intitule", type: "text", icon: "ph ph-graduation-cap", placeholder: "declarer_placeholder_intitule" },
      { id: "specialite", label: "declarer_field_specialite", type: "text", icon: "ph ph-book", placeholder: "declarer_placeholder_specialite" },
      { id: "annee", label: "declarer_field_annee", type: "text", icon: "ph ph-calendar-dots", placeholder: "declarer_placeholder_annee" },
    ],
  },
  carte_sejour: {
    label: "declarer_doc_type_carte_sejour",
    icon: "ph ph-stamp",
    color: "#0EA5E9",
    fields: [
      { id: "titulaire", label: "declarer_field_titulaire", type: "text", icon: "ph ph-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_sejour", type: "text", icon: "ph ph-barcode", optional: true, placeholder: "declarer_placeholder_numero_sejour" },
      { id: "date_naissance", label: "declarer_field_date_naissance", type: "date", icon: "ph ph-calendar", optional: true },
      { id: "date_delivrance", label: "declarer_field_date_delivrance", type: "date", icon: "ph ph-calendar", optional: true },
    ],
  },
  carte_vote: {
    label: "declarer_doc_type_carte_vote",
    icon: "ph ph-check-square",
    color: "#10B981",
    fields: [
      { id: "titulaire", label: "declarer_field_titulaire", type: "text", icon: "ph ph-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_vote", type: "text", icon: "ph ph-barcode", optional: true, placeholder: "declarer_placeholder_numero_vote" },
      { id: "date_naissance", label: "declarer_field_date_naissance", type: "date", icon: "ph ph-calendar", optional: true },
    ],
  },
  carte_blue: {
    label: "declarer_doc_type_carte_blue",
    icon: "ph ph-credit-card",
    color: "#3B82F6",
    fields: [
      { id: "titulaire", label: "declarer_field_nom_carte", type: "text", icon: "ph ph-user", placeholder: "declarer_placeholder_nom_carte" },
      { id: "numero", label: "declarer_field_numero_carte", type: "text", icon: "ph ph-barcode", optional: true, placeholder: "declarer_placeholder_numero_carte" },
      { id: "date_delivrance", label: "declarer_field_date_delivrance", type: "date", icon: "ph ph-calendar", optional: true },
    ],
  },
  titre_financier: {
    label: "declarer_doc_type_titre_financier",
    icon: "ph ph-house-line",
    color: "#F59E0B",
    fields: [
      { id: "titulaire", label: "declarer_field_proprietaire", type: "text", icon: "ph ph-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_titre", type: "text", icon: "ph ph-barcode", optional: true, placeholder: "declarer_placeholder_numero_titre" },
      { id: "ville", label: "declarer_field_localisation", type: "text", icon: "ph ph-map-pin", placeholder: "declarer_placeholder_ville_ex_kribi" },
    ],
  },
  acte_naissance: {
    label: "declarer_doc_type_acte_naissance",
    icon: "ph ph-file-text",
    color: "#EC4899",
    fields: [
      { id: "titulaire", label: "declarer_field_titulaire", type: "text", icon: "ph ph-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_acte", type: "text", icon: "ph ph-barcode", optional: true, placeholder: "declarer_placeholder_numero_acte" },
      { id: "date_naissance", label: "declarer_field_date_naissance", type: "date", icon: "ph ph-calendar" },
      { id: "lieu_naissance", label: "declarer_field_lieu_naissance_acte", type: "text", icon: "ph ph-map-pin", placeholder: "declarer_placeholder_ville_ex_douala" },
    ],
  },
  acte_mariage: {
    label: "declarer_doc_type_acte_mariage",
    icon: "ph ph-circle-dashed",
    color: "#F43F5E",
    fields: [
      { id: "titulaire", label: "declarer_field_titulaire", type: "text", icon: "ph ph-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_acte", type: "text", icon: "ph ph-barcode", optional: true, placeholder: "declarer_placeholder_numero_acte" },
      { id: "date_marriage", label: "declarer_field_date_marriage", type: "date", icon: "ph ph-calendar" },
      { id: "lieu_marriage", label: "declarer_field_lieu_marriage", type: "text", icon: "ph ph-map-pin", placeholder: "declarer_placeholder_ville_ex_douala" },
    ],
  },
  acte_deces: {
    label: "declarer_doc_type_acte_deces",
    icon: "ph ph-scroll",
    color: "#6B7280",
    fields: [
      { id: "titulaire", label: "declarer_field_titulaire", type: "text", icon: "ph ph-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_acte", type: "text", icon: "ph ph-barcode", optional: true, placeholder: "declarer_placeholder_numero_acte" },
      { id: "date_deces", label: "declarer_field_date_deces", type: "date", icon: "ph ph-calendar" },
      { id: "lieu_deces", label: "declarer_field_lieu_deces", type: "text", icon: "ph ph-map-pin", placeholder: "declarer_placeholder_ville_ex_douala" },
    ],
  },
  autre: {
    label: "declarer_doc_type_autre",
    icon: "ph ph-file",
    color: "#6B7280",
    fields: [
      { id: "titulaire", label: "declarer_field_nom_document", type: "text", icon: "ph ph-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_reference", type: "text", icon: "ph ph-barcode", optional: true, placeholder: "declarer_placeholder_reference" },
      { id: "description", label: "declarer_field_description", type: "textarea", icon: "ph ph-align-left", placeholder: "declarer_placeholder_description" },
    ],
  },
};

export const PLACE_KEYS = [
  "declarer_place_market",
  "declarer_place_transport",
  "declarer_place_administration",
  "declarer_place_hospital",
  "declarer_place_airport",
  "declarer_place_school",
  "declarer_place_restaurant",
  "declarer_place_street",
];
