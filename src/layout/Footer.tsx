import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { useGlobalStats } from "../hooks/useGlobalStats";

export default function Footer() {
  const { t } = useI18n();
  const stats = useGlobalStats();

  return (
    <footer className="bg-green-dark text-white relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-5 pt-16 pb-28 md:pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 border-b border-white/10 pb-10 mb-10">
          <div className="lg:col-span-2">
            <img src="/src/assets/images/docmaster.png" alt="DocMaster" className="h-10 w-auto mb-5 brightness-0 invert" />
            <p className="text-white/50 text-[13px] leading-relaxed mb-6 max-w-xs">
              {t("footer_desc")}
            </p>
            {!!stats && (
              <div className="flex gap-3 mb-6">
                <div className="text-center">
                  <div className="font-bricolage text-2xl font-black text-primary">{stats.declared.toLocaleString("fr-FR")}</div>
                  <div className="text-[10px] text-white/40 font-bold uppercase">{t("stat_declared")}</div>
                </div>
                <div className="w-px bg-white/10 mx-2" />
                <div className="text-center">
                  <div className="font-bricolage text-2xl font-black text-primary">{stats.recovered.toLocaleString("fr-FR")}</div>
                  <div className="text-[10px] text-white/40 font-bold uppercase">{t("stat_recovered_label")}</div>
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-primary font-bold mb-5 text-[13px] uppercase tracking-wider">{t("footer_nav_title")}</h3>
            <ul className="space-y-3">
              <li><Link to="/" className="text-white/60 hover:text-white text-sm transition flex items-center gap-2"><i className="ph ph-house w-4 text-xs" /> {t("nav_home")}</Link></li>
              <li><Link to="/rechercher" className="text-white/60 hover:text-white text-sm transition flex items-center gap-2"><i className="ph ph-magnifying-glass w-4 text-xs" /> {t("nav_search")}</Link></li>
              <li><Link to="/login" className="text-white/60 hover:text-white text-sm transition flex items-center gap-2"><i className="ph ph-file-text w-4 text-xs" /> {t("nav_declare")}</Link></li>
              <li><Link to="/abonnement" className="text-white/60 hover:text-white text-sm transition flex items-center gap-2"><i className="ph ph-crown w-4 text-xs" /> {t("footer_nav_subscriptions")}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-primary font-bold mb-5 text-[13px] uppercase tracking-wider">{t("footer_services_title")}</h3>
            <ul className="space-y-3">
              <li><span className="text-white/60 text-sm flex items-center gap-2"><i className="ph ph-identification-card w-4 text-xs" /> {t("footer_service_id_cards")}</span></li>
              <li><span className="text-white/60 text-sm flex items-center gap-2"><i className="ph ph-book-open w-4 text-xs" /> {t("footer_service_passports")}</span></li>
              <li><span className="text-white/60 text-sm flex items-center gap-2"><i className="ph ph-graduation-cap w-4 text-xs" /> {t("footer_service_diplomas")}</span></li>
              <li><span className="text-white/60 text-sm flex items-center gap-2"><i className="ph ph-key w-4 text-xs" /> {t("footer_service_drivers_licenses")}</span></li>
            </ul>
          </div>

          <div>
            <h3 className="text-primary font-bold mb-5 text-[13px] uppercase tracking-wider">{t("footer_connect_title")}</h3>
            <div className="flex gap-2 mb-6">
              <span className="w-9 h-9 bg-white/10 border border-white/10 flex items-center justify-center rounded-xl hover:bg-primary hover:border-primary transition-all text-white text-sm cursor-pointer">
                <i className="ph ph-facebook-logo" />
              </span>
              <span className="w-9 h-9 bg-white/10 border border-white/10 flex items-center justify-center rounded-xl hover:bg-primary hover:border-primary transition-all text-white text-sm cursor-pointer">
                <i className="ph ph-twitter-logo" />
              </span>
              <span className="w-9 h-9 bg-white/10 border border-white/10 flex items-center justify-center rounded-xl hover:bg-primary hover:border-primary transition-all text-white text-sm cursor-pointer">
                <i className="ph ph-instagram-logo" />
              </span>
              <span className="w-9 h-9 bg-white/10 border border-white/10 flex items-center justify-center rounded-xl hover:bg-primary hover:border-primary transition-all text-white text-sm cursor-pointer">
                <i className="ph ph-whatsapp-logo" />
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[12px] text-white/40">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <span className="flex items-center gap-2"><i className="ph ph-phone text-primary text-xs" /> +237 672 518 313</span>
            <span className="flex items-center gap-2"><i className="ph ph-envelope text-primary text-xs" /> contact@docmaster.cm</span>
            <span className="flex items-center gap-2"><i className="ph ph-map-pin text-primary text-xs" /> Yaoundé, Cameroun</span>
          </div>
          <p>© 2026 DocMaster. {t("footer_rights")}</p>
        </div>
      </div>
    </footer>
  );
}
