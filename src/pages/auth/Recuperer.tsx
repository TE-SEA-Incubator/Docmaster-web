import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { declarationsService } from "../../services/declarationsService";
import type { Declaration } from "../../types/api";
import Topbar from "../../layout/Topbar";
import PaymentModal from "../../components/modals/PaymentModal";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useI18n } from "../../context/I18nContext";

const POLL_INTERVAL = 5000;
const FALLBACK_LAT = 3.8480;
const FALLBACK_LNG = 11.5021;

export default function Recuperer() {
  const { t } = useI18n();
  const stepLabels = [
    t("recuperer_step_declared"),
    t("recuperer_step_found"),
    t("recuperer_step_payment"),
    t("recuperer_step_withdrawal"),
  ];
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("id");

  const [doc, setDoc] = useState<Declaration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [step, setStep] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payProcessing, setPayProcessing] = useState(false);
  const [payError, setPayError] = useState("");
  const [pickupCode, setPickupCode] = useState("");

  const [ownerCoords, setOwnerCoords] = useState<{ lat: number; lng: number } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routePolyRef = useRef<L.Polyline | null>(null);
  const ownerMarkerRef = useRef<L.Marker | null>(null);
  const finderMarkerRef = useRef<L.Marker | null>(null);
  const mapReadyRef = useRef(false);
  const mapFullscreenRef = useRef(false);

  const displayStep = pickupCode ? 4
    : step >= 3 ? 3
    : step >= 2 ? 2
    : doc?.status === "MATCHED" || doc?.status === "RESOLVED" || doc?.status === "RETURNED" ? 2
    : 1;

  const paid = step >= 2;
  const collected = step >= 3;

  // ── Load declaration ──────────────────────────────────────────────────
  useEffect(() => {
    if (!docId) { setLoading(false); return; }
    setLoading(true);
    declarationsService.getById(docId)
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          setDoc(d);
          setStep(
            d.status === "recovered" || d.status === "RETURNED" ? 4
            : d.status === "paid" || d.status === "PAID" ? 3
            : d.status === "MATCHED" || d.status === "RESOLVED" ? 2
            : 1
          );
          if (d.status === "paid" || d.status === "PAID" || d.status === "RETURNED") {
            setPickupCode(d.reference || "");
          }
        } else {
          setError(t("recuperer_not_found"));
        }
      })
      .catch((e: any) => {
        setError(e.response?.data?.message || e.response?.data?.error || t("recuperer_load_error"));
      })
      .finally(() => setLoading(false));
  }, [docId, t]);

  // ── Payment polling ───────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 2 || !docId || pickupCode) return;
    const interval = setInterval(async () => {
      try {
        const res = await declarationsService.checkPaymentStatus(docId);
        if (res.data?.status === "paid" || res.data?.status === "PAID" || res.data?.status === "completed") {
          setStep(3);
          setPickupCode(res.data.reference || "DM-" + Date.now().toString(36).toUpperCase());
          setShowPaymentModal(false);
          clearInterval(interval);
        }
      } catch {
        // silent
      }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [step, docId, pickupCode]);

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
  const handlePay = async (method: "orange" | "mtn" | "points", phone: string) => {
    if (!docId) return;
    setPayProcessing(true);
    setPayError("");
    try {
      const pm = method === "orange" ? "ORANGE_MONEY" : method === "mtn" ? "MTN_MOMO" : "POINTS";
      const res = await declarationsService.payRecoveryFee({ docId, paymentMethod: pm, phone });
      if (res.success) {
        setStep(2);
        setShowPaymentModal(false);
      } else {
        setPayError(res.message || t("recuperer_pay_error"));
      }
    } catch {
      setPayError(t("recuperer_network_error"));
    } finally {
      setPayProcessing(false);
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
      if (!isNaN(num) && num > 0) return num;
    }
    return 5000;
  }

  function formatCost(d: Declaration | null): string {
    const val = getCost(d);
    return val > 0 ? `${val.toLocaleString("fr-FR")} FCFA` : "—";
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
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000/api/";
    return base.replace(/\/+$/, "") + "/uploads/" + path.replace(/^\/+/, "");
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
        circleCls += " bg-primary text-white shadow-xl shadow-primary/30 border-4 border-white";
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
        <Topbar
          title={t("recuperer_title")}
          breadcrumbs={[
            { label: t("recuperer_breadcrumb_search"), href: "/rechercher" },
            { label: t("recuperer_breadcrumb_recovery") },
          ]}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-borderMain p-8 max-w-md w-full text-center shadow-sm">
            <div className="w-16 h-16 bg-bgMain rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-file-circle-question text-textMuted text-2xl" />
            </div>
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
        <Topbar
          title={t("recuperer_title")}
          breadcrumbs={[
            { label: t("recuperer_breadcrumb_search"), href: "/rechercher" },
            { label: t("recuperer_breadcrumb_recovery") },
          ]}
        />
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
        <Topbar
          title={t("recuperer_title")}
          breadcrumbs={[
            { label: t("recuperer_breadcrumb_search"), href: "/rechercher" },
            { label: t("recuperer_breadcrumb_recovery") },
          ]}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-borderMain p-8 max-w-md w-full text-center shadow-sm">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-circle-exclamation text-red-400 text-2xl" />
            </div>
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
    <div className="flex flex-col h-full">
      <Topbar
        title={`Récupération : ${getDocTypeName()}`}
        breadcrumbs={[
          { label: t("recuperer_breadcrumb_search"), href: "/rechercher" },
          { label: t("recuperer_breadcrumb_recovery") },
        ]}
      />

      <div className="custom-scroll flex-1 p-4 sm:p-6 space-y-5 pb-28 lg:pb-6 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* ═══ Progress Banner ═══ */}
          <div className="bg-green-dark rounded-[24px] p-6 text-white flex flex-col sm:flex-row items-center gap-5 shadow-xl shadow-green-950/20 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
            <div className="w-14 h-14 rounded-[18px] bg-white/10 flex items-center justify-center flex-shrink-0">
              <i
                className={`fa-solid text-primary text-2xl ${
                  collected ? "fa-key" : paid ? "fa-spinner fa-spin" : "fa-rotate"
                }`}
              />
            </div>
            <div className="flex-1 w-full">
              <p className="text-[11px] text-white/50 uppercase font-black tracking-widest mb-1.5">
                {t("Progression du dossier")}
              </p>
              <div className="flex items-center justify-between mb-2">
                <p className="font-bricolage text-[16px] font-bold text-white">
                  {collected
                    ? t("Document récupéré")
                    : paid
                    ? t("Paiement confirmé — Récupération en cours")
                    : `Étape ${displayStep} sur 4 — ${stepLabels[displayStep - 1] || ""}`}
                </p>
                <p className="font-bricolage text-2xl font-extrabold text-primary">
                  {displayStep * 25}%
                </p>
              </div>
            </div>
          </div>

          {/* ═══ Step Tracker ═══ */}
          <div className="bg-white rounded-[28px] border border-borderMain p-6 shadow-sm">
            <div className="flex items-center justify-between min-w-0 gap-0">
              {renderSteps()}
            </div>
          </div>

          {/* ═══ Main Grid ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* ── Left Column ── */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {/* Document Card */}
              <div className="bg-white rounded-[32px] border border-borderMain overflow-hidden shadow-sm">
                <div className="p-6 bg-surface2/40 border-b border-borderMain flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 font-bold text-[11px] uppercase border border-green-200">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {doc.status === "MATCHED" || doc.status === "RESOLVED" || doc.status === "RETURNED"
                      ? "Matching Certifié"
                      : doc.status === "paid" || doc.status === "PAID"
                      ? "Paiement confirmé"
                      : "En attente"}
                  </span>
                </div>

                <div className="p-6 md:p-10 bg-surface2/20 flex items-center justify-center relative min-h-[260px]">
                  <div className="relative group w-full max-w-lg">
                    {doc.photo_recto ? (
                      <img
                        src={getImageUrl(doc.photo_recto)}
                        className="w-full h-auto max-h-[320px] object-contain shadow-2xl rounded-2xl border-4 border-white transition-transform duration-500 group-hover:scale-[1.02]"
                        alt="Document recto"
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
              </div>

              {/* Finder Info Card */}
              <div
                id="finder-info-card"
                className={`bg-white rounded-[28px] border border-borderMain p-6 shadow-sm transition-all duration-700 ${
                  paid ? "" : "opacity-80"
                }`}
              >
                <h4 className="text-[11px] font-bold text-textMuted uppercase tracking-widest mb-6">
                  {t("Informations du bienfaiteur")}
                </h4>
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-14 h-14 rounded-full bg-green-dark border-4 border-green-light flex items-center justify-center font-bricolage text-xl font-bold text-primary shadow-lg">
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
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                    <i className="fa-solid fa-lock text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-bold text-amber-700">
                        {t("recuperer_owner")}
                      </p>
                      <p className="text-[11px] text-amber-600/80 mt-0.5">
                        {t("recuperer_map_hint_unpaid")}
                      </p>
                    </div>
                  </div>
                )}

                {paid && (
                  <div className="mt-5 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-primary/20 flex items-center justify-center text-primary shadow-sm flex-shrink-0">
                        <i className="fa-solid fa-shield-halved" />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-textMain mb-1">
                          {t("Sécurité DocMaster")}
                        </h4>
                        <p className="text-[12px] text-textMuted leading-relaxed">
                          {t("Le bienfaiteur ne recevra ses gains qu'une fois que vous aurez récupéré physiquement le document et fourni le code de retrait en agence.")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Map Section */}
              <div
                id="finder-map-section"
                className="bg-white rounded-[28px] border border-borderMain overflow-hidden shadow-sm"
              >
                <div className="px-6 py-4 border-b border-borderMain flex items-center justify-between bg-surface2/60">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
                      <i className="fa-solid fa-route text-white text-sm" />
                    </div>
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
                  className="hidden bg-white/95 backdrop-blur border-t border-borderMain px-6 py-4 flex items-center gap-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-car text-blue-600 text-sm" />
                    </div>
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
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-road text-blue-600 text-sm" />
                    </div>
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
                    <a
                      href={`https://wa.me/${getFinderPhone().replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-green-600 transition-all"
                    >
                      <i className="fa-brands fa-whatsapp text-base" />
                      WhatsApp
                    </a>
                    <a
                      href={`tel:${getFinderPhone()}`}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
                    >
                      <i className="fa-solid fa-phone text-base" />
                      Appeler
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${getFinderLat()},${getFinderLng()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 bg-green-dark text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-green-mid transition-all"
                    >
                      <i className="fa-solid fa-diamond-turn-right text-base" />
                      Naviguer
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right Column: Action Panel ── */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              {/* Payment Card */}
              <div
                id="ownerActionPanel"
                className={`bg-white rounded-[32px] border-2 p-8 shadow-2xl space-y-6 relative overflow-hidden ${
                  collected ? "border-green-500/30" : "border-primary/30 shadow-primary/10"
                }`}
              >
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-xl" />

                {collected && pickupCode ? (
                  /* ── Success Panel ── */
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center mx-auto shadow-xl animate-bounce">
                      <i className="fa-solid fa-key text-2xl" />
                    </div>
                    <div>
                      <h5 className="font-bricolage text-2xl font-black text-textMain mb-2">
                        {t("Code de Retrait")}
                      </h5>
                      <p className="text-[13px] text-textMuted">
                        {t("Montrez ce code au recuperateur")}
                      </p>
                    </div>
                    <div
                      className="bg-green-dark/5 border-2 border-dashed border-green-dark/20 rounded-3xl p-6 cursor-pointer hover:bg-green-dark/10 transition-all group"
                      onClick={() => {
                        navigator.clipboard.writeText(pickupCode);
                      }}
                    >
                      <p className="font-bricolage text-4xl font-black text-primary tracking-tighter">
                        {pickupCode}
                      </p>
                      <div className="inline-flex items-center gap-2 mt-4 text-[10px] text-textMuted font-bold uppercase tracking-widest group-hover:text-primary transition-colors">
                        <i className="fa-solid fa-copy" />
                        {t("Cliquez pour copier")}
                      </div>
                    </div>
                    <Link
                      to="/dashboard"
                      className="block w-full py-4 bg-green-dark text-white rounded-[24px] font-bold hover:bg-green-mid transition-all text-center"
                    >
                      {t("Retourner au dashboard")}
                    </Link>
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
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold">
                        <i className="fa-solid fa-info-circle" />
                        Service + Récompense inclus
                      </div>
                    </div>

                    {paid ? (
                      /* Already paid - waiting */
                      <div className="p-5 bg-green-light/50 rounded-2xl border border-green-200 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto">
                          <i className="fa-solid fa-check text-lg" />
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-green-dark">
                            {t("Paiement confirmé")}
                          </p>
                          <p className="text-[12px] text-green-600/80 mt-1">
                            {t("Veuillez patienter pendant le traitement...")}
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Not paid - show pay button */
                      <div className="space-y-4 pt-2">
                        <button
                          onClick={() => setShowPaymentModal(true)}
                          className="w-full py-5 bg-primary text-white rounded-[24px] font-bricolage font-extrabold text-[18px] shadow-xl shadow-primary/40 hover:bg-primary-dark transition-all transform active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                          {t("Payer & Récupérer")}
                          <i className="fa-solid fa-arrow-right text-sm" />
                        </button>
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
              </div>

              {/* Support Card */}
              <div className="bg-white rounded-[24px] border border-borderMain p-6 shadow-sm">
                <p className="text-[11px] font-bold text-textMuted uppercase mb-3 text-center">
                  {t("Besoin d'assistance ?")}
                </p>
                <div className="flex items-center gap-3">
                  <button className="flex-1 py-3 bg-surface2 border border-borderMain rounded-xl text-[12px] font-bold text-textMain hover:border-primary transition-all">
                    Signaler
                  </button>
                  <button className="flex-1 py-3 bg-surface2 border border-borderMain rounded-xl text-[12px] font-bold text-textMain hover:border-primary transition-all">
                    Aide
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Polling Indicator */}
          {step === 2 && !pickupCode && (
            <div className="fixed bottom-20 left-4 right-4 lg:bottom-24 lg:left-auto lg:right-6 lg:w-80 z-30">
              <div className="bg-white border border-primary/30 rounded-[16px] p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  <div>
                    <p className="text-[12px] font-bold text-textMain">
                      Confirmation en cours...
                    </p>
                    <p className="text-[10px] text-textMuted">
              Veuillez confirmer le paiement sur votre téléphone.
                    </p>
                  </div>
                </div>
              </div>
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
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-6 py-3 bg-primary text-white rounded-xl text-[13px] font-bold hover:bg-primary-dark transition-all active:scale-[.98]"
              >
                Payer
              </button>
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
