import { useI18n } from "../../context/I18nContext";
import { Link } from "react-router-dom";

type ProtectedDocumentImageProps = {
  src?: string | null;
  alt?: string;
  /** When true, the image is shown without blur or lock overlay. */
  revealed?: boolean;
  className?: string;
  imgClassName?: string;
  lockLabelKey?: string;
  lockHintKey?: string;
  loginUrl?: string;
};

function DocumentSilhouette({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Background card */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E8E0D4] via-[#F5F0EA] to-[#DDD5C8]" />

      {/* Card border */}
      <div className="absolute inset-[6%] border-2 border-[#C9BFAE]/60 rounded-xl" />

      {/* Photo placeholder circle */}
      <div className="absolute left-[10%] top-[18%] w-[22%] h-[38%] rounded-lg bg-[#C9BFAE]/50 border border-[#B8A998]" />

      {/* Chip */}
      <div className="absolute left-[38%] top-[20%] w-[8%] h-[6%] rounded bg-gradient-to-br from-[#D4B96A] to-[#C4A855] border border-[#B8974A]" />

      {/* Text lines */}
      <div className="absolute left-[38%] top-[30%] w-[42%] h-[4%] rounded bg-[#C9BFAE]/40" />
      <div className="absolute left-[38%] top-[38%] w-[35%] h-[4%] rounded bg-[#C9BFAE]/35" />
      <div className="absolute left-[38%] top-[46%] w-[48%] h-[4%] rounded bg-[#C9BFAE]/30" />

      {/* MRZ lines */}
      <div className="absolute left-[10%] bottom-[18%] w-[78%] h-[3%] rounded bg-[#C9BFAE]/35 font-mono text-[5px] tracking-[0.3em] text-[#B8A998]/60 flex items-center px-1 overflow-hidden">
        P&lt;CMRDOCMASTER&lt;&lt;DOE&lt;JOHN&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
      </div>
      <div className="absolute left-[10%] bottom-[13%] w-[78%] h-[3%] rounded bg-[#C9BFAE]/30 font-mono text-[5px] tracking-[0.3em] text-[#B8A998]/50 flex items-center px-1 overflow-hidden">
        D1234567890CMR8801014M1501012&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;00
      </div>

      {/* Subtle overlay texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)",
          backgroundSize: "4px 4px",
          backgroundPosition: "0 0, 2px 2px",
        }}
      />
    </div>
  );
}

export function ProtectedDocumentImage({
  src,
  alt = "",
  revealed = false,
  className = "relative w-full h-full overflow-hidden",
  imgClassName = "w-full h-full object-cover",
  lockLabelKey = "rechercher_photo_locked",
  lockHintKey = "rechercher_photo_locked_hint",
  loginUrl,
}: ProtectedDocumentImageProps) {
  const { t } = useI18n();

  if (!src) {
    return (
      <div className={`${className} bg-gradient-to-br from-gray-50 to-gray-100`}>
        <DocumentSilhouette />
        {!revealed && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/5 via-black/15 to-black/25">
            <div className="flex flex-col items-center gap-1.5 px-3 py-2.5 bg-white/92 backdrop-blur-sm rounded-xl shadow-md border border-white/80 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <i className="fa-solid fa-lock text-primary text-sm" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-textMain text-center leading-tight">
                {t(lockLabelKey)}
              </span>
              <span className="text-[9px] text-textMuted text-center leading-snug">
                {t(lockHintKey)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={src}
        alt={alt}
        className={`${imgClassName} transition-all duration-300 ${
          revealed ? "" : "blur-[10px] saturate-[0.85] brightness-[0.9] scale-110 select-none pointer-events-none"
        }`}
        draggable={false}
      />
      {!revealed && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/5 via-black/15 to-black/25">
          <div className="flex flex-col items-center gap-1.5 px-3 py-2.5 bg-white/92 backdrop-blur-sm rounded-xl shadow-md border border-white/80 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <i className="fa-solid fa-lock text-primary text-sm" />
            </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-textMain text-center leading-tight">
                {t(lockLabelKey)}
              </span>
              <span className="text-[9px] text-textMuted text-center leading-snug">
                {t(lockHintKey)}
              </span>
              {loginUrl && (
                <Link
                  to={loginUrl}
                  className="mt-1 inline-flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-full text-[9px] font-bold hover:bg-primary-dark transition-all shadow-sm"
                >
                  <i className="fa-solid fa-right-to-bracket text-[8px]" />
                  {t("nav_login")}
                </Link>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
