const DOC_TYPE_IMAGES: Record<string, string> = {
  CNI: "/src/assets/images/cni-poubelle.jpeg",
  PASSPORT: "/src/assets/images/passport.png",
  PERMIS: "/src/assets/images/permis.jpg",
  DIPLOME: "/src/assets/images/bacc.png",
  CARTE_BLUE: "/src/assets/images/1.png",
  CARTE_GRISE: "/src/assets/images/docmaster.png",
};

const DOC_TYPE_ICONS: Record<string, string> = {
  CNI: "ph ph-identification-card",
  PASSPORT: "ph ph-book-open",
  PERMIS: "ph ph-car",
  DIPLOME: "ph ph-graduation-cap",
  CARTE_BLUE: "ph ph-credit-card",
  CARTE_GRISE: "ph ph-invoice",
  CARTE_SEJOUR: "ph ph-identification-badge",
  CARTE_VOTE: "ph ph-check-square",
  ACTE_NAISSANCE: "ph ph-file-plus",
  ACTE_MARIAGE: "ph ph-circle-dashed",
  ACTE_DECES: "ph ph-scroll",
  TITRE_FINANCIER: "ph ph-house-line",
  AUTRES: "ph ph-question",
};

const KEYWORD_ICONS: Array<[string[], string]> = [
  [["passport", "passeport"], "ph ph-book-open"],
  [["cni", "identit"], "ph ph-identification-card"],
  [["permis", "conduire"], "ph ph-car"],
  [["diplom", "bac"], "ph ph-graduation-cap"],
  [["mariage"], "ph ph-circle-dashed"],
  [["grise", "vehicule", "véhicule"], "ph ph-car-profile"],
  [["sejour", "séjour"], "ph ph-identification-badge"],
  [["vote", "electeur", "électeur"], "ph ph-check-square"],
  [["naissance"], "ph ph-file-plus"],
  [["deces", "décès"], "ph ph-scroll"],
  [["foncier", "financier"], "ph ph-house-line"],
];

export function normalizeDocTypeCode(code?: string | null): string {
  return (code || "").trim().toUpperCase();
}

export function hasDocTypeImage(code?: string | null): boolean {
  return Boolean(DOC_TYPE_IMAGES[normalizeDocTypeCode(code)]);
}

export function getDocTypeImage(code?: string | null): string {
  return DOC_TYPE_IMAGES[normalizeDocTypeCode(code)] || "/src/assets/images/devices_docs.png";
}

/**
 * `document_types.icone` porte un nom d'icône historique (« id-card », « id-card-outline »),
 * pas une classe Phosphor : le coller tel quel dans `ph ph-${icone}` ne rend rien. On retombe
 * sur le code, puis sur le libellé, puis sur un document générique.
 */
export function getDocTypeIcon(code?: string | null, nom?: string | null): string {
  const byCode = DOC_TYPE_ICONS[normalizeDocTypeCode(code)];
  if (byCode) return byCode;

  const key = `${code || ""} ${nom || ""}`.toLowerCase();
  for (const [words, icon] of KEYWORD_ICONS) {
    if (words.some((word) => key.includes(word))) return icon;
  }
  return "ph ph-file-text";
}
