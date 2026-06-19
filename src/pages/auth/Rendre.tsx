import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { declarationsService } from "../../services/declarationsService";
import { claimsService } from "../../services/claimsService";
import type { Declaration } from "../../types/api";
import Topbar from "../../layout/Topbar";
import { useI18n } from "../../context/I18nContext";

const POLL_INTERVAL = 5000;

export default function Rendre() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("id");

  const [doc, setDoc] = useState<Declaration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [ownerPaid, setOwnerPaid] = useState(false);
  const [claimReady, setClaimReady] = useState(false);

  // Code inputs
  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);
  const [codeValues, setCodeValues] = useState(["", "", "", "", "", ""]);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [codeError, setCodeError] = useState("");

  // ── Load declaration ──────────────────────────────────────────────────
  useEffect(() => {
    if (!docId) { setLoading(false); return; }
    setLoading(true);
    declarationsService.getRenderContext(docId)
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          setDoc(d);
          const ps = (d.payment_status || "").toUpperCase();
          const ds = (d.status || "").toUpperCase();
          if (ps === "PAID" || ds === "PAID" || ds === "RETURNED" || d.claim?.status === "PAID" || d.claim?.status === "VALIDATED") {
            setOwnerPaid(true);
          }
          if (d.claim || (d as any).matches?.length > 0) {
            setClaimReady(true);
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
    if (ownerPaid || !docId) return;
    const interval = setInterval(async () => {
      try {
        const res = await declarationsService.getRenderContext(docId);
        if (res.success && res.data) {
          const d = res.data;
          const ps = (d.payment_status || "").toUpperCase();
          const ds = (d.status || "").toUpperCase();
          if (ps === "PAID" || ds === "PAID" || ds === "RETURNED" || d.claim?.status === "PAID" || d.claim?.status === "VALIDATED") {
            setOwnerPaid(true);
            setDoc(d); // Update doc to get latest info
            clearInterval(interval);
          }
          if (d.claim || (d as any).matches?.length > 0) {
            setClaimReady(true);
          }
        }
      } catch { /* silent */ }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [ownerPaid, docId]);

  // ── Helpers ──────────────────────────────────────────────────────────
  const getDocType = () => {
    return (doc as any)?.docTypeInfo?.nom || (doc as any)?.doc_type || doc?.document_type || "Document";
  };
  const getOwnerName = () => {
    const cp = (doc as any)?.counterPart;
    if (cp?.prenom || cp?.nom) return `${cp.prenom || ""} ${cp.nom || ""}`.trim();
    const cpDecl = (doc as any)?.counterPartDeclaration;
    if (cpDecl?.owner_name) return cpDecl.owner_name;
    return doc?.owner_name || "Propriétaire";
  };
  const getRef = () => (doc as any)?.identifiant_doc_dm || (doc as any)?.reference || "—";
  const getRewardAmount = () => Number((doc as any)?.reward_amount || doc?.recompense_montant || 0);
  const getRewardPoints = () => Number((doc as any)?.reward_points || 50);
  const getPhotoUrl = () => {
    const raw = (doc as any)?.photo_recto || doc?.photo_recto;
    if (!raw) return null;
    return raw.startsWith("http") || raw.startsWith("data:") ? raw : raw;
  };
  const getDocNumber = () => (doc as any)?.document_number || doc?.numero_document || doc?.document_number || "—";
  const getVille = () => doc?.ville || (doc as any)?.found_location?.city || "—";
  const getCreatedAt = () => doc?.created_at || "";
  const isMatched = () => claimReady || doc?.status === "MATCHED" || doc?.status === "PAID" || doc?.status === "RETURNED";
  const getStatusLabel = () => {
    if (validated || doc?.status === "RETURNED") return "REMIS";
    if (ownerPaid) return "PAYÉ";
    if (isMatched()) return "MATCHÉ";
    return "DISPONIBLE";
  };

  // ── Code input handlers ──────────────────────────────────────────────
  const handleCodeInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...codeValues];
    next[idx] = val.slice(-1);
    setCodeValues(next);
    setCodeError("");
    if (val && idx < 5) codeInputs.current[idx + 1]?.focus();
  };

  const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !codeValues[idx] && idx > 0) {
      codeInputs.current[idx - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
    setCodeValues(next);
    codeInputs.current[Math.min(digits.length, 5)]?.focus();
  };

  const handleValidate = async () => {
    const fullCode = codeValues.join("");
    if (fullCode.length < 6) {
      setCodeError("Veuillez entrer le code complet à 6 chiffres.");
      return;
    }
    if (!docId) return;
    setValidating(true);
    setCodeError("");
    try {
      const result = await declarationsService.validateRecovery(docId, fullCode);
      if (result.success) {
        setValidated(true);
        setTimeout(() => navigate("/dashboard"), 2500);
      } else {
        setCodeError(result.message || "Code invalide. Veuillez réessayer.");
        setCodeValues(["", "", "", "", "", ""]);
        codeInputs.current[0]?.focus();
      }
    } catch (e: any) {
      setCodeError(e.response?.data?.message || "Erreur de connexion au serveur.");
    } finally {
      setValidating(false);
    }
  };

  // ── Progress ─────────────────────────────────────────────────────────
  const progressPct = validated || doc?.status === "RETURNED" ? 100 : ownerPaid ? 75 : isMatched() ? 50 : 25;

  // ── Loading / Error ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-bgMain flex flex-col">
        <Topbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-textMuted text-sm">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-bgMain flex flex-col">
        <Topbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-circle-exclamation text-red-400 text-2xl" />
            </div>
            <p className="text-textMain font-bold mb-2">{t("recuperer_not_found")}</p>
            <p className="text-textMuted text-sm mb-6">{error || t("recuperer_load_error")}</p>
            <Link to="/dashboard" className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all">
              {t("Retourner au dashboard")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bgMain flex flex-col">
      <Topbar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 custom-scrollbar pt-8">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* ═══ Status Banner ═══ */}
          <div className="bg-green-dark rounded-[28px] p-6 text-white flex flex-col sm:flex-row items-center gap-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent" />
            <div className="w-16 h-16 rounded-[22px] bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/10 shadow-inner">
              <i className={`fa-solid ${validated || doc?.status === "RETURNED" ? "fa-circle-check" : ownerPaid ? "fa-check-circle" : "fa-heart-pulse"} text-primary text-3xl ${!ownerPaid && !validated ? "animate-pulse" : ""}`} />
            </div>
            <div className="flex-1 w-full">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em] mb-1">Signalement #{getRef()}</p>
                  <h2 className="font-bricolage text-lg font-bold text-white flex items-center gap-2">
                    {validated || doc?.status === "RETURNED" 
                      ? "Document remis avec succès !" 
                      : ownerPaid 
                        ? "Propriétaire identifié — Prêt pour remise" 
                        : claimReady 
                          ? "Correspondance trouvée — En attente du proprio"
                          : "Document enregistré — Recherche de propriétaire"}
                  </h2>
                </div>
                <span className="font-bricolage text-3xl font-black text-white/20">{progressPct}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div
                  className="bg-gradient-to-r from-primary to-primary/60 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* ═══ Main Grid ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* ── Left Side: Timeline + Gains ── */}
            <div className="lg:col-span-7 space-y-8">

              {/* Timeline Card */}
              <div className="bg-white rounded-[32px] border border-borderMain p-8 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="font-bricolage text-lg font-bold text-textMain">
                    Historique du signalement (NHR: {getRef()})
                  </h3>
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
                    validated || doc?.status === "RETURNED" 
                      ? "bg-blue-50 text-blue-700 border-blue-100" 
                      : "bg-green-50 text-green-700 border-green-100"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${validated ? "bg-blue-500" : "bg-green-500 animate-ping"}`} /> {getStatusLabel()}
                  </span>
                </div>

                <div className="relative">
                  {/* Step 1: Document signalé */}
                  <div className="timeline-item">
                    <div className="timeline-dot step-done"><i className="fa-solid fa-check" /></div>
                    <div className="timeline-line done" />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-[14px] font-bold text-textMain">Document signalé par vous</p>
                        <span className="px-2 py-0.5 bg-green-light text-green-700 rounded text-[9px] font-bold uppercase">Complété</span>
                      </div>
                      <p className="text-[11px] text-textMuted mb-4">
                        {getCreatedAt() ? `Le ${new Date(getCreatedAt()).toLocaleDateString("fr-FR")} à ${new Date(getCreatedAt()).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                      </p>
                      <div className="bg-surface2 border border-borderMain rounded-2xl p-4 flex items-center gap-4 group hover:border-primary/40 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                          <i className="fa-solid fa-id-card text-lg" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-textMain">{getDocType()}</p>
                          <p className="text-[10px] text-textMuted italic font-medium">Référence : {getRef()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Correspondance */}
                  <div className="timeline-item">
                    <div className={`timeline-dot ${isMatched() ? "step-done" : "step-active"}`}>
                      <i className={`fa-solid ${isMatched() ? "fa-check" : "fa-magnifying-glass text-[10px]"}`} />
                    </div>
                    <div className={`timeline-line ${isMatched() ? "done" : ""}`} />
                    <div>
                      <p className="text-[14px] font-bold text-textMain mb-1">
                        {isMatched() ? "Correspondance établie" : "Recherche de correspondance"}
                      </p>
                      <p className="text-[11px] text-textMuted mb-4">
                        {isMatched() 
                          ? "Un propriétaire a été identifié et a initié la procédure de récupération." 
                          : "Notre algorithme recherche activement le propriétaire de ce document."}
                      </p>
                      {isMatched() && (
                        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-left-2">
                          <div className="w-10 h-10 rounded-xl bg-green-dark flex items-center justify-center text-white shadow-lg">
                            <i className="fa-solid fa-user-check text-lg" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] font-bold text-green-900">Propriétaire : {getOwnerName()}</p>
                            <p className="text-[11px] text-green-700/80 leading-relaxed italic">
                              Le propriétaire a validé son identité et attend de recevoir le document.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Paiement */}
                  <div className="timeline-item">
                    <div className={`timeline-dot ${ownerPaid ? "step-done" : isMatched() ? "step-active" : "step-pending"}`}>
                      <i className={`fa-solid ${ownerPaid ? "fa-check" : "fa-hourglass-start text-[10px]"}`} />
                    </div>
                    <div className={`timeline-line ${ownerPaid ? "done" : ""}`} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-[14px] font-bold ${ownerPaid ? "text-green-600" : isMatched() ? "text-primary" : "text-textMuted"}`}>
                          {ownerPaid ? "Paiement confirmé" : "En attente de paiement"}
                        </p>
                        {isMatched() && (
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            ownerPaid
                              ? "bg-green-light text-green-700"
                              : "bg-primary-light text-primary-dark"
                          }`}>
                            {ownerPaid ? "Complété" : "Action proprio"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-textMuted leading-relaxed">
                        {ownerPaid
                          ? "Le propriétaire a réglé les frais de logistique et de récompense."
                          : isMatched() 
                            ? "Nous attendons que le propriétaire effectue le paiement pour générer votre code de remise."
                            : "Cette étape sera activée dès qu'un propriétaire sera identifié."}
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Validation */}
                  <div className="timeline-item pb-0">
                    <div className={`timeline-dot ${validated || doc?.status === "RETURNED" ? "step-done" : ownerPaid ? "step-active" : "step-pending"}`}>
                      {validated || doc?.status === "RETURNED"
                        ? <i className="fa-solid fa-check" />
                        : ownerPaid
                          ? <i className="fa-solid fa-key text-[10px]" />
                          : <span className="text-[10px] font-bold">4</span>}
                    </div>
                    <div>
                      <p className={`text-[14px] font-bold ${validated || doc?.status === "RETURNED" ? "text-green-600" : ownerPaid ? "text-primary" : "text-textMuted"}`}>
                        {validated || doc?.status === "RETURNED" ? "Remise effectuée" : "Code de validation"}
                      </p>
                      <p className="text-[11.5px] text-textMuted mt-1">
                        {validated || doc?.status === "RETURNED"
                          ? "Félicitations ! Le document a été remis et vos récompenses créditées."
                          : "Une fois le document remis physiquement, le propriétaire vous donnera un code à 6 chiffres."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gains Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white rounded-[32px] border border-borderMain p-6 shadow-sm flex items-center gap-5 transition-transform hover:scale-[1.02]">
                  <div className="w-14 h-14 rounded-[22px] bg-orange-50 flex items-center justify-center text-primary-dark border border-orange-100 shadow-sm">
                    <i className="fa-solid fa-coins text-2xl" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-0.5">Votre récompense</p>
                    <p className="font-bricolage text-2xl font-extrabold text-textMain">
                      {getRewardAmount().toLocaleString("fr-FR")} <span className="text-xs text-textMuted font-bold uppercase">XAF</span>
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-[32px] border border-borderMain p-6 shadow-sm flex items-center gap-5 transition-transform hover:scale-[1.02]">
                  <div className="w-14 h-14 rounded-[22px] bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100 shadow-sm">
                    <i className="fa-solid fa-medal text-2xl" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-0.5">Points de civisme</p>
                    <p className="font-bricolage text-2xl font-extrabold text-purple-700">
                      +{getRewardPoints()} <span className="text-xs text-textMuted font-bold uppercase">Pts</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Side: Validation + Summary ── */}
            <div className="lg:col-span-5">
              <div className="sticky top-24 space-y-8">

                {/* Validation Card */}
                <div className="bg-white rounded-[40px] border border-borderMain p-10 shadow-sm text-center relative overflow-hidden">
                  {validated && (
                    <div className="absolute inset-0 bg-green-500/5 pointer-events-none" />
                  )}
                  
                  <div className="w-20 h-20 rounded-full bg-surface2 border border-borderMain flex items-center justify-center mx-auto mb-6 shadow-inner relative">
                    <i className={`fa-solid ${validated || doc?.status === "RETURNED" ? "fa-circle-check text-green-500" : "fa-key text-primary"} text-3xl transition-all duration-500`} />
                    <div className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-white border border-borderMain flex items-center justify-center shadow-sm">
                      <i className="fa-solid fa-shield-halved text-[10px] text-green-600" />
                    </div>
                  </div>

                  <h4 className="font-bricolage text-xl font-bold text-textMain mb-3">
                    {validated || doc?.status === "RETURNED" ? "Remise confirmée !" : "Validation de la remise"}
                  </h4>
                  <p className="text-[12px] text-textMuted leading-relaxed mb-10 px-4">
                    {validated || doc?.status === "RETURNED"
                      ? "Vos gains ont été ajoutés à votre portefeuille. Merci pour votre civisme !"
                      : ownerPaid 
                        ? "Le propriétaire a payé. Saisissez le code de 6 chiffres qu'il vous présentera lors de la remise."
                        : "Cette section s'activera dès que le propriétaire aura réglé les frais de récupération."}
                  </p>

                  {!(validated || doc?.status === "RETURNED") && (
                    <div className="flex flex-col gap-8">
                      <div className={!ownerPaid ? "opacity-40 pointer-events-none grayscale" : ""}>
                        <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-4">
                          Code de sécurité à 6 chiffres
                        </p>
                        {codeError && (
                          <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[11px] font-semibold animate-shake">
                            <i className="fa-solid fa-circle-exclamation mr-1" /> {codeError}
                          </div>
                        )}
                        <div className="flex justify-center gap-2 sm:gap-3">
                          {codeValues.map((val, idx) => (
                            <input
                              key={idx}
                              ref={(el) => { codeInputs.current[idx] = el; }}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              autoComplete="one-time-code"
                              value={val}
                              disabled={validating || !ownerPaid}
                              onChange={(e) => handleCodeInput(idx, e.target.value)}
                              onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                              onPaste={handleCodePaste}
                              className={`w-10 sm:w-12 h-14 sm:h-16 bg-surface2 border border-borderMain rounded-2xl text-center font-bricolage text-xl sm:text-2xl font-bold text-textMain focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-inner ${ownerPaid ? "cursor-text" : "cursor-not-allowed"}`}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={handleValidate}
                        disabled={validating || codeValues.some((v) => !v) || !ownerPaid}
                        className={`w-full py-5 bg-green-dark text-white rounded-[24px] text-sm font-bold shadow-xl shadow-green-900/20 hover:bg-green-mid hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:hover:translate-y-0`}
                      >
                        {validating ? (
                          <><i className="fa-solid fa-circle-notch fa-spin" /> Validation...</>
                        ) : (
                          <><i className="fa-solid fa-hand-holding-dollar" /> {ownerPaid ? "Valider la remise" : "En attente du proprio"}</>
                        )}
                      </button>

                      <p className="text-[10px] text-textMuted italic flex items-center justify-center gap-2">
                        <i className="fa-solid fa-lock text-[8px]" />
                        {ownerPaid 
                          ? "Le code est en possession du propriétaire." 
                          : "Le code sera débloqué après paiement par le propriétaire."}
                      </p>
                    </div>
                  )}

                  {(validated || doc?.status === "RETURNED") && (
                    <div className="space-y-4 py-4 animate-in zoom-in duration-300">
                      <div className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-green-200">
                        <i className="fa-solid fa-check text-2xl" />
                      </div>
                      <Link
                        to="/dashboard"
                        className="block w-full py-4 bg-green-dark text-white rounded-2xl font-bold text-center hover:bg-green-mid transition-all shadow-md"
                      >
                        {t("Retourner au dashboard")}
                      </Link>
                    </div>
                  )}
                </div>

                {/* Document Summary Card */}
                <div className="bg-white rounded-[32px] border border-borderMain p-6 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] font-bold text-textMuted uppercase tracking-widest">Détails du document</p>
                    <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">NHR: {getRef()}</span>
                  </div>

                  <div className="space-y-4">
                    {/* Photo */}
                    <div className="aspect-video rounded-2xl bg-surface2 border border-borderMain overflow-hidden relative group">
                      {getPhotoUrl() ? (
                        <img
                          src={getPhotoUrl()!}
                          alt="Document"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-textMuted/40">
                          <i className="fa-solid fa-image text-3xl mb-2" />
                          <span className="text-[10px] font-bold uppercase tracking-tighter">Photo indisponible</span>
                        </div>
                      )}
                      <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[9px] text-white font-medium">
                        Aperçu sécurisé
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-surface2 rounded-2xl border border-borderMain/50">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center border border-borderMain shadow-sm">
                        <i className={`fa-solid fa-${(doc as any)?.docTypeInfo?.icone || "file-invoice"} text-textMuted text-lg`} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-textMain">{getDocType()}</p>
                        <p className="text-[10px] text-textMuted italic flex items-center gap-1">
                          <i className="fa-solid fa-location-dot" />
                          {getVille()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-textMuted font-medium">Numéro de document</span>
                      <span className="font-bold text-textMain">{getDocNumber()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-textMuted font-medium">Propriétaire déclaré</span>
                      <span className="font-bold text-textMain">{getOwnerName()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[12px] pt-2 border-t border-borderMain/30">
                      <span className="text-textMuted font-bold">Récompense totale</span>
                      <span className="font-bold text-green-600 text-[14px]">{getRewardAmount().toLocaleString("fr-FR")} XAF</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-dashed border-borderMain space-y-3">
                    <p className="text-[10px] font-bold text-textMain uppercase tracking-wider flex items-center gap-2">
                      <i className="fa-solid fa-shield-halved text-green-600" /> Sécurité de la remise :
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-[10.5px] text-textMuted italic leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />
                        Vérifiez toujours l'identité de la personne avant de remettre le document.
                      </li>
                      <li className="flex items-start gap-2 text-[10.5px] text-textMuted italic leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />
                        Le virement de {getRewardAmount().toLocaleString("fr-FR")} XAF est automatique après validation du code.
                      </li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Mobile Sticky Floating Bar ═══ */}
      {!(validated || doc?.status === "RETURNED") && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-borderMain/80 p-4 z-40 flex items-center justify-between gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] lg:hidden animate-in slide-in-from-bottom-full duration-500">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[12.5px] font-black text-textMain truncate">{getDocType()}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <span className="text-[12px] text-green-600 font-black">+{getRewardAmount().toLocaleString("fr-FR")} XAF</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-textMuted font-medium">
              <span className="truncate">Signalement #{getRef()}</span>
              <span>·</span>
              <span className={`font-bold ${ownerPaid ? "text-green-600" : "text-primary"}`}>
                {ownerPaid ? "Code requis" : "Attente proprio"}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              const el = document.querySelector("input[inputmode='numeric']");
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
              setTimeout(() => (el as HTMLInputElement)?.focus(), 500);
            }}
            disabled={!ownerPaid}
            className={`px-6 py-3 bg-green-dark text-white rounded-2xl font-bricolage font-black text-[12px] shadow-lg shadow-green-900/20 transition-all flex-shrink-0 active:scale-[0.97] disabled:opacity-40`}
          >
            {ownerPaid ? "Valider" : "S'activera"}
          </button>
        </div>
      )}
    </div>
  );
}
