import { useEffect, useState, useRef, useCallback } from "react";
import { adminService } from "../../services/admin";
import { socketService } from "../../services/socket";
import InfoTooltip from "../../components/ui/InfoTooltip";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import StatCard from "../../components/ui/StatCard";

interface MatchCriterion {
  name: string;
  points: number;
  max: number;
  matched: boolean;
  icon: string;
  detail?: string;
}

interface LiveMatchEvent {
  id: string;
  lostDeclaration: {
    id: string;
    identifiant_doc_dm: string;
    owner_name: string;
    doc_type: string;
    ville: string;
    quartier?: string;
  };
  foundDeclaration: {
    id: string;
    identifiant_doc_dm: string;
    owner_name: string;
    doc_type: string;
    ville: string;
    quartier?: string;
  };
  totalScore: number;
  criteria: MatchCriterion[];
  status: string;
  timestamp: string;
}

interface LiveCheckingEvent {
  declarationId: string;
  identifiant: string;
  docType: string;
  ownerName: string;
  ville: string;
  progress: { current: number; total: number };
  timestamp: string;
}

interface LiveCycleEvent {
  cycleId: string;
  timestamp: string;
  processed?: number;
  highConfidence?: number;
  potential?: number;
  totalMatches?: number;
  durationMs?: number;
}

type LiveEvent = {
  id: string;
  type: "CYCLE_START" | "CHECKING" | "MATCH_FOUND" | "CYCLE_END" | "CYCLE_ERROR";
  timestamp: string;
  data: LiveCycleEvent | LiveCheckingEvent | LiveMatchEvent;
};

interface RecentMatch {
  id: string;
  lost_declaration_id: string;
  found_declaration_id: string;
  score: number;
  status: string;
  created_at: string;
  lost_identifiant: string;
  lost_owner_name: string;
  lost_doc_type: string;
  lost_ville: string;
  lost_quartier: string;
  found_identifiant: string;
  found_owner_name: string;
  found_doc_type: string;
  found_ville: string;
  found_quartier: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "CONFIRMED":
      return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">Haute confiance</span>;
    case "PENDING":
      return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-700">Potentielle</span>;
    case "REJECTED":
      return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-700">Rejetée</span>;
    default:
      return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gray-100 text-gray-600">{status}</span>;
  }
};

const criterionIcon = (c: MatchCriterion) => {
  if (c.icon === "✓") return <span className="text-emerald-500"><i className="fa-solid fa-check-circle" /></span>;
  if (c.icon === "⚠") return <span className="text-amber-500"><i className="fa-solid fa-triangle-exclamation" /></span>;
  if (c.icon === "✗") return <span className="text-red-400"><i className="fa-solid fa-circle-xmark" /></span>;
  return <span className="text-gray-300"><i className="fa-solid fa-minus" /></span>;
};

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case "CYCLE_START": return <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center"><i className="fa-solid fa-rotate text-xs" /></div>;
    case "CHECKING": return <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center"><i className="fa-solid fa-search text-xs" /></div>;
    case "MATCH_FOUND": return <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center"><i className="fa-solid fa-handshake text-xs" /></div>;
    case "CYCLE_END": return <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center"><i className="fa-solid fa-flag-checkered text-xs" /></div>;
    case "CYCLE_ERROR": return <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center"><i className="fa-solid fa-bug text-xs" /></div>;
    default: return <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center"><i className="fa-solid fa-circle text-xs" /></div>;
  }
}

