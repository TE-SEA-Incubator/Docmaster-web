import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { useTopbar } from "../../hooks/useTopbar";
import { useTimingConfig } from "../../hooks/useTimingConfig";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

import PaymentModal from "../../components/modals/PaymentModal";
import PollingModal from "../../components/modals/PollingModal";
import ActionSuccessModal from "../../components/modals/ActionSuccessModal";
import apiClient from "../../services/api";
import {
  Paper,
  Title,
  Text,
  Group,
  Stack,
  SimpleGrid,
  Badge,
  Card,
  ThemeIcon,
  Box,
  Button,
  Container,
  Divider,
  MantineColor,
} from "@mantine/core";

const PACKS = [
  { points: 500, label: "Pack Découverte", badge: "Débutant" },
  { points: 1000, label: "Pack Standard", badge: "Populaire" },
  { points: 1500, label: "Pack Premium", badge: "Recommandé" },
  { points: 5000, label: "Pack Supérieur", badge: "Meilleur rapport" },
  { points: 10000, label: "Pack Expert", badge: "Max de points" },
];

const PACK_COLORS: MantineColor[] = ["violet", "pink", "blue", "teal", "orange"];
const PACK_ICONS = ["fa-seedling", "fa-star", "fa-gem", "fa-crown", "fa-rocket"];

