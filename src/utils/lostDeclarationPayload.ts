// Le corps envoyé à POST /declarations/lost doit coller au CreateDeclarationDTO serveur :
// doc_type pointé sur le catalogue, owner_name et ville obligatoires, aucune clé inventée —
// sinon la déclaration est refusée en 400 et le client ne peut pas le savoir.

export interface LostDeclarationForm {
  nom_complet?: string;
  numero_doc?: string;
  date_delivrance?: string;
  date_expiration?: string;
  description?: string;
}

export interface LostDeclarationContext {
  ownerName: string;
  ville: string;
  lieu: string;
  lieuLabel: string;
  delivranceLabel: string;
  datePerte: string;
  urgence: number;
  telephone: string;
  email: string;
  circonstances: string;
  rewardEnabled: boolean;
  reward: string;
}

export const URGENCY_BY_LEVEL: Record<number, string> = { 1: "Basse", 2: "Modérée", 3: "Haute" };

// Les ids des types proposés par le modal ne sont pas des codes du catalogue serveur.
// Synonymes repris de la normalisation SQL (49_normalize_doc_type.sql).
export const CODE_SYNONYMS: Record<string, string> = {
  cni: "CNI",
  passport: "PASSPORT",
  permis: "PERMIS",
  acte_naissance: "ACTE_NAISSANCE",
  diplome: "DIPLOME",
  carte_bancaire: "CARTE_BLUE",
  attestation: "CNI",
  autre: "AUTRES",
};

// Codes du catalogue vers les ids locaux, pour que le type du document retrouvé garde
// son libellé et son délai d'expiration.
export const LOCAL_BY_CODE: Record<string, string> = {
  CNI: "cni",
  PASSPORT: "passport",
  PERMIS: "permis",
  ACTE_NAISSANCE: "acte_naissance",
  DIPLOME: "diplome",
  CARTE_BLUE: "carte_bancaire",
  AUTRES: "autre",
};

export function walletTypeId(typeDoc?: string): string {
  const code = String(typeDoc || "").trim().toUpperCase();
  if (!code) return "cni";
  return LOCAL_BY_CODE[code] || code;
}

export function buildLostDeclarationBody(
  catalogId: string,
  form: LostDeclarationForm,
  ctx: LostDeclarationContext,
  walletDocumentId?: string
): Record<string, unknown> {
  const hasPhone = ctx.telephone.replace(/\s/g, "").length > 4;
  const notes = [ctx.circonstances, form.description].filter(Boolean).join(" — ");
  const metadata: Record<string, string> = { [ctx.lieuLabel]: ctx.lieu };
  // date_delivrance n'a pas de colonne côté declarations : sans metadata, la saisie serait perdue.
  if (form.date_delivrance) metadata[ctx.delivranceLabel] = form.date_delivrance;

  const body: Record<string, unknown> = {
    doc_type: catalogId,
    owner_name: form.nom_complet || ctx.ownerName,
    ville: ctx.ville,
    date_perte: ctx.datePerte,
    urgence_niveau: URGENCY_BY_LEVEL[ctx.urgence] || "Modérée",
    mode_contact: hasPhone ? "PHONE" : ctx.email ? "EMAIL" : "APP_CHAT",
    metadata,
  };
  if (form.numero_doc) body.document_number = form.numero_doc;
  if (form.date_expiration) body.date_expiration = form.date_expiration;
  if (notes) body.description = notes.slice(0, 500);
  if (hasPhone) body.telephone_contact = ctx.telephone;
  if (ctx.email) body.email_contact = ctx.email;
  if (ctx.rewardEnabled && ctx.reward) body.recompense_montant = parseInt(ctx.reward, 10) || 0;
  // source_document_id est ce qui marque le document du coffre comme perdu ;
  // passer par PATCH /documents/:id/lost déclencherait une seconde déclaration en double.
  if (walletDocumentId) body.source_document_id = walletDocumentId;
  return body;
}
