import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { promoService, type PromoPlan } from "../../services/promoService";

interface PromoBarProps {
  onVisibilityChange?: (visible: boolean) => void;
}

export default function PromoBar({ onVisibilityChange }: PromoBarProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [promo, setPromo] = useState<PromoPlan | null>(null);

  useEffect(() => {
    promoService.getPublicPromo().then((res) => {
      if (res.success && res.data) {
        setPromo(res.data);
        onVisibilityChange?.(true);
      }
    }).catch(() => {});
  }, []);

  if (!promo) return null;

  const originalPrice = promo.original_price ?? 0;
  const discountPct = originalPrice > 0 ? Math.round((1 - promo.price / originalPrice) * 100) : 0;

  return (
    <div
      style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 99998 }}
      className="bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer group shadow-sm"
      onClick={() => navigate("/abonnement")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-11 flex items-center justify-between gap-3 text-white font-sans">
        {/* Gauche : badge + message promo */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center gap-1 bg-white/20 text-white rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide flex-shrink-0">
            <i className="fa-solid fa-tag text-[9px]" />
            -{discountPct}%
          </span>
          <span className="text-white text-xs sm:text-sm font-normal truncate">
            {t("promo_bar_limited")} · VIP {promo.duration_months} {t("promo_bar_months")}
          </span>
        </div>

        {/* Centre : prix */}
        <span className="hidden md:inline-flex items-center gap-1.5 text-blue-100 text-xs sm:text-sm font-normal flex-shrink-0">
          <i className="fa-solid fa-circle-check text-blue-200 text-xs" />
          {promo.price.toLocaleString("fr-FR")} XAF
        </span>

        {/* Droite : CTA */}
        <span className="inline-flex items-center gap-1.5 text-white text-xs sm:text-sm font-medium flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
          {t("promo_bar_cta")}
          <i className="fa-solid fa-arrow-right text-[10px]" />
        </span>
      </div>
    </div>
  );
}
