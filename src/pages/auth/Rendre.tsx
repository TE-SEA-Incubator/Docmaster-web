import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent as ReactClipboardEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Badge, Button } from "@mantine/core";
import { useTopbar } from "../../hooks/useTopbar";
import { useTimingConfig } from "../../hooks/useTimingConfig";
import { declarationsService } from "../../services/declarationsService";
import type { Declaration } from "../../types/api";
import { useI18n } from "../../context/I18nContext";
import { ProtectedDocumentImage } from "../../components/ui/ProtectedDocumentImage";
import { FlowCard, FlowFact, FlowNotice, FlowStepper } from "../../components/recuperation/FlowUI";

export default function Rendre() {
  const { t, lang } = useI18n();
  const timing = useTimingConfig();
  useTopbar(t("rendre_title"), [
    { label: t("sidebar_dashboard"), href: "/dashboard" },
    { label: t("rendre_title") },
  ]);
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

  const locale = lang === "ar" ? "ar" : lang === "en" ? "en-GB" : "fr-FR";

  // ── Load declaration ──────────────────────────────────────────────────
  useEffect(() => {
    if (!docId) { setLoading(false); return; }
    setLoading(true);
    declarationsService.getRenderContext(docId)
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          // Une déclaration LOST appartient au propriétaire : c'est la page « Récupérer » qui le guide.
          if ((d.declaration_type || "").toUpperCase() === "LOST") {
            navigate(`/recuperer?id=${docId}`, { replace: true });
            return;
          }
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
  }, [docId, navigate, t]);

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
            setDoc(d);
            clearInterval(interval);
          }
          if (d.claim || (d as any).matches?.length > 0) {
            setClaimReady(true);
          }
        }
      } catch { /* le prochain cycle réessaie */ }
    }, timing.paymentPollIntervalMs);
    return () => clearInterval(interval);
  }, [ownerPaid, docId, timing.paymentPollIntervalMs]);

  // ── Helpers ──────────────────────────────────────────────────────────
  const getDocType = () => (doc as any)?.docTypeInfo?.nom || (doc as any)?.doc_type || doc?.document_type || t("recuperer_type_found");
  const getDocIcon = () => `fa-solid fa-${(doc as any)?.docTypeInfo?.icone || "file-invoice"}`;
  const getOwnerName = () => {
    const cp = (doc as any)?.counterPart;
    if (cp?.prenom || cp?.nom) return `${cp.prenom || ""} ${cp.nom || ""}`.trim();
    const cpDecl = (doc as any)?.counterPartDeclaration;
    if (cpDecl?.owner_name) return cpDecl.owner_name;
    return doc?.owner_name || t("recuperer_owner");
  };
  const getOwnerPhone = () => (doc as any)?.counterPart?.telephone || "";
  const getRef = () => (doc as any)?.identifiant_doc_dm || (doc as any)?.reference || "—";
  const getRewardAmount = () => Number((doc as any)?.reward_amount || doc?.recompense_montant || 0);
  const getRewardPoints = () => Number((doc as any)?.reward_points || 50);
  const getPhotoUrl = () => (doc as any)?.photo_recto || doc?.photo_recto || null;
  const getDocNumber = () => (doc as any)?.document_number || doc?.numero_document || "—";
  const getVille = () => doc?.ville || (doc as any)?.found_location?.city || "—";
  const getCreatedAt = () => doc?.created_at || "";

  const isMatched = () => claimReady || doc?.status === "MATCHED" || doc?.status === "PAID" || doc?.status === "RETURNED";
  const isReturned = validated || (doc?.status || "").toUpperCase() === "RETURNED";

  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" }) : "—";
  const formatMoney = (n: number) => `${n.toLocaleString(locale)} FCFA`;

  const getStatusLabel = () => {
    if (isReturned) return t("flow_badge_returned");
    if (ownerPaid) return t("flow_badge_paid");
    if (isMatched()) return t("flow_badge_matched");
    return t("flow_badge_waiting");
  };
  const getStatusColor = () => (isReturned ? "blue" : ownerPaid ? "green" : isMatched() ? "orange" : "gray");

  const steps = [
    t("dashboard_found_step_found"),
    t("dashboard_found_step_reported"),
    t("dashboard_found_step_owner"),
    t("dashboard_found_step_returned"),
  ];
  const currentStep = isReturned ? 5 : ownerPaid ? 4 : 3;

  // Le fil est indexé sur la déclaration perdue du propriétaire, pas sur celle du trouveur.
  const conversationHref = `/messagerie?doc=${(doc as any)?.counterPartDeclaration?.id || ""}`;

  // ── Code input handlers ──────────────────────────────────────────────
  const handleCodeInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...codeValues];
    next[idx] = val.slice(-1);
    setCodeValues(next);
    setCodeError("");
    if (val && idx < 5) codeInputs.current[idx + 1]?.focus();
  };

  const handleCodeKeyDown = (idx: number, e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !codeValues[idx] && idx > 0) {
      codeInputs.current[idx - 1]?.focus();
    }
  };

  const handleCodePaste = (e: ReactClipboardEvent<HTMLInputElement>) => {
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
      setCodeError(t("flow_code_incomplete"));
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
        setCodeError(result.message || t("rendre_code_invalid"));
        setCodeValues(["", "", "", "", "", ""]);
        codeInputs.current[0]?.focus();
      }
    } catch (e: any) {
      setCodeError(e.response?.data?.message || t("rendre_validate_error"));
    } finally {
      setValidating(false);
    }
  };

  const focusCode = () => {
    const el = document.querySelector<HTMLInputElement>("[data-code-input]");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => el?.focus(), 400);
  };

  // ── Loading / Error ──────────────────────────────────────────────────
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

  if (error || !doc) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-sm text-center">
          <i className="fa-solid fa-circle-exclamation text-textMuted text-3xl" />
          <h1 className="mt-4 font-bricolage text-lg font-bold text-textMain">{t("recuperer_not_found_title")}</h1>
          <p className="mt-2 text-[13px] text-textMuted leading-relaxed">{error || t("recuperer_load_error")}</p>
          <Button component={Link} to="/dashboard" radius="md" mt="md">
            {t("flow_back_dashboard")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex-1 px-4 sm:px-6 py-6 pb-24 lg:pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* ═══ Colonne action ═══ */}
        <div className="flex flex-col gap-5 min-w-0">

          {/* ═══ Progression ═══ */}
          <FlowCard
            title={t("flow_progression")}
            icon="fa-solid fa-list-check"
            aside={<Badge color={getStatusColor()} variant="light" radius="xl" size="sm">{getStatusLabel()}</Badge>}
          >
            <FlowStepper
              steps={steps}
              current={currentStep}
              caption={t("flow_step_of", { current: Math.min(currentStep, steps.length), total: steps.length })}
            />
          </FlowCard>

          {/* ═══ Action en cours ═══ */}
          <FlowCard title={t("flow_to_do")} icon="fa-solid fa-bullseye">
            {isReturned ? (
              <div className="flex flex-col gap-4 items-start">
                <FlowNotice tone="green" icon="fa-solid fa-circle-check">
                  <span className="font-bold">{t("rendre_returned_title")}</span> {t("rendre_returned_desc")}
                </FlowNotice>
                <Button component={Link} to="/dashboard" radius="md" leftSection={<i className="fa-solid fa-table-columns text-xs" aria-hidden="true" />}>
                  {t("flow_back_dashboard")}
                </Button>
              </div>
            ) : !isMatched() ? (
              <FlowNotice tone="gray" icon="fa-solid fa-hourglass-half">
                <span className="font-bold">{t("rendre_waiting_title")}</span> {t("rendre_waiting_desc")}
                <WaitingRefresh label={t("rendre_waiting_refresh")} />
              </FlowNotice>
            ) : !ownerPaid ? (
              <div className="flex flex-col gap-4">
                <FlowNotice tone="orange" icon="fa-solid fa-hourglass-half">
                  <span className="font-bold">{t("rendre_status_waiting")}</span> {t("rendre_status_waiting_desc")}
                  <WaitingRefresh label={t("rendre_waiting_refresh")} />
                </FlowNotice>
                <p className="text-[12px] text-textMuted leading-relaxed">{t("rendre_code_locked")}</p>
                <Button component={Link} to={conversationHref} radius="md" leftSection={<i className="fa-solid fa-comments text-xs" aria-hidden="true" />}>
                  {t("flow_message_owner")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <FlowNotice tone="green" icon="fa-solid fa-badge-check">
                  <span className="font-bold">{t("rendre_status_paid")}</span> {t("rendre_status_paid_desc")}
                </FlowNotice>
                <div>
                  <label className="block text-[11px] font-bold text-textMuted uppercase tracking-wider mb-2">
                    {t("flow_code_label")}
                  </label>
                  <div className="flex gap-2 sm:gap-3">
                    {codeValues.map((val, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { codeInputs.current[idx] = el; }}
                        data-code-input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={1}
                        value={val}
                        disabled={validating}
                        aria-label={`${t("flow_code_label")} ${idx + 1}`}
                        onChange={(e) => handleCodeInput(idx, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                        onPaste={handleCodePaste}
                        className="w-11 sm:w-12 h-12 sm:h-14 rounded-xl bg-surface2 border border-borderMain text-center font-mono tabular-nums text-lg sm:text-xl font-bold text-textMain outline-none focus:border-primary focus:bg-surface transition-colors disabled:opacity-50"
                      />
                    ))}
                  </div>
                </div>

                {codeError && (
                  <p role="alert" className="text-[12px] font-semibold text-red-600 flex items-center gap-2">
                    <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                    {codeError}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleValidate}
                    radius="md"
                    loading={validating}
                    disabled={codeValues.some((v) => !v)}
                    leftSection={!validating && <i className="fa-solid fa-circle-check text-xs" aria-hidden="true" />}
                  >
                    {validating ? t("flow_validating") : t("rendre_validate_btn")}
                  </Button>
                  <Button component={Link} to={conversationHref} radius="md" variant="default" leftSection={<i className="fa-solid fa-comments text-xs" aria-hidden="true" />}>
                    {t("flow_message_owner")}
                  </Button>
                </div>

                <p className="text-[11px] text-textMuted leading-relaxed flex items-start gap-2">
                  <i className="fa-solid fa-lock text-[10px] mt-0.5" aria-hidden="true" />
                  {t("rendre_code_owner_holds")}
                </p>
              </div>
            )}
          </FlowCard>

          {/* ═══ Rendez-vous ═══ */}
          {isMatched() && !isReturned && (
            <FlowCard title={t("flow_meeting")} icon="fa-solid fa-handshake">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FlowFact label={t("recuperer_owner")} value={getOwnerName()} />
                <FlowFact label={t("rendre_contact")} value={getOwnerPhone() || "—"} mono />
              </div>
              <p className="mt-4 text-[12px] text-textMuted leading-relaxed">{t("rendre_contact_desc")}</p>
              <div className="mt-4 pt-4 border-t border-borderMain flex flex-wrap gap-3">
                {getOwnerPhone() && (
                  <Button component="a" href={`tel:${getOwnerPhone()}`} radius="md" variant="default" leftSection={<i className="fa-solid fa-phone text-xs" aria-hidden="true" />}>
                    {t("rendre_call")}
                  </Button>
                )}
                <Button component={Link} to={conversationHref} radius="md" variant="default" leftSection={<i className="fa-solid fa-comments text-xs" aria-hidden="true" />}>
                  {t("flow_message_owner")}
                </Button>
              </div>
            </FlowCard>
          )}

        </div>

        {/* ═══ Colonne contexte ═══ */}
        <div className="flex flex-col gap-5 min-w-0">

          {/* ═══ 4. Le document ═══ */}
          <FlowCard
            title={getDocType()}
            icon={getDocIcon()}
            aside={<span className="text-[11px] font-mono tabular-nums text-textMuted">{getRef()}</span>}
          >
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
              <div className="sm:col-span-2">
                <div className="aspect-[4/3] rounded-2xl border border-borderMain overflow-hidden bg-surface2">
                  <ProtectedDocumentImage
                    src={getPhotoUrl()}
                    alt={getDocType()}
                    revealed
                    className="relative w-full h-full overflow-hidden"
                    imgClassName="w-full h-full object-cover"
                  />
                </div>
                {!getPhotoUrl() && (
                  <p className="mt-2 text-[11px] text-textMuted text-center">{t("flow_photo_empty")}</p>
                )}
              </div>
              <div className="sm:col-span-3 grid grid-cols-2 gap-4 self-start">
                <FlowFact label={t("flow_status")} value={getStatusLabel()} />
                <FlowFact label={t("recuperer_label_number")} value={getDocNumber()} mono />
                <FlowFact label={t("recuperer_label_location")} value={getVille()} />
                <FlowFact label={t("dashboard_found_step_reported")} value={formatDate(getCreatedAt())} />
                <FlowFact label={t("flow_reward")} value={formatMoney(getRewardAmount())} mono />
                <FlowFact label={t("flow_civic_points")} value={`+${getRewardPoints()}`} mono />
              </div>
            </div>
          </FlowCard>

          {/* ═══ 5. Sécurité ═══ */}
          <FlowCard title={t("flow_safety_title")} icon="fa-solid fa-shield-halved">
            <ul className="space-y-3">
              {[
                t("flow_safety_public"),
                t("flow_safety_identity"),
                t("flow_safety_code"),
                t("flow_safety_gains"),
              ].map((rule) => (
                <li key={rule} className="flex items-start gap-2.5 text-[12.5px] text-textMain leading-relaxed">
                  <i className="fa-solid fa-check text-green-dark text-[11px] mt-1" aria-hidden="true" />
                  {rule}
                </li>
              ))}
            </ul>
          </FlowCard>

          <div className="pt-1">
            <Button component={Link} to="/dashboard" radius="md" variant="default" fullWidth>
              {t("flow_back_dashboard")}
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ Barre d'action mobile ═══ */}
      {!isReturned && ownerPaid && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 bg-surface border-t border-borderMain px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider">{t("flow_reward")}</p>
              <p className="text-[15px] font-bold text-textMain font-mono tabular-nums truncate">{formatMoney(getRewardAmount())}</p>
            </div>
            <Button onClick={focusCode} radius="md" size="md">
              {t("rendre_validate_btn")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function WaitingRefresh({ label }: { label: string }) {
  return (
    <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-textMuted">
      <i className="fa-solid fa-arrows-rotate text-[10px]" aria-hidden="true" />
      {label}
    </span>
  );
}
