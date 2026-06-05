import { useState, useRef } from "react";
import { useDocuments } from "../../hooks/useDocuments";
import { useI18n } from "../../context/I18nContext";
import Topbar from "../../layout/Topbar";
import DocumentCard from "../../components/cards/DocumentCard";
import DocumentDetailModal from "../../components/ui/DocumentDetailModal";
import ShareModal from "../../components/modals/Sharemodal";
import ReportLostModal from "../../components/ui/ReportLostModal";
import DatePicker from "../../components/ui/DatePicker";
import type { Document } from "../../types/api";

const docTypes = [
  { id: "cni", icon: "fa-solid fa-id-card", labelKey: "mesdocuments_tab_cni", cat: "identity" },
  { id: "passport", icon: "fa-solid fa-passport", labelKey: "mesdocuments_tab_passeport", cat: "travel" },
  { id: "permis", icon: "fa-solid fa-car", labelKey: "mesdocuments_tab_permis", cat: "vehicle" },
  { id: "diplome", icon: "fa-solid fa-graduation-cap", labelKey: "mesdocuments_tab_diplome", cat: "study" },
  { id: "naissance", icon: "fa-solid fa-baby", labelKey: "mesdocuments_tab_acte", cat: "identity" },
  { id: "autre", icon: "fa-solid fa-file", labelKey: "mesdocuments_tab_autre", cat: "other" },
];

