import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";
import { paymentsService, type SavedPaymentMethod } from "../../services/paymentsService";
import { settingsService } from "../../services/settingsService";
import { authService } from "../../services/authService";
import { earningsService } from "../../services/earningsService";
import { declarationsService } from "../../services/declarationsService";
import Topbar from "../../layout/Topbar";
import type { Transaction, EarningsRecord, Declaration } from "../../types/api";

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
  const { user, updateUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [statsData, setStatsData] = useState<Record<string, unknown> | null>(null);
  const [minWithdrawal, setMinWithdrawal] = useState(500);
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
        const m = Number(settingsRes.data.min_withdrawal_amount) || 500;
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
      alert(`${t("mesgains_insufficient_balance")} ${minWithdrawal} XAF.\n${t("mesgains_current_balance")} ${balance} XAF`);
      return;
    }
    fetchMethods();
    setShowWithdrawModal(true);
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("mesgains_title")}
        breadcrumbs={[
          { label: t("mesgains_breadcrumb_home"), href: "/dashboard" },
          { label: t("mesgains_breadcrumb_earnings") },
        ]}
      />

      <div className="custom-scroll p-4 sm:p-6 flex flex-col gap-5 pb-24 md:pb-8 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-5">
          <WalletCard
            balance={balance}
            minWithdrawal={minWithdrawal}
            progressPct={progressPct}
            onWithdraw={handleWithdraw}
            onHistory={() => setShowHistoryModal(true)}
            fmtAmount={fmtAmount}
            t={t}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon="fa-file-circle-check"
              bg="bg-green-light"
              color="text-green-mid"
              value={String(statsCards.total_found ?? 0)}
              label={t("mesgains_docs_found")}
            />
            <StatCard
              icon="fa-handshake"
              bg="bg-primary/10"
              color="text-primary"
              value={String(statsCards.total_returned ?? 0)}
              label={t("mesgains_docs_returned")}
            />
            <StatCard
              icon="fa-coins"
              bg="bg-amber-50"
              color="text-amber-500"
              value={fmtAmount(totalFinderPayouts)}
              label={t("mesgains_xaf_earned")}
            />
            <StatCard
              icon="fa-arrow-up-right-from-square"
              bg="bg-blue-50"
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
            fmtAmount={fmtAmount}
            t={t}
          />

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

          <div className="bg-white border border-borda rounded-[18px] p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-[9px] bg-green-light flex items-center justify-center">
                <i className="fa-solid fa-mobile-screen-button text-green-mid text-sm" />
              </div>
              <h2 className="font-bricolage text-[15px] font-bold text-textMain">
                {t("mesgains_withdrawal_methods")}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <PaymentMethodCard
                icon="fa-mobile-screen-button"
                name="MTN Mobile Money"
                color="text-yellow-500"
                bg="bg-yellow-50"
                t={t}
                saved={savedMethods.find(m => m.method_type === "MTN")}
                onManage={() => { fetchMethods(); setShowMethodsModal(true); }}
                onAdd={() => { setAddMethodType("MTN"); setShowAddMethodModal(true); }}
              />
              <PaymentMethodCard
                icon="fa-mobile-screen-button"
                name="Orange Money"
                color="text-orange-500"
                bg="bg-orange-50"
                t={t}
                saved={savedMethods.find(m => m.method_type === "ORANGE")}
                onManage={() => { fetchMethods(); setShowMethodsModal(true); }}
                onAdd={() => { setAddMethodType("ORANGE"); setShowAddMethodModal(true); }}
              />
              <PaymentMethodCard
                icon="fa-university"
                name={t("mesgains_bank_transfer")}
                color="text-blue-400"
                bg="bg-blue-50"
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
        </div>
      </div>

      {showWithdrawModal && (
        <WithdrawModal
          balance={balance}
          minWithdrawal={minWithdrawal}
          savedMethods={savedMethods}
          onClose={() => setShowWithdrawModal(false)}
          onDone={() => {
            setShowWithdrawModal(false);
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
          points={points}
          onClose={() => setShowConvertModal(false)}
          onDone={() => { setShowConvertModal(false); fetchData(); }}
          t={t}
        />
      )}
    </div>
  );
}

