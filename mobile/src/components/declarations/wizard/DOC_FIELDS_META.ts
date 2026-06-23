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
    { key: 'titulaire', label: 'Nom du titulaire', icon: 'person-outline', placeholder: 'Ex: NGUELE Jean', type: 'text' },
    { key: 'numero', label: 'Numéro CNI', icon: 'barcode-outline', placeholder: 'Ex: 123456789', type: 'text' },
    { key: 'date_naissance', label: 'Date de naissance', icon: 'calendar-outline', type: 'date' },
    { key: 'lieu_naissance', label: 'Lieu de naissance', icon: 'location-outline', placeholder: 'Ex: Yaoundé', type: 'text' },
    { key: 'date_delivrance', label: 'Date de délivrance', icon: 'calendar-outline', type: 'date', optional: true },
  ],
  passeport: [
    { key: 'titulaire', label: 'Nom du titulaire', icon: 'person-outline', placeholder: 'Ex: KAMGA Marie', type: 'text' },
    { key: 'numero', label: 'Numéro de passeport', icon: 'barcode-outline', placeholder: 'Ex: 1234567', type: 'text' },
    { key: 'date_naissance', label: 'Date de naissance', icon: 'calendar-outline', type: 'date', optional: true },
    { key: 'date_expiration', label: "Date d'expiration", icon: 'calendar-outline', type: 'date' },
  ],
  permis: [
    { key: 'titulaire', label: 'Nom du titulaire', icon: 'person-outline', placeholder: 'Ex: MBARGA Paul', type: 'text' },
    { key: 'numero', label: 'Numéro du permis', icon: 'barcode-outline', placeholder: 'Ex: 123456789', type: 'text' },
    { key: 'categorie', label: 'Catégorie', icon: 'layers-outline', placeholder: 'Ex: B, C, D', type: 'text' },
  ],
  acte: [
    { key: 'titulaire', label: 'Nom du titulaire', icon: 'person-outline', placeholder: 'Ex: NOM Prénom', type: 'text' },
    { key: 'numero', label: "Numéro de l'acte", icon: 'barcode-outline', placeholder: "Numéro d'acte", type: 'text' },
    { key: 'date_naissance', label: 'Date de naissance', icon: 'calendar-outline', type: 'date' },
    { key: 'lieu_naissance', label: 'Lieu de naissance', icon: 'location-outline', placeholder: 'Ex: Douala', type: 'text' },
  ],
  banque: [
    { key: 'titulaire', label: 'Nom sur la carte', icon: 'person-outline', placeholder: 'Ex: JEAN DUPONT', type: 'text' },
    { key: 'banque_nom', label: 'Nom de la banque', icon: 'business-outline', placeholder: 'Ex: Afriland First Bank', type: 'text' },
    { key: 'numero', label: '4 derniers chiffres', icon: 'cash-outline', placeholder: 'Ex: 4567', type: 'text' },
  ],
  titre: [
    { key: 'titulaire', label: 'Propriétaire', icon: 'person-outline', placeholder: 'Ex: NOM Prénom', type: 'text' },
    { key: 'numero', label: 'Numéro du titre', icon: 'barcode-outline', placeholder: 'Ex: TF-12345', type: 'text' },
    { key: 'ville', label: 'Localisation', icon: 'location-outline', placeholder: 'Ex: Kribi', type: 'text' },
  ],
  diplome: [
    { key: 'titulaire', label: 'Nom du lauréat', icon: 'person-outline', placeholder: 'Ex: NOM Prénom', type: 'text' },
    { key: 'intitule', label: 'Intitulé du diplôme', icon: 'school-outline', placeholder: 'Ex: Licence Informatique', type: 'text' },
    { key: 'specialite', label: 'Spécialité', icon: 'book-outline', placeholder: 'Ex: Génie logiciel', type: 'text' },
    { key: 'annee', label: 'Année', icon: 'calendar-outline', placeholder: 'Ex: 2023', type: 'text' },
  ],
  carte_sejour: [
    { key: 'titulaire', label: 'Nom du titulaire', icon: 'person-outline', placeholder: 'Ex: NOM Prénom', type: 'text' },
    { key: 'numero', label: 'Numéro de séjour', icon: 'barcode-outline', placeholder: 'Ex: 1234567', type: 'text' },
    { key: 'date_naissance', label: 'Date de naissance', icon: 'calendar-outline', type: 'date', optional: true },
    { key: 'date_delivrance', label: 'Date de délivrance', icon: 'calendar-outline', type: 'date', optional: true },
  ],
  carte_vote: [
    { key: 'titulaire', label: 'Nom du titulaire', icon: 'person-outline', placeholder: 'Ex: NOM Prénom', type: 'text' },
    { key: 'numero', label: 'Numéro carte de vote', icon: 'barcode-outline', placeholder: 'Ex: 12345', type: 'text' },
    { key: 'date_naissance', label: 'Date de naissance', icon: 'calendar-outline', type: 'date', optional: true },
  ],
  carte_blue: [
    { key: 'titulaire', label: 'Nom sur la carte', icon: 'person-outline', placeholder: 'Ex: JEAN DUPONT', type: 'text' },
    { key: 'numero', label: 'Numéro de carte', icon: 'barcode-outline', placeholder: 'Ex: 1234567', type: 'text' },
    { key: 'date_delivrance', label: 'Date de délivrance', icon: 'calendar-outline', type: 'date', optional: true },
  ],
  titre_financier: [
    { key: 'titulaire', label: 'Propriétaire', icon: 'person-outline', placeholder: 'Ex: NOM Prénom', type: 'text' },
    { key: 'numero', label: 'Numéro du titre', icon: 'barcode-outline', placeholder: 'Ex: TF-12345', type: 'text' },
    { key: 'ville', label: 'Localisation', icon: 'location-outline', placeholder: 'Ex: Kribi', type: 'text' },
  ],
  acte_naissance: [
    { key: 'titulaire', label: 'Nom du titulaire', icon: 'person-outline', placeholder: 'Ex: NOM Prénom', type: 'text' },
    { key: 'numero', label: "Numéro de l'acte", icon: 'barcode-outline', placeholder: "Numéro d'acte", type: 'text' },
    { key: 'date_naissance', label: 'Date de naissance', icon: 'calendar-outline', type: 'date' },
    { key: 'lieu_naissance', label: 'Lieu de naissance', icon: 'location-outline', placeholder: 'Ex: Douala', type: 'text' },
  ],
  acte_mariage: [
    { key: 'titulaire', label: 'Nom du titulaire', icon: 'person-outline', placeholder: 'Ex: NOM Prénom', type: 'text' },
    { key: 'numero', label: "Numéro de l'acte", icon: 'barcode-outline', placeholder: "Numéro d'acte", type: 'text' },
    { key: 'date_marriage', label: 'Date du mariage', icon: 'calendar-outline', type: 'date' },
    { key: 'lieu_marriage', label: 'Lieu du mariage', icon: 'location-outline', placeholder: 'Ex: Douala', type: 'text' },
  ],
  acte_deces: [
    { key: 'titulaire', label: 'Nom du défunt', icon: 'person-outline', placeholder: 'Ex: NOM Prénom', type: 'text' },
    { key: 'numero', label: "Numéro de l'acte", icon: 'barcode-outline', placeholder: "Numéro d'acte", type: 'text' },
    { key: 'date_deces', label: 'Date du décès', icon: 'calendar-outline', type: 'date' },
    { key: 'lieu_deces', label: 'Lieu du décès', icon: 'location-outline', placeholder: 'Ex: Douala', type: 'text' },
  ],
  autre: [
    { key: 'titulaire', label: 'Nom du document', icon: 'person-outline', placeholder: 'Ex: NOM Prénom', type: 'text' },
    { key: 'numero', label: 'Référence', icon: 'barcode-outline', placeholder: 'Référence du document', type: 'text' },
    { key: 'description', label: 'Description', icon: 'create-outline', placeholder: 'Décrivez le document', type: 'textarea' },
  ],
};

/**
 * Récupère les champs pour un code de document donné.
 * Retourne un tableau vide si le code n'est pas trouvé.
 */
export function getDocFields(code: string | null | undefined): DocFieldDef[] {
  if (!code) return [];
  return DOC_FIELDS_META[code] || [];
}