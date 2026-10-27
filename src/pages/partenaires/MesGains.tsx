import { useState, useEffect } from "react";
import { usePartenaireAuth } from "../../context/PartenaireAuthContext";
import { useI18n } from "../../context/I18nContext";
import { partenairesService, type PartenaireEarning } from "../../services/partenairesService";
import {
  Paper, Title, Text, Group, Stack, Badge, Loader, Tabs,
  Button, NumberInput, Modal, Select, SimpleGrid, Progress,
} from "@mantine/core";
import { useToast } from "../../context/ToastContext";

function fmtAmount(n: number) {
  return n.toLocaleString("fr-FR");
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// Mapper les types vers des labels lisibles
const TYPE_LABELS: Record<string, string> = {
  DECLARATION: "Déclaration",
  REFERRAL: "Parrainage",
  MATCH: "Match validé",
  BONUS: "Bonus",
  CONVERSION: "Conversion en argent",
  WITHDRAWAL: "Retrait",
  WITHDRAWAL_REFUND: "Remboursement retrait",
  ADJUSTMENT: "Ajustement",
};

const TYPE_COLORS: Record<string, string> = {
  DECLARATION: "blue",
  REFERRAL: "green",
  MATCH: "teal",
  BONUS: "yellow",
  CONVERSION: "orange",
  WITHDRAWAL: "red",
  WITHDRAWAL_REFUND: "green",
  ADJUSTMENT: "gray",
};

export default function MesGains() {
  const { t } = useI18n();
  const { partenaire, refreshProfile } = usePartenaireAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [earnings, setEarnings] = useState<PartenaireEarning[]>([]);
  const [history, setHistory] = useState<PartenaireEarning[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertAmount, setConvertAmount] = useState<number>(100);
  const [convertLoading, setConvertLoading] = useState(false);
  const [pointsRate, setPointsRate] = useState(10);

  useEffect(() => {
    fetchData();
    fetchPointsRate();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, earningsRes] = await Promise.all([
        partenairesService.getEarningsStats(),
        partenairesService.getEarnings({ limit: 10 }),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      if (earningsRes.data.success && earningsRes.data.data) {
        setEarnings(earningsRes.data.data.data || []);
      }
    } catch (err: any) {
      console.error("Erreur chargement gains:", err);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (type?: string | null) => {
    setHistoryLoading(true);
    try {
      const res = await partenairesService.getPointsHistory({
        limit: 50,
        type: type || undefined,
      });

      if (res.data.success && res.data.data) {
        setHistory(res.data.data.history || []);
        setHistoryTotal(res.data.data.total || 0);
      }
    } catch (err: any) {
      console.error("Erreur chargement historique:", err);
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchPointsRate = async () => {
    try {
      const res = await partenairesService.getPointsRate();
      if (res.data.success && res.data.rate) {
        setPointsRate(res.data.rate);
      }
    } catch (err) {
      console.error("Erreur chargement taux:", err);
    }
  };

  const handleConvert = async () => {
    if (!convertAmount || convertAmount <= 0) {
      toast.error("Montant invalide");
      return;
    }

    if ((partenaire?.points || 0) < convertAmount) {
      toast.error("Solde de points insuffisant");
      return;
    }

    setConvertLoading(true);
    try {
      const res = await partenairesService.convertPoints(convertAmount);
      if (res.data.success) {
        const convertedXaf = res.data.data.amountXaf;
        toast.success(`${convertAmount} points convertis en ${convertedXaf} FCFA !`);
        setShowConvertModal(false);
        setConvertAmount(100);
        await refreshProfile();
        await fetchData();
      }
    } catch (err: any) {
      console.error("Erreur conversion:", err);
      toast.error(err.response?.data?.message || "Erreur lors de la conversion");
    } finally {
      setConvertLoading(false);
    }
  };

  const totalPoints = partenaire?.points || 0;
  const walletBalance = partenaire?.wallet_balance || 0;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <Loader size="lg" />
        <Text size="sm" c="dimmed" mt="md">
          Chargement...
        </Text>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* En-tête */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2} fw={800}>
            💰 Mes Gains
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Gérez vos points et votre portefeuille
          </Text>
        </div>
      </Group>

      {/* Stats Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg" mb="xl">
        {/* Points */}
        <Paper p="lg" radius="lg" withBorder>
          <Group justify="space-between" mb="xs">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.05em" }}>
              Points disponibles
            </Text>
            <i className="fa-solid fa-coins" style={{ color: "#E8923A", fontSize: "1.2rem" }} />
          </Group>
          <Title order={2} fw={900} c="#E8923A">
            {fmtAmount(totalPoints)}
          </Title>
          <Text size="xs" c="dimmed" mt={4}>
            {pointsRate} pts = 1 FCFA
          </Text>
          <Button
            fullWidth
            mt="md"
            size="sm"
            radius="md"
            onClick={() => setShowConvertModal(true)}
            disabled={totalPoints < 10}
            style={{ backgroundColor: "#E8923A" }}
          >
            Convertir en argent
          </Button>
        </Paper>

        {/* Wallet */}
        <Paper p="lg" radius="lg" withBorder>
          <Group justify="space-between" mb="xs">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.05em" }}>
              Portefeuille
            </Text>
            <i className="fa-solid fa-wallet" style={{ color: "#2D5A42", fontSize: "1.2rem" }} />
          </Group>
          <Title order={2} fw={900} c="#2D5A42">
            {fmtAmount(walletBalance)} FCFA
          </Title>
          <Text size="xs" c="dimmed" mt={4}>
            Solde disponible
          </Text>
          <Button
            fullWidth
            mt="md"
            size="sm"
            radius="md"
            variant="outline"
            color="green"
            component="a"
            href="/partenaire/retraits"
          >
            Retirer
          </Button>
        </Paper>

        {/* Stats */}
        <Paper p="lg" radius="lg" withBorder>
          <Group justify="space-between" mb="xs">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.05em" }}>
              Statistiques
            </Text>
            <i className="fa-solid fa-chart-line" style={{ color: "#6B7280", fontSize: "1.2rem" }} />
          </Group>
          <Stack gap="xs">
            <div>
              <Text size="xs" c="dimmed">
                Documents trouvés
              </Text>
              <Text size="lg" fw={700}>
                {stats?.stats?.total_found || 0}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                Documents rendus
              </Text>
              <Text size="lg" fw={700}>
                {stats?.stats?.total_returned || 0}
              </Text>
            </div>
          </Stack>
        </Paper>
      </SimpleGrid>

      {/* Tabs: Gains récents / Historique complet */}
      <Paper p="lg" radius="lg" withBorder>
        <Tabs
          defaultValue="gains"
          onChange={(value) => {
            if (value === "history" && history.length === 0) {
              fetchHistory();
            }
          }}
        >
          <Tabs.List>
            <Tabs.Tab value="gains">
              <Group gap="xs">
                <i className="fa-solid fa-trophy" />
                <span>Gains récents</span>
              </Group>
            </Tabs.Tab>
            <Tabs.Tab value="history">
              <Group gap="xs">
                <i className="fa-solid fa-history" />
                <span>Historique complet</span>
              </Group>
            </Tabs.Tab>
          </Tabs.List>

          {/* Onglet Gains Récents */}
          <Tabs.Panel value="gains" pt="lg">
            {earnings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <i
                  className="fa-solid fa-coins"
                  style={{ fontSize: "3rem", color: "#EAE3D8", marginBottom: "1rem" }}
                />
                <Text size="sm" c="dimmed">
                  Aucun gain récent
                </Text>
              </div>
            ) : (
              <Stack gap="sm">
                {earnings.map((item) => {
                  const amount = Number(item.amount);
                  const isPositive = amount > 0;

                  return (
                    <Paper key={item.id} p="md" radius="md" withBorder>
                      <Group justify="space-between">
                        <div style={{ flex: 1 }}>
                          <Group gap="xs" mb={4}>
                            <Badge
                              size="sm"
                              color={TYPE_COLORS[item.type] || "gray"}
                              variant="light"
                            >
                              {TYPE_LABELS[item.type] || item.type}
                            </Badge>
                            <Text size="xs" c="dimmed">
                              {fmtDate(item.created_at)}
                            </Text>
                          </Group>
                          {item.description && (
                            <Text size="sm" c="dimmed">
                              {item.description}
                            </Text>
                          )}
                        </div>
                        <Text
                          size="lg"
                          fw={700}
                          c={isPositive ? "green" : "red"}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          {isPositive ? "+" : ""}
                          {amount} pts
                        </Text>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Tabs.Panel>

          {/* Onglet Historique Complet */}
          <Tabs.Panel value="history" pt="lg">
            <Group mb="md">
              <Select
                placeholder="Filtrer par type"
                clearable
                data={[
                  { value: "DECLARATION", label: "Déclarations" },
                  { value: "REFERRAL", label: "Parrainages" },
                  { value: "MATCH", label: "Matchs" },
                  { value: "CONVERSION", label: "Conversions" },
                  { value: "WITHDRAWAL", label: "Retraits" },
                  { value: "BONUS", label: "Bonus" },
                ]}
                value={historyFilter}
                onChange={(value) => {
                  setHistoryFilter(value);
                  fetchHistory(value);
                }}
                style={{ width: 200 }}
              />
              <Text size="sm" c="dimmed">
                {historyTotal} transaction{historyTotal > 1 ? "s" : ""}
              </Text>
            </Group>

            {historyLoading ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <Loader size="md" />
              </div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <i
                  className="fa-solid fa-history"
                  style={{ fontSize: "3rem", color: "#EAE3D8", marginBottom: "1rem" }}
                />
                <Text size="sm" c="dimmed">
                  Aucun historique trouvé
                </Text>
              </div>
            ) : (
              <Stack gap="sm">
                {history.map((item) => {
                  const amount = Number(item.amount);
                  const isPositive = amount > 0;

                  return (
                    <Paper key={item.id} p="md" radius="md" withBorder>
                      <Group justify="space-between">
                        <div style={{ flex: 1 }}>
                          <Group gap="xs" mb={4}>
                            <Badge
                              size="sm"
                              color={TYPE_COLORS[item.type] || "gray"}
                              variant="light"
                            >
                              {TYPE_LABELS[item.type] || item.type}
                            </Badge>
                            <Text size="xs" c="dimmed">
                              {fmtDate(item.created_at)}
                            </Text>
                          </Group>
                          {item.description && (
                            <Text size="sm" c="dimmed">
                              {item.description}
                            </Text>
                          )}
                          {item.metadata && (
                            <Text size="xs" c="dimmed" mt={4}>
                              {JSON.stringify(item.metadata, null, 2)}
                            </Text>
                          )}
                        </div>
                        <Text
                          size="lg"
                          fw={700}
                          c={isPositive ? "green" : "red"}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          {isPositive ? "+" : ""}
                          {amount} pts
                        </Text>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>
      </Paper>

      {/* Modal Conversion */}
      <Modal
        opened={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        title="Convertir des points en argent"
        size="md"
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Taux de conversion : {pointsRate} points = 1 FCFA
          </Text>

          <NumberInput
            label="Montant de points à convertir"
            placeholder="Ex: 1000"
            value={convertAmount}
            onChange={(val) => setConvertAmount(Number(val) || 0)}
            min={10}
            max={totalPoints}
            step={10}
          />

          <Paper p="md" radius="md" style={{ backgroundColor: "#F7F7F7" }}>
            <Text size="sm" fw={600} mb="xs">
              Récapitulatif
            </Text>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Points à convertir
              </Text>
              <Text size="sm" fw={600}>
                {fmtAmount(convertAmount)} pts
              </Text>
            </Group>
            <Group justify="space-between" mt="xs">
              <Text size="sm" c="dimmed">
                Vous recevrez
              </Text>
              <Text size="lg" fw={700} c="green">
                {fmtAmount(Math.floor(convertAmount / pointsRate))} FCFA
              </Text>
            </Group>
          </Paper>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setShowConvertModal(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleConvert}
              loading={convertLoading}
              disabled={convertAmount < 10 || convertAmount > totalPoints}
              style={{ backgroundColor: "#E8923A" }}
            >
              Convertir
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
