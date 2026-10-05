import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";
import { useTopbar } from "../../hooks/useTopbar";
import { useToast } from "../../context/ToastContext";
import { devicesService } from "../../services/devicesService";
import { deviceTransferService } from "../../services/deviceTransferService";

import DatePicker from "../../components/ui/DatePicker";
import type { Device } from "../../types/api";
import {
  TextInput,
  Textarea,
  Select,
  Button,
  Card,
  Badge,
  Paper,
  Text,
  Title,
  Group,
  Stack,
  SimpleGrid,
  Modal,
  ActionIcon,
  ThemeIcon,
  Skeleton,
  PasswordInput,
  Radio,
  Box,
  Divider,
} from "@mantine/core";

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

const BRAND_OPTIONS = [
  { group: "Téléphones / Tablettes", items: ["Apple", "Samsung", "Xiaomi", "Oppo", "Tecno", "Infinix", "Itel", "Huawei", "OnePlus"] },
  { group: "Ordinateurs", items: ["Dell", "HP", "Lenovo", "Asus", "Acer", "MSI"] },
  { group: "TV / Audio", items: ["LG", "Sony", "TCL", "Hisense"] },
];

export default function MesAppareils() {
  const { t } = useI18n();
  useTopbar("Mes appareils & équipements", [{ label: "Accueil", href: "/dashboard" }, { label: "Mes appareils" }]);
  const { user } = useAuth();
  const toast = useToast();
  const TYPE_META = getTypeMeta(t);
  const [devices, setDevices] = useState<NormalizedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState("all");
  const [currentView, setCurrentView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("telephone");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [photoBlob, setPhotoBlob] = useState<File | null>(null);
  const [photoSerialBlob, setPhotoSerialBlob] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

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

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyImei, setVerifyImei] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ html: string; bg: string; border: string } | null>(null);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferDeviceId, setTransferDeviceId] = useState<string | null>(null);
  const [transferEmail, setTransferEmail] = useState("");
  const [transferPassword, setTransferPassword] = useState("");
  const [transferSending, setTransferSending] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [transferSent, setTransferSent] = useState(false);

  const [confirmLostOpen, setConfirmLostOpen] = useState(false);
  const [confirmFound, setConfirmFound] = useState(false);
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);
  const [reportType, setReportType] = useState("LOST");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [successOpen, setSuccessOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("Appareil déclaré perdu !");

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoSerialPreview, setPhotoSerialPreview] = useState<string | null>(null);

  const factureInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoSerialInputRef = useRef<HTMLInputElement>(null);

  const CACHE_KEY = "dm_devices_cache";

  const safeSaveCache = (data: NormalizedDevice[]) => {
    try {
      const cleanData = data.map((d) => ({
        ...d,
        photo: d.photo?.startsWith("data:") ? null : d.photo,
        files: (d.files || []).map((f) => ({ ...f, data: f.data?.startsWith("data:") ? "" : f.data })),
      }));
      localStorage.setItem(CACHE_KEY, JSON.stringify(cleanData));
    } catch (e) {
      console.warn("Impossible de sauvegarder le cache d'appareils", e);
    }
  };

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
        safeSaveCache(normalized);
      }
    } catch {
      try {
        const result = await devicesService.getAll();
        if (result.success && Array.isArray(result.data)) {
          const normalized = result.data.map(normalizeDevice);
          setDevices(normalized);
          safeSaveCache(normalized);
        }
      } catch { }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDevices(parsed);
          setLoading(false);
        }
      } catch { }
    }
    fetchDevices(devices.length === 0);
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
      const d = devices.find((x) => String(x.id) === String(id));
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
      document.getElementById("fNom")?.focus();
      return;
    }
    if (fSerial.trim() && !/\d/.test(fSerial)) {
      toast.warning("Le numéro de série / IMEI doit contenir au moins un chiffre.");
      return;
    }
    if (fDateAchat) {
      const d = new Date(fDateAchat);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (d > today) {
        toast.warning("La date d'achat ne peut pas être dans le futur.");
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
      const result = editingId
        ? await devicesService.updateMyDevice(editingId, formData)
        : await devicesService.registerMyDevice(formData);

      if (result.success) {
        toast.success(editingId ? "Appareil modifié avec succès" : "Appareil enregistré avec succès");
        await fetchDevices(false);
        closeAddModal();
      } else {
        toast.error(result.message || "Erreur lors de l'enregistrement");
      }
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de l'enregistrement");
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
    const d = devices.find((x) => String(x.id) === String(detailId));
    if (!d) return;
    if (!confirm(`Supprimer "${d.nom}" ? Cette action est irréversible.`)) return;

    try {
      const result = await devicesService.delete(detailId);
      if (result.success) {
        await fetchDevices();
        closeDetail();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Erreur lors de la suppression");
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
        toast.error(result.message);
      }
    } catch {
      toast.error("Erreur lors du signalement");
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
        toast.error(result.message);
      }
    } catch {
      toast.error("Erreur lors de la confirmation");
    } finally {
      setConfirming(false);
    }
  };

  const startVerification = async () => {
    if (!verifyImei.trim()) {
      toast.warning("Veuillez saisir un numéro IMEI ou de série.");
      return;
    }
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const result = await devicesService.verifyDevice(verifyImei.trim());
      const resultData = result as { success: boolean; data?: Record<string, unknown> };
      if (result.success && resultData.data) {
        const device = resultData.data;
        const isReported = device.is_reported;
        const fmtDate = (d: any) => d ? new Date(String(d)).toLocaleDateString("fr-FR") : "—";
        setVerifyResult({
          bg: isReported ? "#fef2f2" : "#f0fdf4",
          border: isReported ? "#fecaca" : "#bbf7d0",
          html: `
            <div style="display:flex;gap:12px;margin-bottom:12px;">
              <div style="width:40px;height:40px;border-radius:50%;background:${isReported ? "#ef4444" : "#22c55e"};display:flex;align-items:center;justify-content:center;color:white;flex-shrink:0;">
                <i class="fa-solid ${isReported ? "fa-triangle-exclamation" : "fa-check"}"></i>
              </div>
              <div>
                <p style="font-weight:800;color:${isReported ? "#991b1b" : "#166534"};font-size:14px;margin-bottom:2px;">
                  ${isReported ? "Attention !" : "Appareil sûr"}
                </p>
                <p style="font-size:12px;color:${isReported ? "#b91c1c" : "#15803d"};line-height:1.4;word-break:break-word;">
                  ${device.brand} ${device.model} ${isReported ? `- Signalé ${device.status}` : ""}
                </p>
              </div>
            </div>
            <div style="border-top:1px solid #e5e0d8;padding-top:12px;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
                <div style="font-weight:600;color:#1e293b;">Propriétaire</div>
                <div style="color:#475569;">${device.owner || "—"}</div>
                <div style="font-weight:600;color:#1e293b;">Catégorie</div>
                <div style="color:#475569;">${device.category || "—"}</div>
                <div style="font-weight:600;color:#1e293b;">Date d'achat</div>
                <div style="color:#475569;">${fmtDate(device.purchase_date)}</div>
                <div style="font-weight:600;color:#1e293b;">Statut</div>
                <div style="color:${isReported ? "#ef4444" : "#22c55e"};font-weight:600;">${isReported ? "Signalé perdu/volé" : "En sécurité"}</div>
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

  const detailDevice = detailId ? devices.find((d) => String(d.id) === String(detailId)) : null;

  const infoRow = (icon: string, label: string, val: string) =>
    val ? (
      <Group key={label} gap="md" py="sm" style={{ borderBottom: "1px solid #F0EAE0" }}>
        <ThemeIcon size="lg" radius="md" variant="light" color="yellow">
          <i className={`fa-solid ${icon}`} />
        </ThemeIcon>
        <div className="flex-1">
          <Text size="10px" fw={700} c="dimmed" tt="uppercase" tracking="xs" mb={3}>{label}</Text>
          <Text size="sm" fw={600}>{esc(val)}</Text>
        </div>
      </Group>
    ) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Skeleton width={44} height={44} radius="xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      <style>{`
        #deviceGrid.list-view { display: flex; flex-direction: column; gap: 10px; }
        #deviceGrid.list-view .device-card { display: flex; flex-direction: row; border-radius: 14px; }
        #deviceGrid.list-view .device-card-header { flex: 1; padding: 14px 18px; border-bottom: none; }
        #deviceGrid.list-view .device-card-body { display: none; }
        #deviceGrid.list-view .device-card-footer { border-top: none; border-left: 1px solid #EDE7DB; border-radius: 0; padding: 14px 18px; flex-direction: column; align-items: flex-end; gap: 6px; min-width: 150px; }
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
        .filter-btn:hover { border-color: #E8923A; color: #E8923A; }
        .filter-btn.active { border-color: #E8923A; background: #E8923A; color: white; }
        .view-btn { width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid #E0D5C4; background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6B7280; font-size: 13px; transition: all .2s; }
        .view-btn.active { background: #2D5A42; border-color: #2D5A42; color: white; }
        .type-option { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 12px 8px; border-radius: 12px; border: 2px solid #E0D5C4; background: white; cursor: pointer; transition: all .2s; font-family: 'Poppins',sans-serif; font-size: 11px; font-weight: 600; color: #374151; text-align: center; }
        .type-option:hover { border-color: #E8923A; background: #FEF8F0; }
        .type-option.selected { border-color: #E8923A; background: #FEF0DC; color: #E8923A; }
        .type-option .type-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 17px; background: #F2EBD9; color: #E8923A; transition: background .2s; }
        .type-option.selected .type-icon { background: rgba(217,138,48,.25); }
        .upload-zone { border: 2px dashed #D0C6B8; border-radius: 13px; background: #F9F6F1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; padding: 20px 16px; cursor: pointer; transition: all .22s; text-align: center; }
        .upload-zone:hover, .upload-zone.dragover { border-color: #E8923A; background: #FEF8F0; }
        .upload-zone.has-file { border-color: #2D5A42; background: #E8F5EE; border-style: solid; }
        .file-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; background: #2D5A42; color: white; border-radius: 8px; font-size: 11.5px; font-weight: 600; margin-top: 6px; }
      `}</style>

      <div className="custom-scroll p-4 md:p-6 flex flex-col gap-6 pb-24 md:pb-6 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">
        {/* Stats */}
        <div className="max-sm:hidden">
          <SimpleGrid cols={{ base: 2, lg: 4 }} spacing="md">
            {[
              { icon: "fa-laptop", label: "Appareils", value: devices.length, color: "indigo", bg: "#EEF2FF" },
              { icon: "fa-file-invoice", label: "Factures", value: devices.filter((d) => (d as Device & { files?: Array<unknown> }).files?.length).length, color: "green", bg: "#E8F5EE" },
              { icon: "fa-shield-halved", label: "Assurés", value: devices.filter((d) => d.assurance === "oui").length, color: "yellow", bg: "#FEF0DC" },
              { icon: "fa-triangle-exclamation", label: "Garantie", value: devices.filter((d) => isExpired(d.garantie)).length, color: "red", bg: "#fef2f2" },
            ].map((stat) => (
              <Paper key={stat.label} p="md" radius="xl" withBorder>
                <Group gap="md">
                  <div className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center text-lg flex-shrink-0" style={{ background: stat.bg }}>
                    <i className={`fa-solid ${stat.icon}`} style={{ color: stat.bg === "#EEF2FF" ? "#6366F1" : stat.bg === "#E8F5EE" ? "#2D5A42" : stat.bg === "#FEF0DC" ? "#E8923A" : "#ef4444" }} />
                  </div>
                  <div>
                    <Text size="10px" fw={700} c="dimmed" tt="uppercase" tracking="widest">{stat.label}</Text>
                    <Title order={3} ff="Bricolage Grotesque" fw={800}>{stat.value}</Title>
                  </div>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </div>

        {/* Toolbar */}
        <Group justify="space-between" wrap="wrap" gap="md">
          <TextInput
            flex={1}
            maw={320}
            leftSection={<i className="fa-solid fa-magnifying-glass text-xs" />}
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            radius="xl"
            size="sm"
          />

          <Group gap="xs" style={{ overflowX: "auto", flexShrink: 0 }}>
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
              >
                {f.icon && <i className={`fa-solid ${f.icon} mr-1`} style={{ fontSize: 10 }} />}
                {f.label}
              </button>
            ))}
          </Group>

          <Group gap="sm" ml="auto">
            <div className="flex items-center gap-1.5 bg-white border border-[#EAE3D8] rounded-xl p-1">
              <button onClick={() => setCurrentView("grid")} className={`view-btn ${currentView === "grid" ? "active" : ""}`} title="Vue grille">
                <i className="fa-solid fa-table-cells" />
              </button>
              <button onClick={() => setCurrentView("list")} className={`view-btn ${currentView === "list" ? "active" : ""}`} title="Vue liste">
                <i className="fa-solid fa-list-ul" />
              </button>
            </div>
            <Button
              size="sm"
              radius="xl"
              leftSection={<i className="fa-solid fa-shield-halved" />}
              onClick={() => setVerifyModalOpen(true)}
              style={{ backgroundColor: "#E8923A" }}
            >
              <span className="hidden sm:inline">Vérifier</span>
            </Button>
            <Button
              size="sm"
              radius="xl"
              leftSection={<i className="fa-solid fa-plus" />}
              onClick={() => openAddModal()}
              style={{ backgroundColor: "#2D5A42" }}
            >
              <span className="hidden sm:inline">Ajouter</span>
            </Button>
          </Group>
        </Group>

        {/* Device Grid */}
        <div
          id="deviceGrid"
          className={currentView === "list" ? "list-view" : ""}
          style={currentView === "list" ? {} : { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 16 }}
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
                  <div className="device-avatar" style={{ background: isReported ? "#fee2e2" : meta.bg, color: isReported ? "#ef4444" : meta.color }}>
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
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: isReported ? "#ef4444" : "#22c55e", flexShrink: 0, marginTop: 4 }} />
                </div>
                <div className="device-card-body">
                  {d.serial && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, overflow: "hidden" }}>
                      <i className="fa-solid fa-barcode" style={{ color: "#C4BAB0", fontSize: 11, width: 14, flexShrink: 0 }} />
                      <span style={{ fontSize: 11.5, color: "#6B7280", fontFamily: "monospace" }}>{esc(d.serial)}</span>
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
                    {isReported && <span className="tag" style={{ background: "#ef4444", color: "white" }}><i className="fa-solid fa-bell" style={{ fontSize: 9 }} /> Signalé</span>}
                    {d.garantie && <span className="tag" style={{ background: expWarn ? "#fef2f2" : "#E8F5EE", color: expWarn ? "#ef4444" : "#2D5A42" }}><i className={`fa-solid ${expWarn ? "fa-triangle-exclamation" : "fa-shield-check"}`} style={{ fontSize: 9 }} /> {expWarn ? "Exp" : "OK"}</span>}
                    {d.assurance === "oui" && <span className="tag" style={{ background: "#FEF0DC", color: "#E8923A" }}><i className="fa-solid fa-shield-halved" style={{ fontSize: 9 }} /> Assuré</span>}
                  </div>
                  {d.prix ? <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{Number(d.prix).toLocaleString("fr")} FCFA</span> : null}
                </div>
                <div style={{ padding: "0 20px 16px" }}>
                  {isReported ? (
                    <Button fullWidth size="xs" radius="xl" color="green" variant="filled" leftSection={<i className="fa-solid fa-check-circle" />} onClick={(e) => { e.stopPropagation(); confirmFoundAppareil(d.id); }}>
                      Retrouvé
                    </Button>
                  ) : (
                    <Button fullWidth size="xs" radius="xl" color="red" variant="filled" leftSection={<i className="fa-solid fa-triangle-exclamation" />} onClick={(e) => { e.stopPropagation(); confirmLostAppareil(d.id); }}>
                      Signaler
                    </Button>
                  )}
                  <Button
                    fullWidth
                    size="xs"
                    radius="xl"
                    variant="outline"
                    color="gray"
                    mt="xs"
                    leftSection={<i className="fa-solid fa-arrow-right-arrow-left" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isReported) {
                        toast.error("Impossible de transférer un appareil signalé comme perdu ou volé.");
                        return;
                      }
                      setTransferDeviceId(String(d.id));
                      setTransferEmail("");
                      setTransferPassword("");
                      setTransferError("");
                      setTransferSent(false);
                      setTransferModalOpen(true);
                    }}
                  >
                    Transférer
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Paper w={80} h={80} radius="xl" withBorder style={{ background: "#F2EBD9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, marginBottom: 18 }}>
              📱
            </Paper>
            <Title order={4} ff="Bricolage Grotesque" mb="xs">Aucun appareil enregistré</Title>
            <Text size="sm" c="dimmed" maw={300} mb="lg">
              Ajoutez vos appareils pour conserver vos factures, numéros de série et garanties en un seul endroit.
            </Text>
            <Button
              leftSection={<i className="fa-solid fa-plus" />}
              onClick={() => openAddModal()}
              style={{ backgroundColor: "#2D5A42" }}
              radius="xl"
            >
              Ajouter mon premier appareil
            </Button>
          </div>
        )}
      </div>

      {/* ───────────────── MODALS ───────────────── */}

      {/* Verify Modal */}
      <Modal
        opened={verifyModalOpen}
        onClose={() => { setVerifyModalOpen(false); setVerifyResult(null); setVerifyImei(""); }}
        centered
        radius="xl"
        size="sm"
        padding="xl"
        title={
          <Stack align="center" gap="md">
            <ThemeIcon size={70} radius="xl" variant="light" color="yellow">
              <i className="fa-solid fa-shield-halved text-3xl" />
            </ThemeIcon>
            <div>
              <Title order={4} ta="center" ff="Bricolage Grotesque">Vérifier un appareil</Title>
              <Text size="sm" c="dimmed" ta="center" mt={4}>
                Vous souhaitez acheter un appareil d'occasion ? Vérifiez si l'appareil n'a pas été déclaré <strong>volé ou perdu</strong>.
              </Text>
            </div>
          </Stack>
        }
      >
        <Stack gap="md">
          <TextInput
            label="Numéro de série / IMEI"
            leftSection={<i className="fa-solid fa-barcode" />}
            placeholder="Saisissez l'IMEI ou N° de série"
            value={verifyImei}
            onChange={(e) => setVerifyImei(e.target.value)}
            radius="xl"
          />
          {verifyResult && (
            <Paper p="md" radius="md" style={{ background: verifyResult.bg, border: `1px solid ${verifyResult.border}` }} dangerouslySetInnerHTML={{ __html: verifyResult.html }} />
          )}
          <Group>
            <Button flex={1} variant="outline" radius="xl" onClick={() => { setVerifyModalOpen(false); setVerifyResult(null); setVerifyImei(""); }}>
              Annuler
            </Button>
            <Button flex={1.5} radius="xl" loading={verifyLoading} onClick={startVerification} style={{ backgroundColor: "#E8923A" }}>
              <i className="fa-solid fa-magnifying-glass mr-1" /> Vérifier
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        opened={transferModalOpen}
        onClose={() => { setTransferModalOpen(false); setTransferDeviceId(null); setTransferSent(false); setTransferPassword(""); }}
        centered
        radius="xl"
        size="sm"
        padding="xl"
        title={
          <Stack align="center" gap="md">
            <ThemeIcon size={70} radius="xl" variant="light" color="primary">
              <i className="fa-solid fa-arrow-right-arrow-left text-3xl" />
            </ThemeIcon>
            <div>
              <Title order={4} ta="center" ff="Bricolage Grotesque">Transférer l'appareil</Title>
              <Text size="sm" c="dimmed" ta="center" mt={4}>
                Transférez la propriété de cet appareil à un autre utilisateur DocMaster.
              </Text>
            </div>
          </Stack>
        }
      >
        {transferSent ? (
          <Stack align="center" gap="md" py="md">
            <ThemeIcon size={60} radius="xl" variant="light" color="green">
              <i className="fa-solid fa-check text-2xl" />
            </ThemeIcon>
            <Title order={5} ta="center">Demande envoyée !</Title>
            <Text size="sm" c="dimmed" ta="center">Le destinataire recevra un email pour accepter ou refuser le transfert.</Text>
            <Button fullWidth radius="xl" onClick={() => { setTransferModalOpen(false); setTransferDeviceId(null); setTransferPassword(""); }}>
              Fermer
            </Button>
          </Stack>
        ) : (
          <Stack gap="md">
            <TextInput
              label="Email du destinataire"
              leftSection={<i className="fa-solid fa-envelope" />}
              placeholder="email@exemple.com"
              value={transferEmail}
              onChange={(e) => { setTransferEmail(e.target.value); setTransferError(""); }}
              radius="xl"
              error={transferError}
            />
            <PasswordInput
              label="Votre mot de passe"
              leftSection={<i className="fa-solid fa-lock" />}
              placeholder="Confirmez votre mot de passe"
              value={transferPassword}
              onChange={(e) => { setTransferPassword(e.target.value); setTransferError(""); }}
              radius="xl"
            />
            <Group>
              <Button flex={1} variant="outline" radius="xl" onClick={() => { setTransferModalOpen(false); setTransferDeviceId(null); setTransferPassword(""); }}>
                Annuler
              </Button>
              <Button
                flex={1.5}
                radius="xl"
                loading={transferSending}
                style={{ backgroundColor: "#2D5A42" }}
                onClick={async () => {
                  if (!transferEmail.trim()) { setTransferError("Veuillez saisir un email"); return; }
                  if (!transferPassword.trim()) { setTransferError("Veuillez saisir votre mot de passe"); return; }
                  setTransferSending(true);
                  setTransferError("");
                  try {
                    const res = await deviceTransferService.initiate(transferDeviceId!, transferEmail.trim(), transferPassword);
                    if (res.success) {
                      setTransferSent(true);
                      await fetchDevices(false);
                    } else {
                      setTransferError(res.message || "Erreur lors de l'envoi");
                    }
                  } catch (e: any) {
                    setTransferError(e.response?.data?.message || e.message || "Erreur de connexion");
                  } finally {
                    setTransferSending(false);
                  }
                }}
              >
                {transferSending ? "En cours de transfert..." : <><i className="fa-solid fa-paper-plane mr-1" /> Envoyer</>}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        opened={addModalOpen}
        onClose={closeAddModal}
        centered
        radius="xl"
        size="lg"
        scrollAreaComponent={(props) => <div {...props} style={{ ...props.style, maxHeight: "80vh", overflowY: "auto" }} />}
        title={
          <div>
            <Title order={4} ff="Bricolage Grotesque">
              {editingId ? "Modifier l'appareil" : "Ajouter un appareil"}
            </Title>
            <Text size="xs" c="dimmed" mt={2}>Conservez toutes les infos importantes</Text>
          </div>
        }
      >
        <Stack gap="md">
          {/* Type selector */}
          <div>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" tracking="xs" mb="sm">
              <i className="fa-solid fa-shapes text-primary mr-1" /> Type d'appareil
            </Text>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 8 }}>
              {[
                { key: "telephone", icon: "fa-mobile-screen-button", label: "Téléphone" },
                { key: "ordinateur", icon: "fa-laptop", label: "Ordinateur" },
                { key: "tablette", icon: "fa-tablet-screen-button", label: "Tablette" },
                { key: "tv", icon: "fa-tv", label: "TV" },
                { key: "autre", icon: "fa-box", label: "Autre" },
              ].map((ty) => (
                <div key={ty.key} className={`type-option ${selectedType === ty.key ? "selected" : ""}`} onClick={() => setSelectedType(ty.key)}>
                  <div className="type-icon"><i className={`fa-solid ${ty.icon}`} /></div>
                  {ty.label}
                </div>
              ))}
            </div>
          </div>

          <TextInput id="fNom" label={<><i className="fa-solid fa-tag text-primary text-[10px] mr-1" /> Nom de l'appareil <span className="text-red-500">*</span></>} value={fNom} onChange={(e) => setFNom(e.target.value)} placeholder="Ex: iPhone 14 Pro, MacBook Air M2…" radius="xl" />

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label={<><i className="fa-solid fa-building text-primary text-[10px] mr-1" /> Marque</>}
              placeholder="Sélectionner…"
              value={fMarque}
              onChange={(val) => setFMarque(val || "")}
              data={BRAND_OPTIONS}
              searchable
              clearable
              radius="xl"
            />
            <TextInput label={<><i className="fa-solid fa-code-branch text-primary text-[10px] mr-1" /> Modèle</>} value={fModele} onChange={(e) => setFModele(e.target.value)} placeholder="Ex: Galaxy S23…" radius="xl" />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label={<><i className="fa-solid fa-barcode text-primary text-[10px] mr-1" /> N° série / IMEI</>} value={fSerial} onChange={(e) => setFSerial(e.target.value)} placeholder="SN ou IMEI" radius="xl" />
            <TextInput label={<><i className="fa-solid fa-palette text-primary text-[10px] mr-1" /> Couleur</>} value={fCouleur} onChange={(e) => setFCouleur(e.target.value)} placeholder="Ex: Noir, Space Gray…" radius="xl" />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <div>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6}><i className="fa-solid fa-calendar-plus text-primary text-[10px] mr-1" /> Date d'achat</Text>
              <DatePicker value={fDateAchat} onChange={(v) => setFDateAchat(v)} placeholder="jj/mm/aaaa" />
            </div>
            <div>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6}><i className="fa-solid fa-calendar-xmark text-primary text-[10px] mr-1" /> Fin garantie</Text>
              <DatePicker value={fGarantie} onChange={(v) => setFGarantie(v)} placeholder="jj/mm/aaaa" />
            </div>
            <TextInput label={<><i className="fa-solid fa-coins text-primary text-[10px] mr-1" /> Prix</>} type="number" value={fPrix} onChange={(e) => setFPrix(e.target.value)} placeholder="FCFA" min={0} step={500} radius="xl" />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label={<><i className="fa-solid fa-store text-primary text-[10px] mr-1" /> Lieu d'achat</>} value={fLieu} onChange={(e) => setFLieu(e.target.value)} placeholder="Ex: Orange Digital Center…" radius="xl" />
            <Select
              label={<><i className="fa-solid fa-shield-halved text-primary text-[10px] mr-1" /> Assurance</>}
              value={fAssurance}
              onChange={(val) => setFAssurance(val || "")}
              data={[
                { value: "", label: "Non assuré" },
                { value: "oui", label: "Assuré" },
              ]}
              clearable={false}
              radius="xl"
            />
          </SimpleGrid>

          <Textarea label={<><i className="fa-solid fa-comment-dots text-primary text-[10px] mr-1" /> Notes</>} value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="État, accessoires inclus…" minRows={2} radius="xl" />

          {/* Invoice upload */}
          <div>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="sm"><i className="fa-solid fa-file-invoice text-primary mr-1" /> Facture / Ticket</Text>
            <div
              className={`upload-zone ${selectedFiles.length > 0 ? "has-file" : ""}`}
              onClick={() => factureInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("dragover"); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove("dragover"); }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("dragover"); if (e.dataTransfer.files.length) handleFactureFiles(e.dataTransfer.files); }}
            >
              {selectedFiles.length === 0 && (
                <>
                  <i className="fa-solid fa-cloud-arrow-up text-2xl text-[#C4BAB0]" />
                  <div>
                    <Text size="sm" fw={600}>Glisser-déposer ou cliquer</Text>
                    <Text size="xs" c="dimmed">PDF, JPG, PNG · Max 10 Mo</Text>
                  </div>
                </>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>
                {selectedFiles.map((f, i) => (
                  <div key={i} className="file-chip">
                    <i className={`fa-solid ${f.type === "application/pdf" ? "fa-file-pdf" : "fa-image"}`} style={{ fontSize: 10 }} />
                    <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                    <span style={{ cursor: "pointer", opacity: 0.6 }} onClick={() => removeFile(i)}>
                      <i className="fa-solid fa-xmark" style={{ fontSize: 9 }} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <input ref={factureInputRef} type="file" accept=".pdf,image/*" multiple style={{ display: "none" }} onChange={(e) => e.target.files && handleFactureFiles(e.target.files)} />
          </div>

          {/* Photos */}
          <div>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="sm"><i className="fa-solid fa-camera text-primary mr-1" /> Photos</Text>
            <SimpleGrid cols={2} spacing="sm">
              <div style={{ position: "relative" }}>
                <div className="upload-zone" style={{ minHeight: 90 }} onClick={() => photoInputRef.current?.click()}>
                  {photoPreview ? (
                    <img src={photoPreview} style={{ maxHeight: 80, borderRadius: 8, objectFit: "cover" }} alt="" />
                  ) : (
                    <div><i className="fa-solid fa-image text-2xl text-[#C4BAB0]" /><p style={{ fontSize: 11, color: "#9CA3AF" }}>Photo recto</p></div>
                  )}
                </div>
                <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handlePhotoUpload(e, false)} />
              </div>
              <div>
                <div className="upload-zone" style={{ minHeight: 90 }} onClick={() => photoSerialInputRef.current?.click()}>
                  {photoSerialPreview ? (
                    <img src={photoSerialPreview} style={{ maxHeight: 80, borderRadius: 8, objectFit: "cover" }} alt="" />
                  ) : (
                    <div><i className="fa-solid fa-barcode text-2xl text-[#C4BAB0]" /><p style={{ fontSize: 11, color: "#9CA3AF" }}>Photo N° série</p></div>
                  )}
                </div>
                <input ref={photoSerialInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handlePhotoUpload(e, true)} />
              </div>
            </SimpleGrid>
          </div>

          {/* Buttons */}
          <Group>
            <Button flex={1} variant="outline" radius="xl" onClick={closeAddModal}>Annuler</Button>
            <Button flex={2} radius="xl" loading={saving} onClick={handleSave} leftSection={<i className="fa-solid fa-floppy-disk" />} style={{ backgroundColor: "#2D5A42" }}>
              {editingId ? "Modifications" : "Enregistrer"}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Detail Panel */}
      <Modal
        opened={detailOpen}
        onClose={closeDetail}
        radius="xl"
        size="480px"
        centered
        transitionProps={{ transition: "pop" }}
        title={
          <Group justify="space-between" w="100%">
            <Button variant="subtle" size="sm" leftSection={<i className="fa-solid fa-arrow-left" />} onClick={closeDetail}>
              Retour
            </Button>
            <Group gap="xs">
              <Button variant="outline" size="xs" leftSection={<i className="fa-solid fa-pen-to-square" />} onClick={editCurrentDevice}>
                Modifier
              </Button>
              <Button variant="outline" color="red" size="xs" leftSection={<i className="fa-solid fa-trash" />} onClick={deleteCurrentDevice}>
                Supprimer
              </Button>
            </Group>
          </Group>
        }
      >
        {detailDevice && (() => {
          const d = detailDevice;
          const meta = TYPE_META[d.type] || TYPE_META.autre;
          const expWarn = isExpired(d.garantie);
          const files = (d as Device & { files?: Array<Record<string, unknown>> }).files || [];

          return (
            <Stack gap="lg">
              <Paper p="md" radius="xl" style={{ background: `linear-gradient(135deg,${meta.bg},white)`, border: `1px solid ${meta.color}30` }}>
                <Group gap="md">
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0, color: meta.color, boxShadow: `0 4px 14px ${meta.color}20`, overflow: "hidden" }}>
                    {d.photo ? <img src={d.photo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }} alt="" /> : <i className={`fa-solid ${meta.icon}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Text fw={800} ff="Bricolage Grotesque" size="lg">{esc(d.nom)}</Text>
                    <Text size="sm" c="dimmed">{esc(d.marque)} {esc(d.modele)}</Text>
                    <Group gap={5} mt={6}>
                      <Badge size="xs" variant="light" color="yellow">{meta.label}</Badge>
                      {d.assurance === "oui" && <Badge size="xs" variant="light" color="yellow"><i className="fa-solid fa-shield-halved mr-1" /> Assuré</Badge>}
                      {d.garantie && <Badge size="xs" variant="light" color={expWarn ? "red" : "green"}>{expWarn ? "Exp." : "Valide"}</Badge>}
                    </Group>
                  </div>
                </Group>
              </Paper>

              {d.photo && (
                <img src={d.photo} style={{ width: "100%", borderRadius: 14, maxHeight: 300, objectFit: "contain", background: "#F9F6F1", border: "1px solid #EDE7DB" }} alt="" />
              )}

              <div>
                <Text size="10px" fw={700} c="dimmed" tt="uppercase" tracking="widest" mb="sm">Détails</Text>
                {infoRow("fa-barcode", "Numéro de série", d.serial)}
                {infoRow("fa-palette", "Couleur", d.couleur)}
                {infoRow("fa-calendar", "Date d'achat", d.dateAchat ? formatDate(d.dateAchat) : "")}
                {infoRow("fa-calendar-xmark", "Fin garantie", d.garantie ? formatDate(d.garantie) : "")}
                {infoRow("fa-coins", "Prix d'achat", d.prix ? Number(d.prix).toLocaleString("fr") + " FCFA" : "")}
                {infoRow("fa-store", "Lieu d'achat", d.lieu)}
                {infoRow("fa-comment-dots", "Notes", d.notes)}
              </div>

              {files.length > 0 && (
                <div>
                  <Text size="10px" fw={700} c="dimmed" tt="uppercase" tracking="widest" mb="sm">Factures ({files.length})</Text>
                  <Stack gap="sm">
                    {files.map((f: Record<string, unknown>, i: number) => (
                      <img key={i} src={f.data} style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "contain", background: "#F9F6F1", border: "1px solid #EDE7DB", cursor: "pointer" }} onClick={() => window.open(f.data, "_blank")} alt={esc(f.name)} />
                    ))}
                  </Stack>
                </div>
              )}
            </Stack>
          );
        })()}
      </Modal>

      {/* Confirm Lost Modal */}
      <Modal
        opened={confirmLostOpen}
        onClose={closeConfirmLost}
        centered
        radius="xl"
        size="sm"
        padding="xl"
        title={
          <Stack align="center" gap="md">
            <ThemeIcon size={60} radius="xl" variant="light" color="red">
              <i className="fa-solid fa-triangle-exclamation text-2xl" />
            </ThemeIcon>
            <div>
              <Title order={4} ta="center" ff="Bricolage Grotesque">
                {confirmFound ? "Confirmer la trouvaille ?" : "Signaler un problème"}
              </Title>
              <Text size="sm" c="dimmed" ta="center" mt={4}>
                {confirmFound ? "Marquer cet appareil comme sécurisé ?" : "Voulez-vous déclarer cet appareil comme perdu ou volé ?"}
              </Text>
            </div>
          </Stack>
        }
      >
        <Paper bg="orange.0" bds="1px solid" bdcolor="orange.3" p="md" radius="md">
          <Stack gap="md">
            {!confirmFound && (
              <Select
                label="Type de signalement"
                value={reportType}
                onChange={(val) => val && setReportType(val)}
                data={[
                  { value: "LOST", label: "Perdu (Oubli, perte)" },
                  { value: "STOLEN", label: "Volé (Vol avec agression ou effraction)" },
                ]}
                radius="xl"
              />
            )}
            <div>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={8}>Confirmer avec votre mot de passe</Text>
              <PasswordInput
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(false); }}
                leftSection={<i className="fa-solid fa-lock" />}
                radius="xl"
              />
              {passwordError && (
                <Text size="xs" c="red" mt={4} fw={600}>
                  <i className="fa-solid fa-circle-exclamation mr-1" /> Mot de passe incorrect ou trop court.
                </Text>
              )}
            </div>
            <Button
              fullWidth
              radius="xl"
              size="md"
              loading={confirming}
              color={confirmFound ? "green" : "red"}
              onClick={confirmFound ? validateAndSubmitFound : validateAndSubmitLost}
            >
              {confirmFound ? "Confirmer le retour" : "Confirmer la déclaration"}
            </Button>
          </Stack>
        </Paper>
        <Button fullWidth variant="outline" radius="xl" mt="md" onClick={closeConfirmLost}>
          Annuler
        </Button>
      </Modal>

      {/* Success Modal */}
      <Modal
        opened={successOpen}
        onClose={() => setSuccessOpen(false)}
        centered
        radius="xl"
        size="sm"
        padding="xl"
        title={
          <Stack align="center" gap="md">
            <ThemeIcon size={70} radius="xl" variant="light" color="green">
              <i className="fa-solid fa-check text-3xl" />
            </ThemeIcon>
            <div>
              <Title order={4} ta="center" ff="Bricolage Grotesque">{successTitle}</Title>
              <Text size="sm" c="dimmed" ta="center" mt={4}>
                {successTitle.includes("retrouvé")
                  ? "L'appareil a été marqué comme sécurisé dans votre inventaire."
                  : "L'appareil a été marqué comme perdu dans votre inventaire. Nous vous tiendrons informé."}
              </Text>
            </div>
          </Stack>
        }
      >
        <Button fullWidth radius="xl" size="md" onClick={() => setSuccessOpen(false)} style={{ backgroundColor: "#2D5A42" }}>
          D'accord
        </Button>
      </Modal>
    </div>
  );
}
