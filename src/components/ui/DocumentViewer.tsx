import { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext";

interface DocumentViewerProps {
  recto?: string | null;
  verso?: string | null;
  title?: string;
}

type Side = "recto" | "verso";

function resolveMediaUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return `${window.location.origin}/${url.replace(/^\//, "")}`;
}

export default function DocumentViewer({ recto, verso, title }: DocumentViewerProps) {
  const { t } = useI18n();
  const [side, setSide] = useState<Side>("recto");
  const [zoomed, setZoomed] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const hasVerso = !!verso;
  const sources: Record<Side, string> = { recto: resolveMediaUrl(recto), verso: resolveMediaUrl(verso) };

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (side === "verso" && !hasVerso) setSide("recto");
  }, [hasVerso, side]);

  const flipTo = (next: Side) => {
    if (next === side) return;
    setSide(next);
    setZoomed(false);
    setRotation(0);
  };

  const faces: { key: Side; url: string; label: string }[] = [
    { key: "recto", url: sources.recto, label: t("detail_recto") },
    ...(hasVerso ? [{ key: "verso" as Side, url: sources.verso, label: t("detail_verso") }] : []),
  ];

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: "#2D5A42" }}>
      <div className="relative flex-1 min-h-0" style={{ perspective: "1600px" }}>
        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateY(${side === "verso" ? 180 : 0}deg)`,
            transition: reduceMotion ? "none" : "transform 600ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {faces.map((face, index) => (
            <div
              key={face.key}
              className="absolute inset-0 flex items-center justify-center p-4 md:p-8"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: index === 1 ? "rotateY(180deg)" : undefined,
              }}
            >
              {face.url ? (
                <div
                  onClick={() => setZoomed((value) => !value)}
                  className="relative max-w-full max-h-full"
                  style={{
                    transform: `scale(${zoomed ? 1.2 : 1}) rotate(${rotation}deg)`,
                    transition: reduceMotion ? "none" : "transform 250ms ease-out",
                    cursor: zoomed ? "zoom-out" : "zoom-in",
                  }}
                >
                  <img
                    src={face.url}
                    alt={title ? `${title} — ${face.label}` : face.label}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-white/60">
                  <i className="ph ph-image text-4xl md:text-5xl" />
                  <p className="text-xs md:text-sm font-medium">
                    {face.key === "recto" ? t("detail_no_image_recto") : t("detail_no_image_verso")}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {hasVerso && (
          <div className="absolute top-4 left-4 flex gap-2" role="group" aria-label={t("viewer_side_group_label")}>
            {(["recto", "verso"] as Side[]).map((option) => (
              <button
                key={option}
                onClick={() => flipTo(option)}
                aria-pressed={side === option}
                className={`inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                  side === option
                    ? "bg-primary text-white"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <i className={`${option === "recto" ? "ph ph-rectangle" : "ph ph-rectangle"}`} />
                {t(option === "recto" ? "detail_recto" : "detail_verso")}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center gap-3 px-4 pb-4">
        <button
          onClick={() => setRotation((value) => (value + 90) % 360)}
          disabled={!sources[side]}
          aria-label={t("viewer_rotate")}
          className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
        >
          <i className="ph ph-arrow-clockwise text-sm" />
        </button>
        <span className="text-xs font-medium text-white/70">
          {zoomed ? t("detail_dezoom") : t("detail_zoom")}
        </span>
      </div>
    </div>
  );
}