/* ── Wallet Card ── */

function WalletCard({ balance, minWithdrawal, progressPct, onWithdraw, onHistory, fmtAmount, t }: any) {
  return (
    <div
      className="rounded-[20px] p-5 sm:p-6 text-white relative z-0"
      style={{
        background: "linear-gradient(135deg, #1E3A2F 0%, #2D5A42 55%, #3B7A58 100%)",
      }}
    >
      <div className="absolute w-[260px] h-[260px] rounded-full bg-white/[0.04] -top-[80px] -right-[60px] pointer-events-none" />
      <div className="absolute w-[180px] h-[180px] rounded-full bg-primary/[0.08] -bottom-[60px] -left-[40px] pointer-events-none" />

      <div className="flex items-start justify-between mb-5 relative z-10">
        <div>
          <p className="text-white/60 text-[12px] font-medium uppercase tracking-widest mb-1">
            {t("mesgains_balance")}
          </p>
          <p className="font-bricolage text-4xl font-extrabold tracking-tight">
            {fmtAmount(balance)}{" "}
            <span className="text-2xl font-bold text-white/70">XAF</span>
          </p>
        </div>
        <div className="w-11 h-11 rounded-[13px] bg-white/10 border border-white/15 flex items-center justify-center">
          <i className="fa-solid fa-sack-dollar text-primary text-lg" />
        </div>
      </div>

      <div className="relative z-10 mb-5">
        <div className="flex justify-between text-[11.5px] mb-1.5">
          <span className="text-white/60 font-medium">{t("mesgains_progress")}</span>
          <span className="text-white font-bold">{fmtAmount(balance)} / {fmtAmount(minWithdrawal)} XAF</span>
        </div>
        <div className="bg-white/15 rounded-[99px] overflow-hidden h-[6px]">
          <div
            className="h-full rounded-[99px] transition-all duration-700"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(to right, #F5A64B, #D98A30)",
            }}
          />
        </div>
        <p className="text-[11px] text-white/40 mt-1.5">
          {t("mesgains_min_withdrawal")} {fmtAmount(minWithdrawal)} XAF
        </p>
      </div>

      <div className="relative z-10 flex gap-2.5">
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
      </div>
    </div>
  );
}

/* ── StatCard ── */

function StatCard({ icon, bg, color, value, label }: any) {
  return (
    <div className="bg-white border border-borda rounded-[16px] p-4 hover:translate-y-[-2px] hover:shadow-[0_8px_24px_rgba(0,0,0,.07)] transition-all">
      <div className={`w-9 h-9 rounded-[10px] ${bg} flex items-center justify-center mb-3`}>
        <i className={`fa-solid ${icon} ${color} text-sm`} />
      </div>
      <p className="font-bricolage text-2xl font-extrabold text-textMain leading-none mb-1">{value}</p>
      <p className="text-[11.5px] text-textMuted font-medium leading-snug">{label}</p>
    </div>
  );
}

/* ── Points Card ── */

