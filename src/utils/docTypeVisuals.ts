const DOC_TYPE_IMAGES: Record<string, string> = {
  CNI: "/src/assets/images/cni-poubelle.jpeg",
  PASSPORT: "/src/assets/images/passport.png",
  PERMIS: "/src/assets/images/permis.jpg",
  DIPLOME: "/src/assets/images/bacc.png",
  CARTE_BLUE: "/src/assets/images/1.png",
  CARTE_GRISE: "/src/assets/images/docmaster.png",
};

const DOC_TYPE_ICONS: Record<string, string> = {
  CNI: "fa-id-card",
  PASSPORT: "fa-passport",
  PERMIS: "fa-car",
  DIPLOME: "fa-graduation-cap",
  CARTE_BLUE: "fa-credit-card",
  CARTE_GRISE: "fa-file-invoice",
  CARTE_SEJOUR: "fa-id-badge",
  CARTE_VOTE: "fa-check-to-slot",
  ACTE_NAISSANCE: "fa-file-circle-plus",
  ACTE_MARIAGE: "fa-ring",
  ACTE_DECES: "fa-scroll",
  TITRE_FINANCIER: "fa-house-chimney",
  AUTRES: "fa-circle-question",
};

const KEYWORD_ICONS: Array<[string[], string]> = [
  [["passport", "passeport"], "fa-passport"],
  [["cni", "identit"], "fa-id-card"],
  [["permis", "conduire"], "fa-car"],
  [["diplom", "bac"], "fa-graduation-cap"],
  [["mariage"], "fa-ring"],
  [["grise", "vehicule", "véhicule"], "fa-car-side"],
  [["sejour", "séjour"], "fa-id-badge"],
  [["vote", "electeur", "électeur"], "fa-check-to-slot"],
  [["naissance"], "fa-file-circle-plus"],
  [["deces", "décès"], "fa-scroll"],
  [["foncier", "financier"], "fa-house-chimney"],
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
 * `document_types.icone` est un nom d'icône Mantine (« id-card-outline »), pas une classe
 * FontAwesome : le coller dans `fa-solid fa-${icone}` ne rend rien. On retombe sur le code, puis
 * sur le libellé, puis sur un document générique.
 */
export function getDocTypeIcon(code?: string | null, nom?: string | null): string {
  const byCode = DOC_TYPE_ICONS[normalizeDocTypeCode(code)];
  if (byCode) return byCode;

  const key = `${code || ""} ${nom || ""}`.toLowerCase();
  for (const [words, icon] of KEYWORD_ICONS) {
    if (words.some((word) => key.includes(word))) return icon;
  }
  return "fa-file-lines";
}
