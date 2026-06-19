import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { declarationsService } from "../../services/declarationsService";
import { claimsService } from "../../services/claimsService";
import type { Declaration } from "../../types/api";
import Topbar from "../../layout/Topbar";
import { useI18n } from "../../context/I18nContext";

const CODE_LENGTH = 6;

export default function ValidationRemise() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("id");

  const [doc, setDoc] = useState<Declaration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!docId) { setLoading(false); return; }
    setLoading(true);
    declarationsService.getById(docId)
      .then((res) => {
        if (res.success && res.data) {
          setDoc(res.data);
        } else {
          setError(t("recuperer_not_found"));
        }
      })
      .catch((e: any) => {
        setError(e.response?.data?.message || e.response?.data?.error || t("recuperer_load_error"));
      })
      .finally(() => setLoading(false));
  }, [docId, t]);

  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setAlertMsg(null);

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const newCode = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    const nextIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const submitValidation = async () => {
    const fullCode = code.join("");
    if (fullCode.length < CODE_LENGTH) {
      setAlertMsg("Veuillez entrer le code complet à 6 chiffres.");
      return;
    }

    if (!docId) {
      setAlertMsg("ID du document manquant.");
      return;
    }

    setValidating(true);
    setAlertMsg(null);

    try {
      const result = await claimsService.validateRecoveryCode({
        claim_id: docId || "",
        code: fullCode,
      });

      if (result.success) {
        setValidated(true);
      } else {
        setAlertMsg(result.message || "Code invalide. Veuillez réessayer.");
        setCode(Array(CODE_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || e.response?.data?.error || "Erreur de connexion au serveur.";
      setAlertMsg(msg);
    } finally {
      setValidating(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────
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

  function getDocTypeName(): string {
    return doc?.docTypeInfo?.nom || doc?.document_type || doc?.doc_type || "Document";
  }

  const rewardAmount = (doc as any)?.reward_amount || 1500;
  const rewardPoints = (doc as any)?.reward_points || 50;
  const ownerPaid = doc?.status === "PAID" || doc?.status === "paid" || doc?.status === "MATCHED" || doc?.status === "RESOLVED" || doc?.status === "RETURNED";
  const displayStep = validated ? 4 : ownerPaid ? 3 : 2;
  const stepLabels = ["Signalé", "Correspondance", "En attente", "Validation"];

  // ── Render helpers ───────────────────────────────────────────────────
  function renderTimeline() {
    return stepLabels.map((label, i) => {
      const idx = i;
      const isDone = idx < displayStep;
      const isActive = idx === displayStep;

      let dotCls = "timeline-dot relative z-10 w-[28px] h-[28px] rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-300";
      let lineCls = "absolute left-[13px] top-[28px] bottom-0 w-[2px] z-0 transition-all duration-300";
      let titleCls = "text-[14px] font-bold transition-colors duration-300";
      let descCls = "text-[11.5px] text-textMuted mt-1 leading-relaxed";

      if (isDone) {
        dotCls += " bg-green-500 text-white shadow-lg shadow-green-100";
        lineCls += " bg-green-500";
        titleCls += " text-textMain";
      } else if (isActive) {
        dotCls += " bg-primary text-white shadow-xl shadow-primary/30 ring-4 ring-white";
        lineCls += " bg-gradient-to-b from-primary to-borderMain";
        titleCls += " text-primary";
      } else {
        dotCls += " bg-white border-2 border-borderMain text-textMuted";
        lineCls += " bg-borderMain";
        titleCls += " text-textMuted";
        descCls += " text-textMuted";
      }

      const descriptions = [
        `Le ${formatDate(doc?.created_at)}`,
        "Un propriétaire potentiel a été identifié",
        "En attente de confirmation du propriétaire",
        "Saisie du code pour confirmer la remise",
      ];

      return (
        <div key={idx} className="timeline-item relative pl-[48px] pb-[40px] last:pb-0">
          <div className={dotCls}>
            {isDone ? (
              <i className="fa-solid fa-check text-[10px]" />
            ) : isActive || true ? (
              <span className="text-[11px]">{idx + 1}</span>
            ) : null}
          </div>
          {i < stepLabels.length - 1 && <div className={lineCls} />}
          <div className="pt-0.5">
            <div className="flex items-center gap-2 mb-1">
              <p className={titleCls}>{label}</p>
              {isDone && (
                <span className="text-[9px] bg-green-100 text-green-700 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-tighter">
                  Complété
                </span>
              )}
              {isActive && idx === 2 && (
                <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full uppercase">
                  Action client
                </span>
              )}
            </div>
            <p className={descCls}>{descriptions[idx]}</p>
          </div>
        </div>
      );
    });
  }

  // ── No docId ─────────────────────────────────────────────────────────
  if (!docId) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Validation de remise" breadcrumbs={[{ label: "Validation" }]} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-borderMain p-8 max-w-md w-full text-center shadow-sm">
            <div className="w-16 h-16 bg-bgMain rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-file-circle-question text-textMuted text-2xl" />
            </div>
            <h1 className="font-bricolage text-xl font-black text-textMain mb-2">Document introuvable</h1>
            <p className="text-textMuted text-[13px] mb-6">Aucun ID de déclaration fourni.</p>
            <Link to="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-[13px] hover:bg-primary-dark transition-all">
              <i className="fa-solid fa-arrow-left text-[11px]" /> Retour au dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Validation de remise" breadcrumbs={[{ label: "Validation" }]} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-11 h-11 rounded-full border-[3px] border-black/10 border-t-primary animate-spin" />
            <p className="text-textMuted text-[13px] font-medium">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (error || !doc) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Validation de remise" breadcrumbs={[{ label: "Validation" }]} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-borderMain p-8 max-w-md w-full text-center shadow-sm">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-circle-exclamation text-red-400 text-2xl" />
            </div>
            <h1 className="font-bricolage text-xl font-black text-textMain mb-2">Document introuvable</h1>
            <p className="text-textMuted text-[13px] mb-6">{error}</p>
            <Link to="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-[13px] hover:bg-primary-dark transition-all">
              <i className="fa-solid fa-arrow-left text-[11px]" /> Retour au dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Success screen ───────────────────────────────────────────────────
  if (validated) {
    return (
      <div className="flex flex-col h-full">
        <Topbar
          title="Validation réussie"
          breadcrumbs={[
            { label: "Mes déclarations", href: "/mes-declarations" },
            { label: "Validation" },
          ]}
        />
        <div className="custom-scroll flex-1 p-4 sm:p-6 space-y-5 pb-28 lg:pb-6 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">
          <div className="max-w-lg mx-auto pt-12">
            <div className="bg-white rounded-[32px] border border-green-200 shadow-xl p-10 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-circle-check text-green-500 text-4xl" />
              </div>
              <h2 className="font-bricolage text-2xl font-black text-green-dark mb-2">
                ✅ Code validé avec succès !
              </h2>
              <p className="text-[14px] text-textMuted mb-8 leading-relaxed">
                Félicitations ! Votre gain a été versé sur votre compte DocMaster.
                Vous pouvez vérifier votre solde dans la section Mes Gains.
              </p>
              <div className="bg-green-light/50 border border-green-200 rounded-2xl p-6 mb-8">
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">
                  Gains crédités
                </p>
                <p className="font-bricolage text-3xl font-extrabold text-green-dark">
                  +{rewardAmount.toLocaleString("fr-FR")} FCFA
                </p>
                <p className="text-[12px] text-green-600/80 mt-1">
                  +{rewardPoints} points DocMaster
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/mes-gains"
                  className="py-3.5 bg-primary text-white rounded-xl font-bold text-[13px] hover:bg-primary-dark transition-all"
                >
                  Voir mes gains
                </Link>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="py-3.5 bg-surface2 border border-borderMain text-textMain rounded-xl font-bold text-[13px] hover:border-primary transition-all"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main View ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={`Remise : ${getDocTypeName()}`}
        breadcrumbs={[
          { label: "Mes déclarations", href: "/mes-declarations" },
          { label: "Validation" },
        ]}
      />

      <div className="custom-scroll flex-1 p-4 sm:p-6 space-y-5 pb-28 lg:pb-6 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Progress Banner */}
          <div className="bg-green-dark rounded-[24px] p-6 text-white flex flex-col sm:flex-row items-center gap-5 shadow-xl shadow-green-950/20 relative overflow-hidden">
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl" />
            <div className="w-14 h-14 rounded-[18px] bg-white/10 flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-hand-holding-heart text-primary text-2xl animate-pulse" />
            </div>
            <div className="flex-1 w-full">
              <p className="text-[11px] text-white/50 uppercase font-black tracking-widest mb-1.5">
                Statut de votre signalement
              </p>
              <div className="flex items-center justify-between mb-2">
                <p className="font-bricolage text-[16px] font-bold text-white">
                  {ownerPaid
                    ? "Propriétaire a payé — Prêt pour validation"
                    : "Propriétaire notifié — En attente d'action"}
                </p>
                <p className="font-bricolage text-2xl font-extrabold text-primary">
                  {displayStep * 25}%
                </p>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-1000"
                  style={{ width: `${displayStep * 25}%` }}
                />
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Timeline & Gains */}
            <div className="lg:col-span-7 space-y-6">
              {/* Timeline */}
              <div className="bg-white rounded-[32px] border border-borderMain p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="font-bricolage text-lg font-bold text-textMain">
                    Historique du signalement
                    {doc.identifiant_doc_dm && (
                      <span className="text-textMuted font-medium ml-2 text-sm">
                        #{doc.identifiant_doc_dm}
                      </span>
                    )}
                  </h3>
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold border border-green-100">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                    {validated ? "Validé" : "ACTIF"}
                  </span>
                </div>
                <div className="relative">{renderTimeline()}</div>
              </div>

              {/* Gains Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white rounded-[32px] border border-borderMain p-6 shadow-sm flex items-center gap-5">
                  <div className="w-14 h-14 rounded-[22px] bg-orange-50 flex items-center justify-center text-primary-dark border border-orange-100">
                    <i className="fa-solid fa-coins text-2xl" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-0.5">
                      Gains monétaires
                    </p>
                    <p className="font-bricolage text-2xl font-extrabold text-textMain">
                      {rewardAmount.toLocaleString("fr-FR")}{" "}
                      <span className="text-xs text-textMuted font-bold">FCFA</span>
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-[32px] border border-borderMain p-6 shadow-sm flex items-center gap-5">
                  <div className="w-14 h-14 rounded-[22px] bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
                    <i className="fa-solid fa-star text-2xl" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-0.5">
                      Récompense sociale
                    </p>
                    <p className="font-bricolage text-2xl font-extrabold text-purple-700">
                      +{rewardPoints}{" "}
                      <span className="text-xs text-textMuted font-bold">Points</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Code Validation & Summary */}
            <div className="lg:col-span-5 space-y-6">
              {/* Code Validation Card */}
              <div className="bg-white rounded-[40px] border-2 border-borderMain p-8 text-center shadow-sm relative">
                <div className="w-20 h-20 rounded-full bg-surface2 border border-borderMain flex items-center justify-center mx-auto mb-6 shadow-inner relative">
                  <i className="fa-solid fa-key text-primary text-3xl" />
                  <div className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-white border border-borderMain flex items-center justify-center shadow-sm">
                    <i className="fa-solid fa-shield-halved text-[10px] text-green-600" />
                  </div>
                </div>

                <h4 className="font-bricolage text-xl font-bold text-textMain mb-3">
                  Validation de la remise
                </h4>
                <p className="text-[12px] text-textMuted leading-relaxed mb-8 px-2">
                  Une fois en agence ou face au propriétaire, saisissez le code qu'il vous fournira.
                </p>

                {alertMsg && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-600 font-semibold flex items-center gap-2">
                    <i className="fa-solid fa-circle-exclamation" />
                    {alertMsg}
                  </div>
                )}

                <div className="flex flex-col gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest mb-4">
                      Entrez le code de sécurité
                    </p>
                    <div
                      className="flex justify-center gap-2 sm:gap-3"
                      onPaste={handleCodePaste}
                    >
                      {code.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { inputRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodeInput(i, e.target.value)}
                          onKeyDown={(e) => handleCodeKeyDown(i, e)}
                          className="w-11 sm:w-12 h-14 sm:h-16 bg-surface2 border border-borderMain rounded-2xl text-center font-bricolage text-xl sm:text-2xl font-bold text-textMain focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-inner"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={submitValidation}
                    disabled={validating}
                    className="w-full py-5 bg-green-dark text-white rounded-[24px] text-sm font-bold shadow-xl shadow-green-900/20 hover:bg-green-mid hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {validating ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin" />
                        Validation en cours...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-hand-holding-dollar" />
                        Valider la remise & Percevoir les gains
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-textMuted italic flex items-center justify-center gap-2">
                    <i className="fa-solid fa-lock text-[8px]" />
                    Le code sera débloqué par le propriétaire dès qu'il aura payé les frais de logistique.
                  </p>
                </div>
              </div>

              {/* Document Summary */}
              <div className="bg-white rounded-[32px] border border-borderMain p-6 shadow-sm space-y-6">
                <p className="text-[11px] font-bold text-textMuted uppercase tracking-widest">
                  Résumé de l'objet trouvé
                </p>

                <div className="space-y-4">
                  <div className="aspect-video rounded-2xl bg-surface2 border border-borderMain overflow-hidden relative group">
                    {doc.photo_recto ? (
                      <img
                        src={getImageUrl(doc.photo_recto)}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        alt="Document"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-textMuted/40">
                        <i className="fa-solid fa-image text-3xl mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">
                          Aperçu indisponible
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-surface2 rounded-2xl border border-borderMain/50">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center border border-borderMain shadow-sm">
                      <i className="fa-solid fa-file-invoice text-textMuted" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-textMain">
                        {getDocTypeName()} {doc.numero_document ? `N° ${doc.numero_document}` : ""}
                      </p>
                      <p className="text-[10px] text-textMuted italic">
                        <i className="fa-solid fa-location-dot mr-1" />
                        Trouvée à : {doc.ville || "Non spécifié"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-textMuted font-medium italic">Récompense civique</span>
                    <span className="font-bold text-green-600">
                      +{Math.round(rewardAmount * 0.8).toLocaleString("fr-FR")} FCFA
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-textMuted font-medium italic">Frais de conservation</span>
                    <span className="font-bold text-textMain">
                      +{Math.round(rewardAmount * 0.2).toLocaleString("fr-FR")} FCFA
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-dashed border-borderMain space-y-3">
                  <p className="text-[10px] font-bold text-textMain uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-shield-halved text-green-600" />
                    Instructions de sécurité :
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-[10.5px] text-textMuted italic leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />
                      Ne remettez l'objet que si l'agent d'agence valide le code.
                    </li>
                    <li className="flex items-start gap-2 text-[10.5px] text-textMuted italic leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />
                      Vos gains arriveront sur votre compte DocMaster.
                    </li>
                  </ul>
                </div>

                <button className="w-full py-4 border border-borderMain rounded-2xl text-[11px] font-bold text-textMain hover:bg-surface2 transition-all flex items-center justify-center gap-2">
                  <i className="fa-solid fa-headset text-primary" />
                  Besoin d'aide personnalisé ?
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-borderMain/80 p-4 z-40 flex items-center justify-between gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[12.5px] font-black text-textMain truncate">
              {getDocTypeName()}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            <span className="text-[12px] text-green-600 font-black">
              +{rewardAmount.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-textMuted font-medium">
            <span className="truncate">{doc.ville || "En agence"}</span>
            <span>•</span>
            <span className="font-bold text-primary">Validation Requise</span>
          </div>
        </div>
        <button
          onClick={submitValidation}
          disabled={validating || code.join("").length < CODE_LENGTH}
          className="px-5 py-3 bg-green-dark hover:bg-green-mid text-white rounded-2xl font-bricolage font-black text-[12px] shadow-lg shadow-green-900/20 transition-all flex-shrink-0 active:scale-[0.97] disabled:opacity-50"
        >
          {validating ? (
            <i className="fa-solid fa-circle-notch fa-spin" />
          ) : (
            "Valider"
          )}
        </button>
      </div>
    </div>
  );
}
