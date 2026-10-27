/**
 * Le serveur rend ses raisons dans `errors`, indexé par nom de colonne, et ses textes de validation
 * ne sont pas traduits : on ne rend donc que le libellé du champ en français du fichier i18n courant,
 * et on laisse la raison telle quelle plutôt que d'inventer une traduction.
 */
const FIELD_LABEL_KEYS: Record<string, string> = {
  doc_type: "declarer_field_nom_document",
  owner_name: "declarer_field_titulaire",
  document_number: "trouver_doc_number",
  date_perte: "declarer_loss_date",
  date_naissance: "declarer_field_date_naissance",
  date_expiration: "declarer_field_date_expiration",
  ville: "trouver_city_district",
  telephone_contact: "declarer_phone",
  email_contact: "declarer_email",
  mode_contact: "trouver_contact_mode",
};

export function describeValidationErrors(
  errors: unknown,
  t: (key: string) => string
): string[] {
  if (!errors || typeof errors !== "object") return [];
  return Object.entries(errors as Record<string, unknown>).map(([field, reasons]) => {
    const labelKey = FIELD_LABEL_KEYS[field.split(".")[0]];
    const label = labelKey ? t(labelKey) : field;
    const detail = Array.isArray(reasons) ? reasons.join(", ") : String(reasons);
    return `${label} — ${detail}`;
  });
}
