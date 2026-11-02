import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Stack,
  Text,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import { useToast } from "../../context/ToastContext";
import {
  reportsService,
  type Report,
  type ReportActionSubject,
  type ReportActionType,
  type ReportStatus,
} from "../../services/reportsService";

const STATUS_META: Record<ReportStatus, { label: string; color: string }> = {
  OPEN: { label: "Ouvert", color: "orange" },
  IN_REVIEW: { label: "En cours", color: "blue" },
  RESOLVED: { label: "Résolu", color: "green" },
  DISMISSED: { label: "Rejeté", color: "gray" },
};

const REASON_LABELS: Record<string, string> = {
  WRONG_DOCUMENT: "Ce n'est pas le bon document",
  NO_HANDOVER: "Remise non effectuée",
  FRAUD: "Fraude / faux document",
  ABUSIVE: "Comportement abusif",
  OTHER: "Autre problème",
};

const TARGET_LABELS: Record<string, string> = {
  DECLARATION: "Déclaration",
  MATCH: "Correspondance",
  CONVERSATION: "Conversation",
  USER: "Utilisateur",
  SUPPORT: "Support",
};

const ACTION_LABELS: Record<ReportActionType, string> = {
  REPLY: "Réponse envoyée",
  NUDGE_FINDER: "Trouveur relancé",
  REGENERATE_CODE: "Nouveau code émis",
  CLOSE_AND_REFUND: "Clôturé et remboursé",
  BLOCK_USER: "Compte bloqué",
  UNBLOCK_USER: "Compte réactivé",
};

const PAYMENT_LABELS: Record<string, string> = {
  OM: "Orange Money",
  ORANGE_MONEY: "Orange Money",
  MOMO: "MTN MoMo",
  MTN_MOMO: "MTN MoMo",
  POINTS: "Points",
};

const ACTION_TITLES: Record<ReportActionType, string> = {
  REPLY: "Répondre au plaignant",
  NUDGE_FINDER: "Relancer le trouveur",
  REGENERATE_CODE: "Émettre un nouveau code de remise",
  CLOSE_AND_REFUND: "Clôturer et rembourser",
  BLOCK_USER: "Bloquer le compte",
  UNBLOCK_USER: "Débloquer le compte",
};

const FILTERS: Array<{ value: ReportStatus | ""; label: string }> = [
  { value: "", label: "Tous" },
  { value: "OPEN", label: "Ouverts" },
  { value: "IN_REVIEW", label: "En cours" },
  { value: "RESOLVED", label: "Résolus" },
  { value: "DISMISSED", label: "Rejetés" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value?: number | null) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return `${amount.toLocaleString("fr-FR")} XAF`;
}

function personName(report: Report) {
  return (
    [report.target_user_prenom, report.target_user_nom].filter(Boolean).join(" ") ||
    report.target_user_email ||
    "Utilisateur"
  );
}

function reporterName(report: Report) {
  return (
    [report.reporter_prenom, report.reporter_nom].filter(Boolean).join(" ") ||
    report.reporter_email ||
    "Utilisateur"
  );
}

function subjectName(report: Report, subject: ReportActionSubject) {
  return subject === "REPORTER" ? reporterName(report) : personName(report);
}

// À qui appartient le compte sanctionné dans le dossier : c'est ce qui manque
// quand l'admin doit décider qui bloquer.
function targetRole(report: Report) {
  const id = report.target_user_id;
  if (!id) return null;
  if (report.claim_finder_id && id === report.claim_finder_id) return "Trouveur";
  if (report.claim_owner_id && id === report.claim_owner_id) return "Propriétaire";
  if (report.case_finder_id && id === report.case_finder_id) return "Trouveur";
  if (report.case_owner_id && id === report.case_owner_id) return "Propriétaire";
  if (report.target_type === "USER") return "Utilisateur signalé";
  if (report.target_type === "CONVERSATION") return "Interlocuteur";
  if (report.target_type === "DECLARATION") return "Déclarant";
  return null;
}

function lastActionLabel(report: Report, payload: Record<string, any>) {
  const action = report.resolution_action;
  if (!action) return "";
  if (payload.subject === "REPORTER") {
    return action === "BLOCK_USER" ? "Compte du plaignant bloqué" : "Compte du plaignant réactivé";
  }
  return ACTION_LABELS[action] || action;
}