export default function AcheterPoints() {
  const { t } = useI18n();
  const timing = useTimingConfig();
  useTopbar("Acheter des points", [{ label: t("mesgains_breadcrumb_home"), href: "/dashboard" }, { label: "Acheter des points" }]);
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [rate, setRate] = useState(10);
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState("");
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);
  const [pollingElapsed, setPollingElapsed] = useState(0);
  const [nokashTransactionId, setNokashTransactionId] = useState<string | null>(null);
  const [isManualChecking, setIsManualChecking] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    apiClient
      .get("points/rate")
      .then((res: any) => {
        if (res.data?.rate) setRate(res.data.rate);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const openPayModal = (points: number) => {
    setSelectedPack(points);
    setPayError("");
    setPollingStatus(null);
    setNokashTransactionId(null);
    setPollingElapsed(0);
    setPaySuccess(false);
    setPayModalOpen(true);
  };

  const closePayModal = () => {
    setPayModalOpen(false);
    setSelectedPack(null);
    setPayError("");
  };

  const startPolling = (txId?: string | null) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    const activeTxId = txId || nokashTransactionId;
    const initialPoints = user?.points ?? 0;
    const startedAt = Date.now();

    pollingRef.current = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setPollingElapsed(elapsed);

      try {
        // 1. Check transaction status directly
        if (activeTxId) {
          const checkRes = await apiClient.get(`payments/check/${activeTxId}`);
          const checkData = checkRes.data?.data;
          if (
            checkRes.data?.success &&
            (checkData?.status === "SUCCESS" ||
              checkData?.currentStatus === "SUCCESS" ||
              (checkData?.updated && checkData?.status !== "FAILED"))
          ) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setPollingStatus(null);
            setPaySuccess(true);
            const profileRes = await apiClient.get("auth/profile");
            updateUser(profileRes.data.data || profileRes.data);
            return;
          }
        }

        // 2. Check points balance
        const profileRes = await apiClient.get("auth/profile");
        const newPoints = profileRes.data?.points ?? profileRes.data?.data?.points ?? 0;
        if (newPoints > initialPoints) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setPollingStatus(null);
          setPaySuccess(true);
          updateUser(profileRes.data.data || profileRes.data);
          return;
        }

        if (elapsed > timing.paymentPhaseProcessingMs / 1000) {
          setPollingStatus("Le paiement est en cours de traitement. Vous recevrez vos points sous peu.");
        } else if (elapsed > timing.paymentPhaseOperatorMs / 1000) {
          setPollingStatus("Confirmation en cours... Cette opération peut prendre jusqu'à 2 minutes.");
        } else {
          setPollingStatus("Veuillez valider le paiement sur votre téléphone...");
        }
      } catch (e) {
        console.error("[AcheterPoints] Polling error:", e);
      }
    }, timing.paymentPollIntervalMs);

    setTimeout(() => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }, timing.paymentPollTimeoutMs);
  };

  const handleManualCheck = async () => {
    if (!nokashTransactionId) return;
    setIsManualChecking(true);
    try {
      const res = await apiClient.get(`payments/check/${nokashTransactionId}`);
      const checkData = res.data?.data;
      if (
        res.data?.success &&
        (checkData?.updated || checkData?.status === "SUCCESS" || checkData?.currentStatus === "SUCCESS")
      ) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setPollingStatus(null);
        setPaySuccess(true);
        const profileRes = await apiClient.get("auth/profile");
        updateUser(profileRes.data.data || profileRes.data);
      } else if (checkData?.status || checkData?.currentStatus) {
        setPollingStatus(`Statut: ${checkData.status || checkData.currentStatus}. En attente de validation sur votre téléphone...`);
      }
    } catch (e) {
      console.error("[AcheterPoints] manual check error:", e);
    } finally {
      setIsManualChecking(false);
    }
  };

  const handlePay = async (method: "orange" | "mtn" | "points", phone: string) => {
    setProcessing(true);
    setPayError("");

    if (method === "points") {
      setProcessing(false);
      setPayError("L'achat de points avec des points n'est pas possible. Veuillez utiliser Orange Money ou MTN MoMo.");
      return;
    }

    try {
      const paymentMethod = method === "orange" ? "ORANGE_MONEY" : "MTN_MOMO";
      const res = await apiClient.post("points/purchase", {
        pointsAmount: selectedPack,
        phone,
        method: paymentMethod,
      });
      setProcessing(false);

      if (!res.data) {
        setPayError("Aucune réponse du serveur. Veuillez réessayer.");
        return;
      }

      if (res.data.success && res.data.data?.transactionId) {
        const txId = res.data.data.transactionId;
        setNokashTransactionId(txId);
        setPayModalOpen(false);
        setPollingStatus("Veuillez valider le paiement sur votre téléphone");
        setPollingElapsed(0);
        startPolling(txId);
      } else if (res.data.message) {
        setPayError(res.data.message);
      } else {
        setPayError("Erreur lors de l'initialisation du paiement. Veuillez réessayer.");
      }
    } catch (e: any) {
      setProcessing(false);
      const msg =
        e.response?.data?.message ||
        e.response?.data?.error ||
        e.message ||
        "Erreur de connexion. Veuillez vérifier votre réseau et réessayer.";
      setPayError(msg);
    }
  };

  const xafAmount = selectedPack ? Math.ceil(selectedPack / rate) : 0;

  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100%" }}>

      <Box
        className="custom-scroll"
        style={{ flex: 1, overflowY: "auto" }}
        p={{ base: "md", sm: "lg" }}
        pb={96}
      >
        <Container size="lg" px={0}>
          <Stack gap="lg">
            {/* Hero - Solde de points */}
            <Paper
              p="xl"
              radius="lg"
              style={{
                background: "linear-gradient(135deg, #2D5A42 0%, #2D5A42 55%, #3B7A58 100%)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                style={{
                  position: "absolute",
                  width: 300,
                  height: 300,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.04)",
                  top: -100,
                  right: -80,
                  pointerEvents: "none",
                }}
              />
              <Group justify="space-between" align="center" wrap="wrap" gap="md">
                <Stack gap={4}>
                  <Text size="sm" c="white" opacity={0.8} fw={500}>
                    Solde actuel
                  </Text>
                  <Group gap="xs" align="baseline">
                    <Title order={1} c="white" className="font-bricolage" style={{ fontSize: "2.5rem" }}>
                      {(user?.points || 0).toLocaleString("fr-FR")}
                    </Title>
                    <Text size="lg" c="yellow.4" fw={700}>
                      pts
                    </Text>
                  </Group>
                  <Text size="xs" c="white" opacity={0.7}>
                    Taux : 1 FCFA = {rate} points
                  </Text>
                </Stack>
                <Button
                  variant="white"
                  color="dark"
                  radius="xl"
                  size="md"
                  className="font-bricolage"
                  leftSection={<i className="fa-solid fa-clock-rotate-left" />}
                  onClick={() => navigate("/mes-gains")}
                >
                  Historique
                </Button>
              </Group>
            </Paper>

            {/* Titre section packs */}
            <Box>
              <Title order={3} className="font-bricolage" mb={4}>
                Choisissez votre pack
              </Title>
              <Text size="sm" c="dimmed">
                Rechargez votre compte pour effectuer vos déclarations et débloquer des services.
              </Text>
            </Box>

            {/* Grille des packs */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              {PACKS.map((pack, idx) => {
                const color = PACK_COLORS[idx % PACK_COLORS.length];
                const icon = PACK_ICONS[idx % PACK_ICONS.length];
                const price = Math.ceil(pack.points / rate);
                const isSelected = selectedPack === pack.points;

                return (
                  <Card
                    key={pack.points}
                    shadow="sm"
                    padding="lg"
                    radius="lg"
                    withBorder
                    style={{
                      borderColor: isSelected ? "var(--mantine-color-primary-6)" : undefined,
                      borderWidth: isSelected ? 2 : 1,
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                      cursor: "pointer",
                    }}
                    className="hover:shadow-md hover:-translate-y-0.5"
                    onClick={() => openPayModal(pack.points)}
                  >
                    <Group justify="space-between" align="flex-start" mb="xs">
                      <ThemeIcon size={44} radius="md" color={color} variant="light">
                        <i className={`fa-solid ${icon}`} style={{ fontSize: 20 }} />
                      </ThemeIcon>
                      <Badge color={color} variant="light" size="sm" radius="sm">
                        {pack.badge}
                      </Badge>
                    </Group>

                    <Text fw={700} size="lg" className="font-bricolage" mt="xs">
                      {pack.label}
                    </Text>

                    <Group gap="xs" align="baseline" my="xs">
                      <Title order={2} className="font-bricolage" c="primary">
                        {pack.points.toLocaleString("fr-FR")}
                      </Title>
                      <Text size="sm" c="dimmed" fw={600}>
                        points
                      </Text>
                    </Group>

                    <Divider my="xs" />

                    <Group justify="space-between" align="center" mt="auto">
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">
                          Prix
                        </Text>
                        <Text fw={800} size="md" className="font-bricolage">
                          {price.toLocaleString("fr-FR")} FCFA
                        </Text>
                      </Stack>
                      <Button
                        size="xs"
                        radius="xl"
                        color="primary"
                        className="font-bricolage"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPayModal(pack.points);
                        }}
                      >
                        Acheter
                      </Button>
                    </Group>
                  </Card>
                );
              })}
            </SimpleGrid>

            {/* Infos supplémentaires */}
            <Card shadow="xs" padding="lg" radius="lg" withBorder bg="gray.0">
              <Title order={4} className="font-bricolage" mb="sm">
                Moyens de paiement acceptés
              </Title>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <Paper p="sm" radius="md" bg="orange.0">
                  <Group gap="sm">
                    <ThemeIcon size={32} radius="md" color="orange">
                      <Text fw={800} size="xs">
                        O
                      </Text>
                    </ThemeIcon>
                    <Text size="sm" fw={600}>
                      Orange Money
                    </Text>
                  </Group>
                </Paper>
                <Paper p="sm" radius="md" bg="yellow.0">
                  <Group gap="sm">
                    <ThemeIcon size={32} radius="md" color="yellow">
                      <Text fw={800} size="xs">
                        M
                      </Text>
                    </ThemeIcon>
                    <Text size="sm" fw={600}>
                      MTN MoMo
                    </Text>
                  </Group>
                </Paper>
              </SimpleGrid>
            </Card>
          </Stack>
        </Container>
      </Box>

      {/* Payment Selection Modal */}
      <PaymentModal
        isOpen={payModalOpen}
        onClose={closePayModal}
        onPay={handlePay}
        amount={xafAmount}
        title="Achat de points"
        description={`Pack de ${selectedPack?.toLocaleString("fr-FR")} points`}
        processing={processing}
        error={payError}
      />

      {/* Polling Modal during mobile money verification */}
      <PollingModal
        isOpen={!!pollingStatus}
        onClose={() => {
          setPollingStatus(null);
          if (pollingRef.current) clearInterval(pollingRef.current);
        }}
        pollingStatus={pollingStatus || "Vérification en cours..."}
        pollingElapsed={pollingElapsed}
        nokashTransactionId={nokashTransactionId}
        onManualCheck={handleManualCheck}
        isManualChecking={isManualChecking}
      />

      {/* Success Modal */}
      {paySuccess && (
        <ActionSuccessModal
          opened={paySuccess}
          onClose={() => setPaySuccess(false)}
          title="Points crédités !"
          description={`Votre recharge a été effectuée avec succès. Les points ont été ajoutés à votre compte.`}
          badgeText={`+${selectedPack?.toLocaleString("fr-FR")} PTS`}
          badgeColor="green"
          icon="fa-coins"
          details={[
            { label: "Points achetés", value: `+${selectedPack?.toLocaleString("fr-FR")} pts`, highlighted: true },
            { label: "Montant payé", value: `${xafAmount.toLocaleString("fr-FR")} FCFA` },
            { label: "Nouveau solde", value: `${(user?.points || 0).toLocaleString("fr-FR")} pts` },
          ]}
          primaryAction={{
            label: "Voir mon solde et historique",
            icon: "fa-wallet",
            onClick: () => {
              setPaySuccess(false);
              navigate("/mes-gains");
            },
          }}
          secondaryAction={{
            label: "Acheter un autre pack",
            onClick: () => setPaySuccess(false),
          }}
        />
      )}
    </Box>
  );
}