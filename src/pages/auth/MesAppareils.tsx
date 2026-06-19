import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";
import { devicesService } from "../../services/devicesService";
import Topbar from "../../layout/Topbar";
import DatePicker from "../../components/ui/DatePicker";
import type { Device } from "../../types/api";

function getTypeMeta(t: (k: string) => string) {
  return {
    telephone:  { label: t("mesappareils_type_telephone"),   icon: "fa-mobile-screen-button", color: "#3B82F6", bg: "#EFF6FF" },
    ordinateur: { label: t("mesappareils_type_ordinateur"),  icon: "fa-laptop",               color: "#8B5CF6", bg: "#F5F3FF" },
    tablette:   { label: t("mesappareils_type_tablette"),    icon: "fa-tablet-screen-button", color: "#10B981", bg: "#ECFDF5" },
    tv:         { label: t("mesappareils_type_tv"),          icon: "fa-tv",                   color: "#F59E0B", bg: "#FFFBEB" },
    autre:      { label: t("mesappareils_type_autre"),       icon: "fa-box",                  color: "#6B7280", bg: "#F9FAFB" },
  };
}

function esc(s: string) {
  return String(s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(s: string) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}

function isExpired(d: string) {
  if (!d) return false;
  return new Date(d) < new Date();
}

function getDeviceType(category: string) {
  const c = (category || "").toLowerCase();
  if (c.includes("phone") || c.includes("téléphone")) return "telephone";
  if (c.includes("laptop") || c.includes("ordinateur")) return "ordinateur";
  if (c.includes("tablet") || c.includes("tablette")) return "tablette";
  if (c.includes("tv")) return "tv";
  return "autre";
}

function resolvePhotoUrl(p: string) {
  if (!p) return "";
  if (p.startsWith("http") || p.startsWith("data:")) return p;
  return window.location.origin + "/" + p.replace(/^\//, "");
}

function normalizeDevice(d: Device) {
  const type = getDeviceType(d.category || d.type || "");
  let photos = d.photos;
  if (typeof photos === "string") {
    try { photos = JSON.parse(photos); } catch { photos = []; }
  }
  if (!Array.isArray(photos)) photos = [];
  return {
    ...d,
    type,
    nom: d.model || d.modele || d.nom || "Appareil",
    marque: d.brand || d.marque || "",
    modele: d.model || d.modele || "",
    serial: d.serial_number_imei || d.serial_number || d.imei || "",
    couleur: d.color || d.couleur || "",
    dateAchat: d.purchase_date || "",
    garantie: d.garantie_end || "",
    prix: d.purchase_value || 0,
    lieu: d.where_buy || "",
    notes: d.notes || "",
    assurance: d.assurance || "",
    status: d.status || "SAFE",
    photo: photos.length > 0 ? resolvePhotoUrl(photos[0]) : null,
    files: photos.map((p: string) => ({ name: p.split("/").pop(), data: resolvePhotoUrl(p) })),
  };
}

type NormalizedDevice = ReturnType<typeof normalizeDevice>;

export default function MesAppareils() {
  const { t } = useI18n();
  const { user } = useAuth();
  const TYPE_META = getTypeMeta(t);
  const [devices, setDevices] = useState<NormalizedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState("all");
  const [currentView, setCurrentView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Add modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("telephone");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [photoBlob, setPhotoBlob] = useState<File | null>(null);
  const [photoSerialBlob, setPhotoSerialBlob] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [fNom, setFNom] = useState("");
  const [fMarque, setFMarque] = useState("");
  const [fModele, setFModele] = useState("");
  const [fSerial, setFSerial] = useState("");
  const [fCouleur, setFCouleur] = useState("");
  const [fDateAchat, setFDateAchat] = useState("");
  const [fGarantie, setFGarantie] = useState("");
  const [fPrix, setFPrix] = useState("");
  const [fLieu, setFLieu] = useState("");
  const [fAssurance, setFAssurance] = useState("");
  const [fNotes, setFNotes] = useState("");

  // Detail panel
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Verify modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyImei, setVerifyImei] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ html: string; bg: string; border: string } | null>(null);

  // Confirm lost modal
  const [confirmLostOpen, setConfirmLostOpen] = useState(false);
  const [confirmFound, setConfirmFound] = useState(false);
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);
  const [reportType, setReportType] = useState("LOST");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Success overlay
  const [successOpen, setSuccessOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("Appareil déclaré perdu !");

  // Photo previews
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoSerialPreview, setPhotoSerialPreview] = useState<string | null>(null);

  const factureInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoSerialInputRef = useRef<HTMLInputElement>(null);

  const CACHE_KEY = "dm_devices_cache";

  const fetchDevices = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let result = await devicesService.getMyDevices();
      if (!result.success || !Array.isArray(result.data)) {
        result = await devicesService.getAll();
      }
      if (result.success && Array.isArray(result.data)) {
        const normalized = result.data.map(normalizeDevice);
        setDevices(normalized);
        localStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
      }
    } catch {
      try {
        const result = await devicesService.getAll();
        if (result.success && Array.isArray(result.data)) {
          const normalized = result.data.map(normalizeDevice);
          setDevices(normalized);
          localStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
        }
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load from cache initially
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setDevices(JSON.parse(cached));
        setLoading(false); // don't show spinner if we have cache
        fetchDevices(false); // refresh in background
      } catch {
        fetchDevices(true);
      }
    } else {
      fetchDevices(true);
    }
  }, [fetchDevices]);

  const filtered = devices.filter((d) => {
    const matchFilter = currentFilter === "all" || d.type === currentFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || d.nom.toLowerCase().includes(q) ||
      (d.marque || "").toLowerCase().includes(q) ||
      (d.modele || "").toLowerCase().includes(q) ||
      (d.serial || "").toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const openAddModal = (id?: string) => {
    setEditingId(id || null);
    setSelectedFiles([]);
    setPhotoBlob(null);
    setPhotoSerialBlob(null);
    setPhotoPreview(null);
    setPhotoSerialPreview(null);

    if (id) {
      const d = devices.find((x) => x.id === id);
      if (!d) return;
      setSelectedType(d.type);
      setFNom(d.nom || "");
      setFMarque(d.marque || "");
      setFModele(d.modele || "");
      setFSerial(d.serial || "");
      setFCouleur(d.couleur || "");
      setFDateAchat(d.dateAchat || "");
      setFGarantie(d.garantie || "");
      setFPrix(String(d.prix || ""));
      setFLieu(d.lieu || "");
      setFAssurance(d.assurance || "");
      setFNotes(d.notes || "");
      if (d.photo) setPhotoPreview(d.photo);
    } else {
      setSelectedType("telephone");
      setFNom(""); setFMarque(""); setFModele(""); setFSerial("");
      setFCouleur(""); setFDateAchat(""); setFGarantie(""); setFPrix("");
      setFLieu(""); setFAssurance(""); setFNotes("");
    }
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!fNom.trim()) {
      setFNom(""); // force re-render - just focus
      document.getElementById("fNom")?.focus();
      return;
    }
    if (fSerial.trim() && !/\d/.test(fSerial)) {
      alert("Le numéro de série / IMEI doit contenir au moins un chiffre.");
      return;
    }
    if (fDateAchat) {
      const d = new Date(fDateAchat);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (d > today) {
        alert("La date d'achat ne peut pas être dans le futur.");
        return;
      }
    }

    setSaving(true);
    const formData = new FormData();
    const typeUpper = selectedType.toUpperCase();
    formData.append("category", typeUpper === "TELEPHONE" ? "PHONE" : typeUpper === "ORDINATEUR" ? "LAPTOP" : typeUpper === "TABLETTE" ? "TABLET" : "OTHER");
    formData.append("brand", fMarque);
    formData.append("model", fModele.trim() || fNom.trim());
    formData.append("serial_number_imei", fSerial.trim());
    formData.append("color", fCouleur.trim());
    formData.append("purchase_date", fDateAchat);
    formData.append("purchase_value", fPrix);
    formData.append("where_buy", fLieu.trim());
    formData.append("notes", fNotes.trim());
    if (photoBlob) formData.append("photo_face", photoBlob);
    if (photoSerialBlob) formData.append("photo_serial", photoSerialBlob);
    if (selectedFiles.length > 0) formData.append("photo_facture", selectedFiles[0]);

    try {
      const result = await devicesService.registerMyDevice(formData);
      if (result.success) {
        await fetchDevices();
        closeAddModal();
      } else {
        alert(result.message || "Erreur lors de l'enregistrement");
      }
    } catch (error: any) {
      alert(error?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailId(null);
  };

  const editCurrentDevice = () => {
    closeDetail();
    setTimeout(() => openAddModal(detailId!), 200);
  };

  const deleteCurrentDevice = async () => {
    if (!detailId) return;
    const d = devices.find((x) => x.id === detailId);
    if (!d) return;
    if (!confirm(`Supprimer "${d.nom}" ? Cette action est irréversible.`)) return;

    try {
      const result = await devicesService.delete(detailId);
      if (result.success) {
        await fetchDevices();
        closeDetail();
      } else {
        alert(result.message);
      }
    } catch {
      alert("Erreur lors de la suppression");
    }
  };

  const confirmLostAppareil = (id: string) => {
    setPendingDeviceId(id);
    setConfirmFound(false);
    setConfirmPassword("");
    setPasswordError(false);
    setReportType("LOST");
    setConfirmLostOpen(true);
  };

  const confirmFoundAppareil = (id: string) => {
    setPendingDeviceId(id);
    setConfirmFound(true);
    setConfirmPassword("");
    setPasswordError(false);
    setConfirmLostOpen(true);
  };

  const closeConfirmLost = () => {
    setConfirmLostOpen(false);
    setPendingDeviceId(null);
  };

  const validateAndSubmitLost = async () => {
    if (confirmPassword.length < 4) {
      setPasswordError(true);
      return;
    }
    setConfirming(true);
    try {
      const result = await devicesService.reportDeviceLost(pendingDeviceId!, confirmPassword, reportType);
      if (result.success) {
        await fetchDevices();
        closeConfirmLost();
        setSuccessTitle("Appareil déclaré perdu !");
        setSuccessOpen(true);
      } else {
        alert(result.message);
      }
    } catch {
      alert("Erreur lors du signalement");
    } finally {
      setConfirming(false);
    }
  };

  const validateAndSubmitFound = async () => {
    if (confirmPassword.length < 4) {
      setPasswordError(true);
      return;
    }
    setConfirming(true);
    try {
      const result = await devicesService.reportDeviceFound(pendingDeviceId!, confirmPassword);
      if (result.success) {
        await fetchDevices();
        closeConfirmLost();
        setSuccessTitle("Appareil marqué comme retrouvé !");
        setSuccessOpen(true);
      } else {
        alert(result.message);
      }
    } catch {
      alert("Erreur lors de la confirmation");
    } finally {
      setConfirming(false);
    }
  };

  const startVerification = async () => {
    if (!verifyImei.trim()) {
      alert("Veuillez saisir un numéro IMEI ou de série.");
      return;
    }
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const result = await devicesService.verifyDevice(verifyImei.trim());
      const resultData = result as { success: boolean; data?: { success: boolean; data: Record<string, unknown> } };
      if (result.success && resultData.data?.success) {
        const device = resultData.data.data;
        const isReported = device.is_reported;
        setVerifyResult({
          bg: isReported ? "#fef2f2" : "#f0fdf4",
          border: isReported ? "#fecaca" : "#bbf7d0",
          html: `
            <div style="display:flex;gap:12px;">
              <div style="width:40px;height:40px;border-radius:50%;background:${isReported ? "#ef4444" : "#22c55e"};display:flex;align-items:center;justify-content:center;color:white;flex-shrink:0;">
                <i class="fa-solid ${isReported ? "fa-triangle-exclamation" : "fa-check"}"></i>
              </div>
              <div>
                <p style="font-weight:800;color:${isReported ? "#991b1b" : "#166534"};font-size:14px;margin-bottom:2px;">
                  ${isReported ? "Attention !" : "Appareil sûr"}
                </p>
                <p style="font-size:12px;color:${isReported ? "#b91c1c" : "#15803d"};line-height:1.4;word-break:break-word;">
                  ${isReported ? `${device.brand} ${device.model} - Signalé ${device.status}` : `${device.brand} ${device.model} - Sûr`}
                </p>
              </div>
            </div>
          `,
        });
      } else {
        setVerifyResult({
          bg: "#f8fafc",
          border: "#e2e8f0",
          html: `
            <div style="display:flex;gap:12px;">
              <div style="width:40px;height:40px;border-radius:50%;background:#64748b;display:flex;align-items:center;justify-content:center;color:white;flex-shrink:0;">
                <i class="fa-solid fa-question"></i>
              </div>
              <div>
                <p style="font-weight:800;color:#1e293b;font-size:14px;margin-bottom:2px;">Inconnu</p>
                <p style="font-size:12px;color:#475569;line-height:1.4;">Non enregistré dans notre base.</p>
              </div>
            </div>
          `,
        });
      }
    } catch {
      setVerifyResult({
        bg: "#fef2f2",
        border: "#fecaca",
        html: `<p style="color:#ef4444;font-weight:600;">Erreur lors de la vérification.</p>`,
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isSerial: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isSerial) {
      setPhotoSerialBlob(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoSerialPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoBlob(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFactureFiles = (files: FileList) => {
    setSelectedFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const removeFile = (i: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const renderFileChips = () => {
    if (selectedFiles.length === 0) return null;
    return selectedFiles.map((f, i) => (
      <div key={i} className="file-chip">
        <i className={`fa-solid ${f.type === "application/pdf" ? "fa-file-pdf" : "fa-image"}`} style={{ fontSize: 10 }} />
        <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
        <span style={{ cursor: "pointer", opacity: 0.6 }} onClick={() => removeFile(i)}>
          <i className="fa-solid fa-xmark" style={{ fontSize: 9 }} />
        </span>
      </div>
    ));
  };

  const detailDevice = detailId ? devices.find((d) => String(d.id) === String(detailId)) : null;

  const infoRow = (icon: string, label: string, val: string) =>
    val ? (
      <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: "1px solid #F0EAE0" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "#FEF0DC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className={`fa-solid ${icon}`} style={{ color: "#D98A30", fontSize: 14 }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</p>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "#1A1A1A", lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{esc(val)}</p>
        </div>
      </div>
    ) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] pt-0 md:pt-6">
        <div className="w-11 h-11 rounded-full border-4 border-borda border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* CSS for the page */}
      <style>{`
        #deviceGrid.list-view { display: flex; flex-direction: column; gap: 10px; }
        #deviceGrid.list-view .device-card { display: flex; flex-direction: row; border-radius: 14px; }
        #deviceGrid.list-view .device-card-header { flex: 1; padding: 14px 18px; border-bottom: none; }
        #deviceGrid.list-view .device-card-body { display: none; }
        #deviceGrid.list-view .device-card-footer { border-top: none; border-left: 1px solid #EDE7DB; border-radius: 0; padding: 14px 18px; flex-direction: column; align-items: flex-end; gap: 6px; min-width: 150px; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popUp { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .card-appear { animation: slideUp 0.3s ease both; }
        .device-card { background: white; border-radius: 18px; border: 1.5px solid #EDE7DB; padding: 0; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.05); transition: all .25s; cursor: pointer; position: relative; }
        .device-card:hover { border-color: #ef4444; box-shadow: 0 8px 28px rgba(239,68,68,.18); transform: translateY(-3px); }
        .device-card.is-lost { border-color: #ef4444 !important; background: #fff1f2; }
        .device-card-header { padding: 20px 20px 14px; display: flex; align-items: flex-start; gap: 14px; }
        .device-avatar { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .device-card-body { padding: 0 20px 16px; }
        .device-card-footer { padding: 10px 20px; background: #F9F6F1; border-top: 1px solid #EDE7DB; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
        .tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 99px; font-size: 10.5px; font-weight: 600; }
        .filter-btn { padding: 6px 14px; border-radius: 99px; border: 1.5px solid #E0D5C4; background: white; font-family: 'Poppins',sans-serif; font-size: 12px; font-weight: 600; color: #6B7280; cursor: pointer; transition: all .2s; white-space: nowrap; }
        .filter-btn:hover { border-color: #F5A64B; color: #D98A30; }
        .filter-btn.active { border-color: #F5A64B; background: #F5A64B; color: white; }
        .view-btn { width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid #E0D5C4; background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6B7280; font-size: 13px; transition: all .2s; }
        .view-btn.active { background: #1E3A2F; border-color: #1E3A2F; color: white; }
        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-label { font-size: 11.5px; font-weight: 700; color: #6B7280; letter-spacing: .06em; text-transform: uppercase; display: flex; align-items: center; gap: 5px; }
        .field-input { width: 100%; padding: 11px 14px 11px 40px; background: #F9F6F1; border: 1.5px solid #E0D5C4; border-radius: 11px; font-family: 'Poppins',sans-serif; font-size: 13.5px; color: #1A1A1A; outline: none; transition: all .2s; }
        .field-input::placeholder { color: #C4BAB0; }
        .field-input:focus { border-color: #F5A64B; background: white; box-shadow: 0 0 0 4px rgba(245,166,75,.12); }
        .field-input.no-icon { padding-left: 14px; }
        .field-wrapper { position: relative; display: flex; align-items: center; }
        .field-icon { position: absolute; left: 13px; color: #D98A30; font-size: 13px; pointer-events: none; }
        .field-wrapper:focus-within .field-icon { color: #F5A64B; }
        select.field-input { appearance: none; cursor: pointer; }
        textarea.field-input { padding: 11px 14px; resize: vertical; min-height: 72px; line-height: 1.6; }
        .upload-zone { border: 2px dashed #D0C6B8; border-radius: 13px; background: #F9F6F1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; padding: 20px 16px; cursor: pointer; transition: all .22s; text-align: center; }
        .upload-zone:hover, .upload-zone.dragover { border-color: #F5A64B; background: #FEF8F0; }
        .upload-zone.has-file { border-color: #1E3A2F; background: #E8F5EE; border-style: solid; }
        .file-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; background: #1E3A2F; color: white; border-radius: 8px; font-size: 11.5px; font-weight: 600; margin-top: 6px; }
        .type-option { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 12px 8px; border-radius: 12px; border: 2px solid #E0D5C4; background: white; cursor: pointer; transition: all .2s; font-family: 'Poppins',sans-serif; font-size: 11px; font-weight: 600; color: #374151; text-align: center; }
        .type-option:hover { border-color: #F5A64B; background: #FEF8F0; }
        .type-option.selected { border-color: #F5A64B; background: #FEF0DC; color: #D98A30; }
        .type-option .type-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 17px; background: #F2EBD9; color: #D98A30; transition: background .2s; }
        .type-option.selected .type-icon { background: rgba(245,166,75,.25); }
        .modal-header { padding: 26px 28px 0; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: white; z-index: 2; padding-bottom: 14px; border-bottom: 1px solid #F0EAE0; }
        .modal-body { padding: 20px 28px 28px; }
      `}</style>

      <Topbar
        title="Mes appareils &amp; équipements"
        breadcrumbs={[
          { label: "Accueil", href: "/dashboard" },
          { label: "Mes appareils" },
        ]}
      />

      {/* Page body */}
      <div className="custom-scroll p-4 md:p-6 flex flex-col gap-6 pb-24 md:pb-6 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">
        {/* Stats */}
        <div className="max-sm:hidden grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          <div className="bg-white rounded-[16px] p-[18px] border border-[#1A1A1A]/20 flex items-center gap-3.5 shadow-[0_2px_10px_rgba(0,0,0,.04)] hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(0,0,0,.07)] transition-all">
            <div className="w-[46px] h-[46px] rounded-[13px] bg-[#EEF2FF] text-[#6366F1] flex items-center justify-center text-lg flex-shrink-0"><i className="fa-solid fa-laptop" /></div>
            <div>
              <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider">Appareils</p>
              <p className="font-bricolage text-xl md:text-2xl font-extrabold text-textMain" id="statTotal">{devices.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-[16px] p-[18px] border border-[#1A1A1A]/20 flex items-center gap-3.5 shadow-[0_2px_10px_rgba(0,0,0,.04)] hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(0,0,0,.07)] transition-all">
            <div className="w-[46px] h-[46px] rounded-[13px] bg-[#E8F5EE] text-[#1E3A2F] flex items-center justify-center text-lg flex-shrink-0"><i className="fa-solid fa-file-invoice" /></div>
            <div>
              <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider">Factures</p>
              <p className="font-bricolage text-xl md:text-2xl font-extrabold text-textMain" id="statFact">{devices.filter((d) => (d as Device & { files?: Array<unknown> }).files?.length).length}</p>
            </div>
          </div>
          <div className="bg-white rounded-[16px] p-[18px] border border-[#1A1A1A]/20 flex items-center gap-3.5 shadow-[0_2px_10px_rgba(0,0,0,.04)] hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(0,0,0,.07)] transition-all">
            <div className="w-[46px] h-[46px] rounded-[13px] bg-[#FEF0DC] text-[#D98A30] flex items-center justify-center text-lg flex-shrink-0"><i className="fa-solid fa-shield-halved" /></div>
            <div>
              <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider">Assurés</p>
              <p className="font-bricolage text-xl md:text-2xl font-extrabold text-textMain" id="statAssure">{devices.filter((d) => d.assurance === "oui").length}</p>
            </div>
          </div>
          <div className="bg-white rounded-[16px] p-[18px] border border-[#1A1A1A]/20 flex items-center gap-3.5 shadow-[0_2px_10px_rgba(0,0,0,.04)] hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(0,0,0,.07)] transition-all">
            <div className="w-[46px] h-[46px] rounded-[13px] bg-[#fef2f2] text-[#ef4444] flex items-center justify-center text-lg flex-shrink-0"><i className="fa-solid fa-triangle-exclamation" /></div>
            <div>
              <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider">Garantie</p>
              <p className="font-bricolage text-xl md:text-2xl font-extrabold text-textMain" id="statExp">{devices.filter((d) => isExpired(d.garantie)).length}</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-[320px] max-md:max-w-none">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[#C4BAB0] text-xs pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-[9px] pl-[38px] pr-[14px] border border-[#E0D5C4] rounded-[12px] font-poppins text-xs bg-white outline-none transition-all text-textMain placeholder:text-[#C4BAB0] focus:border-primary focus:shadow-[0_0_0_4px_rgba(245,166,75,.12)]"
              autoComplete="off"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { key: "all", label: "Tous" },
              { key: "telephone", label: "Téléphones", icon: "fa-mobile-screen-button" },
              { key: "ordinateur", label: "Ordinateurs", icon: "fa-laptop" },
              { key: "tablette", label: "Tablettes", icon: "fa-tablet-screen-button" },
              { key: "autre", label: "Autres", icon: "fa-box" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setCurrentFilter(f.key)}
                className={`filter-btn whitespace-nowrap ${currentFilter === f.key ? "active" : ""}`}
                style={{
                  padding: "6px 14px",
                  borderRadius: 99,
                  border: "1.5px solid",
                  borderColor: currentFilter === f.key ? "#F5A64B" : "#E0D5C4",
                  background: currentFilter === f.key ? "#F5A64B" : "white",
                  color: currentFilter === f.key ? "white" : "#6B7280",
                  fontFamily: "'Poppins',sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {f.icon && <i className={`fa-solid ${f.icon} mr-1`} style={{ fontSize: 10 }} />}
                {f.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-1.5 bg-white border border-[#EAE3D8] rounded-xl p-1">
              <button
                onClick={() => setCurrentView("grid")}
                className={`view-btn ${currentView === "grid" ? "active" : ""}`}
                title="Vue grille"
              >
                <i className="fa-solid fa-table-cells" />
              </button>
              <button
                onClick={() => setCurrentView("list")}
                className={`view-btn ${currentView === "list" ? "active" : ""}`}
                title="Vue liste"
              >
                <i className="fa-solid fa-list-ul" />
              </button>
            </div>
            <button
              onClick={() => setVerifyModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-primary text-white border-none rounded-xl font-poppins text-xs font-semibold cursor-pointer whitespace-nowrap transition-all hover:bg-primary-dark"
            >
              <i className="fa-solid fa-shield-halved" style={{ fontSize: 14 }} />
              <span className="hidden sm:inline">Vérifier</span>
            </button>
            <button
              onClick={() => openAddModal()}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-green-dark text-white border-none rounded-xl font-poppins text-xs font-semibold cursor-pointer whitespace-nowrap transition-all hover:bg-green-mid"
            >
              <i className="fa-solid fa-plus" style={{ fontSize: 16 }} />
              <span className="hidden sm:inline">Ajouter</span>
            </button>
          </div>
        </div>

        {/* Device Grid */}
        <div
          id="deviceGrid"
          className={currentView === "list" ? "list-view" : ""}
          style={currentView === "list" ? {} : {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((d, i) => {
            const meta = TYPE_META[d.type] || TYPE_META.autre;
            const expWarn = isExpired(d.garantie);
            const isReported = ["LOST", "STOLEN", "VOLE", "PERDU"].includes(d.status?.toUpperCase());

            return (
              <div
                key={d.id}
                className={`device-card card-appear ${isReported ? "is-lost" : ""}`}
                style={{ animationDelay: `${Math.min(i, 5) * 0.05}s` }}
                onClick={() => openDetail(d.id)}
              >
                <div className="device-card-header">
                  <div
                    className="device-avatar"
                    style={{
                      background: isReported ? "#fee2e2" : meta.bg,
                      color: isReported ? "#ef4444" : meta.color,
                    }}
                  >
                    {d.photo ? (
                      <img src={d.photo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} alt="" />
                    ) : (
                      <i className={`fa-solid ${meta.icon}`} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 14.5, fontWeight: 800, color: "#1A1A1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {esc(d.nom)}
                    </p>
                    <p style={{ fontSize: 11.5, color: "#6B7280", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {esc(d.marque)} {esc(d.modele)}
                    </p>
                  </div>
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: isReported ? "#ef4444" : "#22c55e",
                      flexShrink: 0,
                      marginTop: 4,
                    }}
                  />
                </div>
                <div className="device-card-body">
                  {d.serial && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, overflow: "hidden" }}>
                      <i className="fa-solid fa-barcode" style={{ color: "#C4BAB0", fontSize: 11, width: 14, flexShrink: 0 }} />
                      <span style={{ fontSize: 11.5, color: "#6B7280", fontFamily: "monospace", letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {esc(d.serial)}
                      </span>
                    </div>
                  )}
                  {d.dateAchat && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <i className="fa-solid fa-calendar" style={{ color: "#C4BAB0", fontSize: 11, width: 14, flexShrink: 0 }} />
                      <span style={{ fontSize: 11.5, color: "#6B7280" }}>Acheté le {formatDate(d.dateAchat)}</span>
                    </div>
                  )}
                </div>
                <div className="device-card-footer">
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {isReported && (
                      <span className="tag" style={{ background: "#ef4444", color: "white" }}>
                        <i className="fa-solid fa-bell" style={{ fontSize: 9 }} /> Signalé
                      </span>
                    )}
                    {d.garantie && (
                      <span
                        className="tag"
                        style={{
                          background: expWarn ? "#fef2f2" : "#E8F5EE",
                          color: expWarn ? "#ef4444" : "#1E3A2F",
                        }}
                      >
                        <i className={`fa-solid ${expWarn ? "fa-triangle-exclamation" : "fa-shield-check"}`} style={{ fontSize: 9 }} />
                        {expWarn ? "Exp" : "OK"}
                      </span>
                    )}
                    {d.assurance === "oui" && (
                      <span className="tag" style={{ background: "#FEF0DC", color: "#D98A30" }}>
                        <i className="fa-solid fa-shield-halved" style={{ fontSize: 9 }} /> Assuré
                      </span>
                    )}
                  </div>
                  {d.prix ? (
                    <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, fontWeight: 700, color: "#1A1A1A", whiteSpace: "nowrap" }}>
                      {Number(d.prix).toLocaleString("fr")} FCFA
                    </span>
                  ) : null}
                </div>
                <div style={{ padding: "0 20px 16px" }}>
                  {isReported ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); confirmFoundAppareil(d.id); }}
                      className="w-full py-2 bg-green-600 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all active:scale-95"
                    >
                      <i className="fa-solid fa-check-circle" /> Retrouvé
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); confirmLostAppareil(d.id); }}
                      className="w-full py-2 bg-red-500 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95"
                    >
                      <i className="fa-solid fa-triangle-exclamation" /> Signaler
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                background: "#F2EBD9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                marginBottom: 18,
              }}
            >
              📱
            </div>
            <h3 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: "#1A1A1A", marginBottom: 8 }}>
              Aucun appareil enregistré
            </h3>
            <p style={{ fontSize: 13, color: "#9CA3AF", maxWidth: 300, lineHeight: 1.6, marginBottom: 22 }}>
              Ajoutez vos appareils pour conserver vos factures, numéros de série et garanties en un seul endroit.
            </p>
            <button
              onClick={() => openAddModal()}
              style={{
                padding: "11px 22px",
                background: "#1E3A2F",
                border: "none",
                borderRadius: 12,
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontSize: 14,
                fontWeight: 800,
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#2D5A42")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#1E3A2F")}
            >
              <i className="fa-solid fa-plus" /> Ajouter mon premier appareil
            </button>
          </div>
        )}
      </div>

      {/* ───────────────── MODALS ───────────────── */}

      {/* Verify Modal */}
      {verifyModalOpen && createPortal(
        <div
          className="fixed inset-0 flex items-end md:items-center justify-center md:p-4 z-[210]"
          style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(12px)", animation: "fadeIn 0.25s ease" }}
        >
          <div
            className="bg-white rounded-t-[22px] md:rounded-[22px] w-full max-w-[450px] text-center shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-in"
            style={{ padding: 32, animation: "popUp 0.35s cubic-bezier(.34,1.56,.64,1)" }}
          >
            {/* Grab handle for mobile */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 md:hidden" />
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 20,
                background: "#FEF0DC",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <i className="fa-solid fa-shield-halved" style={{ color: "#F5A64B", fontSize: 32 }} />
            </div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, color: "#1A1A1A", marginBottom: 12 }}>
              Vérifier un appareil
            </h2>
            <p style={{ fontSize: 13.5, color: "#6B7280", lineHeight: 1.6, marginBottom: 24 }}>
              Vous souhaitez acheter un appareil d'occasion ? Vérifiez si l'appareil n'a pas été déclaré <strong>volé ou perdu</strong>.
            </p>
            <div style={{ marginBottom: 24, textAlign: "left" }}>
              <label className="field-label" style={{ marginBottom: 8 }}>Numéro de série / IMEI</label>
              <div className="field-wrapper">
                <i className="fa-solid fa-barcode field-icon" />
                <input
                  type="text"
                  className="field-input"
                  placeholder="Saisissez l'IMEI ou N° de série"
                  value={verifyImei}
                  onChange={(e) => setVerifyImei(e.target.value)}
                />
              </div>
            </div>
            {verifyResult && (
              <div
                style={{
                  display: "block",
                  marginBottom: 24,
                  padding: 16,
                  borderRadius: 14,
                  textAlign: "left",
                  animation: "fadeIn 0.3s ease",
                  background: verifyResult.bg,
                  border: `1px solid ${verifyResult.border}`,
                }}
                dangerouslySetInnerHTML={{ __html: verifyResult.html }}
              />
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setVerifyModalOpen(false); setVerifyResult(null); setVerifyImei(""); }}
                style={{
                  flex: 1,
                  padding: 14,
                  border: "1.5px solid #E0D5C4",
                  background: "white",
                  borderRadius: 14,
                  fontFamily: "'Poppins',sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                onClick={startVerification}
                disabled={verifyLoading}
                style={{
                  flex: 1.5,
                  padding: 14,
                  background: "#F5A64B",
                  color: "white",
                  border: "none",
                  borderRadius: 14,
                  fontFamily: "'Bricolage Grotesque',sans-serif",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: verifyLoading ? 0.7 : 1,
                }}
              >
                {verifyLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-magnifying-glass" />}
                Vérifier
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add/Edit Modal */}
      {addModalOpen && createPortal(
        <div
          className="fixed inset-0 flex items-end md:items-center justify-center md:p-4 z-[210]"
          style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(12px)", animation: "fadeIn 0.25s ease" }}
        >
          <div
            className="bg-white rounded-t-[22px] md:rounded-[22px] w-full max-w-[580px] max-h-[90vh] overflow-y-auto shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-in"
            style={{ animation: "popUp 0.35s cubic-bezier(.34,1.56,.64,1)" }}
          >
            {/* Grab handle for mobile */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 md:hidden" />
            <div className="modal-header">
              <div>
                <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 19, fontWeight: 800, color: "#1A1A1A" }}>
                  {editingId ? "Modifier l'appareil" : "Ajouter un appareil"}
                </h2>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Conservez toutes les infos importantes</p>
              </div>
              <button onClick={closeAddModal} style={{
                width: 34, height: 34, borderRadius: 9, border: "1.5px solid #E0D5C4",
                background: "white", cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", color: "#6B7280", fontSize: 14, transition: "all .15s",
                flexShrink: 0,
              }} onMouseOver={(e) => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "#E0D5C4"; e.currentTarget.style.color = "#6B7280"; }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="modal-body">
              {/* Type selector */}
              <div style={{ marginBottom: 20 }}>
                <p className="field-label" style={{ marginBottom: 10 }}>
                  <i className="fa-solid fa-shapes" style={{ color: "#F5A64B" }} /> Type d'appareil
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 8 }}>
                  {[
                    { key: "telephone", icon: "fa-mobile-screen-button", label: "Téléphone" },
                    { key: "ordinateur", icon: "fa-laptop", label: "Ordinateur" },
                    { key: "tablette", icon: "fa-tablet-screen-button", label: "Tablette" },
                    { key: "tv", icon: "fa-tv", label: "TV" },
                    { key: "autre", icon: "fa-box", label: "Autre" },
                  ].map((t) => (
                    <div
                      key={t.key}
                      className={`type-option ${selectedType === t.key ? "selected" : ""}`}
                      onClick={() => setSelectedType(t.key)}
                    >
                      <div className="type-icon"><i className={`fa-solid ${t.icon}`} /></div>
                      {t.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Basic info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div className="field-group" style={{ gridColumn: "1/-1" }}>
                  <label className="field-label"><i className="fa-solid fa-tag" style={{ color: "#F5A64B", fontSize: 10 }} /> Nom de l'appareil <span style={{ color: "#ef4444" }}>*</span></label>
                  <div className="field-wrapper"><i className="fa-solid fa-tag field-icon" /><input type="text" className="field-input" id="fNom" value={fNom} onChange={(e) => setFNom(e.target.value)} placeholder="Ex: iPhone 14 Pro, MacBook Air M2…" /></div>
                </div>
                <div className="field-group">
                  <label className="field-label"><i className="fa-solid fa-building" style={{ color: "#F5A64B", fontSize: 10 }} /> Marque</label>
                  <div className="field-wrapper"><i className="fa-solid fa-building field-icon" />
                    <select className="field-input" value={fMarque} onChange={(e) => setFMarque(e.target.value)}>
                      <option value="">Sélectionner…</option>
                      <optgroup label="Téléphones / Tablettes">
                        <option>Apple</option><option>Samsung</option><option>Xiaomi</option>
                        <option>Oppo</option><option>Tecno</option><option>Infinix</option>
                        <option>Itel</option><option>Huawei</option><option>OnePlus</option>
                      </optgroup>
                      <optgroup label="Ordinateurs">
                        <option>Apple</option><option>Dell</option><option>HP</option>
                        <option>Lenovo</option><option>Asus</option><option>Acer</option><option>MSI</option>
                      </optgroup>
                      <optgroup label="TV / Audio">
                        <option>Samsung</option><option>LG</option><option>Sony</option>
                        <option>TCL</option><option>Hisense</option>
                      </optgroup>
                      <option value="autre">Autre…</option>
                    </select>
                  </div>
                </div>
                <div className="field-group">
                  <label className="field-label"><i className="fa-solid fa-code-branch" style={{ color: "#F5A64B", fontSize: 10 }} /> Modèle</label>
                  <div className="field-wrapper"><i className="fa-solid fa-code-branch field-icon" /><input type="text" className="field-input" value={fModele} onChange={(e) => setFModele(e.target.value)} placeholder="Ex: Galaxy S23…" /></div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div className="field-group">
                  <label className="field-label"><i className="fa-solid fa-barcode" style={{ color: "#F5A64B", fontSize: 10 }} /> N° série / IMEI</label>
                  <div className="field-wrapper"><i className="fa-solid fa-barcode field-icon" /><input type="text" className="field-input" value={fSerial} onChange={(e) => setFSerial(e.target.value)} placeholder="SN ou IMEI" /></div>
                </div>
                <div className="field-group">
                  <label className="field-label"><i className="fa-solid fa-palette" style={{ color: "#F5A64B", fontSize: 10 }} /> Couleur</label>
                  <div className="field-wrapper"><i className="fa-solid fa-palette field-icon" /><input type="text" className="field-input" value={fCouleur} onChange={(e) => setFCouleur(e.target.value)} placeholder="Ex: Noir, Space Gray…" /></div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-3.5">
                <div className="field-group">
                  <label className="field-label"><i className="fa-solid fa-calendar-plus" style={{ color: "#F5A64B", fontSize: 10 }} /> Date d'achat</label>
                  <DatePicker value={fDateAchat} onChange={(v) => setFDateAchat(v)} className="field-input" icon="fa-solid fa-calendar" placeholder="jj/mm/aaaa" />
                </div>
                <div className="field-group">
                  <label className="field-label"><i className="fa-solid fa-calendar-xmark" style={{ color: "#F5A64B", fontSize: 10 }} /> Fin garantie</label>
                  <DatePicker value={fGarantie} onChange={(v) => setFGarantie(v)} className="field-input" icon="fa-solid fa-calendar-xmark" placeholder="jj/mm/aaaa" />
                </div>
                <div className="field-group">
                  <label className="field-label"><i className="fa-solid fa-coins" style={{ color: "#F5A64B", fontSize: 10 }} /> Prix</label>
                  <div className="field-wrapper"><i className="fa-solid fa-coins field-icon" style={{ fontSize: 11 }} /><input type="number" className="field-input" value={fPrix} onChange={(e) => setFPrix(e.target.value)} placeholder="FCFA" min={0} step={500} /></div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div className="field-group">
                  <label className="field-label"><i className="fa-solid fa-store" style={{ color: "#F5A64B", fontSize: 10 }} /> Lieu d'achat</label>
                  <div className="field-wrapper"><i className="fa-solid fa-store field-icon" /><input type="text" className="field-input" value={fLieu} onChange={(e) => setFLieu(e.target.value)} placeholder="Ex: Orange Digital Center…" /></div>
                </div>
                <div className="field-group">
                  <label className="field-label"><i className="fa-solid fa-shield-halved" style={{ color: "#F5A64B", fontSize: 10 }} /> Assurance</label>
                  <div className="field-wrapper"><i className="fa-solid fa-shield-halved field-icon" />
                    <select className="field-input" value={fAssurance} onChange={(e) => setFAssurance(e.target.value)}>
                      <option value="">Non assuré</option>
                      <option value="oui">Assuré</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="field-group" style={{ marginBottom: 18 }}>
                <label className="field-label"><i className="fa-solid fa-comment-dots" style={{ color: "#F5A64B", fontSize: 10 }} /> Notes</label>
                <div className="field-wrapper"><textarea className="field-input no-icon" value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="État, accessoires inclus…" /></div>
              </div>

              {/* Invoice upload */}
              <div style={{ marginBottom: 20 }}>
                <p className="field-label" style={{ marginBottom: 8 }}><i className="fa-solid fa-file-invoice" style={{ color: "#F5A64B" }} /> Facture / Ticket</p>
                <div
                  className={`upload-zone ${selectedFiles.length > 0 ? "has-file" : ""}`}
                  onClick={() => factureInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("dragover"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("dragover"); }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("dragover"); if (e.dataTransfer.files.length) handleFactureFiles(e.dataTransfer.files); }}
                >
                  {selectedFiles.length === 0 && (
                    <>
                      <div style={{ width: 44, height: 44, borderRadius: 11, background: "#F2EBD9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="fa-solid fa-cloud-arrow-up" style={{ color: "#C4BAB0", fontSize: 20 }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>Glisser-déposer ou cliquer</p>
                        <p style={{ fontSize: 11, color: "#9CA3AF" }}>PDF, JPG, PNG · Max 10 Mo</p>
                      </div>
                    </>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>
                    {renderFileChips()}
                  </div>
                </div>
                <input ref={factureInputRef} type="file" accept=".pdf,image/*" multiple style={{ display: "none" }} onChange={(e) => e.target.files && handleFactureFiles(e.target.files)} />
              </div>

              {/* Photos */}
              <div style={{ marginBottom: 24 }}>
                <p className="field-label" style={{ marginBottom: 8 }}><i className="fa-solid fa-camera" style={{ color: "#F5A64B" }} /> Photos</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ position: "relative" }}>
                    <div className="upload-zone" style={{ minHeight: 90 }} onClick={() => photoInputRef.current?.click()}>
                      {photoPreview ? (
                        <img src={photoPreview} style={{ maxHeight: 80, borderRadius: 8, objectFit: "cover" }} alt="" />
                      ) : (
                        <div><i className="fa-solid fa-image" style={{ color: "#C4BAB0", fontSize: 22, marginBottom: 4 }} /><p style={{ fontSize: 11, color: "#9CA3AF" }}>Photo recto</p></div>
                      )}
                    </div>
                    <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handlePhotoUpload(e, false)} />
                  </div>
                  <div>
                    <div className="upload-zone" style={{ minHeight: 90 }} onClick={() => photoSerialInputRef.current?.click()}>
                      {photoSerialPreview ? (
                        <img src={photoSerialPreview} style={{ maxHeight: 80, borderRadius: 8, objectFit: "cover" }} alt="" />
                      ) : (
                        <div><i className="fa-solid fa-barcode" style={{ color: "#C4BAB0", fontSize: 22, marginBottom: 4 }} /><p style={{ fontSize: 11, color: "#9CA3AF" }}>Photo N° série</p></div>
                      )}
                    </div>
                    <input ref={photoSerialInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handlePhotoUpload(e, true)} />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={closeAddModal} style={{
                  flex: 1, padding: 13, border: "1.5px solid #E0D5C4", background: "white", borderRadius: 12,
                  fontFamily: "'Poppins',sans-serif", fontSize: 13.5, fontWeight: 600, color: "#374151", cursor: "pointer",
                }} onMouseOver={(e) => e.currentTarget.style.background = "#F9F6F1"} onMouseOut={(e) => e.currentTarget.style.background = "white"}>
                  Annuler
                </button>
                <button onClick={handleSave} disabled={saving} style={{
                  flex: 2, padding: 13, background: "#1E3A2F", border: "none", borderRadius: 12,
                  fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, fontWeight: 800, color: "white",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.7 : 1,
                }} onMouseOver={(e) => e.currentTarget.style.background = "#2D5A42"} onMouseOut={(e) => e.currentTarget.style.background = "#1E3A2F"}>
                  {saving ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-floppy-disk" />}
                  <span>{editingId ? "Modifications" : "Enregistrer"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Detail Panel */}
      {detailOpen && detailDevice && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-end z-[210]"
          style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(12px)", animation: "fadeIn 0.25s ease" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeDetail(); }}
        >
          <div
            className="bg-white h-full w-full max-w-[420px] overflow-y-auto pb-0"
            style={{ animation: "slideFromRight 0.3s ease", boxShadow: "-10px 0 40px rgba(0,0,0,.15)" }}
          >
            <div style={{ padding: "22px 22px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
                <button onClick={closeDetail} style={{
                  display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                  cursor: "pointer", fontFamily: "'Poppins',sans-serif", fontSize: 12.5, fontWeight: 600, color: "#6B7280",
                }} onMouseOver={(e) => e.currentTarget.style.color = "#1A1A1A"} onMouseOut={(e) => e.currentTarget.style.color = "#6B7280"}>
                  <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }} /> Retour
                </button>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <button onClick={editCurrentDevice} style={{
                    padding: "7px 14px", border: "1.5px solid #E0D5C4", background: "white", borderRadius: 9,
                    fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 600, color: "#374151",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
                  }} onMouseOver={(e) => e.currentTarget.style.borderColor = "#F5A64B"} onMouseOut={(e) => e.currentTarget.style.borderColor = "#E0D5C4"}>
                    <i className="fa-solid fa-pen-to-square" style={{ fontSize: 11 }} /> Modifier
                  </button>
                  <button onClick={deleteCurrentDevice} style={{
                    padding: "7px 14px", border: "1.5px solid #FECACA", background: "#fef2f2", borderRadius: 9,
                    fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 600, color: "#ef4444",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
                  }} onMouseOver={(e) => e.currentTarget.style.background = "#FEE2E2"} onMouseOut={(e) => e.currentTarget.style.background = "#fef2f2"}>
                    <i className="fa-solid fa-trash" style={{ fontSize: 11 }} /> Supprimer
                  </button>
                </div>
              </div>

              {(() => {
                const d = detailDevice;
                const meta = TYPE_META[d.type] || TYPE_META.autre;
                const expWarn = isExpired(d.garantie);
                const files = (d as Device & { files?: Array<Record<string, unknown>> }).files || [];

                return (
                  <>
                    <div style={{
                      background: `linear-gradient(135deg,${meta.bg},white)`,
                      borderRadius: 16, padding: 20, marginBottom: 20, display: "flex",
                      alignItems: "center", gap: 16, border: `1px solid ${meta.color}30`,
                    }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: 16, background: "white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 28, flexShrink: 0, color: meta.color,
                        boxShadow: `0 4px 14px ${meta.color}20`, overflow: "hidden",
                      }}>
                        {d.photo ? (
                          <img src={d.photo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }} alt="" />
                        ) : (
                          <i className={`fa-solid ${meta.icon}`} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: "#1A1A1A", wordBreak: "break-word" }}>{esc(d.nom)}</p>
                        <p style={{ fontSize: 12.5, color: "#6B7280", wordBreak: "break-word" }}>{esc(d.marque)} {esc(d.modele)}</p>
                        <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                          <span style={{ padding: "2px 9px", borderRadius: 99, background: meta.bg, color: meta.color, fontSize: 10.5, fontWeight: 700 }}>{meta.label}</span>
                          {d.assurance === "oui" && <span style={{ padding: "2px 9px", borderRadius: 99, background: "#FEF0DC", color: "#D98A30", fontSize: 10.5, fontWeight: 700 }}><i className="fa-solid fa-shield-halved" style={{ fontSize: 8 }} /> Assuré</span>}
                          {d.garantie && <span style={{ padding: "2px 9px", borderRadius: 99, background: expWarn ? "#fef2f2" : "#E8F5EE", color: expWarn ? "#ef4444" : "#1E3A2F", fontSize: 10.5, fontWeight: 700 }}>{expWarn ? "Exp." : "Valide"}</span>}
                        </div>
                      </div>
                    </div>

                    {d.photo && (
                      <div style={{ marginBottom: 20 }}>
                        <img
                          src={d.photo}
                          style={{
                            width: "100%", borderRadius: 14, display: "block",
                            maxHeight: 300, objectFit: "contain", background: "#F9F6F1",
                            border: "1px solid #EDE7DB",
                          }}
                          alt=""
                        />
                      </div>
                    )}

                    <div style={{ marginBottom: 20 }}>
                      <p style={{ fontSize: 10.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, paddingLeft: 2 }}>Détails</p>
                      {infoRow("fa-barcode", "Numéro de série", d.serial)}
                      {infoRow("fa-palette", "Couleur", d.couleur)}
                      {infoRow("fa-calendar", "Date d'achat", d.dateAchat ? formatDate(d.dateAchat) : "")}
                      {infoRow("fa-calendar-xmark", "Fin garantie", d.garantie ? formatDate(d.garantie) : "")}
                      {infoRow("fa-coins", "Prix d'achat", d.prix ? Number(d.prix).toLocaleString("fr") + " FCFA" : "")}
                      {infoRow("fa-store", "Lieu d'achat", d.lieu)}
                      {infoRow("fa-comment-dots", "Notes", d.notes)}
                    </div>

                    {files.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                          Factures ({files.length})
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {files.map((f: Record<string, unknown>, i: number) => (
                            <div key={i}>
                              <img
                                src={f.data}
                                style={{
                                  width: "100%", borderRadius: 12, display: "block",
                                  maxHeight: 200, objectFit: "contain", background: "#F9F6F1",
                                  border: "1px solid #EDE7DB", cursor: "pointer",
                                }}
                                onClick={() => window.open(f.data, "_blank")}
                                alt={esc(f.name)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Lost Modal */}
      {confirmLostOpen && createPortal(
        <div
          className="fixed inset-0 flex items-end md:items-center justify-center md:p-4 z-[210]"
          style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(12px)" }}
        >
          <div className="bg-white rounded-t-[28px] md:rounded-[28px] w-full max-w-md text-center shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-in" style={{ padding: 32 }}>
            {/* Grab handle for mobile */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 md:hidden" />
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ color: "#ef4444", fontSize: 24 }} />
            </div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 20, fontWeight: 800, color: "#1A1A1A", marginBottom: 8 }}>
              {confirmFound ? "Confirmer la trouvaille ?" : "Signaler un problème"}
            </h2>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 12 }}>
              {confirmFound ? "Marquer cet appareil comme sécurisé ?" : "Voulez-vous déclarer cet appareil comme perdu ou volé ?"}
            </p>

            <div style={{ background: "#fff7ed", borderRadius: 12, padding: 12, marginBottom: 20, textAlign: "left", border: "1px solid #ffedd5" }}>
              {!confirmFound && (
                <div className="field-group" style={{ marginBottom: 15 }}>
                  <label className="field-label">Type de signalement</label>
                  <select className="field-input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                    <option value="LOST">Perdu (Oubli, perte)</option>
                    <option value="STOLEN">Volé (Vol avec agression ou effraction)</option>
                  </select>
                </div>
              )}
              <p style={{ fontSize: 11.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Confirmer avec votre mot de passe
              </p>
              <div className="field-wrapper">
                <i className="fa-solid fa-lock field-icon" />
                <input
                  type="password"
                  className="field-input"
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(false); }}
                />
              </div>
              {passwordError && (
                <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6, fontWeight: 600 }}>
                  <i className="fa-solid fa-circle-exclamation" /> Mot de passe incorrect ou trop court.
                </p>
              )}

              <button
                onClick={confirmFound ? validateAndSubmitFound : validateAndSubmitLost}
                disabled={confirming}
                style={{
                  width: "100%",
                  marginTop: 20,
                  padding: 14,
                  background: confirmFound ? "#059669" : "#ef4444",
                  border: "none",
                  borderRadius: 12,
                  fontFamily: "'Bricolage Grotesque',sans-serif",
                  fontSize: 15,
                  fontWeight: 800,
                  color: "white",
                  cursor: "pointer",
                  boxShadow: confirmFound ? "0 10px 25px rgba(5,150,105,.3)" : "0 10px 25px rgba(239,68,68,.3)",
                  opacity: confirming ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {confirming ? <i className="fa-solid fa-spinner fa-spin" /> : null}
                {confirmFound ? "Confirmer le retour" : "Confirmer la déclaration"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={closeConfirmLost} style={{
                flex: 1, padding: 12, border: "1.5px solid #E0D5C4", background: "white", borderRadius: 12,
                fontFamily: "'Poppins',sans-serif", fontSize: 13.5, fontWeight: 600, color: "#374151", cursor: "pointer",
              }}>
                Annuler
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Success Modal */}
      {successOpen && createPortal(
        <div
          className="fixed inset-0 flex items-end md:items-center justify-center md:p-4 z-[210]"
          style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(12px)" }}
        >
          <div className="bg-white rounded-t-[24px] md:rounded-[24px] w-full max-w-md text-center shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-in" style={{ padding: 32 }}>
            {/* Grab handle for mobile */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 md:hidden" />
            <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#E8F5EE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>
              <i className="fa-solid fa-check" style={{ color: "#10B981" }} />
            </div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, fontWeight: 800, color: "#1A1A1A", marginBottom: 8 }}>
              {successTitle}
            </h2>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 24 }}>
              {successTitle.includes("retrouvé")
                ? "L'appareil a été marqué comme sécurisé dans votre inventaire."
                : "L'appareil a été marqué comme perdu dans votre inventaire. Nous vous tiendrons informé."}
            </p>
            <button
              onClick={() => setSuccessOpen(false)}
              style={{
                width: "100%",
                padding: 14,
                background: "#1E3A2F",
                color: "white",
                border: "none",
                borderRadius: 14,
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontSize: 15,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              D'accord
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
