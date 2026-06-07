import { useEffect, useState, useCallback } from "react";
import { useI18n } from "../../context/I18nContext";
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

export default function AdminDeclarations() {
  const { t } = useI18n();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
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
    setSelected(null);
    setPdfUrl(null);
    setDetailLoading(true);
    try {
      const res = await declarationsService.getById(d.id);
      const detail = (res as any).data || d;
      setSelected(detail as DetailData);
      loadPdfPreview(d.id);
    } catch {
      setSelected(d as DetailData);
    } finally {
      setDetailLoading(false);
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
    } catch { alert("Impossible de télécharger le PDF."); }
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
      case "MATCHED": return "bg-green-50 text-green-700";
      case "PENDING": return "bg-yellow-50 text-yellow-700";
      case "RETURNED": return "bg-blue-50 text-blue-700";
      case "SEARCHING": return "bg-blue-50 text-blue-600";
      case "CANCELLED": return "bg-red-50 text-red-600";
      default: return "bg-gray-100 text-gray-500";
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
    <div>
      <header className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bricolage text-2xl font-black text-gray-900">{t("admin_declarations")}</h1>
            <InfoTooltip text="Toutes les déclarations de perte et de trouvaille. Cliquez sur une ligne pour voir les détails complets avec aperçu PDF." />
          </div>
          <p className="text-gray-400 text-[13px] font-medium mt-1">{t("admin_all_declarations")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all flex items-center gap-1.5">
            <i className="fa-solid fa-download text-[10px]" /> CSV
          </button>
          <button onClick={loadData} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors flex items-center gap-2">
            <i className="fa-solid fa-rotate-right" /> {t("admin_declarations_refresh")}
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 bg-gray-50/30 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher nom, réf, numéro doc..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-colors placeholder:text-gray-300"
            />
          </div>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary bg-white">
            <option value="">Tous types</option>
            <option value="LOST">Perte</option>
            <option value="FOUND">Trouvaille</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary bg-white">
            <option value="">Tous statuts</option>
            <option value="AVAILABLE">Disponible</option>
            <option value="MATCHED">Correspondance</option>
            <option value="PENDING">En attente</option>
            <option value="RETURNED">Restitué</option>
            <option value="SEARCHING">Recherche</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_date")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_declarations_reference")}<InfoTooltip text="Identifiant unique du document déclaré" /></th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_declarations_photo")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_declarations_doc_type")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_declarations_doc_name")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_declarations_type")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_status")}</th>
                <th className="text-right px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">{t("admin_sms_loading")}</td></tr>
              ) : declarations.length === 0 ? (
                <EmptyState icon="fa-solid fa-folder-open" message={t("admin_no_declarations")} colSpan={8} />
              ) : (
                declarations.map((d) => {
                  const ref = d.identifiant_doc_dm || (d.id ? d.id.substring(0, 8) : "N/A");
                  return (
                    <tr key={d.id} className="hover:bg-gray-50/60 transition-colors cursor-pointer" onClick={() => openDetail(d)}>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">{d.created_at ? new Date(d.created_at).toLocaleString("fr-FR") : "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-primary-dark">{ref}</td>
                      <td className="px-4 py-3">
                        {photoUrl(d) ? (
                          <img src={photoUrl(d)!} alt="" className="w-10 h-10 rounded-lg object-cover border border-[#EAE3D8]" onClick={(e) => { e.stopPropagation(); window.open(photoUrl(d)!, "_blank"); }} />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#F4EFE6] flex items-center justify-center text-[10px] text-gray-400 italic">N/A</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-sm">{d.doc_type || d.document_type_name || "—"}</td>
                      <td className="px-4 py-3 text-sm font-medium">{d.owner_name || d.nom_complet || "N/A"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${d.declaration_type === "LOST" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                          {d.declaration_type === "LOST" ? t("admin_lost") : t("admin_found")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusBadgeClass(d.status)}`}>{statusLabel(d.status)}</span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDownloadPdf(d.id)} className="bg-primary text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-primary-dark transition-colors">
                          <i className="fa-solid fa-file-pdf mr-1" /> PDF
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeDetail}>
          <div className="bg-white rounded-2xl w-full max-w-4xl p-6 border border-gray-200/60 shadow-xl max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bricolage text-lg font-bold text-gray-900 flex items-center gap-2">
                {t("admin_declaration_detail_title")}
                {selected.declaration_type === "LOST" ? (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600">Perte</span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700">Trouvaille</span>
                )}
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusBadgeClass(selected.status)}`}>{statusLabel(selected.status)}</span>
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDownloadPdf(selected.id)} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all flex items-center gap-1.5">
                  <i className="fa-solid fa-download" /> Télécharger PDF
                </button>
                <button onClick={closeDetail} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#EAE3D8] text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all">
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16"><LoadingSpinner /></div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bricolage text-base font-bold text-gray-800 flex items-center gap-2">
                      <i className="fa-solid fa-image text-primary" /> Photos du document
                    </h4>
                    <div className="flex gap-3 flex-wrap">
                      {photoUrl(selected) ? (
                        <img
                          src={photoUrl(selected)!}
                          alt="Recto"
                          className="w-48 h-36 rounded-xl object-cover border border-[#EAE3D8] cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(photoUrl(selected)!, "_blank")}
                        />
                      ) : (
                        <div className="w-48 h-36 rounded-xl bg-[#F4EFE6] flex items-center justify-center text-xs text-gray-400 italic border border-dashed border-gray-300">Pas de photo recto</div>
                      )}
                      {detailPhotoUrl(selected.photo_verso) ? (
                        <img
                          src={detailPhotoUrl(selected.photo_verso)!}
                          alt="Verso"
                          className="w-48 h-36 rounded-xl object-cover border border-[#EAE3D8] cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(detailPhotoUrl(selected.photo_verso)!, "_blank")}
                        />
                      ) : (
                        <div className="w-48 h-36 rounded-xl bg-[#F4EFE6] flex items-center justify-center text-xs text-gray-400 italic border border-dashed border-gray-300">Pas de photo verso</div>
                      )}
                    </div>
                    {selected.counterPartPhotoRecto && (
                      <div>
                        <h5 className="font-semibold text-sm text-gray-600 mb-2 flex items-center gap-1.5">
                          <i className="fa-solid fa-arrows-turn-right text-primary" /> Photos de la contrepartie
                        </h5>
                        <div className="flex gap-3 flex-wrap">
                          {detailPhotoUrl(selected.counterPartPhotoRecto) && (
                            <img src={detailPhotoUrl(selected.counterPartPhotoRecto)!} alt="Contrepartie recto" className="w-36 h-28 rounded-xl object-cover border border-[#EAE3D8] cursor-pointer hover:opacity-90" onClick={() => window.open(detailPhotoUrl(selected.counterPartPhotoRecto)!, "_blank")} />
                          )}
                          {detailPhotoUrl(selected.counterPartPhotoVerso) && (
                            <img src={detailPhotoUrl(selected.counterPartPhotoVerso)!} alt="Contrepartie verso" className="w-36 h-28 rounded-xl object-cover border border-[#EAE3D8] cursor-pointer hover:opacity-90" onClick={() => window.open(detailPhotoUrl(selected.counterPartPhotoVerso)!, "_blank")} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bricolage text-base font-bold text-gray-800 flex items-center gap-2">
                      <i className="fa-solid fa-circle-info text-primary" /> Informations
                    </h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Référence</span>
                        <span className="font-mono text-xs font-bold text-primary-dark">{selected.identifiant_doc_dm || selected.id?.substring(0, 8) || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Type de document</span>
                        <span className="font-semibold">{selected.doc_type || selected.document_type_name || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Propriétaire</span>
                        <span className="font-semibold">{selected.owner_name || selected.nom_complet || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Numéro de document</span>
                        <span className="font-mono text-xs">{selected.numero_document || selected.document_number || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Contact</span>
                        <span>{selected.email_owner || selected.telephone_owner || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Date déclaration</span>
                        <span>{selected.created_at ? new Date(selected.created_at).toLocaleString("fr-FR") : "—"}</span>
                      </div>
                      {selected.date_perte && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Date de perte</span>
                          <span>{new Date(selected.date_perte).toLocaleDateString("fr-FR")}</span>
                        </div>
                      )}
                      {selected.lieu_perte && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Lieu de perte</span>
                          <span>{selected.lieu_perte}</span>
                        </div>
                      )}
                      {selected.date_trouvee && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Date trouvée</span>
                          <span>{new Date(selected.date_trouvee).toLocaleDateString("fr-FR")}</span>
                        </div>
                      )}
                      {selected.found_location && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Lieu trouvé</span>
                          <span>{typeof selected.found_location === 'object' ? (selected.found_location as any).city || JSON.stringify(selected.found_location) : selected.found_location}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Ville</span>
                        <span>{selected.ville || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Région</span>
                        <span>{selected.region || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Pays</span>
                        <span>{selected.pays || "—"}</span>
                      </div>
                      {selected.urgence != null && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Urgence</span>
                          <span className="font-semibold">{selected.urgence}/5</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Récompense</span>
                        <span className="font-semibold text-primary-dark">{selected.recompense_montant || selected.recompense || "—"}</span>
                      </div>
                      {selected.date_expiration && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Expiration</span>
                          <span>{new Date(selected.date_expiration).toLocaleDateString("fr-FR")}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">État physique</span>
                        <span>{selected.etat_physique || "—"}</span>
                      </div>
                    </div>
                    {selected.description && (
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Description</span>
                        <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{selected.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {selected.counterPart && (
                  <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-5 space-y-3">
                    <h4 className="font-bricolage text-base font-bold text-gray-800 flex items-center gap-2">
                      <i className="fa-solid fa-handshake text-blue-500" /> Correspondance trouvée
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Nom complet</span>
                        <span className="font-semibold">{selected.counterPart.prenom} {selected.counterPart.nom}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Téléphone</span>
                        <span>{selected.counterPart.telephone || "—"}</span>
                      </div>
                      {selected.counterPart.photo_url && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Photo</span>
                          <img src={selected.counterPart.photo_url.startsWith("http") ? selected.counterPart.photo_url : `${window.location.origin}/${selected.counterPart.photo_url.replace(/^\//, "")}`} alt="" className="w-10 h-10 rounded-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selected.claim && (
                  <div className={`rounded-2xl p-5 space-y-3 ${selected.claim.is_validated ? "bg-green-50/40 border border-green-100" : "bg-yellow-50/40 border border-yellow-100"}`}>
                    <h4 className="font-bricolage text-base font-bold text-gray-800 flex items-center gap-2">
                      <i className={`fa-solid ${selected.claim.is_validated ? "fa-check-circle text-green-500" : "fa-clock text-yellow-500"}`} />
                      Réclamation {selected.claim.is_validated ? "validée" : "en attente"}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Code validation</span>
                        <span className="font-mono font-bold">{selected.claim.validation_code || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Statut</span>
                        <span>{selected.claim.is_validated ? "Validé" : "En attente"}</span>
                      </div>
                      {selected.reward_amount != null && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Montant retrouvaille</span>
                          <span className="font-semibold text-primary-dark">{selected.reward_amount} FCFA</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-bricolage text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <i className="fa-solid fa-file-pdf text-red-500" /> Aperçu PDF
                    <InfoTooltip text="Prévisualisation directe du PDF généré pour cette déclaration." />
                  </h4>
                  {pdfLoading ? (
                    <div className="flex items-center justify-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <LoadingSpinner />
                    </div>
                  ) : pdfUrl ? (
                    <iframe
                      src={pdfUrl}
                      className="w-full h-[600px] rounded-2xl border border-gray-200"
                      title="Aperçu PDF"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400">
                      <i className="fa-solid fa-file-pdf text-4xl mb-3" />
                      <p className="text-sm font-medium">Aperçu non disponible</p>
                      <p className="text-xs mt-1">Le PDF n'a pas pu être généré pour cette déclaration</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button onClick={closeDetail} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-all">
                    {t("admin_declaration_detail_close")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
