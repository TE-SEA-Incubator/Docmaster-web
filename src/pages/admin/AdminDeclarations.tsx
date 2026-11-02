import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { useToast } from "../../context/ToastContext";
import { declarationsService } from "../../services/declarationsService";
import apiClient from "../../services/api";
import InfoTooltip from "../../components/ui/InfoTooltip";
import Pagination from "../../components/ui/Pagination";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import { exportCSV } from "../../utils/csv";
import type { Declaration } from "../../types/api";

type DetailData = Declaration & {
  matches?: any[];
  match?: any;
  docTypeInfo?: { nom: string; icone: string };
  counterPart?: { id: string; nom: string; prenom: string; telephone: string; photo_url?: string };
  counterPartPhotoRecto?: string;
  counterPartPhotoVerso?: string;
  counterPartDeclaration?: any;
  claim?: any;
  reward_amount?: number;
  reward_points?: number;
};

const PartnerBadge = () => (
  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
    <i className="ph ph-building text-[9px]" /> Partenaire
  </span>
);

const ReporterCell = ({ d }: { d: Declaration }) => {
  const isPartner = d.reporter_type === "PARTENAIRE";
  if (!isPartner && !d.reporter_id) return <span className="text-gray-400">—</span>;
  if (isPartner) {
    return (
      <span className="flex items-center gap-1.5">
        <i className="ph ph-building text-cyan-600 text-[11px]" />
        <span className="text-[12.5px] font-semibold text-cyan-800">{d.reporter_partenaire_nom || "Organisation partenaire"}</span>
        <PartnerBadge />
      </span>
    );
  }
  return <span className="text-[12.5px] text-gray-600">Utilisateur</span>;
};

