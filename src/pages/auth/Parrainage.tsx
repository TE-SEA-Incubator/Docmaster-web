import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";
import { useReferrals } from "../../hooks/useReferrals";
import type { Referral } from "../../types/api";
import Topbar from "../../layout/Topbar";

interface Friend {
  id: string;
  name: string;
  initials: string;
  color: string;
  joined: string;
  active: boolean;
  reward: number;
  slots: number;
}

const COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-green-100 text-green-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-pink-100 text-pink-700",
];

function getInitials(prenom?: string, nom?: string): string {
  const full = `${prenom || ""} ${nom || ""}`.trim();
  if (!full) return "??";
  return full.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

function relativeDate(d: string): string {
  const diff = Math.floor((Date.now() - new Date(d)) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  if (diff < 7) return `Il y a ${diff} jours`;
  if (diff < 30) return `Il y a ${Math.floor(diff / 7)} sem.`;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function Parrainage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { referrals: rawReferrals, stats, loading } = useReferrals();
  const [copied, setCopied] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "recent">("all");
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const dragStartY = useRef(0);

  const code = user?.code_invitation || "DOC-MASTER";
  const refLink = `${window.location.origin}/login?ref=${code}`;

  const friends: Friend[] = (rawReferrals || []).map((r: Referral, i: number) => ({
    id: r.id || String(i),
    name: `${r.prenom || ""} ${r.nom || ""}`.trim() || "Utilisateur",
    initials: getInitials(r.prenom, r.nom) || "??",
    color: COLORS[i % COLORS.length],
    joined: r.filleul_created_at || r.created_at || new Date().toISOString(),
    active: r.status === "VALIDATED" || r.recompense_attribuee === true,
    reward: r.points_gagnes || 0,
    slots: r.points_gagnes ? 2 : 0,
  }));

  const totalGains = friends.reduce((s, f) => s + f.reward, 0);
  const activeCount = friends.filter((f) => f.active).length;
  const totalSlots = friends.reduce((s, f) => s + f.slots, 0);
  const totalFriends = friends.length;
  const progressPct = Math.min((totalFriends / 10) * 100, 100);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2200);
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(refLink).then(() => {
      setCopied(true);
      showToast("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareVia = (platform: string) => {
    const msg = `Rejoins DocMaster avec mon code *${code}* et reçois 1 mois offert + 3 analyses gratuites ! ${refLink}`;
    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    } else if (platform === "sms") {
      window.open(`sms:?body=${encodeURIComponent(msg)}`);
    } else {
      copyLink();
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(refLink).then(() => showToast("Lien copié !"));
  };

  const getFiltered = useCallback(() => {
    let list = [...friends];
    if (filter === "active") list = list.filter((f) => f.active);
    else if (filter === "inactive") list = list.filter((f) => !f.active);
    else if (filter === "recent") list = list.sort((a, b) => new Date(b.joined).getTime() - new Date(a.joined).getTime()).slice(0, 3);
    if (search) list = list.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [friends, filter, search]);

  const openPanel = () => setPanelOpen(true);
  const closePanel = () => {
    setPanelOpen(false);
    setDragY(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 900) return;
    dragStartY.current = e.touches[0].clientY;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging || window.innerWidth >= 900) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) setDragY(dy);
  };

  const handleTouchEnd = () => {
    if (window.innerWidth >= 900) return;
    if (dragY > 120) closePanel();
    setDragging(false);
    setDragY(0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePanel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = panelOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [panelOpen]);

  const latestFriend = friends.length > 0
    ? [...friends].sort((a, b) => new Date(b.joined).getTime() - new Date(a.joined).getTime())[0]
    : null;

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("parrainage_title")}
        breadcrumbs={[
          { label: t("parrainage_breadcrumb_home"), href: "/dashboard" },
          { label: t("parrainage_breadcrumb_referral") },
        ]}
      />
      <div className="custom-scroll p-4 md:p-6 flex flex-col gap-5 pb-24 md:pb-6 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-5">

          {/* Greeting */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-bricolage text-xl sm:text-2xl font-extrabold text-textMain tracking-tight leading-tight">
                {t("parrainage_title")}
              </h1>
              <p className="text-[12.5px] sm:text-[13.5px] text-textMuted font-medium mt-0.5 italic">
                {t("parrainage_subtitle")}
              </p>
            </div>
            <div className="text-[11.5px] text-textMuted font-medium bg-white border border-borda px-3 py-1.5 rounded-[9px] flex items-center gap-2 whitespace-nowrap">
              <i className="fa-regular fa-calendar text-primary" />
              <span>{today}</span>
            </div>
          </div>

          {/* Hero Banner */}
          <div className="relative bg-green-dark rounded-[20px] sm:rounded-[24px] overflow-hidden p-6 sm:p-8 min-h-[180px]">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute w-64 h-64 rounded-full bg-primary/8 -top-16 -right-16" />
              <div className="absolute w-40 h-40 rounded-full bg-primary/5 bottom-0 left-8" />
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
              <div className="bg-white/8 border border-white/10 rounded-[18px] p-5 flex-shrink-0 text-center min-w-[160px]">
                <div className="text-[42px] font-bricolage font-extrabold text-primary leading-none">{activeCount}</div>
                <div className="text-white/60 text-[12px] font-medium mt-1">{t("parrainage_active_godchildren")}</div>
              </div>
            </div>
          </div>

          {/* Code + Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Referral code card */}
            <div className="sm:col-span-2 lg:col-span-1 bg-white border border-borda rounded-[18px] p-5">
              <p className="text-[11px] font-bold text-textMuted uppercase tracking-widest mb-3">{t("parrainage_my_code")}</p>
              <div className="flex items-center gap-2 bg-bgMain border border-borda rounded-[12px] px-4 py-3 mb-3">
                <span className="font-bricolage text-2xl font-extrabold text-textMain tracking-widest flex-1">{code}</span>
                <button
                  onClick={copyLink}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-[12px] font-bold rounded-[8px] transition-all ${copied ? "bg-green-600" : "bg-primary hover:bg-primary-dark"}`}
                >
                  <i className={`${copied ? "fa-solid fa-check" : "fa-regular fa-copy"} text-[11px]`} />
                  {copied ? t("parrainage_copied") : t("parrainage_copy")}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => shareVia("whatsapp")}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#25D366]/10 border border-[#25D366]/20 text-[#1a9e4e] text-[12.5px] font-bold rounded-[10px] hover:bg-[#25D366]/20 transition-colors"
                >
                  <i className="fa-brands fa-whatsapp text-base" /> WhatsApp
                </button>
                <button
                  onClick={() => shareVia("sms")}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 border border-blue-100 text-blue-700 text-[12.5px] font-bold rounded-[10px] hover:bg-blue-100 transition-colors"
                >
                  <i className="fa-solid fa-message text-base" /> SMS
                </button>
                <button
                  onClick={() => shareVia("copy-link")}
                  className="flex items-center justify-center w-10 py-2.5 bg-surface2 border border-borda text-textMuted rounded-[10px] hover:border-primary hover:text-primary transition-colors"
                >
                  <i className="fa-solid fa-link text-[12px]" />
                </button>
              </div>
            </div>

            {/* Earnings card */}
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
                <div className="h-full bg-primary rounded-full shimmer" style={{ width: `${Math.min((totalGains / 5000) * 100, 100)}%` }} />
              </div>
              <div className="text-[11.5px] text-textMuted">
                {t("parrainage_next_milestone")} : <span className="font-bold text-textMain">5 000 XAF</span>
              </div>
            </div>

            {/* Slots card */}
            <div className="bg-white border border-borda rounded-[18px] p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-[11px] bg-green-light flex items-center justify-center">
                  <i className="fa-solid fa-file-circle-plus text-green-mid text-base" />
                </div>
                <span className="text-[10px] font-bold py-1 px-2.5 rounded-full bg-primary/10 text-primary-dark">Bonus actifs</span>
              </div>
              <div>
                <div className="font-bricolage text-3xl font-extrabold text-textMain">
                  +{totalSlots} <span className="text-lg font-bold text-textMuted">slots</span>
                </div>
                <div className="text-[12.5px] text-textMuted font-medium">{t("parrainage_bonus_reports")}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <i className="fa-solid fa-circle-info text-textMuted text-[11px]" />
                <span className="text-[11.5px] text-textMuted">{t("parrainage_slots_per_referral")}</span>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-white border border-borda rounded-[20px] p-5 sm:p-6">
            <h2 className="font-bricolage text-lg font-bold text-textMain mb-5 flex items-center gap-2">
              <i className="fa-solid fa-circle-question text-primary text-base" /> {t("parrainage_how_it_works")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0 relative">
              {[
                {
                  icon: "fa-solid fa-share-nodes",
                  color: "bg-primary/10 border-primary/20 text-primary",
                  step: "1",
                  title: "Partagez votre code",
                  desc: "Envoyez votre code à un ami via WhatsApp, SMS ou lien direct.",
                },
                {
                  icon: "fa-solid fa-user-plus",
                  color: "bg-green-light border-green-dark/20 text-green-mid",
                  step: "2",
                  title: "Il s'inscrit & valide",
                  desc: "Votre filleul crée son compte avec votre code et effectue son 1er enregistrement.",
                },
                {
                  icon: "fa-solid fa-trophy",
                  color: "bg-amber-50 border-amber-200 text-amber-500",
                  step: "3",
                  title: "Vous gagnez tous les deux",
                  desc: "500 XAF pour vous + 1 mois gratuit pour votre filleul.",
                },
              ].map((item, idx) => (
                <div key={item.step} className="flex sm:flex-col items-start sm:items-center gap-4 sm:gap-3 sm:text-center relative sm:px-4">
                  {idx < 2 && <div className="hidden sm:block absolute top-6 left-[60%] w-[40%] h-px bg-gradient-to-r from-borderMain to-transparent" />}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 ${item.color}`}>
                    <i className={`${item.icon} text-lg`} />
                  </div>
                  <div className={idx < 2 ? "sm:hidden absolute left-6 top-14 h-[calc(100%-56px)] w-px bg-borderMain" : ""} />
                  <div>
                    <div className="text-[11px] font-bold text-primary uppercase tracking-wide mb-0.5">Étape {item.step}</div>
                    <div className="text-[14px] font-bold text-textMain mb-1">{item.title}</div>
                    <div className="text-[12.5px] text-textMuted leading-snug">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rewards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-borda rounded-[18px] p-5">
              <h3 className="font-bricolage text-base font-bold text-textMain mb-4 flex items-center gap-2">
                <i className="fa-solid fa-medal text-primary text-sm" />Vos récompenses
              </h3>
              <div className="space-y-3">
                {[
                  { icon: "fa-solid fa-coins", bg: "bg-primary/10", color: "text-primary", label: "Bonus en cash", sub: "Par parrainage validé", value: "500 XAF" },
                  { icon: "fa-solid fa-file-circle-plus", bg: "bg-green-light", color: "text-green-mid", label: "Signalement bonus", sub: "Par parrainage validé", value: "+2 slots" },
                  { icon: "fa-solid fa-crown", bg: "bg-amber-50", color: "text-amber-500", label: "Upgrade de plan", sub: "À partir de 5 filleuls", value: "1 mois Pro" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-borda last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-[8px] ${item.bg} flex items-center justify-center flex-shrink-0`}>
                        <i className={`${item.icon} ${item.color} text-xs`} />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-textMain">{item.label}</div>
                        <div className="text-[11px] text-textMuted">{item.sub}</div>
                      </div>
                    </div>
                    <span className={`font-bricolage text-[15px] font-bold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-green-dark rounded-[18px] p-5 relative overflow-hidden">
              <div className="absolute w-40 h-40 rounded-full bg-primary/8 -bottom-10 -right-10 pointer-events-none" />
              <h3 className="font-bricolage text-base font-bold text-white mb-1 flex items-center gap-2 relative z-10">
                <i className="fa-solid fa-gift text-primary text-sm" />Cadeau pour votre filleul
              </h3>
              <p className="text-white/50 text-[12px] mb-4 relative z-10">Ce que reçoit chaque personne que vous parrainez</p>
              <div className="space-y-3 relative z-10">
                {[
                  "1 mois d'abonnement Standard offert",
                  "3 déclarations gratuites dès l'inscription",
                  "Accès prioritaire au support",
                ].map((text) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-check text-primary text-[10px]" />
                    </div>
                    <span className="text-[13px] text-white/80">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Friends Circle Trigger Card */}
          <div
            id="friends-trigger-card"
            className="bg-white border border-borda rounded-[20px] overflow-hidden cursor-pointer hover:border-primary hover:shadow-sm transition-all"
            onClick={openPanel}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPanel(); } }}
          >
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[10px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-users text-primary text-sm" />
                  </div>
                  <div>
                    <h2 className="font-bricolage text-[15px] font-bold text-textMain leading-none">Cercle d'amis</h2>
                    <p className="text-[11px] text-textMuted font-medium mt-0.5">Vos filleuls parrainés</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-green-light border border-green-dark/10 rounded-full px-3 py-1">
                    <i className="fa-solid fa-circle text-green-mid text-[7px]" />
                    <span className="text-[12px] font-bold text-green-mid">{activeCount} actifs</span>
                  </div>
                  <div className="w-8 h-8 rounded-[9px] bg-surface2 border border-borda flex items-center justify-center text-textMuted">
                    <i className="fa-solid fa-chevron-up text-[11px] md:hidden" />
                    <i className="fa-solid fa-expand text-[10px] hidden md:block" />
                  </div>
                </div>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-bgMain rounded-[11px] p-3 text-center">
                  <div className="font-bricolage text-xl font-extrabold text-textMain">{totalFriends}</div>
                  <div className="text-[10.5px] text-textMuted font-medium mt-0.5">Total</div>
                </div>
                <div className="bg-bgMain rounded-[11px] p-3 text-center">
                  <div className="font-bricolage text-xl font-extrabold text-primary">{totalGains.toLocaleString("fr-FR")}</div>
                  <div className="text-[10.5px] text-textMuted font-medium mt-0.5">XAF gagnés</div>
                </div>
                <div className="bg-bgMain rounded-[11px] p-3 text-center">
                  <div className="font-bricolage text-xl font-extrabold text-green-mid">+{totalSlots}</div>
                  <div className="text-[10.5px] text-textMuted font-medium mt-0.5">Slots bonus</div>
                </div>
              </div>

              {/* Avatar stack */}
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2.5">
                  {friends.slice(0, 5).map((f, i) => (
                    <div
                      key={f.id}
                      className={`w-8 h-8 rounded-full border-2 border-white ${f.color} flex items-center justify-center font-bricolage text-[11px] font-bold ${f.active ? "avatar-active" : ""}`}
                      style={{ zIndex: 10 - i }}
                      title={f.name}
                    >
                      {f.initials}
                    </div>
                  ))}
                  {friends.length > 5 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-bgMain flex items-center justify-center text-[10px] font-bold text-textMuted">
                      +{friends.length - 5}
                    </div>
                  )}
                  {friends.length === 0 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-surface2 flex items-center justify-center text-[10px] font-bold text-textMuted">
                      <i className="fa-solid fa-plus" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
                  <span className="md:hidden">Voir tous</span>
                  <span className="hidden md:inline">Ouvrir le détail</span>
                  <i className="fa-solid fa-arrow-up-from-line text-[10px] md:hidden" />
                  <i className="fa-solid fa-up-right-from-square text-[10px] hidden md:inline" />
                </div>
              </div>
            </div>

            {/* Last activity */}
            <div className="bg-bgMain border-t border-borda px-5 py-3 flex items-center gap-2.5">
              {latestFriend ? (
                <>
                  <div className={`w-6 h-6 rounded-full ${latestFriend.color} flex items-center justify-center text-[9px] font-bold flex-shrink-0`}>
                    {latestFriend.initials}
                  </div>
                  <span className="text-[12px] text-textMuted flex-1">
                    <span className="font-semibold text-textMain">{latestFriend.name}</span> a rejoint {relativeDate(latestFriend.joined).toLowerCase()}
                  </span>
                  <i className="fa-solid fa-clock text-textMuted text-[10px]" />
                </>
              ) : (
                <span className="text-[12px] text-textMuted">Aucun filleul pour le moment.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {panelOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-[210] bg-black/52 backdrop-blur-sm transition-opacity duration-300 opacity-100 pointer-events-auto`}
            onClick={closePanel}
          />

          {/* Panel - Bottom Sheet (mobile) / Modal (desktop) */}
          <div
            className={`fixed z-[220] bg-white transition-all duration-300 ${
              window.innerWidth >= 900
                ? "top-1/2 left-1/2 w-[620px] max-w-[calc(100vw-48px)] max-h-[82vh] rounded-[20px] shadow-2xl"
                : "bottom-0 left-0 right-0 rounded-t-[24px] max-h-[82vh]"
            } opacity-100 pointer-events-auto`}
            style={
              window.innerWidth >= 900
                ? { transform: "translate(-50%, -50%) scale(1)" }
                : { transform: `translateY(${dragY}px)` }
            }
          >
        {/* Drag handle */}
        <div
          className="flex-shrink-0"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-borderMain mx-auto mt-3 mb-1 md:hidden" />
          <div className="px-5 pb-4 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bricolage text-[17px] font-bold text-textMain">Cercle d'amis parrainés</h3>
                <p className="text-[12px] text-textMuted mt-0.5">
                  <span>{totalFriends}</span> filleuls ·
                  <span className="text-primary font-semibold ml-1">{activeCount} avec abonnement</span>
                </p>
              </div>
              <button
                onClick={closePanel}
                className="w-9 h-9 rounded-full bg-surface2 border border-borda flex items-center justify-center text-textMuted hover:border-primary hover:text-primary transition-all"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mt-3">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted text-[12px]" />
              <input
                type="text"
                placeholder="Rechercher un filleul…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-bgMain border border-borda rounded-[11px] text-[13px] text-textMain font-medium placeholder:text-textMuted outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {(["all", "active", "inactive", "recent"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-shrink-0 text-[11.5px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                    filter === f
                      ? "bg-primary text-white border-primary"
                      : "border-borda bg-bgMain text-textMuted hover:border-primary/40"
                  }`}
                >
                  {f === "all" && "Tous"}
                  {f === "active" && <><i className="fa-solid fa-circle text-green-mid text-[7px] mr-1" />Abonnés</>}
                  {f === "inactive" && <><i className="fa-solid fa-circle text-gray-300 text-[7px] mr-1" />Sans abonnement</>}
                  {f === "recent" && <><i className="fa-regular fa-clock mr-1 text-[10px]" />Récents</>}
                </button>
              ))}
            </div>
          </div>
          <div className="h-px bg-borderMain mx-5" />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 custom-scroll" style={{ maxHeight: "calc(82vh - 220px)" }}>
          {/* Gains summary */}
          <div className="px-5 py-3.5 border-b border-borda">
            <div className="flex items-center gap-4 overflow-x-auto">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 rounded-[7px] bg-primary/10 flex items-center justify-center">
                  <i className="fa-solid fa-coins text-primary text-[10px]" />
                </div>
                <div>
                  <div className="font-bricolage text-[13px] font-extrabold text-textMain">{totalGains.toLocaleString("fr-FR")} XAF</div>
                  <div className="text-[10px] text-textMuted">Cash total</div>
                </div>
              </div>
              <div className="w-px h-8 bg-borderMain flex-shrink-0" />
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 rounded-[7px] bg-green-light flex items-center justify-center">
                  <i className="fa-solid fa-file-circle-plus text-green-mid text-[10px]" />
                </div>
                <div>
                  <div className="font-bricolage text-[13px] font-extrabold text-textMain">+{totalSlots} slots</div>
                  <div className="text-[10px] text-textMuted">Bonus</div>
                </div>
              </div>
              <div className="w-px h-8 bg-borderMain flex-shrink-0" />
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 rounded-[7px] bg-amber-50 flex items-center justify-center">
                  <i className="fa-solid fa-trophy text-amber-500 text-[10px]" />
                </div>
                <div>
                  <div className="font-bricolage text-[13px] font-extrabold text-textMain">{Math.min(totalFriends, 10)} / 10</div>
                  <div className="text-[10px] text-textMuted">Vers Pro</div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-5 py-3 border-b border-borda">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11.5px] text-textMuted font-medium flex-1">Progression vers le palier Pro</span>
              <span className="font-bricolage text-[12px] font-bold text-textMain">{Math.min(totalFriends, 10)} / 10</span>
            </div>
            <div className="h-2 bg-bgMain rounded-full overflow-hidden border border-borda">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full shimmer transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Friend list or empty state */}
          {getFiltered().length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <div className="w-14 h-14 rounded-2xl bg-bgMain border border-borda flex items-center justify-center mb-3">
                <i className="fa-solid fa-user-slash text-textMuted text-xl" />
              </div>
              <p className="text-[14px] font-semibold text-textMain mb-1">Aucun résultat</p>
              <p className="text-[12px] text-textMuted">Essayez un autre filtre ou recherche</p>
            </div>
          ) : (
            <div>
              {getFiltered().map((f, i) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3.5 px-5 py-4 border-b border-borda hover:bg-surface2 transition-colors"
                  style={{ animation: `fadeUp 0.25s ease both`, animationDelay: `${i * 40}ms` }}
                >
                  <div className="relative flex-shrink-0">
                    <div className={`w-11 h-11 rounded-full ${f.color} flex items-center justify-center font-bricolage text-[13px] font-bold`}>
                      {f.initials}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-[10px] h-[10px] rounded-full border-2 border-white ${f.active ? "bg-green-mid" : "bg-gray-300"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold text-textMain leading-tight truncate">{f.name}</div>
                    <div className="text-[11px] text-textMuted mt-0.5 flex items-center gap-1.5">
                      <i className="fa-regular fa-calendar text-[9px]" />{relativeDate(f.joined)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {f.active ? (
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 leading-tight">Abonné</span>
                    ) : (
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-bgMain text-textMuted leading-tight">Sans abonnement</span>
                    )}
                    {f.reward > 0 ? (
                      <span className="text-[10px] font-semibold text-primary">+{f.reward} XAF · +{f.slots} slots</span>
                    ) : (
                      <span className="text-[10px] text-textMuted italic">En attente</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="px-5 pt-4 pb-6">
            <button
              onClick={() => { closePanel(); copyInviteLink(); }}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-green-dark text-white text-[13.5px] font-bold rounded-[14px] hover:bg-green-mid transition-colors"
            >
              <i className="fa-solid fa-user-plus text-sm" /> Inviter un nouvel ami
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )}

      {/* Toast */}
      <div
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] pointer-events-none transition-all duration-300"
        style={{ opacity: toastVisible ? 1 : 0, transform: toastVisible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(8px)" }}
      >
        <div className="bg-green-dark text-white text-[13px] font-semibold px-4 py-2.5 rounded-full flex items-center gap-2 shadow-lg whitespace-nowrap">
          <i className="fa-solid fa-check text-primary text-xs" />
          <span>{toastMsg}</span>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: 200%; } 100% { background-position: -200%; } }
        .shimmer { background: linear-gradient(90deg, #f5a64b10 0%, #f5a64b30 50%, #f5a64b10 100%); background-size: 200%; animation: shimmer 2s infinite; }
        @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(245,166,75,0.4); } 70% { box-shadow: 0 0 0 8px rgba(245,166,75,0); } 100% { box-shadow: 0 0 0 0 rgba(245,166,75,0); } }
        .avatar-active { animation: pulseRing 2s infinite; }
      `}</style>
    </div>
  );
}
