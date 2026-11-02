import { type Key } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@mantine/core";
import { useI18n } from "../../context/I18nContext";
import { oldestCityOf, type DocTypeCard } from "../../utils/docTypeStats";

/** Icône colorée selon la catégorie, sans fond (règle du design system). */
function iconColor(categorie?: string | null): string {
  const cat = (categorie || "").toUpperCase();
  if (cat === "IDENTITE" || cat === "ETAT_CIVIL") return "text-primary";
  if (cat === "TRANSPORT") return "text-green-dark";
  return "text-green-mid";
}

interface DocTypeStatCardProps {
  /** `key` est déclaré ici : les types React du projet n'acceptent pas `key` sur un composant. */
  key?: Key;
  card: DocTypeCard;
  periodKey: string;
  to: string;
}

/**
 * Carte « type de document » des écrans publics : visuel, trend, nom, compteur de la
 * période, badges perdu / trouvé et la ville la plus ancienne concernée.
 * Partagée entre la grille de recherche publique et le tableau de bord.
 */
export default function DocTypeStatCard({ card, periodKey, to }: DocTypeStatCardProps) {
  const { t } = useI18n();
  const { stats } = card;
  const trend = Math.round(stats.trend);
  const oldestFound = oldestCityOf(stats, "FOUND");

  return (
    <Link
      to={to}
      className="group bg-white border border-borderMain rounded-2xl overflow-hidden flex flex-col transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="relative h-28 bg-surface2 overflow-hidden flex items-center justify-center">
        {card.hasImage ? (
          <img
            src={card.image}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <i className={`${card.icon} text-2xl text-textMuted`} />
        )}
        {trend > 0 && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 bg-white/95 border border-borderMain rounded-full text-[10px] font-bold text-green-dark">
            <i className="ph ph-trend-up text-[9px]" />
            {trend}%
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start gap-2.5 min-w-0">
          <i className={`${card.icon} mt-0.5 text-base shrink-0 ${iconColor(card.categorie)}`} />
          <p
            className="text-[15px] font-bold text-textMain leading-snug"
            title={card.name}
          >
            {card.name}
          </p>
        </div>

        <div className="flex items-baseline gap-1.5 mt-2.5">
          <span className="text-[26px] font-bold text-textMain leading-none tracking-tight">
            {stats.found}
          </span>
          <span className="text-[12px] font-medium italic text-textMuted">
            {t(periodKey)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge color="green" variant="light" radius="xl" size="sm" leftSection={<i className="ph ph-arrow-up text-[9px]" />}>
            {stats.found} {t("dashboard_perf_found")}
          </Badge>
        </div>

        <p className="mt-auto pt-3 text-[12px] font-medium text-textMuted flex items-center gap-1.5">
          <i className="ph ph-clock-counter-clockwise text-[10px] shrink-0" />
          {oldestFound ? (
            <span className="truncate" title={`${t("doc_type_card_oldest_found")} ${oldestFound}`}>
              {t("doc_type_card_oldest_found")} {oldestFound}
            </span>
          ) : (
            <span className="truncate" title={t("rechercher_type_empty")}>
              {t("rechercher_type_empty")}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
