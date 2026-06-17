import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { useDocumentShare } from "../../hooks/useDocuments";

function getFullImageUrl(url?: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/";
  const backendRoot = API_BASE_URL.includes("http")
    ? API_BASE_URL.replace(/\/api\/?$/, "")
    : window.location.origin;
  return backendRoot + "/" + url.replace(/^\//, "");
}

export default function SharedDocument() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const { document: doc, loading, error } = useDocumentShare(token);
  const [showingVerso, setShowingVerso] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-bgMain flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-6">
          <img src="/assets/images/docmaster.png" alt="DocMaster" className="w-10 h-10 animate-pulse" />
        </div>
        <div className="bg-white rounded-[32px] border border-borderMain shadow-2xl p-12 text-center max-w-md w-full">
            <i className="fa-solid fa-circle-notch fa-spin text-4xl text-primary mb-4" />
            <p className="font-bold text-textMain">{t("shared_loading")}</p>
            <p className="text-textMuted text-xs mt-2 leading-relaxed">
              {t("shared_loading_desc")}
            </p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-bgMain flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-6">
          <img src="/assets/images/docmaster.png" alt="DocMaster" className="w-10 h-10" />
        </div>
        <div className="bg-white rounded-[32px] border border-borderMain shadow-2xl p-12 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-textMain">{t("shared_invalid_link")}</h2>
          <p className="text-textMuted text-sm mb-8 leading-relaxed">
            {error || t("shared_invalid_link_desc")}
          </p>
          <Link
            to="/"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1E3A2F] text-white rounded-2xl font-bold text-sm hover:bg-[#2D5A42] transition-all"
          >
            <i className="fa-solid fa-house text-xs" />
            {t("shared_back_home")}
          </Link>
        </div>
      </div>
    );
  }

  // Choose the picture to show
  const photoRecto = doc.photo_recto || doc.photo || doc.image_url || "";
  const photoVerso = doc.photo_verso || "";
  const activePhoto = showingVerso && photoVerso ? photoVerso : photoRecto;
  const hasVerso = !!photoVerso;

  return (
    <div className="bg-bgMain min-h-screen font-poppins text-textMain py-8 md:py-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-4 hover:scale-105 transition-transform">
            <img src="/assets/images/favicon.png" alt="DocMaster" className="w-10 h-10" />
          </div>
          <h1 className="font-bricolage text-3xl font-extrabold mb-2 tracking-tight">{t("shared_title")}</h1>
          <p className="text-textMuted text-sm leading-relaxed max-w-md">
            {t("shared_subtitle")}
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-[32px] border border-borderMain shadow-2xl shadow-black/5 overflow-hidden transition-all duration-300 hover:shadow-black/10">
          {/* Document Preview Area */}
          <div className="relative h-72 sm:h-96 bg-gradient-to-br from-slate-50 to-slate-100 border-b border-borderMain flex items-center justify-center overflow-hidden group cursor-pointer"
               onClick={() => activePhoto && setLightboxOpen(true)}>
            {activePhoto ? (
              <>
                <img
                  src={getFullImageUrl(activePhoto)}
                  className="w-full h-full object-contain p-4 sm:p-6 transition-transform duration-300 group-hover:scale-[1.03]"
                  alt="Document"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur rounded-xl px-4 py-2 shadow-lg flex items-center gap-2 text-sm font-bold text-textMain">
                    <i className="fa-solid fa-expand" />
                    Plein écran
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-textMuted/50">
                <i className="fa-solid fa-file-lines text-6xl" />
                <p className="text-[13px] font-semibold">Aucun aperçu disponible</p>
              </div>
            )}

            {/* Flip button */}
            {hasVerso && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowingVerso(!showingVerso); }}
                className="absolute bottom-4 right-4 px-4 py-2.5 rounded-full bg-black/60 backdrop-blur-md text-white font-bold text-[11px] flex items-center gap-2 hover:bg-primary hover:scale-105 transition-all shadow-lg active:scale-95"
              >
                <i className="fa-solid fa-arrows-rotate" />
                {showingVerso ? t("shared_see_recto") : t("shared_see_verso")}
              </button>
            )}
          </div>

          {/* Lightbox */}
          {lightboxOpen && activePhoto && (
            <div
              className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
              onClick={() => setLightboxOpen(false)}
            >
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl transition-all z-10"
              >
                <i className="fa-solid fa-xmark" />
              </button>
              {hasVerso && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowingVerso(!showingVerso); }}
                  className="absolute bottom-6 right-6 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-[13px] flex items-center gap-2 transition-all z-10 backdrop-blur"
                >
                  <i className="fa-solid fa-arrows-rotate" />
                  {showingVerso ? "Voir recto" : "Voir verso"}
                </button>
              )}
              <img
                src={getFullImageUrl(activePhoto)}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                alt="Document plein écran"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Details Area */}
          <div className="p-8 md:p-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                  {doc.type_doc ? t("shared_official_doc") : t("shared_registered_doc")}
                </span>
                <h2 className="font-bricolage text-2xl font-black text-textMain mt-1 capitalize">
                  {doc.type_doc || t("shared_other_doc")}
                </h2>
                <p className="text-textMuted text-sm mt-1">
                  {t("shared_owner")} :{" "}
                  <span className="text-textMain font-bold">
                    {doc.owner_name || doc.nom_sur_doc || t("shared_user")}
                  </span>
                </p>
              </div>
              <div className="px-4 py-1.5 bg-green-light text-green-mid border border-[#D5EADF] rounded-full text-[12px] font-bold flex items-center gap-2 self-start sm:self-center">
                <i className="fa-solid fa-shield-check" />
                {t("shared_verified")}
              </div>
            </div>

            {/* Info Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-surface2 rounded-2xl border border-borderMain hover:border-primary/20 transition-all">
                  <p className="text-[9.5px] font-bold text-textMuted uppercase tracking-widest mb-1">
                    {t("shared_doc_number")}
                  </p>
                  <p className="text-[15px] font-extrabold text-textMain font-mono">
                    {doc.numero_doc || t("shared_number_unavailable")}
                  </p>
              </div>
              <div className="p-4 bg-surface2 rounded-2xl border border-borderMain hover:border-primary/20 transition-all">
                  <p className="text-[9.5px] font-bold text-textMuted uppercase tracking-widest mb-1">
                    {t("shared_name_on_doc")}
                  </p>
                  <p className="text-[15px] font-extrabold text-textMain">
                    {doc.nom_sur_doc || t("shared_not_specified")}
                  </p>
              </div>
            </div>

            {/* Extra Metadata (if available) */}
            {(doc.date_delivrance || doc.date_expiration || doc.nom_autorite) && (
              <div className="border-t border-borderMain/60 pt-6 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {doc.date_delivrance && (
                  <div className="text-[13px]">
                    <span className="text-textMuted block">{t("shared_issued_on")} :</span>
                    <strong className="text-textMain">
                      {new Date(doc.date_delivrance).toLocaleDateString("fr-FR")}
                    </strong>
                  </div>
                )}
                {doc.date_expiration && (
                  <div className="text-[13px]">
                    <span className="text-textMuted block">{t("shared_expires_on")} :</span>
                    <strong className="text-textMain">
                      {new Date(doc.date_expiration).toLocaleDateString("fr-FR")}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* Shield Notice */}
            <div className="p-5 bg-[#FAF7F2] rounded-2xl border border-borderMain flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-borderMain flex items-center justify-center text-primary shadow-sm flex-shrink-0">
                <i className="fa-solid fa-lock text-base" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-textMain mb-1">
                  {t("shared_authenticity")}
                </p>
                <p className="text-[11.5px] text-textMuted leading-relaxed">
                  {t("shared_authenticity_desc")}
                </p>
              </div>
            </div>
          </div>

          {/* Call To Action Footer */}
          <div className="p-8 border-t border-borderMain bg-[#FAF7F2] text-center">
            <p className="text-[13px] text-textMuted mb-4 leading-relaxed">
              {t("shared_cta_text")}
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-bold text-[13.5px] shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all transform active:scale-95"
            >
              {t("shared_create_account")}
            </Link>
          </div>
        </div>

        <p className="text-center text-[12px] text-textMuted mt-8">
          {t("shared_copyright")}
        </p>
      </div>
    </div>
  );
}
