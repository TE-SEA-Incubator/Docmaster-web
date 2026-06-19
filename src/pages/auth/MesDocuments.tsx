import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { documentTypesService } from "../../services/declarationsService";
import { useDocuments } from "../../hooks/useDocuments";
import { useI18n } from "../../context/I18nContext";
import { useAuth } from "../../context/AuthContext";
import apiClient from "../../services/api";
import Topbar from "../../layout/Topbar";
import DocumentCard from "../../components/cards/DocumentCard";
import DocumentDetailModal from "../../components/ui/DocumentDetailModal";
import ShareModal from "../../components/modals/Sharemodal";
import ReportLostModal from "../../components/ui/ReportLostModal";
import DatePicker from "../../components/ui/DatePicker";
import type { Document, DocTypeCatalog } from "../../types/api";

function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0);
  return d.toISOString().split("T")[0];
}

export default function MesDocuments() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { documents: docs, loading, fetch: fetchDocs, register, remove, reportLost } = useDocuments();
  const [docTypes, setDocTypes] = useState<DocTypeCatalog[]>([]);
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
  const [validityOption, setValidityOption] = useState<'EXPIRING' | 'PERMANENT'>('EXPIRING');
  const [form, setForm] = useState({ name: "", number: "", issued: "", expiry: "", authority: "", notes: "" });
  const [rectoFile, setRectoFile] = useState<File | null>(null);
  const [versoFile, setVersoFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [customTypeName, setCustomTypeName] = useState("");
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const rectoRef = useRef<HTMLInputElement>(null);
  const versoRef = useRef<HTMLInputElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  const selectedDocType = useMemo(
    () => (selectedType ? docTypes.find((dt) => dt.code === selectedType) : null),
    [selectedType, docTypes]
  );
  const hasExpiration = validityOption === 'EXPIRING' && (selectedType === 'AUTRES' || (selectedDocType?.delai_expiration_mois ?? 0) > 0);
  const isAutoExpiry = selectedType !== 'AUTRES' && (selectedDocType?.delai_expiration_mois ?? 0) > 0;

  const updateIssued = (v: string) => {
    setForm((prev) => ({
      ...prev,
      issued: v,
      expiry: isAutoExpiry && v ? addMonths(v, selectedDocType!.delai_expiration_mois) : prev.expiry,
    }));
  };

  useEffect(() => {
    documentTypesService.getActive().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setDocTypes(res.data);
      }
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    }
    if (isTypeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTypeDropdownOpen]);

  const verifiedCount = docs.filter((d) => d.is_verified).length;
  const pendingCount = docs.filter((d) => !d.is_verified).length;

  const showArchived = filterCat === "__archived";
  const filtered = docs.filter((d) => {
    if (showArchived) return d.is_archived;
    if (d.is_archived) return false;
    const matchCat = filterCat === "all" || d.type_doc === filterCat;
    const matchSearch = !search || (d.nom_sur_doc || "").toLowerCase().includes(search.toLowerCase()) || (d.numero_doc || "").includes(search);
    return matchCat && matchSearch;
  });

  function resetForm() {
    setStep(1);
    setSelectedType(null);
    setValidityOption('EXPIRING');
    setForm({ name: "", number: "", issued: "", expiry: "", authority: "", notes: "" });
    setRectoFile(null);
    setVersoFile(null);
    setConsent(false);
    setCustomTypeName("");
    setIsTypeDropdownOpen(false);
  }

  function closeAddModal() { setShowAddModal(false); resetForm(); }
  function goStep(s: number) { setStep(s); }

  async function handleSubmit() {
    if (!consent || !selectedType || (selectedType === 'AUTRES' && !customTypeName.trim()) || !form.name || !rectoFile) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      const isCustom = selectedType === 'AUTRES' && customTypeName.trim();
      fd.append("type_doc", isCustom ? "AUTRES" : (selectedType || ""));
      fd.append("numero_doc", form.number);
      fd.append("nom_sur_doc", form.name);
      if (isCustom) fd.append("custom_type_name", customTypeName.trim());
      fd.append("validity_option", validityOption);
      if (validityOption === 'PERMANENT') {
        fd.append("date_expiration", "");
        fd.append("date_delivrance", "");
      } else {
        if (form.issued) fd.append("date_delivrance", form.issued);
        if (form.expiry) fd.append("date_expiration", form.expiry);
      }
      if (form.authority) fd.append("nom_autorite", form.authority);
      if (form.notes) fd.append("notes", form.notes);
      if (rectoFile) fd.append("photo_recto", rectoFile);
      if (versoFile) fd.append("photo_verso", versoFile);

      await apiClient.post("documents", fd);
      await fetchDocs();
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

  const catLabelsT = Object.fromEntries(
    docTypes.map((dt) => [dt.code, dt.nom])
  );

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("mesdocuments_title")}
        breadcrumbs={[
          { label: t("mesdocuments_breadcrumb_home"), href: "/dashboard" },
          { label: t("mesdocuments_breadcrumb_documents") },
        ]}
      />
      <div className="main-content custom-scroll p-4 sm:p-6 flex flex-col gap-5 pb-[calc(6rem+max(env(safe-area-inset-bottom),0.75rem))] md:pb-[calc(2rem+max(env(safe-area-inset-bottom),0.75rem))] max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">

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
        <div className="max-sm:hidden grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            {docTypes.map((dt) => (
              <FilterTab key={dt.code} id={dt.code} label={dt.nom} />
            ))}
            <FilterTab id="__archived" label={t("mesdocuments_filter_archived")} />
          </div>
        </div>

        {/* Documents grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => {
              const fullName = [user?.prenom, user?.nom].filter(Boolean).join(" ") || "";
              setForm((prev) => ({ ...prev, name: fullName }));
              setShowAddModal(true);
            }}
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
      {showAddModal && createPortal(
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeAddModal()}>
          <div className="modal-box animate-in">
            {/* Grab handle for mobile */}
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-5 sm:hidden" />
            
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

            {/* Step 1: Validity Option */}
            {step === 1 && (
              <div>
                <p className="text-[13.5px] font-semibold text-textMain mb-4">{t("mesdocuments_validity_option")}</p>
                <div className="flex flex-col gap-4 mb-6">
                  <button
                    onClick={() => { setValidityOption('EXPIRING'); setSelectedType(null); }}
                    className={`w-full p-5 rounded-[16px] border-2 transition-all text-left ${
                      validityOption === 'EXPIRING'
                        ? 'border-primary bg-[#FEF0DC]/40 scale-[1.01] shadow-lg shadow-primary/10'
                        : 'border-borderMain bg-white hover:border-primary/40 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center text-xl ${
                        validityOption === 'EXPIRING' ? 'bg-primary text-white' : 'bg-amber-50 text-amber-600'
                      }`}>
                        <i className="fa-solid fa-calendar-clock" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            validityOption === 'EXPIRING' ? 'border-primary' : 'border-textMuted'
                          }`}>
                            {validityOption === 'EXPIRING' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </div>
                          <span className="text-[15px] font-extrabold text-textMain">{t("mesdocuments_option_expiring")}</span>
                        </div>
                        <p className="text-[12.5px] text-textMuted mt-1 ml-7 leading-relaxed">
                          {t("mesdocuments_option_expiring_desc")}
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => { setValidityOption('PERMANENT'); setSelectedType(null); }}
                    className={`w-full p-5 rounded-[16px] border-2 transition-all text-left ${
                      validityOption === 'PERMANENT'
                        ? 'border-primary bg-[#FEF0DC]/40 scale-[1.01] shadow-lg shadow-primary/10'
                        : 'border-borderMain bg-white hover:border-primary/40 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center text-xl ${
                        validityOption === 'PERMANENT' ? 'bg-primary text-white' : 'bg-blue-50 text-blue-600'
                      }`}>
                        <i className="fa-solid fa-infinity" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            validityOption === 'PERMANENT' ? 'border-primary' : 'border-textMuted'
                          }`}>
                            {validityOption === 'PERMANENT' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </div>
                          <span className="text-[15px] font-extrabold text-textMain">{t("mesdocuments_option_permanent")}</span>
                        </div>
                        <p className="text-[12.5px] text-textMuted mt-1 ml-7 leading-relaxed">
                          {t("mesdocuments_option_permanent_desc")}
                        </p>
                      </div>
                    </div>
                  </button>

                </div>
                <button onClick={() => goStep(2)}
                  className="w-full py-3 rounded-[13px] bg-primary text-white font-bricolage text-[14px] font-bold hover:bg-primary-dark transition-all active:scale-[.98]">
                  {t("mesdocuments_continue")} <i className="fa-solid fa-arrow-right text-[12px] ml-1" />
                </button>
              </div>
            )}

            {/* Step 2: Type dropdown + Info + Photos */}
            {step === 2 && (
              <div>
                {/* Styled dropdown for document type */}
                <div className="mb-5">
                  <label className="form-label">{t("mesdocuments_modal_choose_type")} <R /></label>
                  <div className="relative" ref={typeDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                      className="w-full bg-white border border-borderMain rounded-[13px] py-3.5 pl-4 pr-10 text-[14px] font-medium text-textMain cursor-pointer flex items-center justify-between focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    >
                      <div className="flex items-center gap-2">
                        {selectedType ? (
                          selectedType === "AUTRES" ? (
                            <>
                              <div className="w-7 h-7 rounded-[8px] bg-primary/10 flex items-center justify-center">
                                <i className="fa-solid fa-file-signature text-primary text-xs" />
                              </div>
                              <span>{t("mesdocuments_custom_type")}</span>
                            </>
                          ) : (
                            (() => {
                              const dt = docTypes.find((d) => d.code === selectedType);
                              return (
                                <>
                                  <div className="w-7 h-7 rounded-[8px] bg-primary/10 flex items-center justify-center">
                                    <i className={`fa-solid fa-${dt?.icone || "file-lines"} text-primary text-xs`} />
                                  </div>
                                  <span>{dt?.nom}</span>
                                </>
                              );
                            })()
                          )
                        ) : (
                          <span className="text-textMuted">{t("mesdocuments_choose_expiring_type")}</span>
                        )}
                      </div>
                      <i className={`fa-solid fa-chevron-down text-xs transition-transform ${isTypeDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isTypeDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-borderMain rounded-[14px] shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="max-h-[240px] overflow-y-auto p-1.5 custom-scroll">
                          {docTypes
                            .filter((dt) => validityOption === 'EXPIRING' ? (dt.delai_expiration_mois ?? 0) > 0 : (dt.delai_expiration_mois ?? 0) === 0)
                            .map((dt) => (
                              <button
                                key={dt.code}
                                type="button"
                                onClick={() => {
                                  setSelectedType(dt.code);
                                  setCustomTypeName("");
                                  setIsTypeDropdownOpen(false);
                                  if (form.issued && (dt.delai_expiration_mois ?? 0) > 0) {
                                    setForm((prev) => ({ ...prev, expiry: addMonths(prev.issued, dt.delai_expiration_mois) }));
                                  }
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-[10px] text-left transition-colors hover:bg-primary/5 ${selectedType === dt.code ? "bg-primary/10 text-primary" : "text-textMain"}`}
                              >
                                <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 ${selectedType === dt.code ? "bg-primary text-white" : "bg-bgMain text-textMuted"}`}>
                                  <i className={`fa-solid fa-${dt.icone || "file-lines"} text-sm`} />
                                </div>
                                <span className="text-[14px] font-medium">{dt.nom}</span>
                                {selectedType === dt.code && <i className="fa-solid fa-check ml-auto text-xs" />}
                              </button>
                            ))}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedType("AUTRES");
                              setIsTypeDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-[10px] text-left transition-colors hover:bg-primary/5 ${selectedType === "AUTRES" ? "bg-primary/10 text-primary" : "text-textMain"}`}
                          >
                            <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 ${selectedType === "AUTRES" ? "bg-primary text-white" : "bg-bgMain text-textMuted"}`}>
                              <i className="fa-solid fa-file-signature text-sm" />
                            </div>
                            <span className="text-[14px] font-medium">{t("mesdocuments_custom_type")}</span>
                            {selectedType === "AUTRES" && <i className="fa-solid fa-check ml-auto text-xs" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom type input */}
                {selectedType === 'AUTRES' && (
                  <div className="mb-5 animate-in">
                    <label className="form-label">{t("mesdocuments_custom_type")}</label>
                    <input
                      type="text"
                      value={customTypeName}
                      onChange={(e) => setCustomTypeName(e.target.value)}
                      placeholder={t("mesdocuments_custom_type_placeholder")}
                      className="form-input"
                      autoFocus
                    />
                  </div>
                )}

                {/* Info fields */}
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
                  {hasExpiration ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="form-label">{t("mesdocuments_issue_date")} <span className="text-red-500 ml-0.5">*</span></label>
                        <DatePicker value={form.issued} onChange={updateIssued} className="form-input" placeholder={t("mesdocuments_placeholder_date")} />
                      </div>
                      <div>
                        <label className="form-label">{t("mesdocuments_expiry_date")}</label>
                        <DatePicker 
                          value={form.expiry} 
                          onChange={(v) => setForm({ ...form, expiry: v })} 
                          className={`form-input ${isAutoExpiry ? "opacity-60" : ""}`} 
                          placeholder={t("mesdocuments_placeholder_date")} 
                          disabled={isAutoExpiry} 
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="form-label">{t("mesdocuments_issue_date")}</label>
                      <DatePicker value={form.issued} onChange={(v) => setForm({ ...form, issued: v })} className="form-input" placeholder={t("mesdocuments_placeholder_date")} />
                    </div>
                  )}
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
                  <button onClick={() => goStep(3)} disabled={!selectedType || (selectedType === 'AUTRES' && !customTypeName.trim()) || !form.name || !form.number || !rectoFile || (hasExpiration && !form.issued) || (hasExpiration && !isAutoExpiry && !form.expiry)}
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
                    {[{ label: t("mesdocuments_summary_name"), val: form.name }, { label: t("mesdocuments_summary_type"), val: selectedType === 'AUTRES' && customTypeName.trim() ? customTypeName.trim() : (docTypes.find(dt => dt.code === selectedType)?.nom || selectedType) }, { label: t("mesdocuments_summary_number"), val: form.number },
                      { label: t("mesdocuments_summary_validity"), val: validityOption === 'PERMANENT' ? t("mesdocuments_option_permanent") : t("mesdocuments_option_expiring") },
                      ...(validityOption === 'EXPIRING' ? [{ label: t("mesdocuments_summary_issued"), val: form.issued || "—" }, { label: t("mesdocuments_summary_expiry"), val: form.expiry || "—" }] : []),
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
        </div>,
        document.body
      )}

      {/* ── VIEW MODAL ── */}
      {showViewModal && selectedDoc && (
        <DocumentDetailModal
          doc={selectedDoc}
          onClose={() => setShowViewModal(false)}
          onDelete={handleDelete}
        />
      )}

      {/* ── SHARE MODAL ── */}
      {showShareModal && selectedDoc && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          documentId={selectedDoc.id}
          documentName={selectedDoc.nom_sur_doc}
        />
      )}

      {/* ── DELETE MODAL ── */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div className="modal-box max-w-sm animate-in">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4 mx-auto">
              <i className="fa-solid fa-trash-can text-red-500 text-xl" />
            </div>
            <h3 className="text-center font-bricolage text-lg font-bold text-textMain mb-2">{t("mesdocuments_confirm_delete_title")}</h3>
            <p className="text-center text-[13.5px] text-textMuted mb-6 leading-relaxed">
              {t("mesdocuments_confirm_delete_desc")}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-[11px] bg-bgMain border border-borderMain text-textMain font-bold text-[13.5px] hover:border-textMain transition-colors">
                {t("mesdocuments_cancel")}
              </button>
              <button onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-[11px] bg-red-500 text-white font-bold text-[13.5px] hover:bg-red-600 transition-all active:scale-[.98]">
                {t("mesdocuments_confirm_delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOST MODAL ── */}
      {showLostModal && selectedDoc && (
        <ReportLostModal
          doc={selectedDoc}
          onClose={handleLostModalClose}
        />
      )}

      {/* ── SUCCESS NOTIFICATION ── */}
      {showSuccess && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-full flex items-center gap-3 shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-4">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <i className="fa-solid fa-check text-[10px]" />
          </div>
          <span className="text-[13px] font-medium whitespace-nowrap">{t("mesdocuments_success_msg")}</span>
        </div>
      )}
    </div>
  );
}