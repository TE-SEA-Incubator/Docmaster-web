import type { JSX } from "react";

type MascotVariant =
  | "welcome"
  | "birthday"
  | "contact"
  | "security"
  | "verify"
  | "launch";

interface DocMascotProps {
  variant?: MascotVariant;
  className?: string;
}

/**
 * Doc — the Docmaster mascot.
 * A friendly rounded "document" character (folded corner, dot eyes,
 * simple smile) that changes its pose/props per registration step.
 *
 * Palette pulled from ImmersiveRegister.module.css:
 *   green  #2D5A42  (outline / dark accents)
 *   orange #E8923A  (folded corner / accessories)
 *   cream  #FAF8F5  (body)
 */
export default function DocMascot({ variant = "welcome", className }: DocMascotProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 160 160"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Doc mascot – ${variant}`}
    >
      {/* ── shared soft shadow ── */}
      <ellipse cx="80" cy="145" rx="30" ry="7" fill="#2D5A42" opacity="0.12" />

      {/* ── extras that render BEHIND the body ── */}
      {variant === "security" && (
        <path
          d="M80 30 L108 40 V70 C108 92 96 106 80 112 C64 106 52 92 52 70 V40 Z"
          fill="#E8923A"
          opacity="0.9"
        />
      )}
      {variant === "launch" && (
        <g>
          <path d="M80 138 L70 118 H90 Z" fill="#E8923A" opacity="0.85" />
          <path d="M80 148 L74 130 H86 Z" fill="#E8923A" opacity="0.9" />
          <circle cx="34" cy="34" r="3" fill="#E8923A" />
          <circle cx="126" cy="46" r="2.5" fill="#E8923A" />
          <circle cx="118" cy="20" r="2" fill="#2D5A42" opacity="0.4" />
          <circle cx="26" cy="70" r="2" fill="#2D5A42" opacity="0.4" />
        </g>
      )}
      {variant === "birthday" && (
        <g>
          <circle cx="30" cy="40" r="3" fill="#E8923A" />
          <circle cx="128" cy="36" r="2.5" fill="#2D5A42" opacity="0.5" />
          <circle cx="120" cy="100" r="3" fill="#E8923A" />
          <circle cx="24" cy="96" r="2" fill="#2D5A42" opacity="0.4" />
          <rect x="118" y="18" width="5" height="5" rx="1" fill="#E8923A" transform="rotate(20 120 20)" />
          <rect x="22" y="60" width="5" height="5" rx="1" fill="#2D5A42" opacity="0.4" transform="rotate(-15 24 62)" />
        </g>
      )}

      {/* ── body: rounded document with a folded corner ── */}
      <path
        d="M42 34 H100 L118 52 V128 C118 133.5 113.5 138 108 138 H42
           C36.5 138 32 133.5 32 128 V44 C32 38.5 36.5 34 42 34 Z"
        fill="#FAF8F5"
        stroke="#2D5A42"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* folded corner */}
      <path d="M100 34 L118 52 H104 C101.8 52 100 50.2 100 48 Z" fill="#E8923A" stroke="#2D5A42" strokeWidth="3" strokeLinejoin="round" />
      {/* two little "text lines" on the body for doc texture */}
      <line x1="46" y1="112" x2="70" y2="112" stroke="#2D5A42" strokeWidth="3" strokeLinecap="round" opacity="0.15" />
      <line x1="46" y1="120" x2="80" y2="120" stroke="#2D5A42" strokeWidth="3" strokeLinecap="round" opacity="0.15" />

      {/* ── arms ── */}
      {variant === "welcome" && (
        <path d="M100 92 C112 84 120 70 118 58" fill="none" stroke="#2D5A42" strokeWidth="6" strokeLinecap="round" />
      )}
      {variant === "birthday" && (
        <>
          <path d="M40 96 C30 90 24 80 24 70" fill="none" stroke="#2D5A42" strokeWidth="6" strokeLinecap="round" />
          <path d="M100 96 C110 90 116 80 116 70" fill="none" stroke="#2D5A42" strokeWidth="6" strokeLinecap="round" />
        </>
      )}
      {variant === "contact" && (
        <>
          <path d="M100 100 C112 98 120 90 122 80" fill="none" stroke="#2D5A42" strokeWidth="6" strokeLinecap="round" />
          <path d="M40 108 C34 104 32 98 34 92" fill="none" stroke="#2D5A42" strokeWidth="6" strokeLinecap="round" />
        </>
      )}
      {variant === "security" && (
        <path d="M96 100 C100 92 100 82 96 74" fill="none" stroke="#2D5A42" strokeWidth="6" strokeLinecap="round" />
      )}
      {variant === "verify" && (
        <path d="M98 98 C110 96 118 88 120 78" fill="none" stroke="#2D5A42" strokeWidth="6" strokeLinecap="round" />
      )}
      {variant === "launch" && (
        <>
          <path d="M40 96 C28 88 22 76 24 64" fill="none" stroke="#2D5A42" strokeWidth="6" strokeLinecap="round" />
          <path d="M100 96 C112 88 118 76 116 64" fill="none" stroke="#2D5A42" strokeWidth="6" strokeLinecap="round" />
        </>
      )}

      {/* ── feet ── */}
      <ellipse cx="58" cy="140" rx="10" ry="5" fill="#2D5A42" />
      <ellipse cx="94" cy="140" rx="10" ry="5" fill="#2D5A42" />

      {/* ── face ── */}
      {variant === "birthday" ? (
        <>
          <path d="M56 78 Q62 72 68 78" fill="none" stroke="#2D5A42" strokeWidth="4" strokeLinecap="round" />
          <path d="M84 78 Q90 72 96 78" fill="none" stroke="#2D5A42" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : variant === "security" ? (
        <>
          <circle cx="62" cy="80" r="5" fill="#2D5A42" />
          <circle cx="90" cy="80" r="5" fill="#2D5A42" />
          <line x1="55" y1="72" x2="67" y2="74" stroke="#2D5A42" strokeWidth="3" strokeLinecap="round" />
          <line x1="97" y1="72" x2="85" y2="74" stroke="#2D5A42" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="62" cy="80" r="5.5" fill="#2D5A42" />
          <circle cx="90" cy="80" r="5.5" fill="#2D5A42" />
          <circle cx="62" cy="78" r="1.6" fill="#FAF8F5" />
          <circle cx="90" cy="78" r="1.6" fill="#FAF8F5" />
        </>
      )}

      {/* blush */}
      <ellipse cx="54" cy="92" rx="6" ry="3.5" fill="#E8923A" opacity="0.45" />
      <ellipse cx="98" cy="92" rx="6" ry="3.5" fill="#E8923A" opacity="0.45" />

      {/* mouth */}
      {variant === "security" ? (
        <line x1="68" y1="98" x2="84" y2="98" stroke="#2D5A42" strokeWidth="4" strokeLinecap="round" />
      ) : (
        <path d="M66 94 Q76 104 86 94" fill="none" stroke="#2D5A42" strokeWidth="4" strokeLinecap="round" />
      )}

      {/* ── extras that render IN FRONT of the body ── */}
      {variant === "welcome" && (
        <g>
          <path d="M122 44 l4 -4 M126 52 h6 M120 58 l4 4" stroke="#E8923A" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {variant === "birthday" && (
        <g>
          {/* party hat */}
          <path d="M80 20 L64 46 H96 Z" fill="#E8923A" stroke="#2D5A42" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="80" cy="18" r="5" fill="#FAF8F5" stroke="#2D5A42" strokeWidth="3" />
          <circle cx="72" cy="36" r="2.5" fill="#FAF8F5" />
          <circle cx="86" cy="30" r="2.5" fill="#FAF8F5" />
        </g>
      )}

      {variant === "contact" && (
        <g>
          {/* envelope held out front */}
          <rect x="104" y="66" width="30" height="21" rx="3" fill="#FAF8F5" stroke="#2D5A42" strokeWidth="3" />
          <path d="M104 68 L119 79 L134 68" fill="none" stroke="#2D5A42" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {variant === "security" && (
        <g>
          {/* small lock centered on the shield */}
          <rect x="72" y="52" width="16" height="13" rx="2.5" fill="#FAF8F5" stroke="#2D5A42" strokeWidth="3" />
          <path d="M75 52 v-5 a5 5 0 0 1 10 0 v5" fill="none" stroke="#2D5A42" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {variant === "verify" && (
        <g>
          {/* magnifying glass */}
          <circle cx="126" cy="72" r="10" fill="#FAF8F5" stroke="#2D5A42" strokeWidth="4" />
          <line x1="133" y1="79" x2="141" y2="87" stroke="#2D5A42" strokeWidth="4" strokeLinecap="round" />
          <path d="M121 72 l3.5 3.5 L131 68" fill="none" stroke="#E8923A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {variant === "launch" && (
        <g>
          {/* little rocket overhead */}
          <g transform="translate(80 16) rotate(0)">
            <path d="M0 -14 C6 -8 6 2 0 8 C-6 2 -6 -8 0 -14 Z" fill="#FAF8F5" stroke="#2D5A42" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="0" cy="-4" r="2.6" fill="#E8923A" />
            <path d="M-4 4 L-8 12 M4 4 L8 12" stroke="#2D5A42" strokeWidth="3" strokeLinecap="round" />
          </g>
        </g>
      )}
    </svg>
  );
}