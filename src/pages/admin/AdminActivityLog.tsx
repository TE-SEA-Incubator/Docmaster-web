import { useEffect, useState, useCallback } from "react";
import { useI18n } from "../../context/I18nContext";
import apiClient from "../../services/api";
import InfoTooltip from "../../components/ui/InfoTooltip";
import Pagination from "../../components/ui/Pagination";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";

interface LogEntry {
  id: string;
  user_id: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, any>;
  ip_address: string | null;
  created_at: string;
  nom?: string;
  prenom?: string;
  email?: string;
}

const ACTION_ICONS: Record<string, string> = {
  REGISTER: "fa-user-plus text-emerald-500",
  LOGIN: "fa-right-to-bracket text-blue-500",
  UPDATE_PROFILE: "fa-pen text-amber-500",
  CREATE_DECLARATION: "fa-file-circle-plus text-primary",
  REQUEST_WITHDRAWAL: "fa-money-bill-transfer text-orange-500",
  APPROVE_WITHDRAWAL: "fa-check-circle text-green-500",
  REJECT_WITHDRAWAL: "fa-ban text-red-500",
  WALLET_CREDIT: "fa-circle-arrow-up text-emerald-500",
  WALLET_DEBIT: "fa-circle-arrow-down text-red-500",
  SUBSCRIPTION_PURCHASED: "fa-crown text-purple-500",
  REFERRAL_REWARD: "fa-gift text-pink-500",
  RECOVERY_PAYMENT: "fa-hand-holding-dollar text-sky-500",
};

const ACTION_BG: Record<string, string> = {
  REGISTER: "bg-emerald-50",
  LOGIN: "bg-blue-50",
  UPDATE_PROFILE: "bg-amber-50",
  CREATE_DECLARATION: "bg-primary/5",
  REQUEST_WITHDRAWAL: "bg-orange-50",
  APPROVE_WITHDRAWAL: "bg-green-50",
  REJECT_WITHDRAWAL: "bg-red-50",
  WALLET_CREDIT: "bg-emerald-50",
  WALLET_DEBIT: "bg-red-50",
  SUBSCRIPTION_PURCHASED: "bg-purple-50",
  REFERRAL_REWARD: "bg-pink-50",
  RECOVERY_PAYMENT: "bg-sky-50",
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("fr-FR", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

export default function AdminActivityLog() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [filterAction, setFilterAction] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const pageSize = 30;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: pageSize };
      if (filterAction) params.actionType = filterAction;
      if (filterUser) params.userId = filterUser;
      const r = await apiClient.get("admin/activity-log", { params });
      setLogs(r.data.data || []);
      setTotal(r.data.total || 0);
      if (r.data.actionTypes) setActionTypes(r.data.actionTypes);
    } catch { setLogs([]); } finally { setLoading(false); }
  }, [page, filterAction, filterUser]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Journal d'activité</h1>
            <InfoTooltip text="Toutes les actions des utilisateurs et administrateurs sur la plateforme." />
          </div>
          <p className="text-gray-500 text-[13px] mt-0.5">
            {total} entrée{total !== 1 ? "s" : ""} · Traçabilité complète
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 shrink-0">
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white border border-gray-200 rounded text-[13px] text-gray-700 outline-none focus:border-[#E8923A]"
        >
          <option value="">Toutes les actions</option>
          {actionTypes.map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
          ))}
        </select>
        <input
          type="text"
          value={filterUser}
          onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
          placeholder="Filtrer par ID utilisateur..."
          className="px-3 py-2 bg-white border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] w-56"
        />
        {(filterAction || filterUser) && (
          <button
            onClick={() => { setFilterAction(""); setFilterUser(""); setPage(1); }}
            className="px-3 py-2 bg-gray-100 border border-gray-200 rounded text-[13px] font-semibold text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1"
          >
            <i className="fa-solid fa-xmark text-xs" /> Effacer
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded flex flex-col min-h-0">
        {loading ? (
          <div className="py-16"><LoadingSpinner /></div>
        ) : logs.length === 0 ? (
          <EmptyState icon="fa-solid fa-clock-rotate-left" message="Aucune activité enregistrée pour le moment." />
        ) : (
          <div className="overflow-auto flex-1 min-h-0 divide-y divide-gray-100">
            {logs.map((log) => {
              const icon = ACTION_ICONS[log.action_type] || "fa-circle-info text-gray-400";
              const bg = ACTION_BG[log.action_type] || "bg-gray-100";
              return (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded border border-gray-200 ${bg} flex items-center justify-center flex-shrink-0`}>
                    <i className={`fa-solid ${icon} text-xs`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-gray-900 capitalize">
                        {log.action_type.replace(/_/g, " ")}
                      </span>
                      {log.entity_type && (
                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                          {log.entity_type}
                        </span>
                      )}
                    </div>
                    {log.description && (
                      <p className="text-[12px] text-gray-500 mt-0.5">{log.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                      <span>{log.prenom || log.email || "Admin"} {log.nom || ""}</span>
                      {log.ip_address && <><span>·</span><span>{log.ip_address}</span></>}
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
                    {fmtDate(log.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {totalPages > 1 && (
          <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
        )}
      </div>
    </div>
  );
}
