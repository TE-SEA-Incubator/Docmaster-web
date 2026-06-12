import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { declarationsService, documentTypesService } from "../../services/declarationsService";
import DatePicker from "../../components/ui/DatePicker";
import Topbar from "../../layout/Topbar";
import apiClient from "../../services/api";
import { useI18n } from "../../context/I18nContext";
import { useAuth } from "../../context/AuthContext";

function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0);
  return d.toISOString().split("T")[0];
}

interface DocTypeCatalog {
  id: string;
  code: string;
  nom: string;
  icone: string;
  is_active: boolean;
  delai_expiration_mois: number;
}

interface FormField {
  id: string;
  label: string;
  type: "text" | "tel" | "email" | "date" | "select" | "textarea";
  icon?: string;
  placeholder?: string;
  optional?: boolean;
  options?: string[];
}

interface DocumentMetadata {
  label: string;
  icon: string;
  color: string;
  fields: FormField[];
}

const DOC_META: Record<string, DocumentMetadata> = {
  cni: {
    label: "declarer_doc_type_cni",
    icon: "fa-id-card",
    color: "#F5A64B",
    fields: [
      { id: "titulaire", label: "declarer_field_titulaire_cni", type: "text", icon: "fa-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_cni", type: "text", icon: "fa-barcode", placeholder: "declarer_placeholder_numero_cni" },
      { id: "date_naissance", label: "declarer_field_date_naissance", type: "date", icon: "fa-calendar" },
      { id: "lieu_naissance", label: "declarer_field_lieu_naissance", type: "text", icon: "fa-location-dot", placeholder: "declarer_placeholder_ville_ex" },
      { id: "date_delivrance", label: "declarer_field_date_delivrance", type: "date", icon: "fa-calendar", optional: true },
    ],
  },
  passeport: {
    label: "declarer_doc_type_passeport",
    icon: "fa-passport",
    color: "#2D5A42",
    fields: [
      { id: "titulaire", label: "declarer_field_titulaire", type: "text", icon: "fa-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_passeport", type: "text", icon: "fa-barcode", placeholder: "declarer_placeholder_numero_passeport" },
      { id: "date_naissance", label: "declarer_field_date_naissance", type: "date", icon: "fa-calendar", optional: true },
      { id: "date_expiration", label: "declarer_field_date_expiration", type: "date", icon: "fa-calendar" },
    ],
  },
  permis: {
    label: "declarer_doc_type_permis",
    icon: "fa-car",
    color: "#3B82F6",
    fields: [
      { id: "titulaire", label: "declarer_field_titulaire_permis", type: "text", icon: "fa-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_permis", type: "text", icon: "fa-barcode", placeholder: "declarer_placeholder_numero_permis" },
      { id: "categorie", label: "declarer_field_categorie", type: "text", icon: "fa-layer-group", placeholder: "declarer_placeholder_categorie" },
    ],
  },
  acte: {
    label: "declarer_doc_type_acte",
    icon: "fa-file-invoice",
    color: "#EC4899",
    fields: [
      { id: "titulaire", label: "declarer_field_titulaire", type: "text", icon: "fa-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_acte", type: "text", icon: "fa-barcode", placeholder: "declarer_placeholder_numero_acte" },
      { id: "date_naissance", label: "declarer_field_date_naissance", type: "date", icon: "fa-calendar" },
      { id: "lieu_naissance", label: "declarer_field_lieu_naissance_acte", type: "text", icon: "fa-location-dot", placeholder: "declarer_placeholder_ville_ex_douala" },
    ],
  },
  banque: {
    label: "declarer_doc_type_banque",
    icon: "fa-credit-card",
    color: "#EF4444",
    fields: [
      { id: "titulaire", label: "declarer_field_nom_carte", type: "text", icon: "fa-user", placeholder: "declarer_placeholder_nom_carte" },
      { id: "banque_nom", label: "declarer_field_nom_banque", type: "text", icon: "fa-building-columns", placeholder: "declarer_placeholder_nom_banque" },
      { id: "numero", label: "declarer_field_derniers_chiffres", type: "text", icon: "fa-hashtag", placeholder: "declarer_placeholder_derniers_chiffres" },
    ],
  },
  titre: {
    label: "declarer_doc_type_titre",
    icon: "fa-house",
    color: "#F59E0B",
    fields: [
      { id: "titulaire", label: "declarer_field_proprietaire", type: "text", icon: "fa-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_numero_titre", type: "text", icon: "fa-barcode", placeholder: "declarer_placeholder_numero_titre" },
      { id: "ville", label: "declarer_field_localisation", type: "text", icon: "fa-location-dot", placeholder: "declarer_placeholder_ville_ex_kribi" },
    ],
  },
  diplome: {
    label: "declarer_doc_type_diplome",
    icon: "fa-graduation-cap",
    color: "#8B5CF6",
    fields: [
      { id: "titulaire", label: "declarer_field_laureat", type: "text", icon: "fa-user", placeholder: "declarer_placeholder_nom" },
      { id: "intitule", label: "declarer_field_intitule", type: "text", icon: "fa-graduation-cap", placeholder: "declarer_placeholder_intitule" },
      { id: "specialite", label: "declarer_field_specialite", type: "text", icon: "fa-book", placeholder: "declarer_placeholder_specialite" },
      { id: "annee", label: "declarer_field_annee", type: "text", icon: "fa-calendar-days", placeholder: "declarer_placeholder_annee" },
    ],
  },
  autre: {
    label: "declarer_doc_type_autre",
    icon: "fa-file",
    color: "#6B7280",
    fields: [
      { id: "titulaire", label: "declarer_field_nom_document", type: "text", icon: "fa-user", placeholder: "declarer_placeholder_nom" },
      { id: "numero", label: "declarer_field_reference", type: "text", icon: "fa-barcode", placeholder: "declarer_placeholder_reference" },
      { id: "description", label: "declarer_field_description", type: "textarea", icon: "fa-align-left", placeholder: "declarer_placeholder_description" },
    ],
  },
};

const places = ["declarer_place_market", "declarer_place_transport", "declarer_place_administration", "declarer_place_hospital", "declarer_place_airport", "declarer_place_school", "declarer_place_restaurant", "declarer_place_street"];

const steps = [
  { label: "declarer_step_1", icon: "fa-user" },
  { label: "declarer_step_2", icon: "fa-file" },
  { label: "declarer_step_3", icon: "fa-info-circle" },
  { label: "declarer_step_4", icon: "fa-map-location-dot" },
  { label: "declarer_step_5", icon: "fa-phone" },
];

