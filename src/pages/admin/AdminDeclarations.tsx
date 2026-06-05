import { useEffect, useState, useRef } from "react";
import { useI18n } from "../../context/I18nContext";
import { declarationsService } from "../../services/declarationsService";
import apiClient from "../../services/api";
import type { Declaration } from "../../types/api";

export default function AdminDeclarations() {
  const { t } = useI18n();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [filtered, setFiltered] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Declaration | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    setLoading(true);
    declarationsService
      .getAll()
      .then((res) => {
        const data = res.data || [];
        setDeclarations(data);
        setFiltered(data);
      })
      .catch(() => {
        setDeclarations([]);
        setFiltered([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    if (!q) {
      setFiltered(declarations);
      return;
    }
    setFiltered(
      declarations.filter(
        (d) =>
          (d.doc_type || "").toLowerCase().includes(q) ||
          (d.owner_name || "").toLowerCase().includes(q) ||
          (d.identifiant_doc_dm || "").toLowerCase().includes(q) ||
          (d.nom_complet || "").toLowerCase().includes(q)
      )
    );
  }, [search, declarations]);

  const handleDownloadPdf = async (id: string) => {
    try {
      const res = await apiClient.get(`declarations/${id}/pdf`, {
        responseType: "blob",
      });
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
    } catch {
      alert("Impossible de télécharger le PDF.");
    }
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "MATCHED":
        return "bg-green-50 text-green-700";
      case "PENDING":
        return "bg-yellow-50 text-yellow-700";
      case "RETURNED":
        return "bg-blue-50 text-blue-700";
      case "SEARCHING":
        return "bg-blue-50 text-blue-600";
      case "CANCELLED":
        return "bg-red-50 text-red-600";
      default:
        return "bg-gray-100 text-gray-500";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "MATCHED":
        return t("admin_matched");
      case "PENDING":
        return t("admin_status_pending");
      case "RETURNED":
        return t("admin_returned");
      case "SEARCHING":
        return t("admin_searching");
      case "CANCELLED":
        return t("admin_cancelled");
      default:
        return status;
    }
  };

  const photoUrl = (d: Declaration) => {
    if (!d.photo_recto) return null;
    if (d.photo_recto.startsWith("http") || d.photo_recto.startsWith("data:")) return d.photo_recto;
    return `${window.location.origin}/${d.photo_recto.replace(/^\//, "")}`;
  };

  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-bricolage text-2xl font-black text-gray-900">
            {t("admin_declarations")}
          </h1>
          <p className="text-gray-400 text-[13px] font-medium mt-1">
            {t("admin_all_declarations")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin_search_user")}
            className="px-4 py-2 border border-[#EAE3D8] rounded-xl text-sm outline-none focus:border-primary bg-white w-64"
          />
          <button
            onClick={loadData}
            className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <i className="fa-solid fa-rotate-right" />
            {t("admin_declarations_refresh")}
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_date")}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t("admin_declarations_reference")}</th>
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
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">{t("admin_sms_loading")}</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-300">
                    <i className="fa-solid fa-folder-open text-3xl mb-3" />
                    <p className="text-[13px] font-medium text-gray-400">{t("admin_no_declarations")}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const ref = d.identifiant_doc_dm || (d.id ? d.id.substring(0, 8) : "N/A");
                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                      onClick={() => setSelected(d)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">
                        {d.created_at ? new Date(d.created_at).toLocaleString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-primary-dark">{ref}</td>
                      <td className="px-4 py-3">
                        {photoUrl(d) ? (
                          <img
                            src={photoUrl(d)!}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover border border-[#EAE3D8]"
                            onClick={(e) => { e.stopPropagation(); window.open(photoUrl(d)!, "_blank"); }}
                          />
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
                        <button
                          onClick={() => handleDownloadPdf(d.id)}
                          className="bg-primary text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-primary-dark transition-colors"
                        >
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
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 border border-gray-200/60 shadow-xl max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bricolage text-lg font-bold text-gray-900">
                {t("admin_declaration_detail_title")}
              </h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#EAE3D8] text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Photos */}
              <div className="flex gap-3">
                {photoUrl(selected) ? (
                  <img src={photoUrl(selected)!} alt="" className="w-24 h-24 rounded-xl object-cover border border-[#EAE3D8]" />
                ) : null}
                {selected.photo_verso ? (
                  (() => {
                    const verso = (selected.photo_verso.startsWith("http") || selected.photo_verso.startsWith("data:")) 
                      ? selected.photo_verso 
                      : `${window.location.origin}/${selected.photo_verso.replace(/^\//, "")}`;
                    return <img src={verso} alt="" className="w-24 h-24 rounded-xl object-cover border border-[#EAE3D8]" />;
                  })()
                ) : null}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_declarations_reference")}</span>
                  <span className="font-mono text-xs font-bold text-primary-dark">{selected.identifiant_doc_dm || selected.id?.substring(0, 8) || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_status")}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusBadgeClass(selected.status)}`}>{statusLabel(selected.status)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_declaration_detail_owner")}</span>
                  <span className="font-semibold">{selected.owner_name || selected.nom_complet || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_declaration_detail_document")}</span>
                  <span>{selected.doc_type || selected.document_type_name || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_declaration_detail_number")}</span>
                  <span className="font-mono text-xs">{selected.numero_document || selected.document_number || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_declaration_detail_contact")}</span>
                  <span>{selected.email_owner || selected.telephone_owner || "—"}</span>
                </div>
                {selected.date_perte && (
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_declaration_detail_date_loss")}</span>
                    <span>{new Date(selected.date_perte).toLocaleDateString("fr-FR")}</span>
                  </div>
                )}
                {selected.lieu_perte && (
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_declaration_detail_location_loss")}</span>
                    <span>{selected.lieu_perte}</span>
                  </div>
                )}
                {selected.date_trouvee && (
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_declaration_detail_date_found")}</span>
                    <span>{new Date(selected.date_trouvee).toLocaleDateString("fr-FR")}</span>
                  </div>
                )}
                {selected.found_location && (
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_declaration_detail_location_found")}</span>
                    <span>{selected.found_location}</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_declaration_detail_city")}</span>
                  <span>{selected.ville || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_declaration_detail_region")}</span>
                  <span>{selected.region || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_declaration_detail_country")}</span>
                  <span>{selected.pays || "—"}</span>
                </div>
                {selected.urgence != null && (
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_declaration_detail_urgency")}</span>
                    <span className="font-semibold">{selected.urgence}/5</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_declaration_detail_reward")}</span>
                  <span className="font-semibold text-primary-dark">{selected.recompense_montant || selected.recompense || "—"}</span>
                </div>
              </div>

              {selected.description && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{t("admin_declaration_detail_description")}</span>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{selected.description}</p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button onClick={() => setSelected(null)} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-all">
                  {t("admin_declaration_detail_close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