export default function MesDocuments() {
  const { t } = useI18n();
  const { documents: docs, loading, register, remove, reportLost } = useDocuments();
  const [filterCat, setFilterCat] = useState("all");
  const [search, setSearch] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", number: "", issued: "", expiry: "", authority: "", notes: "" });
  const [rectoFile, setRectoFile] = useState<File | null>(null);
  const [versoFile, setVersoFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const rectoRef = useRef<HTMLInputElement>(null);
  const versoRef = useRef<HTMLInputElement>(null);

  const verifiedCount = docs.filter((d) => d.is_verified).length;
  const pendingCount = docs.filter((d) => !d.is_verified).length;

  const filtered = docs.filter((d) => {
    const matchCat = filterCat === "all" || d.type_doc === filterCat || docTypes.some((t) => t.id === filterCat && t.id === d.type_doc);
    const matchSearch = !search || (d.nom_sur_doc || "").toLowerCase().includes(search.toLowerCase()) || (d.numero_doc || "").includes(search);
    return matchCat && matchSearch;
  });

  function resetForm() {
    setStep(1);
    setSelectedType(null);
    setForm({ name: "", number: "", issued: "", expiry: "", authority: "", notes: "" });
    setRectoFile(null);
    setVersoFile(null);
    setConsent(false);
  }

  function closeAddModal() { setShowAddModal(false); resetForm(); }
  function goStep(s: number) { setStep(s); }

  async function handleSubmit() {
    if (!consent || !selectedType || !form.name || !rectoFile) return;
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("type_id", selectedType);
      data.append("numero", form.number);
      data.append("nom_complet", form.name);
      if (form.issued) data.append("date_delivrance", form.issued);
      if (form.expiry) data.append("date_expiration", form.expiry);
      if (form.authority) data.append("autorite", form.authority);
      if (form.notes) data.append("notes", form.notes);
      if (rectoFile) data.append("recto", rectoFile);
      if (versoFile) data.append("verso", versoFile);

      await register({
        type_id: selectedType,
        numero: form.number,
        nom_complet: form.name,
        date_delivrance: form.issued,
        date_expiration: form.expiry,
      });
      setSubmitting(false);
      setShowAddModal(false);
      setShowSuccess(true);
      resetForm();
      setTimeout(() => setShowSuccess(false), 4000);
    } catch {
      setSubmitting(false);
    }
  }

  function openViewModal(doc: Document) {
    setSelectedDoc(doc);
    setShowViewModal(true);
  }

  function openShareModal(doc: Document) {
    setSelectedDoc(doc);
    setShowShareModal(true);
  }

  async function handleDelete(doc: Document) {
    setSelectedDoc(doc);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!selectedDoc) return;
    await remove(selectedDoc.id);
    setShowDeleteModal(false);
  }

  async function handleLostModalClose() {
    setShowLostModal(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 5000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] pt-0 md:pt-6">
        <div className="w-11 h-11 rounded-full border-4 border-borda border-t-primary animate-spin" />
      </div>
    );
  }

  const R = (props: { children: React.ReactNode }) => (
    <span className="text-red-500 ml-0.5">*</span>
  );

  const FilterTab = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => setFilterCat(id)}
      className={`tab-filter ${filterCat === id ? "active" : ""}`}
    >
      {label} {id === "all" && `(${docs.length})`}
    </button>
  );

  const catLabelsT = {
    cni: t("mesdocuments_category_cni"),
    passport: t("mesdocuments_category_passeport"),
    permis: t("mesdocuments_category_permis"),
    diplome: t("mesdocuments_category_diplome"),
    naissance: t("mesdocuments_category_acte"),
    autre: t("mesdocuments_category_autre"),
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("mesdocuments_title")}
        breadcrumbs={[
          { label: t("mesdocuments_breadcrumb_home"), href: "/dashboard" },
          { label: t("mesdocuments_breadcrumb_documents") },
        ]}
      />
      <div className="main-content custom-scroll p-4 sm:p-6 flex flex-col gap-5 pb-24 md:pb-8 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">


        {/* Info banner */}
        {showBanner && (
          <div className="flex items-start gap-3 p-4 bg-primary/8 border border-primary/20 rounded-[14px]">
            <div className="w-9 h-9 rounded-[10px] bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <i className="fa-solid fa-shield-halved text-primary text-sm" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-textMain mb-0.5">{t("mesdocuments_banner_title")}</p>
              <p className="text-[12.5px] text-textMuted leading-relaxed">
                {t("mesdocuments_banner_desc")}
              </p>
            </div>
            <button onClick={() => setShowBanner(false)}
              className="flex-shrink-0 text-textMuted hover:text-textMain transition-colors">
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-borderMain rounded-[16px] p-4 flex flex-col gap-2">
            <div className="w-9 h-9 rounded-[10px] bg-primary/10 flex items-center justify-center">
              <i className="fa-solid fa-folder-open text-primary text-sm" />
            </div>
            <div className="font-bricolage text-2xl font-extrabold text-textMain">{docs.length}</div>
            <div className="text-[12px] text-textMuted font-medium">{t("mesdocuments_total_registered")}</div>
          </div>
          <div className="bg-white border border-borderMain rounded-[16px] p-4 flex flex-col gap-2">
            <div className="w-9 h-9 rounded-[10px] bg-green-light flex items-center justify-center">
              <i className="fa-solid fa-shield-check text-green-mid text-sm" />
            </div>
            <div className="font-bricolage text-2xl font-extrabold text-textMain">{verifiedCount}</div>
            <div className="text-[12px] text-textMuted font-medium">{t("mesdocuments_verified")}</div>
          </div>
          <div className="bg-white border border-borderMain rounded-[16px] p-4 flex flex-col gap-2">
            <div className="w-9 h-9 rounded-[10px] bg-amber-50 flex items-center justify-center">
              <i className="fa-solid fa-clock text-amber-500 text-sm" />
            </div>
            <div className="font-bricolage text-2xl font-extrabold text-textMain">{pendingCount}</div>
            <div className="text-[12px] text-textMuted font-medium">{t("mesdocuments_pending")}</div>
          </div>
          <div className="bg-white border border-borderMain rounded-[16px] p-4 flex flex-col gap-2">
            <div className="w-9 h-9 rounded-[10px] bg-blue-50 flex items-center justify-center">
              <i className="fa-solid fa-cloud-arrow-up text-blue-500 text-sm" />
            </div>
            <div className="font-bricolage text-2xl font-extrabold text-textMain">94%</div>
            <div className="text-[12px] text-textMuted font-medium">{t("mesdocuments_profile_completed")}</div>
          </div>
        </div>

        {/* Filters + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center bg-white border border-borderMain rounded-[11px] overflow-hidden flex-1 max-w-sm focus-within:border-primary transition-colors">
            <i className="fa-solid fa-search px-3 text-textMuted text-xs flex-shrink-0" />
            <input
              type="text" placeholder={t("mesdocuments_search_placeholder")} value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 py-2.5 pr-3 bg-transparent border-none outline-none font-poppins text-[13.5px] text-textMain placeholder:text-textMuted"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <FilterTab id="all" label={t("mesdocuments_filter_all")} />
            <FilterTab id="cni" label={t("mesdocuments_filter_identity")} />
            <FilterTab id="passport" label={t("mesdocuments_filter_travel")} />
            <FilterTab id="diplome" label={t("mesdocuments_filter_study")} />
            <FilterTab id="permis" label={t("mesdocuments_filter_vehicle")} />
          </div>
        </div>

        {/* Documents grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="drop-zone rounded-[18px] p-6 flex flex-col items-center justify-center gap-3 min-h-[180px] cursor-pointer group border-2 border-dashed border-[#D1C9BC] bg-[#FAF7F2] hover:border-primary hover:bg-[#FEF0DC] transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border-2 border-primary/25 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <i className="fa-solid fa-plus text-primary text-xl" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-bold text-textMain">{t("mesdocuments_add_document")}</p>
              <p className="text-[12px] text-textMuted">{t("mesdocuments_add_hint")}</p>
            </div>
          </button>

          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              catLabels={catLabelsT}
              onView={openViewModal}
              onShare={openShareModal}
              onDelete={handleDelete}
              onReportLost={(d) => { setSelectedDoc(d); setShowLostModal(true); }}
            />
          ))}
        </div>

        {/* Security notice */}
        <div className="flex items-center gap-3 p-4 bg-white border border-borderMain rounded-[14px]">
          <i className="fa-solid fa-lock text-green-mid text-lg flex-shrink-0" />
          <div>
            <p className="text-[12.5px] font-bold text-textMain">{t("mesdocuments_security_title")}</p>
            <p className="text-[11.5px] text-textMuted">{t("mesdocuments_security_desc")}</p>
          </div>
        </div>
      </div>

      {/* ── ADD DOCUMENT MODAL ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeAddModal()}>
          <div className="modal-box">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bricolage text-xl font-extrabold text-textMain">{t("mesdocuments_modal_title")}</h2>
                <p className="text-[12.5px] text-textMuted mt-0.5">{t("mesdocuments_step")} {step} {t("mesdocuments_of")} 3</p>
              </div>
              <button onClick={closeAddModal}
                className="w-9 h-9 rounded-full bg-bgMain border border-borderMain flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors text-textMuted">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Steps indicator */}
            <div className="flex items-center mb-7">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`step-dot ${s < step ? "done" : s === step ? "active" : "pending"}`}>{s}</div>
                  {s < 3 && <div className={`step-line ${s < step ? "done" : ""}`} />}
                </div>
              ))}
            </div>

            {/* Step 1: Type */}
            {step === 1 && (
              <div>
                <p className="text-[13.5px] font-semibold text-textMain mb-4">{t("mesdocuments_modal_choose_type")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  {docTypes.map((dt) => (
                    <button
                      key={dt.id}
                      onClick={() => { setSelectedType(dt.id); }}
                      className={`doc-type-btn ${selectedType === dt.id ? "selected" : ""}`}
                    >
                      <div className="w-10 h-10 rounded-[11px] bg-green-light flex items-center justify-center mx-auto mb-2">
                        <i className={`${dt.icon} text-green-mid text-lg`} />
                      </div>
                      <div className="text-[12.5px] font-bold text-textMain">{t(dt.labelKey)}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => goStep(2)} disabled={!selectedType}
                  className="w-full py-3 rounded-[13px] bg-primary text-white font-bricolage text-[14px] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-dark transition-all active:scale-[.98]">
                  {t("mesdocuments_continue")} <i className="fa-solid fa-arrow-right text-[12px] ml-1" />
                </button>
              </div>
            )}

            {/* Step 2: Info + Photos */}
            {step === 2 && (
              <div>
                <div className="flex flex-col gap-4 mb-6">
                  <div>
                    <label className="form-label">{t("mesdocuments_full_name")} <R /></label>
                    <input type="text" className="form-input" placeholder={t("mesdocuments_placeholder_name")} value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">{t("mesdocuments_doc_number")} <R /></label>
                    <input type="text" className="form-input" placeholder={t("mesdocuments_placeholder_number")} value={form.number}
                      onChange={(e) => setForm({ ...form, number: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">{t("mesdocuments_issue_date")}</label>
                      <DatePicker value={form.issued} onChange={(v) => setForm({ ...form, issued: v })} className="form-input" placeholder={t("mesdocuments_placeholder_date")} />
                    </div>
                    <div>
                      <label className="form-label">{t("mesdocuments_expiry_date")}</label>
                      <DatePicker value={form.expiry} onChange={(v) => setForm({ ...form, expiry: v })} className="form-input" placeholder={t("mesdocuments_placeholder_date")} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">{t("mesdocuments_issuing_authority")}</label>
                    <input type="text" className="form-input" placeholder={t("mesdocuments_placeholder_authority")} value={form.authority}
                      onChange={(e) => setForm({ ...form, authority: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">{t("mesdocuments_photo_recto")} <R /></label>
                    <div className="drop-zone rounded-2xl p-6 text-center cursor-pointer" onClick={() => rectoRef.current?.click()}>
                      <input ref={rectoRef} type="file" hidden accept="image/*" onChange={(e) => setRectoFile(e.target.files?.[0] || null)} />
                      {rectoFile ? (
                        <div className="space-y-2">
                          <i className="fa-solid fa-check-circle text-green-mid text-2xl" />
                          <p className="text-[12px] text-green-600 font-bold">{rectoFile.name}</p>
                          <button onClick={(e) => { e.stopPropagation(); setRectoFile(null); }} className="text-[11px] text-red-500 underline">{t("mesdocuments_change")}</button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <i className="fa-solid fa-camera-retro text-2xl text-slate-400" />
                          <p className="text-[14px] font-bold text-slate-900">{t("mesdocuments_add_recto")}</p>
                          <p className="text-[11px] text-slate-500">{t("mesdocuments_click_import")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">{t("mesdocuments_photo_verso")} <span className="text-slate-400 font-normal lowercase">— {t("mesdocuments_optional")}</span></label>
                    <div className="drop-zone rounded-2xl p-6 text-center cursor-pointer" onClick={() => versoRef.current?.click()}>
                      <input ref={versoRef} type="file" hidden accept="image/*" onChange={(e) => setVersoFile(e.target.files?.[0] || null)} />
                      {versoFile ? (
                        <div className="space-y-2">
                          <i className="fa-solid fa-check-circle text-green-mid text-2xl" />
                          <p className="text-[12px] text-green-600 font-bold">{versoFile.name}</p>
                          <button onClick={(e) => { e.stopPropagation(); setVersoFile(null); }} className="text-[11px] text-red-500 underline">{t("mesdocuments_change")}</button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <i className="fa-solid fa-folder-open text-2xl text-slate-400" />
                          <p className="text-[14px] font-bold text-slate-900">{t("mesdocuments_add_verso")}</p>
                          <p className="text-[11px] text-slate-500">{t("mesdocuments_click_import")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => goStep(1)}
                    className="px-5 py-3 rounded-[13px] bg-bgMain border border-borderMain text-textMain font-bold hover:border-textMain transition-colors flex items-center gap-2">
                    <i className="fa-solid fa-arrow-left text-[12px]" /> {t("mesdocuments_back")}
                  </button>
                  <button onClick={() => goStep(3)} disabled={!form.name || !form.number || !rectoFile}
                    className="flex-1 py-3 rounded-[13px] bg-primary text-white font-bricolage text-[14px] font-bold hover:bg-primary-dark transition-all active:scale-[.98] disabled:opacity-40">
                    {t("mesdocuments_continue")} <i className="fa-solid fa-arrow-right text-[12px] ml-1" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && (
              <div>
                <div className="p-4 bg-bgMain border border-borderMain rounded-[14px] mb-5">
                  <p className="text-[12px] font-bold text-textMuted uppercase tracking-wide mb-3">{t("mesdocuments_summary")}</p>
                  <div className="space-y-2">
                    {[{ label: t("mesdocuments_summary_name"), val: form.name }, { label: t("mesdocuments_summary_type"), val: selectedType }, { label: t("mesdocuments_summary_number"), val: form.number },
                      { label: t("mesdocuments_summary_issued"), val: form.issued || "—" }, { label: t("mesdocuments_summary_expiry"), val: form.expiry || "—" },
                      { label: t("mesdocuments_summary_documents"), val: `${rectoFile ? 1 : 0} ${t("mesdocuments_summary_files")}` },
                    ].map((i) => (
                      <div key={i.label} className="flex justify-between text-[13.5px]">
                        <span className="text-textMuted font-medium">{i.label}</span>
                        <span className="font-bold text-textMain">{i.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-100 rounded-[12px] mb-5">
                  <input type="checkbox" id="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 accent-primary flex-shrink-0 w-4 h-4 cursor-pointer" />
                  <label htmlFor="consent" className="text-[12.5px] text-textMain cursor-pointer leading-snug">
                    {t("mesdocuments_consent")}
                  </label>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => goStep(2)}
                    className="px-5 py-3 rounded-[13px] bg-bgMain border border-borderMain text-textMain font-bold hover:border-textMain transition-colors flex items-center gap-2">
                    <i className="fa-solid fa-arrow-left text-[12px]" /> {t("mesdocuments_back")}
                  </button>
                  <button onClick={handleSubmit} disabled={!consent || submitting}
                    className="flex-1 py-3 rounded-[13px] bg-green-dark text-white font-bricolage text-[14px] font-bold hover:bg-green-mid transition-all active:scale-[.98] flex items-center justify-center gap-2 disabled:opacity-40">
                    {submitting ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-shield-halved text-[13px]" /> {t("mesdocuments_save_secure")}</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VIEW MODAL ── */}
      {showViewModal && selectedDoc && (
        <DocumentDetailModal
          doc={selectedDoc}
          catLabels={catLabelsT}
          onClose={() => setShowViewModal(false)}
        />
      )}

      {/* ── SHARE MODAL ── */}
      {showShareModal && selectedDoc && (
        <ShareModal doc={selectedDoc} onClose={() => setShowShareModal(false)} />
      )}

      {/* ── DELETE CONFIRM ── */}
      {showDeleteModal && selectedDoc && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div className="modal-box max-w-sm" style={{ padding: "24px" }}>
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-trash text-red-500 text-lg" />
            </div>
            <h3 className="font-bricolage text-lg font-bold text-textMain text-center mb-1">{t("mesdocuments_delete_title")}</h3>
            <p className="text-[13px] text-textMuted text-center mb-5 leading-relaxed">
              {t("mesdocuments_delete_desc").replace("{name}", selectedDoc.nom_sur_doc || t("mesdocuments_document"))}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-[12px] bg-bgMain border border-borderMain text-textMain font-bold hover:border-textMain transition-colors">{t("mesdocuments_cancel")}</button>
              <button onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-[12px] bg-red-500 text-white font-bold hover:bg-red-600 transition-colors">{t("mesdocuments_delete")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── REPORT LOST MODAL ── */}
      {showLostModal && selectedDoc && (
        <ReportLostModal
          doc={selectedDoc}
          catLabels={catLabelsT}
          onClose={handleLostModalClose}
        />
      )}

      {/* ── SUCCESS TOAST ── */}
      {showSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-dark text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right fade-in duration-300">
          <i className="fa-solid fa-circle-check text-primary text-lg" />
          <div>
            <p className="font-bold text-sm">{t("mesdocuments_success_title")}</p>
            <p className="text-white/70 text-[12px]">{t("mesdocuments_success_desc")}</p>
          </div>
          <button onClick={() => setShowSuccess(false)} className="text-white/50 hover:text-white ml-2">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}
    </div>
  );
}
