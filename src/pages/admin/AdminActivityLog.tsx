import { useEffect, useState } from "react";
import apiClient from "../../services/api";
import InfoTooltip from "../../components/ui/InfoTooltip";
import Pagination from "../../components/ui/Pagination";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";

interface LogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  admin_id: string;
  admin_name?: string;
  details?: string;
  created_at: string;
}

export default function AdminActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    apiClient.get("admin/activity-log?page=1&limit=50")
      .then((r) => setLogs(r.data.data || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const total = logs.length;
  const paginated = logs.slice((page - 1) * pageSize, page * pageSize);

  const actionIcon = (action: string) => {
    if (action.includes("suppres") || action.includes("delete")) return "fa-trash-can text-red-500";
    if (action.includes("creat") || action.includes("ajout")) return "fa-plus text-emerald-500";
    if (action.includes("modif") || action.includes("update") || action.includes("edit")) return "fa-pen text-amber-500";
    if (action.includes("login") || action.includes("connex")) return "fa-right-to-bracket text-blue-500";
    return "fa-circle-info text-gray-400";
  };

  if (loading) { return <LoadingSpinner />; }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bricolage text-2xl font-black text-gray-900">Journal d'activité</h1>
            <InfoTooltip text="Historique des actions effectuées par les administrateurs sur la plateforme." />
          </div>
          <p className="text-gray-400 text-[13px] font-medium mt-1">Traçabilité des opérations administratives</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm">
        {paginated.length === 0 ? (
          <EmptyState icon="fa-solid fa-clock-rotate-left" message="Aucune activité enregistrée pour le moment." />
        ) : (
          <div className="divide-y divide-gray-50">
            {paginated.map((log) => (
              <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <i className={`fa-solid ${actionIcon(log.action)} text-xs`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 capitalize">{log.action}</p>
                  {log.details && <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-medium text-gray-400">{log.admin_name || "Admin"}</span>
                    <span className="text-[10px] text-gray-300">•</span>
                    <span className="text-[10px] text-gray-400">{log.entity_type?.replace(/_/g, " ")}</span>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
                  {log.created_at ? new Date(log.created_at).toLocaleString("fr-FR") : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
        <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
      </div>
    </div>
  );
}