export default function Declarer() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [docTypes, setDocTypes] = useState<DocTypeCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastDeclarationRef, setLastDeclarationRef] = useState("");
  const [lastDeclarationId, setLastDeclarationId] = useState("");

  // Form states
  const [ownerType, setOwnerType] = useState<"me" | "other" | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  // Custom states matching the HTML inputs
  const [lossDate, setLossDate] = useState("");
  const [lossTime, setLossTime] = useState("");
  const [ville, setVille] = useState("");
  const [quartier, setQuartier] = useState("");
  const [lieuPrecis, setLieuPrecis] = useState("");
  const [circumstances, setCircumstances] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("medium");
  const [rewardEnabled, setRewardEnabled] = useState(false);
  const [rewardAmount, setRewardAmount] = useState("");
  const [certified, setCertified] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const formLeftRef = useRef<HTMLDivElement>(null);

  // Load document types on mount
  useEffect(() => {
    const loadDocTypes = async () => {
      try {
        const res = await documentTypesService.getActive();
        console.log("[Declarer] getActive doc types response:", res);
        if (res.data) {
          setDocTypes(res.data);
        }
      } catch (error: any) {
        console.error("Failed to load document types:", error);
        alert(error.response?.data?.message || error.response?.data?.error || t("declarer_alert_error"));
      } finally {
        setLoading(false);
      }
    };
    loadDocTypes();
  }, []);

  // Clear field errors when step changes
  useEffect(() => {
    setFieldErrors({});
  }, [currentStep]);

  const getDocMeta = (docId: string): DocumentMetadata => {
    const doc = docTypes.find((d) => d.id === docId);
    if (!doc) return DOC_META.autre;
    const code = doc.code.toLowerCase();
    return DOC_META[code] || DOC_META.autre;
  };

  const toggleDocType = (docId: string) => {
    setSelectedDocs((prev) => {
      if (prev.includes(docId)) return prev.filter((d) => d !== docId);
      const fullName = ownerType === "me" ? [user?.prenom, user?.nom].filter(Boolean).join(" ").trim() : "";
      if (fullName) {
        const key = `titulaire_${docId}`;
        setFormData((prevData) => ({ ...prevData, [key]: fullName }));
      }
      return [...prev, docId];
    });
  };

  const updateFormField = (docId: string, fieldId: string, value: string) => {
    const key = `${fieldId}_${docId}`;
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (fieldId === "date_delivrance" && value) {
        const doc = docTypes.find((d) => d.id === docId);
        const expMoins = doc?.delai_expiration_mois ?? 0;
        if (expMoins > 0) {
          const expKey = `date_expiration_${docId}`;
          next[expKey] = addMonths(value, expMoins);
        }
      }
      return next;
    });
  };

  const getFormValue = (docId: string, fieldId: string, defaultValue = ""): string => {
    const key = `${fieldId}_${docId}`;
    return formData[key] ?? defaultValue;
  };

  const goToNextStep = () => {
    if (currentStep === 1 && !ownerType) {
      alert(t("declarer_alert_select_owner"));
      return;
    }
    if (currentStep === 2 && selectedDocs.length === 0) {
      alert(t("declarer_alert_select_document"));
      return;
    }
    if (currentStep === 3) {
      const errors: Record<string, string> = {};
      for (const docId of selectedDocs) {
        const meta = getDocMeta(docId);
        const docType = docTypes.find((d) => d.id === docId);
        const expMoins = docType?.delai_expiration_mois ?? 0;
        const hasExp = expMoins > 0;
        for (const field of meta.fields) {
          if (field.optional) continue;
          if (hasExp && field.id === "date_expiration") continue;
          const val = getFormValue(docId, field.id);
          if (!val || !val.trim()) {
            errors[field.id + "_" + docId] = t("declarer_field_required");
          }
        }
        if (hasExp && !meta.fields.some((f) => f.id === "date_delivrance")) {
          const val = getFormValue(docId, "date_delivrance");
          if (!val || !val.trim()) {
            errors["date_delivrance_" + docId] = t("declarer_field_required");
          }
        }
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
      setCurrentStep((prev) => prev + 1);
      if (formLeftRef.current) formLeftRef.current.scrollTop = 0;
      return;
    }
    if (currentStep === 4) {
      const errors: Record<string, string> = {};
      if (!lossDate || !lossDate.trim()) errors.lossDate = t("declarer_field_required");
      if (!ville || !ville.trim()) errors.ville = t("declarer_field_required");
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
    }
    if (currentStep === 5) {
      const errors: Record<string, string> = {};
      if (!contactPhone || !contactPhone.trim()) errors.contactPhone = t("declarer_field_required");
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
    }
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
      if (formLeftRef.current) formLeftRef.current.scrollTop = 0;
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      if (formLeftRef.current) formLeftRef.current.scrollTop = 0;
    }
  };

  const selectPlace = (place: string) => {
    setLieuPrecis(place);
  };

  const handleUrgencyClick = (level: string) => {
    setUrgencyLevel(level);
  };

  const getUrgencyDescription = () => {
    switch (urgencyLevel) {
      case "low":
        return t("declarer_urgency_low");
      case "high":
        return t("declarer_urgency_high");
      default:
        return t("declarer_urgency_medium");
    }
  };

  const validateAndSubmit = async () => {
    if (!password.trim()) {
      setPasswordError(true);
      return;
    }

    for (const docId of selectedDocs) {
      const docNum = getFormValue(docId, "numero");
      if (docNum && !/\d/.test(docNum)) {
        alert(t("declarer_alert_num_digit_prefix") + t(getDocMeta(docId).label) + t("declarer_alert_num_digit_suffix"));
        setSubmitting(false);
        setShowConfirmModal(false);
        return;
      }
    }

    if (lossDate) {
      const d = new Date(lossDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (d > today) {
        alert(t("declarer_alert_future_date"));
        setSubmitting(false);
        setShowConfirmModal(false);
        return;
      }
    }

    setPasswordError(false);
    setShowConfirmModal(false);
    setSubmitting(true);

    try {
      let createdRefs: string[] = [];
      let lastId = "";

      for (const docId of selectedDocs) {
        const meta = getDocMeta(docId);
        
        // Build document fields
        const ownerName = getFormValue(docId, "titulaire");
        const docNum = getFormValue(docId, "numero");
        const birthDate = getFormValue(docId, "date_naissance") || undefined;
        const delivranceDate = getFormValue(docId, "date_delivrance") || undefined;
        const expiryDate = getFormValue(docId, "date_expiration") || undefined;

        const formData = new FormData();
        formData.append("doc_type", docId);
        formData.append("owner_name", ownerName || t("declarer_owner_unknown"));
        if (docNum) formData.append("document_number", docNum);
        formData.append("ville", ville || t("declarer_not_specified"));
        if (quartier) formData.append("quartier", quartier);
        formData.append("region", t("declarer_region_centre"));
        formData.append("pays", t("declarer_country_cameroon"));
        if (lossDate) formData.append("date_perte", lossDate);
        if (delivranceDate) formData.append("date_delivrance", delivranceDate);
        if (expiryDate) formData.append("date_expiration", expiryDate);
        if (birthDate) formData.append("date_naissance", birthDate);
        if (circumstances) formData.append("description", circumstances);
        formData.append("etat_physique", "bon");
        const urgencyMap: Record<string, string> = { low: "Basse", medium: "Modérée", high: "Haute" };
        formData.append("urgence_niveau", urgencyMap[urgencyLevel] || "Modérée");
        if (rewardEnabled && rewardAmount) formData.append("recompense_montant", String(parseInt(rewardAmount)));
        formData.append("mode_contact", contactPhone && contactPhone.replace(/\s/g, "").length > 4 ? "PHONE" : "EMAIL");
        if (contactPhone && contactPhone.replace(/\s/g, "").length > 4) formData.append("telephone_contact", contactPhone);
        if (contactEmail) formData.append("email_contact", contactEmail);

        const res = await declarationsService.createLost(formData);
        console.log("[Declarer] createLost response:", res);
        if (res.success && res.data) {
          createdRefs.push(res.data.identifiant_doc_dm || "DOC-XXXX");
          lastId = res.data.id;
        }
      }

      setLastDeclarationRef(createdRefs.join(", "));
      setLastDeclarationId(lastId);
      setShowSuccessModal(true);
    } catch (e: any) {
      const data = e.response?.data;
      if (data?.errors) {
        const details = Object.entries(data.errors)
          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
          .join("\n");
        alert((data?.message || t("declarer_alert_validation_failed")) + "\n\n" + details);
      } else {
        alert(data?.message || t("declarer_alert_error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!lastDeclarationId) return;
    try {
      const res = await apiClient.get(`declarations/${lastDeclarationId}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${t("declarer_pdf_prefix")}_${lastDeclarationRef}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (e: any) {
      console.error("Failed to download PDF:", e);
      const msg = e.response?.data?.message || e.response?.data?.error || t("declarer_alert_pdf_error");
      alert(msg);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedDocs([]);
    setFormData({});
    setOwnerType(null);
    setLossDate("");
    setLossTime("");
    setVille("");
    setQuartier("");
    setLieuPrecis("");
    setCircumstances("");
    setContactPhone(t("declarer_phone_prefix"));
    setContactEmail("");
    setUrgencyLevel("medium");
    setRewardEnabled(false);
    setRewardAmount("");
    setCertified(false);
    setPassword("");
    setShowSuccessModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bgMain">
        <div className="w-11 h-11 rounded-full border-4 border-borda border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F2EBD9]">
      <Topbar
        title={t("declarer_title")}
        breadcrumbs={[
          { label: t("nav_home"), href: "/dashboard" },
          { label: t("declarer_breadcrumb") },
        ]}
      />

      <div
        id="pageBody"
        className="flex-1 min-h-0 overflow-y-auto display:flex flex-col p-4 md:p-6 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)]"
      >
        {/* alertBanner */}
        <div
          id="alertBanner"
          className="bg-gradient-to-r from-primary-light to-[#FFF8F0] border border-primary/30 rounded-2xl p-4 flex items-center gap-3 animate-in flex-shrink-0 mb-5"
        >
          <div className="w-9 h-9 rounded-[10px] bg-primary/20 flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-lightbulb text-primary text-base"></i>
          </div>
          <div className="flex-1">
            <p className="text-[12.5px] font-bold text-textMain leading-relaxed">
              {t("declarer_banner")}{" "}
              <span className="bg-[#F2EBD9] border border-borderMain rounded-full px-2 py-0.5 font-semibold text-[10.5px] text-textMuted uppercase tracking-wide">
                {t("declarer_optional")}
              </span>{" "}
              {t("declarer_banner_suffix")}
            </p>
          </div>
          <button
            onClick={() => {
              const banner = document.getElementById("alertBanner");
              if (banner) banner.style.display = "none";
            }}
            className="text-[#C4BAB0] hover:text-textMain transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* formGrid */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1fr_360px] gap-5 items-start">
          {/* formLeft */}
          <div ref={formLeftRef} className="overflow-y-auto space-y-4 flex flex-col w-full">
            {/* ── STEP 1: Owner Selection ── */}
            <div className={`section-card animate-in d1 ${currentStep === 1 ? "" : "hidden"}`}>
              <div className="section-badge">
                <div className="section-badge-num">1</div>
                <span className="section-badge-text">{t("declarer_step_1")}</span>
              </div>
              <h2 className="font-bricolage text-[17px] font-extrabold text-textMain mb-1">
                {t("declarer_step1_title")}
              </h2>
              <p className="text-[12.5px] text-textMuted mb-4">
                {t("declarer_step1_desc")}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => {
                    setOwnerType("me");
                    const fullName = [user?.prenom, user?.nom].filter(Boolean).join(" ").trim();
                    if (fullName) {
                      selectedDocs.forEach((docId) => {
                        const key = `titulaire_${docId}`;
                        setFormData((prev) => ({ ...prev, [key]: fullName }));
                      });
                    }
                  }}
                  className={`doc-type-card ${ownerType === "me" ? "selected" : ""}`}
                >
                  <div className="doc-check">
                    <i className="fa-solid fa-check"></i>
                  </div>
                  <div className="card-icon">
                    <i className="fa-solid fa-user-check"></i>
                  </div>
                  <span className="card-label">{t("declarer_for_myself")}</span>
                </div>
                <div
                  onClick={() => setOwnerType("other")}
                  className={`doc-type-card ${ownerType === "other" ? "selected" : ""}`}
                >
                  <div className="doc-check">
                    <i className="fa-solid fa-check"></i>
                  </div>
                  <div className="card-icon">
                    <i className="fa-solid fa-users"></i>
                  </div>
                  <span className="card-label">{t("declarer_for_other")}</span>
                </div>
              </div>
            </div>

            {/* ── STEP 2: Document Selection ── */}
            <div className={`section-card animate-in d1 ${currentStep === 2 ? "" : "hidden"}`}>
              <div className="section-badge">
                <div className="section-badge-num">2</div>
                <span className="section-badge-text">{t("declarer_step_2")}</span>
              </div>
              <h2 className="font-bricolage text-[17px] font-extrabold text-textMain mb-1">
                {t("declarer_step2_title")}
              </h2>
              <p className="text-[12.5px] text-textMuted mb-4">
                {t("declarer_step2_desc")}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {docTypes.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => toggleDocType(doc.id)}
                    className={`doc-type-card ${selectedDocs.includes(doc.id) ? "selected" : ""}`}
                  >
                    <div className="doc-check">
                      <i className="fa-solid fa-check"></i>
                    </div>
                    <span className={`exp-badge ${(doc.delai_expiration_mois ?? 0) > 0 ? "has-exp" : "no-exp"}`}>
                      {(doc.delai_expiration_mois ?? 0) > 0 ? t("has_expiration") : t("no_expiration")}
                    </span>
                    <div className="card-icon">
                      <i className={`fa-solid fa-${doc.icone || "file"}`}></i>
                    </div>
                    <span className="card-label">{doc.nom}</span>
                  </div>
                ))}
              </div>

              {selectedDocs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-borderMain">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="count-badge">{selectedDocs.length}</span>
                    <span className="text-[12px] font-bold text-textMuted">
                      {t("declarer_selected_docs")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocs.map((docId) => {
                      const doc = docTypes.find((d) => d.id === docId);
                      return (
                        <span
                          key={docId}
                          onClick={() => toggleDocType(docId)}
                          className="sel-tag"
                        >
                          <i className={`fa-solid ${doc?.icone || "fa-file"}`} />
                          {doc?.nom}
                          <i className="fa-solid fa-xmark" />
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── STEP 3: Document Details (all docs visible) ── */}
            <div className={`section-card animate-in d2 ${currentStep === 3 ? "" : "hidden"}`}>
              <div className="section-badge">
                <div className="section-badge-num">3</div>
                <span className="section-badge-text">{t("declarer_step_3")}</span>
              </div>
              <h2 className="font-bricolage text-[17px] font-extrabold text-textMain mb-1">
                {t("declarer_step3_title")}
              </h2>
              <p className="text-[12.5px] text-textMuted mb-2">
                {t("declarer_step3_desc")}
              </p>

              {selectedDocs.length > 1 && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[#F2EBD9] rounded-xl">
                  <i className="fa-solid fa-layer-group text-primary text-xs" />
                  <span className="text-[11.5px] font-semibold text-textMuted">
                    {selectedDocs.length} {t("declarer_documents_selected")}
                  </span>
                </div>
              )}

              {selectedDocs.map((docId, idx) => {
                const meta = getDocMeta(docId);
                const doc = docTypes.find((d) => d.id === docId);
                const hexColor = meta.color || "#6B7280";
                const expMoins = doc?.delai_expiration_mois ?? 0;
                const hasExp = expMoins > 0;
                const hasDateDelivranceField = meta.fields.some((f) => f.id === "date_delivrance");
                const hasDateExpirationField = meta.fields.some((f) => f.id === "date_expiration");
                return (
                  <div key={docId} className={`${idx > 0 ? "mt-6" : ""} bg-white rounded-2xl border`} style={{ borderColor: hexColor + "30" }}>
                    <div className="flex items-center gap-3 px-5 py-3.5 rounded-t-2xl" style={{ background: hexColor + "0D", borderBottom: `1px solid ${hexColor}20` }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base" style={{ background: hexColor }}>
                        <i className={`fa-solid ${meta.icon}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: hexColor }}>{doc?.nom || t("declarer_document")}</p>
                        <p className="text-[10px] font-medium text-gray-400">
                          {t("declarer_document")} {idx + 1} {t("declarer_of")} {selectedDocs.length}
                        </p>
                      </div>
                      <div className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold"
                        style={{ color: getFormValue(docId, "titulaire") && getFormValue(docId, "numero") ? "#22c55e" : "#9CA3AF" }}>
                        <i className={`fa-solid ${getFormValue(docId, "titulaire") && getFormValue(docId, "numero") ? "fa-circle-check" : "fa-circle"}`} />
                        {getFormValue(docId, "titulaire") && getFormValue(docId, "numero") ? t("declarer_completed") : t("declarer_pending")}
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      {meta.fields.filter((f) => !(hasExp && f.id === "date_expiration")).map((field) => (
                        <div key={field.id} className="field-group">
                          <label className="field-label">
                            {field.icon && <i className={`fa-solid ${field.icon} text-primary`} />}
                            {t(field.label)}
                            {!field.optional && <span className="required-star">*</span>}
                            {field.optional && <span className="opt-badge">{t("declarer_optional")}</span>}
                          </label>
                          <div className="field-wrapper">
                            {field.icon && <i className={`fa-solid ${field.icon} field-icon`} />}
                            {field.type === "textarea" ? (
                              <textarea
                                value={getFormValue(docId, field.id)}
                                onChange={(e) => { updateFormField(docId, field.id, e.target.value); setFieldErrors((prev) => ({ ...prev, [field.id + "_" + docId]: "" })); }}
                                placeholder={field.placeholder ? t(field.placeholder) : ""}
                                className={`field-input no-icon ${fieldErrors[field.id + "_" + docId] ? "field-error" : ""}`}
                                required={!field.optional}
                              />
                            ) : field.type === "date" ? (
                              <DatePicker
                                value={getFormValue(docId, field.id)}
                                onChange={(v) => { updateFormField(docId, field.id, v); setFieldErrors((prev) => ({ ...prev, [field.id + "_" + docId]: "" })); }}
                                className={`field-input ${fieldErrors[field.id + "_" + docId] ? "field-error" : ""}`}
                                placeholder={t("declarer_date_format")}
                              />
                            ) : (
                              <input
                                type={field.type}
                                value={getFormValue(docId, field.id)}
                                onChange={(e) => { updateFormField(docId, field.id, e.target.value); setFieldErrors((prev) => ({ ...prev, [field.id + "_" + docId]: "" })); }}
                                placeholder={field.placeholder ? t(field.placeholder) : ""}
                                className={`field-input ${fieldErrors[field.id + "_" + docId] ? "field-error" : ""}`}
                                required={!field.optional}
                              />
                            )}
                            {fieldErrors[field.id + "_" + docId] && (
                              <p className="field-error-msg">{fieldErrors[field.id + "_" + docId]}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {hasExp && !hasDateDelivranceField && (
                        <div className="field-group">
                          <label className="field-label">
                            <i className="fa-solid fa-calendar text-primary" />
                            {t("declarer_field_date_delivrance")}
                            <span className="required-star">*</span>
                          </label>
                          <div className="field-wrapper">
                            <i className="fa-regular fa-calendar field-icon" />
                            <DatePicker
                              value={getFormValue(docId, "date_delivrance")}
                              onChange={(v) => { updateFormField(docId, "date_delivrance", v); setFieldErrors((prev) => ({ ...prev, ["date_delivrance_" + docId]: "" })); }}
                              className={`field-input ${fieldErrors["date_delivrance_" + docId] ? "field-error" : ""}`}
                              placeholder={t("declarer_date_format")}
                            />
                            {fieldErrors["date_delivrance_" + docId] && (
                              <p className="field-error-msg">{fieldErrors["date_delivrance_" + docId]}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {hasExp && (
                        <div className="field-group">
                          <label className="field-label">
                            <i className="fa-solid fa-calendar-check text-primary" />
                            {t("declarer_field_date_expiration")}
                          </label>
                          <div className="field-wrapper">
                            <i className="fa-regular fa-calendar-check field-icon" />
                            <DatePicker
                              value={getFormValue(docId, "date_expiration")}
                              onChange={() => {}}
                              className="field-input opacity-60"
                              placeholder={t("declarer_date_format")}
                              disabled
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── STEP 4: Location & Date ── */}
            <div className={`section-card animate-in d3 ${currentStep === 4 ? "" : "hidden"}`}>
              <div className="section-badge">
                <div className="section-badge-num">4</div>
                <span className="section-badge-text">{t("declarer_step_4")}</span>
              </div>
              <h2 className="font-bricolage text-[17px] font-extrabold text-textMain mb-1">
                {t("declarer_step4_title")}
              </h2>
              <p className="text-[12.5px] text-textMuted mb-4">
                {t("declarer_step4_desc")}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="field-group">
                  <label className="field-label">
                    <i className="fa-solid fa-calendar-days text-primary"></i> {t("declarer_loss_date")}
                    <span className="required-star">*</span>
                  </label>
                  <div className="field-wrapper">
                    <i className="fa-regular fa-calendar-minus field-icon" />
                    <DatePicker
                      value={lossDate}
                      onChange={(v) => { setLossDate(v); setFieldErrors((prev) => ({ ...prev, lossDate: "" })); }}
                      className={`field-input ${fieldErrors.lossDate ? "field-error" : ""}`}
                      placeholder={t("declarer_date_format")}
                    />
                    {fieldErrors.lossDate && <p className="field-error-msg">{fieldErrors.lossDate}</p>}
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">
                    <i className="fa-solid fa-clock text-primary"></i> {t("declarer_loss_time")}{" "}
                    <span className="opt-badge">{t("declarer_optional")}</span>
                  </label>
                  <div className="field-wrapper">
                    <i className="fa-regular fa-clock field-icon" />
                    <input
                      type="time"
                      value={lossTime}
                      onChange={(e) => setLossTime(e.target.value)}
                      className="field-input"
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">
                    <i className="fa-solid fa-city text-primary"></i> {t("declarer_city")}
                    <span className="required-star">*</span>
                  </label>
                  <div className="field-wrapper">
                    <i className="fa-solid fa-city field-icon" />
                    <input
                      type="text"
                      value={ville}
                      onChange={(e) => { setVille(e.target.value); setFieldErrors((prev) => ({ ...prev, ville: "" })); }}
                      placeholder={t("declarer_placeholder_city")}
                      className={`field-input ${fieldErrors.ville ? "field-error" : ""}`}
                      required
                    />
                    {fieldErrors.ville && <p className="field-error-msg">{fieldErrors.ville}</p>}
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">
                    <i className="fa-solid fa-map-pin text-primary"></i> {t("declarer_neighborhood")}{" "}
                    <span className="opt-badge">{t("declarer_optional")}</span>
                  </label>
                  <div className="field-wrapper">
                    <i className="fa-solid fa-location-dot field-icon" />
                    <input
                      type="text"
                      value={quartier}
                      onChange={(e) => setQuartier(e.target.value)}
                      placeholder={t("declarer_placeholder_neighborhood")}
                      className="field-input"
                    />
                  </div>
                </div>
              </div>

              <div className="field-group mt-4">
                <label className="field-label">
                  <i className="fa-solid fa-map-location-dot text-primary"></i> {t("declarer_exact_location")}{" "}
                  <span className="opt-badge">{t("declarer_optional")}</span>
                </label>
                <div className="field-wrapper">
                  <i className="fa-solid fa-map-marker-alt field-icon" />
                  <input
                    type="text"
                    value={lieuPrecis}
                    onChange={(e) => setLieuPrecis(e.target.value)}
                    placeholder={t("declarer_placeholder_exact_location")}
                    className="field-input"
                  />
                </div>
              </div>

              <div className="mt-3">
                <p className="text-[11px] font-bold text-[#9CA3AF] mb-2">{t("declarer_quick_suggestions")}</p>
                <div className="flex flex-wrap gap-2">
                  {places.map((place) => (
                    <button
                      key={place}
                      type="button"
                      onClick={() => selectPlace(place)}
                      className={`place-tag ${lieuPrecis === place ? "active" : ""}`}
                    >
                      {t(place)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-group mt-4">
                <label className="field-label">
                  <i className="fa-solid fa-comment-dots text-primary"></i> {t("declarer_circumstances")}{" "}
                  <span className="opt-badge">{t("declarer_optional")}</span>
                </label>
                <div className="field-wrapper">
                  <textarea
                    value={circumstances}
                    onChange={(e) => setCircumstances(e.target.value)}
                    placeholder={t("declarer_placeholder_circumstances")}
                    className="field-input no-icon h-20"
                  />
                </div>
              </div>
            </div>

            {/* ── STEP 5: Contact Information ── */}
            <div className={`section-card animate-in d4 ${currentStep === 5 ? "" : "hidden"}`}>
              <div className="section-badge">
                <div className="section-badge-num">5</div>
                <span className="section-badge-text">{t("declarer_step_5")}</span>
              </div>
              <h2 className="font-bricolage text-[17px] font-extrabold text-textMain mb-1">
                {t("declarer_step5_title")}
              </h2>
              <p className="text-[12.5px] text-textMuted mb-4">
                {t("declarer_step5_desc")}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="field-group">
                  <label className="field-label">
                    <i className="fa-solid fa-phone text-primary"></i> {t("declarer_phone")}
                    <span className="required-star">*</span>
                  </label>
                  <div className="field-wrapper">
                    <i className="fa-solid fa-phone field-icon" />
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => { setContactPhone(e.target.value); setFieldErrors((prev) => ({ ...prev, contactPhone: "" })); }}
                      placeholder={t("declarer_placeholder_phone")}
                      className={`field-input ${fieldErrors.contactPhone ? "field-error" : ""}`}
                      required
                    />
                    {fieldErrors.contactPhone && <p className="field-error-msg">{fieldErrors.contactPhone}</p>}
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">
                    <i className="fa-solid fa-envelope text-primary"></i> {t("declarer_email")}{" "}
                    <span className="opt-badge">{t("declarer_optional")}</span>
                  </label>
                  <div className="field-wrapper">
                    <i className="fa-regular fa-envelope field-icon" />
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder={t("declarer_placeholder_email")}
                      className="field-input"
                    />
                  </div>
                </div>
              </div>

              {/* Urgency Level */}
              <div className="mt-4">
                <label className="field-label mb-2">
                  <i className="fa-solid fa-gauge text-primary"></i> {t("declarer_urgency_level")}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleUrgencyClick("low")}
                    className={`urgency-btn ${urgencyLevel === "low" ? "sel-low" : ""}`}
                  >
                    <i className="fa-solid fa-circle text-[7px] text-[#22c55e]"></i> {t("declarer_urgency_low_btn")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUrgencyClick("medium")}
                    className={`urgency-btn ${urgencyLevel === "medium" ? "sel-medium" : ""}`}
                  >
                    <i className="fa-solid fa-circle text-[7px] text-[#f59e0b]"></i> {t("declarer_urgency_medium_btn")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUrgencyClick("high")}
                    className={`urgency-btn ${urgencyLevel === "high" ? "sel-high" : ""}`}
                  >
                    <i className="fa-solid fa-circle text-[7px] text-[#ef4444]"></i> {t("declarer_urgency_high_btn")}
                  </button>
                </div>
                <p className="text-[11px] text-textMuted mt-2" id="urgencyDesc">
                  {getUrgencyDescription()}
                </p>
              </div>

              {/* Reward Toggle */}
              <div className="mt-4 p-4 bg-[#FAF7F2] rounded-2xl border border-borderMain">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-coins text-primary text-[15px]"></i>
                    <div>
                    <p className="text-[12.5px] font-bold text-textMain">
                      {t("declarer_reward_title")} <span className="opt-badge">{t("declarer_optional")}</span>
                    </p>
                    <p className="text-[11px] text-[#9CA3AF]">{t("declarer_reward_desc")}</p>
                    </div>
                  </div>
                  <label className="relative inline-block w-[42px] h-[22px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rewardEnabled}
                      onChange={(e) => setRewardEnabled(e.target.checked)}
                      className="opacity-0 w-0 h-0"
                    />
                    <span
                      className={`absolute inset-0 cursor-pointer rounded-full transition-all duration-300 ${rewardEnabled ? "bg-[#F5A64B]" : "bg-[#E0D5C4]"}`}
                    >
                      <span
                        className={`absolute h-4.5 w-4.5 left-0.5 bottom-0.5 bg-white rounded-full transition-all duration-300 shadow-sm ${rewardEnabled ? "translate-x-5" : ""}`}
                      ></span>
                    </span>
                  </label>
                </div>

                {rewardEnabled && (
                  <div className="mt-3 animate-in">
                    <div className="field-wrapper">
                      <i className="fa-solid fa-franc-sign field-icon text-[12px]"></i>
                      <input
                        type="number"
                        value={rewardAmount}
                        onChange={(e) => setRewardAmount(e.target.value)}
                        placeholder={t("declarer_placeholder_amount")}
                        className="field-input pl-[34px]"
                        min="0"
                        step="500"
                      />
                      <span className="absolute right-4 font-bold text-[11.5px] text-[#9CA3AF]">
                        {t("declarer_fcfa")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Soumettre Section Card (Only visible in step 5) */}
            {currentStep === 5 && (
              <div id="stepActions" className="animate-in d4">
                <label className="flex items-start gap-2.5 cursor-pointer mb-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <div
                      onClick={() => setCertified(!certified)}
                      className={`w-[19px] h-[19px] border-2 rounded flex items-center justify-center transition-all cursor-pointer ${certified ? "border-primary bg-primary" : "border-borderMain bg-white"}`}
                    >
                      {certified && <i className="fa-solid fa-check text-[9px] text-white"></i>}
                    </div>
                  </div>
                  <p className="text-[12px] text-textMuted leading-relaxed">
                    {t("declarer_certify")}{" "}
                    <a href="/conditions" className="text-primary font-semibold hover:underline">
                      {t("declarer_terms")}
                    </a>
                    .
                  </p>
                </label>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={!certified}
                  className="submit-btn disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <i className="fa-solid fa-paper-plane" /> {t("declarer_submit")}
                </button>
                <p className="text-[11px] text-[#9CA3AF] text-center mt-2.5">
                  <i className="fa-solid fa-shield-halved text-primary mr-1.5"></i> {t("declarer_data_protected")}
                </p>
              </div>
            )}

            {/* Step Navigation Controls */}
            <div id="wizardControls" className="flex items-center justify-between border border-borderMain bg-white rounded-2xl p-3.5 flex-shrink-0">
              <button
                type="button"
                onClick={goToPrevStep}
                disabled={currentStep === 1}
                className="px-4 py-2 border border-borderMain text-textMain rounded-xl font-semibold hover:bg-bgMain transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <i className="fa-solid fa-arrow-left text-[11px]" /> {t("declarer_previous")}
              </button>
              <p className="text-[12px] font-bold text-textMuted">
                {t("declarer_step")} {currentStep} / 5
              </p>
              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="px-4 py-2 bg-[#1E3A2F] text-white rounded-xl font-bold hover:bg-[#2D5A42] transition-all flex items-center gap-2"
                >
                  {t("declarer_next")} <i className="fa-solid fa-arrow-right text-[11px]" />
                </button>
              ) : (
                <div className="w-[84px]"></div>
              )}
            </div>
          </div>

          {/* formRight - Progression & Recap */}
          <div id="formRight" className="hidden md:flex flex-col gap-4 w-full max-w-[360px]">
            {/* Progression Box */}
            <div className="bg-white rounded-2xl p-5 border border-borderMain flex-shrink-0">
              <h3 className="font-bricolage text-[13.5px] font-extrabold text-textMain mb-3">
                {t("declarer_progression")}
              </h3>
              <div className="bg-[#F2EBD9] rounded-full h-[5px] mb-3.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#F5A64B] to-[#D98A30] rounded-full transition-all duration-500"
                  style={{ width: `${currentStep * 20}%` }}
                />
              </div>

              {/* Progress Steps list */}
              <div className="flex flex-col">
                {steps.map((step, idx) => {
                  const num = idx + 1;
                  const isDone = currentStep > num;
                  const isCurrent = currentStep === num;

                  return (
                    <div key={num} className="flex flex-col">
                      {idx > 0 && (
                        <div
                          className={`progress-vline ${isDone || isCurrent ? "done" : ""}`}
                          style={{
                            height: "20px",
                            width: "2px",
                            backgroundColor: isDone ? "#F5A64B" : "#E0D5C4",
                            marginLeft: "12px",
                          }}
                        />
                      )}
                      <div className="progress-step flex items-start gap-2.5 py-1">
                        <div
                          className={`progress-dot w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                            isDone
                              ? "bg-[#F5A64B] border-[#F5A64B] text-white"
                              : isCurrent
                                ? "bg-[#1E3A2F] border-[#1E3A2F] text-white shadow-md shadow-[#1E3A2F]/15"
                                : "bg-white border-[#E0D5C4] text-[#9CA3AF]"
                          }`}
                        >
                          {isDone ? <i className="fa-solid fa-check text-[8px]" /> : num}
                        </div>
                        <div>
                          <p
                            className={`text-[12px] font-bold ${
                              isCurrent ? "text-textMain font-black" : "text-[#6B7280]"
                            }`}
                          >
                            {t(step.label)}
                          </p>
                          <p className="text-[10.5px] text-[#9CA3AF] leading-none mt-0.5">
                            {isDone ? t("declarer_completed") : isCurrent ? t("declarer_in_progress") : t("declarer_pending")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recap Documents */}
            <div className="bg-gradient-to-br from-[#1E3A2F] to-[#2D5A42] rounded-2xl p-5 text-white flex-shrink-0">
              <h3 className="font-bricolage text-[13.5px] font-extrabold mb-1">{t("declarer_summary")}</h3>
              <p className="text-[11px] text-white/50 mb-3">{t("declarer_documents_declared")}</p>
              <div className="flex flex-col gap-2">
                {selectedDocs.length === 0 ? (
                  <span className="text-[11px] text-white/40 italic">{t("declarer_none_selected")}</span>
                ) : (
                  selectedDocs.map((docId) => {
                    const doc = docTypes.find((d) => d.id === docId);
                    return (
                      <div key={docId} className="flex items-center gap-2 text-xs font-semibold">
                        <i className={`fa-solid fa-${doc?.icone || "file"} text-primary`} />
                        <span>{doc?.nom}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Useful Tips */}
            <div className="bg-white rounded-2xl p-5 border border-borderMain flex-shrink-0">
              <h3 className="font-bricolage text-[13.5px] font-extrabold text-textMain mb-3 flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-primary"></i> {t("declarer_useful_tips")}
              </h3>
              <div className="flex flex-col gap-3">
                {[
                  t("declarer_tip_1"),
                  t("declarer_tip_2"),
                  t("declarer_tip_3"),
                  t("declarer_tip_4"),
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <i className="fa-solid fa-check text-green-mid text-xs mt-0.5 flex-shrink-0" />
                    <p className="text-[11.5px] text-textMain leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && createPortal(
        <div className="fixed inset-0 z-[210] flex items-end md:items-center justify-center md:p-4 bg-[#1E3A2F]/85 backdrop-blur-sm animate-in">
          <div className="bg-white rounded-t-3xl md:rounded-3xl p-8 max-w-md w-full text-center shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom-6 duration-300">
            {/* Grab handle for mobile */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 md:hidden" />
            <div className="w-15 h-15 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 text-red-500 text-2xl">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h2 className="font-bricolage text-xl font-extrabold text-textMain mb-2">
              {t("declarer_confirm_title")}
            </h2>
            <p className="text-[13px] text-textMuted leading-relaxed mb-4">
              {t("declarer_confirm_desc")}
            </p>

            {/* COST WARNING */}
            <div className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-xl p-3.5 text-left mb-5">
              <p className="text-[11.5px] text-[#9A3412] leading-relaxed font-semibold">
                <i className="fa-solid fa-circle-info mr-1.5"></i>
                {t("declarer_cost_warning")}
              </p>
            </div>

            <div className="field-group mb-6 text-left">
              <div className="field-wrapper">
                <i className="fa-solid fa-lock field-icon"></i>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("declarer_placeholder_password")}
                  className="field-input"
                />
              </div>
              {passwordError && (
                <p className="text-xs text-red-500 font-bold mt-1.5 leading-none">
                  {t("declarer_wrong_password")}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPassword("");
                  setPasswordError(false);
                }}
                className="flex-1 py-3 border border-borderMain rounded-xl font-bold text-sm text-[#374151] hover:bg-bgMain transition-all"
              >
                {t("declarer_cancel")}
              </button>
              <button
                onClick={validateAndSubmit}
                disabled={submitting}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-all shadow-md shadow-red-500/20 active:scale-98 flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <i className="fa-solid fa-spinner fa-spin" />
                ) : (
                  <>
                    <i className="fa-solid fa-circle-check" /> {t("declarer_confirm")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* SUCCESS OVERLAY */}
      {showSuccessModal && createPortal(
        <div className="fixed inset-0 z-[210] flex items-end md:items-center justify-center md:p-4 bg-black/55 backdrop-blur-sm animate-in">
          <div className="bg-white rounded-t-3xl md:rounded-3xl p-8 max-w-md w-full text-center shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom-6 duration-300">
            {/* Grab handle for mobile */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 md:hidden" />
            <div className="w-16 h-16 rounded-full bg-green-light flex items-center justify-center mx-auto mb-4 text-green-mid text-3xl">
              <i className="fa-solid fa-check" />
            </div>
            <h2 className="font-bricolage text-2xl font-black text-textMain mb-2">
              {t("declarer_success_title")}
            </h2>
            <p className="text-sm text-textMuted leading-relaxed mb-4">
              {t("declarer_success_desc")}
            </p>

            <div className="inline-block py-2 px-5 bg-[#F2EBD9] border border-borderMain rounded-lg text-green-dark font-bricolage text-lg font-extrabold tracking-widest mb-4">
              {lastDeclarationRef}
            </div>
            <p className="text-[11px] text-[#9CA3AF] mb-5 leading-none">
              {t("declarer_keep_reference")}
            </p>

            <button
              onClick={handleDownloadPdf}
              className="w-full mb-3.5 py-3 bg-[#F5A64B] hover:bg-[#D98A30] text-white font-bricolage text-[14px] font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              <i className="fa-solid fa-file-arrow-down"></i> {t("declarer_download_pdf")}
            </button>

            <div className="flex gap-3">
              <button
                onClick={resetForm}
                className="flex-1 py-3 border border-borderMain rounded-xl font-bold text-sm text-[#374151] hover:bg-[#F9F6F1] transition-all"
              >
                {t("declarer_new_declaration")}
              </button>
              <button
                onClick={() => navigate("/mes-declarations")}
                className="flex-1 py-3 bg-[#1E3A2F] text-white rounded-xl font-bold text-sm hover:bg-[#2D5A42] transition-all"
              >
                {t("declarer_my_declarations")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Dynamic styles matching the HTML mockup */}
      <style>{`
      .section-card {
        background: white;
        border-radius: 18px;
        padding: 22px 24px;
        border: 1px solid #EDE7DB;
        box-shadow: 0 2px 12px rgba(0,0,0,.04);
        flex-shrink: 0;
      }
      .section-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 4px 12px 4px 4px;
        background: rgba(245,166,75,.12);
        border-radius: 20px;
        margin-bottom: 12px;
      }
      .section-badge-num {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #F5A64B;
        color: white;
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Bricolage Grotesque', sans-serif;
      }
      .section-badge-text {
        font-size: 11px;
        font-weight: 700;
        color: #D98A30;
        text-transform: uppercase;
        letter-spacing: .05em;
      }
      .doc-type-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 7px;
        padding: 14px 10px;
        border-radius: 14px;
        border: 2px solid #E0D5C4;
        background: white;
        cursor: pointer;
        transition: all .22s;
        text-align: center;
        font-family: 'Poppins', sans-serif;
        position: relative;
      }
      .doc-type-card:hover {
        border-color: #F5A64B;
        background: #FEF8F0;
        transform: translateY(-2px);
      }
      .doc-type-card.selected {
        border-color: #ef4444;
        background: #fff1f2;
        box-shadow: 0 4px 16px rgba(239,68,68,.15);
      }
      .doc-type-card .card-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        background: #F2EBD9;
        transition: background .2s, color .2s;
        color: #D98A30;
      }
      .doc-type-card.selected .card-icon {
        background: rgba(245,166,75,.2);
        color: #1E3A2F;
      }
      .doc-type-card .card-label {
        font-size: 11px;
        font-weight: 600;
        color: #374151;
        line-height: 1.3;
      }
      .doc-type-card.selected .card-label {
        color: #D98A30;
      }
      .doc-check {
        position: absolute;
        top: 7px;
        right: 7px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #E0D5C4;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all .2s;
      }
      .doc-type-card.selected .doc-check {
        background: #F5A64B;
      }
      .doc-check i {
        font-size: 8px;
        color: white;
        opacity: 0;
        transition: opacity .2s;
      }
      .doc-type-card.selected .doc-check i {
        opacity: 1;
      }
      .count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        border-radius: 99px;
        background: #F5A64B;
        color: white;
        font-weight: 700;
        font-size: 11px;
        font-family: 'Bricolage Grotesque', sans-serif;
      }
      .sel-tag {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        background: #1E3A2F;
        color: white;
        border-radius: 99px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: background .15s;
      }
      .sel-tag:hover {
        background: #2D5A42;
      }
      .sel-tag i {
        font-size: 9px;
        opacity: .7;
      }
      .doc-nav-tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: 12px;
        border: 2px solid #E0D5C4;
        background: white;
        cursor: pointer;
        transition: all .2s;
        font-family: 'Poppins', sans-serif;
        font-size: 12px;
        font-weight: 600;
        color: #6B7280;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .doc-nav-tab:hover {
        border-color: #F5A64B;
        color: #D98A30;
      }
      .doc-nav-tab.active {
        border-color: #F5A64B;
        background: #FEF0DC;
        color: #D98A30;
      }
      .doc-nav-tab.done {
        border-color: #22c55e;
        background: #f0fdf4;
        color: #16a34a;
      }
      .doc-nav-tab .tab-num {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #E0D5C4;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        flex-shrink: 0;
        transition: background .2s;
      }
      .doc-nav-tab.active .tab-num {
        background: #F5A64B;
        color: white;
      }
      .doc-nav-tab.done .tab-num {
        background: #22c55e;
        color: white;
      }
      .field-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .field-label {
        font-size: 11.5px;
        font-weight: 700;
        color: #6B7280;
        letter-spacing: .06em;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .field-input {
        width: 100%;
        padding: 12px 14px 12px 42px;
        background: #F9F6F1;
        border: 1.5px solid #E0D5C4;
        border-radius: 12px;
        font-family: 'Poppins', sans-serif;
        font-size: 13.5px;
        color: #1A1A1A;
        outline: none;
        transition: all .2s;
      }
      .field-input::placeholder {
        color: #C4BAB0;
      }
      .field-input:focus {
        border-color: #F5A64B;
        background: white;
        box-shadow: 0 0 0 4px rgba(245,166,75,.12);
      }
      .field-input.no-icon {
        padding-left: 14px;
      }
      .field-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }
      .field-icon {
        position: absolute;
        left: 14px;
        color: #D98A30;
        font-size: 13px;
        pointer-events: none;
        transition: color .2s;
      }
      .field-wrapper:focus-within .field-icon {
        color: #F5A64B;
      }
      select.field-input {
        appearance: none;
        cursor: pointer;
      }
      textarea.field-input {
        padding: 12px 14px;
        resize: vertical;
        min-height: 80px;
        line-height: 1.6;
      }
      .required-star {
        color: #ef4444;
        font-size: 14px;
        margin-left: 2px;
      }
      .field-error {
        border-color: #ef4444 !important;
        background: #fef2f2 !important;
      }
      .field-error:focus {
        box-shadow: 0 0 0 4px rgba(239,68,68,.12) !important;
      }
      .field-error-msg {
        color: #ef4444;
        font-size: 11px;
        font-weight: 600;
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .opt-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 2px 7px;
        background: #F2EBD9;
        border: 1px solid #E0D5C4;
        border-radius: 99px;
        font-size: 10px;
        font-weight: 600;
        color: #9CA3AF;
        margin-left: 4px;
        vertical-align: middle;
        letter-spacing: .01em;
        text-transform: none;
      }
      .urgency-btn {
        flex: 1;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1.5px solid #E0D5C4;
        background: white;
        font-family: 'Poppins', sans-serif;
        font-size: 12.5px;
        font-weight: 600;
        color: #6B7280;
        cursor: pointer;
        transition: all .2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
      }
      .urgency-btn:hover {
        border-color: #F5A64B;
      }
      .urgency-btn.sel-low {
        border-color: #22c55e;
        background: #f0fdf4;
        color: #16a34a;
      }
      .urgency-btn.sel-medium {
        border-color: #f59e0b;
        background: #fffbeb;
        color: #d97706;
      }
      .urgency-btn.sel-high {
        border-color: #ef4444;
        background: #fef2f2;
        color: #dc2626;
      }
      .submit-btn {
        width: 100%;
        padding: 15px 24px;
        background: #1E3A2F;
        color: white;
        border: none;
        border-radius: 14px;
        font-family: 'Bricolage Grotesque', sans-serif;
        font-size: 16px;
        font-weight: 800;
        cursor: pointer;
        transition: all .2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        box-shadow: 0 6px 20px rgba(30,58,47,.3);
      }
      .submit-btn:hover {
        background: #2D5A42;
        transform: translateY(-1px);
      }
      .submit-btn:active {
        transform: scale(.99);
      }
      .progress-step {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 8px 0;
      }
      .progress-dot {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 2px solid #E0D5C4;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        color: #9CA3AF;
        flex-shrink: 0;
        transition: all .3s;
      }
      .progress-dot.done {
        background: #F5A64B;
        border-color: #F5A64B;
        color: white;
      }
      .progress-dot.current {
        background: #1E3A2F;
        border-color: #1E3A2F;
        color: white;
        box-shadow: 0 0 0 3px rgba(30,58,47,.15);
      }
      .progress-vline {
        width: 2px;
        height: 22px;
        background: #E0D5C4;
        margin-left: 12px;
        transition: background .3s;
      }
      .progress-vline.done {
        background: #F5A64B;
      }
      .place-tag {
        padding: 5px 11px;
        border-radius: 20px;
        border: 1.5px solid #E0D5C4;
        background: white;
        font-family: 'Poppins', sans-serif;
        font-size: 11.5px;
        font-weight: 600;
        color: #374151;
        cursor: pointer;
        transition: all .2s;
        white-space: nowrap;
      }
      .place-tag:hover {
        border-color: #F5A64B;
        background: #FEF0DC;
        color: #D98A30;
      }
      .place-tag.active {
        border-color: #F5A64B;
        background: #F5A64B;
        color: white;
      }
    `}</style>
    </div>
  );
}