export default function AdminDeclarations() {
  const { t } = useI18n();
  const toast = useToast();
  const [params] = useSearchParams();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // Deep link depuis un signalement : /admin/declarations?search=<référence>
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const pageSize = 20;

  const loadData = useCallback(() => {
    setLoading(true);
    declarationsService
      .getAll({ page, limit: pageSize, search, declaration_type: typeFilter, status: statusFilter })
      .then((res: any) => {
        setDeclarations(res.data || []);
        setTotal(res.total || 0);
      })
      .catch(() => { setDeclarations([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const openDetail = async (d: Declaration) => {
    setPdfUrl(null);
    setLoadingRowId(d.id);
    setDetailLoading(true);
    setSelected(d as DetailData);
    try {
      const res = await declarationsService.getById(d.id);
      const detail = (res as any).data || d;
      setSelected(detail as DetailData);
      loadPdfPreview(d.id);
    } catch {
      setSelected(d as DetailData);
    } finally {
      setDetailLoading(false);
      setLoadingRowId(null);
    }
  };

  const loadPdfPreview = async (id: string) => {
    setPdfLoading(true);
    try {
      const res = await apiClient.get(`declarations/${id}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      setPdfUrl(window.URL.createObjectURL(blob));
    } catch {
      setPdfUrl(null);
    } finally {
      setPdfLoading(false);
    }
  };

  const closeDetail = () => {
    if (pdfUrl) { window.URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }
    setSelected(null);
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      const res = await apiClient.get(`declarations/${id}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `Declaration_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch { toast.error("Impossible de télécharger le PDF."); }
  };

  const handleExport = () => {
    exportCSV(declarations, [
      { key: "identifiant_doc_dm", label: "Référence" },
      { key: "doc_type", label: "Type" },
      { key: "owner_name", label: "Propriétaire" },
      { key: "declaration_type", label: "Type déclaration" },
      { key: "status", label: "Statut" },
      { key: "ville", label: "Ville" },
      { key: "created_at", label: "Date" },
    ], "declarations");
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "MATCHED":   return "bg-green-50 text-green-700 border-green-200";
      case "RETURNED":  return "bg-green-50 text-green-700 border-green-200";
      case "PENDING":   return "bg-gray-100 text-gray-500 border-gray-200";
      case "SEARCHING": return "bg-gray-100 text-gray-500 border-gray-200";
      case "CANCELLED": return "bg-red-50 text-red-700 border-red-200";
      case "REJECTED":  return "bg-red-50 text-red-700 border-red-200";
      default:          return "bg-gray-50 text-gray-500 border-gray-200";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "MATCHED": return t("admin_matched");
      case "PENDING": return t("admin_status_pending");
      case "RETURNED": return t("admin_returned");
      case "SEARCHING": return t("admin_searching");
      case "CANCELLED": return t("admin_cancelled");
      default: return status;
    }
  };

  const photoUrl = (d: Declaration | DetailData) => {
    if (!d.photo_recto) return null;
    if (d.photo_recto.startsWith("http") || d.photo_recto.startsWith("data:")) return d.photo_recto;
    return `${window.location.origin}/${d.photo_recto.replace(/^\//, "")}`;
  };

  const detailPhotoUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith("http") || path.startsWith("data:")) return path;
    return `${window.location.origin}/${path.replace(/^\//, "")}`;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{t("admin_declarations")}</h1>
            <InfoTooltip text="Toutes les déclarations de perte et de trouvaille. Cliquez sur une ligne pour voir les détails." />
          </div>
          <p className="text-gray-500 text-[13px] mt-0.5">{t("admin_all_declarations")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            <i className="ph ph-download text-[10px]" /> CSV
          </button>
          <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-2 bg-[#2D5A42] text-white rounded text-[12px] font-semibold hover:bg-[#2D5A42] transition-colors">
            <i className="ph ph-arrow-clockwise text-[10px]" /> {t("admin_declarations_refresh")}
          </button>
        </div>
      </header>

      <div className="bg-white border border-gray-200 rounded flex flex-col min-h-0">
        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Nom, réf, numéro doc..."
              className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors placeholder:text-gray-400"
            />
          </div>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] bg-white text-gray-700">
            <option value="">Tous types</option>
            <option value="LOST">Perte</option>
            <option value="FOUND">Trouvaille</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] bg-white text-gray-700">
            <option value="">Tous statuts</option>
            <option value="AVAILABLE">Disponible</option>
            <option value="MATCHED">Correspondance</option>
            <option value="PENDING">En attente</option>
            <option value="RETURNED">Restitué</option>
            <option value="SEARCHING">Recherche</option>
            <option value="CANCELLED">Annulé</option>
          </select>
          <span className="text-[12px] text-gray-400 ml-auto">{total} déclaration{total !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_date")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {t("admin_declarations_reference")} <InfoTooltip text="Identifiant unique" />
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_declarations_photo")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_declarations_doc_type")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_declarations_doc_name")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Déclarant</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_declarations_type")}</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_status")}</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {declarations.length === 0 ? (
                <EmptyState icon="ph ph-folder-open" message={t("admin_no_declarations")} colSpan={9} />
              ) : (
                declarations.map((d) => {
                  const ref = d.identifiant_doc_dm || (d.id ? d.id.substring(0, 8) : "N/A");
                  return (
                    <tr
                      key={d.id}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${loadingRowId === d.id ? "pointer-events-none opacity-60" : ""}`}
                      onClick={() => openDetail(d)}
                    >
                      <td className="px-4 py-3 text-[11px] text-gray-400 whitespace-nowrap">
                        {d.created_at ? new Date(d.created_at).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-[11px] font-bold text-[#2D5A42] bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">{ref}</code>
                      </td>
                      <td className="px-4 py-3">
                        {photoUrl(d) ? (
                          <img src={photoUrl(d)!} alt="" className="w-9 h-9 rounded border border-gray-200 object-cover" onClick={(e) => { e.stopPropagation(); window.open(photoUrl(d)!, "_blank"); }} />
                        ) : (
                          <div className="w-9 h-9 rounded border border-gray-200 bg-gray-100 flex items-center justify-center text-[9px] text-gray-400">N/A</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-gray-800">{d.docTypeInfo?.nom || d.doc_type || "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-gray-700">{d.owner_name || d.nom_complet || "N/A"}</td>
                      <td className="px-4 py-3"><ReporterCell d={d} /></td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${d.declaration_type === "LOST" ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                          {d.declaration_type === "LOST" ? t("admin_lost") : t("admin_found")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${statusBadgeClass(d.status)}`}>
                          {statusLabel(d.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDownloadPdf(d.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 rounded text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <i className="ph ph-file-pdf text-red-500 text-[10px]" /> PDF
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeDetail}>
          <div className="bg-white rounded-lg w-full max-w-4xl border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-gray-900">{t("admin_declaration_detail_title")}</h3>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${selected.declaration_type === "LOST" ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                  {selected.declaration_type === "LOST" ? "Perte" : "Trouvaille"}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${statusBadgeClass(selected.status)}`}>
                  {statusLabel(selected.status)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDownloadPdf(selected.id)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  <i className="ph ph-download text-[10px]" /> Télécharger PDF
                </button>
                <button onClick={closeDetail} className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all">
                  <i className="ph ph-x text-xs" />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16"><LoadingSpinner /></div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Photos */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <i className="ph ph-image text-gray-400" /> Photos du document
                    </h4>
                    <div className="flex gap-3 flex-wrap">
                      {photoUrl(selected) ? (
                        <img src={photoUrl(selected)!} alt="Recto" className="w-44 h-32 rounded border border-gray-200 object-cover cursor-pointer hover:opacity-90" onClick={() => window.open(photoUrl(selected)!, "_blank")} />
                      ) : (
                        <div className="w-44 h-32 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400">Pas de photo recto</div>
                      )}
                      {detailPhotoUrl(selected.photo_verso) ? (
                        <img src={detailPhotoUrl(selected.photo_verso)!} alt="Verso" className="w-44 h-32 rounded border border-gray-200 object-cover cursor-pointer hover:opacity-90" onClick={() => window.open(detailPhotoUrl(selected.photo_verso)!, "_blank")} />
                      ) : (
                        <div className="w-44 h-32 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400">Pas de photo verso</div>
                      )}
                    </div>
                    {selected.counterPartPhotoRecto && (
                      <div className="mt-4">
                        <h5 className="text-[12px] font-semibold text-gray-600 mb-2">Photos de la contrepartie</h5>
                        <div className="flex gap-3 flex-wrap">
                          {detailPhotoUrl(selected.counterPartPhotoRecto) && (
                            <img src={detailPhotoUrl(selected.counterPartPhotoRecto)!} alt="Contrepartie recto" className="w-32 h-24 rounded border border-gray-200 object-cover cursor-pointer" onClick={() => window.open(detailPhotoUrl(selected.counterPartPhotoRecto)!, "_blank")} />
                          )}
                          {detailPhotoUrl(selected.counterPartPhotoVerso) && (
                            <img src={detailPhotoUrl(selected.counterPartPhotoVerso)!} alt="Contrepartie verso" className="w-32 h-24 rounded border border-gray-200 object-cover cursor-pointer" onClick={() => window.open(detailPhotoUrl(selected.counterPartPhotoVerso)!, "_blank")} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info grid */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <i className="ph ph-info text-gray-400" /> Informations
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      {[
                        { label: "Référence", value: <code className="text-[11px] font-bold text-[#2D5A42]">{selected.identifiant_doc_dm || selected.id?.substring(0, 8) || "—"}</code> },
                        { label: "Type de document", value: selected.docTypeInfo?.nom || selected.doc_type || "—" },
                        { label: "Propriétaire", value: selected.owner_name || selected.nom_complet || "—" },
                        { label: "Déclarant", value: selected.reporter_type === "PARTENAIRE"
                          ? (selected.reporter_partenaire_nom || "Organisation partenaire") + " (Partenaire)"
                          : (selected.reporter_id ? "Utilisateur" : "—") },
                        { label: "N° document", value: <code className="text-[11px]">{selected.numero_document || selected.document_number || "—"}</code> },
                        { label: "Contact", value: selected.email_owner || selected.telephone_owner || "—" },
                        { label: "Date déclaration", value: selected.created_at ? new Date(selected.created_at).toLocaleDateString("fr-FR") : "—" },
                        ...(selected.date_perte ? [{ label: "Date de perte", value: new Date(selected.date_perte).toLocaleDateString("fr-FR") }] : []),
                        ...(selected.lieu_perte ? [{ label: "Lieu de perte", value: selected.lieu_perte }] : []),
                        ...(selected.date_trouvee ? [{ label: "Date trouvée", value: new Date(selected.date_trouvee).toLocaleDateString("fr-FR") }] : []),
                        { label: "Ville", value: selected.ville || "—" },
                        { label: "Région", value: selected.region || "—" },
                        ...(selected.urgence != null ? [{ label: "Urgence", value: `${selected.urgence}/5` }] : []),
                        { label: "Récompense", value: selected.recompense_montant || selected.recompense || "—" },
                        { label: "État physique", value: selected.etat_physique || "—" },
                      ].map((row, i) => (
                        <div key={i} className="p-2.5 bg-gray-50 border border-gray-100 rounded">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{row.label}</span>
                          <span className="text-gray-800 font-medium">{row.value}</span>
                        </div>
                      ))}
                    </div>
                    {selected.description && (
                      <div className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded">
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</span>
                        <p className="text-[13px] text-gray-700">{selected.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Counterpart */}
                {selected.counterPart && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                    <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <i className="ph ph-handshake text-blue-500" /> Correspondance trouvée
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[13px]">
                      <div><span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Nom complet</span><span className="font-semibold">{selected.counterPart.prenom} {selected.counterPart.nom}</span></div>
                      <div><span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Téléphone</span><span>{selected.counterPart.telephone || "—"}</span></div>
                    </div>
                  </div>
                )}

                {/* Claim */}
                {selected.claim && (
                  <div className={`p-4 border rounded ${selected.claim.is_validated ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                    <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <i className={`${selected.claim.is_validated ? "ph ph-check-circle text-green-600" : "ph ph-clock text-amber-500"}`} />
                      Réclamation {selected.claim.is_validated ? "validée" : "en attente"}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[13px]">
                      <div><span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Code validation</span><code className="font-bold">{selected.claim.validation_code || "—"}</code></div>
                      <div><span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Statut</span><span>{selected.claim.is_validated ? "Validé" : "En attente"}</span></div>
                      {selected.reward_amount != null && <div><span className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Récompense</span><span className="font-semibold text-[#E8923A]">{selected.reward_amount} FCFA</span></div>}
                    </div>
                  </div>
                )}

                {/* PDF preview */}
                <div className="border-t border-gray-100 pt-5">
                  <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <i className="ph ph-file-pdf text-red-500" /> Aperçu PDF
                    <InfoTooltip text="Prévisualisation du PDF généré pour cette déclaration." />
                  </h4>
                  {pdfLoading ? (
                    <div className="flex items-center justify-center py-10 bg-gray-50 border border-dashed border-gray-200 rounded"><LoadingSpinner /></div>
                  ) : pdfUrl ? (
                    <iframe src={pdfUrl} className="w-full h-[500px] rounded border border-gray-200" title="Aperçu PDF" />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 bg-gray-50 border border-dashed border-gray-200 rounded text-gray-400">
                      <i className="ph ph-file-x text-2xl mb-2" />
                      <p className="text-[13px]">PDF non disponible</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}