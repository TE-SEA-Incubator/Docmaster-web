import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";
import { paymentsService } from "../../services/paymentsService";
import { settingsService } from "../../services/settingsService";
import { authService } from "../../services/authService";
import Topbar from "../../layout/Topbar";
import type { Transaction } from "../../types/api";

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

  const fetchData = useCallback(async () => {
    setTxLoading(true);
    try {
      const [txRes, settingsRes, statsRes] = await Promise.all([
        paymentsService.getMyTransactions(),
        settingsService.getAll(),
        authService.getEarningsStats(),
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
    } catch {
      // silent
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const balance = user?.wallet_balance || 0;
  const points = user?.points || 0;
  const progressPct = Math.min((balance / minWithdrawal) * 100, 100);

  // Stats from transactions
  const totalFinderPayouts = transactions
    .filter((t) => t.type === "finder_payout" && t.status === "SUCCESS")
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalWithdrawn = transactions
    .filter((t) => t.type === "withdrawal" && t.status === "SUCCESS")
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

  // Points breakdown from statsData
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

  const handleWithdraw = () => {
    if (balance < minWithdrawal) {
      alert(`${t("mesgains_insufficient_balance")} ${minWithdrawal} XAF.\n${t("mesgains_current_balance")} ${balance} XAF`);
    } else {
      alert(t("mesgains_withdraw_coming_soon"));
    }
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

          {/* ── Wallet Card ── */}
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
                <span className="text-white/60 font-medium">
                  {t("mesgains_progress")}
                </span>
                <span className="text-white font-bold">
                  {fmtAmount(balance)} / {fmtAmount(minWithdrawal)} XAF
                </span>
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
                onClick={handleWithdraw}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-dark text-white font-bricolage text-[13.5px] font-bold rounded-[12px] transition-all active:scale-[.98]"
              >
                <i className="fa-solid fa-credit-card text-xs" /> {t("mesgains_withdraw")}
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-[13px] rounded-[12px] transition-all">
                <i className="fa-solid fa-clock-rotate-left text-xs" /> {t("mesgains_history")}
              </button>
            </div>
          </div>

          {/* ── Stats grid ── */}
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

          {/* ── Points DocMaster ── */}
          <div className="bg-white border border-borda rounded-[18px] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[9px] bg-primary/10 flex items-center justify-center">
                  <i className="fa-solid fa-star text-primary text-sm" />
                </div>
                <div>
                  <h2 className="font-bricolage text-[15px] font-bold text-textMain leading-tight">
                    {t("mesgains_points_title")}
                  </h2>
                  <p className="text-[11px] text-textMuted">{t("mesgains_loyalty_program")}</p>
                </div>
              </div>
              <span className="font-bricolage text-xl font-extrabold text-primary">
                {fmtAmount(totalPoints)} pts
              </span>
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
          </div>

          {/* ── Transactions récentes ── */}
          <div className="bg-white border border-borda rounded-[18px] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-borda">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[9px] bg-green-light flex items-center justify-center">
                  <i className="fa-solid fa-clock-rotate-left text-green-mid text-sm" />
                </div>
                <h2 className="font-bricolage text-[15px] font-bold text-textMain">
                  {t("mesgains_recent_transactions")}
                </h2>
              </div>
              <button className="text-[12px] font-semibold text-primary hover:text-primary-dark transition-colors">
                {t("mesgains_see_all")}
              </button>
            </div>

            {txLoading ? (
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
                {transactions.map((tx) => {
                  const isPositive = tx.amount > 0 && tx.type !== "recovery_fee";

                  const meta = getTxMeta(tx.type || "", t);
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface2 transition-colors"
                    >
                      <div
                        className={`w-9 h-9 rounded-[10px] ${meta.bg} flex items-center justify-center flex-shrink-0`}
                      >
                        <i className={`fa-solid ${meta.icon} ${meta.color} text-sm`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-textMain truncate leading-tight">
                          {meta.label}
                        </p>
                        <p className="text-[11px] text-textMuted mt-0.5">
                          {meta.sub} · {fmtDate(tx.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span
                          className={`font-bricolage text-[14px] font-extrabold ${
                            isPositive ? "text-green-mid" : "text-textMuted"
                          }`}
                        >
                          {isPositive ? "+" : "-"}
                          {fmtAmount(Math.abs(tx.amount))} XAF
                        </span>
                        <TxStatusBadge status={tx.status} t={t} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Méthodes de retrait ── */}
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
                connected
                t={t}
              />
              <PaymentMethodCard
                icon="fa-mobile-screen-button"
                name="Orange Money"
                color="text-orange-500"
                bg="bg-orange-50"
                t={t}
              />
              <PaymentMethodCard
                icon="fa-university"
                name={t("mesgains_bank_transfer")}
                color="text-blue-400"
                bg="bg-blue-50"
                t={t}
              />
            </div>

            <p className="text-[11px] text-textMuted mt-3 text-center">
              {t("mesgains_min_withdrawal_delay").replace("{amount}", fmtAmount(minWithdrawal))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({
  icon,
  bg,
  color,
  value,
  label,
}: {
  icon: string;
  bg: string;
  color: string;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-white border border-borda rounded-[16px] p-4 hover:translate-y-[-2px] hover:shadow-[0_8px_24px_rgba(0,0,0,.07)] transition-all">
      <div className={`w-9 h-9 rounded-[10px] ${bg} flex items-center justify-center mb-3`}>
        <i className={`fa-solid ${icon} ${color} text-sm`} />
      </div>
      <p className="font-bricolage text-2xl font-extrabold text-textMain leading-none mb-1">
        {value}
      </p>
      <p className="text-[11.5px] text-textMuted font-medium leading-snug">{label}</p>
    </div>
  );
}

function PointsRow({
  label,
  detail,
  pts,
  color,
  max,
}: {
  label: string;
  detail: string;
  pts: number;
  color: string;
  max: number;
}) {
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

function TxStatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const cls =
    status === "SUCCESS"
      ? "bg-green-light text-green-mid"
      : status === "PENDING"
      ? "bg-orange-50 text-orange-500"
      : "bg-gray-100 text-gray-500";
  const label =
    status === "SUCCESS" ? t("tx_success") : status === "PENDING" ? t("tx_pending") : status;
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}
    >
      {label}
    </span>
  );
}

function PaymentMethodCard({
  icon,
  name,
  color,
  bg,
  connected,
  t,
}: {
  icon: string;
  name: string;
  color: string;
  bg: string;
  connected?: boolean;
  t: (key: string) => string;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3.5 border-2 rounded-[13px] cursor-pointer hover:border-primary transition-all group ${
        connected
          ? "border-primary bg-primary/5"
          : "border-borda bg-surface2"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-[10px] ${bg} flex items-center justify-center flex-shrink-0`}
      >
        <i className={`fa-solid ${icon} ${color} text-sm`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-bold text-textMain leading-tight truncate">
          {name}
        </p>
        <p
          className={`text-[10.5px] ${
            connected ? "text-green-mid font-semibold" : "text-textMuted"
          }`}
        >
          {connected ? `\u2713 ${t("mesgains_connected")}` : t("mesgains_add")}
        </p>
      </div>
      <i
        className={`fa-solid ${
          connected
            ? "fa-circle-check text-primary"
            : "fa-plus text-textMuted group-hover:text-primary"
        } text-sm transition-colors`}
      />
    </div>
  );
}

function getTxMeta(type: string, t: (key: string) => string): { icon: string; bg: string; color: string; label: string; sub: string } {
  if (type === "finder_payout") {
    return {
      icon: "fa-file-circle-check",
      bg: "bg-green-light",
      color: "text-green-mid",
      label: t("tx_commission"),
      sub: t("tx_reward"),
    };
  }
  if (type === "recovery_fee") {
    return {
      icon: "fa-arrow-up",
      bg: "bg-orange-50",
      color: "text-orange-500",
      label: t("tx_recovery_fee"),
      sub: t("tx_payment_made"),
    };
  }
  if (type === "withdrawal") {
    return {
      icon: "fa-arrow-right-from-bracket",
      bg: "bg-blue-50",
      color: "text-blue-400",
      label: t("tx_withdrawal"),
      sub: t("tx_mobile_money"),
    };
  }
  return {
    icon: "fa-receipt",
    bg: "bg-gray-100",
    color: "text-gray-500",
    label: type,
    sub: "—",
  };
}
