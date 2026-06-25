import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { subscriptionsService } from "../../services/subscriptionsService";

import type { Plan } from "../../types/api";

const testimonials = [
  { author: "Marie NGUYEN", roleKey: "testimonial_1_role", quoteKey: "testimonial_1_quote", icon: "fas fa-briefcase" },
  { author: "Paul FOTSO", roleKey: "testimonial_2_role", quoteKey: "testimonial_2_quote", icon: "fas fa-chalkboard-teacher" },
  { author: "Sandra EKOTTO", roleKey: "testimonial_3_role", quoteKey: "testimonial_3_quote", icon: "fa-solid fa-graduation-cap" },
];

const partners = [
  { icon: "fas fa-university", label: "Préfecture" },
  { icon: "fas fa-id-card", label: "CNI / Passeport" },
  { icon: "fas fa-graduation-cap", label: "Université" },
  { icon: "fa-solid fa-building", label: "Centre National" },
  { icon: "fa-solid fa-car", label: "Transports" },
];

function useCounter(ref, target, suffix = "") {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            let count = 0;
            const inc = target / 60;
            const timer = setInterval(() => {
              count += inc;
              if (count >= target) {
                el.textContent = target.toLocaleString("fr-FR") + suffix;
                clearInterval(timer);
              } else {
                el.textContent = Math.ceil(count).toLocaleString("fr-FR") + suffix;
              }
            }, 20);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, target]);
}

const steps = [
  { num: 1, titleKey: "home_how_step1_title", descKey: "home_how_step1_desc" },
  { num: 2, titleKey: "home_how_step2_title", descKey: "home_how_step2_desc" },
  { num: 3, titleKey: "home_how_step3_title", descKey: "home_how_step3_desc" },
  { num: 4, titleKey: "home_how_step4_title", descKey: "home_how_step4_desc" },
];

const features = [
  { icon: "fa-solid fa-shield-halved", bg: "bg-green-light", color: "text-green-mid", titleKey: "home_feature_secure", descKey: "home_feature_secure_desc" },
  { icon: "fa-solid fa-bolt", bg: "bg-primary/10", color: "text-primary", titleKey: "home_feature_fast", descKey: "home_feature_fast_desc" },
  { icon: "fa-solid fa-users", bg: "bg-blue-50", color: "text-blue-500", titleKey: "home_feature_community", descKey: "home_feature_community_desc" },
];

const tips = [
  { icon: "fa-solid fa-shield-alt", titleKey: "home_tip_vigilance", descKey: "home_tip_vigilance_desc" },
  { icon: "fa-solid fa-copy", titleKey: "home_tip_scan", descKey: "home_tip_scan_desc" },
  { icon: "fa-solid fa-bell", titleKey: "home_tip_declare", descKey: "home_tip_declare_desc" },
  { icon: "fa-solid fa-phone-alt", titleKey: "home_tip_contacts", descKey: "home_tip_contacts_desc" },
];

export default function Home() {
  const { t, lang } = useI18n();

  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    subscriptionsService.getAllPlans().then((res) => {
      if (res.success && res.data) setPlans(res.data);
    }).catch(() => {});
  }, []);

  const statCounters = [
    { target: 2847, labelKey: "stat_declared", suffix: "" },
    { target: 2156, labelKey: "stat_recovered_label", suffix: "" },
    { target: 1523, labelKey: "stat_members", suffix: "" },
  ];

  return (
    <>
      <HeroSection t={t} />
      <RecentDocsSection t={t} />
      <HowItWorksSection t={t} />
      <WhyDocmasterSection t={t} />
      <DigitalVaultSection t={t} />
      <StatsSection t={t} statCounters={statCounters} />
      <ReferralSection t={t} />
       <SubscriptionsTeaser t={t} plans={plans} />
      <TestimonialsSection t={t} lang={lang} />
      <TipsSection t={t} />
      <PartnersSection t={t} />
      <AppDownloadSection t={t} />
      <StickyAppBar t={t} />
    </>
  );
}

