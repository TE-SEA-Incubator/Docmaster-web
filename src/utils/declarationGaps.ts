export interface DeclarationLike {
  id: string;
  declaration_type?: string;
  type?: string;
  status?: string;
  owner_name?: string;
  nom_complet?: string;
  document_number?: string;
  numero_document?: string;
  ville?: string;
  lieu_perte?: string;
  date_perte?: string;
  telephone_contact?: string;
  email_contact?: string;
  description?: string;
}

export interface GapField {
  key: string;
  labelKey: string;
  input: "text" | "date" | "tel" | "email" | "textarea";
  lossOnly?: boolean;
}

// Le serveur refuse status, doc_type et transactions_id en PATCH : un client ne se
// déclare pas soi-même « restitué ». Seules ces informations descriptives se complètent.
const GAP_FIELDS: GapField[] = [
  { key: "owner_name", labelKey: "mesdeclarations_owner", input: "text" },
  { key: "document_number", labelKey: "mesdeclarations_document_number", input: "text" },
  { key: "ville", labelKey: "mesdeclarations_location", input: "text" },
  { key: "date_perte", labelKey: "declarer_loss_date", input: "date", lossOnly: true },
  { key: "telephone_contact", labelKey: "declarer_phone", input: "tel" },
  { key: "email_contact", labelKey: "declarer_email", input: "email" },
  { key: "description", labelKey: "mesdeclarations_description_notes", input: "textarea" },
];

const CLOSED_STATUSES = ["RETURNED", "CANCELLED", "CLAIMED", "RESOLVED"];

const readField = (decl: DeclarationLike, key: string): string => {
  const row = decl as Record<string, any>;
  const legacy = key === "owner_name" ? "nom_complet" : key === "document_number" ? "numero_document" : key === "ville" ? "lieu_perte" : "";
  const raw = row[key] ?? (legacy ? row[legacy] : undefined);
  return String(raw ?? "").trim();
};

/** Une déclaration close n'a plus rien à compléter : le parcours est terminé. */
export function isCompletable(decl?: DeclarationLike | null): boolean {
  if (!decl) return false;
  return !CLOSED_STATUSES.includes(String(decl.status || "").toUpperCase());
}

export function isLoss(decl?: DeclarationLike | null): boolean {
  return String(decl?.declaration_type || decl?.type || "").toUpperCase() === "LOST";
}

/**
 * Les champs vides de la déclaration, dans l'ordre du formulaire.
 * Ce que la plateforme connaît déjà n'est pas redemandé : c'est la valeur de départ.
 */
export function declarationGaps(decl?: DeclarationLike | null): GapField[] {
  if (!decl || !isCompletable(decl)) return [];
  return GAP_FIELDS
    .filter((field) => !field.lossOnly || isLoss(decl))
    .filter((field) => readField(decl, field.key) === "");
}

/** Ce que le client envoie : uniquement les clés du DTO, non vides et normalisées. */
export function buildGapPatch(
  gaps: GapField[],
  values: Record<string, string>
): Record<string, string> {
  const patch: Record<string, string> = {};
  for (const field of gaps) {
    const value = String(values[field.key] ?? "").trim();
    if (!value) continue;
    if (field.key === "date_perte") {
      const day = value.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      patch[field.key] = day;
      continue;
    }
    if (field.key === "telephone_contact") {
      patch[field.key] = value.replace(/[^\d+\s\-()]/g, "").slice(0, 20);
      continue;
    }
    if (field.key === "description") {
      patch[field.key] = value.slice(0, 500);
      continue;
    }
    patch[field.key] = value;
  }
  return patch;
}
