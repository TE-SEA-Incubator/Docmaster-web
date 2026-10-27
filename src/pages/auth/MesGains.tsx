import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";
import { useTopbar } from "../../hooks/useTopbar";
import { useNavigate } from "react-router-dom";
import { paymentsService, type SavedPaymentMethod } from "../../services/paymentsService";
import { settingsService } from "../../services/settingsService";
import { authService } from "../../services/authService";
import { earningsService } from "../../services/earningsService";
import { declarationsService } from "../../services/declarationsService";
import { useToast } from "../../context/ToastContext";

import type { Transaction, EarningsRecord, Declaration } from "../../types/api";
import {
  Paper, Title, Text, Group, Stack, SimpleGrid,
  Progress, Badge, Loader, Modal, Tabs, Pagination, Select,
} from "@mantine/core";
import apiClient from "../../services/api";

function fmtAmount(n: number) {
  return n.toLocaleString("fr-FR");
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString("fr-FR", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function MesGains() {
  const { t } = useI18n();
  useTopbar(t("mesgains_title"), [{ label: t("mesgains_breadcrumb_home"), href: "/dashboard" }, { label: t("mesgains_breadcrumb_earnings") }]);
  const { user, updateUser, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [statsData, setStatsData] = useState<Record<string, unknown> | null>(null);
  const [minWithdrawal, setMinWithdrawal] = useState(25);
  const [earningsHistory, setEarningsHistory] = useState<EarningsRecord[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showMethodsModal, setShowMethodsModal] = useState(false);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [addMethodType, setAddMethodType] = useState<"MTN" | "ORANGE" | "BANK">("MTN");
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);

  // Toggle section on mobile
  const [activeSection, setActiveSection] = useState<"gains" | "history">("gains");

  const fetchData = useCallback(async () => {
    setTxLoading(true);
    setEarningsLoading(true);
    try {
      const [txRes, settingsRes, statsRes, earningsRes, declRes] = await Promise.all([
        paymentsService.getMyTransactions(),
        settingsService.getAll(),
        authService.getEarningsStats(),
        earningsService.getMyEarnings(),
        declarationsService.getMyDeclarations(),
      ]);

      if (txRes.success && txRes.data) {
        setTransactions(txRes.data);
      }

      if (settingsRes.success && settingsRes.data) {
        const m = Number(settingsRes.data.min_withdrawal_amount) || 25;
        setMinWithdrawal(m);
      }

      if (statsRes.success && statsRes.data) {
        setStatsData(statsRes.data as Record<string, unknown>);
      }

      if (earningsRes.success && earningsRes.data) {
        const raw = earningsRes.data as any;
        setEarningsHistory(Array.isArray(raw) ? raw : raw.data || []);
      }

      if (declRes.success && declRes.data) {
        setDeclarations(Array.isArray(declRes.data) ? declRes.data : []);
      }
    } catch {
      // silent
    } finally {
      setTxLoading(false);
      setEarningsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchMethods = useCallback(async () => {
    try {
      const res = await paymentsService.getPaymentMethods();
      if (res.success && res.data) {
        setSavedMethods(res.data);
      }
    } catch {}
  }, []);

  const balance = user?.wallet_balance || 0;
  const points = user?.points || 0;
  const progressPct = Math.min((balance / minWithdrawal) * 100, 100);

  const totalFinderPayouts = transactions
    .filter((t) => t.type === "finder_payout" && t.status === "SUCCESS")
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalWithdrawn = transactions
    .filter((t) => t.type === "withdrawal" && t.status === "SUCCESS")
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

  const pointsBreakdown = (statsData as Record<string, unknown>)?.points_breakdown || {
    declarations: { points: 0, count: 0, pts_per_unit: 5 },
    returns: { points: 0, count: 0 },
    referrals: { points: 0, count: 0 },
  };
  const totalPoints = (statsData as Record<string, unknown>)?.total_points || points;
  const statsCards = (statsData as Record<string, unknown>)?.stats || { total_found: 0, total_returned: 0 };

  const nextLevelPoints = 500;
  const pointsToNext = Math.max(nextLevelPoints - totalPoints, 0);
  const levelLabel = totalPoints >= 500 ? t("mesgains_level_gold") : t("mesgains_level_silver");

  // Potential earnings from FOUND declarations not yet returned
  const potentialDeclarations = declarations.filter(
    (d) => d.declaration_type === "FOUND" && ["AVAILABLE", "MATCHED"].includes(d.status)
  );
  const totalPotentialXaf = potentialDeclarations.reduce((acc, d) => {
    const prix = d.docTypeInfo?.prix_retrouvaille ?? 0;
    const pct = d.docTypeInfo?.finder_percent ?? 80;
    return acc + (prix * pct) / 100;
  }, 0);
  const totalPotentialPts = potentialDeclarations.reduce((acc, d) => {
    return acc + (d.docTypeInfo?.points_recompense ?? 0);
  }, 0);

  const handleWithdraw = () => {
    if (balance < minWithdrawal) {
      toast.warning(`${t("mesgains_insufficient_balance")} ${minWithdrawal} XAF. ${t("mesgains_current_balance")} ${balance} XAF`);
      return;
    }
    fetchMethods();
    setShowWithdrawModal(true);
  };

  // Shared sub-panels — defined once, rendered in both desktop cols and mobile sections
  const gainsPanel = (
    <Stack gap="lg">
      <WalletCard
        balance={balance}
        points={points}
        minWithdrawal={minWithdrawal}
        progressPct={progressPct}
        onWithdraw={handleWithdraw}
        onHistory={() => setShowHistoryModal(true)}
        fmtAmount={fmtAmount}
        t={t}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon="fa-file-circle-check"
          color="text-green-mid"
          value={String(statsCards.total_found ?? 0)}
          label={t("mesgains_docs_found")}
        />
        <StatCard
          icon="fa-handshake"
          color="text-primary"
          value={String(statsCards.total_returned ?? 0)}
          label={t("mesgains_docs_returned")}
        />
        <StatCard
          icon="fa-coins"
          color="text-amber-500"
          value={fmtAmount(totalFinderPayouts)}
          label={t("mesgains_xaf_earned")}
        />
        <StatCard
          icon="fa-arrow-up-right-from-square"
          color="text-blue-400"
          value={fmtAmount(totalWithdrawn)}
          label={t("mesgains_xaf_withdrawn")}
        />
      </div>

      <PotentialEarningsCard
        declarations={potentialDeclarations}
        totalXaf={totalPotentialXaf}
        totalPts={totalPotentialPts}
        fmtAmount={fmtAmount}
        t={t}
      />

      <PointsCard
        totalPoints={totalPoints}
        pointsBreakdown={pointsBreakdown as any}
        levelLabel={levelLabel}
        pointsToNext={pointsToNext}
        nextLevelPoints={nextLevelPoints}
        onConvert={() => setShowConvertModal(true)}
        onBuy={() => navigate("/acheter-points")}
        fmtAmount={fmtAmount}
        t={t}
      />

      <div className="bg-white border border-borda rounded-[18px] p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <i className="fa-solid fa-mobile-screen-button text-green-mid text-base" />
          <h2 className="font-bricolage text-[15px] font-bold text-textMain">
            {t("mesgains_withdrawal_methods")}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <PaymentMethodCard
            icon="fa-mobile-screen-button"
            name="MTN Mobile Money"
            color="text-yellow-500"
            t={t}
            saved={savedMethods.find(m => m.method_type === "MTN")}
            onManage={() => { fetchMethods(); setShowMethodsModal(true); }}
            onAdd={() => { setAddMethodType("MTN"); setShowAddMethodModal(true); }}
          />
          <PaymentMethodCard
            icon="fa-mobile-screen-button"
            name="Orange Money"
            color="text-orange-500"
            t={t}
            saved={savedMethods.find(m => m.method_type === "ORANGE")}
            onManage={() => { fetchMethods(); setShowMethodsModal(true); }}
            onAdd={() => { setAddMethodType("ORANGE"); setShowAddMethodModal(true); }}
          />
          <PaymentMethodCard
            icon="fa-university"
            name={t("mesgains_bank_transfer")}
            color="text-blue-400"
            t={t}
            saved={savedMethods.find(m => m.method_type === "BANK")}
            onManage={() => { fetchMethods(); setShowMethodsModal(true); }}
            onAdd={() => { setAddMethodType("BANK"); setShowAddMethodModal(true); }}
          />
        </div>

        <p className="text-[11px] text-textMuted mt-3 text-center">
          {t("mesgains_min_withdrawal_delay").replace("{amount}", fmtAmount(minWithdrawal))}
        </p>
      </div>
    </Stack>
  );

  const historyPanel = (
    <Stack gap="lg">
      <TransactionsCard
        transactions={transactions}
        loading={txLoading}
        fmtAmount={fmtAmount}
        fmtDate={fmtDate}
        t={t}
      />
      <EarningsHistoryCard
        earningsHistory={earningsHistory}
        loading={earningsLoading}
        fmtAmount={fmtAmount}
        fmtDate={fmtDate}
        t={t}
      />
    </Stack>
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Tab bar mobile ── */}
      <div className="flex md:hidden border-b border-borda mb-0 bg-bgMain">
        <button
          onClick={() => setActiveSection("gains")}
          className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeSection === "gains"
              ? "border-b-2 border-green-dark text-green-dark"
              : "text-textMuted"
          }`}
        >
          <i className="fa-solid fa-wallet text-xs" />
          Carte &amp; Gains
        </button>
        <button
          onClick={() => setActiveSection("history")}
          className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeSection === "history"
              ? "border-b-2 border-green-dark text-green-dark"
              : "text-textMuted"
          }`}
        >
          <i className="fa-solid fa-clock-rotate-left text-xs" />
          Historique
        </button>
      </div>

      {/* ── Desktop : deux colonnes côte à côte ── */}
      <div className="hidden md:flex flex-row gap-4 flex-1 overflow-hidden px-6 py-6">
        {/* Left panel — Carte & Gains */}
        <div className="w-[45%] overflow-y-auto custom-scroll" style={{ height: "calc(100vh - 130px)" }}>
          <div className="pb-8">
            {gainsPanel}
          </div>
        </div>

        {/* Right panel — Historique */}
        <div className="flex-1 overflow-y-auto custom-scroll" style={{ height: "calc(100vh - 130px)" }}>
          <div className="pb-8">
            {historyPanel}
          </div>
        </div>
      </div>

      {/* ── Mobile : section active plein écran ── */}
      <div className="md:hidden flex-1 overflow-y-auto custom-scroll">
        {activeSection === "gains" && (
          <div className="p-4 pb-24">
            {gainsPanel}
          </div>
        )}
        {activeSection === "history" && (
          <div className="p-4 pb-24">
            {historyPanel}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showWithdrawModal && (
        <WithdrawModal
          balance={balance}
          minWithdrawal={minWithdrawal}
          savedMethods={savedMethods}
          onClose={() => setShowWithdrawModal(false)}
          onDone={() => {
            setShowWithdrawModal(false);
            if (refreshProfile) refreshProfile();
            fetchData();
            fetchMethods();
          }}
          refreshMethods={fetchMethods}
          fmtAmount={fmtAmount}
          t={t}
        />
      )}

      {showHistoryModal && (
        <WithdrawHistoryModal
          onClose={() => setShowHistoryModal(false)}
          fmtAmount={fmtAmount}
          fmtDate={fmtDate}
          t={t}
        />
      )}

      {showMethodsModal && (
        <SavedMethodsModal
          methods={savedMethods}
          onClose={() => setShowMethodsModal(false)}
          onRefresh={fetchMethods}
          t={t}
        />
      )}

      {showAddMethodModal && (
        <AddPaymentMethodModal
          methodType={addMethodType}
          onClose={() => setShowAddMethodModal(false)}
          onDone={() => {
            setShowAddMethodModal(false);
            fetchMethods();
          }}
          t={t}
        />
      )}

      {showConvertModal && (
        <ConvertPointsModal
          points={{ totalPoints: points }}
          onClose={() => setShowConvertModal(false)}
          onDone={() => { setShowConvertModal(false); fetchData(); authService.getProfile().then(user => { if (user && user.id) updateUser(user); }).catch(() => {}); }}
          t={t}
        />
      )}
    </div>
  );
}

/* ── Wallet Card ── */

function WalletCard({ balance, points, minWithdrawal, progressPct, onWithdraw, onHistory, fmtAmount, t }: any) {
  return (
    <Paper
      p="lg"
      className="text-white relative z-0"
      style={{
        background: "linear-gradient(135deg, #2D5A42 0%, #2D5A42 55%, #3B7A58 100%)",
        borderRadius: 20,
      }}
    >
      <div className="absolute w-[260px] h-[260px] rounded-full bg-white/[0.04] -top-[80px] -right-[60px] pointer-events-none" />
      <div className="absolute w-[180px] h-[180px] rounded-full bg-primary/[0.08] -bottom-[60px] -left-[40px] pointer-events-none" />

      <div className="flex items-start justify-between mb-5 relative z-10">
        <div className="flex-1">
          <Text size="xs" fw={500} tt="uppercase" className="tracking-widest" c="white.4">
            {t("mesgains_balance")}
          </Text>
          <Text fw={800} className="font-bricolage" style={{ fontSize: 36, lineHeight: 1 }}>
            {fmtAmount(balance)}{" "}
            <Text component="span" fw={700} c="white.6" style={{ fontSize: 24 }}>
              XAF
            </Text>
          </Text>
          <Group gap={4} mt={4}>
            <i className="fa-solid fa-star text-[#f5a64b] text-xs" />
            <Text fw={700} c="white.8" size="sm">{fmtAmount(points)} pts</Text>
          </Group>
        </div>
        <div className="w-11 h-11 rounded-[13px] bg-white/10 border border-white/15 flex items-center justify-center">
          <i className="fa-solid fa-sack-dollar text-primary text-lg" />
        </div>
      </div>

      <div className="relative z-10 mb-5">
        <Group justify="space-between" mb={6}>
          <Text size="xs" fw={500} c="white.4">{t("mesgains_progress")}</Text>
          <Text fw={700} c="white" size="xs">{fmtAmount(balance)} / {fmtAmount(minWithdrawal)} XAF</Text>
        </Group>
        <Progress
          value={progressPct}
          size="sm"
          radius="xl"
          color="gold"
        />
        <Text size="xs" c="white.4" mt={6}>
          {t("mesgains_min_withdrawal")} {fmtAmount(minWithdrawal)} XAF
        </Text>
      </div>

      <Group gap="sm" className="relative z-10">
        <button
          onClick={onWithdraw}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-dark text-white font-bricolage text-[13.5px] font-bold rounded-[12px] transition-all active:scale-[.98]"
        >
          <i className="fa-solid fa-credit-card text-xs" /> {t("mesgains_withdraw")}
        </button>
        <button
          onClick={onHistory}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-[13px] rounded-[12px] transition-all"
        >
          <i className="fa-solid fa-clock-rotate-left text-xs" /> {t("mesgains_history")}
        </button>
      </Group>
    </Paper>
  );
}

/* ── StatCard ── */

function StatCard({ icon, color, value, label }: { icon: string; color: string; value: string; label: string }) {
  return (
    <Paper p="md" className="border border-borda hover:-translate-y-0.5 hover:shadow-lg transition-all" style={{ borderRadius: 16 }}>
      <i className={`fa-solid ${icon} ${color} text-xl mb-3 block`} />
      <Text fw={800} className="font-bricolage" style={{ fontSize: 24, lineHeight: 1 }} mb={4}>
        {value}
      </Text>
      <Text size="xs" fw={500} c="dimmed">{label}</Text>
    </Paper>
  );
}

/* ── Points Card ── */

function PointsCard({ totalPoints, pointsBreakdown, levelLabel, pointsToNext, nextLevelPoints, onConvert, onBuy, fmtAmount, t }: any) {
  return (
    <Paper p="lg" className="border border-borda" style={{ borderRadius: 18 }}>
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <i className="fa-solid fa-star text-primary text-base" />
          <div>
            <Title order={3} size={15} style={{ lineHeight: 1.3 }}>{t("mesgains_points_title")}</Title>
            <Text size="xs" c="dimmed">{t("mesgains_loyalty_program")}</Text>
          </div>
        </Group>
        <Text fw={800} className="font-bricolage" size="xl" c="gold">{fmtAmount(totalPoints)} pts</Text>
      </Group>

      <Stack gap="xs" mb="md">
        <PointsRow
          label={t("mesgains_declared_docs")}
          detail={`(+${pointsBreakdown.declarations.pts_per_unit || 5} pts × ${pointsBreakdown.declarations.count})`}
          pts={pointsBreakdown.declarations.points}
          color="bg-primary"
          max={5}
        />
        <PointsRow
          label={t("mesgains_returned_docs_points")}
          detail={`(${pointsBreakdown.returns.count} ${t("mesgains_docs")})`}
          pts={pointsBreakdown.returns.points}
          color="bg-green-mid"
          max={5}
        />
        <PointsRow
          label={t("mesgains_referral")}
          detail={`(${pointsBreakdown.referrals.count} ${t("mesgains_people")})`}
          pts={pointsBreakdown.referrals.points}
          color="bg-amber-400"
          max={5}
        />
      </Stack>

      <Paper p="sm" className="bg-primary/5 border border-primary/15" style={{ borderRadius: 12 }}>
        <Group gap="sm">
          <Group gap="xs">
            <i className="fa-solid fa-trophy text-primary text-sm" />
            <div>
              <Text size="sm" fw={700}>{levelLabel}</Text>
              <Text size="xs" c="dimmed">
                {pointsToNext > 0
                  ? `${pointsToNext} ${t("mesgains_points_to_gold")}`
                  : t("mesgains_congrats_gold")}
              </Text>
            </div>
          </Group>
          <div className="text-right">
            <Text size="xs" c="dimmed">{t("mesgains_next_level")}</Text>
            <Text size="sm" fw={700} c="gold">{fmtAmount(nextLevelPoints)} pts</Text>
          </div>
        </Group>
      </Paper>

      {totalPoints > 0 && (
        <button
          onClick={onConvert}
          className="w-full mt-3 py-2.5 bg-surface2 hover:bg-borda border border-borda text-textMain font-bricolage text-[13px] font-bold rounded-[12px] transition-all flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-coins text-xs" /> {t("mesgains_convert_points")}
        </button>
      )}
      <button
        onClick={onBuy}
        className="w-full mt-2 py-2.5 bg-green-mid hover:bg-green-dark text-white font-bricolage text-[13px] font-bold rounded-[12px] transition-all flex items-center justify-center gap-2"
      >
        <i className="fa-solid fa-cart-shopping text-xs" /> Acheter des points
      </button>
    </Paper>
  );
}

function PointsRow({ label, detail, pts, color, max }: any) {
  const pct = Math.min((pts / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-[12px] mb-1">
        <span className="text-textMuted font-medium">
          {label} <span className="text-textMain font-semibold">{detail}</span>
        </span>
        <span className="font-bold text-textMain">{pts} pts</span>
      </div>
      <div className="bg-borda rounded-[99px] overflow-hidden h-[6px]">
        <div className={`h-full rounded-[99px] ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── Potential Earnings Card ── */

function PotentialEarningsCard({ declarations, totalXaf, totalPts, fmtAmount, t }: any) {
  if (declarations.length === 0) return null;

  return (
    <Paper className="border border-borda" style={{ borderRadius: 18, overflow: "hidden" }}>
      <Group px="lg" py="md" className="border-b border-borda">
        <Group gap="sm">
          <i className="fa-solid fa-sack-dollar text-amber-500 text-base" />
          <div>
            <Title order={3} size={15}>{t("mesgains_potential_title")}</Title>
            <Text size="xs" c="dimmed">{t("mesgains_potential_desc")}</Text>
          </div>
        </Group>
      </Group>

      <Paper px="lg" py="md" className="bg-surface2 border-b border-borda" style={{ borderRadius: 0 }}>
        <SimpleGrid cols={2} spacing="md">
          <Group gap="sm">
            <i className="fa-solid fa-coins text-amber-500 text-xl" />
            <div>
              <Text fw={800} className="font-bricolage" size="xl" lh={1}>
                {fmtAmount(totalXaf)} <Text component="span" fw={700} size="sm" c="dimmed">XAF</Text>
              </Text>
              <Text size="xs" c="dimmed" mt={2}>{t("mesgains_potential_xaf")}</Text>
            </div>
          </Group>
          <Group gap="sm">
            <i className="fa-solid fa-star text-primary text-xl" />
            <div>
              <Text fw={800} className="font-bricolage" size="xl" lh={1}>
                {fmtAmount(totalPts)} <Text component="span" fw={700} size="sm" c="dimmed">pts</Text>
              </Text>
              <Text size="xs" c="dimmed" mt={2}>{t("mesgains_potential_pts")}</Text>
            </div>
          </Group>
        </SimpleGrid>
      </Paper>

      <Stack gap={0} className="divide-y divide-borda">
        {declarations.map((decl: Declaration) => {
          const prix = decl.docTypeInfo?.prix_retrouvaille ?? 0;
          const pct = decl.docTypeInfo?.finder_percent ?? 80;
          const xafGain = (prix * pct) / 100;
          const ptsGain = decl.docTypeInfo?.points_recompense ?? 0;
          const icon = decl.docTypeInfo?.icone || "file";

          return (
            <Group key={decl.id} px="lg" py="sm" gap="md" className="hover:bg-surface2 transition-colors">
              <i className={`fa-solid fa-${icon} text-amber-500 text-base flex-shrink-0`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={600} truncate lh="tight">
                  {decl.docTypeInfo?.nom || decl.doc_type || "Document"}
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  {decl.identifiant_doc_dm || decl.id.slice(0, 8)}
                  {decl.ville ? ` · ${decl.ville}` : ""}
                </Text>
              </div>
              <Group gap="sm" wrap="nowrap" style={{ flexShrink: 0 }}>
                <Badge
                  size="xs"
                  variant="light"
                  color={decl.status === "MATCHED" ? "green" : "gold"}
                >
                  {decl.status === "MATCHED" ? t("mesgains_potential_matched") : t("mesgains_potential_available")}
                </Badge>
                <div className="text-right">
                  <Text fw={800} size="sm" c="amber.5" className="font-bricolage">
                    +{fmtAmount(xafGain)} XAF
                  </Text>
                  <Text size={10} fw={700} c="gold">+{ptsGain} pts</Text>
                </div>
              </Group>
            </Group>
          );
        })}
      </Stack>

      <Paper px="lg" py="sm" className="bg-surface2 border-t border-borda" style={{ borderRadius: 0 }}>
        <Text size="xs" c="dimmed" ta="center">
          <i className="fa-solid fa-circle-info text-amber-400 mr-1" />
          {t("mesgains_potential_note")}
        </Text>
      </Paper>
    </Paper>
  );
}

/* ── Transactions Card ── */

function TransactionsCard({ transactions, loading, fmtAmount, fmtDate, t }: any) {
  return (
    <Paper className="border border-borda" style={{ borderRadius: 18, overflow: "hidden" }}>
      <Group px="lg" py="md" className="border-b border-borda">
        <Group gap="sm">
          <i className="fa-solid fa-clock-rotate-left text-green-mid text-base" />
          <Title order={3} size={15}>{t("mesgains_recent_transactions")}</Title>
        </Group>
      </Group>

      {loading ? (
        <Group justify="center" py="xl">
          <Loader size="sm" color="gold" />
        </Group>
      ) : transactions.length === 0 ? (
        <Stack align="center" py="xl" gap="sm">
          <i className="fa-solid fa-receipt text-3xl opacity-20" />
          <Text size="sm" c="dimmed">{t("mesgains_no_transactions")}</Text>
        </Stack>
      ) : (
        <Stack gap={0} className="divide-y divide-borda">
          {transactions.map((tx: Transaction) => {
            const isPositive = tx.amount > 0 && tx.type !== "recovery_fee";
            const meta = getTxMeta(tx.type || "", t);
            return (
              <Group key={tx.id} px="lg" py="sm" gap="md" className="hover:bg-surface2 transition-colors">
                <i className={`fa-solid ${meta.icon} ${meta.color} text-base flex-shrink-0`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={600} truncate>{meta.label}</Text>
                  <Text size="xs" c="dimmed" mt={2}>{meta.sub} · {fmtDate(tx.created_at)}</Text>
                </div>
                <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
                  <Text fw={800} className="font-bricolage" size="sm" c={isPositive ? "green.6" : "dimmed"}>
                    {isPositive ? "+" : "-"}{fmtAmount(Math.abs(tx.amount))} XAF
                  </Text>
                  <TxStatusBadge status={tx.status} t={t} />
                </Stack>
              </Group>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}

/* ── Earnings History Card ── */

function EarningsHistoryCard({ earningsHistory, loading, fmtAmount, fmtDate, t }: any) {
  // State for full history tab
  const [activeTab, setActiveTab] = useState<string | null>("recent");
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);
  const [pointsHistoryLoading, setPointsHistoryLoading] = useState(false);
  const [pointsHistoryFilter, setPointsHistoryFilter] = useState<string | null>(null);
  const [pointsHistoryTotal, setPointsHistoryTotal] = useState(0);
  const [pointsHistoryPage, setPointsHistoryPage] = useState(1);

  async function fetchPointsHistory(type?: string | null, page = 1) {
    setPointsHistoryLoading(true);
    try {
      const res = await authService.getEarningsHistory({ type: type || undefined, page, limit: 10 });
      if (res.success && res.data) {
        const raw = res.data as any;
        setPointsHistory(Array.isArray(raw) ? raw : raw.data || []);
        setPointsHistoryTotal(raw.total ?? raw.data?.length ?? 0);
      }
    } catch {}
    finally { setPointsHistoryLoading(false); }
  }

  // Fetch data when history tab becomes active
  useEffect(() => {
    if (activeTab === 'history' && pointsHistory.length === 0) {
      fetchPointsHistory(pointsHistoryFilter, 1);
    }
  }, [activeTab]);

  return (
    <Paper className="border border-borda" style={{ borderRadius: 18, overflow: "hidden" }}>
      <Group px="lg" py="md" className="border-b border-borda" justify="space-between">
        <Group gap="sm">
          <i className="fa-solid fa-clock-rotate-left text-primary text-base" />
          <Title order={3} size={15}>{t("mesgains_earnings_history") || "Historique des gains"}</Title>
        </Group>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingTop: '0.5rem' }}>
          <Tabs.Tab value="recent">
            Gains récents
          </Tabs.Tab>
          <Tabs.Tab value="history">
            Historique complet
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="recent">
          {loading ? (
            <Group justify="center" py="xl">
              <Loader size="sm" color="gold" />
            </Group>
          ) : earningsHistory.length === 0 ? (
            <Stack align="center" py="xl" gap="sm">
              <i className="fa-solid fa-coins text-3xl opacity-20" />
              <Text size="sm" c="dimmed">{t("mesgains_no_earnings") || "Aucun gain pour le moment"}</Text>
            </Stack>
          ) : (
            <>
              <Text size="xs" fw={500} c="dimmed" px="lg" pt="sm">
                {earningsHistory.length} {t("mesgains_entries") || "entrées"}
              </Text>
              <Stack gap={0} className="divide-y divide-borda">
                {earningsHistory.map((entry: EarningsRecord) => {
                  const isPoints = entry.currency === "POINTS";
                  const meta = getEarningMeta(entry.type, t);
                  return (
                    <Group key={entry.id} px="lg" py="sm" gap="md" className="hover:bg-surface2 transition-colors">
                      <i className={`fa-solid ${meta.icon} ${meta.color} text-base flex-shrink-0`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={600} truncate>{entry.description || meta.label}</Text>
                        <Text size="xs" c="dimmed" mt={2}>{fmtDate(entry.created_at)}</Text>
                      </div>
                      <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
                        <Text fw={800} className="font-bricolage" size="sm" c={isPoints ? "gold" : "green.6"}>
                          +{fmtAmount(entry.amount)} {isPoints ? "pts" : "XAF"}
                        </Text>
                      </Stack>
                    </Group>
                  );
                })}
              </Stack>
            </>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="history">
          <div style={{ padding: '1rem 1.25rem 0.75rem' }}>
            <Group justify="space-between" mb="md">
              <Select
                placeholder="Filtrer par type"
                clearable
                w={220}
                value={pointsHistoryFilter}
                onChange={(value) => {
                  setPointsHistoryFilter(value);
                  setPointsHistoryPage(1);
                  fetchPointsHistory(value, 1);
                }}
                data={[
                  { label: 'Déclarations', value: 'DECLARATION' },
                  { label: 'Parrainages', value: 'REFERRAL' },
                  { label: 'Matchs', value: 'MATCH' },
                  { label: 'Bonus', value: 'BONUS' },
                  { label: 'Conversions', value: 'CONVERSION' },
                  { label: 'Retraits', value: 'WITHDRAWAL' },
                  { label: 'Remboursements', value: 'WITHDRAWAL_REFUND' },
                  { label: 'Ajustements', value: 'ADJUSTMENT' },
                ]}
                styles={{
                  input: {
                    borderColor: '#EAE3D8',
                    borderRadius: '12px',
                  }
                }}
              />
              <Text size="xs" fw={500} c="dimmed">
                {pointsHistoryTotal} transaction(s)
              </Text>
            </Group>
          </div>

          {pointsHistoryLoading ? (
            <Group justify="center" py="xl">
              <Loader size="sm" color="gold" />
            </Group>
          ) : pointsHistory.length === 0 ? (
            <Stack align="center" py="xl" gap="sm">
              <i className="fa-solid fa-coins text-3xl opacity-20" />
              <Text size="sm" c="dimmed">{t("mesgains_no_earnings") || "Aucun gain pour le moment"}</Text>
            </Stack>
          ) : (
            <>
              <Stack gap={0} className="divide-y divide-borda">
                {pointsHistory.map((entry: EarningsRecord) => {
                  const isPoints = entry.currency === "POINTS";
                  const meta = getEarningMeta(entry.type, t);
                  return (
                    <Group key={entry.id} px="lg" py="sm" gap="md" className="hover:bg-surface2 transition-colors">
                      <i className={`fa-solid ${meta.icon} ${meta.color} text-base flex-shrink-0`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={600} truncate>{entry.description || meta.label}</Text>
                        <Text size="xs" c="dimmed" mt={2}>{fmtDate(entry.created_at)}</Text>
                      </div>
                      <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
                        <Text fw={800} className="font-bricolage" size="sm" c={isPoints ? "gold" : "green.6"}>
                          +{fmtAmount(entry.amount)} {isPoints ? "pts" : "XAF"}
                        </Text>
                      </Stack>
                    </Group>
                  );
                })}
              </Stack>
              <Group justify="center" p="md">
                <Pagination
                  total={Math.ceil(pointsHistoryTotal / 10)}
                  value={pointsHistoryPage}
                  onChange={(p) => {
                    setPointsHistoryPage(p);
                    fetchPointsHistory(pointsHistoryFilter, p);
                  }}
                />
              </Group>
            </>
          )}
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
}

/* ── PaymentMethodCard ── */

function PaymentMethodCard({ icon, name, color, saved, onAdd, onManage, t }: any) {
  const hasMethod = !!saved;
  return (
    <Paper
      onClick={hasMethod ? onManage : onAdd}
      className={`border-2 cursor-pointer hover:border-primary transition-all group ${
        hasMethod ? "border-primary bg-primary/5" : "border-borda bg-surface2"
      }`}
      style={{ borderRadius: 13, display: "flex", alignItems: "center", gap: 12, padding: 14 }}
    >
      <i className={`fa-solid ${icon} ${color} text-base flex-shrink-0`} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={700} truncate>{name}</Text>
        <Text size={10.5} c={hasMethod ? "green.6" : "dimmed"} fw={hasMethod ? 600 : 400}>
          {hasMethod ? `\u2713 ${t("mesgains_connected")}` : t("mesgains_add")}
        </Text>
      </div>
      <i className={`fa-solid ${hasMethod ? "fa-circle-check text-primary" : "fa-plus text-textMuted group-hover:text-primary"} text-sm transition-colors`} />
    </Paper>
  );
}

/* ── WithdrawModal ── */

function WithdrawModal({ balance, minWithdrawal, savedMethods, onClose, onDone, refreshMethods, fmtAmount, t }: any) {
  const [amount, setAmount] = useState("");
  const [tab, setTab] = useState<"saved" | "manual">("saved");
  const [selectedMethod, setSelectedMethod] = useState<SavedPaymentMethod | null>(null);
  const [manualType, setManualType] = useState<"MTN" | "ORANGE" | "BANK">("MTN");
  const [manualName, setManualName] = useState("");
  const [manualNumber, setManualNumber] = useState("");
  const [manualBank, setManualBank] = useState("");
  const [saveMethod, setSaveMethod] = useState(false);
  const [savingMethod, setSavingMethod] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [validationErr, setValidationErr] = useState("");

  const numAmount = Number(amount) || 0;
  const isValid = numAmount >= minWithdrawal && numAmount <= balance;

  const handleSubmit = async () => {
    if (!isValid) return;

    if (tab === "manual" && (manualType === "MTN" || manualType === "ORANGE")) {
      const { validatePhone } = await import("../../utils/phoneValidation");
      const vErr = validatePhone(manualNumber, manualType);
      if (vErr) { setValidationErr(vErr); return; }
    }
    setValidationErr("");

    setSubmitting(true);
    setError("");

    try {
      let methodType: string;
      let accountNumber: string;

      if (tab === "saved" && selectedMethod) {
        methodType = selectedMethod.method_type;
        accountNumber = selectedMethod.account_number;
      } else {
        methodType = manualType;
        accountNumber = manualNumber;

        if (saveMethod) {
          setSavingMethod(true);
          await paymentsService.createPaymentMethod({
            method_type: manualType,
            account_name: manualName,
            account_number: manualNumber,
            bank_name: manualType === "BANK" ? manualBank : undefined,
          });
          refreshMethods();
          setSavingMethod(false);
        }
      }

      await paymentsService.requestWithdrawal({
        amount: numAmount,
        paymentMethod: methodType,
        paymentDetails: accountNumber,
      });

      setSuccess(true);
      setTimeout(() => onDone(), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || t("mesgains_withdraw_modal_error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title={t("mesgains_withdraw_modal_title")} size="sm">
      {success ? (
        <Stack align="center" py="xl" gap="md">
          <i className="fa-solid fa-check-circle text-green-mid text-5xl" />
          <Text fw={700} size="md" className="font-bricolage">{t("mesgains_withdraw_modal_success")}</Text>
        </Stack>
      ) : (
        <Stack gap="md">
            {(error || validationErr) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-[12px] text-red-600 text-[12px] font-semibold flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation" /> {error || validationErr}
              </div>
            )}

            <div>
              <label className="text-[12px] font-semibold text-textMuted mb-1.5 block">{t("mesgains_withdraw_modal_amount")}</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="25"
                className="w-full px-4 py-3 bg-gray-50 border border-borda rounded-[12px] text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
              <p className="text-[11px] text-textMuted mt-1">
                {t("mesgains_balance")}: {fmtAmount(balance)} XAF · Min: {fmtAmount(minWithdrawal)} XAF
              </p>
            </div>

            <div className="flex gap-2 bg-gray-50 rounded-[12px] p-1">
              <button
                onClick={() => setTab("saved")}
                className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-all ${tab === "saved" ? "bg-white shadow-sm text-textMain" : "text-textMuted hover:text-textMain"}`}
              >
                {t("mesgains_withdraw_modal_saved")}
              </button>
              <button
                onClick={() => setTab("manual")}
                className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-all ${tab === "manual" ? "bg-white shadow-sm text-textMain" : "text-textMuted hover:text-textMain"}`}
              >
                {t("mesgains_withdraw_modal_manual")}
              </button>
            </div>

            {tab === "saved" ? (
              savedMethods.length === 0 ? (
                <div className="p-6 text-center text-textMuted">
                  <i className="fa-solid fa-credit-card text-3xl opacity-20 mb-2" />
                  <p className="text-[12px]">{t("mesgains_withdraw_modal_no_methods")}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scroll">
                  {savedMethods.map((m: SavedPaymentMethod) => {
                    const typeIcon = m.method_type === "MTN" || m.method_type === "ORANGE" ? "fa-mobile-screen-button" : "fa-university";
                    const typeColor = m.method_type === "MTN" ? "text-yellow-500" : m.method_type === "ORANGE" ? "text-orange-500" : "text-blue-400";
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMethod(m)}
                        className={`flex items-center gap-3 p-3 border-2 rounded-[12px] cursor-pointer transition-all ${
                          selectedMethod?.id === m.id ? "border-primary bg-primary/5" : "border-borda hover:border-gray-300"
                        }`}
                      >
                        <i className={`fa-solid ${typeIcon} ${typeColor} text-base flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-bold text-textMain truncate">{m.account_name || `${m.method_type} - ${m.account_number}`}</p>
                          <p className="text-[11px] text-textMuted">{m.account_number}{m.is_default ? ` · ${t("mesgains_withdraw_default_method")}` : ""}</p>
                        </div>
                        {selectedMethod?.id === m.id && <i className="fa-solid fa-circle-check text-primary" />}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[12px] font-semibold text-textMuted mb-1.5 block">{t("mesgains_withdraw_modal_method")}</label>
                  <div className="flex gap-2">
                    {(["MTN", "ORANGE", "BANK"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setManualType(type)}
                        className={`flex-1 py-2.5 text-[11px] font-bold rounded-[10px] border-2 transition-all ${
                          manualType === type
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-borda text-textMuted hover:border-gray-300"
                        }`}
                      >
                        {type === "BANK" ? t("mesgains_bank_transfer") : type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-textMuted mb-1.5 block">{t("mesgains_withdraw_modal_account_name")}</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-borda rounded-[12px] text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-textMuted mb-1.5 block">{t("mesgains_withdraw_modal_account_number")}</label>
                  <input
                    type="text"
                    value={manualNumber}
                    onChange={(e) => setManualNumber(e.target.value)}
                    placeholder="+237 XXXXXXXXX"
                    className="w-full px-4 py-3 bg-gray-50 border border-borda rounded-[12px] text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  {manualType === "MTN" && <p className="text-[11px] text-textMuted mt-1">{t("payment_phone_mtn_hint")}</p>}
                  {manualType === "ORANGE" && <p className="text-[11px] text-textMuted mt-1">{t("payment_phone_orange_hint")}</p>}
                </div>

                {manualType === "BANK" && (
                  <div>
                    <label className="text-[12px] font-semibold text-textMuted mb-1.5 block">{t("mesgains_withdraw_modal_bank_name")}</label>
                    <input
                      type="text"
                      value={manualBank}
                      onChange={(e) => setManualBank(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-borda rounded-[12px] text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveMethod}
                    onChange={(e) => setSaveMethod(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-[12.5px] font-medium text-textMain">{t("mesgains_withdraw_modal_save")}</span>
                </label>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!isValid || submitting || (tab === "saved" && !selectedMethod) || (tab === "manual" && !manualNumber)}
              className="w-full py-3 bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bricolage text-[13.5px] font-bold rounded-[12px] transition-all active:scale-[.98] flex items-center justify-center gap-2"
            >
              {submitting || savingMethod ? (
                <><i className="fa-solid fa-spinner fa-spin" /> {t("mesgains_withdraw_modal_processing")}</>
              ) : (
                <>{t("mesgains_withdraw_modal_confirm")}</>
              )}
            </button>
          </Stack>
        )}
    </Modal>
  );
}

/* ── WithdrawHistoryModal ── */

function WithdrawHistoryModal({ onClose, fmtAmount, fmtDate, t }: any) {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentsService.getMyWithdrawals()
      .then((res) => {
        if (res.success && res.data) setWithdrawals(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (status: string) => {
    const color = status === "approved" ? "green" : status === "pending" ? "orange" : "red";
    const label = status === "approved" ? t("mesgains_withdraw_status_approved") : status === "pending" ? t("mesgains_withdraw_status_pending") : t("mesgains_withdraw_status_rejected");
    return <Badge variant="light" color={color} radius="xl" size="xs">{label}</Badge>;
  };

  return (
    <Modal opened onClose={onClose} title={t("mesgains_withdraw_history_modal_title")} size="sm">
      {loading ? (
        <Group justify="center" py="xl">
          <Loader size="sm" color="gold" />
        </Group>
      ) : withdrawals.length === 0 ? (
        <Stack align="center" py="xl" gap="sm">
          <i className="fa-solid fa-arrow-right-from-bracket text-3xl opacity-20" />
          <Text size="sm" c="dimmed">{t("mesgains_withdraw_history_empty")}</Text>
        </Stack>
      ) : (
        <Stack gap={0} className="divide-y divide-borda">
          {withdrawals.map((w: any) => (
            <Group key={w.id} px="lg" py="sm" gap="md" className="hover:bg-surface2 transition-colors">
              <i className="fa-solid fa-arrow-right-from-bracket text-blue-400 text-base flex-shrink-0" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={600} truncate>{fmtAmount(w.amount)} XAF</Text>
                <Text size="xs" c="dimmed" mt={2}>{w.payment_method} · {fmtDate(w.created_at)}</Text>
              </div>
              <Stack gap={4} align="flex-end">
                {statusBadge(w.status)}
                {w.admin_note && <Text size={10} c="dimmed" className="max-w-[120px] truncate">{w.admin_note}</Text>}
              </Stack>
            </Group>
          ))}
        </Stack>
      )}
    </Modal>
  );
}

/* ── SavedMethodsModal ── */

function SavedMethodsModal({ methods, onClose, onRefresh, t }: any) {
  const toast = useToast();

  const handleDelete = async (id: string) => {
    try {
      await paymentsService.deletePaymentMethod(id);
      toast.success("Méthode de paiement supprimée");
      onRefresh();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await paymentsService.setDefaultPaymentMethod(id);
      toast.success("Méthode définie par défaut");
      onRefresh();
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  const typeIcon = (type: string) => type === "MTN" || type === "ORANGE" ? "fa-mobile-screen-button" : "fa-university";
  const typeColor = (type: string) => type === "MTN" ? "text-yellow-500" : type === "ORANGE" ? "text-orange-500" : "text-blue-400";

  return (
    <Modal opened onClose={onClose} title={t("mesgains_withdrawal_methods")} size="sm">
      {methods.length === 0 ? (
        <Stack align="center" py="xl" gap="sm">
          <i className="fa-solid fa-credit-card text-3xl opacity-20" />
          <Text size="sm" c="dimmed">{t("mesgains_withdraw_modal_no_methods")}</Text>
        </Stack>
      ) : (
        <Stack gap="sm">
          {methods.map((m: SavedPaymentMethod) => (
            <Group key={m.id} p="sm" className="border border-borda" style={{ borderRadius: 14 }} gap="md">
              <i className={`fa-solid ${typeIcon(m.method_type)} ${typeColor(m.method_type)} text-base flex-shrink-0`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={700} truncate>{m.account_name || `${m.method_type} - ${m.account_number}`}</Text>
                <Text size="xs" c="dimmed">{m.account_number}</Text>
              </div>
              <Group gap="xs">
                {!m.is_default && (
                  <button onClick={() => handleSetDefault(m.id)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-primary/10 flex items-center justify-center transition-colors group" title={t("mesgains_withdraw_set_default")}>
                    <i className="fa-solid fa-star text-[11px] text-textMuted group-hover:text-primary transition-colors" />
                  </button>
                )}
                {m.is_default && (
                  <Badge size="xs" variant="light" color="gold">{t("mesgains_withdraw_default_method")}</Badge>
                )}
                <button onClick={() => handleDelete(m.id)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 flex items-center justify-center transition-colors group">
                  <i className="fa-solid fa-trash-can text-[11px] text-textMuted group-hover:text-red-500 transition-colors" />
                </button>
              </Group>
            </Group>
          ))}
        </Stack>
      )}
    </Modal>
  );
}

/* ── AddPaymentMethodModal ── */

function AddPaymentMethodModal({ methodType, onClose, onDone, t }: any) {
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [validationErr, setValidationErr] = useState("");

  const typeIcon = methodType === "BANK" ? "fa-university" : "fa-mobile-screen-button";
  const typeColor = methodType === "MTN" ? "text-yellow-500" : methodType === "ORANGE" ? "text-orange-500" : "text-blue-400";
  const typeLabel = methodType === "BANK" ? t("mesgains_bank_transfer") : methodType;

  const handleSave = async () => {
    setValidationErr("");
    if (!accountNumber) return;

    if (methodType === "MTN" || methodType === "ORANGE") {
      const { validatePhone } = await import("../../utils/phoneValidation");
      const err = validatePhone(accountNumber, methodType);
      if (err) { setValidationErr(err); return; }
    }

    setSaving(true);
    setError("");
    try {
      await paymentsService.createPaymentMethod({
        method_type: methodType,
        account_name: accountName,
        account_number: accountNumber,
        bank_name: methodType === "BANK" ? bankName : undefined,
      });
      setSuccess(true);
      setTimeout(() => onDone(), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title={typeLabel} size="sm">
      <Group gap="sm" mb="md">
        <i className={`fa-solid ${typeIcon} ${typeColor} text-xl`} />
      </Group>

        {success ? (
          <div className="p-8 text-center">
            <i className="fa-solid fa-check-circle text-green-mid text-5xl block mb-4 mx-auto" />
            <p className="font-bricolage text-[16px] font-bold text-textMain">{t("mesgains_withdraw_modal_method_saved")}</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {(error || validationErr) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-[12px] text-red-600 text-[12px] font-semibold flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation" /> {error || validationErr}
              </div>
            )}

            <div>
              <label className="text-[12px] font-semibold text-textMuted mb-1.5 block">{t("mesgains_withdraw_modal_account_name")}</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Ex: Jean Dupont"
                className="w-full px-4 py-3 bg-gray-50 border border-borda rounded-[12px] text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-textMuted mb-1.5 block">{t("mesgains_withdraw_modal_account_number")}</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={methodType === "BANK" ? "Numéro de compte" : "+237 XXXXXXXXX"}
                className="w-full px-4 py-3 bg-gray-50 border border-borda rounded-[12px] text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
              {methodType === "MTN" && <p className="text-[11px] text-textMuted mt-1">{t("payment_phone_mtn_hint")}</p>}
              {methodType === "ORANGE" && <p className="text-[11px] text-textMuted mt-1">{t("payment_phone_orange_hint")}</p>}
            </div>
            {methodType === "BANK" && (
              <div>
                <label className="text-[12px] font-semibold text-textMuted mb-1.5 block">{t("mesgains_withdraw_modal_bank_name")}</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Ex: Société Générale"
                  className="w-full px-4 py-3 bg-gray-50 border border-borda rounded-[12px] text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !accountNumber}
              className="w-full py-3 bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bricolage text-[13.5px] font-bold rounded-[12px] transition-all active:scale-[.98] flex items-center justify-center gap-2"
            >
              {saving ? (
                <><i className="fa-solid fa-spinner fa-spin" /> {t("mesgains_withdraw_modal_saving_method")}</>
              ) : (
                <><i className="fa-solid fa-floppy-disk" /> {t("mesgains_withdraw_modal_save")}</>
              )}
            </button>
          </div>
        )}
    </Modal>
  );
}

/* ── Convert Points Modal ── */

function ConvertPointsModal({ points, onClose, onDone, onUpdateUser, t }: { points: any; onClose: () => void; onDone: () => void; onUpdateUser?: (data: any) => void; t: (key: string) => string }) {
  const [step, setStep] = useState<"amount" | "confirm" | "success">("amount");
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rate, setRate] = useState(10);
  const numAmount = parseInt(amount || "0", 10);
  const xafValue = Math.round(numAmount / rate);
  const canProceed = numAmount > 0 && numAmount <= points.totalPoints;
  const canConfirm = password.length > 0;

  useEffect(() => {
    apiClient.get("points/rate").then((res) => {
      if (res.data?.rate) setRate(res.data.rate);
    }).catch(() => {});
  }, []);

  const goToConfirm = async () => {
    if (!canProceed) return;
    setError("");
    try {
      const res = await apiClient.get("points/rate");
      const rate = res.data?.rate || 10;
      setRate(rate);
      const maxRes = await apiClient.get("auth/earnings-stats");
      const serverPoints = maxRes.data?.total_points ?? points.totalPoints;
      if (numAmount > serverPoints) {
        setError(`Solde insuffisant. Vous avez ${serverPoints.toLocaleString()} pts disponibles.`);
        return;
      }
      setStep("confirm");
    } catch {
      setStep("confirm");
    }
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.post(`points/convert`, { amount: numAmount, password });
      if (res.data.success) {
        setStep("success");
        setTimeout(() => onDone(), 2000);
      } else {
        setError(res.data.message || t("mesgains_convert_error"));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t("mesgains_convert_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title={step === "success" ? "Conversion réussie" : t("mesgains_convert_title")} size="sm">
      <Stack align="center" gap="md" mb="md">
        <i className={`${step === "success" ? "fa-solid fa-check-circle text-green-mid" : "fa-solid fa-coins text-primary"} text-4xl`} />
        <Text size="sm" c="dimmed">{t("mesgains_convert_balance")}</Text>
        <Text fw={800} className="font-bricolage" size="xl" c="gold">{points.totalPoints.toLocaleString()} pts</Text>
      </Stack>

      {/* Étape 1 : choix du montant */}
      {step === "amount" && (
        <>
          <div className="mb-4">
            <Text size="xs" fw={600} c="dimmed" mb={6}>{t("mesgains_convert_amount")}</Text>
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(""); }}
              placeholder="0"
              min={1}
              max={points.totalPoints}
              className="w-full px-4 py-3 bg-gray-50 border border-borda rounded-[12px] text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
            <Group justify="space-between" mt={6}>
              <Text size="xs" c="dimmed">{t("mesgains_convert_rate")}: {rate} pt = 1 XAF</Text>
              <button onClick={() => setAmount(String(points.totalPoints))} className="text-[11px] text-primary font-semibold hover:underline">{t("mesgains_convert_max")}</button>
            </Group>
          </div>

          {numAmount > 0 && (
            <Paper p="sm" className="bg-primary/5 border border-primary/15 mb-md" style={{ borderRadius: 12 }}>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">{t("mesgains_convert_receive")}</Text>
                <Text fw={800} className="font-bricolage" size="md" c="gold">{xafValue.toLocaleString()} XAF</Text>
              </Group>
            </Paper>
          )}

          {error && (
            <Paper p="sm" className="bg-red-50 border border-red-200 mb-md" style={{ borderRadius: 10 }}>
              <Text size="xs" c="red.6" ta="center">{error}</Text>
            </Paper>
          )}

          <button
            onClick={goToConfirm}
            disabled={!canProceed}
            className="w-full py-3 bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bricolage text-[13.5px] font-bold rounded-[12px] transition-all active:scale-[.98] flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-arrow-right" /> {t("mesgains_convert_button") || "Convertir"}
          </button>
        </>
      )}

      {/* Étape 2 : confirmation mot de passe */}
      {step === "confirm" && (
        <>
          <Paper p="sm" className="bg-primary/5 border border-primary/15 mb-md" style={{ borderRadius: 12 }}>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{t("mesgains_convert_receive")}</Text>
              <Text fw={800} className="font-bricolage" size="md" c="gold">{xafValue.toLocaleString()} XAF</Text>
            </Group>
            <Group justify="space-between" mt={4}>
              <Text size="xs" c="dimmed">{t("mesgains_convert_amount")}</Text>
              <Text size="sm" fw={600}>{numAmount.toLocaleString()} pts</Text>
            </Group>
          </Paper>

          <div className="mb-4">
            <Text size="xs" fw={600} c="dimmed" mb={6}>Confirmez votre mot de passe</Text>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-50 border border-borda rounded-[12px] text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <i className={`fa-solid ${showPw ? "fa-eye-slash" : "fa-eye"}`} />
              </button>
            </div>
          </div>

          {error && (
            <Paper p="sm" className="bg-red-50 border border-red-200 mb-md" style={{ borderRadius: 10 }}>
              <Text size="xs" c="red.6" ta="center">{error}</Text>
            </Paper>
          )}

          <Group grow>
            <button
              onClick={() => { setStep("amount"); setPassword(""); setError(""); }}
              className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bricolage text-[13.5px] font-bold rounded-[12px] transition-all"
            >
              Retour
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm || loading}
              className="py-3 bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bricolage text-[13.5px] font-bold rounded-[12px] transition-all active:scale-[.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin" /> {t("mesgains_convert_loading")}</>
              ) : (
                <><i className="fa-solid fa-lock" /> Confirmer la conversion</>
              )}
            </button>
          </Group>
        </>
      )}

      {/* Étape 3 : succès */}
      {step === "success" && (
        <>
          <Paper p="sm" className="bg-green-50 border border-green-200 mb-md" style={{ borderRadius: 10 }}>
            <Group justify="center" gap="xs">
              <i className="fa-solid fa-check-circle text-green-600" />
              <Text size="sm" c="green.7" fw={600}>{xafValue.toLocaleString()} XAF ajoutés à votre portefeuille</Text>
            </Group>
          </Paper>
          <Text size="xs" c="dimmed" ta="center">Redirection dans un instant...</Text>
        </>
      )}
    </Modal>
  );
}

/* ── Helpers ── */

function TxStatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const color =
    status === "SUCCESS" ? "green" : status === "PENDING" ? "orange" : "gray";
  const label =
    status === "SUCCESS" ? t("tx_success") : status === "PENDING" ? t("tx_pending") : status;
  return <Badge variant="light" color={color} radius="xl" size="xs">{label}</Badge>;
}

function getEarningMeta(type: string, t: (key: string) => string): { icon: string; color: string; label: string } {
  if (type === "declaration_points") return { icon: "fa-file-circle-check", color: "text-primary", label: t("mesgains_declaration_points") || "Points déclaration" };
  if (type === "return_points") return { icon: "fa-handshake", color: "text-green-mid", label: t("mesgains_return_points") || "Points remise document" };
  if (type === "referral_points") return { icon: "fa-user-plus", color: "text-amber-500", label: t("mesgains_referral_points") || "Points parrainage" };
  if (type === "referral_bonus") return { icon: "fa-gift", color: "text-purple-400", label: t("mesgains_referral_bonus") || "Bonus parrainage" };
  if (type === "finder_payout") return { icon: "fa-sack-dollar", color: "text-green-mid", label: t("mesgains_finder_payout") || "Récompense remise" };
  return { icon: "fa-coins", color: "text-gray-500", label: type };
}

function getTxMeta(type: string, t: (key: string) => string): { icon: string; color: string; label: string; sub: string } {
  if (type === "finder_payout") return { icon: "fa-file-circle-check", color: "text-green-mid", label: t("tx_commission"), sub: t("tx_reward") };
  if (type === "recovery_fee") return { icon: "fa-arrow-up", color: "text-orange-500", label: t("tx_recovery_fee"), sub: t("tx_payment_made") };
  if (type === "withdrawal") return { icon: "fa-arrow-right-from-bracket", color: "text-blue-400", label: t("tx_withdrawal"), sub: t("tx_mobile_money") };
  return { icon: "fa-receipt", color: "text-gray-500", label: type, sub: "—" };
}
