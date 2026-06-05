import { useState, useEffect } from "react";
import { useI18n } from "../../context/I18nContext";
import type { Document } from "../../types/api";
import { declarationsService } from "../../services/declarationsService";
import { documentsService } from "../../services/documentsService";
import { generateDeclarationPDF } from "../../utils/pdf";
import DatePicker from "./DatePicker";
import Stepper from "./Stepper";



interface DocFormData {
  nom_complet: string;
  numero_doc: string;
  date_delivrance: string;
  date_expiration: string;
  description: string;
}

interface ReportLostModalProps {
  doc: Document;
  catLabels: Record<string, string>;
  onClose: () => void;
}

export default function ReportLostModal({ doc, catLabels, onClose }: ReportLostModalProps) {
  const { t } = useI18n();

  const steps = [
    { label: t("reportlost_step_property"), icon: "fa-user" },
    { label: t("reportlost_step_type"), icon: "fa-file" },
    { label: t("reportlost_step_info"), icon: "fa-pen" },
    { label: t("reportlost_step_location"), icon: "fa-map-pin" },
    { label: t("reportlost_step_contact"), icon: "fa-phone" },
  ];

  const docTypes = [
    { id: "cni", icon: "fa-solid fa-id-card", label: t("reportlost_doc_cni") },
    { id: "passport", icon: "fa-solid fa-passport", label: t("reportlost_doc_passeport") },
    { id: "permis", icon: "fa-solid fa-car-side", label: t("reportlost_doc_permis") },
    { id: "acte_naissance", icon: "fa-solid fa-file-lines", label: t("reportlost_doc_acte") },
    { id: "diplome", icon: "fa-solid fa-graduation-cap", label: t("reportlost_doc_diplome") },
    { id: "carte_bancaire", icon: "fa-solid fa-credit-card", label: t("reportlost_doc_carte") },
    { id: "attestation", icon: "fa-solid fa-file-circle-check", label: t("reportlost_doc_attestation") },
    { id: "autre", icon: "fa-solid fa-folder", label: t("reportlost_doc_autre") },
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
    { id: 1, label: t("reportlost_urgency_low"), icon: "fa-regular fa-face-smile", color: "text-green-mid bg-green-light border-green-mid/30" },
    { id: 2, label: t("reportlost_urgency_medium"), icon: "fa-regular fa-face-meh", color: "text-amber-500 bg-amber-50 border-amber-300" },
    { id: 3, label: t("reportlost_urgency_high"), icon: "fa-regular fa-face-frown", color: "text-red-500 bg-red-50 border-red-300" },
  ];

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{ ref: string } | null>(null);

  const [pourSoi, setPourSoi] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([doc.type_doc || "cni"]);
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
        [doc.type_doc || "cni"]: {
          nom_complet: doc.nom_sur_doc || "",
          numero_doc: doc.numero_doc || "",
          date_delivrance: doc.date_delivrance ? doc.date_delivrance.split("T")[0] : "",
          date_expiration: doc.date_expiration ? doc.date_expiration.split("T")[0] : "",
          description: doc.notes || "",
        },
      });
    }
  }, [doc]);

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
    if (!docForms[id]) {
      setDocForms((f) => ({ ...f, [id]: { nom_complet: "", numero_doc: "", date_delivrance: "", date_expiration: "", description: "" } }));
    }
  };

  const updateDocForm = (type: string, field: keyof DocFormData, value: string) => {
    setDocForms((f) => ({ ...f, [type]: { ...(f[type] || {}), [field]: value } }));
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
    setSubmitting(true);
    setError("");
    try {
      const docsData = selectedTypes.map((typeId) => {
        const dt = docTypes.find((t) => t.id === typeId);
        const f = docForms[typeId] || {};
        return {
          type_doc: typeId,
          label: dt?.label || typeId,
          nom_complet: f.nom_complet,
          numero_doc: f.numero_doc,
          date_delivrance: f.date_delivrance,
          date_expiration: f.date_expiration,
          description: f.description,
        };
      });

      const description = `[${t("reportlost_desc_urgence")}: ${urgencyLevels.find((u) => u.id === urgence)?.label}] ${t("reportlost_desc_lieu")}: ${lieu}. ${circonstances}${rewardEnabled && reward ? ` | ${t("reportlost_desc_recompense")}: ${reward} FCFA` : ""}`;

      for (const d of docsData) {
        await declarationsService.createLost({
          document_id: doc.id,
          numero_document: d.numero_doc || undefined,
          type_document: d.type_doc,
          nom_complet: d.nom_complet || undefined,
          date_perte: datePerte,
          lieu_perte: lieu,
          description,
        });
      }

      await documentsService.reportLost(doc.id);

      const refNum = `DOC-${Date.now().toString(36).toUpperCase()}`;
      setSuccessData({ ref: refNum });

      generateDeclarationPDF({
        ref: refNum,
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
        recompense: rewardEnabled ? reward : "",
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err?.response?.data?.error || err?.message || t("reportlost_submit_error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}
        style={{ background: "rgba(30,58,47,.85)", backdropFilter: "blur(8px)", zIndex: 200 }}>
        <div className="modal-box animate-in text-center" style={{ maxWidth: "420px" }}>
          <div className="w-20 h-20 rounded-full bg-green-light flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-check text-green-dark text-3xl" />
          </div>
          <h2 className="font-bricolage text-xl font-extrabold text-textMain mb-2">{t("reportlost_success_title")}</h2>
          <p className="text-[13px] text-textMuted mb-4">{t("reportlost_success_desc")}</p>
          <div className="inline-block px-5 py-2 bg-bgMain rounded-xl font-bricolage font-extrabold text-lg text-green-dark tracking-wider mb-4">
            {successData.ref}
          </div>
          <p className="text-[11px] text-textMuted mb-5">{t("reportlost_success_ref_desc")}</p>
          <div className="flex gap-3">
            <button onClick={() => {
              const docData = selectedTypes.map((id) => {
                const dt = docTypes.find((t) => t.id === id);
                const f = docForms[id] || {};
                return { label: dt?.label || id, nom_complet: f.nom_complet, numero: f.numero_doc, date_delivrance: f.date_delivrance, date_expiration: f.date_expiration };
              });
              generateDeclarationPDF({
                ref: successData.ref,
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
                recompense: rewardEnabled ? reward : "",
              });
            }}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-[13px] hover:bg-primary-dark transition-all flex items-center justify-center gap-2">
              <i className="fa-solid fa-file-pdf" /> {t("reportlost_download_pdf")}
            </button>
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-green-dark text-white font-bold text-[13px] hover:bg-green-mid transition-all">
              {t("reportlost_my_documents")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !submitting && onClose()}
      style={{ background: "rgba(30,58,47,.85)", backdropFilter: "blur(8px)", zIndex: 200 }}>
      <div className="modal-box animate-in" style={{ maxWidth: "640px", padding: 0, overflow: "hidden" }}>
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bricolage text-lg font-extrabold text-textMain">{t("reportlost_title")}</h2>
            <button onClick={onClose} disabled={submitting}
              className="w-8 h-8 rounded-lg border border-borda text-textMuted hover:text-textMain hover:border-textMain flex items-center justify-center transition-all text-sm">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
          <Stepper steps={steps} currentStep={step} orientation="vertical" />
        </div>

        <div className="px-6 pb-4 max-h-[55vh] overflow-y-auto">
          {step === 1 && (
            <div className="animate-in">
              <h3 className="font-bricolage text-base font-bold text-textMain mb-1">{t("reportlost_step1_question")}</h3>
              <p className="text-[12px] text-textMuted mb-4">{t("reportlost_step1_desc")}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: true, icon: "fa-user-check", label: t("reportlost_self") },
                  { id: false, icon: "fa-users", label: t("reportlost_other") },
                ].map((opt) => (
                  <button key={String(opt.id)} onClick={() => setPourSoi(opt.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      pourSoi === opt.id ? "border-primary bg-primary/5 shadow-sm" : "border-borda bg-white hover:border-primary/50"
                    }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      pourSoi === opt.id ? "bg-primary/20 text-primary" : "bg-bgMain text-textMuted"
                    }`}><i className={`fa-solid ${opt.icon}`} /></div>
                    <span className="text-[12px] font-semibold text-textMain">{opt.label}</span>
                  </button>
                ))}
              </div>
              {!pourSoi && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
                  <i className="fa-solid fa-info-circle mr-1" /> {t("reportlost_other_hint")}
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="animate-in">
              <h3 className="font-bricolage text-base font-bold text-textMain mb-1">{t("reportlost_step2_question")}</h3>
              <p className="text-[12px] text-textMuted mb-4">{t("reportlost_step2_desc")}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {docTypes.map((dt) => {
                  const sel = selectedTypes.includes(dt.id);
                  return (
                    <button key={dt.id} onClick={() => toggleType(dt.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        sel ? "border-primary bg-primary/5 shadow-sm" : "border-borda bg-white hover:border-primary/50"
                      }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                        sel ? "bg-primary/20 text-primary" : "bg-bgMain text-textMuted"
                      }`}><i className={dt.icon} /></div>
                      <span className="text-[10px] font-semibold text-textMain text-center leading-tight">{dt.label}</span>
                    </button>
                  );
                })}
              </div>
              {selectedTypes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedTypes.map((id) => {
                    const dt = docTypes.find((d) => d.id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-dark text-white rounded-full text-[10px] font-semibold">
                        <i className={dt?.icon || ""} /> {dt?.label || id}
                        <button onClick={() => toggleType(id)} className="opacity-70 hover:opacity-100"><i className="fa-solid fa-xmark text-[8px]" /></button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="animate-in space-y-5">
              <h3 className="font-bricolage text-base font-bold text-textMain mb-1">{t("reportlost_step3_title")}</h3>
              <p className="text-[12px] text-textMuted mb-2">{t("reportlost_step3_desc")}</p>
              {selectedTypes.map((id) => {
                const dt = docTypes.find((d) => d.id === id);
                const f = docForms[id] || {};
                return (
                  <div key={id} className="p-4 bg-bgMain rounded-2xl border border-borda">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs">
                        <i className={dt?.icon || "fa-solid fa-file"} />
                      </div>
                      <span className="font-bold text-[13px] text-textMain">{dt?.label || id}</span>
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
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_date_delivrance")}</label>
                          <DatePicker value={f.date_delivrance} onChange={(v) => updateDocForm(id, "date_delivrance", v)}
                            className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors" placeholder={t("reportlost_date_placeholder")} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_date_expiration")}</label>
                          <DatePicker value={f.date_expiration} onChange={(v) => updateDocForm(id, "date_expiration", v)}
                            className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors" placeholder={t("reportlost_date_placeholder")} />
                        </div>
                      </div>
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
          )}

          {step === 4 && (
            <div className="animate-in space-y-4">
              <h3 className="font-bricolage text-base font-bold text-textMain mb-1">{t("reportlost_step4_title")}</h3>
              <p className="text-[12px] text-textMuted mb-2">{t("reportlost_step4_desc")}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_date_perte")}</label>
                  <DatePicker value={datePerte} onChange={(v) => setDatePerte(v)}
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
          )}

          {step === 5 && (
            <div className="animate-in space-y-4">
              <h3 className="font-bricolage text-base font-bold text-textMain mb-1">{t("reportlost_step5_title")}</h3>
              <p className="text-[12px] text-textMuted mb-2">{t("reportlost_step5_desc")}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_telephone")}</label>
                  <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors" placeholder={t("reportlost_telephone_placeholder")} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_email_label")}</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
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
                    <i className="fa-solid fa-coins text-primary text-sm" />
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
                  <i className="fa-solid fa-circle-info mr-1" />
                  {t("reportlost_fee_notice")}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">{t("reportlost_password")}</label>
                <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="w-full px-3 py-2.5 bg-white border border-borda rounded-xl text-[13px] outline-none focus:border-primary transition-colors" placeholder={t("reportlost_password_placeholder")} />
                {error && <p className="text-[11px] text-red-500 font-semibold mt-1">{error}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-bgMain border-t border-borda flex items-center justify-between gap-3">
          <button onClick={step === 1 ? onClose : prevStep} disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-borda bg-white text-textMain text-[12px] font-semibold hover:bg-surface2 transition-all disabled:opacity-40 flex items-center gap-1.5">
            <i className="fa-solid fa-arrow-left text-[10px]" /> {step === 1 ? t("reportlost_cancel") : t("reportlost_previous")}
          </button>
          <p className="text-[11px] font-bold text-textMuted">{step} / 5</p>
          {step < 5 ? (
            <button onClick={nextStep} disabled={!isValid()}
              className="px-4 py-2.5 rounded-xl bg-green-dark text-white text-[12px] font-bold hover:bg-green-mid transition-all disabled:opacity-40 flex items-center gap-1.5">
              {t("reportlost_next")} <i className="fa-solid fa-arrow-right text-[10px]" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!isValid() || submitting || password.length < 4}
              className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-[12px] font-bold hover:bg-red-600 transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-lg shadow-red-500/25">
              {submitting ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paper-plane text-[10px]" />}
              {submitting ? t("reportlost_sending") : t("reportlost_submit")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
