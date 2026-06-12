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

export default function Recuperer() {
  const { t } = useI18n();
  const steps = [t("recuperer_step_declared"), t("recuperer_step_found"), t("recuperer_step_payment"), t("recuperer_step_withdrawal")];
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("id");

  const [doc, setDoc] = useState<Declaration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Payment flow
  const [step, setStep] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payMethod, setPayMethod] = useState<"orange" | "mtn" | "">("");
  const [payPhone, setPayPhone] = useState("");
  const [payProcessing, setPayProcessing] = useState(false);
  const [payError, setPayError] = useState("");
  const [pickupCode, setPickupCode] = useState("");

  // Map
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const routeLayer = useRef<L.Polyline | null>(null);

  const displayStep = pickupCode ? 4
    : step >= 3 ? 3
    : step >= 2 ? 2
    : doc?.status === "MATCHED" || doc?.status === "RESOLVED" || doc?.status === "RETURNED" ? 2
    : 1;

  useEffect(() => {
    if (!docId) { setLoading(false); return; }
    setLoading(true);
    declarationsService.getById(docId)
      .then((res) => {
        console.log("[Recuperer] getById response:", res);
        if (res.success && res.data) {
          const d = res.data;
          setDoc(d);
          setStep(d.status === "recovered" ? 4 : d.status === "paid" ? 3 : d.status === "MATCHED" || d.status === "RESOLVED" || d.status === "RETURNED" ? 2 : 1);
          if (d.status === "paid") setPickupCode(d.reference || "");
        } else {
      setError(t("recuperer_not_found"));
      }
      })
      .catch((e: any) => {
        const msg = e.response?.data?.message || e.response?.data?.error || t("recuperer_load_error");
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [docId]);

  useEffect(() => {
    if (step !== 2 || !docId || pickupCode) return;
    const interval = setInterval(async () => {
      try {
        const res = await declarationsService.checkPaymentStatus(docId);
        console.log("[Recuperer] checkPaymentStatus response:", res);
        if (res.data?.status === "paid" || res.data?.status === "completed") {
          setStep(3);
          setPickupCode(res.data.reference || "RECUP-" + Date.now().toString(36).toUpperCase());
          setShowPaymentModal(false);
          clearInterval(interval);
        }
      } catch (e: any) {
        console.error("[Recuperer] poll error:", e?.response?.data || e);
      }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [step, docId, pickupCode]);

  const initMap = useCallback(() => {
    if (mapInstance.current || !mapRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([4.0511, 9.7679], 13);
    L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", { maxZoom: 20 }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    if (!loading && doc && mapRef.current) {
      setTimeout(initMap, 200);
    }
  }, [loading, doc, initMap]);

  const handlePay = async (method: "orange" | "mtn", phone: string) => {
    if (!docId) return;
    setPayProcessing(true);
    setPayError("");
    try {
      const res = await declarationsService.payRecoveryFee({
        docId: docId,
        paymentMethod: method === "orange" ? "ORANGE_MONEY" : "MTN_MOMO",
        phone,
      });
      console.log("[Recuperer] payRecoveryFee response:", res);
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

  if (!docId) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title={t("recuperer_title")} breadcrumbs={[{ label: t("recuperer_breadcrumb_search"), to: "/rechercher" }, { label: t("recuperer_breadcrumb_recovery") }]} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-borda p-8 max-w-md w-full text-center shadow-sm">
            <div className="w-16 h-16 bg-bgMain rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-file-circle-question text-textMuted text-2xl" />
            </div>
            <h1 className="font-bricolage text-xl font-black text-textMain mb-2">{t("recuperer_not_found_title")}</h1>
            <p className="text-textMuted text-[13px] mb-6">{t("recuperer_not_found")}</p>
            <Link to="/rechercher" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-[13px] hover:bg-primary-dark transition-all">
              <i className="fa-solid fa-magnifying-glass text-[11px]" /> {t("recuperer_breadcrumb_search")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title={t("recuperer_title")} breadcrumbs={[{ label: t("recuperer_breadcrumb_search"), to: "/rechercher" }, { label: t("recuperer_breadcrumb_recovery") }]} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-11 h-11 rounded-full border-[3px] border-black/10 border-t-primary animate-spin" />
            <p className="text-textMuted text-[13px] font-medium">{t("recuperer_title")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title={t("recuperer_title")} breadcrumbs={[{ label: t("recuperer_breadcrumb_search"), to: "/rechercher" }, { label: t("recuperer_breadcrumb_recovery") }]} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-borda p-8 max-w-md w-full text-center shadow-sm">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-circle-exclamation text-red-400 text-2xl" />
            </div>
            <h1 className="font-bricolage text-xl font-black text-textMain mb-2">{t("recuperer_not_found_title")}</h1>
            <p className="text-textMuted text-[13px] mb-6">{error || t("recuperer_not_found")}</p>
            <Link to="/rechercher" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-[13px] hover:bg-primary-dark transition-all">
              <i className="fa-solid fa-arrow-left text-[11px]" /> {t("recuperer_breadcrumb_search")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const paid = step >= 2;
  const collected = step >= 3;

  const stepCircles = () =>
    steps.map((label, i) => {
      const idx = i;
      let cls = "step-circle pending";
      let labelCls = "step-label";
      let itemCls = "step-item pending";
      let content: React.ReactNode = idx + 1;

      if (idx < displayStep) {
        itemCls = "step-item done";
        cls = "step-circle done";
        labelCls = "step-label";
        content = <i className="fa-solid fa-check text-[9px]"></i>;
      } else if (idx === displayStep) {
        itemCls = "step-item active";
        cls = "step-circle active";
        labelCls = "step-label";
      }

      return (
        <div key={idx} className={itemCls}>
          <div className={cls}>{content}</div>
          <span className={labelCls}>{label}</span>
        </div>
      );
    });

  function getCost(d: Declaration | null): number {
    const candidates = [
      // (d as any)?.recompense_montant,
      // (d as any)?.recompense,
      // (d as any)?.reward_amount,
      // (d as any)?.conservation_fee,
      (d as any)?.docTypeInfo?.prix_retrouvaille,
      (d as any)?.docTypeInfo?.prix_recuperation,
    ];
    for (const raw of candidates) {
      if (raw == null) continue;
      const num = typeof raw === "number" ? raw : parseInt(raw);
      if (!isNaN(num) && num > 0) return num;
    }
    return 0;
  }

  function formatCost(d: Declaration | null): string {
    const val = getCost(d);
    return val > 0 ? `${val.toLocaleString("fr-FR")} FCFA` : "—";
  }

  function formatDate(d: string | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  function getImageUrl(path: string | undefined) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    if (path.startsWith("data:")) return path;
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000/api/";
    return base.replace(/\/+$/, "") + "/uploads/" + path.replace(/^\/+/, "");
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Récupération de document"
        breadcrumbs={[
          { label: "Recherche", to: "/rechercher" },
          { label: "Récupération" },
        ]}
      />

      <div className="custom-scroll flex-1 p-4 sm:p-6 space-y-5 pb-28 lg:pb-6 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* Steps tracker */}
          <div className="bg-white border border-borda rounded-[16px] sm:rounded-[20px] px-4 py-3 shadow-sm">
            <div className="step-wrap">{stepCircles()}</div>
          </div>

          {/* Success screen */}
          {collected && pickupCode ? (
            <div className="bg-white border border-green-mid/30 rounded-[20px] p-6 sm:p-8 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-green-light flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-circle-check text-green-mid text-3xl" />
              </div>
              <h2 className="font-bricolage text-xl font-extrabold text-textMain mb-1">{t("recuperer_pay_title")}</h2>
              <p className="text-[13px] text-textMuted mb-6">{t("recuperer_pay_desc")}</p>
              <div className="max-w-sm mx-auto p-4 bg-bgMain border border-borda rounded-[16px] mb-6">
                <p className="text-[10px] font-bold text-textMuted uppercase mb-2">{t("Code de retrait")}</p>
                <p className="font-bricolage text-2xl font-extrabold text-primary tracking-[0.2em]">{pickupCode}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(pickupCode)}
                  className="mt-3 text-[11px] font-bold text-primary hover:text-primary-dark transition-colors"
                >
                  <i className="fa-solid fa-copy mr-1" /> {t("Copier le code")}
                </button>
              </div>
              <div className="p-4 bg-green-light/50 border border-green-mid/20 rounded-[16px] text-left flex gap-3">
                <div className="w-10 h-10 rounded-full bg-green-mid flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-phone text-white text-sm" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-textMain">{t("Contactez le trouveur")}</p>
                  <p className="text-[11px] text-textMuted mt-0.5">
                    {t("Présentez ce code à la personne qui a trouvé votre document pour finaliser la récupération.")}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Document info */}
            <div className="lg:col-span-2 space-y-5">
              {/* Document card */}
              <div className="bg-white rounded-[20px] overflow-hidden border border-borda shadow-sm">
                {/* Photo */}
                <div className="relative">
                  {doc.photo_recto ? (
                    <img
                      src={getImageUrl(doc.photo_recto)}
                      alt="Document"
                      className="w-full h-56 sm:h-72 object-cover"
                    />
                  ) : (
                    <div className="w-full h-56 sm:h-72 bg-gradient-to-br from-green-dark/10 to-green-mid/5 flex items-center justify-center">
                      <div className="text-center">
                        <i className="fa-solid fa-id-card text-5xl text-textMuted/30" />
                        <p className="text-[11px] text-textMuted mt-2">{t("Aucune photo disponible")}</p>
                      </div>
                    </div>
                  )}
                  {doc.photo_verso && (
                    <button
                      onClick={() => window.open(getImageUrl(doc.photo_verso), "_blank")}
                      className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-textMain hover:bg-white transition-all shadow-sm"
                    >
                      <i className="fa-solid fa-rotate mr-1" /> {t("Verso")}
                    </button>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div>
                      <span className={`text-white text-[11px] font-bold px-3 py-1 rounded-full ${doc.type === "found" ? "bg-green-dark/80" : "bg-red-500/80"} inline-block mb-2`}>
                        <i className={`fa-solid ${doc.type === "found" ? "fa-check" : "fa-clock"} mr-1`} />
                        {doc.type === "found" ? t("recuperer_type_found") : t("recuperer_type_lost")}
                      </span>
                      <h1 className="text-white font-bricolage text-xl font-black">
                        {doc.docTypeInfo?.nom || doc.document_type || "Document"}
                        {doc.numero_document ? ` — N° ${doc.numero_document}` : ""}
                      </h1>
                    </div>
                    {getCost(doc) > 0 && (
                      <div className="bg-white/90 backdrop-blur rounded-xl px-3 py-2 text-center">
                        <p className="text-[18px] font-bricolage font-black text-primary">
                          {getCost(doc).toLocaleString("fr-FR")}
                        </p>
                        <p className="text-[9px] font-bold text-textMuted uppercase tracking-wider">{t("recuperer_label_fee")}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <h2 className="font-bricolage text-base font-black text-textMain mb-3">{t("Détails du document")}</h2>
                      <div className="space-y-2.5">
                        <Row label="Type" value={doc.docTypeInfo?.nom || doc.document_type || "—"} />
                        <Row label="Numéro" value={doc.numero_document || doc.document_number || "—"} />
                        <Row label="Nom sur le doc" value={doc.nom_complet || doc.owner_name || "—"} />
                        <Row label="Date de perte" value={formatDate(doc.date_perte)} />
                        <Row label="Lieu" value={doc.lieu_perte || doc.ville || "—"} />
                        <Row label="Frais" value={formatCost(doc)} />
                      </div>
                    </div>
                    <div>
                      <h2 className="font-bricolage text-base font-black text-textMain mb-3">Contact du propriétaire</h2>
                      {paid ? (
                        <div className="bg-green-light/50 rounded-[16px] p-4 border border-green-mid/20">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bricolage font-black text-lg">
                              {(doc.nom_owner || doc.nom_complet || "?").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-[14px] font-bold text-textMain">{doc.nom_owner || doc.nom_complet || "Propriétaire"}</p>
                              <p className="text-[11px] text-textMuted">Propriétaire du document</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {doc.telephone_owner && (
                              <a href={`tel:${doc.telephone_owner}`} className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl text-[12px] font-semibold text-green-mid hover:bg-green-dark hover:text-white transition-all">
                                <i className="fa-solid fa-phone" /> {doc.telephone_owner}
                              </a>
                            )}
                            {doc.email_owner && (
                              <a href={`mailto:${doc.email_owner}`} className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl text-[12px] font-semibold text-primary hover:bg-primary hover:text-white transition-all">
                                <i className="fa-solid fa-envelope" /> {doc.email_owner}
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-bgMain rounded-[16px] p-5 border border-borda text-center">
                          <div className="w-12 h-12 rounded-full bg-borda flex items-center justify-center mx-auto mb-3">
                            <i className="fa-solid fa-lock text-textMuted text-lg" />
                          </div>
                          <p className="text-[12px] font-bold text-textMain mb-1">Coordonnées verrouillées</p>
                          <p className="text-[11px] text-textMuted mb-4">Effectuez le paiement pour débloquer les coordonnées du propriétaire.</p>
                          {!collected && (
                            <button
                              onClick={() => setShowPaymentModal(true)}
                              className="w-full py-2.5 bg-primary text-white rounded-xl text-[12px] font-bold hover:bg-primary-dark transition-all active:scale-[.98]"
                            >
                              Payer maintenant
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="bg-white rounded-[20px] overflow-hidden border border-borda shadow-sm">
                <div className="p-5 sm:p-6 pb-0">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <i className="fa-solid fa-map-location-dot text-primary text-sm" />
                    </div>
                    <div>
                      <h2 className="font-bricolage text-base font-black text-textMain">Lieu de découverte</h2>
                      <p className="text-[11px] text-textMuted">
                        {paid ? "Le document a été trouvé à cet endroit." : "Payez pour voir l'emplacement exact."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="relative mx-5 sm:mx-6 mb-5 sm:mb-6 rounded-xl overflow-hidden border border-borda isolate">
                  <div ref={mapRef} className="w-full h-56 sm:h-64"></div>
                  {!paid && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[3px] flex flex-col items-center justify-center z-[100] transition-all">
                      <div className="w-16 h-16 rounded-2xl bg-white border border-borda shadow-xl flex items-center justify-center mb-3">
                        <i className="fa-solid fa-lock text-[#D98A30] text-2xl" />
                      </div>
                      <p className="text-[14px] font-bold text-textMain mb-0.5">Carte verrouillée</p>
                      <p className="text-[11px] text-textMuted mb-4 max-w-[200px] text-center">Payez les frais pour voir le lieu exact de découverte.</p>
                      {!collected && (
                        <button
                          onClick={() => setShowPaymentModal(true)}
                          className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl text-[12px] font-bold hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[.98]"
                        >
                          <i className="fa-solid fa-lock-open mr-1.5" />
                           Payer — {formatCost(doc)}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Action card (desktop) */}
            <div className="hidden lg:block">
              <div className="bg-white rounded-[20px] border border-borda shadow-sm p-5 sticky top-24">
                <div className="text-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <i className="fa-solid fa-wallet text-primary text-xl" />
                  </div>
                  <h3 className="font-bricolage text-base font-black text-textMain">Frais de récupération</h3>
                  <p className="text-[28px] font-bricolage font-black text-primary mt-1">
                    {formatCost(doc)}
                  </p>
                </div>

                {collected ? (
                  <div className="p-3 bg-green-light rounded-xl flex items-center gap-2.5">
                    <i className="fa-solid fa-circle-check text-green-mid" />
                    <span className="text-[12px] font-bold text-green-dark">Document récupéré</span>
                  </div>
                ) : paid ? (
                  <div className="space-y-2.5">
                    <div className="p-3 bg-green-light/50 rounded-xl flex items-center gap-2.5">
                      <i className="fa-solid fa-circle-check text-green-mid" />
                      <span className="text-[12px] font-bold text-green-dark">Paiement confirmé</span>
                    </div>
                    <Link
                      to={`/recuperer?id=${docId}`}
                      className="block w-full py-2.5 bg-primary text-white rounded-xl text-[12px] font-bold text-center hover:bg-primary-dark transition-all active:scale-[.98]"
                    >
                      Voir les coordonnées
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full py-3 bg-primary text-white rounded-xl font-bricolage text-[14px] font-bold hover:bg-primary-dark transition-all active:scale-[.98]"
                    >
                      <i className="fa-solid fa-lock-open mr-1.5" />
                      Payer les frais
                    </button>
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Pourquoi payer ?</p>
                      <p className="text-[11px] text-textMuted">
                        Le paiement sécurise la transaction et débloque les coordonnées du propriétaire pour organiser la récupération.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Polling indicator */}
          {step === 2 && !pickupCode && (
            <div className="fixed bottom-20 left-4 right-4 lg:bottom-24 lg:left-auto lg:right-6 lg:w-80 z-30">
              <div className="bg-white border border-primary/30 rounded-[16px] p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  <div>
                    <p className="text-[12px] font-bold text-textMain">Confirmation en cours...</p>
                    <p className="text-[10px] text-textMuted">Veuillez confirmer le paiement sur votre téléphone.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      {!collected && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-borda px-4 py-3 lg:hidden z-[60]">
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
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-[13px] font-bold hover:bg-primary-dark transition-all active:scale-[.98]"
              >
                Payer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => { if (!payProcessing) setShowPaymentModal(false); }}
        onPay={handlePay}
        amount={getCost(doc)}
        title="Paiement des frais"
        description="Effectuez le paiement pour débloquer les coordonnées du propriétaire et voir le lieu exact de découverte."
        processing={payProcessing}
        error={payError}
        termsText={
          <>
            En effectuant ce paiement, vous acceptez les <Link to="/conditions" className="text-primary underline">conditions d'utilisation</Link>.
            Le montant sera reversé au trouveur après récupération du document.
          </>
        }
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[12px] text-textMuted">{label}</span>
      <span className="text-[12px] font-semibold text-textMain">{value}</span>
    </div>
  );
}