function VerifiedMark({ verified }: { verified?: boolean | null }) {
  if (verified === null || verified === undefined) return null;
  return (
    <span className={`text-xs ${verified ? "text-green-700" : "text-orange-600"} font-semibold`}>
      <i className={`${verified ? "ph ph-check-circle" : "ph ph-question"}`} style={{ marginRight: 4 }} />
      {verified ? "Compte vérifié" : "Compte non vérifié"}
    </span>
  );
}

interface PersonLineProps {
  label: string;
  name: string;
  role?: string | null;
  email?: string | null;
  telephone?: string | null;
  verified?: boolean | null;
  blocked?: boolean;
  onOpenAccount: () => void;
  extra?: ReactNode;
}

function PersonLine({
  label,
  name,
  role,
  email,
  telephone,
  verified,
  blocked,
  onOpenAccount,
  extra,
}: PersonLineProps) {
  return (
    <Group gap="xs" align="flex-start" wrap="nowrap">
      <Text
        size="xs"
        fw={700}
        c="dimmed"
        tt="uppercase"
        style={{ letterSpacing: "0.05em", width: 118, flexShrink: 0, paddingTop: 2 }}
      >
        {label}
      </Text>
      <div style={{ minWidth: 0 }}>
        <Group gap="xs" wrap="wrap">
          <Text size="sm" fw={600}>
            {name}
          </Text>
          <VerifiedMark verified={verified} />
          {role && (
            <Badge color="gray" variant="light" radius="xl" size="xs">
              {role}
            </Badge>
          )}
          {blocked && (
            <Badge color="red" variant="light" radius="xl" size="xs">
              Compte bloqué
            </Badge>
          )}
          {extra}
        </Group>
        <Group gap="sm" wrap="wrap" mt={2}>
          {email && (
            <Text size="xs" c="dimmed">
              <a href={`mailto:${email}`} style={{ color: "#2D5A42" }}>
                {email}
              </a>
            </Text>
          )}
          {telephone && (
            <Text size="xs" c="dimmed">
              <a href={`tel:${telephone}`} style={{ color: "#2D5A42" }}>
                <i className="ph ph-phone" style={{ marginRight: 4 }} />
                {telephone}
              </a>
            </Text>
          )}
          {email && (
            <Text size="xs">
              <Button size="compact-xs" variant="subtle" c="dimmed" onClick={onOpenAccount}>
                Voir le compte
              </Button>
            </Text>
          )}
        </Group>
      </div>
    </Group>
  );
}

