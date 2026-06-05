import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";
import { useReferrals } from "../../hooks/useReferrals";
import Topbar from "../../layout/Topbar";

export default function Parrainage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { referrals: friends, stats, loading } = useReferrals();
  const [copied, setCopied] = useState(false);

  const code = user?.code_invitation || "DOC-MASTER";
  const refLink = `${window.location.origin}/rechercher?ref=${code}`;

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareVia = (platform) => {
    const text = t("parrainage_share_text").replace("{code}", code).replace("{link}", refLink);
    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    } else if (platform === "sms") {
      window.open(`sms:?&body=${encodeURIComponent(text)}`, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title={t("parrainage_title")} breadcrumbs={[{ label: t("parrainage_breadcrumb_home"), href: "/dashboard" }, { label: t("parrainage_breadcrumb_referral") }]} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-11 h-11 rounded-full border-4 border-borda border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  const totalGains = stats?.total_earnings || 0;
  const activeCount = stats?.active_count || 0;
  const slotsBonus = stats?.slots_bonus || 0;
  const nextPayout = stats?.next_payout || 5000;
  const progress = Math.min((totalGains / nextPayout) * 100, 100);

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("parrainage_title")}
        breadcrumbs={[
          { label: t("parrainage_breadcrumb_home"), href: "/dashboard" },
          { label: t("parrainage_breadcrumb_referral") },
        ]}
      />
      <div className="custom-scroll p-4 md:p-6 flex flex-col gap-6 pb-24 md:pb-6 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full">

        <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
          <div>
            <p className="text-[13px] text-textMuted font-medium italic">{t("parrainage_subtitle")}</p>
          </div>
          <div className="text-[12px] text-textMuted font-medium bg-white border border-borda px-3 py-1.5 rounded-[9px] flex items-center gap-2 whitespace-nowrap">
            <i className="fa-regular fa-calendar text-primary" />
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

      <div className="relative bg-green-dark rounded-[20px] sm:rounded-[24px] overflow-hidden p-6 sm:p-8 mb-5">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-64 h-64 rounded-full bg-primary/[0.08] -top-16 -right-16" />
          <div className="absolute w-40 h-40 rounded-full bg-primary/[0.05] bottom-0 left-8" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/25 rounded-full px-3 py-1 mb-3">
              <i className="fa-solid fa-gift text-primary text-[10px]" />
              <span className="text-[11px] font-bold text-primary uppercase tracking-wide">{t("parrainage_program")}</span>
            </div>
            <h1 className="font-bricolage text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-2">
              {t("parrainage_headline")}
              <i className="fa-solid fa-sparkles text-primary text-xl align-middle ml-1" aria-hidden="true" />
            </h1>
            <p className="text-white/80 text-[14px] leading-relaxed max-w-[560px]">{t("parrainage_description")}</p>
          </div>
          <div className="bg-white/[0.08] border border-white/10 rounded-[18px] p-5 flex-shrink-0 text-center min-w-[160px]">
            <div className="text-[42px] font-bricolage font-extrabold text-primary leading-none">{activeCount}</div>
            <div className="text-white/60 text-[12px] font-medium mt-1">{t("parrainage_active_godchildren")}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <div className="sm:col-span-2 lg:col-span-1 bg-white border border-borda rounded-[18px] p-5">
          <p className="text-[11px] font-bold text-textMuted uppercase tracking-widest mb-3">{t("parrainage_my_code")}</p>
          <div className="flex items-center gap-2 bg-bgMain border border-borda rounded-[12px] px-4 py-3 mb-3">
            <span className="font-bricolage text-2xl font-extrabold text-textMain tracking-widest flex-1">{code}</span>
            <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-[12px] font-bold rounded-[8px] transition-all hover:bg-primary-dark">
              <i className={`${copied ? "fa-solid fa-check" : "fa-regular fa-copy"} text-[11px]`} /> {copied ? t("parrainage_copied") : t("parrainage_copy")}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => shareVia("whatsapp")} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#25D366]/10 border border-[#25D366]/20 text-[#1a9e4e] text-[12.5px] font-bold rounded-[10px] hover:bg-[#25D366]/20 transition-colors">
              <i className="fa-brands fa-whatsapp text-base" /> WhatsApp
            </button>
            <button onClick={() => shareVia("sms")} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 border border-blue-100 text-blue-700 text-[12.5px] font-bold rounded-[10px] hover:bg-blue-100 transition-colors">
              <i className="fa-solid fa-message text-base" /> SMS
            </button>
            <button onClick={copyCode} className="flex items-center justify-center w-10 py-2.5 bg-surface2 border border-borda text-textMuted rounded-[10px] hover:border-primary hover:text-primary transition-colors">
              <i className="fa-solid fa-link text-[12px]" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-borda rounded-[18px] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-[11px] bg-primary/10 flex items-center justify-center">
              <i className="fa-solid fa-wallet text-primary text-base" />
            </div>
            <span className="text-[10px] font-bold py-1 px-2.5 rounded-full bg-green-light text-green-mid">{t("parrainage_this_month")}</span>
          </div>
          <div>
            <div className="font-bricolage text-3xl font-extrabold text-textMain">
              {totalGains.toLocaleString("fr-FR")} <span className="text-lg font-bold text-textMuted">XAF</span>
            </div>
            <div className="text-[12.5px] text-textMuted font-medium">{t("parrainage_earnings_total")}</div>
          </div>
          <div className="h-1.5 bg-bgMain rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-[11.5px] text-textMuted">{t("parrainage_next_milestone")} <span className="font-bold text-textMain">{nextPayout.toLocaleString("fr-FR")} XAF</span></div>
        </div>

        <div className="bg-white border border-borda rounded-[18px] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-[11px] bg-green-light flex items-center justify-center">
              <i className="fa-solid fa-file-circle-plus text-green-mid text-base" />
            </div>
            <span className="text-[10px] font-bold py-1 px-2.5 rounded-full bg-primary/10 text-primary-dark">{t("parrainage_bonus_active")}</span>
          </div>
          <div>
            <div className="font-bricolage text-3xl font-extrabold text-textMain">+{slotsBonus} <span className="text-lg font-bold text-textMuted">slots</span></div>
            <div className="text-[12.5px] text-textMuted font-medium">{t("parrainage_bonus_reports")}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <i className="fa-solid fa-circle-info text-textMuted text-[11px]" />
            <span className="text-[11.5px] text-textMuted">{t("parrainage_slots_per_referral")}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-borda rounded-[20px] p-5 sm:p-6">
        <h2 className="font-bricolage text-lg font-bold text-textMain mb-5 flex items-center gap-2">
          <i className="fa-solid fa-circle-question text-primary text-base" /> {t("parrainage_how_it_works")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: "1", icon: "fa-solid fa-link", titleKey: "parrainage_step1_title", descKey: "parrainage_step1_desc" },
            { step: "2", icon: "fa-solid fa-user-plus", titleKey: "parrainage_step2_title", descKey: "parrainage_step2_desc" },
            { step: "3", icon: "fa-solid fa-coins", titleKey: "parrainage_step3_title", descKey: "parrainage_step3_desc" },
          ].map((item) => (
            <div key={item.step} className="flex sm:flex-col items-start sm:items-center gap-4 sm:gap-3 sm:text-center">
              <div className="w-12 h-12 rounded-[14px] bg-primary/10 flex items-center justify-center text-primary text-xl flex-shrink-0">
                <i className={item.icon} />
              </div>
              <div>
                <p className="text-[14px] font-bold text-textMain">{t(item.titleKey)}</p>
                <p className="text-[12px] text-textMuted mt-0.5">{t(item.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {friends.length > 0 && (
        <div className="bg-white border border-borda rounded-[20px] p-5 sm:p-6 mt-5">
          <h2 className="font-bricolage text-lg font-bold text-textMain mb-4">{t("parrainage_my_godchildren")} ({friends.length})</h2>
          <div className="space-y-2">
            {friends.map((f) => (
              <div key={f.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-bgMain transition-colors">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                  {(f.prenom?.[0] || "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-textMain truncate">{f.prenom} {f.nom}</p>
                  <p className="text-[10px] text-textMuted truncate">{f.email}</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${f.is_active ? "bg-green-light text-green-mid" : "bg-slate-100 text-slate-400"}`}>
                  {f.is_active ? t("parrainage_active") : t("parrainage_pending")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