export default function AdminMatchingMonitor() {
  const [matches, setMatches] = useState<RecentMatch[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [stats, setStats] = useState({ totalMatches: 0, highConfidence: 0, potential: 0, averageScore: 0 });
  const [loading, setLoading] = useState(true);
  const [cycleActive, setCycleActive] = useState(false);
  const [cycleProgress, setCycleProgress] = useState<{ current: number; total: number } | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedMatchDetails, setExpandedMatchDetails] = useState<Record<string, MatchCriterion[]>>({});
  const feedRef = useRef<HTMLDivElement>(null);

  const addLiveEvent = useCallback((type: LiveEvent["type"], data: unknown) => {
    const event: LiveEvent = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      timestamp: (data as any).timestamp || new Date().toISOString(),
      data: data as any,
    };
    setLiveEvents((prev) => [event, ...prev].slice(0, 100));
  }, []);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [liveEvents.length]);

  useEffect(() => {
    if (!socketService.connected) {
      socketService.init();
    }

    const handleCycleStart = (e: Event) => {
      addLiveEvent("CYCLE_START", (e as CustomEvent).detail);
      setCycleActive(true);
      setCycleProgress(null);
    };
    const handleChecking = (e: Event) => {
      const data = (e as CustomEvent).detail as LiveCheckingEvent;
      addLiveEvent("CHECKING", data);
      setCycleProgress(data.progress);
    };
    const handleMatchFound = (e: Event) => {
      const data = (e as CustomEvent).detail as LiveMatchEvent;
      addLiveEvent("MATCH_FOUND", data);
      setExpandedMatchDetails((prev) => ({ ...prev, [data.id]: data.criteria }));
    };
    const handleCycleEnd = (e: Event) => {
      const data = (e as CustomEvent).detail as LiveCycleEvent;
      addLiveEvent("CYCLE_END", data);
      setCycleActive(false);
      setCycleProgress(null);
      setStats((prev) => ({
        ...prev,
        totalMatches: prev.totalMatches + (data.totalMatches || 0),
        highConfidence: prev.highConfidence + (data.highConfidence || 0),
        potential: prev.potential + (data.potential || 0),
      }));
    };
    const handleCycleError = (e: Event) => {
      addLiveEvent("CYCLE_ERROR", (e as CustomEvent).detail);
      setCycleActive(false);
      setCycleProgress(null);
    };

    window.addEventListener("docmaster:matching-cycle-start", handleCycleStart);
    window.addEventListener("docmaster:matching-checking", handleChecking);
    window.addEventListener("docmaster:matching-match-found", handleMatchFound);
    window.addEventListener("docmaster:matching-cycle-end", handleCycleEnd);
    window.addEventListener("docmaster:matching-cycle-error", handleCycleError);

    return () => {
      window.removeEventListener("docmaster:matching-cycle-start", handleCycleStart);
      window.removeEventListener("docmaster:matching-checking", handleChecking);
      window.removeEventListener("docmaster:matching-match-found", handleMatchFound);
      window.removeEventListener("docmaster:matching-cycle-end", handleCycleEnd);
      window.removeEventListener("docmaster:matching-cycle-error", handleCycleError);
    };
  }, [addLiveEvent]);

  useEffect(() => {
    Promise.all([
      adminService.getRecentMatches(),
      adminService.getMatchingStats(),
    ])
      .then(([recent, statsData]) => {
        setMatches(recent);
        setStats(statsData);
        const detailsMap: Record<string, MatchCriterion[]> = {};
        recent.forEach((m) => {
          if (m.details?.criteria) {
            detailsMap[m.id] = m.details.criteria;
          }
        });
        setExpandedMatchDetails((prev) => ({ ...prev, ...detailsMap }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleRow = (matchId: string) => {
    setExpandedRow((prev) => (prev === matchId ? null : matchId));
  };

  const renderCriterionRow = (c: MatchCriterion, i: number) => (
    <div key={i} className="flex items-center gap-3 py-1.5 px-4 text-[13px]">
      <span className="w-5 text-center">{criterionIcon(c)}</span>
      <span className="flex-1 text-gray-700 font-medium">{c.name}</span>
      {c.detail && (
        <span className="text-[11px] text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded">{c.detail}</span>
      )}
      <div className="flex items-center gap-1.5 min-w-[80px] justify-end">
        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${c.matched ? (c.points === c.max ? "bg-emerald-400" : "bg-amber-400") : "bg-gray-200"}`}
            style={{ width: `${(c.points / c.max) * 100}%` }}
          />
        </div>
        <span className={`text-xs font-bold tabular-nums ${c.matched ? "text-gray-800" : "text-gray-400"}`}>
          {c.points}/{c.max}
        </span>
      </div>
    </div>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bricolage text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              Correspondances en direct
            </h1>
            <InfoTooltip text="Suivi en temps réel du moteur de matching : chaque cycle, chaque correspondance, chaque score." />
          </div>
          <p className="text-gray-400 text-sm font-medium mt-1">
            Surveillance du matching automatique des documents perdus et trouvés
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cycleProgress && (
            <span className="text-[12px] font-bold text-gray-400 tabular-nums">
              {cycleProgress.current}/{cycleProgress.total}
            </span>
          )}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold ${cycleActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
            <span className={`w-2 h-2 rounded-full ${cycleActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
            {cycleActive ? "Cycle en cours" : "En attente"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="fa-handshake" label="Correspondances" value={stats.totalMatches.toLocaleString()} color="#1E3A2F" bgColor="#E8F5EE" />
        <StatCard icon="fa-circle-check" label="Haute confiance" value={stats.highConfidence.toLocaleString()} color="#059669" bgColor="#ECFDF5" />
        <StatCard icon="fa-clock" label="Potentielles" value={stats.potential.toLocaleString()} color="#D97706" bgColor="#FFFBEB" />
        <StatCard icon="fa-star" label="Score moyen" value={`${stats.averageScore}/100`} color="#7C3AED" bgColor="#F5F3FF" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bricolage text-base font-bold text-gray-900">Correspondances récentes</h3>
              <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{matches.length}</span>
            </div>
          </div>

          {matches.length === 0 ? (
            <EmptyState icon="fa-solid fa-handshake" message="Aucune correspondance enregistrée" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Document perdu</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Document trouvé</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Score</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Statut</th>
                    <th className="py-3 px-4 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {matches.map((m) => {
                    const criteria = expandedMatchDetails[m.id];
                    const isExpanded = expandedRow === m.id && criteria;
                    return (
                      <tr key={m.id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] font-bold text-gray-400">
                            {new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-gray-900">{m.lost_identifiant}</span>
                            <span className="text-[11px] text-gray-500">{m.lost_owner_name} · {m.lost_doc_type}</span>
                            <span className="text-[10px] text-gray-400">{m.lost_ville}{m.lost_quartier ? `, ${m.lost_quartier}` : ""}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-gray-900">{m.found_identifiant}</span>
                            <span className="text-[11px] text-gray-500">{m.found_owner_name} · {m.found_doc_type}</span>
                            <span className="text-[10px] text-gray-400">{m.found_ville}{m.found_quartier ? `, ${m.found_quartier}` : ""}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${m.score >= 80 ? "bg-emerald-500" : m.score >= 50 ? "bg-amber-400" : "bg-gray-300"}`}
                                style={{ width: `${m.score}%` }}
                              />
                            </div>
                            <span className="text-[13px] font-black text-gray-900 tabular-nums">{m.score}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">{statusBadge(m.status)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => toggleRow(m.id)}
                            className={`w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all cursor-pointer ${!criteria ? "opacity-30 cursor-not-allowed" : ""}`}
                            disabled={!criteria}
                          >
                            <i className={`fa-solid fa-chevron-down text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {matches.map((m) => {
                    const criteria = expandedMatchDetails[m.id];
                    if (expandedRow !== m.id || !criteria) return null;
                    return (
                      <tr key={`${m.id}-detail`}>
                        <td colSpan={6} className="p-0 bg-gray-50/60 border-b border-gray-100">
                          <div className="py-3">
                            <div className="flex items-center gap-2 px-4 mb-2">
                              <i className="fa-solid fa-list-check text-[11px] text-gray-400" />
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Détail des points attribués</span>
                            </div>
                            <div className="divide-y divide-gray-100/60">
                              {criteria.map((c, i) => renderCriterionRow(c, i))}
                            </div>
                            <div className="flex items-center justify-end gap-3 px-4 pt-3 mt-1 border-t border-gray-200/60">
                              <span className="text-[11px] font-bold text-gray-400 uppercase">Score total</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 rounded-full bg-gray-200 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${m.score >= 80 ? "bg-emerald-500" : m.score >= 50 ? "bg-amber-400" : "bg-gray-300"}`}
                                    style={{ width: `${m.score}%` }}
                                  />
                                </div>
                                <span className="text-sm font-black text-gray-900 tabular-nums">{m.score}/100</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200/60 shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h3 className="font-bricolage text-base font-bold text-gray-900">Flux en direct</h3>
            <button
              onClick={() => setLiveEvents([])}
              className="text-[10px] font-bold text-gray-400 hover:text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-rotate-right mr-1" />Vider
            </button>
          </div>
          <div
            ref={feedRef}
            className="flex-1 overflow-y-auto custom-scroll min-h-[400px] max-h-[600px]"
          >
            {liveEvents.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center py-12">
                  <i className="fa-solid fa-wifi text-3xl text-gray-200 mb-3" />
                  <p className="text-[13px] text-gray-400 font-medium">En attente d'événements...</p>
                  <p className="text-[11px] text-gray-300 mt-1">Les cycles de matching apparaîtront ici</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {liveEvents.map((ev) => (
                  <div key={ev.id} className="px-4 py-3 hover:bg-gray-50/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <EventIcon type={ev.type} />
                      <div className="flex-1 min-w-0">
                        {ev.type === "CYCLE_START" && (
                          <p className="text-[13px] font-bold text-blue-600">Cycle de matching démarré</p>
                        )}
                        {ev.type === "CHECKING" && (
                          <div>
                            <p className="text-[13px] font-medium text-gray-700">
                              Vérification <span className="font-bold text-gray-900">{(ev.data as LiveCheckingEvent).identifiant}</span>
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {(ev.data as LiveCheckingEvent).docType} · {(ev.data as LiveCheckingEvent).ownerName} · {(ev.data as LiveCheckingEvent).ville}
                              <span className="ml-2 text-[10px] font-bold">
                                {(ev.data as LiveCheckingEvent).progress.current}/{(ev.data as LiveCheckingEvent).progress.total}
                              </span>
                            </p>
                          </div>
                        )}
                        {ev.type === "MATCH_FOUND" && (
                          <div>
                            <p className="text-[13px] font-medium text-gray-700">
                              Correspondance trouvée
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              <span className="font-semibold text-gray-800">{(ev.data as LiveMatchEvent).lostDeclaration.identifiant_doc_dm}</span>
                              <span className="text-gray-300 mx-1">⇄</span>
                              <span className="font-semibold text-gray-800">{(ev.data as LiveMatchEvent).foundDeclaration.identifiant_doc_dm}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-black ${(ev.data as LiveMatchEvent).status === "CONFIRMED" ? "text-emerald-600" : "text-amber-600"}`}>
                                {(ev.data as LiveMatchEvent).status === "CONFIRMED" ? "Haute confiance" : "Potentielle"}
                              </span>
                              <span className="text-gray-200">·</span>
                              <span className="text-[11px] font-bold text-gray-700">Score: {(ev.data as LiveMatchEvent).totalScore}</span>
                            </div>
                          </div>
                        )}
                        {ev.type === "CYCLE_END" && (
                          <div>
                            <p className="text-[13px] font-bold text-purple-600">Cycle terminé</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {(ev.data as LiveCycleEvent).processed} déclaration(s) traitée(s)
                              {(ev.data as LiveCycleEvent).totalMatches ? ` · ${(ev.data as LiveCycleEvent).totalMatches} correspondance(s)` : ""}
                              {(ev.data as LiveCycleEvent).durationMs ? ` · ${Math.round((ev.data as LiveCycleEvent).durationMs / 1000)}s` : ""}
                            </p>
                          </div>
                        )}
                        {ev.type === "CYCLE_ERROR" && (
                          <p className="text-[13px] font-bold text-red-600">Erreur lors du cycle</p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0 font-mono">
                        {new Date(ev.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
