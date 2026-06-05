import { Link } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";

export default function Confidentialite() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen pt-[88px] px-4 pb-12">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-[12px] text-textMuted hover:text-primary font-semibold transition-colors inline-flex items-center gap-1 mb-4">
          <i className="fa-solid fa-arrow-left text-[10px]" /> {t("confidentialite_back_home")}
        </Link>

        <div className="bg-white rounded-[20px] p-6 sm:p-8 border border-borda shadow-sm">
          <h1 className="font-bricolage text-2xl font-black text-textMain mb-6">{t("confidentialite_title")}</h1>

          <div className="space-y-6">
            <section>
              <h2 className="font-bricolage text-lg font-bold text-textMain mb-2">{t("confidentialite_section1_title")}</h2>
              <p className="text-[13px] text-textMuted leading-relaxed">
                {t("confidentialite_section1_text")}
              </p>
            </section>

            <section>
              <h2 className="font-bricolage text-lg font-bold text-textMain mb-2">{t("confidentialite_section2_title")}</h2>
              <p className="text-[13px] text-textMuted leading-relaxed">
                {t("confidentialite_section2_text")}
              </p>
            </section>

            <section>
              <h2 className="font-bricolage text-lg font-bold text-textMain mb-2">{t("confidentialite_section3_title")}</h2>
              <p className="text-[13px] text-textMuted leading-relaxed">
                {t("confidentialite_section3_text")}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
