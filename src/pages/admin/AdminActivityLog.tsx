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
};

const ACTION_BG: Record<string, string> = {
  REGISTER: "bg-emerald-50",
  LOGIN: "bg-blue-50",
  UPDATE_PROFILE: "bg-amber-50",
  CREATE_DECLARATION: "bg-primary/5",
  REQUEST_WITHDRAWAL: "bg-orange-50",
  APPROVE_WITHDRAWAL: "bg-green-50",
  REJECT_WITHDRAWAL: "bg-red-50",
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
    <div>
      <div className="flex items-center gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bricolage text-2xl font-black text-gray-900">Journal d'activité</h1>
            <InfoTooltip text="Toutes les actions des utilisateurs et administrateurs sur la plateforme." />
          </div>
          <p className="text-gray-400 text-[13px] font-medium mt-1">
            {total} entrée{total !== 1 ? "s" : ""} · Traçabilité complète
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[12px] font-semibold text-gray-700 outline-none focus:border-primary"
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
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[12px] outline-none focus:border-primary w-60"
        />
        {(filterAction || filterUser) && (
          <button
            onClick={() => { setFilterAction(""); setFilterUser(""); setPage(1); }}
            className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-[12px] font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <i className="fa-solid fa-xmark mr-1" /> Effacer
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm">
        {loading ? (
          <LoadingSpinner />
        ) : logs.length === 0 ? (
          <EmptyState icon="fa-solid fa-clock-rotate-left" message="Aucune activité enregistrée pour le moment." />
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => {
              const icon = ACTION_ICONS[log.action_type] || "fa-circle-info text-gray-400";
              const bg = ACTION_BG[log.action_type] || "bg-gray-100";
              return (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
                    <i className={`fa-solid ${icon} text-xs`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-gray-900 capitalize">
                        {log.action_type.replace(/_/g, " ")}
                      </span>
                      {log.entity_type && (
                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {log.entity_type}
                        </span>
                      )}
                    </div>
                    {log.description && (
                      <p className="text-[12px] text-gray-600 mt-0.5">{log.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                      <span>{log.prenom || log.email || "Admin"} {log.nom || ""}</span>
                      {log.ip_address && <><span>•</span><span>{log.ip_address}</span></>}
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