function PointsCard({ totalPoints, pointsBreakdown, levelLabel, pointsToNext, nextLevelPoints, onConvert, fmtAmount, t }: any) {
  return (
    <div className="bg-white border border-borda rounded-[18px] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] bg-primary/10 flex items-center justify-center">
            <i className="fa-solid fa-star text-primary text-sm" />
          </div>
          <div>
            <h2 className="font-bricolage text-[15px] font-bold text-textMain leading-tight">{t("mesgains_points_title")}</h2>
            <p className="text-[11px] text-textMuted">{t("mesgains_loyalty_program")}</p>
          </div>
        </div>
        <span className="font-bricolage text-xl font-extrabold text-primary">{fmtAmount(totalPoints)} pts</span>
      </div>

      <div className="flex flex-col gap-2 mb-4">
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
      </div>

      <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/15 rounded-[12px]">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-trophy text-primary text-sm" />
          <div>
            <p className="text-[12.5px] font-bold text-textMain">{levelLabel}</p>
            <p className="text-[11px] text-textMuted">
              {pointsToNext > 0
                ? `${pointsToNext} ${t("mesgains_points_to_gold")}`
                : t("mesgains_congrats_gold")}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-textMuted">{t("mesgains_next_level")}</p>
          <p className="text-[13px] font-bold text-primary">{fmtAmount(nextLevelPoints)} pts</p>
        </div>
      </div>

      {totalPoints > 0 && (
        <button
          onClick={onConvert}
          className="w-full mt-3 py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-bricolage text-[13px] font-bold rounded-[12px] transition-all flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-coins text-xs" /> {t("mesgains_convert_points")}
        </button>
      )}
    </div>
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
    <div className="bg-white border border-borda rounded-[18px] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-borda">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] bg-amber-50 flex items-center justify-center">
            <i className="fa-solid fa-sack-dollar text-amber-500 text-sm" />
          </div>
          <div>
            <h2 className="font-bricolage text-[15px] font-bold text-textMain">
              {t("mesgains_potential_title")}
            </h2>
            <p className="text-[11px] text-textMuted">{t("mesgains_potential_desc")}</p>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="px-5 py-4 bg-amber-50/50 border-b border-borda">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] bg-amber-100 flex items-center justify-center">
              <i className="fa-solid fa-coins text-amber-500 text-lg" />
            </div>
            <div>
              <p className="font-bricolage text-xl font-extrabold text-textMain leading-none">
                {fmtAmount(totalXaf)} <span className="text-sm font-bold text-textMuted">XAF</span>
              </p>
              <p className="text-[11px] text-textMuted mt-0.5">{t("mesgains_potential_xaf")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] bg-primary/10 flex items-center justify-center">
              <i className="fa-solid fa-star text-primary text-lg" />
            </div>
            <div>
              <p className="font-bricolage text-xl font-extrabold text-textMain leading-none">
                {fmtAmount(totalPts)} <span className="text-sm font-bold text-textMuted">pts</span>
              </p>
              <p className="text-[11px] text-textMuted mt-0.5">{t("mesgains_potential_pts")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Per-declaration breakdown */}
      <div className="divide-y divide-borda">
        {declarations.map((decl: Declaration) => {
          const prix = decl.docTypeInfo?.prix_retrouvaille ?? 0;
          const pct = decl.docTypeInfo?.finder_percent ?? 80;
          const xafGain = (prix * pct) / 100;
          const ptsGain = decl.docTypeInfo?.points_recompense ?? 0;
          const icon = decl.docTypeInfo?.icone || "file";
          const statusColor = decl.status === "MATCHED" ? "bg-green-light text-green-mid" : "bg-primary/10 text-primary";

          return (
            <div key={decl.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface2 transition-colors">
              <div className="w-9 h-9 rounded-[10px] bg-amber-50 flex items-center justify-center flex-shrink-0">
                <i className={`fa-solid fa-${icon} text-amber-500 text-sm`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-textMain truncate leading-tight">
                  {decl.docTypeInfo?.nom || decl.doc_type || "Document"}
                </p>
                <p className="text-[11px] text-textMuted mt-0.5">
                  {decl.identifiant_doc_dm || decl.id.slice(0, 8)}
                  {decl.ville ? ` · ${decl.ville}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                  {decl.status === "MATCHED" ? t("mesgains_potential_matched") : t("mesgains_potential_available")}
                </span>
                <div className="text-right">
                  <p className="font-bricolage text-[13px] font-extrabold text-amber-500">
                    +{fmtAmount(xafGain)} XAF
                  </p>
                  <p className="text-[10px] font-bold text-primary">+{ptsGain} pts</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 bg-amber-50/30 border-t border-borda">
        <p className="text-[11px] text-textMuted text-center">
          <i className="fa-solid fa-circle-info text-amber-400 mr-1" />
          {t("mesgains_potential_note")}
        </p>
      </div>
    </div>
  );
}

/* ── Transactions Card ── */

function TransactionsCard({ transactions, loading, fmtAmount, fmtDate, t }: any) {
  return (
    <div className="bg-white border border-borda rounded-[18px] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-borda">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] bg-green-light flex items-center justify-center">
            <i className="fa-solid fa-clock-rotate-left text-green-mid text-sm" />
          </div>
          <h2 className="font-bricolage text-[15px] font-bold text-textMain">{t("mesgains_recent_transactions")}</h2>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-borda border-t-primary animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-10 text-center text-textMuted">
          <i className="fa-solid fa-receipt text-3xl opacity-20 mb-3" />
          <p className="text-sm">{t("mesgains_no_transactions")}</p>
        </div>
      ) : (
        <div className="divide-y divide-borda">
          {transactions.map((tx: Transaction) => {
            const isPositive = tx.amount > 0 && tx.type !== "recovery_fee";
            const meta = getTxMeta(tx.type || "", t);
            return (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface2 transition-colors">
                <div className={`w-9 h-9 rounded-[10px] ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                  <i className={`fa-solid ${meta.icon} ${meta.color} text-sm`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-textMain truncate leading-tight">{meta.label}</p>
                  <p className="text-[11px] text-textMuted mt-0.5">{meta.sub} · {fmtDate(tx.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`font-bricolage text-[14px] font-extrabold ${isPositive ? "text-green-mid" : "text-textMuted"}`}>
                    {isPositive ? "+" : "-"}{fmtAmount(Math.abs(tx.amount))} XAF
                  </span>
                  <TxStatusBadge status={tx.status} t={t} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Earnings History Card ── */

function EarningsHistoryCard({ earningsHistory, loading, fmtAmount, fmtDate, t }: any) {
  return (
    <div className="bg-white border border-borda rounded-[18px] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-borda">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] bg-primary/10 flex items-center justify-center">
            <i className="fa-solid fa-clock-rotate-left text-primary text-sm" />
          </div>
          <h2 className="font-bricolage text-[15px] font-bold text-textMain">
            {t("mesgains_earnings_history") || "Historique des gains"}
          </h2>
        </div>
        <span className="text-[11px] text-textMuted font-medium">
          {earningsHistory.length} {t("mesgains_entries") || "entrées"}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-borda border-t-primary animate-spin" />
        </div>
      ) : earningsHistory.length === 0 ? (
        <div className="p-10 text-center text-textMuted">
          <i className="fa-solid fa-coins text-3xl opacity-20 mb-3" />
          <p className="text-sm">{t("mesgains_no_earnings") || "Aucun gain pour le moment"}</p>
        </div>
      ) : (
        <div className="divide-y divide-borda">
          {earningsHistory.map((entry: EarningsRecord) => {
            const isPoints = entry.currency === "POINTS";
            const meta = getEarningMeta(entry.type, t);
            return (
              <div key={entry.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface2 transition-colors">
                <div className={`w-9 h-9 rounded-[10px] ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                  <i className={`fa-solid ${meta.icon} ${meta.color} text-sm`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-textMain truncate leading-tight">{entry.description || meta.label}</p>
                  <p className="text-[11px] text-textMuted mt-0.5">{fmtDate(entry.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`font-bricolage text-[14px] font-extrabold ${isPoints ? "text-primary" : "text-green-mid"}`}>
                    +{fmtAmount(entry.amount)} {isPoints ? "pts" : "XAF"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── PaymentMethodCard ── */

function PaymentMethodCard({ icon, name, color, bg, saved, onAdd, onManage, t }: any) {
  const hasMethod = !!saved;
  return (
    <div
      onClick={hasMethod ? onManage : onAdd}
      className={`flex items-center gap-3 p-3.5 border-2 rounded-[13px] cursor-pointer hover:border-primary transition-all group ${
        hasMethod ? "border-primary bg-primary/5" : "border-borda bg-surface2"
      }`}
    >
      <div className={`w-9 h-9 rounded-[10px] ${bg} flex items-center justify-center flex-shrink-0`}>
        <i className={`fa-solid ${icon} ${color} text-sm`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-bold text-textMain leading-tight truncate">{name}</p>
        <p className={`text-[10.5px] ${hasMethod ? "text-green-mid font-semibold" : "text-textMuted"}`}>
          {hasMethod ? `\u2713 ${t("mesgains_connected")}` : t("mesgains_add")}
        </p>
      </div>
      <i className={`fa-solid ${hasMethod ? "fa-circle-check text-primary" : "fa-plus text-textMuted group-hover:text-primary"} text-sm transition-colors`} />
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-[20px] w-[440px] max-w-[94vw] max-h-[90vh] overflow-y-auto custom-scroll shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-borda">
          <h3 className="font-bricolage text-[16px] font-bold text-textMain">{t("mesgains_withdraw_modal_title")}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark text-textMuted" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-light flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-check-circle text-green-mid text-3xl" />
            </div>
            <p className="font-bricolage text-[16px] font-bold text-textMain">{t("mesgains_withdraw_modal_success")}</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
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
                placeholder="500"
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
                    const typeBg = m.method_type === "MTN" ? "bg-yellow-50" : m.method_type === "ORANGE" ? "bg-orange-50" : "bg-blue-50";
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMethod(m)}
                        className={`flex items-center gap-3 p-3 border-2 rounded-[12px] cursor-pointer transition-all ${
                          selectedMethod?.id === m.id ? "border-primary bg-primary/5" : "border-borda hover:border-gray-300"
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-[10px] ${typeBg} flex items-center justify-center`}>
                          <i className={`fa-solid ${typeIcon} ${typeColor} text-sm`} />
                        </div>
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
          </div>
        )}
      </div>
    </div>
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
    const cls = status === "approved" ? "bg-green-light text-green-mid" : status === "pending" ? "bg-orange-50 text-orange-500" : "bg-red-50 text-red-500";
    const label = status === "approved" ? t("mesgains_withdraw_status_approved") : status === "pending" ? t("mesgains_withdraw_status_pending") : t("mesgains_withdraw_status_rejected");
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-[20px] w-[440px] max-w-[94vw] max-h-[90vh] overflow-y-auto custom-scroll shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-borda">
          <h3 className="font-bricolage text-[16px] font-bold text-textMain">{t("mesgains_withdraw_history_modal_title")}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark text-textMuted" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-borda border-t-primary animate-spin" />
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="p-10 text-center text-textMuted">
            <i className="fa-solid fa-arrow-right-from-bracket text-3xl opacity-20 mb-3" />
            <p className="text-sm">{t("mesgains_withdraw_history_empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-borda">
            {withdrawals.map((w: any) => (
              <div key={w.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface2 transition-colors">
                <div className="w-9 h-9 rounded-[10px] bg-blue-50 flex items-center justify-center">
                  <i className="fa-solid fa-arrow-right-from-bracket text-blue-400 text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-textMain truncate">{fmtAmount(w.amount)} XAF</p>
                  <p className="text-[11px] text-textMuted mt-0.5">{w.payment_method} · {fmtDate(w.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {statusBadge(w.status)}
                  {w.admin_note && <p className="text-[10px] text-textMuted max-w-[120px] truncate">{w.admin_note}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── SavedMethodsModal ── */

function SavedMethodsModal({ methods, onClose, onRefresh, t }: any) {
  const handleDelete = async (id: string) => {
    try {
      await paymentsService.deletePaymentMethod(id);
      onRefresh();
    } catch {}
  };

  const handleSetDefault = async (id: string) => {
    try {
      await paymentsService.setDefaultPaymentMethod(id);
      onRefresh();
    } catch {}
  };

  const typeIcon = (type: string) => type === "MTN" || type === "ORANGE" ? "fa-mobile-screen-button" : "fa-university";
  const typeColor = (type: string) => type === "MTN" ? "text-yellow-500" : type === "ORANGE" ? "text-orange-500" : "text-blue-400";
  const typeBg = (type: string) => type === "MTN" ? "bg-yellow-50" : type === "ORANGE" ? "bg-orange-50" : "bg-blue-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-[20px] w-[440px] max-w-[94vw] max-h-[90vh] overflow-y-auto custom-scroll shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-borda">
          <h3 className="font-bricolage text-[16px] font-bold text-textMain">{t("mesgains_withdrawal_methods")}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark text-textMuted" />
          </button>
        </div>

        {methods.length === 0 ? (
          <div className="p-10 text-center text-textMuted">
            <i className="fa-solid fa-credit-card text-3xl opacity-20 mb-3" />
            <p className="text-sm">{t("mesgains_withdraw_modal_no_methods")}</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {methods.map((m: SavedPaymentMethod) => (
              <div key={m.id} className="flex items-center gap-3 p-3.5 border border-borda rounded-[14px]">
                <div className={`w-9 h-9 rounded-[10px] ${typeBg(m.method_type)} flex items-center justify-center`}>
                  <i className={`fa-solid ${typeIcon(m.method_type)} ${typeColor(m.method_type)} text-sm`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold text-textMain truncate">{m.account_name || `${m.method_type} - ${m.account_number}`}</p>
                  <p className="text-[11px] text-textMuted">{m.account_number}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {!m.is_default && (
                    <button onClick={() => handleSetDefault(m.id)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-primary/10 flex items-center justify-center transition-colors group" title={t("mesgains_withdraw_set_default")}>
                      <i className="fa-solid fa-star text-[11px] text-textMuted group-hover:text-primary transition-colors" />
                    </button>
                  )}
                  {m.is_default && (
                    <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-full">{t("mesgains_withdraw_default_method")}</span>
                  )}
                  <button onClick={() => handleDelete(m.id)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 flex items-center justify-center transition-colors group">
                    <i className="fa-solid fa-trash-can text-[11px] text-textMuted group-hover:text-red-500 transition-colors" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
  const typeBg = methodType === "MTN" ? "bg-yellow-50" : methodType === "ORANGE" ? "bg-orange-50" : "bg-blue-50";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-[20px] w-[420px] max-w-[94vw] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-borda">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-[10px] ${typeBg} flex items-center justify-center`}>
              <i className={`fa-solid ${typeIcon} ${typeColor} text-sm`} />
            </div>
            <h3 className="font-bricolage text-[16px] font-bold text-textMain">{typeLabel}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark text-textMuted" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-light flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-check-circle text-green-mid text-3xl" />
            </div>
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
      </div>
    </div>
  );
}

/* ── Convert Points Modal ── */

function ConvertPointsModal({ points, onClose, onDone, t }: { points: any; onClose: () => void; onDone: () => void; t: (key: string) => string }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rate, setRate] = useState(10);
  const numAmount = parseInt(amount || "0", 10);
  const xafValue = Math.round(numAmount / rate);
  const canConvert = numAmount > 0 && numAmount <= points.totalPoints;

  useEffect(() => {
    apiClient.get("points/rate").then((res) => {
      if (res.data?.rate) setRate(res.data.rate);
    }).catch(() => {});
  }, []);

  const handleConvert = async () => {
    if (!canConvert) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.post(`points/convert`, { amount: numAmount });
      if (res.data.success) {
        onDone();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[20px] p-6 w-full max-w-[380px] shadow-xl border border-borda">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-bricolage font-bold text-textMain">{t("mesgains_convert_title")}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-textMuted hover:bg-gray-200 transition-all">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        <div className="text-center mb-5">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fa-solid fa-coins text-primary text-2xl" />
          </div>
          <p className="text-[13px] text-textMuted">{t("mesgains_convert_balance")}</p>
          <p className="text-[22px] font-bricolage font-bold text-primary">{points.totalPoints.toLocaleString()} pts</p>
        </div>

        <div className="mb-4">
          <label className="text-[12px] font-semibold text-textMuted mb-1.5 block">{t("mesgains_convert_amount")}</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(""); }}
            placeholder="0"
            min={1}
            max={points.totalPoints}
            className="w-full px-4 py-3 bg-gray-50 border border-borda rounded-[12px] text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
          <div className="flex justify-between mt-1.5">
            <p className="text-[11px] text-textMuted">{t("mesgains_convert_rate")}: {rate} pt = 1 XAF</p>
            <button onClick={() => setAmount(String(points.totalPoints))} className="text-[11px] text-primary font-semibold hover:underline">{t("mesgains_convert_max")}</button>
          </div>
        </div>

        {numAmount > 0 && (
          <div className="bg-primary/5 border border-primary/15 rounded-[12px] p-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-textMuted">{t("mesgains_convert_receive")}</span>
              <span className="text-[16px] font-bricolage font-bold text-primary">{xafValue.toLocaleString()} XAF</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-[12px] rounded-[10px] p-3 mb-4 text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleConvert}
          disabled={!canConvert || loading}
          className="w-full py-3 bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bricolage text-[13.5px] font-bold rounded-[12px] transition-all active:scale-[.98] flex items-center justify-center gap-2"
        >
          {loading ? (
            <><i className="fa-solid fa-spinner fa-spin" /> {t("mesgains_convert_loading")}</>
          ) : (
            <><i className="fa-solid fa-coins" /> {t("mesgains_convert_button")}</>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function TxStatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const cls =
    status === "SUCCESS"
      ? "bg-green-light text-green-mid"
      : status === "PENDING"
      ? "bg-orange-50 text-orange-500"
      : "bg-gray-100 text-gray-500";
  const label =
    status === "SUCCESS" ? t("tx_success") : status === "PENDING" ? t("tx_pending") : status;
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function getEarningMeta(type: string, t: (key: string) => string): { icon: string; bg: string; color: string; label: string } {
  if (type === "declaration_points") return { icon: "fa-file-circle-check", bg: "bg-primary/10", color: "text-primary", label: t("mesgains_declaration_points") || "Points déclaration" };
  if (type === "return_points") return { icon: "fa-handshake", bg: "bg-green-light", color: "text-green-mid", label: t("mesgains_return_points") || "Points remise document" };
  if (type === "referral_points") return { icon: "fa-user-plus", bg: "bg-amber-50", color: "text-amber-500", label: t("mesgains_referral_points") || "Points parrainage" };
  if (type === "referral_bonus") return { icon: "fa-gift", bg: "bg-purple-50", color: "text-purple-400", label: t("mesgains_referral_bonus") || "Bonus parrainage" };
  if (type === "finder_payout") return { icon: "fa-sack-dollar", bg: "bg-green-light", color: "text-green-mid", label: t("mesgains_finder_payout") || "Récompense remise" };
  return { icon: "fa-coins", bg: "bg-gray-100", color: "text-gray-500", label: type };
}

function getTxMeta(type: string, t: (key: string) => string): { icon: string; bg: string; color: string; label: string; sub: string } {
  if (type === "finder_payout") return { icon: "fa-file-circle-check", bg: "bg-green-light", color: "text-green-mid", label: t("tx_commission"), sub: t("tx_reward") };
  if (type === "recovery_fee") return { icon: "fa-arrow-up", bg: "bg-orange-50", color: "text-orange-500", label: t("tx_recovery_fee"), sub: t("tx_payment_made") };
  if (type === "withdrawal") return { icon: "fa-arrow-right-from-bracket", bg: "bg-blue-50", color: "text-blue-400", label: t("tx_withdrawal"), sub: t("tx_mobile_money") };
  return { icon: "fa-receipt", bg: "bg-gray-100", color: "text-gray-500", label: type, sub: "—" };
}