export default function AdminReports() {
  const toast = useToast();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [filter, setFilter] = useState<ReportStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<{ report: Report; status: ReportStatus } | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [caseTarget, setCaseTarget] = useState<{
    report: Report;
    action: ReportActionType;
    subject: ReportActionSubject;
  } | null>(null);
  const [caseMessage, setCaseMessage] = useState("");
  const [caseReason, setCaseReason] = useState("");
  const [caseHours, setCaseHours] = useState<number | string>(72);
  const [caseSaving, setCaseSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsService.listAdmin(filter);
      setReports(res.data || []);
      setOpenCount(res.open ?? 0);
    } catch {
      setReports([]);
      setOpenCount(0);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const openAccount = (email?: string | null) => {
    navigate(email ? `/admin/users?search=${encodeURIComponent(email)}` : "/admin/users");
  };

  const openDeclarations = (reference?: string | null) => {
    navigate(
      reference ? `/admin/declarations?search=${encodeURIComponent(reference)}` : "/admin/declarations",
    );
  };

  const startAction = (report: Report, status: ReportStatus) => {
    setActionTarget({ report, status });
    setAdminNote(report.admin_note || "");
  };

  const confirmAction = async () => {
    if (!actionTarget) return;
    setSaving(true);
    try {
      const res = await reportsService.review(actionTarget.report.id, {
        status: actionTarget.status,
        admin_note: adminNote.trim() || undefined,
      });
      if (!res.success) {
        toast.error(res.message || "Mise à jour impossible.");
        return;
      }
      toast.success("Signalement mis à jour.");
      setActionTarget(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Mise à jour impossible.");
    } finally {
      setSaving(false);
    }
  };

  const openCaseAction = (
    report: Report,
    action: ReportActionType,
    subject: ReportActionSubject = "TARGET",
  ) => {
    setCaseTarget({ report, action, subject });
    setCaseMessage("");
    setCaseReason("");
    setCaseHours(72);
  };

  const caseTitle = (action: ReportActionType, subject: ReportActionSubject) => {
    if (subject !== "REPORTER") return ACTION_TITLES[action];
    if (action === "BLOCK_USER") return "Bloquer le compte du plaignant";
    if (action === "UNBLOCK_USER") return "Débloquer le compte du plaignant";
    return ACTION_TITLES[action];
  };

  const runCaseAction = async () => {
    if (!caseTarget) return;
    const { report, action, subject } = caseTarget;

    if (action === "REPLY" && caseMessage.trim().length < 2) {
      toast.error("Écrivez la réponse avant d'envoyer.");
      return;
    }
    if (action === "BLOCK_USER" && caseReason.trim().length < 5) {
      toast.error("Indiquez le motif du blocage (5 caractères minimum).");
      return;
    }

    setCaseSaving(true);
    try {
      const res = await reportsService.applyAction(report.id, {
        action,
        subject: action === "BLOCK_USER" || action === "UNBLOCK_USER" ? subject : undefined,
        message: action === "REPLY" ? caseMessage.trim() : undefined,
        reason:
          action === "BLOCK_USER" || action === "CLOSE_AND_REFUND"
            ? caseReason.trim() || undefined
            : undefined,
        hours: action === "REGENERATE_CODE" ? Number(caseHours) || 72 : undefined,
      });
      if (!res.success) {
        toast.error(res.message || "Action impossible.");
        return;
      }
      toast.success(res.message || "Action exécutée.");
      setCaseTarget(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Action impossible.");
    } finally {
      setCaseSaving(false);
    }
  };

  const renderClaimLine = (report: Report) => {
    if (!report.claim_id) return null;
    if (report.claim_status === "VALIDATED") {
      return <Text size="xs" c="dimmed">Remise validée avec le code de remise.</Text>;
    }
    const method = report.claim_payment_method
      ? PAYMENT_LABELS[report.claim_payment_method] || report.claim_payment_method
      : "Paiement";
    const expiry = report.claim_code_expires_at
      ? ` · code valide jusqu'au ${formatDate(report.claim_code_expires_at)}`
      : "";
    return (
      <Text size="xs" c="dimmed">
        Réclamation payée : {formatMoney(report.claim_amount)} · {method}
        {expiry}
      </Text>
    );
  };

  return (
    <div className="p-4 sm:p-6">
      <Group justify="space-between" align="flex-start" mb="lg">
        <div>
          <Title order={3} ff="Bricolage Grotesque">
            Signalements & support
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Litiges, remises non effectuées, faux documents et demandes d'aide. Chaque dossier permet
            d'agir : répondre, relancer le trouveur, émettre un code, clôturer et rembourser, bloquer un
            compte.
          </Text>
        </div>
        {openCount > 0 && (
          <Badge color="orange" variant="light" radius="xl">
            {openCount} ouvert{openCount > 1 ? "s" : ""}
          </Badge>
        )}
      </Group>

      <Group gap="xs" mb="lg">
        {FILTERS.map((item) => (
          <Button
            key={item.value || "all"}
            size="xs"
            radius="xl"
            variant={filter === item.value ? "filled" : "default"}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </Group>

      {loading ? (
        <Card radius="xl" withBorder p="xl">
          <Text size="sm" c="dimmed">
            Chargement…
          </Text>
        </Card>
      ) : reports.length === 0 ? (
        <Card radius="xl" withBorder p="xl">
          <Text size="sm" c="dimmed">
            Aucun signalement pour ce filtre.
          </Text>
        </Card>
      ) : (
        <Stack gap="sm">
          {reports.map((report) => {
            const meta = STATUS_META[report.status];
            const isClosed = report.status === "RESOLVED" || report.status === "DISMISSED";
            const hasPaidClaim = report.claim_status === "PAID" && Boolean(report.claim_id);
            const blocked = Boolean(report.target_user_blocked_at);
            const reporterBlocked = Boolean(report.reporter_blocked_at);
            const payload = report.resolution_payload || {};
            return (
              <Card key={report.id} radius="xl" withBorder p="lg">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Group gap="xs" mb={4}>
                      <Badge color={meta.color} variant="light" radius="xl" size="sm">
                        {meta.label}
                      </Badge>
                      <Badge color="gray" variant="light" radius="xl" size="sm">
                        {REASON_LABELS[report.reason_category] || report.reason_category}
                      </Badge>
                      <Badge color="gray" variant="outline" radius="xl" size="sm">
                        {TARGET_LABELS[report.target_type] || report.target_type}
                      </Badge>
                    </Group>

                    <div
                      style={{
                        borderTop: "1px solid var(--mantine-color-default-border)",
                        borderBottom: "1px solid var(--mantine-color-default-border)",
                        padding: "10px 0",
                        margin: "10px 0",
                      }}
                    >
                      <Stack gap={10}>
                        <PersonLine
                          label="Plaignant"
                          name={reporterName(report)}
                          role={
                            report.reporter_role && report.reporter_role !== "USER"
                              ? report.reporter_role
                              : null
                          }
                          email={report.reporter_email}
                          telephone={report.reporter_telephone}
                          verified={report.reporter_is_verified}
                          blocked={Boolean(report.reporter_blocked_at)}
                          onOpenAccount={() => openAccount(report.reporter_email)}
                        />
                        {report.target_user_id ? (
                          <PersonLine
                            label="Partie concernée"
                            name={personName(report)}
                            role={targetRole(report)}
                            email={report.target_user_email}
                            telephone={report.target_user_telephone}
                            verified={report.target_user_is_verified}
                            blocked={blocked}
                            onOpenAccount={() => openAccount(report.target_user_email)}
                          />
                        ) : (
                          <Group gap="xs" align="flex-start" wrap="nowrap">
                            <Text
                              size="xs"
                              fw={700}
                              c="dimmed"
                              tt="uppercase"
                              style={{ letterSpacing: "0.05em", width: 118, flexShrink: 0, paddingTop: 2 }}
                            >
                              Partie concernée
                            </Text>
                            <Text size="xs" c="dimmed">
                              {report.target_type === "SUPPORT"
                                ? "Aucun dossier de récupération n'est rattaché à cette demande."
                                : "Aucune autre personne identifiée dans ce dossier."}
                            </Text>
                          </Group>
                        )}
                      </Stack>
                    </div>

                    {(report.target_reference || report.target_owner || report.target_declaration_status) && (
                      <Group gap="sm" wrap="wrap">
                        <Text size="xs" c="dimmed">
                          Document : {report.target_reference || "—"}
                          {report.target_owner ? ` · ${report.target_owner}` : ""}
                          {report.target_declaration_status
                            ? ` · ${report.target_declaration_status}`
                            : ""}
                        </Text>
                        {report.target_reference && (
                          <Button
                            size="compact-xs"
                            variant="subtle"
                            c="dimmed"
                            onClick={() => openDeclarations(report.target_reference)}
                          >
                            Voir la déclaration
                          </Button>
                        )}
                        {report.target_type === "SUPPORT" && report.match_id && (
                          <Badge color="gray" variant="light" radius="xl" size="xs">
                            Dossier rattaché
                          </Badge>
                        )}
                      </Group>
                    )}

                    {renderClaimLine(report)}

                    <Text size="sm" mt="sm" style={{ whiteSpace: "pre-wrap" }}>
                      {report.description}
                    </Text>

                    {report.admin_reply && (
                      <div
                        style={{
                          borderLeft: "2px solid #2D5A42",
                          paddingLeft: 10,
                          marginTop: 10,
                        }}
                      >
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                          Réponse envoyée au plaignant
                        </Text>
                        <Text size="sm" mt={2} style={{ whiteSpace: "pre-wrap" }}>
                          {report.admin_reply}
                        </Text>
                      </div>
                    )}

                    {report.admin_note && (
                      <Text size="xs" c="dimmed" mt="sm">
                        Note interne : {report.admin_note}
                      </Text>
                    )}

                    {report.resolution_action && (
                      <Text size="xs" c="dimmed" mt="sm">
                        Dernière action : {lastActionLabel(report, payload)}
                        {typeof payload.amount === "number" && Number(payload.amount) > 0
                          ? ` · ${formatMoney(payload.amount)}`
                          : ""}
                        {typeof payload.points === "number" && Number(payload.points) > 0
                          ? ` · ${payload.points} points`
                          : ""}
                        {payload.reason ? ` · ${payload.reason}` : ""}
                      </Text>
                    )}

                    <Text size="xs" c="dimmed" mt="sm">
                      Reçu le {formatDate(report.created_at)}
                      {report.resolved_at ? ` · Clos le ${formatDate(report.resolved_at)}` : ""}
                    </Text>
                  </div>

                  <Stack gap={6} align="flex-end" style={{ flexShrink: 0, minWidth: 190 }}>
                    {!isClosed && (
                      <Button
                        size="xs"
                        radius="xl"
                        variant="default"
                        onClick={() => openCaseAction(report, "REPLY")}
                      >
                        Répondre
                      </Button>
                    )}
                    {!isClosed && (
                      <Tooltip
                        disabled={hasPaidClaim}
                        withArrow
                        maw={230}
                        multiline
                        label={
                          report.claim_status === "VALIDATED"
                            ? "La remise a déjà été validée avec le code : plus rien à rembourser."
                            : "Aucun paiement de récupération sur ce dossier : rien à rembourser ni à relancer."
                        }
                      >
                        <Stack gap={6}>
                          <Button
                            size="xs"
                            radius="xl"
                            variant="default"
                            disabled={!hasPaidClaim}
                            onClick={() => openCaseAction(report, "NUDGE_FINDER")}
                          >
                            Relancer le trouveur
                          </Button>
                          <Button
                            size="xs"
                            radius="xl"
                            variant="default"
                            disabled={!hasPaidClaim}
                            onClick={() => openCaseAction(report, "REGENERATE_CODE")}
                          >
                            Nouveau code
                          </Button>
                          <Button
                            size="xs"
                            radius="xl"
                            color="red"
                            variant="light"
                            disabled={!hasPaidClaim}
                            onClick={() => openCaseAction(report, "CLOSE_AND_REFUND")}
                          >
                            Clôturer + rembourser
                          </Button>
                        </Stack>
                      </Tooltip>
                    )}
                    {report.target_user_id &&
                      report.target_user_role !== "ADMIN" &&
                      (blocked ? (
                        <Button
                          size="xs"
                          radius="xl"
                          variant="default"
                          onClick={() => openCaseAction(report, "UNBLOCK_USER")}
                        >
                          Débloquer la partie concernée
                        </Button>
                      ) : (
                        !isClosed && (
                          <Button
                            size="xs"
                            radius="xl"
                            color="red"
                            variant="light"
                            onClick={() => openCaseAction(report, "BLOCK_USER")}
                          >
                            Bloquer la partie concernée
                          </Button>
                        )
                      ))}
                    {report.reporter_role !== "ADMIN" &&
                      (reporterBlocked ? (
                        <Button
                          size="xs"
                          radius="xl"
                          variant="default"
                          onClick={() => openCaseAction(report, "UNBLOCK_USER", "REPORTER")}
                        >
                          Débloquer le plaignant
                        </Button>
                      ) : (
                        !isClosed && (
                          <Button
                            size="xs"
                            radius="xl"
                            variant="light"
                            color="red"
                            onClick={() => openCaseAction(report, "BLOCK_USER", "REPORTER")}
                          >
                            Bloquer le plaignant
                          </Button>
                        )
                      ))}
                    {report.status === "OPEN" && (
                      <Button
                        size="xs"
                        radius="xl"
                        variant="default"
                        onClick={() => startAction(report, "IN_REVIEW")}
                      >
                        Prendre en charge
                      </Button>
                    )}
                    {!isClosed && (
                      <>
                        <Button
                          size="xs"
                          radius="xl"
                          color="green"
                          variant="light"
                          onClick={() => startAction(report, "RESOLVED")}
                        >
                          Résoudre
                        </Button>
                        <Button
                          size="xs"
                          radius="xl"
                          color="red"
                          variant="light"
                          onClick={() => startAction(report, "DISMISSED")}
                        >
                          Rejeter
                        </Button>
                      </>
                    )}
                  </Stack>
                </Group>
              </Card>
            );
          })}
        </Stack>
      )}

      <Modal
        opened={Boolean(actionTarget)}
        onClose={() => {
          if (!saving) setActionTarget(null);
        }}
        title={
          actionTarget?.status === "RESOLVED"
            ? "Résoudre le signalement"
            : actionTarget?.status === "DISMISSED"
              ? "Rejeter le signalement"
              : "Prendre en charge"
        }
        radius="xl"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            La note est interne ; le plaignant n'y a pas accès.
          </Text>
          <Textarea
            label="Note interne (facultative)"
            value={adminNote}
            onChange={(event) => setAdminNote(event.currentTarget.value)}
            minRows={3}
            maxLength={2000}
            radius="md"
            autosize
          />
          <Group justify="flex-end" gap="sm">
            <Button radius="xl" variant="default" onClick={() => setActionTarget(null)} disabled={saving}>
              Annuler
            </Button>
            <Button radius="xl" loading={saving} onClick={confirmAction} style={{ backgroundColor: "#2D5A42" }}>
              Confirmer
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={Boolean(caseTarget)}
        onClose={() => {
          if (!caseSaving) setCaseTarget(null);
        }}
        title={caseTarget ? caseTitle(caseTarget.action, caseTarget.subject) : ""}
        radius="xl"
        centered
      >
        <Stack gap="md">
          {caseTarget?.action === "REPLY" && (
            <>
              <Text size="sm" c="dimmed">
                Ce message est visible par le plaignant dans « Mes signalements ».
              </Text>
              <Textarea
                label="Message au plaignant"
                value={caseMessage}
                onChange={(event) => setCaseMessage(event.currentTarget.value)}
                minRows={4}
                maxLength={2000}
                radius="md"
                autosize
              />
            </>
          )}

          {caseTarget?.action === "NUDGE_FINDER" && (
            <Text size="sm">
              Une notification sera envoyée au trouveur et au propriétaire pour demander la remise. Le
              dossier reste ouvert.
            </Text>
          )}

          {caseTarget?.action === "REGENERATE_CODE" && (
            <>
              <Text size="sm">
                Un nouveau code de remise sera généré. Le propriétaire le recevra et le trouveur sera
                notifié. Les tentatives échouées sont remises à zéro.
              </Text>
              <NumberInput
                label="Validité du code (heures)"
                value={caseHours}
                onChange={setCaseHours}
                min={1}
                max={720}
                clampBehavior="strict"
                radius="md"
              />
            </>
          )}

          {caseTarget?.action === "CLOSE_AND_REFUND" && caseTarget.report && (
            <>
              <Text size="sm">
                La réclamation payée ({formatMoney(caseTarget.report.claim_amount)}) sera remboursée sur le
                portefeuille interne du propriétaire
                {caseTarget.report.claim_payment_method === "POINTS" ? " (recréditée en points)" : ""}. La
                correspondance sera close et le document repartira en circulation.
              </Text>
              <Text size="sm" c="dimmed">
                Cette action est définitive : le code de remise sera invalidé.
              </Text>
              <Textarea
                label="Motif (facultatif)"
                value={caseReason}
                onChange={(event) => setCaseReason(event.currentTarget.value)}
                minRows={2}
                maxLength={500}
                radius="md"
                autosize
              />
            </>
          )}

          {caseTarget?.action === "BLOCK_USER" && caseTarget.report && (
            <>
              <Text size="sm">
                Le compte de <strong>{subjectName(caseTarget.report, caseTarget.subject)}</strong>
                {caseTarget.subject === "REPORTER" ? " (l'auteur du signalement)" : ""} sera suspendu
                immédiatement : connexion refusée et sessions révoquées.
              </Text>
              <Textarea
                label="Motif du blocage"
                value={caseReason}
                onChange={(event) => setCaseReason(event.currentTarget.value)}
                minRows={2}
                maxLength={500}
                radius="md"
                required
                autosize
              />
            </>
          )}

          {caseTarget?.action === "UNBLOCK_USER" && caseTarget.report && (
            <Text size="sm">
              Le compte de <strong>{subjectName(caseTarget.report, caseTarget.subject)}</strong>
              {caseTarget.subject === "REPORTER" ? " (l'auteur du signalement)" : ""} sera réactivé et
              pourra se reconnecter.
            </Text>
          )}

          <Group justify="flex-end" gap="sm">
            <Button
              radius="xl"
              variant="default"
              onClick={() => setCaseTarget(null)}
              disabled={caseSaving}
            >
              Annuler
            </Button>
            <Button
              radius="xl"
              loading={caseSaving}
              onClick={runCaseAction}
              style={
                caseTarget?.action === "CLOSE_AND_REFUND" || caseTarget?.action === "BLOCK_USER"
                  ? undefined
                  : { backgroundColor: "#2D5A42" }
              }
              color={
                caseTarget?.action === "CLOSE_AND_REFUND" || caseTarget?.action === "BLOCK_USER"
                  ? "red"
                  : undefined
              }
              variant={
                caseTarget?.action === "CLOSE_AND_REFUND" || caseTarget?.action === "BLOCK_USER"
                  ? "light"
                  : "filled"
              }
            >
              Confirmer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