function HeroSection({ t }) {
  return (
    <section className="bg-bgMain noise relative overflow-hidden min-h-screen flex items-center pt-[68px]">
      <style>{`
        .tower-col { perspective: 1200px; }
        .tower-col-inner { 
          transform-style: preserve-3d; 
          animation: tower-rotate 60s linear infinite;
        }
        @keyframes tower-rotate {
          0% { transform: rotateY(0deg); }
          50% { transform: rotateY(15deg) rotateX(5deg); }
          100% { transform: rotateY(0deg); }
        }
        .tower-col-inner img { 
          transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          backface-visibility: hidden;
        }
        .tower-col-inner img:hover { transform: scale(1.05) translateZ(30px); box-shadow: 0 20px 60px rgba(0,0,0,.2); z-index: 50; }
        .tower-stack { display: flex; flex-direction: column; }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
      `}</style>

      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-5 py-16 lg:py-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div style={{ animation: "slideUp 0.6s ease forwards" }}>
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-primary/15 border border-primary/20 rounded-full mb-8">
              <span className="w-2 h-2 rounded-full bg-primary" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
              <span className="text-xs font-bold text-primary uppercase tracking-widest">{t("hero_badge")}</span>
            </div>

            <h1 className="font-bricolage text-[2.2rem] sm:text-[2.6rem] lg:text-[3.2rem] font-extrabold text-textMain leading-tight tracking-normal mb-8">
              {t("hero_title_1")}<br />
              {t("hero_title_2")}<br />
              <span className="gradient-text" style={{
                background: "linear-gradient(90deg, #F5A64B, #FFD580, #F5A64B)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "shimmer 3s linear infinite",
              }}>{t("hero_title_3")}</span>
            </h1>

            <p className="text-textMuted text-[15px] leading-loose mb-10 max-w-lg tracking-wide">{t("hero_desc")}</p>

            <div className="flex flex-wrap items-center gap-4 mb-12">
              <Link to="/login"
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-primary text-white rounded-[18px] font-black text-[15px] shadow-xl shadow-primary/40 hover:bg-primary-dark transition-all hover:-translate-y-1 active:scale-95"
              >
                <i className="fa-solid fa-file-circle-plus" /> {t("btn_declare_loss")}
              </Link>
              <Link to="/rechercher"
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-white border border-borda text-textMain rounded-[18px] font-bold text-[15px] hover:bg-white/80 transition-all hover:-translate-y-1 active:scale-95 shadow-sm"
              >
                <i className="fa-solid fa-magnifying-glass" /> {t("btn_search")}
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <MiniStat icon="fa-solid fa-file-lines" value="2 847" label={t("home_mini_declared")} />
              <div className="w-px h-8 bg-borda" />
              <MiniStat icon="fa-solid fa-search" value="2 156" label={t("home_mini_found")} />
              <div className="w-px h-8 bg-borda" />
              <MiniStat icon="fa-solid fa-users" value="1 523" label={t("home_mini_members")} />
            </div>
          </div>

          <div className="relative hidden lg:flex items-center justify-center min-h-[500px] overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
            </div>
            <div className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden" >
              <div className="grid grid-cols-2 gap-8 auto-rows-max" style={{ perspective: "1500px" }}>
                <div className="flex flex-col gap-6 tower-col">
                  <div className="tower-col-inner tower-stack">
                    <img src="/src/assets/images/images.jpg" className="w-full h-auto max-w-[240px] object-cover rounded-[24px] shadow-xl border-4 border-white/10" alt="Document CNI" />
                    <img src="/src/assets/images/1.png" className="w-full h-auto max-w-[240px] object-cover rounded-[24px] shadow-xl border-4 border-white/10" alt="Document" />
                    <img src="/src/assets/images/permis.jpg" className="w-full h-auto max-w-[240px] object-contain rounded-[24px] shadow-xl border-4 border-white/10" alt="Document Passeport"/>
                  </div>
                </div>
                <div className="flex flex-col gap-6 mt-20 tower-col">
                  <div className="tower-col-inner tower-stack" >
                    <img src="/src/assets/images/passport.png" className="w-full h-auto max-w-[240px] object-cover rounded-[24px] shadow-xl border-4 border-white/10" alt="Document Passeport"/>
                    <img src="/src/assets/images/cni-poubelle.jpeg" className="w-full h-auto max-w-[240px] object-cover rounded-[24px] shadow-xl border-4 border-white/10" alt="Document" />
                    <img src="/src/assets/images/bacc.png" className="w-full h-auto max-w-[240px] object-contain rounded-[24px] shadow-xl border-4 border-white/10" alt="Document" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 animate-bounce">
        <span className="text-[10px] font-bold uppercase tracking-widest">{t("home_how_title")}</span>
        <i className="fa-solid fa-chevron-down text-xs" />
      </div>
    </section>
  );
}

function MiniStat({ icon, value, label }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
        <i className={`${icon} text-primary text-xs`} />
      </div>
      <div>
        <p className="text-textMain font-black text-sm leading-none">{value}</p>
        <p className="text-textMuted text-[10px] font-bold uppercase">{label}</p>
      </div>
    </div>
  );
}

const recentDocuments = [
  {
    id: 1,
    titre: "Carte D'identité",
    date_retrouve: "13/08/2025",
    statut: "RÉCENT",
    priorite: 1,
    proprietaire: "Jean Dupont",
    retrouve_par: "Pierre Martin",
    pourcentage_restitution: 50,
    image_url: "/src/assets/images/images.jpg",
  },
  {
    id: 2,
    titre: "Passeport",
    date_retrouve: "15/08/2025",
    statut: "RÉCENT",
    priorite: 2,
    proprietaire: "Awa Traoré",
    retrouve_par: "Koffi Paul",
    pourcentage_restitution: 80,
    image_url: "/src/assets/images/passport.png",
  },
  {
    id: 3,
    titre: "Acte de naissance",
    date_retrouve: "10/08/2025",
    statut: "RÉCENT",
    priorite: 3,
    proprietaire: "Marie Curie",
    retrouve_par: "Albert Einstein",
    pourcentage_restitution: 90,
    image_url: "/src/assets/images/1.png",
  },
];

