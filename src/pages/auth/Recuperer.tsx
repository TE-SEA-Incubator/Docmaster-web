import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Badge, Button } from "@mantine/core";
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
import { FlowCard, FlowFact, FlowNotice, FlowStepper } from "../../components/recuperation/FlowUI";
import CompleteDeclarationModal from "../../components/ui/CompleteDeclarationModal";
import { declarationGaps } from "../../utils/declarationGaps";

const POLL_INTERVAL = 5000;
const FALLBACK_LAT = 3.8480;
const FALLBACK_LNG = 11.5021;

export default function Recuperer() {
  const { t, lang } = useI18n();
  useTopbar(t("recuperer_title"), [
    { label: t("recuperer_breadcrumb_search"), href: "/rechercher" },
    { label: t("recuperer_breadcrumb_recovery") },
  ]);
  const locale = lang === "ar" ? "ar" : lang === "en" ? "en-GB" : "fr-FR";
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
  const [codeCopied, setCodeCopied] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routePolyRef = useRef<L.Polyline | null>(null);
  const ownerMarkerRef = useRef<L.Marker | null>(null);
  const finderMarkerRef = useRef<L.Marker | null>(null);
  const mapReadyRef = useRef(false);
  const mapFullscreenRef = useRef(false);

  // Le code est connu dès le paiement : l'étape RETRAIT reste en cours tant que le document n'est pas remis.
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
          // Une déclaration FOUND appartient au trouveur : c'est la page « Rendre » qui le guide.
          if ((d.declaration_type || "").toUpperCase() === "FOUND") {
            navigate(`/rendre?id=${docId}`, { replace: true });
            return;
          }
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
  }, [docId, foundMatchId, navigate, t]);

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
        // le cycle suivant réessaie
      }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [step, docId, foundMatchId, pickupCode]);

  // Le PATCH renvoie la ligne telle que la base l'a écrite : on n'affiche pas un état non accordé.
  const handleCompleted = (updated: Declaration) => {
    setShowComplete(false);
    setDoc((current) => (current ? { ...current, ...updated } : current));
  };

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
      html: `<div style="width:36px;height:36px;background:#2D5A42;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.35)"></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    const finderMarker = L.marker([finderLat, finderLng], { icon: finderIcon })
      .addTo(map)
      .bindPopup(`<b>${getFinderName()}</b><br/>${getFinderCity()}`);
    finderMarkerRef.current = finderMarker;

    const setStatus = (text: string) => {
      const el = document.getElementById("map-status-text");
      if (el) el.textContent = text;
    };

    const drawRoute = (ownerLat: number, ownerLng: number) => {
      const ownerIcon = L.divIcon({
        className: "owner-marker-pulse",
        html: `<div style="width:20px;height:20px;background:#F5A64B;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(245,166,75,.25)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      if (ownerMarkerRef.current) map.removeLayer(ownerMarkerRef.current);
      const ownerMarker = L.marker([ownerLat, ownerLng], { icon: ownerIcon })
        .addTo(map)
        .bindPopup(t("flow_map_you"));
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
              color: "#2D5A42",
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
          if (etaEl) etaEl.textContent = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}min`;
          if (distEl) distEl.textContent = `${km} km`;
          if (badge) badge.classList.remove("hidden");
          setStatus(t("flow_route_done"));
        })
        .catch(() => setStatus(t("flow_route_done")));
    };

    if (ownerCoords) {
      drawRoute(ownerCoords.lat, ownerCoords.lng);
    } else if (navigator.geolocation) {
      setStatus(t("flow_locating"));
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
  }, [paid, doc, ownerCoords, initMap, t]);

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
          setPollingStatus(t("flow_poll_processing"));
        } else if (elapsed > 60) {
          setPollingStatus(t("flow_poll_operator"));
        } else {
          setPollingStatus(t("flow_poll_validate"));
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
        setPollingStatus(t("flow_poll_status", { status: checkData.status || checkData.currentStatus }));
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
          setPollingStatus(t("flow_poll_validate"));
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
    return `${getCost(d).toLocaleString(locale)} FCFA`;
  }

  function formatDate(d: string | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  }

  function getImageUrl(path: string | undefined) {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("data:")) return path;
    const base = import.meta.env.VITE_API_URL || "";
    const baseUrl = base ? base.replace(/\/+$/, "") + "/" : "/api/";
    return baseUrl + "uploads/" + path.replace(/^\/+/, "");
  }

  function getFinderName(): string {
    const cp = (doc as any)?.counterPart;
    if (cp) return `${cp.prenom || ""} ${cp.nom || ""}`.trim();
    return (doc as any)?.owner_name || t("flow_finder_name");
  }

  function getFinderPhone(): string {
    return (doc as any)?.counterPart?.telephone || "";
  }

  function getFinderCity(): string {
    return (doc as any)?.counterPartDeclaration?.found_location?.city || doc?.ville || "—";
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

  function getPhotoSrc(): string {
    return getImageUrl(
      doc?.photo_recto || doc?.photo_verso || (doc as any)?.counterPartPhotoRecto || (doc as any)?.counterPartPhotoVerso
    );
  }

  const statusLabel = collected
    ? t("flow_badge_returned")
    : paid
      ? t("flow_badge_paid")
      : t("flow_badge_matched");
  const statusColor = collected ? "blue" : paid ? "green" : "orange";

  const copyCode = () => {
    navigator.clipboard.writeText(pickupCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // ── Render: No docId ─────────────────────────────────────────────────
  if (!docId) {
    return <FlowEmptyState title={t("recuperer_not_found_title")} message={t("recuperer_not_found")} cta={t("recuperer_breadcrumb_search")} />;
  }

  // ── Render: Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto rounded-full border-[3px] border-borderMain border-t-primary animate-spin" />
          <p className="mt-4 text-[13px] font-semibold text-textMuted">{t("shared_loading")}</p>
        </div>
      </div>
    );
  }

  // ── Render: Error ────────────────────────────────────────────────────
  if (error || !doc) {
    return (
      <FlowEmptyState
        title={t("recuperer_not_found_title")}
        message={error || t("recuperer_not_found")}
        cta={t("recuperer_breadcrumb_search")}
      />
    );
  }

  // Ce que la plateforme ignore encore de cette déclaration : c est ce seul qu on redemande.
  const gaps = declarationGaps(doc);

  // ── Render: Main ─────────────────────────────────────────────────────
  return (
    <div className="flex-1 px-4 sm:px-6 py-6 pb-24 lg:pb-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ═══ Progression ═══ */}
        <FlowCard
          title={t("flow_progression")}
          icon="fa-solid fa-list-check"
          aside={<Badge color={statusColor} variant="light" radius="xl" size="sm">{statusLabel}</Badge>}
        >
          <FlowStepper
            steps={stepLabels}
            current={collected ? stepLabels.length + 1 : displayStep}
            caption={t("flow_step_of", { current: Math.min(displayStep, stepLabels.length), total: stepLabels.length })}
          />
        </FlowCard>

        {/* ═══ Informations manquantes ═══ */}
        {gaps.length > 0 && (
          <FlowNotice tone="orange" icon="fa-solid fa-circle-info">
            <span className="font-bold">{t("recuperer_gaps_title")}</span> {t("recuperer_gaps_desc")}
            <button
              type="button"
              onClick={() => setShowComplete(true)}
              className="mt-1.5 block font-extrabold text-primary-dark underline underline-offset-2"
            >
              {t("mesdeclarations_complete")}
            </button>
          </FlowNotice>
        )}

        {/* ═══ Action en cours ═══ */}
        <FlowCard title={t("flow_to_do")} icon="fa-solid fa-bullseye">
          {collected ? (
            <div className="flex flex-col gap-4 items-start">
              <FlowNotice tone="green" icon="fa-solid fa-circle-check">
                <span className="font-bold">{t("flow_done_title")}</span> {t("flow_done_desc")}
              </FlowNotice>
              <Button component={Link} to="/dashboard" radius="md">{t("flow_back_dashboard")}</Button>
            </div>
          ) : pickupCode ? (
            <div className="flex flex-col gap-4">
              <FlowNotice tone="green" icon="fa-solid fa-badge-check">
                <span className="font-bold">{t("flow_paid_confirmed")}</span> {t("flow_success_desc")}
              </FlowNotice>

              <div>
                <p className="text-[11px] font-bold text-textMuted uppercase tracking-wider mb-2">{t("flow_code_show")}</p>
                <button
                  type="button"
                  onClick={copyCode}
                  className="w-full rounded-2xl bg-surface2 border border-borderMain px-4 py-4 text-center hover:border-primary transition-colors"
                >
                  <span className="block font-mono tabular-nums text-2xl sm:text-3xl font-bold tracking-[0.3em] text-textMain">
                    {pickupCode}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-textMuted uppercase tracking-wider">
                    <i className={`fa-solid ${codeCopied ? "fa-check text-green-dark" : "fa-copy"}`} aria-hidden="true" />
                    {codeCopied ? t("flow_code_copied") : t("flow_copy_code")}
                  </span>
                </button>
              </div>

              <FlowNotice tone="orange" icon="fa-solid fa-triangle-exclamation">
                {t("messagerie_code_warning")}
              </FlowNotice>

              <div className="flex flex-wrap gap-3">
                <Button
                  component={Link}
                  to={conversationHref}
                  radius="md"
                  leftSection={<i className="fa-solid fa-comments text-xs" aria-hidden="true" />}
                >
                  {t("messagerie_cta_from_payment")}
                </Button>
                <Button component={Link} to="/dashboard" radius="md" variant="default">
                  {t("flow_back_dashboard")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <p className="text-[11px] font-bold text-textMuted uppercase tracking-wider">{t("recuperer_label_fee")}</p>
                <p className="mt-1 font-bricolage text-3xl font-black text-textMain tabular-nums">{formatCost(doc)}</p>
                <p className="mt-1 text-[11px] text-textMuted">{t("flow_fee_includes")}</p>
              </div>
              <Button
                onClick={() => setShowPaymentModal(true)}
                radius="md"
                size="lg"
                fullWidth
                rightSection={<i className="fa-solid fa-arrow-right text-xs" aria-hidden="true" />}
              >
                {t("flow_pay_cta")}
              </Button>
              <p className="text-[11.5px] text-textMuted leading-relaxed text-center">{t("flow_pay_note")}</p>
            </div>
          )}
        </FlowCard>

        {/* ═══ Le document ═══ */}
        <FlowCard
          title={getDocTypeName()}
          icon="fa-solid fa-id-card"
          aside={<span className="text-[11px] font-mono tabular-nums text-textMuted">{(doc as any)?.identifiant_doc_dm || doc?.reference || "—"}</span>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
            <div className="sm:col-span-2">
              <div className="aspect-[4/3] rounded-2xl border border-borderMain overflow-hidden bg-surface2">
                {getPhotoSrc() ? (
                  <img src={getPhotoSrc()} alt={getDocTypeName()} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <i className="fa-solid fa-id-card text-3xl text-textMuted" aria-hidden="true" />
                    <p className="text-[11px] text-textMuted">{t("flow_photo_empty")}</p>
                  </div>
                )}
              </div>
              {doc.photo_verso && (
                <Button
                  mt="xs"
                  variant="default"
                  radius="md"
                  size="xs"
                  onClick={() => window.open(getImageUrl(doc.photo_verso), "_blank")}
                  leftSection={<i className="fa-solid fa-rotate text-[10px]" aria-hidden="true" />}
                >
                  {t("flow_back_photo")}
                </Button>
              )}
            </div>
            <div className="sm:col-span-3 grid grid-cols-2 gap-4 self-start">
              <FlowFact label={t("recuperer_label_type")} value={getDocTypeName()} />
              <FlowFact label={t("recuperer_label_number")} value={doc.numero_document || doc.document_number || "—"} mono />
              <FlowFact label={t("recuperer_label_name")} value={doc.nom_complet || doc.owner_name || "—"} />
              <FlowFact label={t("recuperer_label_loss_date")} value={formatDate(doc.date_perte)} />
              <FlowFact label={t("recuperer_label_location")} value={doc.lieu_perte || doc.ville || "—"} />
              <FlowFact label={t("recuperer_label_fee")} value={formatCost(doc)} mono />
            </div>
          </div>
        </FlowCard>

        {/* ═══ Le trouveur ═══ */}
        <FlowCard title={t("flow_finder_title")} icon="fa-solid fa-user-check">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FlowFact
              label={t("flow_finder_name")}
              value={paid ? getFinderName() : <span className="select-none" aria-hidden="true">••••••••</span>}
            />
            <FlowFact
              label={t("rendre_contact")}
              value={paid ? (getFinderPhone() || "—") : <span className="select-none" aria-hidden="true">+237 ••• •• ••</span>}
              mono
            />
            <FlowFact
              label={t("recuperer_label_location")}
              value={paid ? getFinderCity() : <span className="select-none" aria-hidden="true">••••••</span>}
            />
          </div>

          {!paid ? (
            <div className="mt-4 pt-4 border-t border-borderMain">
              <FlowNotice tone="orange" icon="fa-solid fa-lock">
                {t("recuperer_map_hint_unpaid")}
              </FlowNotice>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-borderMain flex flex-wrap gap-3">
              {getFinderPhone() && (
                <>
                  <Button
                    component="a"
                    href={`tel:${getFinderPhone()}`}
                    radius="md"
                    variant="default"
                    leftSection={<i className="fa-solid fa-phone text-xs" aria-hidden="true" />}
                  >
                    {t("rendre_call")}
                  </Button>
                  <Button
                    component="a"
                    href={`https://wa.me/${getFinderPhone().replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    radius="md"
                    variant="default"
                    leftSection={<i className="fa-brands fa-whatsapp text-xs" aria-hidden="true" />}
                  >
                    WhatsApp
                  </Button>
                </>
              )}
              <Button
                component={Link}
                to={conversationHref}
                radius="md"
                variant="default"
                leftSection={<i className="fa-solid fa-comments text-xs" aria-hidden="true" />}
              >
                {t("messagerie_cta_from_payment")}
              </Button>
            </div>
          )}
        </FlowCard>

        {/* ═══ Itinéraire ═══ */}
        <section id="finder-map-section" className="bg-surface border border-borderMain rounded-3xl overflow-hidden">
          <header className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-borderMain">
            <div className="flex items-center gap-2.5 min-w-0">
              <i className="fa-solid fa-route text-textMuted text-sm" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="font-bricolage text-[15px] sm:text-base font-bold text-textMain truncate">{t("flow_route_finder")}</h2>
                <p className="text-[11px] text-textMuted" id="map-status-text">
                  {paid ? t("flow_route_computing") : t("flow_route_direct")}
                </p>
              </div>
            </div>
            {paid && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  component="a"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${getFinderLat()},${getFinderLng()}`}
                  target="_blank"
                  rel="noreferrer"
                  radius="md"
                  size="xs"
                  leftSection={<i className="fa-solid fa-diamond-turn-right text-[10px]" aria-hidden="true" />}
                >
                  {t("flow_directions")}
                </Button>
                <button
                  type="button"
                  onClick={toggleMapFullscreen}
                  aria-label={t("flow_fullscreen")}
                  title={t("flow_fullscreen")}
                  className="w-9 h-9 rounded-lg border border-borderMain bg-surface2 flex items-center justify-center text-textMuted hover:text-textMain transition-colors"
                >
                  <i className="fa-solid fa-expand text-[13px]" aria-hidden="true" />
                </button>
              </div>
            )}
          </header>

          <div className="relative">
            <div ref={mapContainerRef} className="map-shell w-full" style={{ height: paid ? 380 : 220 }} />
            {!paid && (
              <div className="absolute inset-0 bg-surface/85 flex items-center justify-center px-4">
                <div className="text-center max-w-xs">
                  <i className="fa-solid fa-lock text-textMuted text-2xl" aria-hidden="true" />
                  <p className="mt-3 text-[14px] font-bold text-textMain">{t("flow_map_locked")}</p>
                  <p className="mt-1 text-[12px] text-textMuted leading-relaxed">{t("recuperer_map_hint_unpaid")}</p>
                  <Button mt="md" radius="md" onClick={() => setShowPaymentModal(true)}>
                    {t("flow_pay_locked_cta", { amount: formatCost(doc) })}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {paid && (
            <div id="eta-badge" className="hidden border-t border-borderMain px-5 sm:px-6 py-4 flex items-center gap-6">
              <FlowFact label={t("flow_eta_time")} value={<span id="eta-time">—</span>} mono />
              <span className="w-px h-10 bg-borderMain" aria-hidden="true" />
              <FlowFact label={t("flow_eta_distance")} value={<span id="eta-dist">—</span>} mono />
            </div>
          )}
        </section>

        {/* ═══ Protection ═══ */}
        <FlowCard title={t("flow_protection_title")} icon="fa-solid fa-shield-halved">
          <ul className="space-y-3">
            {[t("flow_protection_note"), t("messagerie_code_warning"), t("flow_safety_public")].map((rule) => (
              <li key={rule} className="flex items-start gap-2.5 text-[12.5px] text-textMain leading-relaxed">
                <i className="fa-solid fa-check text-green-dark text-[11px] mt-1" aria-hidden="true" />
                {rule}
              </li>
            ))}
          </ul>
        </FlowCard>

        <Button component={Link} to="/dashboard" radius="md" variant="default" fullWidth>
          {t("flow_back_dashboard")}
        </Button>
      </div>

      {/* ═══ Barre d'action mobile ═══ */}
      {!collected && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 bg-surface border-t border-borderMain px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider">
                {pickupCode ? t("flow_code_title") : t("recuperer_label_fee")}
              </p>
              <p className={`text-[15px] font-bold text-textMain truncate ${pickupCode ? "font-mono tabular-nums" : ""}`}>
                {pickupCode || formatCost(doc)}
              </p>
            </div>
            {pickupCode ? (
              <Button component={Link} to={conversationHref} radius="md" size="md">
                {t("messagerie_cta_from_payment")}
              </Button>
            ) : (
              <Button onClick={() => setShowPaymentModal(true)} radius="md" size="md">
                {t("flow_pay_short")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Modal de paiement */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          if (!payProcessing) setShowPaymentModal(false);
        }}
        onPay={handlePay}
        amount={getCost(doc)}
        title={t("flow_pay_modal_title")}
        description={t("recuperer_pay_desc")}
        processing={payProcessing}
        error={payError}
        termsText={
          <>
            {t("flow_terms_prefix")}{" "}
            <Link to="/conditions" className="text-primary underline">
              {t("flow_terms_link")}
            </Link>
            {t("flow_terms_suffix")}
          </>
        }
      />

      {/* Modal de confirmation du paiement mobile money */}
      <PollingModal
        isOpen={!!pollingStatus}
        onClose={() => {
          setPollingStatus(null);
          if (recoveryPollingRef.current) clearInterval(recoveryPollingRef.current);
        }}
        pollingStatus={pollingStatus || t("flow_checking")}
        pollingElapsed={pollingElapsed}
        nokashTransactionId={nokashTxId}
        onManualCheck={handleManualCheck}
        isManualChecking={isManualChecking}
      />

      {/* Modal de succès */}
      {showSuccessModal && (
        <ActionSuccessModal
          opened={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title={t("flow_success_title")}
          description={t("flow_success_desc")}
          badgeText={t("flow_success_badge")}
          badgeColor="green"
          icon="fa-shield-halved"
          highlightBox={{
            label: t("flow_success_code_label"),
            value: pickupCode || doc?.reference || "—",
            sublabel: t("messagerie_code_warning"),
          }}
          details={[
            { label: t("flow_success_detail_doc"), value: doc?.titre || getDocTypeName(), highlighted: false },
            { label: t("flow_success_detail_amount"), value: formatCost(doc), highlighted: true },
            { label: t("flow_success_detail_status"), value: t("flow_success_ready") },
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
            label: t("flow_success_secondary"),
            icon: "fa-location-dot",
            onClick: () => setShowSuccessModal(false),
          }}
        />
      )}

      {showComplete && doc && (
        <CompleteDeclarationModal
          declaration={doc}
          onClose={() => setShowComplete(false)}
          onSaved={handleCompleted}
        />
      )}
    </div>
  );
}

function FlowEmptyState({ title, message, cta }: { title: string; message: string; cta: string }) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-20">
      <div className="max-w-sm text-center">
        <i className="fa-solid fa-file-circle-question text-textMuted text-3xl" aria-hidden="true" />
        <h1 className="mt-4 font-bricolage text-lg font-bold text-textMain">{title}</h1>
        <p className="mt-2 text-[13px] text-textMuted leading-relaxed">{message}</p>
        <Button
          component={Link}
          to="/rechercher"
          radius="md"
          mt="md"
          leftSection={<i className="fa-solid fa-magnifying-glass text-xs" aria-hidden="true" />}
        >
          {cta}
        </Button>
      </div>
    </div>
  );
}
