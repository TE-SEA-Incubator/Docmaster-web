import { type Key, type ReactNode } from "react";
import { Badge } from "@mantine/core";
import { useI18n } from "../../context/I18nContext";
import { ProtectedDocumentImage } from "../ui/ProtectedDocumentImage";

const ENV_API_URL = (import.meta as any).env?.VITE_API_URL as string | undefined;
const BACKEND_ROOT = ENV_API_URL
  ? ENV_API_URL.replace(/\/+$/, "").replace(/\/api$/, "")
  : window.location.origin;

/** Convertit un chemin serveur (uploads/documents/…) en URL complète. */
export function resolvePublicImageUrl(url?: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return `${BACKEND_ROOT}/${url.replace(/^\//, "")}`;
}

/** Un identifiant interne (UUID, ObjectId, entier) n'est jamais une référence publique. */
export function isIdLike(value: string): boolean {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
    /^[0-9a-f]{24}$/i.test(value) ||
    /^\d+$/.test(value)
  );
}

interface PublicDocumentCardProps {
  /** `key` est déclaré ici : les types React du projet n'acceptent pas `key` sur un composant. */
  key?: Key;
  docType: string;
  ownerName: string;
  photo?: string;
  reference?: string;
  score?: number;
  dateRelative: string;
  location: string;
  isAuthenticated: boolean;
  /** Ouvre le détail : rend la carte cliquable (souris + clavier). */
  onOpen?: () => void;
  actions: ReactNode;
}

/**
 * Carte « document trouvé » des écrans publics. Photo verrouillée par défaut,
 * badge de type, propriétaire masqué, référence et lieu puis actions.
 * Partagée entre la grille de résultats et la page détail d'un type.
 */
export default function PublicDocumentCard({
  docType,
  ownerName,
  photo,
  reference,
  score,
  dateRelative,
  location,
  isAuthenticated,
  onOpen,
  actions,
}: PublicDocumentCardProps) {
  const { t } = useI18n();
  const interactive = Boolean(onOpen);

  return (
    <article
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen?.();
              }
            }
          : undefined
      }
      className={
        "group bg-white border border-borderMain rounded-3xl overflow-hidden flex flex-col transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 " +
        (interactive ? "cursor-pointer" : "")
      }
    >
      <div className="relative h-44 bg-surface2 overflow-hidden">
        <ProtectedDocumentImage
          src={photo}
          revealed={false}
          className="relative w-full h-full overflow-hidden"
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loginUrl={isAuthenticated ? undefined : "/login"}
        />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/95 rounded-full text-[10px] font-bold uppercase border border-borderMain text-textMain">
            <i className="fa-solid fa-shield-halved text-primary text-[9px]" />
            {docType}
          </span>
          {score ? (
            <Badge color="orange" variant="light" radius="xl" size="sm">
              {score}% {t("rechercher_match")}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
            {t("rechercher_found_doc")}
          </span>
          <span className="text-[11px] font-semibold text-textMuted text-right">
            {dateRelative}
          </span>
        </div>

        <h3
          className="font-bricolage font-bold text-textMain text-[16px] truncate"
          title={ownerName}
        >
          {ownerName}
        </h3>

        {reference && (
          <p className="mt-2 text-[11px] text-textMuted flex items-center gap-1.5">
            <i className="fa-solid fa-hashtag text-[9px] text-textMuted" />
            <span className="font-mono truncate">{reference}</span>
          </p>
        )}

        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl border border-borderMain min-w-0">
          <i className="fa-solid fa-location-dot text-textMuted text-[11px]" />
          <span className="text-[11px] font-medium text-textMain truncate" title={location}>
            {location}
          </span>
        </div>

        <div className="mt-auto pt-5 flex flex-col sm:flex-row gap-2">{actions}</div>
      </div>
    </article>
  );
}
