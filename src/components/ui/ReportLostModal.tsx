import { useState, useEffect, useMemo } from "react";
import { Stepper } from "@mantine/core";
import { Dialog, DialogContent, DialogBody } from "./dialog";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useI18n } from "../../context/I18nContext";
import { useAuth } from "../../context/AuthContext";
import type { DocTypeCatalog, Document } from "../../types/api";
import { declarationsService, documentTypesService } from "../../services/declarationsService";
import {
  CODE_SYNONYMS,
  buildLostDeclarationBody,
  walletTypeId,
  type LostDeclarationContext,
} from "../../utils/lostDeclarationPayload";
import { generateDeclarationPDF } from "../../utils/pdf";
import DatePicker from "./DatePicker";
import { todayISO } from "../../utils/dateHelpers";

interface DocFormData {
  nom_complet: string;
  numero_doc: string;
  date_delivrance: string;
  date_expiration: string;
  description: string;
}

interface ReportLostModalProps {
  doc: Document;
  catLabels?: Record<string, string>;
  onClose: (submitted?: { refs: string[] }) => void;
}

function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0);
  return d.toISOString().split("T")[0];
}

export default function ReportLostModal({ doc, onClose }: ReportLostModalProps) {
  const { t } = useI18n();
  const { user } = useAuth();

  const docTypes = [
    { id: "cni", icon: "ph ph-identification-card", label: t("reportlost_doc_cni"), delai_expiration_mois: 120 },
    { id: "passport", icon: "ph ph-book-open", label: t("reportlost_doc_passeport"), delai_expiration_mois: 60 },
    { id: "permis", icon: "ph ph-car-profile", label: t("reportlost_doc_permis"), delai_expiration_mois: 60 },
    { id: "acte_naissance", icon: "ph ph-file-text", label: t("reportlost_doc_acte"), delai_expiration_mois: 0 },
    { id: "diplome", icon: "ph ph-graduation-cap", label: t("reportlost_doc_diplome"), delai_expiration_mois: 0 },
    { id: "carte_bancaire", icon: "ph ph-credit-card", label: t("reportlost_doc_carte"), delai_expiration_mois: 48 },
    { id: "attestation", icon: "ph ph-seal-check", label: t("reportlost_doc_attestation"), delai_expiration_mois: 0 },
    { id: "autre", icon: "ph ph-folder", label: t("reportlost_doc_autre"), delai_expiration_mois: 0 },
  ];

  const places = [
    t("reportlost_place_home"),
    t("reportlost_place_transport"),
    t("reportlost_place_restaurant"),
    t("reportlost_place_commerce"),
    t("reportlost_place_public"),
    t("reportlost_place_school"),
    t("reportlost_place_work"),
    t("reportlost_place_autre"),
  ];

  const urgencyLevels = [
    { id: 1, label: t("reportlost_urgency_low"), icon: "ph ph-smiley", color: "text-green-mid bg-green-light border-green-mid/30" },
    { id: 2, label: t("reportlost_urgency_medium"), icon: "ph ph-smiley-meh", color: "text-amber-500 bg-amber-50 border-amber-300" },
    { id: 3, label: t("reportlost_urgency_high"), icon: "ph ph-smiley-sad", color: "text-red-500 bg-red-50 border-red-300" },
  ];

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{ refs: string[] } | null>(null);
  const [catalog, setCatalog] = useState<DocTypeCatalog[]>([]);

  const [pourSoi, setPourSoi] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([walletTypeId(doc.type_doc)]);
  const [docForms, setDocForms] = useState<Record<string, DocFormData>>({});
  const [lieu, setLieu] = useState("");
  const [datePerte, setDatePerte] = useState(new Date().toISOString().split("T")[0]);
  const [circonstances, setCirconstances] = useState("");
  const [urgence, setUrgence] = useState(2);
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [reward, setReward] = useState("");
  const [rewardEnabled, setRewardEnabled] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (doc) {
      setDocForms({
        [walletTypeId(doc.type_doc)]: {
          nom_complet: doc.nom_sur_doc || "",
          numero_doc: doc.numero_doc || "",
          date_delivrance: doc.date_delivrance ? doc.date_delivrance.split("T")[0] : "",
          date_expiration: doc.date_expiration ? doc.date_expiration.split("T")[0] : "",
          description: doc.notes || "",
        },
      });
    }
  }, [doc]);

  useEffect(() => {
    let cancelled = false;
    documentTypesService
      .getActive()
      .then((res) => { if (!cancelled) setCatalog(res.data || []); })
      .catch(() => { if (!cancelled) setCatalog([]); });
    return () => { cancelled = true; };
  }, []);

  const catalogByCode = useMemo(() => {
    const map: Record<string, DocTypeCatalog> = {};
    for (const entry of catalog) map[String(entry.code).toUpperCase()] = entry;
    return map;
  }, [catalog]);

  // declarations.doc_type attend une entrée du catalogue document_types, jamais un id local.
  const resolveCatalogType = (typeId: string): DocTypeCatalog | undefined =>
    catalogByCode[typeId.toUpperCase()] ?? catalogByCode[CODE_SYNONYMS[typeId] ?? ""];

  const labelOf = (typeId: string) =>
    docTypes.find((d) => d.id === typeId)?.label ?? resolveCatalogType(typeId)?.nom ?? typeId;

  const toggleType = (id: string) => {
    // Un seul type actif à la fois : sélectionner un nouveau type remplace le précédent.
    setSelectedTypes((prev) => (prev.includes(id) ? [] : [id]));
    if (!docForms[id]) {
      setDocForms((f) => ({ ...f, [id]: { nom_complet: "", numero_doc: "", date_delivrance: "", date_expiration: "", description: "" } }));
    }
  };

  const updateDocForm = (type: string, field: keyof DocFormData, value: string) => {
    setDocForms((f) => {
      const updated = { ...(f[type] || {}), [field]: value };
      if (field === "date_delivrance" && value) {
        const dt = docTypes.find((d) => d.id === type);
        const expMoins = dt?.delai_expiration_mois ?? resolveCatalogType(type)?.delai_expiration_mois ?? 0;
        if (expMoins > 0) {
          updated.date_expiration = addMonths(value, expMoins);
        }
      }
      return { ...f, [type]: updated };
    });
  };

  const nextStep = () => step < 5 && setStep((s) => s + 1);
  const prevStep = () => step > 1 && setStep((s) => s - 1);

  const isValid = () => {
    if (step === 1) return true;
    if (step === 2) return selectedTypes.length > 0;
    if (step === 3) return selectedTypes.every((t) => (docForms[t]?.nom_complet || "").length > 0);
    if (step === 4) return !!datePerte && !!lieu;
    if (step === 5) return !!telephone;
    return true;
  };

  const handleSubmit = async () => {
    const profileName = `${user?.prenom || ""} ${user?.nom || ""}`.trim();
    const resolved = selectedTypes.map((typeId) => ({ typeId, catalogType: resolveCatalogType(typeId) }));
    // Sans entrée catalogue, la déclaration serait refusée : on n'envoie rien plutôt qu'un half-send.
    if (resolved.some((r) => !r.catalogType)) {
      setError(t("reportlost_submit_error"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const docsData = resolved.map(({ typeId, catalogType }) => {
        const f = docForms[typeId] || {};
        return {
          type_doc: typeId,
          catalog_id: String(catalogType?.id || ""),
          label: labelOf(typeId),
          nom_complet: f.nom_complet,
          numero_doc: f.numero_doc,
          date_delivrance: f.date_delivrance,
          date_expiration: f.date_expiration,
          description: f.description,
        };
      });

      const ctx: LostDeclarationContext = {
        ownerName: doc.nom_sur_doc || profileName || t("declarer_owner_unknown"),
        ville: (user?.ville || "").trim() || t("declarer_not_specified"),
        lieu,
        lieuLabel: t("reportlost_desc_lieu"),
        delivranceLabel: t("reportlost_date_delivrance"),
        datePerte,
        urgence,
        telephone,
        email,
        circonstances,
        rewardEnabled,
        reward,
      };

      const walletCode = String(doc.type_doc || "").toUpperCase();
      const refs: string[] = [];

      for (const d of docsData) {
        const isWalletDoc = walletCode === d.type_doc.toUpperCase() || docsData.length === 1;
        const res = await declarationsService.createLost(
          buildLostDeclarationBody(d.catalog_id, d, ctx, isWalletDoc ? doc.id : undefined)
        );
        const created = res?.data;
        if (!created?.id) throw new Error(res?.message || t("reportlost_submit_error"));
        if (created.identifiant_doc_dm) refs.push(created.identifiant_doc_dm);
      }

      setSuccessData({ refs });
      generateDeclarationPDF({
        ref: refs.join(", "),
        date: new Date().toLocaleDateString("fr-FR"),
        proprietaire: docForms[selectedTypes[0]]?.nom_complet || doc.nom_sur_doc || "",
        pour_soi: pourSoi,
        documents: docsData.map((d) => ({
          label: d.label,
          nom_complet: d.nom_complet || "",
          numero: d.numero_doc || "",
          date_delivrance: d.date_delivrance ? new Date(d.date_delivrance).toLocaleDateString("fr-FR") : "—",
          date_expiration: d.date_expiration ? new Date(d.date_expiration).toLocaleDateString("fr-FR") : "—",
        })),
        lieu_perte: lieu,
        date_perte: new Date(datePerte).toLocaleDateString("fr-FR"),
        circonstances,
        urgence: urgencyLevels.find((u) => u.id === urgence)?.label || t("reportlost_urgency_medium"),
        telephone,
        email,
        certifie: false,
      });
    } catch (e: unknown) {
      const data = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      if (data?.errors) {
        const details = Object.entries(data.errors)
          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
          .join(" · ");
        setError(`${data.message || t("reportlost_submit_error")} — ${details}`);
      } else {
        const err = e as { message?: string };
        setError(data?.message || err?.message || t("reportlost_submit_error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (successData) {
    // Cette écorce n'existe qu'après un 201 serveur : la quitter vaut confirmation côté liste.
    const done = () => onClose({ refs: successData.refs });
    const refLabel = successData.refs.join(", ");
    return (
      <Dialog open onOpenChange={done}>
        <DialogContent className="sm:max-w-md">
          <DialogBody className="pt-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-light flex items-center justify-center mx-auto mb-5">
                <i className="ph ph-check text-green-dark text-4xl" />
              </div>
              <h2 className="font-bricolage text-2xl font-extrabold text-textMain mb-3">{t("reportlost_success_title")}</h2>
              <p className="text-[14px] text-textMuted mb-5 leading-relaxed">{t("reportlost_success_desc")}</p>
              {refLabel && (
                <div className="inline-block px-6 py-3 bg-bgMain rounded-2xl font-bricolage font-extrabold text-xl text-green-dark tracking-wider mb-4 border border-green-dark/20">
                  {refLabel}
                </div>
              )}
              <p className="text-[12px] text-textMuted mb-6 leading-relaxed">{t("reportlost_success_ref_desc")}</p>
              <div className="flex gap-3">
                <button onClick={() => {
                  const docData = selectedTypes.map((id) => {
                    const f = docForms[id] || {};
                    return { label: labelOf(id), nom_complet: f.nom_complet, numero: f.numero_doc, date_delivrance: f.date_delivrance, date_expiration: f.date_expiration };
                  });
                  generateDeclarationPDF({
                    ref: refLabel,
                    date: new Date().toLocaleDateString("fr-FR"),
                    proprietaire: docForms[selectedTypes[0]]?.nom_complet || doc.nom_sur_doc || "",
                    pour_soi: pourSoi,
                    documents: docData.map((d) => ({ ...d, date_delivrance: d.date_delivrance ? new Date(d.date_delivrance).toLocaleDateString("fr-FR") : "—", date_expiration: d.date_expiration ? new Date(d.date_expiration).toLocaleDateString("fr-FR") : "—" })),
                    lieu_perte: lieu,
                    date_perte: new Date(datePerte).toLocaleDateString("fr-FR"),
                    circonstances,
                    urgence: urgencyLevels.find((u) => u.id === urgence)?.label || t("reportlost_urgency_medium"),
                    telephone,
                    email,
                    certifie: false,
                  });
                }}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-[14px] hover:bg-primary-dark transition-all flex items-center justify-center gap-2">
                  <i className="ph ph-file-pdf text-lg" /> {t("reportlost_download_pdf")}
                </button>
                <button onClick={done}
                  className="flex-1 py-3 rounded-xl bg-green-dark text-white font-bold text-[14px] hover:bg-green-mid transition-all">
                  {t("reportlost_my_documents")}
                </button>
              </div>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-borderMain">
          <h2 className="font-bricolage text-xl font-extrabold text-textMain">{t("reportlost_title")}</h2>
          <p className="text-[13px] text-textMuted mt-1">{t("reportlost_subtitle")}</p>
        </div>

        <DialogBody className="flex-1 px-6 py-4" style={{ maxHeight: "calc(90vh - 200px)", minHeight: "400px" }}>
          <Stepper active={step - 1} orientation="vertical" iconSize={36} styles={{
            stepIcon: { fontSize: '14px' },
            stepLabel: { fontSize: '14px', fontWeight: 700, fontFamily: 'Bricolage Grotesque' },
            separator: { marginLeft: '18px' },
          }}>
          <Stepper.Step label={t("reportlost_step_property")}>
            <div className="pl-2 pt-2">
              <h3 className="font-bricolage text-[15px] font-bold text-textMain mb-2">{t("reportlost_step1_question")}</h3>
              <p className="text-[13px] text-textMuted mb-4 leading-relaxed">{t("reportlost_step1_desc")}</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: true, icon: "ph ph-user-check", label: t("reportlost_self") },
                { id: false, icon: "ph ph-users", label: t("reportlost_other") },
              ].map((opt) => (
                <button key={String(opt.id)} onClick={() => setPourSoi(opt.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    pourSoi === opt.id ? "border-primary bg-primary/5 shadow-sm" : "border-borderMain bg-white hover:border-primary/50"
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                    pourSoi === opt.id ? "bg-primary/20 text-primary" : "bg-bgMain text-textMuted"
                  }`}><i className={`${opt.icon}`} /></div>
                  <span className="text-[13px] font-semibold text-textMain">{opt.label}</span>
                </button>
              ))}
            </div>
            {!pourSoi && (
              <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
                <i className="ph ph-info mr-1" /> {t("reportlost_other_hint")}
              </p>
            )}
            </div>
          </Stepper.Step>

          <Stepper.Step label={t("reportlost_step_type")}>
            <div className="pl-2 pt-2">
              <h3 className="font-bricolage text-[15px] font-bold text-textMain mb-2">{t("reportlost_step2_question")}</h3>
              <p className="text-[13px] text-textMuted mb-4 leading-relaxed">{t("reportlost_step2_desc")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {docTypes.map((dt) => {
                const sel = selectedTypes.includes(dt.id);
                return (
                  <button key={dt.id} onClick={() => toggleType(dt.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all relative ${
                      sel ? "border-primary bg-primary/5 shadow-sm" : "border-borderMain bg-white hover:border-primary/50"
                    }`}>
                    <span className={`exp-badge ${(dt.delai_expiration_mois ?? 0) > 0 ? "has-exp" : "no-exp"}`}>
                      {(dt.delai_expiration_mois ?? 0) > 0 ? t("has_expiration") : t("no_expiration")}
                    </span>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                      sel ? "bg-primary/20 text-primary" : "bg-bgMain text-textMuted"
                    }`}><i className={dt.icon} /></div>
                    <span className="text-[11px] font-semibold text-textMain text-center leading-tight">{dt.label}</span>
                  </button>
                );
              })}
            </div>
            {selectedTypes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedTypes.map((id) => {
                  const dt = docTypes.find((d) => d.id === id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-dark text-white rounded-full text-[11px] font-semibold">
                      <i className={dt?.icon || ""} /> {labelOf(id)}
                      <button onClick={() => toggleType(id)} className="opacity-70 hover:opacity-100"><i className="ph ph-x text-[9px]" /></button>
                    </span>
                  );
                })}
              </div>
            )}
            </div>
          </Stepper.Step>

          <Stepper.Step label={t("reportlost_step_info")}>
            <div className="pl-2 pt-2">
              <h3 className="font-bricolage text-[15px] font-bold text-textMain mb-2">{t("reportlost_step3_title")}</h3>
              <p className="text-[13px] text-textMuted mb-4 leading-relaxed">{t("reportlost_step3_desc")}</p>
              <div className="space-y-5">
              {selectedTypes.map((id) => {
                const dt = docTypes.find((d) => d.id === id);
                const f = docForms[id] || {};
                return (
                  <div key={id} className="p-4 bg-bgMain rounded-2xl border border-borda">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs">
                        <i className={dt?.icon || "ph ph-file"} />
                      </div>
                      <span className="font-bold text-[13px] text-textMain">{labelOf(id)}</span>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_nom_complet")}</label>
                          <input type="text" value={f.nom_complet} onChange={(e) => updateDocForm(id, "nom_complet", e.target.value)}
                            className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors" placeholder={t("reportlost_nom_complet_placeholder")} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_numero_doc")}</label>
                          <input type="text" value={f.numero_doc} onChange={(e) => updateDocForm(id, "numero_doc", e.target.value)}
                            className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors" placeholder={t("reportlost_numero_doc_placeholder")} />
                        </div>
                      </div>
                      {(() => {
                        const dtInfo = docTypes.find((d) => d.id === id);
                        const hasExpRow = (dtInfo?.delai_expiration_mois ?? 0) > 0;
                        if (hasExpRow) {
                          return (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_date_delivrance")}</label>
                                <DatePicker value={f.date_delivrance} onChange={(v) => updateDocForm(id, "date_delivrance", v)} maxDate={todayISO()}
                                  className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors" placeholder={t("reportlost_date_placeholder")} />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_date_expiration")}</label>
                                <DatePicker value={f.date_expiration} onChange={() => {}} disabled
                                  className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors opacity-60" placeholder={t("reportlost_date_placeholder")} />
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div>
                            <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_date_delivrance")}</label>
                            <DatePicker value={f.date_delivrance} onChange={(v) => updateDocForm(id, "date_delivrance", v)} maxDate={todayISO()}
                              className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors" placeholder={t("reportlost_date_placeholder")} />
                          </div>
                        );
                      })()}
                      <div>
                        <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_description")}</label>
                        <textarea value={f.description} onChange={(e) => updateDocForm(id, "description", e.target.value)} rows={2}
                          className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors resize-none" placeholder={t("reportlost_description_placeholder")} />
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </Stepper.Step>

          <Stepper.Step label={t("reportlost_step_location")}>
            <div className="pl-2 pt-2">
              <h3 className="font-bricolage text-[15px] font-bold text-textMain mb-2">{t("reportlost_step4_title")}</h3>
              <p className="text-[13px] text-textMuted mb-4 leading-relaxed">{t("reportlost_step4_desc")}</p>
              <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_date_perte")}</label>
                  <DatePicker value={datePerte} onChange={(v) => setDatePerte(v)} maxDate={todayISO()}
                    className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors" placeholder="jj/mm/aaaa" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_heure")}</label>
                  <input type="time" className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_lieu")}</label>
                <div className="flex flex-wrap gap-1.5">
                  {places.map((p) => (
                    <button key={p} onClick={() => setLieu(p)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                        lieu === p ? "bg-primary border-primary text-white" : "bg-white border-borda text-textMuted hover:border-primary"
                      }`}>{p}</button>
                  ))}
                </div>
                {lieu === t("reportlost_place_autre") && (
                  <input type="text" value={lieu} onChange={(e) => setLieu(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors mt-2" placeholder={t("reportlost_lieu_placeholder")} />
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_circonstances")}</label>
                <textarea value={circonstances} onChange={(e) => setCirconstances(e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors resize-none" placeholder={t("reportlost_circonstances_placeholder")} />
              </div>
              </div>
            </div>
          </Stepper.Step>

          <Stepper.Step label={t("reportlost_step_contact")}>
            <div className="pl-2 pt-2">
              <h3 className="font-bricolage text-[15px] font-bold text-textMain mb-2">{t("reportlost_step5_title")}</h3>
              <p className="text-[13px] text-textMuted mb-4 leading-relaxed">{t("reportlost_step5_desc")}</p>
              <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_telephone")}</label>
                  <PhoneInput
                    country={"cm"}
                    value={telephone}
                    onChange={(phone) => setTelephone(phone)}
                    placeholder={t("reportlost_telephone_placeholder")}
                    enableSearch
                    searchPlaceholder="Rechercher un pays..."
                    containerStyle={{ width: "100%" }}
                    inputStyle={{
                      width: "100%",
                      height: "40px",
                      fontSize: "13px",
                      borderRadius: "12px",
                      border: "1px solid #eae3d8",
                      background: "#fff",
                      color: "#1A1A1A",
                      paddingLeft: "56px",
                    }}
                    buttonStyle={{
                      borderRadius: "12px 0 0 12px",
                      border: "1px solid #eae3d8",
                      borderRight: "none",
                      background: "#fff",
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_email_label")}</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && isValid() && nextStep()}
                    className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors" placeholder={t("reportlost_email_placeholder")} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_urgency_label")}</label>
                <div className="flex gap-2">
                  {urgencyLevels.map((u) => (
                    <button key={u.id} onClick={() => setUrgence(u.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 text-[11px] font-semibold transition-all ${
                        urgence === u.id ? u.color + " border-current" : "bg-white border-borda text-textMuted hover:border-primary/50"
                      }`}>
                      <i className={u.icon} /> {u.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-bgMain rounded-xl border border-borda">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="ph ph-coins text-primary text-sm" />
                    <div>
                      <p className="text-[12px] font-bold text-textMain">{t("reportlost_reward_title")}</p>
                      <p className="text-[10px] text-textMuted">{t("reportlost_reward_desc")}</p>
                    </div>
                  </div>
                  <button onClick={() => setRewardEnabled(!rewardEnabled)}
                    className={`w-10 h-5 rounded-full transition-colors ${rewardEnabled ? "bg-primary" : "bg-borda"}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${rewardEnabled ? "translate-x-[22px]" : "translate-x-[3px]"}`} />
                  </button>
                </div>
                {rewardEnabled && (
                  <div className="mt-2 flex items-center gap-2">
                    <input type="number" value={reward} onChange={(e) => setReward(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors" placeholder={t("reportlost_reward_amount")} min="0" step="500" />
                    <span className="text-[11px] font-bold text-textMuted">FCFA</span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[11px] text-amber-800 font-medium">
                  <i className="ph ph-info mr-1" />
                  {t("reportlost_fee_notice")}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_password")}</label>
                <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && isValid() && !submitting && password.length >= 4 && handleSubmit()}
                  className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors" placeholder={t("reportlost_password_placeholder")} />
                {error && <p className="text-[11px] text-red-500 font-semibold mt-1">{error}</p>}
              </div>
              </div>
            </div>
          </Stepper.Step>
        </Stepper>
        </DialogBody>

        <div className="flex-shrink-0 p-4 bg-bgMain border-t border-borderMain flex items-center justify-between gap-3">
        <button onClick={step === 1 ? () => onClose() : prevStep} disabled={submitting}
          className="px-5 py-2.5 rounded-xl border border-borderMain bg-white text-textMain text-[13px] font-semibold hover:bg-surface2 transition-all disabled:opacity-40 flex items-center gap-2">
          <i className="ph ph-arrow-left text-xs" /> {step === 1 ? t("reportlost_cancel") : t("reportlost_previous")}
        </button>
        <p className="text-[12px] font-bold text-textMuted">Étape {step} / 5</p>
        {step < 5 ? (
          <button onClick={nextStep} disabled={!isValid()}
            className="px-5 py-2.5 rounded-xl bg-green-dark text-white text-[13px] font-bold hover:bg-green-mid transition-all disabled:opacity-40 flex items-center gap-2">
            {t("reportlost_next")} <i className="ph ph-arrow-right text-xs" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={!isValid() || submitting || password.length < 4}
            className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-bold hover:bg-red-600 transition-all disabled:opacity-40 flex items-center gap-2">
            {submitting ? <i className="ph ph-spinner animate-spin" /> : <i className="ph ph-paper-plane text-xs" />}
            {submitting ? t("reportlost_sending") : t("reportlost_submit")}
          </button>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
