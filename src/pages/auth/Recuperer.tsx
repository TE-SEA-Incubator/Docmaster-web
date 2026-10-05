import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader, Button, Paper, Badge, Alert, Group, Text } from "@mantine/core";
import { declarationsService } from "../../services/declarationsService";
import type { Declaration } from "../../types/api";

import PaymentModal from "../../components/modals/PaymentModal";
import PollingModal from "../../components/modals/PollingModal";
import ActionSuccessModal from "../../components/modals/ActionSuccessModal";
import apiClient from "../../services/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useI18n } from "../../context/I18nContext";
import { useTopbar } from "../../hooks/useTopbar";

const POLL_INTERVAL = 5000;
const FALLBACK_LAT = 3.8480;
const FALLBACK_LNG = 11.5021;

export default function Recuperer() {
  const { t } = useI18n();
  useTopbar(t("recuperer_title"), [{ label: t("recuperer_breadcrumb_search"), href: "/rechercher" }, { label: t("recuperer_breadcrumb_recovery") }]);
  const stepLabels = [
    t("recuperer_step_declared"),
    t("recuperer_step_found"),
    t("recuperer_step_payment"),
    t("recuperer_step_withdrawal"),
  ];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("id");
  const foundMatchId = searchParams.get("found");
  const conversationHref = `/messagerie?doc=${docId}`;

  const [doc, setDoc] = useState<Declaration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [step, setStep] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payProcessing, setPayProcessing] = useState(false);
  const [payError, setPayError] = useState("");
  const [pickupCode, setPickupCode] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);
  const [pollingElapsed, setPollingElapsed] = useState(0);
  const [nokashTxId, setNokashTxId] = useState<string | null>(null);
  const [isManualChecking, setIsManualChecking] = useState(false);
  const recoveryPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ownerCoords, setOwnerCoords] = useState<{ lat: number; lng: number } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routePolyRef = useRef<L.Polyline | null>(null);
  const ownerMarkerRef = useRef<L.Marker | null>(null);
  const finderMarkerRef = useRef<L.Marker | null>(null);
  const mapReadyRef = useRef(false);
  const mapFullscreenRef = useRef(false);

  // Le code est connu dès le paiement : l'étape PICKUP reste en cours tant que le document n'est pas remis.
  const displayStep = step >= 4 ? 4 : step >= 3 ? 3 : 2;

  const paid = step >= 3;
  const collected = step >= 4;

  // ── Load declaration ──────────────────────────────────────────────────
  useEffect(() => {
    if (!docId) { setLoading(false); return; }
    setLoading(true);
    declarationsService.getRenderContext(docId, foundMatchId || undefined)
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          console.log("DEBUG DOC DATA:", d); // Inspecter la structure ici
          setDoc(d);
          const ps = (d.payment_status || "").toUpperCase();
          const ds = (d.status || "").toUpperCase();
          setStep(
            ds === "RETURNED" ? 4
            : ps === "PAID" || ds === "PAID" || d.claim?.status === "PAID" || d.claim?.status === "VALIDATED" ? 3
            : 1
          );
          if (ps === "PAID" || ds === "PAID" || ds === "RETURNED" || d.claim?.status === "PAID" || d.claim?.status === "VALIDATED") {
            setPickupCode(d.claim?.verification_code || d.reference || "");
          }
        } else {
          setError(t("recuperer_not_found"));
        }
      })
      .catch((e: any) => {
        setError(e.response?.data?.message || e.response?.data?.error || t("recuperer_load_error"));
      })
      .finally(() => setLoading(false));
  }, [docId, foundMatchId, t]);

  // ── Payment polling ───────────────────────────────────────────────────
  useEffect(() => {
    if (step >= 3 || !docId || pickupCode) return;
    const interval = setInterval(async () => {
      try {
        const res = await declarationsService.getRenderContext(docId, foundMatchId || undefined);
        if (res.success && res.data) {
          const d = res.data;
          const ps = (d.payment_status || "").toUpperCase();
          const ds = (d.status || "").toUpperCase();
          if (ps === "PAID" || ds === "PAID" || d.claim?.status === "PAID" || d.claim?.status === "VALIDATED") {
            setStep(3);
            setPickupCode(d.claim?.verification_code || d.reference || "");
            setShowPaymentModal(false);
            setDoc(d);
            clearInterval(interval);
          }
        }
      } catch {
        // silent
      }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [step, docId, foundMatchId, pickupCode]);

  // ── Geolocation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!paid || !doc) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setOwnerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setOwnerCoords({ lat: FALLBACK_LAT, lng: FALLBACK_LNG }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setOwnerCoords({ lat: FALLBACK_LAT, lng: FALLBACK_LNG });
    }
  }, [paid, doc]);

  // ── Map initialization ───────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (mapReadyRef.current || !mapContainerRef.current || !doc) return;
    mapReadyRef.current = true;

    const finderLat = (doc as any)?.counterPartDeclaration?.found_location?.lat || FALLBACK_LAT;
    const finderLng = (doc as any)?.counterPartDeclaration?.found_location?.long || FALLBACK_LNG;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([finderLat, finderLng], 13);

    L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      maxZoom: 20,
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    mapInstanceRef.current = map;
    return map;
  }, [doc]);

  // ── Map markers & routing ────────────────────────────────────────────
  useEffect(() => {
    if (!paid || !doc || !mapContainerRef.current) return;
    const map = initMap();
    if (!map) return;

    const finderLat = (doc as any)?.counterPartDeclaration?.found_location?.lat || FALLBACK_LAT;
    const finderLng = (doc as any)?.counterPartDeclaration?.found_location?.long || FALLBACK_LNG;

    const finderIcon = L.divIcon({
      className: "",
      html: `<div style="width:36px;height:36px;background:#ef4444;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.35)"></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    const finderMarker = L.marker([finderLat, finderLng], { icon: finderIcon })
      .addTo(map)
      .bindPopup(`<b>${(doc as any)?.counterPart?.prenom || ""} ${(doc as any)?.counterPart?.nom || "Trouveur"}</b><br/>📍 ${(doc as any)?.counterPartDeclaration?.found_location?.city || doc.ville || ""}`);
    finderMarkerRef.current = finderMarker;

    const drawRoute = (ownerLat: number, ownerLng: number) => {
      const ownerIcon = L.divIcon({
        className: "owner-marker-pulse",
        html: `<div style="width:20px;height:20px;background:#1d4ed8;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(29,78,216,.25)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      if (ownerMarkerRef.current) map.removeLayer(ownerMarkerRef.current);
      const ownerMarker = L.marker([ownerLat, ownerLng], { icon: ownerIcon })
        .addTo(map)
        .bindPopup("📍 Votre position");
      ownerMarkerRef.current = ownerMarker;

      const bounds = L.latLngBounds([[ownerLat, ownerLng], [finderLat, finderLng]]);
      map.fitBounds(bounds, { padding: [40, 40] });

      fetch(
        `https://router.project-osrm.org/route/v1/driving/${ownerLng},${ownerLat};${finderLng},${finderLat}?geometries=geojson&overview=full`
      )
        .then((r) => r.json())
        .then((data) => {
          if (!data.routes?.[0]) return;
          const route = data.routes[0];

          if (routePolyRef.current) map.removeLayer(routePolyRef.current);
          routePolyRef.current = L.geoJSON(route.geometry, {
            style: {
              color: "#1d4ed8",
              weight: 5,
              opacity: 0.85,
              lineJoin: "round",
              lineCap: "round",
            },
          }).addTo(map);

          const mins = Math.round(route.duration / 60);
          const km = (route.distance / 1000).toFixed(1);
          const etaEl = document.getElementById("eta-time");
          const distEl = document.getElementById("eta-dist");
          const badge = document.getElementById("eta-badge");
          const statusEl = document.getElementById("map-status-text");
          if (etaEl) etaEl.textContent = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}min`;
          if (distEl) distEl.textContent = `${km} km`;
          if (badge) badge.classList.remove("hidden");
          if (statusEl) statusEl.textContent = `${km} km • ${mins} min en voiture`;
        })
        .catch(() => {
          const statusEl = document.getElementById("map-status-text");
          if (statusEl) statusEl.textContent = "Itinéraire calculé";
        });
    };

    if (ownerCoords) {
      drawRoute(ownerCoords.lat, ownerCoords.lng);
    } else if (navigator.geolocation) {
      const statusEl = document.getElementById("map-status-text");
      if (statusEl) statusEl.textContent = "Localisation en cours...";
      navigator.geolocation.getCurrentPosition(
        (pos) => drawRoute(pos.coords.latitude, pos.coords.longitude),
        () => drawRoute(FALLBACK_LAT, FALLBACK_LNG)
      );
    } else {
      drawRoute(FALLBACK_LAT, FALLBACK_LNG);
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      mapReadyRef.current = false;
    };
  }, [paid, doc, ownerCoords, initMap]);

  // ── Map fullscreen ───────────────────────────────────────────────────
  const toggleMapFullscreen = () => {
    const section = document.getElementById("finder-map-section");
    if (!section) return;
    mapFullscreenRef.current = !mapFullscreenRef.current;
    section.classList.toggle("map-fullscreen");
    document.body.style.overflow = mapFullscreenRef.current ? "hidden" : "";
    setTimeout(() => mapInstanceRef.current?.invalidateSize(), 150);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mapFullscreenRef.current) toggleMapFullscreen();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Payment handler ──────────────────────────────────────────────────
  const startRecoveryPolling = (txId?: string | null) => {
    if (recoveryPollingRef.current) clearInterval(recoveryPollingRef.current);
    const activeTxId = txId || nokashTxId;
    const startedAt = Date.now();

    recoveryPollingRef.current = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setPollingElapsed(elapsed);

      try {
        if (activeTxId) {
          const checkRes = await apiClient.get(`payments/check/${activeTxId}`);
          const checkData = checkRes.data?.data;
          if (
            checkRes.data?.success &&
            (checkData?.status === "SUCCESS" ||
              checkData?.currentStatus === "SUCCESS" ||
              (checkData?.updated && checkData?.status !== "FAILED"))
          ) {
            if (recoveryPollingRef.current) clearInterval(recoveryPollingRef.current);
            setPollingStatus(null);
            setStep(3);
            const docRes = await declarationsService.getRenderContext(docId!, foundMatchId || undefined);
            if (docRes.success && docRes.data) {
              setDoc(docRes.data);
              setPickupCode(docRes.data.claim?.verification_code || docRes.data.reference || "");
            }
            setShowSuccessModal(true);
            return;
          }
        }

        const res = await declarationsService.getRenderContext(docId!, foundMatchId || undefined);
        if (res.success && res.data) {
          const d = res.data;
          const ps = (d.payment_status || "").toUpperCase();
          const ds = (d.status || "").toUpperCase();
          if (ps === "PAID" || ds === "PAID" || d.claim?.status === "PAID" || d.claim?.status === "VALIDATED") {
            if (recoveryPollingRef.current) clearInterval(recoveryPollingRef.current);
            setPollingStatus(null);
            setStep(3);
            setDoc(d);
            setPickupCode(d.claim?.verification_code || d.reference || "");
            setShowSuccessModal(true);
            return;
          }
        }

        if (elapsed > 120) {
          setPollingStatus("Le paiement est en cours de traitement. Vous recevrez une confirmation sous peu.");
        } else if (elapsed > 60) {
          setPollingStatus("Confirmation en cours auprès de votre opérateur... Cette opération peut prendre jusqu'à 2 minutes.");
        } else {
          setPollingStatus("Veuillez valider le paiement sur votre téléphone...");
        }
      } catch (e) {
        console.error("[Recuperer] Polling error:", e);
      }
    }, 5000);

    setTimeout(() => {
      if (recoveryPollingRef.current) clearInterval(recoveryPollingRef.current);
    }, 300000);
  };

  const handleManualCheck = async () => {
    if (!nokashTxId) return;
    setIsManualChecking(true);
    try {
      const res = await apiClient.get(`payments/check/${nokashTxId}`);
      const checkData = res.data?.data;
      if (
        res.data?.success &&
        (checkData?.updated || checkData?.status === "SUCCESS" || checkData?.currentStatus === "SUCCESS")
      ) {
        if (recoveryPollingRef.current) clearInterval(recoveryPollingRef.current);
        setPollingStatus(null);
        setStep(3);
        const docRes = await declarationsService.getRenderContext(docId!, foundMatchId || undefined);
        if (docRes.success && docRes.data) {
          setDoc(docRes.data);
          setPickupCode(docRes.data.claim?.verification_code || docRes.data.reference || "");
        }
        setShowSuccessModal(true);
      } else if (checkData?.status || checkData?.currentStatus) {
        setPollingStatus(`Statut actuel: ${checkData.status || checkData.currentStatus}. En attente de validation sur votre téléphone...`);
      }
    } catch (e) {
      console.error("[Recuperer] Manual check error:", e);
    } finally {
      setIsManualChecking(false);
    }
  };

  const handlePay = async (method: "orange" | "mtn" | "moov" | "points", phone: string) => {
    if (!docId) return;
    setPayProcessing(true);
    setPayError("");
    try {
      const pm = method === "orange" ? "ORANGE_MONEY" : method === "mtn" ? "MTN_MOMO" : method === "moov" ? "MOOV_MONEY" : "POINTS";
      const res = await declarationsService.payRecoveryFee({ docId, paymentMethod: pm, phone });
      setPayProcessing(false);

      if (res.success) {
        setShowPaymentModal(false);
        if (pm === "POINTS" || (res as any).data?.paid) {
          setStep(3);
          setPickupCode((res as any).data?.verification_code || doc?.reference || "");
          setShowSuccessModal(true);
        } else {
          const txId = (res as any).data?.transactionId || (res as any).transactionId || null;
          setNokashTxId(txId);
          setPollingStatus("Veuillez valider le paiement sur votre téléphone");
          setPollingElapsed(0);
          startRecoveryPolling(txId);
        }
      } else {
        setPayError(res.message || t("recuperer_pay_error"));
      }
    } catch {
      setPayProcessing(false);
      setPayError(t("recuperer_network_error"));
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────
  function getCost(d: Declaration | null): number {
    const candidates = [
      (d as any)?.docTypeInfo?.prix_retrouvaille,
      (d as any)?.docTypeInfo?.prix_recuperation,
      (d as any)?.recompense_montant,
    ];
    for (const raw of candidates) {
      if (raw == null) continue;
      const num = typeof raw === "number" ? raw : parseInt(raw);
      // 0 est un prix explicite (« récupération gratuite »), pas une absence de prix : le serveur
      // facture Number(prix_retrouvaille), l'affichage doit suivre la même valeur.
      if (!isNaN(num) && num >= 0) return num;
    }
    return 5000;
  }

  function formatCost(d: Declaration | null): string {
    return `${getCost(d).toLocaleString("fr-FR")} FCFA`;
  }

  function formatDate(d: string | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function getImageUrl(path: string | undefined) {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("data:")) return path;
    const base = import.meta.env.VITE_API_URL || "";
    // If base is empty, assume relative path /api/
    const baseUrl = base ? base.replace(/\/+$/, "") + "/" : "/api/";
    return baseUrl + "uploads/" + path.replace(/^\/+/, "");
  }

  function getFinderName(): string {
    const cp = (doc as any)?.counterPart;
    if (cp) return `${cp.prenom || ""} ${cp.nom || ""}`.trim();
    return (doc as any)?.owner_name || "Trouveur";
  }

  function getFinderPhone(): string {
    return (doc as any)?.counterPart?.telephone || (doc as any)?.telephone_owner || "+237671234567";
  }

  function getFinderCity(): string {
    return (doc as any)?.counterPartDeclaration?.found_location?.city || doc?.ville || "Yaoundé";
  }

  function getFinderLat(): number {
    return (doc as any)?.counterPartDeclaration?.found_location?.lat || FALLBACK_LAT;
  }

  function getFinderLng(): number {
    return (doc as any)?.counterPartDeclaration?.found_location?.long || FALLBACK_LNG;
  }

  function getDocTypeName(): string {
    return doc?.docTypeInfo?.nom || doc?.document_type || doc?.doc_type || "Document";
  }

  // ── Step circle renderer ─────────────────────────────────────────────
  function renderSteps() {
    return stepLabels.map((label, i) => {
      const idx = i;
      const isDone = idx < displayStep;
      const isActive = idx === displayStep;

      let circleCls = "w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all duration-300";
      let labelCls = "text-[11px] font-bold uppercase tracking-tighter mt-1.5 transition-colors duration-300";
      let lineCls = "flex-1 h-[2px] mx-2 mb-6 transition-colors duration-300";

      if (isDone) {
        circleCls += " bg-green-500 text-white shadow-lg shadow-green-100";
        labelCls += " text-green-600";
        lineCls += " bg-green-500";
      } else if (isActive) {
        circleCls += " bg-primary text-white border-4 border-white";
        labelCls += " text-primary";
        lineCls += " bg-primary";
      } else {
        circleCls += " bg-surface2 border-2 border-borderMain text-textMuted";
        labelCls += " text-textMuted";
        lineCls += " bg-borderMain";
      }

      return (
        <div key={idx} className="flex flex-col items-center flex-1">
          <div className="flex items-center w-full">
            {idx > 0 && <div className={lineCls} />}
            <div className={circleCls}>
              {isDone ? (
                <i className="fa-solid fa-check text-[10px]" />
              ) : isActive && idx === 3 ? (
                <i className="fa-solid fa-key text-sm" />
              ) : (
                <span>{idx + 1}</span>
              )}
            </div>
            {idx < stepLabels.length - 1 && <div className={lineCls} />}
          </div>
          <span className={labelCls}>{label}</span>
        </div>
      );
    });
  }

  // ── Render: No docId ─────────────────────────────────────────────────
  if (!docId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-borderMain p-8 max-w-md w-full text-center shadow-sm">
            <div className="flex justify-center mb-4"><i className="fa-solid fa-file-circle-question text-textMuted text-4xl" /></div>
            <h1 className="font-bricolage text-xl font-black text-textMain mb-2">
              {t("recuperer_not_found_title")}
            </h1>
            <p className="text-textMuted text-[13px] mb-6">{t("recuperer_not_found")}</p>
            <Link
              to="/rechercher"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-[13px] hover:bg-primary-dark transition-all"
            >
              <i className="fa-solid fa-magnifying-glass text-[11px]" />{" "}
              {t("recuperer_breadcrumb_search")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-11 h-11 rounded-full border-[3px] border-black/10 border-t-primary animate-spin" />
            <p className="text-textMuted text-[13px] font-medium">{t("recuperer_title")}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Error ────────────────────────────────────────────────────
  if (error || !doc) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-borderMain p-8 max-w-md w-full text-center shadow-sm">
            <div className="flex justify-center mb-4"><i className="fa-solid fa-circle-exclamation text-red-400 text-4xl" /></div>
            <h1 className="font-bricolage text-xl font-black text-textMain mb-2">
              {t("recuperer_not_found_title")}
            </h1>
            <p className="text-textMuted text-[13px] mb-6">{error || t("recuperer_not_found")}</p>
            <Link
              to="/rechercher"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-[13px] hover:bg-primary-dark transition-all"
            >
              <i className="fa-solid fa-arrow-left text-[11px]" />{" "}
              {t("recuperer_breadcrumb_search")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Main ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      <div className="flex-1 overflow-y-auto bg-bgMain px-4 sm:px-6 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* ═══ Step Tracker ═══ */}
          <Paper radius="xl" withBorder p="lg">
            <div className="flex items-center justify-between min-w-0 gap-0">
              {renderSteps()}
            </div>
          </Paper>

          {/* ═══ Main Grid ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* ── Left Column ── */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {/* Document Card */}
              <Paper radius="xl" withBorder style={{overflow: 'hidden'}}>
                <div className="p-6 border-b border-borderMain flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bricolage text-xl font-black text-textMain tracking-tighter flex items-center gap-3">
                      <i className="fa-solid fa-id-card text-primary text-xl" />
                      {getDocTypeName()}
                    </h3>
                    <p className="text-[13px] text-textMuted mt-1">
                      {doc.type === "found"
                        ? `Trouvé le ${formatDate(doc.date_trouvee || doc.created_at)}`
                        : `Perdu le ${formatDate(doc.date_perte)}`}
                    </p>
                  </div>
                  <Badge color="green" variant="light" radius="xl" size="sm">
                    {doc.status === "MATCHED" || doc.status === "RESOLVED" || doc.status === "RETURNED"
                      ? "Matching Certifié"
                      : doc.status === "paid" || doc.status === "PAID"
                      ? "Paiement confirmé"
                      : "En attente"}
                  </Badge>
                </div>

                <div className="p-6 md:p-10 bg-surface2/20 flex items-center justify-center relative min-h-[260px]">
                  <div className="relative group w-full max-w-lg">
                    {(doc.photo_recto || doc.photo_verso || (doc as any).counterPartPhotoRecto || (doc as any).counterPartPhotoVerso) ? (
                      <img
                        src={getImageUrl(doc.photo_recto || doc.photo_verso || (doc as any).counterPartPhotoRecto || (doc as any).counterPartPhotoVerso)}
                        className="w-full h-auto max-h-[320px] object-contain shadow-2xl rounded-2xl border-4 border-white transition-transform duration-500 group-hover:scale-[1.02]"
                        alt="Document"
                      />
                    ) : (
                      <div className="w-full h-56 bg-gradient-to-br from-green-dark/5 to-green-mid/5 rounded-2xl flex items-center justify-center border-2 border-dashed border-borderMain">
                        <div className="text-center">
                          <i className="fa-solid fa-id-card text-5xl text-textMuted/30" />
                          <p className="text-[13px] text-textMuted mt-2">
                            {t("Aucune photo disponible")}
                          </p>
                        </div>
                      </div>
                    )}
                    {paid && doc.photo_verso && (
                      <button
                        onClick={() => window.open(getImageUrl(doc.photo_verso), "_blank")}
                        className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-lg px-3 py-1.5 text-[11px] font-bold text-textMain hover:bg-white transition-all shadow-sm border border-borderMain"
                      >
                        <i className="fa-solid fa-rotate mr-1.5" />
                        {t("Verso")}
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-6 py-5 bg-white border-t border-borderMain">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DetailItem label={t("recuperer_label_type")} value={getDocTypeName()} />
                    <DetailItem
                      label={t("recuperer_label_number")}
                      value={doc.numero_document || doc.document_number || "—"}
                    />
                    <DetailItem
                      label={t("recuperer_label_name")}
                      value={doc.nom_complet || doc.owner_name || "—"}
                    />
                    <DetailItem
                      label={t("recuperer_label_loss_date")}
                      value={formatDate(doc.date_perte)}
                    />
                    <DetailItem
                      label={t("recuperer_label_location")}
                      value={doc.lieu_perte || doc.ville || "—"}
                    />
                    <DetailItem label={t("recuperer_label_fee")} value={formatCost(doc)} />
                  </div>
                </div>
              </Paper>

              {/* Finder Info Card */}
              <Paper
                radius="xl"
                withBorder
                p="lg"
                id="finder-info-card"
                className={paid ? '' : 'opacity-80'}
                style={{transition: 'all 0.7s'}}
              >
                <h4 className="text-[11px] font-bold text-textMuted uppercase tracking-widest mb-6">
                  {t("Informations du bienfaiteur")}
                </h4>
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-14 h-14 rounded-full bg-surface2 border border-borderMain flex items-center justify-center font-bricolage text-xl font-bold text-textMain">
                    {getFinderName()
                      .split(" ")
                      .map((s) => s[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "??"}
                  </div>
                  <div
                    className={`transition-all duration-700 ${
                      paid ? "" : "blur-sm select-none"
                    }`}
                  >
                    <p className="text-[16px] font-bold text-green-dark">
                      {paid ? getFinderName() : "••••••••••"}
                    </p>
                    <div className="flex items-center gap-1.5 text-textMuted text-[12px] mt-0.5">
                      <i className="fa-solid fa-star text-primary text-[10px]" />
                      <span>4.9</span>
                      <span className="text-textMuted">(15 remises)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-surface2 rounded-xl border border-borderMain flex items-center justify-between">
                    <span className="text-[12px] text-textMuted flex items-center gap-2">
                      <i className="fa-solid fa-phone text-primary text-[10px]" />
                      Contact direct
                    </span>
                    <div
                      className={`transition-all duration-700 ${
                        paid ? "" : "blur-sm select-none"
                      }`}
                    >
                      <span className="font-bold text-textMain text-[13px]">
                        {paid ? getFinderPhone() : "+237 ••• •• ••"}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-surface2 rounded-xl border border-borderMain flex items-center justify-between">
                    <span className="text-[12px] text-textMuted flex items-center gap-2">
                      <i className="fa-solid fa-location-dot text-primary text-[10px]" />
                      Localisation
                    </span>
                    <div
                      className={`transition-all duration-700 ${
                        paid ? "" : "blur-sm select-none"
                      }`}
                    >
                      <span className="font-bold text-textMain text-[13px]">
                        {paid ? getFinderCity() : "••••••••"}
                      </span>
                    </div>
                  </div>
                </div>

                {!paid && (
                  <div className="mt-4">
                    <Alert color="orange" variant="light" radius="md" icon={<i className="fa-solid fa-lock" />}>
                      <p className="text-[12px] font-bold">{t('recuperer_owner')}</p>
                      <p className="text-[11px] mt-0.5">{t('recuperer_map_hint_unpaid')}</p>
                    </Alert>
                  </div>
                )}

                {paid && (
                  <div className="mt-5">
                    <Alert color="green" variant="light" radius="md" icon={<i className="fa-solid fa-shield-halved" />}>
                      <p className="text-[14px] font-bold text-textMain mb-1">{t('Sécurité DocMaster')}</p>
                      <p className="text-[12px] text-textMuted leading-relaxed">
                        {t("Le bienfaiteur ne recevra ses gains qu'une fois que vous aurez récupéré physiquement le document et fourni le code de retrait en agence.")}
                      </p>
                    </Alert>
                  </div>
                )}
              </Paper>

              {/* Map Section */}
              <Paper radius="xl" withBorder style={{overflow: 'hidden'}} id="finder-map-section">
                <div className="px-6 py-4 border-b border-borderMain flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-route text-textMuted" />
                    <div>
                      <p className="text-[13px] font-bold text-textMain">
                        {t("Itinéraire vers le trouveur")}
                      </p>
                      <p className="text-[11px] text-textMuted" id="map-status-text">
                        {paid
                          ? t("Calcul de l'itinéraire...")
                          : t("recuperer_map_hint_unpaid")}
                      </p>
                    </div>
                  </div>
                  {paid && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-green-600 text-[11px] font-bold">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        En direct
                      </div>
                      <button
                        onClick={toggleMapFullscreen}
                        className="w-9 h-9 rounded-xl bg-surface2 border border-borderMain flex items-center justify-center text-textMuted hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                        title="Plein écran"
                      >
                        <i className="fa-solid fa-expand text-[13px]" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div
                    ref={mapContainerRef}
                    className="w-full"
                    style={{ height: paid ? "420px" : "260px" }}
                  />
                  {!paid && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-10">
                      <div className="text-center max-w-xs">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-borderMain shadow-xl flex items-center justify-center mx-auto mb-3">
                          <i className="fa-solid fa-lock text-primary text-2xl" />
                        </div>
                        <p className="text-[14px] font-bold text-textMain mb-1">
                          Carte verrouillée
                        </p>
                        <p className="text-[11px] text-textMuted mb-4">
                          {t("recuperer_map_hint_unpaid")}
                        </p>
                        <button
                          onClick={() => setShowPaymentModal(true)}
                          className="px-6 py-3 bg-primary text-white rounded-xl text-[13px] font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                        >
                          <i className="fa-solid fa-lock-open mr-1.5" />
                          Payer — {formatCost(doc)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ETA Badge */}
                <div
                  id="eta-badge"
                  className="hidden border-t border-borderMain px-6 py-4 flex items-center gap-6 bg-white"
                >
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-car text-textMuted text-sm" />
                    <div>
                      <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider">
                        Temps estimé
                      </p>
                      <p className="text-[15px] font-black text-textMain" id="eta-time">
                        —
                      </p>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-borderMain" />
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-road text-textMuted text-sm" />
                    <div>
                      <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider">
                        Distance
                      </p>
                      <p className="text-[15px] font-black text-textMain" id="eta-dist">
                        —
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                {paid && (
                  <div className="px-6 py-4 border-t border-borderMain flex items-center gap-3 bg-white">
                    <Button
                      component="a"
                      href={`https://wa.me/${getFinderPhone().replace(/\D/g, "")}`}
                      target="_blank"
                      color="green"
                      radius="xl"
                      size="sm"
                      leftSection={<i className="fa-brands fa-whatsapp" />}
                    >
                      WhatsApp
                    </Button>
                    <Button
                      component="a"
                      href={`tel:${getFinderPhone()}`}
                      color="blue"
                      radius="xl"
                      size="sm"
                      leftSection={<i className="fa-solid fa-phone" />}
                    >
                      Appeler
                    </Button>
                    <Button
                      component="a"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${getFinderLat()},${getFinderLng()}`}
                      target="_blank"
                      style={{backgroundColor: '#2D5A42'}}
                      radius="xl"
                      size="sm"
                      leftSection={<i className="fa-solid fa-diamond-turn-right" />}
                    >
                      Naviguer
                    </Button>
                  </div>
                )}
              </Paper>
            </div>

            {/* ── Right Column: Action Panel ── */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              {/* Payment Card */}
              <Paper radius="xl" withBorder p="xl" id="ownerActionPanel" style={{position: 'relative', overflow: 'hidden'}} className="space-y-6">

                {pickupCode ? (
                  /* ── Success Panel ── */
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{backgroundColor: '#F5A64B', color: 'white'}}>
                      <i className="fa-solid fa-key text-2xl" />
                    </div>
                    <div>
                      <h5 className="font-bricolage text-2xl font-black text-textMain mb-2">
                        {t("Code de Retrait")}
                      </h5>
                      <p className="text-[13px] text-textMuted">
                        {collected ? t("Montrez ce code au recuperateur") : t("messagerie_code_hint")}
                      </p>
                    </div>
                    <Paper
                      radius="xl"
                      p="lg"
                      style={{backgroundColor: '#F4EFE6', cursor: 'pointer'}}
                      className="text-center hover:opacity-90 transition-opacity"
                      onClick={() => {
                        navigator.clipboard.writeText(pickupCode);
                      }}
                    >
                      <p className="font-bricolage text-4xl font-black text-primary tracking-tighter">
                        {pickupCode}
                      </p>
                      <div className="inline-flex items-center gap-2 mt-4 text-[10px] text-textMuted font-bold uppercase tracking-widest hover:text-primary transition-colors">
                        <i className="fa-solid fa-copy" />
                        {t("Cliquez pour copier")}
                      </div>
                    </Paper>
                    <Alert color="orange" variant="light" radius="md" icon={<i className="fa-solid fa-triangle-exclamation" />}>
                      <p className="text-[12px] font-semibold leading-relaxed">
                        {t("messagerie_code_warning")}
                      </p>
                    </Alert>
                    <Button
                      component={Link}
                      to={conversationHref}
                      fullWidth
                      radius="xl"
                      leftSection={<i className="fa-solid fa-comments" />}
                      style={{backgroundColor: '#2D5A42'}}
                    >
                      {t("messagerie_cta_from_payment")}
                    </Button>
                    <Button component={Link} to="/dashboard" fullWidth radius="xl" variant="default">
                      {t("Retourner au dashboard")}
                    </Button>
                  </div>
                ) : (
                  /* ── Payment Panel ── */
                  <>
                    <div className="text-center">
                      <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-2">
                        {t("recuperer_label_fee")}
                      </p>
                      <div className="flex items-baseline justify-center gap-1.5 mb-2">
                        <span className="font-bricolage text-4xl font-black text-textMain tracking-tighter">
                          {getCost(doc).toLocaleString("fr-FR")}
                        </span>
                        <span className="text-lg font-bold text-textMuted">FCFA</span>
                      </div>
                      <Badge color="green" variant="light" radius="xl" size="sm">
                        Service + Récompense inclus
                      </Badge>
                    </div>

                    {paid ? (
                      /* Already paid - waiting */
                      <Alert color="green" variant="light" radius="md" icon={<i className="fa-solid fa-check" />}>
                        <p className="text-[14px] font-bold">{t('Paiement confirmé')}</p>
                        <p className="text-[12px] mt-1">{t('Veuillez patienter pendant le traitement...')}</p>
                      </Alert>
                    ) : (
                      /* Not paid - show pay button */
                      <div className="space-y-4 pt-2">
                        <Button
                          onClick={() => setShowPaymentModal(true)}
                          fullWidth
                          size="xl"
                          radius="xl"
                          color="green"
                          styles={{
                            root: { 
                              height: 'auto',
                              padding: '20px',
                              fontFamily: 'Bricolage Grotesque, sans-serif',
                              fontWeight: 800,
                              fontSize: '18px',
                            }
                          }}
                          rightSection={<i className="fa-solid fa-arrow-right text-sm" />}
                        >
                          {t("Payer & Récupérer")}
                        </Button>
                        <p className="text-[11px] text-textMuted text-center leading-relaxed">
                          {t("Veuillez vérifier les informations du document avant de confirmer le paiement. Tout paiement est irréversible.")}
                        </p>
                      </div>
                    )}

                    <div className="pt-6 border-t border-borderMain">
                      <div className="flex items-center justify-center gap-4 grayscale opacity-60">
                        <img
                          src="/assets/images/orange_money.jpg"
                          className="h-6 rounded shadow-sm"
                          alt="Orange Money"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <img
                          src="/assets/images/paypoint (2).png"
                          className="h-6 rounded shadow-sm"
                          alt="PayPoint"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-center text-textMuted font-bold mt-3 uppercase tracking-tighter">
                        Transaction sécurisée SSL
                      </p>
                    </div>
                  </>
                )}
              </Paper>

              {/* Support Card */}
              <Paper radius="xl" withBorder p="lg">
                <p className="text-[11px] font-bold text-textMuted uppercase mb-3 text-center">
                  {t("Besoin d'assistance ?")}
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="light"
                    color="gray"
                    fullWidth
                    radius="md"
                    styles={{ root: { padding: '12px', fontSize: '12px', fontWeight: 700 } }}
                  >
                    Signaler
                  </Button>
                  <Button
                    variant="light"
                    color="gray"
                    fullWidth
                    radius="md"
                    styles={{ root: { padding: '12px', fontSize: '12px', fontWeight: 700 } }}
                  >
                    Aide
                  </Button>
                </div>
              </Paper>
            </div>
          </div>

          {/* Polling Indicator */}
          {step === 2 && !pickupCode && (
            <div className="fixed bottom-20 left-4 right-4 lg:bottom-24 lg:left-auto lg:right-6 lg:w-80 z-30">
              <Paper radius="xl" withBorder p="md" shadow="sm">
                <div className="flex items-center gap-3">
                  <Loader size="md" color="var(--primary)" />
                  <div>
                    <p className="text-[12px] font-bold text-textMain">
                      Confirmation en cours...
                    </p>
                    <p className="text-[10px] text-textMuted">
              Veuillez confirmer le paiement sur votre téléphone.
                    </p>
                  </div>
                </div>
              </Paper>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      {!collected ? (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-borderMain px-4 py-3 lg:hidden z-[60]">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-textMuted uppercase">Coût</p>
              <p className="font-bricolage text-lg font-black text-primary">
                {formatCost(doc)}
              </p>
            </div>
            {paid ? (
              <div className="flex items-center gap-2 text-green-mid text-[12px] font-bold">
                <i className="fa-solid fa-circle-check" /> Paiement confirmé
              </div>
            ) : (
              <Button
                onClick={() => setShowPaymentModal(true)}
                fullWidth
                size="md"
                radius="xl"
                color="var(--primary)"
                styles={{ root: { padding: '10px 24px', fontWeight: 700 } }}
              >
                Payer
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          if (!payProcessing) setShowPaymentModal(false);
        }}
        onPay={handlePay}
        amount={getCost(doc)}
        title={t("Paiement de Récupération")}
        description={t("recuperer_pay_desc")}
        processing={payProcessing}
        error={payError}
        termsText={
          <>
            En effectuant ce paiement, vous acceptez les{" "}
            <Link to="/conditions" className="text-primary underline">
              conditions d'utilisation
            </Link>
            . Le montant sera reversé au trouveur après récupération du document.
          </>
        }
      />

      {/* Polling Modal for recovery payment */}
      <PollingModal
        isOpen={!!pollingStatus}
        onClose={() => {
          setPollingStatus(null);
          if (recoveryPollingRef.current) clearInterval(recoveryPollingRef.current);
        }}
        pollingStatus={pollingStatus || "Vérification en cours..."}
        pollingElapsed={pollingElapsed}
        nokashTransactionId={nokashTxId}
        onManualCheck={handleManualCheck}
        isManualChecking={isManualChecking}
      />

      {/* Action Success Modal for recovery */}
      {showSuccessModal && (
        <ActionSuccessModal
          opened={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="Paiement validé !"
          description="Votre paiement de frais de récupération a été confirmé avec succès. Vous pouvez maintenant procéder au retrait de votre document."
          badgeText="Retrait autorisé"
          badgeColor="green"
          icon="fa-shield-halved"
          highlightBox={{
            label: "Code de retrait sécurisé",
            value: pickupCode || doc?.reference || "—",
            sublabel: t("messagerie_code_warning"),
          }}
          details={[
            { label: "Document", value: doc?.titre || "Document", highlighted: false },
            { label: "Montant réglé", value: formatCost(doc), highlighted: true },
            { label: "Statut", value: "Prêt pour retrait" },
          ]}
          primaryAction={{
            label: t("messagerie_cta_from_payment"),
            icon: "fa-comments",
            onClick: () => {
              setShowSuccessModal(false);
              navigate(conversationHref);
            },
          }}
          secondaryAction={{
            label: "Voir les instructions de retrait",
            icon: "fa-location-dot",
            onClick: () => setShowSuccessModal(false),
          }}
        />
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-textMuted font-medium">{label}</span>
      <span className="text-[13px] font-semibold text-textMain mt-0.5">{value}</span>
    </div>
  );
}
