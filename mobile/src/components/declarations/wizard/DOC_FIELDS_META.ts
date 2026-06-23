import type { DocFieldDef } from './DOC_TYPE_META';

/**
 * Carte hardcodée des champs par type de document (étape 3 du wizard).
 * Aligne sur la constante DOC_META du web (src/pages/auth/Declarer.tsx:46-206).
 * La logique est identique : on définit localement les inputs de l'étape 3,
 * car le backend ne renvoie pas systématiquement ces champs via document_types.fields.
 *
 * Convention (alignée web) :
 *  - `optional: true` => champ optionnel (badge "Optionnel")
 *  - sans `optional` ou `optional: false` => champ requis (astérisque)
 *  - `type: 'date'` => affiche un DatePickerInput
 *  - `type: 'textarea'` => affiche un Input multiligne
 */
export const DOC_FIELDS_META: Record<string, DocFieldDef[]> = {
  cni: [
    { key: 'titulaire', label: 'field_titulaire_cni', icon: 'person-outline', placeholder: 'placeholder_nom', type: 'text' },
    { key: 'numero', label: 'field_numero_cni', icon: 'barcode-outline', placeholder: 'placeholder_numero_cni', type: 'text' },
    { key: 'date_naissance', label: 'field_date_naissance', icon: 'calendar-outline', type: 'date' },
    { key: 'lieu_naissance', label: 'field_lieu_naissance', icon: 'location-outline', placeholder: 'placeholder_ville_ex', type: 'text' },
    { key: 'date_delivrance', label: 'field_date_delivrance', icon: 'calendar-outline', type: 'date', optional: true },
  ],
  passeport: [
    { key: 'titulaire', label: 'field_titulaire', icon: 'person-outline', placeholder: 'placeholder_nom', type: 'text' },
    { key: 'numero', label: 'field_numero_passeport', icon: 'barcode-outline', placeholder: 'placeholder_numero_passeport', type: 'text' },
    { key: 'date_naissance', label: 'field_date_naissance', icon: 'calendar-outline', type: 'date', optional: true },
    { key: 'date_expiration', label: 'field_date_expiration', icon: 'calendar-outline', type: 'date' },
  ],
  permis: [
    { key: 'titulaire', label: 'field_titulaire_permis', icon: 'person-outline', placeholder: 'placeholder_nom', type: 'text' },
    { key: 'numero', label: 'field_numero_permis', icon: 'barcode-outline', placeholder: 'placeholder_numero_permis', type: 'text' },
    { key: 'categorie', label: 'field_categorie', icon: 'layers-outline', placeholder: 'placeholder_categorie', type: 'text' },
  ],
  acte: [
    { key: 'titulaire', label: 'field_titulaire', icon: 'person-outline', placeholder: 'placeholder_nom', type: 'text' },
    { key: 'numero', label: 'field_numero_acte', icon: 'barcode-outline', placeholder: 'placeholder_numero_acte', type: 'text' },
    { key: 'date_naissance', label: 'field_date_naissance', icon: 'calendar-outline', type: 'date' },
    { key: 'lieu_naissance', label: 'field_lieu_naissance_acte', icon: 'location-outline', placeholder: 'placeholder_ville_ex_douala', type: 'text' },
  ],
  banque: [
    { key: 'titulaire', label: 'field_nom_carte', icon: 'person-outline', placeholder: 'placeholder_nom_carte', type: 'text' },
    { key: 'banque_nom', label: 'field_nom_banque', icon: 'business-outline', placeholder: 'placeholder_nom_banque', type: 'text' },
    { key: 'numero', label: 'field_derniers_chiffres', icon: 'cash-outline', placeholder: 'placeholder_derniers_chiffres', type: 'text' },
  ],
  titre: [
    { key: 'titulaire', label: 'field_proprietaire', icon: 'person-outline', placeholder: 'placeholder_nom', type: 'text' },
    { key: 'numero', label: 'field_numero_titre', icon: 'barcode-outline', placeholder: 'placeholder_numero_titre', type: 'text' },
    { key: 'ville', label: 'field_localisation', icon: 'location-outline', placeholder: 'placeholder_ville_ex_kribi', type: 'text' },
  ],
  diplome: [
    { key: 'titulaire', label: 'field_laureat', icon: 'person-outline', placeholder: 'placeholder_nom', type: 'text' },
    { key: 'intitule', label: 'field_intitule', icon: 'school-outline', placeholder: 'placeholder_intitule', type: 'text' },
    { key: 'specialite', label: 'field_specialite', icon: 'book-outline', placeholder: 'placeholder_specialite', type: 'text' },
    { key: 'annee', label: 'field_annee', icon: 'calendar-outline', placeholder: 'placeholder_annee', type: 'text' },
  ],
  carte_sejour: [
    { key: 'titulaire', label: 'field_titulaire', icon: 'person-outline', placeholder: 'placeholder_nom', type: 'text' },
    { key: 'numero', label: 'field_numero_sejour', icon: 'barcode-outline', placeholder: 'placeholder_numero_sejour', type: 'text' },
    { key: 'date_naissance', label: 'field_date_naissance', icon: 'calendar-outline', type: 'date', optional: true },
    { key: 'date_delivrance', label: 'field_date_delivrance', icon: 'calendar-outline', type: 'date', optional: true },
  ],
  carte_vote: [
    { key: 'titulaire', label: 'field_titulaire', icon: 'person-outline', placeholder: 'placeholder_nom', type: 'text' },
    { key: 'numero', label: 'field_numero_vote', icon: 'barcode-outline', placeholder: 'placeholder_numero_vote', type: 'text' },
    { key: 'date_naissance', label: 'field_date_naissance', icon: 'calendar-outline', type: 'date', optional: true },
  ],
  carte_blue: [
    { key: 'titulaire', label: 'field_nom_carte', icon: 'person-outline', placeholder: 'placeholder_nom_carte', type: 'text' },
    { key: 'numero', label: 'field_numero_carte', icon: 'barcode-outline', placeholder: 'placeholder_numero_carte', type: 'text' },
    { key: 'date_delivrance', label: 'field_date_delivrance', icon: 'calendar-outline', type: 'date', optional: true },
  ],
  titre_financier: [
    { key: 'titulaire', label: 'field_proprietaire', icon: 'person-outline', placeholder: 'placeholder_nom', type: 'text' },
    { key: 'numero', label: 'field_numero_titre', icon: 'barcode-outline', placeholder: 'placeholder_numero_titre', type: 'text' },
    { key: 'ville', label: 'field_localisation', icon: 'location-outline', placeholder: 'placeholder_ville_ex_kribi', type: 'text' },
  ],
  acte_naissance: [
    { key: 'titulaire', label: 'field_titulaire', icon: 'person-outline', placeholder: 'placeholder_nom', type: 'text' },
    { key: 'numero', label: 'field_numero_acte', icon: 'barcode-outline', placeholder: 'placeholder_numero_acte', type: 'text' },
    { key: 'date_naissance', label: 'field_date_naissance', icon: 'calendar-outline', type: 'date' },
    { key: 'lieu_naissance', label: 'field_lieu_naissance_acte', icon: 'location-outline', placeholder: 'placeholder_ville_ex_douala', type: 'text' },
  ],
  acte_mariage: [
    { key: 'titulaire', label: 'field_titulaire', icon: 'person-outline', placeholder: 'placeholder_nom', type: 'text' },
    { key: 'numero', label: 'field_numero_acte', icon: 'barcode-outline', placeholder: 'placeholder_numero_acte', type: 'text' },
    { key: 'date_marriage', label: 'field_date_marriage', icon: 'calendar-outline', type: 'date' },
    { key: 'lieu_marriage', label: 'field_lieu_marriage', icon: 'location-outline', placeholder: 'placeholder_ville_ex_douala', type: 'text' },
  ],
  acte_deces: [
    { key: 'titulaire', label: 'field_titulaire', icon: 'person-outline', placeholder: 'placeholder_nom', type: 'text' },
    { key: 'numero', label: 'field_numero_acte', icon: 'barcode-outline', placeholder: 'placeholder_numero_acte', type: 'text' },
    { key: 'date_deces', label: 'field_date_deces', icon: 'calendar-outline', type: 'date' },
    { key: 'lieu_deces', label: 'field_lieu_deces', icon: 'location-outline', placeholder: 'placeholder_ville_ex_douala', type: 'text' },
  ],
  autre: [
    { key: 'titulaire', label: 'field_nom_document', icon: 'person-outline', placeholder: 'placeholder_nom', type: 'text' },
    { key: 'numero', label: 'field_reference', icon: 'barcode-outline', placeholder: 'placeholder_reference', type: 'text' },
    { key: 'description', label: 'field_description', icon: 'create-outline', placeholder: 'placeholder_description', type: 'textarea' },
  ],
};

/**
 * Récupère les champs pour un code de document donné.
 * Retourne un tableau vide si le code n'est pas trouvé.
 */
export function getDocFields(code: string | null | undefined): DocFieldDef[] {
  if (!code) return [];
  return DOC_FIELDS_META[code.toLowerCase()] || [];
}