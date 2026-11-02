import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useTopbar } from "../../hooks/useTopbar";
import { declarationsService } from "../../services/declarationsService";
import { ProtectedDocumentImage } from "../../components/ui/ProtectedDocumentImage";
import ReportModal from "../../components/ui/ReportModal";
import { API_BASE_URL } from "../../services/api";

const BACKEND_ROOT = API_BASE_URL.replace(/\/api\/?$/, "");

interface Counterpart {
  id: string;
  identifiant_doc_dm?: string;
  declaration_type?: string;
  doc_type?: string;
  doc_type_label?: string;
  owner_name?: string;
  document_number?: string | null;
  ville?: string;
  region?: string;
  pays?: string;
  quartier?: string;
  department?: string;
  arrondissement?: string;
  found_location?: Record<string, unknown> | null;
  date_perte?: string;
  date_trouvaille?: string;
  created_at?: string;
  etat_physique?: string;
  description?: string | null;
  photo_recto?: string | null;
  photo_verso?: string | null;
  telephone_contact?: string | null;
  email_contact?: string | null;
  reporter_type?: string;
  status?: string;
}

interface MatchCriterion {
  name: string;
  points: number;
  max: number;
  matched: boolean;
  icon?: string;
  detail?: string;
}

interface CandidateMatch {
  matchId: string;
  score: number;
  status: "PENDING" | "CONFIRMED";
  ownerConfirmedAt?: string | null;
  claimStatus?: string | null;
  reservationStatus?: string | null;
  canPay?: boolean;
  details?: { criteria?: MatchCriterion[] } | null;
  counterpart: Counterpart;
}

interface MatchesPayload {
  declaration: {
    id: string;
    identifiant_doc_dm?: string;
    declaration_type?: string;
    status?: string;
    doc_type?: string;
  };
  count: number;
  confirmed: number;
  pending: number;
  handover?: {
    claimStatus?: string | null;
    reservationStatus?: string | null;
  } | null;
  matches: CandidateMatch[];
}

function imageUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  return `${BACKEND_ROOT}/${path.replace(/^\//, "")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function locationLabel(counterpart: Counterpart) {
  return [counterpart.ville, counterpart.quartier, counterpart.region, counterpart.pays]
    .filter(Boolean)
    .join(" · ") || "Localisation non renseignée";
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: 0.4 }}>
        {label}
      </Text>
      <Text size="sm" fw={600} style={{ wordBreak: "break-word" }}>
        {value || "—"}
      </Text>
    </div>
  );
}

export default function Correspondances() {
  useTopbar("Correspondances", [{ label: "Correspondances" }]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const declarationId = searchParams.get("id") || "";

  const [data, setData] = useState<MatchesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CandidateMatch | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reportMatchId, setReportMatchId] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);

  const load = useCallback(async () => {
    if (!declarationId) {
      setLoading(false);
      setError("Déclaration introuvable.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await declarationsService.getMatches(declarationId);
      if (res.success && res.data) {
        setData(res.data as MatchesPayload);
      } else {
        setError(res.message || "Impossible de charger les correspondances.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Impossible de charger les correspondances.");
    } finally {
      setLoading(false);
    }
  }, [declarationId]);

  useEffect(() => {
    load();
  }, [load]);

  // Une déclaration perdue n'a qu'un seul document trouvé actif : la liste ne
  // sert qu'aux doublons historiques. Avec un seul candidat, on continue
  // directement vers la confirmation et le paiement.
  useEffect(() => {
    if (loading || !data) return;
    if ((data.declaration?.declaration_type || "").toUpperCase() !== "LOST") return;
    if (data.matches.length !== 1) return;
    const [match] = data.matches;
    const query = new URLSearchParams({
      id: declarationId,
      match: match.matchId,
      found: match.counterpart.id,
    });
    navigate(`/recuperer?${query.toString()}`, { replace: true });
  }, [data, declarationId, loading, navigate]);

  const confirm = async (matchId: string) => {
    setConfirming(matchId);
    setError("");
    try {
      const res = await declarationsService.confirmMatch(declarationId, matchId);
      if (!res.success) {
        setError(res.message || "Confirmation impossible.");
        return;
      }
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Confirmation impossible.");
    } finally {
      setConfirming(null);
    }
  };

  const reject = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    setError("");
    try {
      const res = await declarationsService.rejectMatch(declarationId, rejectTarget.matchId);
      if (!res.success) {
        setError(res.message || "Impossible d'écarter ce candidat.");
        return;
      }
      setRejectTarget(null);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Impossible d'écarter ce candidat.");
    } finally {
      setRejecting(false);
    }
  };

  const pay = (match: CandidateMatch) => {
    navigate(
      `/recuperer?id=${declarationId}&match=${match.matchId}&found=${match.counterpart.id}`,
    );
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <Loader color="orange" />
      </div>
    );
  }

  const isOwnerView = (data?.declaration?.declaration_type || "").toUpperCase() === "LOST";
  const declarationRef = data?.declaration?.identifiant_doc_dm;
  const finderClaimStatus = data?.handover?.claimStatus ?? null;
  const finderReservationStatus = data?.handover?.reservationStatus ?? null;
  const finderHandover =
    finderClaimStatus === "VALIDATED"
      ? { label: "Document remis", color: "green" }
      : finderClaimStatus === "PAID"
        ? { label: "Paiement effectué", color: "blue" }
        : finderReservationStatus
          ? { label: "En cours de récupération", color: "orange" }
          : { label: "En attente de remise", color: "orange" };

  return (
    <div className="custom-scroll p-4 sm:p-6 pb-24 md:pb-6 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <Paper p="lg" radius="xl" withBorder>
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <div>
              <Title order={3} ff="Bricolage Grotesque">
                {isOwnerView ? "Documents trouvés correspondants" : "Remise du document trouvé"}
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                {isOwnerView
                  ? declarationRef
                    ? `Déclaration ${declarationRef} — vérifiez les informations puis confirmez le document qui vous appartient.`
                    : "Vérifiez les informations puis confirmez le document qui vous appartient."
                  : declarationRef
                    ? `Votre trouvaille ${declarationRef} est liée à une ou plusieurs déclarations de perte.`
                    : "Votre trouvaille est liée à une ou plusieurs déclarations de perte."}
              </Text>
            </div>
            <Button variant="subtle" color="dark" onClick={() => navigate("/dashboard")}>
              Retour
            </Button>
          </Group>
          {data && isOwnerView && (
            <Group gap="xs" mt="md">
              <Badge color="orange" variant="light">{data.pending} à confirmer</Badge>
              <Badge color="green" variant="light">{data.confirmed} confirmée(s)</Badge>
              <Badge color="blue" variant="light">{data.count} correspondance(s)</Badge>
            </Group>
          )}
        </Paper>

        {error && (
          <Paper p="md" radius="lg" withBorder bg="red.0">
            <Text size="sm" c="red.8">{error}</Text>
          </Paper>
        )}

        {!data || data.count === 0 ? (
          <Paper p="xl" radius="xl" withBorder>
            <Stack align="center" gap="sm">
              <ThemeIcon size={56} radius="xl" color="gray" variant="light">
                <i className="ph ph-chart-line-up" />
              </ThemeIcon>
              <Title order={4}>Aucune correspondance active</Title>
              <Text size="sm" c="dimmed" ta="center" maw={420}>
                {isOwnerView
                  ? "Votre recherche continue. Vous serez notifié dès qu'un document correspondant sera trouvé."
                  : "Aucune déclaration de perte ne correspond pour le moment à ce document."}
              </Text>
              <Button variant="light" color="orange" onClick={() => navigate("/dashboard")}>
                Retour au tableau de bord
              </Button>
            </Stack>
          </Paper>
        ) : !isOwnerView ? (
          <Paper p="lg" radius="xl" withBorder>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <div>
                <Title order={4}>Document trouvé</Title>
                <Text size="sm" c="dimmed">
                  {declarationRef || "Référence non renseignée"}
                </Text>
              </div>
              <Badge color={finderHandover.color} variant="light" radius="xl">{finderHandover.label}</Badge>
            </Group>

            <Divider my="md" />

            <Stack mt="lg" gap="xs" align="flex-start">
              <Button
                radius="xl"
                onClick={() => navigate(`/rendre?id=${data.declaration.id}`)}
                leftSection={<i className="ph ph-handshake" aria-hidden="true" />}
                style={{ backgroundColor: "#2D5A42" }}
              >
                Rendre le document
              </Button>
              <Button
                radius="xl"
                size="xs"
                variant="subtle"
                color="red"
                leftSection={<i className="ph ph-flag" aria-hidden="true" />}
                onClick={() => setSupportOpen(true)}
              >
                Signaler un problème
              </Button>
            </Stack>
          </Paper>
        ) : (
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            {data.matches.map((match) => {
              const counterpart = match.counterpart;
              const isFound = (counterpart.declaration_type || "").toUpperCase() === "FOUND";
              const isOwnerConfirmed = Boolean(match.ownerConfirmedAt);
              const isBusy = Boolean(match.claimStatus || match.reservationStatus);
              const canConfirm =
                !isOwnerConfirmed &&
                !isBusy &&
                !match.claimStatus &&
                ["PENDING", "CONFIRMED"].includes(match.status);
              const canPay = Boolean(match.canPay) && !isBusy;
              const canReject =
                !isOwnerConfirmed &&
                !isBusy &&
                ["PENDING", "CONFIRMED"].includes(match.status);
              const criteria = match.details?.criteria || [];
              const statusLabel = match.claimStatus
                ? "Récupéré"
                : match.reservationStatus
                  ? "Traitement en cours"
                  : isOwnerConfirmed
                    ? "Confirmée"
                    : match.status === "CONFIRMED"
                      ? "Forte correspondance"
                      : "À confirmer";
              const statusColor = match.claimStatus
                ? "blue"
                : match.reservationStatus
                  ? "orange"
                  : isOwnerConfirmed
                    ? "green"
                    : match.status === "CONFIRMED"
                      ? "teal"
                      : "yellow";

              return (
                <Card key={match.matchId} radius="xl" withBorder p={0} overflow="hidden">
                  <div className="relative">
                    <div className="grid grid-cols-2 gap-px bg-gray-200">
                      <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100">
                        <ProtectedDocumentImage
                          src={imageUrl(counterpart.photo_recto) || undefined}
                          alt="Recto du document"
                          revealed
                          className="relative h-full w-full overflow-hidden"
                        />
                        <Badge pos="absolute" bottom={8} left={8} color="dark" variant="filled" radius="xl" size="xs">
                          Recto
                        </Badge>
                      </div>
                      <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100">
                        <ProtectedDocumentImage
                          src={imageUrl(counterpart.photo_verso) || undefined}
                          alt="Verso du document"
                          revealed
                          className="relative h-full w-full overflow-hidden"
                        />
                        <Badge pos="absolute" bottom={8} left={8} color="dark" variant="filled" radius="xl" size="xs">
                          Verso
                        </Badge>
                      </div>
                    </div>
                    <Badge pos="absolute" top={12} left={12} color={statusColor} variant="filled" radius="xl">
                      {statusLabel}
                    </Badge>
                    <Badge pos="absolute" top={12} right={12} color="dark" variant="filled" radius="xl">
                      {match.score}% de correspondance
                    </Badge>
                  </div>

                  <Stack p="md" gap="sm">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <div style={{ minWidth: 0 }}>
                        <Text fw={800} size="md">
                          {counterpart.doc_type_label || (isFound ? "Document trouvé" : "Document perdu")}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {counterpart.identifiant_doc_dm || "Référence non renseignée"}
                        </Text>
                      </div>
                      {counterpart.reporter_type === "PARTENAIRE" && (
                        <Badge size="xs" color="blue" variant="light">Partenaire</Badge>
                      )}
                    </Group>

                    <Divider />

                    <SimpleGrid cols={2} spacing="sm">
                      <Detail label="Nom" value={counterpart.owner_name} />
                      <Detail label="N° du document" value={counterpart.document_number} />
                      <Detail label="Ville / quartier" value={locationLabel(counterpart)} />
                      <Detail
                        label={isFound ? "Trouvé le" : "Perdu le"}
                        value={formatDate(isFound ? counterpart.date_trouvaille || counterpart.created_at : counterpart.date_perte)}
                      />
                      <Detail label="État physique" value={counterpart.etat_physique} />
                      <Detail label="Statut du document" value={counterpart.status} />
                      {counterpart.telephone_contact && (
                        <Detail label="Téléphone" value={counterpart.telephone_contact} />
                      )}
                      {counterpart.email_contact && (
                        <Detail label="Email" value={counterpart.email_contact} />
                      )}
                    </SimpleGrid>

                    {counterpart.description && (
                      <div>
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: 0.4 }}>
                          Description
                        </Text>
                        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                          {counterpart.description}
                        </Text>
                      </div>
                    )}

                    {criteria.length > 0 && (
                      <div>
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb={4} style={{ letterSpacing: 0.4 }}>
                          Détails de la correspondance
                        </Text>
                        <Group gap={6}>
                          {criteria.map((criterion) => (
                            <Badge
                              key={criterion.name}
                              size="sm"
                              variant="light"
                              color={criterion.matched ? "green" : "gray"}
                            >
                              {criterion.name}
                              {criterion.max > 0 ? ` ${criterion.points}/${criterion.max}` : ""}
                            </Badge>
                          ))}
                        </Group>
                      </div>
                    )}

                    <Group mt="xs">
                      {canConfirm ? (
                        <Button
                          fullWidth
                          radius="xl"
                          color="orange"
                          loading={confirming === match.matchId}
                          leftSection={<i className="ph ph-check-circle" />}
                          onClick={() => confirm(match.matchId)}
                        >
                          Confirmer ce document
                        </Button>
                      ) : canPay ? (
                        <Button
                          fullWidth
                          radius="xl"
                          color="green"
                          leftSection={<i className="ph ph-hand-heart" />}
                          onClick={() => pay(match)}
                        >
                          Payer la récupération
                        </Button>
                      ) : (
                        <Button fullWidth radius="xl" variant="light" color="gray" disabled>
                          {match.claimStatus
                            ? "Déjà récupéré"
                            : match.reservationStatus
                              ? "Traitement en cours"
                              : isOwnerConfirmed
                                ? "Document confirmé"
                                : "En attente de confirmation"}
                        </Button>
                      )}
                    </Group>

                    {canReject && (
                      <Button
                        fullWidth
                        radius="xl"
                        size="xs"
                        variant="light"
                        color="red"
                        leftSection={<i className="ph ph-x" />}
                        onClick={() => setRejectTarget(match)}
                      >
                        Ce n'est pas mon document
                      </Button>
                    )}

                    <Button
                      fullWidth
                      radius="xl"
                      size="xs"
                      variant="subtle"
                      color="red"
                      leftSection={<i className="ph ph-flag" />}
                      onClick={() => setReportMatchId(match.matchId)}
                    >
                      Signaler un problème
                    </Button>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>
        )}
      </div>

      <Modal
        opened={Boolean(rejectTarget)}
        onClose={() => {
          if (!rejecting) setRejectTarget(null);
        }}
        title="Ce n'est pas mon document"
        radius="xl"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Ce candidat sera définitivement écarté de votre recherche. Vous serez notifié si un
            autre document correspondant est trouvé.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              radius="xl"
              variant="default"
              onClick={() => setRejectTarget(null)}
              disabled={rejecting}
            >
              Annuler
            </Button>
            <Button
              radius="xl"
              variant="light"
              color="red"
              loading={rejecting}
              onClick={reject}
              leftSection={<i className="ph ph-x" />}
            >
              Écarter ce candidat
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ReportModal
        opened={Boolean(reportMatchId)}
        onClose={() => setReportMatchId(null)}
        targetType="MATCH"
        targetId={reportMatchId}
      />

      <ReportModal
        opened={supportOpen}
        onClose={() => setSupportOpen(false)}
        title="Aide & support"
        intro={
          declarationRef
            ? `Décrivez votre problème concernant la trouvaille ${declarationRef}. L'équipe support vous répondra.`
            : "Décrivez votre problème. L'équipe support vous répondra."
        }
      />
    </div>
  );
}