function RecentDocsSection({ t }) {
  const [docs] = useState(recentDocuments);

  return (
    <section id="recent-docs" className="py-20 px-5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-black uppercase tracking-widest mb-5 border border-primary/20">
            <i className="fa-solid fa-clock-rotate-left text-[10px]" /> {t("home_recent_badge")}
          </span>
          <h2 className="font-bricolage text-2xl md:text-3xl font-black text-textMain tracking-normal mb-4">{t("home_recent_title")}</h2>
          <p className="text-textMuted text-[14px] leading-relaxed max-w-lg mx-auto tracking-wide">{t("home_recent_desc")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {docs.map((doc) => (
            <div key={doc.id} className="bg-white border border-borda rounded-[20px] overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group">
              <div className="relative h-44 overflow-hidden bg-gray-100">
                <img src={doc.image_url} alt={doc.titre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 right-3 bg-primary text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg">
                  {doc.statut}
                </div>
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-[11px] font-bold text-textMain shadow-sm">
                  <i className="fa-solid fa-calendar text-primary text-[10px] mr-1.5" />{doc.date_retrouve}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bricolage text-[16px] font-black text-textMain mb-1">{doc.titre}</h3>
                <div className="flex items-center gap-1.5 text-[12px] text-textMuted mb-3">
                  <i className="fa-solid fa-user text-primary text-[10px]" />
                  <span className="font-semibold">{doc.proprietaire}</span>
                  <span className="mx-1">·</span>
                  <i className="fa-solid fa-hand-holding-heart text-primary text-[10px]" />
                  <span>{doc.retrouve_par}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all duration-1000"
                      style={{ width: `${doc.pourcentage_restitution}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-black text-primary whitespace-nowrap">{doc.pourcentage_restitution}%</span>
                </div>
                <p className="text-[10px] text-textMuted mt-1 font-medium">{t("home_recent_desc")}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/rechercher"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-green-dark text-white rounded-[18px] font-bold text-[14px] hover:bg-green-mid transition-all hover:-translate-y-1 shadow-lg shadow-green-dark/20"
          >
            {t("home_recent_view_all")} <i className="fa-solid fa-arrow-right text-[11px]" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection({ t }) {
  return (
    <section className="py-20 px-5 bg-bgMain relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-bold uppercase tracking-widest mb-5 border border-primary/20">
            <i className="fa-solid fa-route text-[10px]" /> {t("home_how_badge")}
          </span>
          <h2 className="font-bricolage text-2xl md:text-3xl font-extrabold text-textMain tracking-normal mb-4">{t("home_how_title")}</h2>
          <p className="text-textMuted text-[14px] leading-relaxed max-w-lg mx-auto tracking-wide">{t("home_how_desc")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              <div className="bg-white border border-borda rounded-[24px] p-8 hover:bg-primary/5 transition-all group shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-bricolage text-2xl font-black mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
                  {step.num}
                </div>
                <h3 className="font-bricolage text-lg font-bold text-textMain mb-3">{t(step.titleKey)}</h3>
                <p className="text-textMuted text-[13px] leading-relaxed">{t(step.descKey)}</p>
              </div>
            {i < steps.length - 1 && (
  <div className="hidden lg:block absolute top-[60px] -translate-y-1/2 -right-8 w-9 h-7 z-10">
    <svg width="36" height="28" viewBox="0 0 36 28" className="text-primary">
      <line x1="0" y1="14" x2="26" y2="14" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
      <path d="M 22 7 L 33 14 L 22 21" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
)}
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/login"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-primary text-white rounded-[18px] font-black text-[15px] shadow-xl shadow-primary/30 hover:bg-primary-dark transition-all hover:-translate-y-1"
          >
            <i className="fa-solid fa-file-circle-plus" /> {t("home_how_btn_loss")}
          </Link>
          <Link to="/trouver"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-white border border-borda text-textMain rounded-[18px] font-bold text-[15px] hover:bg-primary/5 transition-all hover:-translate-y-1 shadow-sm"
          >
            <i className="fa-solid fa-hand-holding-heart" /> {t("home_how_btn_found")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function WhyDocmasterSection({ t }) {
  return (
    <section className="py-20 px-5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-black uppercase tracking-widest mb-5 border border-primary/20">
            <i className="fa-solid fa-star text-[10px]" /> {t("home_why_badge")}
          </span>
          <h2 className="font-bricolage text-2xl md:text-3xl font-extrabold text-textMain tracking-normal mb-4">{t("home_why_title")}</h2>
          <p className="text-textMuted text-[14px] leading-relaxed max-w-lg mx-auto tracking-wide">{t("home_why_desc")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="feature-card bg-white border border-borda rounded-[24px] p-8 shadow-sm" style={{ transition: "transform 0.3s, box-shadow 0.3s" }}>
              <div className={`w-14 h-14 rounded-2xl ${f.bg} flex items-center justify-center ${f.color} text-2xl mb-6 shadow-sm`}>
                <i className={f.icon} />
              </div>
              <h3 className="font-bricolage text-[18px] font-bold text-textMain mb-3">{t(f.titleKey)}</h3>
              <p className="text-textMuted text-[13px] leading-relaxed">{t(f.descKey)}</p>
            </div>
          ))}

          <div className="feature-card bg-green-dark rounded-[24px] p-8 shadow-xl md:col-span-2 relative overflow-hidden" style={{ transition: "transform 0.3s, box-shadow 0.3s" }}>
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-primary/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-white/10">{t("sidebar_primary")}</span>
              <h3 className="font-bricolage text-2xl md:text-3xl font-extrabold text-white mb-4 tracking-tighter">{t("home_feature_recovery")}</h3>
              <p className="text-white/60 text-[14px] leading-relaxed mb-8 max-w-md">{t("home_feature_recovery_desc")}</p>
              <div className="flex flex-wrap gap-3">
                {["Paiement sécurisé", "Code de retrait unique", "Agences partenaires"].map((label, j) => (
                  <div key={j} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
                    <i className="fa-solid fa-check-circle text-primary text-sm" />
                    <span className="text-white text-[12px] font-bold">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="feature-card bg-primary rounded-[24px] p-8 shadow-xl relative overflow-hidden" style={{ transition: "transform 0.3s, box-shadow 0.3s" }}>
            <div className="absolute -left-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-xl" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-green-dark text-2xl mb-6">
                <i className="fa-solid fa-coins" />
              </div>
              <h3 className="font-bricolage text-[18px] font-bold text-green-dark mb-3">{t("home_feature_rewards")}</h3>
              <p className="text-green-dark/70 text-[13px] leading-relaxed">{t("home_feature_rewards_desc")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DigitalVaultSection({ t }) {
  return (
    <section className="py-20 px-5 relative overflow-hidden bg-white">
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="p-8 md:p-14 lg:px-0 lg:py-20 overflow-hidden relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full mb-6 border border-primary/10 shadow-sm">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" style={{ animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
                <span className="text-xs font-black text-secondary uppercase tracking-widest">{t("home_vault_badge")}</span>
              </div>

              <h2 className="font-bricolage text-2xl md:text-4xl font-black text-[#1A1A1A] leading-tight mb-8 tracking-normal">
                {t("home_vault_title")}
              </h2>

              <p className="text-gray-600 text-[15px] leading-loose tracking-wide mb-8">{t("home_vault_desc")}</p>

              <ul className="space-y-4 mb-10">
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <i className="fa-solid fa-laptop-mobile" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A1A]">{t("home_vault_feature1_title")}</h4>
                    <p className="text-sm text-gray-500 mt-1">{t("home_vault_feature1_desc")}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0 mt-1">
                    <i className="fa-solid fa-file-shield" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A1A]">{t("home_vault_feature2_title")}</h4>
                    <p className="text-sm text-gray-500 mt-1">{t("home_vault_feature2_desc")}</p>
                  </div>
                </li>
              </ul>

              <Link to="/login"
                className="inline-flex items-center gap-3 px-8 py-4 bg-green-dark text-white rounded-2xl font-bold hover:bg-green-mid transition-all shadow-lg hover:-translate-y-1"
              >
                <i className="fa-solid fa-vault" /> {t("home_vault_btn")}
              </Link>
            </div>

            <div className="relative flex justify-center lg:justify-end items-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 bg-primary/20 rounded-full blur-[60px] animate-pulse" />
              </div>
              <div className="relative z-10 w-full max-w-md lg:max-w-lg mb-4 lg:mb-0" style={{ filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.15))" }}>
                <img src="/src/assets/images/devices_docs.png" alt="Appareils" className="w-full h-auto object-contain rounded-2xl" style={{ animation: "float 6s ease-in-out infinite" }} />
                <div className="absolute top-4 -left-4 md:-left-8 bg-white border border-gray-100 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 z-20" style={{ animation: "float 5s ease-in-out infinite 1s" }}>
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><i className="fa-solid fa-check text-green-600 text-[10px]" /></div>
                  <div><p className="text-[10px] font-black text-gray-800">{t("home_vault_imei_verified")}</p><p className="text-[9px] text-gray-400">{t("home_vault_secure")}</p></div>
                </div>
                <div className="absolute bottom-10 -right-4 md:-right-8 bg-white border border-gray-100 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 z-20" style={{ animation: "float 4s ease-in-out infinite 0.5s" }}>
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><i className="fa-solid fa-lock text-blue-600 text-[10px]" /></div>
                  <div><p className="text-[10px] font-black text-gray-800">{t("home_vault_encrypted")}</p><p className="text-[9px] text-gray-400">{t("home_vault_private")}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection({ t, statCounters }) {
  const secRef = useRef(null);
  const counterRefs = [
    useRef(null), useRef(null), useRef(null),
  ];

  statCounters.forEach((s, i) => {
    useCounter(counterRefs[i], s.target, s.suffix);
  });

  useEffect(() => {
    const sec = secRef.current;
    if (!sec) return;

    const needle = document.getElementById("radar-needle");
    const sweep = document.getElementById("sweep-arc");
    const nodes = document.querySelectorAll(".stat-node");
    const angles = [0, 90, 180, 270];
    let step = 0;
    let timer: ReturnType<typeof setTimeout>;
    let animId: number;

    function animateCounter(el: Element, target: number) {
      const start = performance.now();
      const duration = 1200;
      const init = parseInt(el.textContent?.replace(/\s/g, "") || "0", 10);

      function tick(now: number) {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const val = Math.round(init + (target - init) * ease);
        el.textContent = val.toLocaleString("fr-FR");
        if (t < 1) animId = requestAnimationFrame(tick);
      }
      animId = requestAnimationFrame(tick);
    }

    function rotateTo(angle: number, si: number) {
      if (!needle || !sweep) return;
      const startTime = performance.now();
      const duration = 1100;
      const startAngle = needle.getAttribute("data-current") ? parseFloat(needle.getAttribute("data-current")!) : -45;
      const startSweepAngle = sweep.getAttribute("data-current") ? parseFloat(sweep.getAttribute("data-current")!) : -45;
      const startOpacity = parseFloat(sweep.style.opacity || "0");

      function tick(now: number) {
        const t = Math.min((now - startTime) / duration, 1);
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const currentAngle = startAngle + (angle - startAngle) * ease;
        const currentSweepAngle = startSweepAngle + (angle - startSweepAngle) * ease;
        const currentOpacity = startOpacity + (1 - startOpacity) * Math.min(t * 5, 1);
        needle!.style.transform = `rotate(${currentAngle}deg)`;
        needle!.setAttribute("data-current", String(currentAngle));
        sweep!.style.transform = `rotate(${currentSweepAngle}deg)`;
        sweep!.setAttribute("data-current", String(currentSweepAngle));
        sweep!.style.opacity = String(currentOpacity);

        if (t >= 1) {
          sweep!.style.opacity = "1";
          nodes.forEach((n, i) => {
            if (i === si % 4) {
              n.classList.add("active");
              n.style.opacity = "1";
              const c = n.querySelector<HTMLElement>(".counter-radar");
              if (c && c.dataset.target) animateCounter(c, +c.dataset.target);
            } else {
              n.classList.remove("active");
              n.style.opacity = "0.3";
            }
          });
          timer = setTimeout(() => {
            step++;
            rotateTo(angles[step % 4], step);
          }, 2200);
        } else {
          animId = requestAnimationFrame(tick);
        }
      }
      animId = requestAnimationFrame(tick);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            needle?.setAttribute("data-current", "-45");
            sweep?.setAttribute("data-current", "-45");
            setTimeout(() => rotateTo(angles[0], 0), 500);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(sec);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, []);

  return (
    <section ref={secRef} className="py-24 px-5 bg-[#FAF7F2] relative overflow-hidden" id="stats-section">
      <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "linear-gradient(#F5A64B 1px,transparent 1px),linear-gradient(90deg,#F5A64B 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-black uppercase tracking-widest mb-5 border border-primary/20">
            <i className="fa-solid fa-chart-pie text-[10px]" /> {t("stat_impact_badge")}
          </span>
          <h2 className="font-bricolage text-2xl md:text-3xl font-black text-[#1A1A1A] tracking-normal mb-4">{t("stats_title")}</h2>
          <p className="text-gray-500 text-[14px] leading-relaxed tracking-wide">{t("stats_subtitle")}</p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-16 justify-center">
          <div id="radar-container" className="relative w-[320px] h-[320px] md:w-[520px] md:h-[520px] flex-shrink-0 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-primary/10" />
            <div className="absolute inset-[15%] rounded-full border border-primary/10" />
            <div className="absolute inset-[30%] rounded-full border border-primary/8" />
            <div className="absolute w-full h-[1px] bg-primary/10 top-1/2" />
            <div className="absolute h-full w-[1px] bg-primary/10 left-1/2" />

            <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 z-30" style={{ height: "42%" }}>
              <div id="radar-needle" className="w-[2px] h-full origin-bottom">
                <div className="w-full h-full bg-gradient-to-t from-primary to-transparent" />
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary rounded-full shadow-[0_0_20px_#F5A64B]" style={{ animation: "pulse-dot 1.5s ease-in-out infinite" }} />
              </div>
            </div>

            <div id="radar-sweep" className="absolute inset-0 rounded-full overflow-hidden origin-center pointer-events-none">
              <div id="sweep-arc" className="absolute inset-0 origin-center opacity-0" style={{ background: "conic-gradient(from -45deg, transparent, rgba(245,166,75,0.15) 45deg, transparent 90deg)" }} />
            </div>

            <div className="w-8 h-8 bg-white border-4 border-primary rounded-full z-40 shadow-lg flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-primary rounded-full" style={{ animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
            </div>

            {[
              { icon: "fa-solid fa-file-lines", target: 2847, labelKey: "home_mini_declared", pos: "top-[-8px] left-1/2 -translate-x-1/2", id: "stat-0" },
              { icon: "fa-solid fa-search", target: 2156, labelKey: "home_mini_found", pos: "right-[-8px] top-1/2 -translate-y-1/2", id: "stat-1" },
              { icon: "fa-solid fa-users", target: 1523, labelKey: "home_mini_members", pos: "bottom-[-8px] left-1/2 -translate-x-1/2", id: "stat-2" },
              { icon: "fa-solid fa-star", target: "4.8★", labelKey: "stat_average_rating", pos: "left-[-8px] top-1/2 -translate-y-1/2", id: "stat-3" },
            ].map((s, i) => (
              <div key={i} id={s.id} className={`stat-node absolute ${s.pos} flex flex-col items-center gap-1 opacity-30`}>
                <div className="stat-icon-box w-14 h-14 rounded-full bg-white border-2 border-primary/20 flex flex-col items-center justify-center shadow-md">
                  <i className={`${s.icon} text-primary text-base`} />
                </div>
                <div className="text-center mt-2">
                  <div className={`font-bricolage text-xl font-black text-[#1A1A1A] ${typeof s.target === "number" ? "counter-radar" : ""}`}
                    data-target={typeof s.target === "number" ? s.target : undefined}
                  >
                    {s.target}
                  </div>
                  <p className="text-[9px] text-gray-400 uppercase font-bold leading-tight">{t(s.labelKey)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-5 w-full max-w-sm lg:max-w-xs">
            <div className="bg-white border border-[#EAE3D8] rounded-[20px] p-5 text-center shadow-sm hover:border-primary transition-all hover:-translate-y-1 duration-200">
              <div className="font-bricolage text-3xl font-black text-primary mb-1"><span ref={counterRefs[0]} data-target="2847" className="counter">2 847</span></div>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{t("stat_declared")}</p>
            </div>
            <div className="bg-white border border-[#EAE3D8] rounded-[20px] p-5 text-center shadow-sm hover:border-primary transition-all hover:-translate-y-1 duration-200">
              <div className="font-bricolage text-3xl font-black text-[#1E3A2F] mb-1"><span ref={counterRefs[1]} data-target="2156" className="counter">2 156</span></div>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{t("stat_recovered_label")}</p>
            </div>
            <div className="bg-white border border-[#EAE3D8] rounded-[20px] p-5 text-center shadow-sm hover:border-primary transition-all hover:-translate-y-1 duration-200">
              <div className="font-bricolage text-3xl font-black text-primary mb-1"><span ref={counterRefs[2]} data-target="1523" className="counter">1 523</span></div>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{t("stat_members")}</p>
            </div>
            <div className="bg-white border border-[#EAE3D8] rounded-[20px] p-5 text-center shadow-sm hover:border-primary transition-all hover:-translate-y-1 duration-200">
              <div className="font-bricolage text-3xl font-black text-[#1E3A2F] mb-1">4.8★</div>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{t("stat_average_rating")}</p>
            </div>
            <div className="col-span-2 bg-primary rounded-[20px] p-5 text-center shadow-lg shadow-primary/20">
              <div className="font-bricolage text-3xl font-black text-white mb-1">75%</div>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">{t("stat_rate")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReferralSection({ t }) {
  return (
    <section className="py-20 px-5">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-black uppercase tracking-widest mb-6 border border-primary/20">
              <i className="fa-solid fa-gift text-[10px]" /> {t("home_referral_badge")}
            </span>
            <h2 className="font-bricolage text-2xl md:text-3xl font-black text-textMain tracking-normal mb-6" dangerouslySetInnerHTML={{ __html: t("home_referral_title") }} />
            <p className="text-textMuted text-[14px] mb-8 leading-loose tracking-wide">{t("home_referral_desc")}</p>
            <ul className="space-y-4 mb-10">
              {[
                { icon: "fa-solid fa-gift", text: t("home_referral_feature1") },
                { icon: "fa-solid fa-coins", text: t("home_referral_feature2") },
                { icon: "fa-solid fa-crown", text: t("home_referral_feature3") },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <i className={`${item.icon} text-primary text-xs`} />
                  </div>
                  <span className="text-textMain font-medium text-[14px]">{item.text}</span>
                </li>
              ))}
            </ul>
            <Link to="/login"
              className="inline-flex items-center gap-2.5 px-8 py-4 bg-green-dark text-white rounded-[18px] font-black text-[15px] hover:bg-green-mid transition-all shadow-lg shadow-green-dark/20"
            >
              {t("home_referral_btn")} <i className="fa-solid fa-arrow-right text-[11px]" />
            </Link>
          </div>

          <div className="space-y-4">
            {[
              { num: 1, titleKey: "home_referral_step1_title", descKey: "home_referral_step1_desc" },
              { num: 2, titleKey: "home_referral_step2_title", descKey: "home_referral_step2_desc" },
              { num: 3, titleKey: "home_referral_step3_title", descKey: "home_referral_step3_desc" },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-borda rounded-[24px] p-6 flex items-center gap-5 hover:border-primary transition-all shadow-sm">
                <div className="w-12 h-12 rounded-full bg-green-light border-2 border-green-mid/20 text-green-mid flex items-center justify-center font-bricolage font-black text-lg flex-shrink-0">{s.num}</div>
                <div>
                  <h4 className="font-bold text-textMain mb-1">{t(s.titleKey)}</h4>
                  <p className="text-textMuted text-[13px]">{t(s.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SubscriptionsTeaser({ t, plans }: { t: any; plans: Plan[] }) {
  return (
    <section className="py-24 px-5 bg-green-dark relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#F5A64B 1px, transparent 1px), linear-gradient(90deg, #F5A64B 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-[80px]" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-5 py-2 bg-white/10 text-primary rounded-full text-[12px] font-black uppercase tracking-widest mb-6 border border-white/10 backdrop-blur-sm">
            <i className="fa-solid fa-crown text-[10px]" /> {t("home_subscriptions_badge")}
          </span>
          <h2 className="font-bricolage text-3xl md:text-5xl font-black text-white tracking-tight mb-6">{t("home_subscriptions_title")}</h2>
          <p className="text-white/50 text-[15px] md:text-[17px] leading-relaxed max-w-2xl mx-auto tracking-wide">{t("home_subscriptions_desc")}</p>
        </div>

        <div id="pricing-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.length === 0 && (
            <div className="col-span-full text-center text-white/40 text-[13px] py-10">
              <i className="fa-solid fa-circle-notch fa-spin mr-2" /> {t("home_subscriptions_loading")}
            </div>
          )}
          {plans.slice(0, 4).map((plan, idx) => {
            const isFeatured = plan.popular || idx === 1;
            const price = plan.price || 0;
            const features = Array.isArray(plan.features) ? plan.features : 
                             typeof plan.features === 'object' ? Object.entries(plan.features).map(([k, v]) => v === true ? k : `${v} ${k}`) : [];

            return (
              <div key={plan.id} className={`group rounded-[32px] p-8 flex flex-col transition-all duration-500 hover:-translate-y-3 ${isFeatured ? "bg-white/10 border-2 border-primary/30 shadow-2xl shadow-primary/10 scale-105 z-10" : "bg-white/5 border border-white/10 hover:bg-white/10"}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:rotate-12 ${isFeatured ? "bg-primary text-green-dark shadow-lg shadow-primary/20" : "bg-white/10 text-primary"}`}>
                  <i className={`fa-solid ${isFeatured ? 'fa-rocket' : 'fa-crown'} text-xl`} />
                </div>
                <div className={`font-bricolage text-xl font-black ${isFeatured ? "text-white" : "text-white/90"}`}>{plan.name}</div>
                <div className="font-bricolage text-3xl md:text-4xl font-black text-white mt-4 mb-6 tracking-tight">
                  {price.toLocaleString("fr-FR")} <span className="text-sm font-bold text-white/40 uppercase">XAF</span>
                </div>
                
                <div className="w-full h-px bg-white/10 mb-6" />

                <div className="flex flex-col gap-4 flex-1 mb-8">
                  {features.slice(0, 5).map((f: any, fi: number) => (
                    <div key={fi} className="flex items-center gap-3 text-[13px]">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isFeatured ? "bg-primary text-green-dark" : "bg-white/10 text-primary"}`}>
                        <i className="fa-solid fa-check text-[10px]" />
                      </div>
                      <span className="text-white/70 font-medium capitalize">{String(f).replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
                
                <Link
                  to="/abonnement"
                  className={`text-center w-full py-4 rounded-2xl text-[14px] font-black transition-all shadow-xl ${
                    isFeatured
                      ? "bg-primary text-green-dark hover:bg-primary-dark shadow-primary/20"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {isFeatured ? "COMMENCER MAINTENANT" : t("home_subscriptions_choose")}
                </Link>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <Link to="/abonnement"
            className="inline-flex items-center gap-3 px-10 py-5 bg-white/5 border border-white/10 text-white rounded-3xl font-black text-[15px] hover:bg-white/10 transition-all hover:scale-105"
          >
            DÉCOUVRIR TOUS LES PLANS <i className="fa-solid fa-arrow-right text-[11px]" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ t, lang }) {
  const railRef = useRef(null);
  const barRef = useRef(null);
  const dotsRef = useRef(null);
  const indexRef = useRef(0);
  const timerRef = useRef(null);
  const scrollDuration = 5000;

  const renderRail = useCallback(() => {
    if (!railRef.current) return;
    railRef.current.innerHTML = testimonials.map((item, idx) => {
      const quote = t(item.quoteKey);
      const role = t(item.roleKey);
      return `
        <div class="w-full flex-shrink-0">
          <div class="p-8 md:p-14 relative min-h-[320px] flex flex-col justify-center">
            <div class="absolute top-6 right-10 text-6xl text-primary/10 select-none"><i class="fa-solid fa-quote-right"></i></div>
            <p class="text-lg text-textMain leading-relaxed mb-10 max-w-2xl font-medium italic">"${quote}"</p>
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 bg-green-dark rounded-full flex items-center justify-center text-white text-xl shadow-lg"><i class="fa-solid fa-user"></i></div>
              <div>
                <h4 class="font-bricolage font-black text-textMain uppercase tracking-tight">${item.author}</h4>
                <div class="flex items-center text-sm text-primary font-medium mt-0.5"><i class="${item.icon} mr-1.5 text-xs"></i>${role}</div>
              </div>
            </div>
          </div>
        </div>`;
    }).join("");
    updateDots();
  }, [t]);

  const updateDots = useCallback(() => {
    if (!dotsRef.current) return;
    dotsRef.current.innerHTML = testimonials
      .map((_, i) => `<div class="h-2 rounded-full transition-all duration-500 ${i === indexRef.current ? "bg-primary w-8" : "bg-borda w-2"}"></div>`)
      .join("");
  }, []);

  const goTo = useCallback((index) => {
    indexRef.current = index;
    if (railRef.current) {
      railRef.current.style.transform = `translateX(-${index * 100}%)`;
    }
    updateDots();
    resetBar();
  }, [updateDots]);

  const resetBar = useCallback(() => {
    if (!barRef.current) return;
    barRef.current.style.transition = "none";
    barRef.current.style.width = "0%";
    void barRef.current.offsetWidth;
    barRef.current.style.transition = `width ${scrollDuration}ms linear`;
    barRef.current.style.width = "100%";
  }, []);

  const next = useCallback(() => {
    goTo((indexRef.current + 1) % testimonials.length);
  }, [goTo]);

  useEffect(() => {
    renderRail();
    resetBar();
    timerRef.current = setInterval(next, scrollDuration);
    return () => clearInterval(timerRef.current);
  }, [renderRail, resetBar, next]);

  return (
    <section className="py-20 px-5 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-black uppercase tracking-widest mb-5 border border-primary/20">
            <i className="fa-solid fa-quote-left text-[10px]" /> {t("testimonials_badge")}
          </span>
          <h2 className="font-bricolage text-2xl md:text-3xl font-black text-textMain tracking-normal mb-4">{t("testimonials_title")}</h2>
          <p className="text-textMuted text-[14px] tracking-wide leading-relaxed">{t("testimonials_subtitle")}</p>
        </div>

        <div className="relative rounded-[32px] overflow-hidden shadow-xl border border-borda">
          <div id="testimonial-rail" ref={railRef} className="flex bg-white" style={{ transition: "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }} />
          <div className="absolute bottom-0 left-0 h-1 bg-borda w-full">
            <div ref={barRef} className="h-full bg-primary w-0" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-5 mt-8">
          <button
            onClick={() => goTo((indexRef.current - 1 + testimonials.length) % testimonials.length)}
            className="w-11 h-11 rounded-full border border-borda bg-white flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white text-textMuted transition-all"
          >
            <i className="fa-solid fa-chevron-left text-sm" />
          </button>
          <div ref={dotsRef} id="dots-container" className="flex items-center gap-2.5" />
          <button
            onClick={next}
            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-all shadow-lg shadow-primary/30"
          >
            <i className="fa-solid fa-chevron-right text-sm" />
          </button>
        </div>
      </div>
    </section>
  );
}

function TipsSection({ t }) {
  return (
    <section className="py-20 px-5 bg-primary relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
          <div className="lg:col-span-1">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 text-green-dark rounded-full text-[11px] font-black uppercase tracking-widest mb-6 border border-white/20">
              <i className="fa-solid fa-lightbulb text-[10px]" /> {t("home_tips_badge")}
            </span>
            <h2 className="font-bricolage text-2xl md:text-3xl font-black text-green-dark tracking-normal mb-6" dangerouslySetInnerHTML={{ __html: t("home_tips_title") }} />
            <p className="text-green-dark/70 text-[14px] leading-loose tracking-wide">{t("home_tips_desc")}</p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
            {tips.map((tip, i) => (
              <div key={i} className={`${i === 0 || i === 3 ? "bg-white" : "bg-white/80"} rounded-[24px] p-6 shadow-lg hover:-translate-y-2 transition-transform`}>
                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <i className={`${tip.icon} text-lg`} />
                </div>
                <h3 className="font-bricolage text-[17px] font-bold text-textMain mb-2">{t(tip.titleKey)}</h3>
                <p className="text-textMuted text-[13px]">{t(tip.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PartnersSection({ t }) {
  return (
    <section className="py-20 px-5 bg-surface2">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="font-bricolage text-2xl md:text-3xl font-black text-textMain tracking-normal mb-4">{t("home_partners_title")}</h2>
        <p className="text-textMuted mb-12 tracking-wide text-[14px]">{t("home_partners_desc")}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 justify-items-center">
          {partners.map((p, i) => (
            <div key={i} className="bg-white border border-borda rounded-[20px] p-6 w-full text-center hover:border-primary transition-all shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 text-primary text-xl">
                <i className={p.icon} />
              </div>
              <p className="font-bold text-textMain text-[12px] uppercase">{p.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AppDownloadSection({ t }) {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "#F4EFE6" }}>
      <div className="absolute inset-0" style={{ backgroundImage: "url('/src/assets/images/favicon.png')", backgroundRepeat: "repeat", backgroundSize: "32px 32px", opacity: 0.07, filter: "grayscale(1)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(244,239,230,0.7) 0%, rgba(244,239,230,0.4) 100%)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-5 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/15 border border-primary/20 rounded-full mb-8">
              <i className="fa-solid fa-mobile-screen text-primary text-xs" />
              <span className="text-xs font-black text-primary/90 uppercase tracking-widest">{t("home_app_badge")}</span>
            </div>

            <h2 className="font-bricolage text-3xl md:text-4xl lg:text-[2.8rem] font-black text-[#1A1A1A] leading-tight tracking-normal mb-8" dangerouslySetInnerHTML={{ __html: t("home_app_title") }} />

            <p className="text-[#1A1A1A]/60 text-[15px] leading-loose tracking-wide mb-10 max-w-md">{t("home_app_desc")}</p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <StoreBadge t={t} img="/src/assets/images/Playstore.png" label={t("home_app_available")} name={t("home_app_playstore")} />
              <AppStoreBadge t={t} />
            </div>

            <div className="flex items-center gap-5">
              <div className="bg-white p-2.5 rounded-2xl shadow-md w-20 h-20 flex items-center justify-center border border-[#EAE3D8]">
                <img src="/src/assets/images/qr_code.png" alt="QR Code" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="text-[#1A1A1A] font-bold text-[14px] mb-1">{t("home_app_qr")}</p>
                <p className="text-[#1A1A1A]/50 text-[12px] leading-relaxed">{t("home_app_qr_desc")}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center lg:justify-end">
            <img src="/src/assets/images/app_mockup.png" alt="DocMaster App" className="w-full max-w-md lg:max-w-lg h-auto object-contain" style={{ filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.15))" }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function StoreBadge({ t, img, label, name }) {
  return (
    <a href="https://play.google.com/store/apps/details?id=com.tesea.docmaster" target="_blank"
      className="flex items-center gap-3.5 bg-[#111111] hover:bg-[#222] px-5 py-3.5 rounded-2xl transition-colors w-fit"
    >
      <img src={img} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
      <div>
        <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5">{label}</p>
        <p className="text-white font-black text-[17px] leading-tight">{name}</p>
      </div>
    </a>
  );
}

function AppStoreBadge({ t }) {
  return (
    <span className="flex items-center gap-3.5 bg-[#111111] hover:bg-[#222] px-5 py-3.5 rounded-2xl transition-colors w-fit cursor-pointer">
      <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 814 1000" xmlns="http://www.w3.org/2000/svg">
        <path fill="white" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-43.4-148.4-107.7C27.3 740.9 0 647.3 0 559.4c0-235.7 154.1-360.4 305.8-360.4 78.8 0 144.5 51.9 194.4 51.9 47.7 0 121.9-55 212.9-55 34.2 0 101.7 4.1 163.8 63.3zm-226.1-199.8c32.4-38.5 55.6-91.9 55.6-145.3 0-7.6-.6-15.3-1.9-22.5-48 1.9-104.6 29.5-139.2 72.4-30.5 36.6-58.8 90-58.8 144.4 0 8.3 1.3 16.6 1.9 19.2 3.2.6 8.3 1.3 13.3 1.3 43.2 0 95.2-25.7 129.1-69.5z" />
      </svg>
      <div>
        <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5">{t("home_app_download")}</p>
        <p className="text-white font-black text-[17px] leading-tight">{t("home_app_appstore")}</p>
      </div>
    </span>
  );
}

function StickyAppBar({ t }) {
  const [visible, setVisible] = useState(() => {
    return localStorage.getItem("sticky-app-bar-closed") !== "true";
  });

  if (!visible) return null;

  return (
    <div id="sticky-app-bar"
      className="fixed bottom-0 left-0 right-0 z-50 w-full bg-[#111111] text-white px-5 py-4 md:py-5 shadow-2xl"
      style={{ animation: "slideUp .3s ease-out" }}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 relative">
        <button
          onClick={() => {
            setVisible(false);
            localStorage.setItem("sticky-app-bar-closed", "true");
          }}
          className="absolute -top-3 -right-3 sm:top-1/2 sm:-right-4 sm:-translate-y-1/2 w-7 h-7 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <i className="fa-solid fa-xmark text-white/70 text-sm" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-mobile-screen text-[#1E3A2F] text-lg" />
          </div>
          <p className="text-[13px] md:text-[15px] font-semibold text-white/90">
            {t("home_sticky_download")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href="https://play.google.com/store/apps/details?id=com.tesea.docmaster" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-primary text-[#1E3A2F] px-5 py-2.5 rounded-[14px] font-black text-[12px] md:text-[13px] hover:bg-primary-dark transition-all whitespace-nowrap active:scale-95"
          >
            <img src="/src/assets/images/Playstore.png" className="w-4 h-4 object-contain" alt="" /> {t("home_app_playstore")}
          </a>
          <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 text-white px-5 py-2.5 rounded-[14px] font-black text-[12px] md:text-[13px] hover:bg-white/20 transition-all whitespace-nowrap active:scale-95"
          >
            <i className="fa-brands fa-apple text-base" /> {t("home_app_appstore")}
          </a>
        </div>
      </div>
    </div>
  );
}
