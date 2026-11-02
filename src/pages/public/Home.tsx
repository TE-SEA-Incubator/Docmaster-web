import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { useToast } from "../../context/ToastContext";
import { subscriptionsService } from "../../services/subscriptionsService";
import { testimonialsService, type PublicTestimonial } from "../../services/testimonialsService";
import { levelFor } from "../../utils/testimonialLevels";
import { useGlobalStats } from "../../hooks/useGlobalStats";
import { useAuth } from "../../context/AuthContext";
import { useGoogleOneTap } from "../../hooks/useGoogleOneTap";
import { ProtectedDocumentImage } from "../../components/ui/ProtectedDocumentImage";
import { formatRetrouveTimeAgo } from "../../utils/dateHelpers";

import type { Plan } from "../../types/api";

const API_BASE = (import.meta as any).env?.VITE_API_URL || "/api/";

function getFullImageUrl(url?: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return window.location.origin + "/" + url.replace(/^\//, "");
}

const testimonials = [
  { author: "Marie NGUYEN", roleKey: "testimonial_1_role", quoteKey: "testimonial_1_quote", icon: "fas ph ph-briefcase" },
  { author: "Paul FOTSO", roleKey: "testimonial_2_role", quoteKey: "testimonial_2_quote", icon: "fas ph ph-chalkboard-teacher" },
  { author: "Sandra EKOTTO", roleKey: "testimonial_3_role", quoteKey: "testimonial_3_quote", icon: "ph ph-graduation-cap" },
];

const partners = [
  { icon: "fas ph ph-bank", label: "Préfecture" },
  { icon: "fas ph ph-identification-card", label: "CNI / Passeport" },
  { icon: "fas ph ph-graduation-cap", label: "Université" },
  { icon: "ph ph-building", label: "Centre National" },
  { icon: "ph ph-car", label: "Transports" },
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
  { icon: "ph ph-shield", bg: "bg-green-light", color: "text-green-mid", titleKey: "home_feature_secure", descKey: "home_feature_secure_desc" },
  { icon: "ph ph-lightning", bg: "bg-primary/10", color: "text-primary", titleKey: "home_feature_fast", descKey: "home_feature_fast_desc" },
  { icon: "ph ph-users", bg: "bg-blue-50", color: "text-blue-500", titleKey: "home_feature_community", descKey: "home_feature_community_desc" },
  { icon: "ph ph-device-mobile", bg: "bg-purple-50", color: "text-purple-500", titleKey: "home_feature_payment_title", descKey: "home_feature_payment_desc" },
];

const tips = [
  { icon: "ph ph-shield", titleKey: "home_tip_vigilance", descKey: "home_tip_vigilance_desc" },
  { icon: "ph ph-copy", titleKey: "home_tip_scan", descKey: "home_tip_scan_desc" },
  { icon: "ph ph-bell", titleKey: "home_tip_declare", descKey: "home_tip_declare_desc" },
  { icon: "ph ph-phone", titleKey: "home_tip_contacts", descKey: "home_tip_contacts_desc" },
];

const RADAR_NODE_POSITIONS = [
  "top-[-8px] left-1/2 -translate-x-1/2",
  "right-[-8px] top-1/2 -translate-y-1/2",
  "bottom-[-8px] left-1/2 -translate-x-1/2",
  "left-[-8px] top-1/2 -translate-y-1/2",
];

export default function Home() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { user } = useAuth();
  useGoogleOneTap();

  const [plans, setPlans] = useState<Plan[]>([]);
  const globalStats = useGlobalStats();

  useEffect(() => {
    subscriptionsService.getAllPlans().then((res) => {
      if (res.success && res.data) setPlans(res.data);
    }).catch(() => { toast.warning("Impossible de charger les plans d'abonnement"); });
  }, []);

  const statCounters = [
    { target: globalStats?.declared ?? 0, labelKey: "stat_declared", suffix: "", icon: "ph ph-file-text" },
    { target: globalStats?.recovered ?? 0, labelKey: "stat_recovered_label", suffix: "", icon: "ph ph-magnifying-glass" },
    { target: globalStats?.rate ?? 0, labelKey: "stat_rate", suffix: "%", icon: "ph ph-handshake" },
  ];

  return (
    <>
      <HeroSection t={t} stats={globalStats} />
      <RecentDocsSection t={t} />
      <HowItWorksSection t={t} />
      <MatchingSection t={t} />
      <WhyDocmasterSection t={t} />
      <VaultDeviceSection t={t} />
      {/* Les compteurs n'existent que si la base repond : aucun chiffre n'est avance sans lui. */}
      {globalStats && <StatsSection t={t} statCounters={statCounters} />}
      <WalletRewardsSection t={t} />
      <ReferralSection t={t} />
       <SubscriptionsTeaser t={t} plans={plans} />
      <TestimonialsSection t={t} lang={lang} />
      <TipsSection t={t} />
      <PartnersSection t={t} />
      <AppDownloadSection t={t} />
    {/*<StickyAppBar t={t} />*/}
    </>
  );
}

/* ─── Images locales pour le carousel hero ─── */
const docImagesLeft = [
  { src: "/src/assets/images/images.jpg",        alt: "Carte Nationale d'Identité" },
  { src: "/src/assets/images/permis.jpg",        alt: "Permis de conduire" },
  { src: "/src/assets/images/bacc.png",          alt: "Baccalauréat" },
  { src: "/src/assets/images/1.png",             alt: "Document officiel" },
  { src: "/src/assets/images/cni-poubelle.jpeg", alt: "CNI retrouvée" },
];

const docImagesRight = [
  { src: "/src/assets/images/passport.png", alt: "Passeport" },
  { src: "/src/assets/images/bacc.png",     alt: "Diplôme" },
  { src: "/src/assets/images/images.jpg",   alt: "Carte d'identité" },
  { src: "/src/assets/images/permis.jpg",   alt: "Permis" },
  { src: "/src/assets/images/1.png",        alt: "Document officiel" },
];

function DocImageCard({ src, alt }: { src: string; alt: string; [k: string]: unknown }) {
  return (
    <div
      className="w-[180px] flex-shrink-0 rounded-3xl overflow-hidden"
      style={{
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        border: "1px solid rgba(234,227,216,0.6)",
        background: "#fffbf6",
      }}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-[115px] object-cover"
        draggable={false}
        style={{
          filter: "contrast(1.05) saturate(1.1)"
        }}
      />
      {/* Bande basse très soft */}
      <div className="px-3 py-2.5" style={{ background: "#fffbf6" }}>
        <div className="h-1.5 rounded-full w-3/4 mb-1.5" style={{ background: "rgba(26,26,26,0.08)" }} />
        <div className="h-1.5 rounded-full w-1/2"         style={{ background: "rgba(26,26,26,0.05)" }} />
      </div>
    </div>
  );
}

function VerticalImgCarousel({ items, duration = 30, reversed = false }: {
  items: { src: string; alt: string }[];
  duration?: number;
  reversed?: boolean;
}) {
  const doubled = [...items, ...items];
  const cls = reversed ? "carousel-up-reverse" : "carousel-up";
  return (
    <div
      className="relative overflow-hidden h-[600px] w-[180px]"
      style={{
        maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
      }}
    >
      <div className={`flex flex-col gap-4 ${cls}`} style={{ animationDuration: `${duration}s` }}>
        {doubled.map((d, i) => (
          <DocImageCard key={i} src={d.src} alt={d.alt} />
        ))}
      </div>
    </div>
  );
}

function HeroSection({ t, stats }) {
  const svgBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Cpath fill='%23e8923a' fill-opacity='0.18' d='M600 325.1v-1.17c-6.5 3.83-13.06 7.64-14.68 8.64-10.6 6.56-18.57 12.56-24.68 19.09-5.58 5.95-12.44 10.06-22.42 14.15-1.45.6-2.96 1.2-4.83 1.9l-4.75 1.82c-9.78 3.75-14.8 6.27-18.98 10.1-4.23 3.88-9.65 6.6-16.77 8.84-1.95.6-3.99 1.17-6.47 1.8l-6.14 1.53c-5.29 1.35-8.3 2.37-10.54 3.78-3.08 1.92-6.63 3.26-12.74 5.03a384.1 384.1 0 0 1-4.82 1.36c-2.04.58-3.6 1.04-5.17 1.52a110.03 110.03 0 0 0-11.2 4.05c-2.7 1.15-5.5 3.93-8.78 8.4a157.68 157.68 0 0 0-6.15 9.2c-5.75 9.07-7.58 11.74-10.24 14.51a50.97 50.97 0 0 1-4.6 4.22c-2.33 1.9-10.39 7.54-11.81 8.74a14.68 14.68 0 0 0-3.67 4.15c-1.24 2.3-1.9 4.57-2.78 8.87-2.17 10.61-3.52 14.81-8.2 22.1-4.07 6.33-6.8 9.88-9.83 12.99-.47.48-.95.96-1.5 1.48l-3.75 3.56c-1.67 1.6-3.18 3.12-4.86 4.9a42.44 42.44 0 0 0-9.89 16.94c-2.5 8.13-2.72 15.47-1.76 27.22.47 5.82.51 6.36.51 8.18 0 10.51.12 17.53.63 25.78.24 4.05.56 7.8.97 11.22h.9c-1.13-9.58-1.5-21.83-1.5-37 0-1.86-.04-2.4-.52-8.26-.94-11.63-.72-18.87 1.73-26.85a41.44 41.44 0 0 1 9.65-16.55c1.67-1.76 3.18-3.27 4.83-4.85.63-.6 3.13-2.96 3.75-3.57a71.6 71.6 0 0 0 1.52-1.5c3.09-3.16 5.86-6.76 9.96-13.15 4.77-7.42 6.15-11.71 8.34-22.44.86-4.21 1.5-6.4 2.68-8.6.68-1.25 1.79-2.48 3.43-3.86 1.38-1.15 9.43-6.8 11.8-8.72 1.71-1.4 3.26-2.81 4.7-4.3 2.72-2.85 4.56-5.54 10.36-14.67a156.9 156.9 0 0 1 6.1-9.15c3.2-4.33 5.9-7.01 8.37-8.07 3.5-1.5 7.06-2.77 11.1-4.02a233.84 233.84 0 0 1 7.6-2.2l2.38-.67c6.19-1.79 9.81-3.16 12.98-5.15 2.14-1.33 5.08-2.33 10.27-3.65l6.14-1.53c2.5-.63 4.55-1.2 6.52-1.82 7.24-2.27 12.79-5.06 17.15-9.05 4.05-3.72 9-6.2 18.66-9.9l4.75-1.82c1.87-.72 3.39-1.31 4.85-1.91 10.1-4.15 17.07-8.32 22.76-14.4 6.05-6.45 13.95-12.4 24.49-18.92 1.56-.96 7.82-4.6 14.15-8.33v-64.58c-4 8.15-8.52 14.85-12.7 17.9-2.51 1.82-5.38 4.02-9.04 6.92a1063.87 1063.87 0 0 0-6.23 4.98l-1.27 1.02a2309.25 2309.25 0 0 1-4.87 3.9c-7.55 6-12.9 10.05-17.61 13.19-3.1 2.06-3.86 2.78-8.06 7.13-5.84 6.07-11.72 8.62-29.15 10.95-11.3 1.5-20.04 4.91-30.75 11.07-1.65.94-7.27 4.27-6.97 4.1-2.7 1.58-4.69 2.69-6.64 3.66-5.63 2.8-10.47 4.17-15.71 4.17-17.13 0-41.44 11.51-51.63 22.83-12.05 13.4-31.42 27.7-45.25 31.16-7.4 1.85-11.85 7.05-14.04 14.69-1.26 4.4-1.58 8.28-1.58 13.82 0 .82.01.98.24 3.63.45 5.18.35 8.72-.77 13.26-1.53 6.2-4.89 12.6-10.59 19.43-13.87 16.65-22.88 46.58-22.88 71.68 0 2.39.02 4.26.06 8.75.12 10.8.1 15.8-.22 21.95-.56 11.18-2.09 20.73-5 29.3h-1.05c2.94-8.56 4.49-18.12 5.05-29.35.31-6.13.34-11.1.22-21.9-.04-4.48-.06-6.36-.06-8.75 0-25.32 9.07-55.47 23.12-72.32 5.6-6.72 8.88-12.99 10.38-19.03 1.09-4.4 1.18-7.85.74-12.93-.23-2.7-.24-2.86-.24-3.72 0-5.62.32-9.57 1.62-14.1 2.28-7.95 6.97-13.44 14.76-15.39 13.6-3.4 32.82-17.59 44.75-30.84C409 360.14 433.58 348.5 451 348.5c5.07 0 9.77-1.33 15.26-4.07 1.93-.96 3.9-2.05 6.58-3.62-.3.18 5.33-3.16 6.98-4.11 10.82-6.21 19.66-9.67 31.11-11.2 17.23-2.3 22.9-4.75 28.57-10.64 4.25-4.41 5.04-5.16 8.22-7.28 4.68-3.11 10.01-7.14 17.55-13.14a1113.33 1113.33 0 0 0 4.86-3.89l1.28-1.02a4668.54 4668.54 0 0 1 6.23-4.98c3.67-2.9 6.55-5.12 9.07-6.95 4.37-3.19 9.16-10.56 13.29-19.4v66.9zm0-116.23c-.62.01-1.27.06-1.95.13-6.13.63-13.83 3.45-21.83 7.45-3.64 1.82-8.46 2.67-14.17 2.71-4.7.04-9.72-.47-14.73-1.33-1.7-.3-3.26-.61-4.67-.93a31.55 31.55 0 0 0-3.55-.57 273.4 273.4 0 0 0-16.66-.88c-10.42-.16-17.2.74-17.97 2.73-.38.97.6 2.55 3.03 4.87 1.01.97 2.22 2.03 4.04 3.55a1746.07 1746.07 0 0 0 4.79 4.02c1.39 1.2 3.1 1.92 5.5 2.5.7.16.86.2 2.64.54 3.53.7 5.03 1.25 6.15 2.63 1.41 1.76 1.4 4.54-.15 8.88-2.44 6.83-5.72 10.05-10.19 10.33-3.63.23-7.6-1.29-14.52-5.06-4.53-2.47-6.82-7.3-8.32-15.26-.17-.87-.32-1.78-.5-2.86l-.43-2.76c-1.05-6.58-1.9-9.2-3.73-10.11-.81-.4-1.59-.74-2.36-1-2.27-.77-4.6-1.02-8.1-.92-2.29.07-14.7 1-13.77.93-20.55 1.37-28.8 5.05-37.09 14.99a133.07 133.07 0 0 0-4.25 5.44l-2.3 3.09-2.51 3.32c-4.1 5.36-7.06 8.48-10.39 11.12-.65.52-1.33 1.04-2.13 1.62l-4.11 2.94a106.8 106.8 0 0 0-5.16 3.99c-4.55 3.74-9.74 8.6-16.25 15.38-8.25 8.58-11.78 13.54-11.7 15.95.07 1.65 1.64 2.11 6.79 2.38 1.61.09 2.15.12 2.98.2 2.95.24 5.09.73 6.81 1.68 7.48 4.15 11.63 7.26 13.95 11.58 3.3 6.15.8 12.88-8.89 20.26-8.28 6.3-11.1 10.37-11.31 14.96-.06 1.17 0 1.93.26 4.43.69 6.47.25 10.65-2.8 17.42a44.23 44.23 0 0 1-4.16 7.53c-2.82 3.97-5.47 5.74-10.6 7.69-.43.16-3.34 1.23-4.27 1.59-1.8.68-3.38 1.36-5.01 2.14-4.18 2-8.4 4.6-13.1 8.24-8.44 6.51-13.23 14.56-15.98 25.06-1.1 4.2-1.55 6.81-2.8 15.21-1.26 8.6-2.17 12.64-4.08 16.55-2.1 4.28-11.93 26.59-12.97 28.88a382.7 382.7 0 0 1-6.37 13.41c-4.07 8.11-7.61 14.07-10.73 17.81-5.38 6.46-8.98 14.37-13.77 28.42a810.14 810.14 0 0 0-1.89 5.6c-1.8 5.35-2.96 8.6-4.26 11.85-6.13 15.32-25.43 26.31-46.46 26.31-11.2 0-20.58-2.74-31.02-8.55-5.6-3.13-4.55-2.42-22.26-14.54-14.33-9.8-17.7-10.73-20.47-6.9-.37.5-1.81 2.74-1.83 2.77a52.24 52.24 0 0 1-4.94 5.9c-.73.79-5.52 5.87-6.97 7.45-2.38 2.6-4.3 4.81-5.98 6.93a45.6 45.6 0 0 0-5.08 7.66c-1.29 2.57-1.9 5.25-2.66 10.6a997.6 997.6 0 0 1-.46 3.18h-1l.47-3.32c.77-5.45 1.4-8.2 2.75-10.9a46.54 46.54 0 0 1 5.2-7.84c1.7-2.14 3.63-4.38 6.03-6.98 1.45-1.59 6.24-6.68 6.96-7.46a51.58 51.58 0 0 0 4.84-5.78s1.47-2.26 1.86-2.8c3.25-4.5 7.08-3.44 21.84 6.67 17.67 12.08 16.62 11.38 22.19 14.48 10.3 5.73 19.5 8.43 30.53 8.43 20.65 0 39.57-10.77 45.54-25.69a219.7 219.7 0 0 0 4.24-11.8 6752.32 6752.32 0 0 0 1.88-5.6c4.83-14.16 8.47-22.14 13.96-28.73 3.05-3.66 6.56-9.57 10.6-17.61 1.97-3.93 4.04-8.31 6.35-13.38 1.03-2.28 10.88-24.61 12.98-28.91 1.85-3.79 2.75-7.76 4-16.25 1.24-8.44 1.7-11.07 2.81-15.32 2.8-10.7 7.71-18.94 16.33-25.6a73.18 73.18 0 0 1 13.29-8.35c1.66-.8 3.27-1.48 5.08-2.18.94-.36 3.86-1.43 4.28-1.59 4.95-1.88 7.44-3.55 10.14-7.33 1.35-1.9 2.68-4.3 4.06-7.37 2.97-6.58 3.39-10.59 2.72-16.9a27.13 27.13 0 0 1-.27-4.58c.22-4.94 3.21-9.24 11.7-15.7 9.33-7.11 11.66-13.34 8.62-19-2.2-4.09-6.25-7.12-13.55-11.17-1.57-.88-3.6-1.33-6.42-1.57-.8-.07-1.34-.1-2.95-.19-5.77-.3-7.63-.85-7.72-3.34-.1-2.81 3.5-7.87 11.97-16.69 6.53-6.8 11.75-11.69 16.33-15.45 1.79-1.47 3.42-2.72 5.2-4.03l4.12-2.94c.79-.58 1.46-1.08 2.1-1.59 3.26-2.6 6.16-5.65 10.21-10.94a383.2 383.2 0 0 0 2.5-3.32l2.31-3.09c1.8-2.39 3.04-4 4.29-5.48 8.47-10.17 16.98-13.96 37.27-15.3-.44.02 12-.9 14.32-.98 3.62-.1 6.05.16 8.46.98.8.27 1.62.62 2.47 1.04 2.27 1.14 3.17 3.87 4.27 10.85l.44 2.76c.17 1.07.33 1.97.5 2.83 1.44 7.69 3.62 12.29 7.8 14.57 6.76 3.68 10.6 5.15 13.99 4.94 4-.25 6.99-3.17 9.3-9.67 1.45-4.04 1.46-6.49.32-7.92-.9-1.12-2.28-1.62-5.57-2.27a55.8 55.8 0 0 1-2.67-.55c-2.54-.6-4.39-1.4-5.93-2.71a252.63 252.63 0 0 0-4.78-4.01 84.35 84.35 0 0 1-4.08-3.6c-2.73-2.6-3.86-4.43-3.28-5.95 1.02-2.64 7.82-3.54 18.93-3.37a230.56 230.56 0 0 1 16.73.88c2.76.39 3.2.49 3.68.6 1.4.3 2.95.62 4.62.91a82.9 82.9 0 0 0 14.56 1.32c5.56-.04 10.24-.86 13.73-2.6 8.1-4.05 15.89-6.9 22.17-7.56.7-.07 1.4-.11 2.05-.13v1zm0-100.94v1.5c-8.62 16.05-17.27 29.55-23.65 35.92-3.19 3.2-7.62 4.9-13.54 5.56-4.45.48-8.28.4-19.18-.2-9.91-.55-15.32-.44-20.52.78a84.05 84.05 0 0 1-15 2.11l-2.25.14c-12.49.75-19.37 1.78-32.72 5.74-4.5 1.33-9.27 2.49-14.3 3.48a246.27 246.27 0 0 1-32.6 3.97c-7.56.45-13.21.57-20.24.57-5.4 0-11.9 1.61-18 5.18-8.3 4.87-15.06 12.87-19.53 24.5a68.57 68.57 0 0 1-4.56 9.8c-3.6 6.2-6.92 8.99-13.38 12.18l-4.03 1.96a64.48 64.48 0 0 0-15.16 10.25c-8.2 7.33-13.72 16.63-22.54 35.6l-2.08 4.49c-7.3 15.7-11.5 23.3-17.35 29.87-7.7 8.66-20.25 14.42-40.31 20.08-4.37 1.23-19.04 5.08-19.24 5.13-6.92 1.87-11.68 3.34-15.63 4.92-10.55 4.22-18.71 10.52-36.38 26.52l-1.7 1.54c-8.58 7.76-13.41 11.9-18.81 15.88-3.95 2.9-8 5.67-12.97 8.91-2.06 1.34-10.3 6.6-12.33 7.94-11.52 7.5-18.53 13.04-24.62 20.08a62.01 62.01 0 0 0-6.44 8.85c-4.13 6.91-6.27 13.15-9.2 25.11l-1.54 6.26c-.6 2.45-1.15 4.54-1.72 6.58-2.97 10.7-6.9 17.36-14.78 26.91L69.6 491a148.51 148.51 0 0 0-4.19 5.3 23.9 23.9 0 0 0-3.44 6.28c-1.16 3.23-1.52 5.9-1.87 11.94-.58 10.05-1.42 15.04-4.63 22.67-1.57 3.72-5.66 14.02-6.41 15.8a73.46 73.46 0 0 1-3.57 7.4c-2.88 5.14-6.71 10.12-13.12 16.95-5.96 6.36-8.87 10.9-10.61 16a56.88 56.88 0 0 0-1.38 4.82l-.46 1.84h-1.03l.52-2.08c.52-2.09.92-3.49 1.4-4.9 1.8-5.25 4.78-9.9 10.84-16.36 6.35-6.78 10.13-11.7 12.97-16.77a72.5 72.5 0 0 0 3.52-7.29c.75-1.76 4.84-12.06 6.4-15.8 3.17-7.5 3.99-12.4 4.56-22.33.35-6.14.72-8.88 1.93-12.23a24.9 24.9 0 0 1 3.58-6.54c1.27-1.7 2.6-3.37 4.22-5.34l4.11-4.95c7.8-9.46 11.66-16 14.59-26.54.56-2.04 1.1-4.12 1.71-6.56l1.53-6.26c2.96-12.04 5.13-18.36 9.32-25.39 1.84-3.08 4-6.05 6.54-8.99 6.17-7.12 13.24-12.7 24.83-20.26 2.05-1.33 10.28-6.6 12.33-7.94 4.96-3.22 9-5.98 12.92-8.87 5.37-3.95 10.19-8.08 18.74-15.82l1.7-1.54c17.76-16.09 25.98-22.43 36.67-26.7 4-1.6 8.8-3.09 15.75-4.96.21-.06 14.87-3.9 19.22-5.13 19.9-5.61 32.32-11.31 39.85-19.78 5.76-6.48 9.93-14.02 17.18-29.64l2.09-4.5c8.87-19.07 14.44-28.46 22.77-35.9a65.48 65.48 0 0 1 15.38-10.4l4.04-1.97c6.3-3.1 9.47-5.77 12.96-11.77a67.6 67.6 0 0 0 4.48-9.67c4.56-11.84 11.47-20.02 19.97-25 6.25-3.66 12.93-5.32 18.5-5.32 7.01 0 12.65-.12 20.17-.57a245.3 245.3 0 0 0 32.47-3.96c5-.98 9.75-2.13 14.22-3.45 13.43-3.98 20.38-5.02 32.94-5.78l2.24-.14c5.76-.37 9.8-.9 14.85-2.09 5.31-1.25 10.79-1.35 22.6-.7 9.04.5 12.84.58 17.21.1 5.71-.62 9.94-2.26 12.95-5.26 6.44-6.45 15.3-20.37 24.35-36.72zm0 450.21c-1.28-4.6-2.2-10.55-3.33-20.25l-.24-2.04-.23-2.03c-1.82-15.7-3.07-21.98-5.55-24.47-2.46-2.46-3.04-5.03-2.52-8.64.1-.6.18-1.1.39-2.15.69-3.54.77-5.04.08-6.84-.91-2.38-3.31-4.41-7.79-6.26-5.08-2.09-6.52-4.84-4.89-8.44.66-1.45 1.79-3.02 3.52-5.01 1.04-1.2 5.48-5.96 5.08-5.53 6.15-6.7 8.98-11.34 8.98-16.48a15.2 15.2 0 0 1 6.5-12.89v1.26a14.17 14.17 0 0 0-5.5 11.63c0 5.47-2.93 10.29-9.24 17.16.38-.42-4.04 4.33-5.07 5.5-1.67 1.93-2.75 3.43-3.36 4.77-1.37 3.04-.23 5.22 4.36 7.1 4.71 1.95 7.32 4.16 8.34 6.83.78 2.04.7 3.67-.03 7.4-.2 1.03-.3 1.51-.38 2.09-.48 3.33.03 5.59 2.23 7.8 2.74 2.74 3.98 8.96 5.84 25.06l.24 2.03.23 2.04c.82 7.01 1.53 12.06 2.34 16.03v4.33zm0-62.16c-1.4-3.13-4.43-9.9-4.95-11.17-1.02-2.53-1.25-3.8-.91-5.18.2-.84 2.05-4.68 2.32-5.33a70.79 70.79 0 0 0 3.54-11.2v3.99a62.82 62.82 0 0 1-2.62 7.6c-.31.75-2.09 4.46-2.27 5.18-.28 1.12-.08 2.22.87 4.57.41 1.02 2.5 5.7 4.02 9.09v2.45zm0-85.09c-1.65 1.66-3.66 2.9-6.4 4.13-.25.1-13.97 5.47-20.4 8.43-9.35 4.32-16.7 5.9-23.03 5.25-5.08-.53-9.02-2.25-14.77-5.92l-3.2-2.07a77.4 77.4 0 0 0-5.44-3.27c-4.05-2.18-3.25-5.8 1.47-10.47 3.71-3.68 9.6-7.93 18.73-13.8l4.46-2.82c17.95-11.33 18.22-11.5 22.27-14.74 11.25-9 19.69-14.02 26.31-15.1v1.02c-6.37 1.1-14.62 6-25.69 14.86-4.1 3.28-4.34 3.44-22.36 14.8a652.4 652.4 0 0 0-4.45 2.83c-9.07 5.83-14.92 10.05-18.57 13.66-4.31 4.28-4.95 7.13-1.7 8.88 1.7.91 3.29 1.88 5.5 3.3l3.2 2.08c5.64 3.59 9.45 5.25 14.34 5.76 6.13.64 13.32-.9 22.52-5.15 6.46-2.98 20.18-8.35 20.4-8.44 3.04-1.37 5.1-2.71 6.81-4.69v1.47zm0-41.37v1c-6.56.26-12.11 3.13-19.71 9.08l-4.63 3.68a51.87 51.87 0 0 1-4.4 3.14c-.82.52-5.51 3.33-6.22 3.76-3.31 2-6.15 3.8-8.87 5.6a112.61 112.61 0 0 0-8.16 5.92c-4.61 3.72-7.4 6.9-7.97 9.35-.63 2.67 1.48 4.53 7.05 5.46 10.7 1.78 20.92-.05 30.45-4.65a61.96 61.96 0 0 0 17.1-12.2 41.8 41.8 0 0 0 5.36-7.42v1.92a38.94 38.94 0 0 1-4.64 6.19 62.95 62.95 0 0 1-17.39 12.41c-9.7 4.68-20.13 6.55-31.05 4.73-6.06-1-8.65-3.29-7.85-6.67.64-2.74 3.53-6.05 8.31-9.9 2.35-1.9 5.1-3.88 8.24-5.97 2.73-1.82 5.58-3.61 8.9-5.62.72-.44 5.4-3.24 6.22-3.75 1.26-.8 2.6-1.76 4.3-3.09.8-.62 3.9-3.1 4.63-3.67 7.77-6.1 13.49-9.04 20.33-9.3zm0-154.6v1c-1.75-.24-4.3.23-7.82 1.55-10.01 3.75-13.8 5.07-19.15 6.76-1.78.56-2.63.83-3.87 1.24-1.48.5-3.16.76-6.74 1.16a1550.34 1550.34 0 0 0-2.64.3c-7.8.94-11.28 2.47-11.28 6.07 0 4.45 2.89 13.18 7.96 25.81a57.34 57.34 0 0 1 2.33 7.6 258.32 258.32 0 0 1 .84 3.46c1.86 7.62 3.17 10.71 5.56 11.67 2.21.88 4.7.6 7.47-.72 3.48-1.69 7.22-4.94 11.2-9.47 1.52-1.7 2.97-3.49 4.59-5.57l3.16-4.1c2.59-3.23 6.07-12.21 8.39-20.23v3.45c-2.29 7.2-5.27 14.5-7.61 17.41-.44.55-2.67 3.46-3.15 4.09-1.63 2.1-3.1 3.9-4.62 5.62-4.08 4.61-7.9 7.94-11.53 9.7-2.99 1.44-5.77 1.75-8.28.74-2.84-1.13-4.2-4.34-6.15-12.35a2097.48 2097.48 0 0 1-.84-3.46c-.8-3.2-1.47-5.45-2.28-7.46-5.14-12.8-8.04-21.55-8.04-26.19 0-4.37 3.84-6.06 12.16-7.07a160.9 160.9 0 0 1 2.65-.3c3.5-.39 5.15-.64 6.53-1.1 1.26-.42 2.1-.7 3.88-1.26 5.34-1.68 9.11-3 19.1-6.74 3.53-1.32 6.22-1.84 8.18-1.61zM0 292c10.13-11.31 18.13-23.2 23.07-35.39 3.3-8.14 6.09-16.12 10.81-30.55l1.59-4.84c6.53-19.94 10.11-29.82 14.77-39.56 6.07-12.72 12.55-21.18 20.27-25.54 6.66-3.76 10.2-7.86 12.22-13.15a46.6 46.6 0 0 0 1.86-6.58c1.23-5.2 2.05-7.59 3.93-10.36 2.45-3.62 6.27-6.53 12.1-8.96 15.78-6.58 16.73-7.04 18.05-9.01.65-.98.83-2.15.74-4.51-.03-.73-.23-3.82-.24-4A93.8 93.8 0 0 1 119 94c0-10.04.18-11.37 2.37-13.15.52-.42 1.13-.8 2.07-1.3.27-.14 2.18-1.12 2.84-1.48a68.4 68.4 0 0 0 9.12-5.87c2.06-1.54 2.64-2.14 8.01-7.93 3.78-4.09 6.21-6.36 8.96-8.12 3.64-2.33 7.2-3.12 10.9-2.11 4.4 1.2 10.81 2 18.78 2.46 6.9.4 12.9.5 21.95.5 4.87 0 8.97.47 15.4 1.57 7.77 1.33 9.3 1.54 12.38 1.54 4.05 0 7.43-.88 10.68-2.95 5.06-3.22 8.11-4.67 11.2-5.2 3.62-.64 4.77-.46 16.55 2.06 17.26 3.7 30.85 1.36 41.06-9.7 5.1-5.53 5.48-8.9 3.48-14.8-.83-2.42-1.03-3.1-1.17-4.3-.29-2.52.5-4.71 2.71-6.93 2.65-2.65 4.72-9.17 6.22-18.29h2.03c-1.56 9.71-3.77 16.65-6.83 19.7-1.79 1.8-2.36 3.39-2.14 5.28.11 1 .3 1.63 1.07 3.9 2.22 6.53 1.76 10.66-3.9 16.8-10.77 11.66-25.07 14.13-42.95 10.3-11.42-2.45-12.55-2.62-15.78-2.06-2.77.48-5.62 1.84-10.47 4.92a20.93 20.93 0 0 1-11.76 3.27c-3.25 0-4.81-.22-12.73-1.57C212.74 59.46 208.73 59 204 59c-9.1 0-15.11-.1-22.07-.5-8.09-.47-14.62-1.29-19.2-2.54-5.62-1.53-10.17 1.38-17.85 9.66-5.5 5.94-6.08 6.53-8.28 8.18a70.38 70.38 0 0 1-9.38 6.03c-.68.37-2.58 1.35-2.84 1.49-.84.44-1.35.76-1.75 1.08C121.16 83.6 121 84.8 121 94c0 1.85.06 3.54.17 5.44 0 .17.2 3.28.24 4.03.1 2.75-.13 4.29-1.08 5.71-1.67 2.5-2.27 2.8-18.95 9.74-5.48 2.29-8.99 4.96-11.2 8.24-1.71 2.51-2.47 4.73-3.64 9.7-.83 3.5-1.21 4.92-1.94 6.83-2.18 5.73-6.05 10.19-13.1 14.18-7.3 4.12-13.55 12.28-19.46 24.66-4.6 9.64-8.17 19.46-14.67 39.32l-1.58 4.84c-4.75 14.47-7.54 22.48-10.86 30.69-5.28 13.01-13.95 25.65-24.93 37.6v-2.97z'%3E%3C/path%3E%3C/svg%3E")`;

  return (
    <section
      className="relative overflow-hidden min-h-screen flex items-center pt-[68px]"
      style={{
        backgroundColor: "#fffbf6",
        backgroundImage: svgBg,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <style>{`
        @keyframes carousel-up {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes carousel-up-reverse {
          0%   { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
        .carousel-up {
          animation: carousel-up linear infinite;
        }
        .carousel-up-reverse {
          animation: carousel-up-reverse linear infinite;
        }
        @keyframes hero-fadein {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-fadein { animation: hero-fadein 0.7s ease forwards; }
      `}</style>

      <div className="relative z-10 max-w-7xl mx-auto px-5 py-16 lg:py-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-8 lg:gap-12 items-center">

          {/* ── Colonne gauche : carousel descendant ── */}
          <div className="hidden lg:block" style={{ marginTop: "60px" }}>
            <VerticalImgCarousel
              items={docImagesLeft}
              duration={34}
              reversed={false}
            />
          </div>

          {/* ── Centre : copy ── */}
          <div className="hero-fadein text-center mx-auto max-w-xl">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-primary/15 border border-primary/15 rounded-full mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest">{t("hero_badge")}</span>
            </div>

            <h1 className="font-bricolage text-[2.2rem] sm:text-[2.6rem] lg:text-[3.2rem] font-extrabold text-textMain leading-tight tracking-normal mb-8">
              {t("hero_title_1")}<br />
              {t("hero_title_2")}<br />
              <span style={{
                background: "linear-gradient(90deg, #E8923A, #FFD580, #E8923A)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "shimmer 3s linear infinite",
              }}>{t("hero_title_3")}</span>
            </h1>

            <p className="text-textMuted text-[15px] leading-loose mb-10 tracking-wide">{t("hero_desc")}</p>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
              <Link
                to="/login"
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-primary text-white rounded-[18px] font-black text-[15px] shadow-xl shadow-primary/40 hover:bg-primary-dark transition-all hover:-translate-y-1 active:scale-95"
              >
                <i className="ph ph-file-plus" /> {t("btn_declare_loss")}
              </Link>
              <Link
                to="/rechercher"
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-white border border-borderMain text-textMain rounded-[18px] font-bold text-[15px] hover:bg-white/80 transition-all hover:-translate-y-1 active:scale-95 shadow-sm"
              >
                <i className="ph ph-magnifying-glass" /> {t("btn_search")}
              </Link>
            </div>

            {!!stats && (
              <div className="flex flex-wrap items-center justify-center gap-6">
                <MiniStat icon="ph ph-file-text" value={stats.declared.toLocaleString("fr-FR")} label={t("home_mini_declared")} />
                <div className="w-px h-8 bg-borderMain" />
                <MiniStat icon="ph ph-magnifying-glass" value={stats.recovered.toLocaleString("fr-FR")} label={t("home_mini_found")} />
                <div className="w-px h-8 bg-borderMain" />
                <MiniStat icon="ph ph-handshake" value={`${stats.rate}%`} label={t("stat_rate")} />
              </div>
            )}
          </div>

          {/* ── Colonne droite : carousel montant ── */}
          <div className="hidden lg:block" style={{ marginTop: "-40px" }}>
            <VerticalImgCarousel
              items={docImagesRight}
              duration={28}
              reversed={true}
            />
          </div>
        </div>
      </div>

      {/* scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-textMuted/40 animate-bounce">
        <span className="text-[10px] font-bold uppercase tracking-widest">{t("home_how_title")}</span>
        <i className="ph ph-caret-down text-xs" />
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


interface RecentDoc {
  id: string | number;
  score?: number;
  type_doc?: string;
  document_type?: string;
  doc_type?: string;
  document_type_id?: string;
  doc_type_id?: string;
  docTypeInfo?: { nom: string; code?: string };
  nom_sur_doc?: string;
  nom_complet?: string;
  owner_name?: string;
  document_owner?: string;
  numero_doc?: string;
  document_number?: string;
  numero_document?: string;
  photo_recto?: string;
  photo?: string;
  image_url?: string;
  created_at?: string;
  date_trouvee?: string;
  date_trouvaille?: string;
  location?: string;
  ville?: string;
  city?: string;
  pays?: string;
  country?: string;
  declaration_id?: string;
  counterPart?: boolean;
}

function RecentDocsSection({ t }: { t: (key: string, params?: any) => string }) {
  const { lang } = useI18n();
  const { user } = useAuth();
  const [docs, setDocs] = useState<RecentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [docTypes, setDocTypes] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}document-types/active`, { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setDocTypes(data.data);
        }
      })
      .catch(() => {});

    fetch(`${API_BASE}declarations/search-public`, { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((data) => setDocs((data.data || []).slice(0, 12)))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  const docTypeMap = useMemo(() => {
    const map: Record<string, string> = {
      cni: "Carte Nationale d'Identité",
      passport: "Passeport",
      permis: "Permis de conduire",
      diplome: "Diplôme",
      acte: "Acte de naissance",
      acte_naissance: "Acte de naissance",
      acte_mariage: "Acte de mariage",
      carte_grise: "Carte grise",
      carte_sejour: "Carte de séjour",
      carte_vote: "Carte d'électeur",
    };
    docTypes.forEach((dt: any) => {
      if (dt.id && dt.nom) map[dt.id] = dt.nom;
      if (dt.code && dt.nom) {
        map[dt.code] = dt.nom;
        map[dt.code.toLowerCase()] = dt.nom;
      }
    });
    return map;
  }, [docTypes]);

  const getDocType = (doc: RecentDoc): string => {
    if (doc.docTypeInfo?.nom) return doc.docTypeInfo.nom;

    const typeId = doc.document_type_id || doc.doc_type_id;
    if (typeId && docTypeMap[typeId]) return docTypeMap[typeId];

    const raw = doc.document_type || doc.type_doc || doc.doc_type || "";
    if (!raw) return t("rechercher_document") || "Document";

    if (docTypeMap[raw]) return docTypeMap[raw];
    if (docTypeMap[raw.toLowerCase()]) return docTypeMap[raw.toLowerCase()];

    // Ne jamais exposer d'ID brut (UUID, ObjectId ou identifiant numérique)
    const isIdLike =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw) ||
      /^[0-9a-f]{24}$/i.test(raw) ||
      /^\d+$/.test(raw);

    if (isIdLike) {
      return t("rechercher_document") || "Document";
    }

    return raw;
  };

  const getPhoto = (doc: RecentDoc) => doc.photo_recto || doc.photo || doc.image_url || "";

  const getOwnerName = (doc: RecentDoc): string =>
    doc.document_owner || doc.owner_name || doc.nom_sur_doc || doc.nom_complet || t("rechercher_owner_unknown") || "Propriétaire inconnu";

  const getLocation = (doc: RecentDoc): string =>
    doc.location || doc.ville || doc.city || t("rechercher_location_unknown") || "Lieu non spécifié";

  const getCountry = (doc: RecentDoc): string =>
    doc.country || doc.pays || "Cameroun";

  const getDocNumber = (doc: RecentDoc): string => {
    const num = doc.numero_doc || doc.document_number || doc.numero_document;
    if (num && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(num) && !/^\d{20,}$/.test(num)) {
      return num;
    }
    return "••••••••••";
  };

  const getRelativeDate = (doc: RecentDoc): string => {
    const rawDate = doc.date_trouvee || doc.date_trouvaille || doc.created_at;
    return formatRetrouveTimeAgo(rawDate, lang);
  };

  const getScore = (doc: RecentDoc): number =>
    Math.round((doc.score || 0) * 100);

  return (
    <section id="recent-docs" className="py-20 px-5" style={{ backgroundColor: "#F7F7F7" }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-black uppercase tracking-widest mb-5 border border-primary/20">
            <i className="ph ph-clock-counter-clockwise text-[10px]" /> {t("home_recent_badge")}
          </span>
          <h2 className="font-bricolage text-2xl md:text-3xl font-black text-textMain tracking-normal mb-4">
            {t("home_recent_title")}
          </h2>
          <p className="text-textMuted text-[14px] leading-relaxed max-w-lg mx-auto tracking-wide">
            {t("home_recent_desc")}
          </p>
        </div>

        {/* Carrousel horizontal */}
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex-shrink-0 w-[290px] sm:w-[310px] bg-white rounded-[24px] p-5 border border-borderMain">
                <div className="h-44 w-full mb-4 rounded-xl bg-gray-200 animate-pulse" />
                <div className="h-3 w-1/3 mb-3 rounded bg-gray-200 animate-pulse" />
                <div className="h-5 w-3/4 mb-4 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-1/2 mb-2 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-2/3 mb-5 rounded bg-gray-200 animate-pulse" />
                <div className="h-10 w-full rounded-[14px] bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
              {docs.map((doc, i) => {
                const photo = getPhoto(doc);
                const docType = getDocType(doc);
                const ownerName = getOwnerName(doc);
                const locationText = getLocation(doc);
                const countryText = getCountry(doc);
                const docNumber = getDocNumber(doc);
                const relativeDateText = getRelativeDate(doc);
                const score = getScore(doc);

                return (
                  <div
                    key={doc.id}
                    className="flex-shrink-0 w-[290px] sm:w-[310px] snap-start doc-card group bg-white border border-borderMain rounded-[24px] overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 flex flex-col"
                  >
                    {/* Image avec ProtectedDocumentImage */}
                    <div className="relative h-44 bg-surface2 flex items-center justify-center overflow-hidden">
                      <ProtectedDocumentImage
                        src={photo ? getFullImageUrl(photo) : undefined}
                        revealed={false}
                        className="relative w-full h-full overflow-hidden"
                        imgClassName="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        lockLabelKey="rechercher_public_locked"
                        lockHintKey="rechercher_public_locked_hint"
                        loginUrl={user ? undefined : "/login"}
                      />

                      {/* Badge type de document (par dessus) */}
                      <div className="absolute top-3 left-3 z-10">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase border border-borderMain text-textMain shadow-sm">
                          <i className="ph ph-shield text-primary" />{" "}
                          {docType}
                        </span>
                      </div>

                      {score > 30 && (
                        <div className="match-score-badge absolute bottom-[-10px] left-1/2 -translate-x-1/2 bg-primary text-black font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow-lg z-10">
                          {score}% MATCH
                        </div>
                      )}
                    </div>

                    {/* Contenu de la carte - identique à la page recherche */}
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest whitespace-nowrap">
                          {t("rechercher_found_doc")}
                        </span>
                        <span className="text-[10px] font-bold text-textMain text-right truncate">
                          {relativeDateText}
                        </span>
                      </div>

                      <h3 className="font-bricolage font-bold text-textMain text-[16px] mb-3 truncate" title={ownerName}>
                        {ownerName}
                      </h3>

                      <div className="space-y-2 mb-4">
                        <p className="text-[12px] text-textMuted flex items-center gap-1.5">
                          <i className="ph ph-hash text-[10px] text-primary/50" />
                          <span className="blur-sm select-none font-mono text-[11px] opacity-80 pointer-events-none">
                            {docNumber}
                          </span>
                        </p>
                        <div className="flex items-center gap-2 py-2 border-y border-borderMain/50">
                          <i className="ph ph-map-pin text-primary text-[11px]" />
                          <span className="blur-sm select-none text-[12px] font-medium opacity-80 pointer-events-none truncate">
                            {locationText}, {countryText}
                          </span>
                        </div>
                      </div>

                      <div className="mt-auto pt-1">
                        <Link
                          to={user ? `/declarer?from=${encodeURIComponent(String(doc.id))}` : `/login?redirect=${encodeURIComponent(`/declarer?from=${doc.id}`)}`}
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-white rounded-[14px] font-bold text-[13px] hover:bg-primary-dark transition-all shadow-md shadow-primary/20 active:scale-95"
                        >
                          <i className="ph ph-file-plus text-xs" /> {t("rechercher_its_mine")}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Indication de scroll */}
            {docs.length > 3 && (
              <div className="mt-4 text-center">
                <p className="text-[12px] text-textMuted flex items-center justify-center gap-2">
                  <i className="ph ph-arrow-left text-[10px]" />
                  <span>Faites défiler pour voir plus</span>
                  <i className="ph ph-arrow-right text-[10px]" />
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .doc-card {
          transition: transform 0.25s, box-shadow 0.25s;
        }
        .doc-card:hover {
          transform: translateY(-4px);
        }
        .match-score-badge {
          box-shadow: 0 4px 10px rgba(217,138,48,0.3);
        }
      `}</style>
    </section>
  );
}

function HowItWorksSection({ t }) {
  const howSteps = [
    {
      num: 1,
      titleKey: "home_how_step1_title",
      descKey: "home_how_step1_desc",
      // Screenshot-style illustration: login/declare page
      illustration: (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="w-full max-w-[220px] rounded-2xl overflow-hidden shadow-lg border border-borderMain bg-white">
            <div className="bg-primary/10 px-4 pt-5 pb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary/40" />
              <div className="w-2 h-2 rounded-full bg-primary/30" />
              <div className="w-2 h-2 rounded-full bg-primary/20" />
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <i className="ph ph-file-text text-primary text-[9px]" />
                </div>
                <div className="h-2.5 bg-textMain/10 rounded-full w-20" />
              </div>
              <div className="h-2 bg-borderMain rounded-full w-full" />
              <div className="h-2 bg-borderMain rounded-full w-4/5" />
              <div className="h-7 bg-primary/15 rounded-xl w-full mt-2" />
              <div className="h-7 bg-borderMain rounded-xl w-full" />
              <div className="h-8 bg-primary rounded-xl w-full mt-1 flex items-center justify-center">
                <div className="h-2 bg-white/60 rounded-full w-16" />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      num: 2,
      titleKey: "home_how_step2_title",
      descKey: "home_how_step2_desc",
      // Notification / match illustration
      illustration: (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="relative flex flex-col items-center gap-3 w-full max-w-[200px]">
            {/* Big match badge */}
            <div className="w-24 h-24 rounded-3xl bg-green-light flex items-center justify-center shadow-md border border-borderMain">
              <i className="ph ph-check-circle text-green-mid text-4xl" />
            </div>
            {/* Notification card */}
            <div className="w-full bg-white border border-borderMain rounded-2xl p-3 shadow-sm flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <i className="ph ph-bell text-primary text-[11px]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-2 bg-textMain/15 rounded-full w-3/4 mb-1.5" />
                <div className="h-1.5 bg-borderMain rounded-full w-full mb-1" />
                <div className="h-1.5 bg-borderMain rounded-full w-2/3" />
              </div>
            </div>
            {/* Email badge */}
            <div className="flex items-center gap-2 bg-white border border-borderMain rounded-full px-3 py-1.5 shadow-sm">
              <i className="ph ph-envelope text-primary text-[10px]" />
              <div className="h-1.5 bg-borderMain rounded-full w-16" />
            </div>
          </div>
        </div>
      ),
    },
    {
      num: 3,
      titleKey: "home_how_step3_title",
      descKey: "home_how_step3_desc",
      // Document recovery / ID card illustration
      illustration: (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="w-full max-w-[200px] space-y-3">
            {/* ID card mock */}
            <div className="w-full rounded-2xl bg-white border border-borderMain shadow-md overflow-hidden">
              <div className="bg-primary/10 px-3 py-2 flex items-center gap-2">
                <i className="ph ph-identification-card text-primary text-[11px]" />
                <div className="h-1.5 bg-primary/30 rounded-full w-20" />
              </div>
              <div className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-textMuted/10 flex items-center justify-center flex-shrink-0">
                  <i className="ph ph-user text-textMuted text-sm" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-2 bg-textMain/15 rounded-full w-3/4" />
                  <div className="h-1.5 bg-borderMain rounded-full w-full" />
                  <div className="h-1.5 bg-borderMain rounded-full w-1/2" />
                </div>
              </div>
            </div>
            {/* Verified badge */}
            <div className="flex items-center gap-2 bg-green-light border border-borderMain rounded-xl px-3 py-2">
              <i className="ph ph-check-circle text-green-mid text-sm" />
              <div className="h-1.5 bg-green-mid/30 rounded-full flex-1" />
              <div className="text-[9px] font-black text-green-mid whitespace-nowrap">98%</div>
            </div>
            {/* QR code mock */}
            <div className="w-full rounded-xl border border-borderMain bg-white p-2 flex items-center gap-2.5 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-textMain/5 grid grid-cols-3 gap-0.5 p-1 flex-shrink-0">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={`rounded-[1px] ${[0,1,3,4,5,8].includes(i) ? "bg-textMain/40" : "bg-transparent"}`} />
                ))}
              </div>
              <div className="flex-1 space-y-1">
                <div className="h-1.5 bg-textMain/15 rounded-full w-3/4" />
                <div className="h-1.5 bg-borderMain rounded-full w-1/2" />
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="py-24 px-5 bg-white">
      <div className="max-w-6xl mx-auto">

        {/* Header — centré, épuré comme la référence */}
        <div className="text-center mb-16 max-w-xl mx-auto">
          <h2 className="font-bricolage text-[2rem] md:text-[2.6rem] font-extrabold text-textMain leading-tight mb-5">
            {t("home_how_title")}
          </h2>
          <p className="text-textMuted text-[15px] leading-relaxed">
            {t("home_how_desc")}
          </p>
        </div>

        {/* 3 cards horizontales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {howSteps.map((step) => (
            <div key={step.num} className="flex flex-col">
              {/* Illustration area — fond légèrement coloré */}
              <div
                className="rounded-[24px] overflow-hidden mb-5"
                style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #fef3e2 100%)", minHeight: 220 }}
              >
                {step.illustration}
              </div>

              {/* Number + title + desc */}
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-[13px] font-black flex items-center justify-center mt-0.5">
                  {step.num}
                </span>
                <div>
                  <h3 className="font-bricolage text-[16px] font-bold text-textMain mb-1.5">
                    {t(step.titleKey)}
                  </h3>
                  <p className="text-textMuted text-[13px] leading-relaxed">
                    {t(step.descKey)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyDocmasterSection({ t }) {
  return (
    <section className="py-20 px-5" style={{ backgroundColor: "#F7F7F7" }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-black uppercase tracking-widest mb-5 border border-primary/20">
            <i className="ph ph-star text-[10px]" /> {t("home_why_badge")}
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
                    <i className="ph ph-check-circle text-primary text-sm" />
                    <span className="text-white text-[12px] font-bold">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="feature-card bg-primary rounded-[24px] p-8 shadow-xl md:col-span-2 lg:col-span-3 relative overflow-hidden" style={{ transition: "transform 0.3s, box-shadow 0.3s" }}>
            <div className="absolute -left-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-xl" />
            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-green-dark text-2xl flex-shrink-0">
                <i className="ph ph-coins" />
              </div>
              <div>
                <h3 className="font-bricolage text-[18px] font-bold text-green-dark mb-2 sm:mb-1">{t("home_feature_rewards")}</h3>
                <p className="text-green-dark/70 text-[13px] leading-relaxed">{t("home_feature_rewards_desc")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ Illustration: Digital Vault (flat, no background) ═══ */
function VaultIllustration() {
  return (
    <svg viewBox="0 0 480 420" className="w-full h-auto">
      <ellipse cx="240" cy="215" rx="190" ry="150" fill="#E8923A" opacity="0.08" />

      <g transform="translate(40,40) rotate(-8)">
        <rect x="0" y="0" width="86" height="110" rx="10" fill="#FFFFFF" stroke="#E8923A" strokeWidth="2" />
        <rect x="14" y="20" width="58" height="8" rx="4" fill="#E8923A" opacity="0.5" />
        <rect x="14" y="38" width="42" height="6" rx="3" fill="#E5E7EB" />
        <rect x="14" y="52" width="50" height="6" rx="3" fill="#E5E7EB" />
        <circle cx="43" cy="82" r="14" fill="#FFF3E4" stroke="#E8923A" strokeWidth="2" />
        <path d="M37 82 l4 5 l8 -10" fill="none" stroke="#E8923A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <g transform="translate(350,30) rotate(10)">
        <rect x="0" y="0" width="80" height="102" rx="10" fill="#FFFFFF" stroke="#E8923A" strokeWidth="2" />
        <rect x="12" y="18" width="50" height="7" rx="3.5" fill="#E8923A" opacity="0.45" />
        <rect x="12" y="47" width="44" height="6" rx="3" fill="#E5E7EB" />
        <rect x="12" y="70" width="56" height="18" rx="6" fill="#FFF3E4" />
      </g>

      <path d="M100 130 C 150 170, 170 190, 205 210" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="5 6" />
      <path d="M380 110 C 340 160, 310 190, 270 210" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="5 6" />

      <path d="M110 330 L370 330 L390 358 Q392 366 383 366 L97 366 Q88 366 90 358 Z" fill="#1A1A1A" />
      <rect x="120" y="310" width="240" height="20" rx="4" fill="#2E2E2E" />

      <rect x="140" y="150" width="200" height="160" rx="14" fill="#1A1A1A" />
      <rect x="152" y="162" width="176" height="136" rx="8" fill="#FFFFFF" />

      <circle cx="240" cy="230" r="52" fill="#E8923A" opacity="0.12" />
      <circle cx="240" cy="230" r="40" fill="none" stroke="#E8923A" strokeWidth="6" />
      <circle cx="240" cy="230" r="8" fill="#E8923A" />
      <rect x="236" y="230" width="18" height="4" rx="2" fill="#E8923A" transform="rotate(35 240 230)" />

      <g transform="translate(295,268)">
        <circle cx="0" cy="0" r="16" fill="#E8923A" />
        <path d="M-4 -2 v-3 a4 4 0 0 1 8 0 v3" fill="none" stroke="#FFFFFF" strokeWidth="2" />
      </g>
    </svg>
  );
}

function VaultDeviceSection({ t }) {
  return (
    <section className="py-20 px-4" style={{ backgroundColor: '#F7F7F7' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Carte 1 - Appareil */}
          <div className="bg-white rounded-3xl p-10 flex items-center justify-between gap-8 shadow-sm">
            <div className="flex-1">
              <h3 className="font-bricolage text-2xl font-bold text-textMain mb-4">
                Enregistrez votre appareil
              </h3>
              <p className="text-textMuted text-base leading-relaxed mb-6">
                En cas de vol après signalement, vous êtes immédiatement notifié et protégé
              </p>
              <a 
                href="#" 
                className="inline-flex items-center gap-2 text-sm font-semibold text-textMain hover:text-green-dark transition-colors"
              >
                En savoir plus
                <i className="ph ph-arrow-right text-xs" />
              </a>
            </div>
            
            {/* Illustration abstraite - forme organique verte/jaune */}
            <div className="hidden md:block relative w-32 h-32 flex-shrink-0">
              <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Forme jaune/vert style blob */}
                <path 
                  d="M 60 10 Q 90 20, 95 50 Q 100 80, 70 100 Q 40 110, 20 85 Q 5 60, 15 35 Q 25 10, 60 10 Z" 
                  fill="#D4E157" 
                  opacity="0.9"
                />
                {/* Forme noire par-dessus */}
                <path 
                  d="M 45 35 Q 70 30, 80 55 Q 85 75, 60 85 Q 35 90, 30 65 Q 25 40, 45 35 Z" 
                  fill="#1A1A1A" 
                  opacity="0.85"
                />
                {/* Trait simple style "10" */}
                <text 
                  x="55" 
                  y="70" 
                  fill="#F5A64B" 
                  fontSize="32" 
                  fontWeight="bold" 
                  fontFamily="'Bricolage Grotesque', sans-serif"
                >
                  10
                </text>
              </svg>
            </div>
          </div>

          {/* Carte 2 - Documents */}
          <div className="bg-white rounded-3xl p-10 flex items-center justify-between gap-8 shadow-sm">
            <div className="flex-1">
              <h3 className="font-bricolage text-2xl font-bold text-textMain mb-4">
                Partagez vos documents
              </h3>
              <p className="text-textMuted text-base leading-relaxed mb-6">
                Accédez à vos documents médicaux même quand vous ne les avez pas physiquement sur vous
              </p>
              <a 
                href="#" 
                className="inline-flex items-center gap-2 text-sm font-semibold text-textMain hover:text-primary transition-colors"
              >
                En savoir plus
                <i className="ph ph-arrow-right text-xs" />
              </a>
            </div>
            
            {/* Illustration abstraite - graphique tendance avec arc rouge/jaune */}
            <div className="hidden md:block relative w-32 h-32 flex-shrink-0">
              <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Arc rouge/corail */}
                <path 
                  d="M 20 90 Q 30 50, 50 40" 
                  stroke="#FF6B6B" 
                  strokeWidth="10" 
                  fill="none" 
                  strokeLinecap="round"
                  opacity="0.8"
                />
                {/* Arc jaune */}
                <path 
                  d="M 50 90 Q 65 45, 85 30" 
                  stroke="#FFD93D" 
                  strokeWidth="10" 
                  fill="none" 
                  strokeLinecap="round"
                  opacity="0.85"
                />
                {/* Trait noir montant avec flèche */}
                <path 
                  d="M 60 95 L 95 30" 
                  stroke="#1A1A1A" 
                  strokeWidth="3" 
                  fill="none" 
                  strokeLinecap="round"
                  opacity="0.9"
                />
                {/* Flèche */}
                <path 
                  d="M 95 30 L 88 35 M 95 30 L 90 37" 
                  stroke="#1A1A1A" 
                  strokeWidth="3" 
                  fill="none" 
                  strokeLinecap="round"
                  opacity="0.9"
                />
              </svg>
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
    const angles = Array.from({ length: nodes.length }, (_, i) => (360 / nodes.length) * i);
    let step = 0;
    let timer;
    let animId;

    function animateCounter(el, target) {
      const start = performance.now();
      const duration = 1200;
      const suffix = el.dataset.suffix || "";
      const init = parseInt(el.textContent?.replace(/\s/g, "") || "0", 10);

      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const val = Math.round(init + (target - init) * ease);
        el.textContent = val.toLocaleString("fr-FR") + suffix;
        if (t < 1) animId = requestAnimationFrame(tick);
      }
      animId = requestAnimationFrame(tick);
    }

    function rotateTo(angle, si) {
      if (!needle || !sweep) return;
      const startTime = performance.now();
      const duration = 1100;
      const startAngle = needle.getAttribute("data-current") ? parseFloat(needle.getAttribute("data-current")) : -45;
      const startSweepAngle = sweep.getAttribute("data-current") ? parseFloat(sweep.getAttribute("data-current")) : -45;
      const startOpacity = parseFloat(sweep.style.opacity || "0");

      function tick(now) {
        const t = Math.min((now - startTime) / duration, 1);
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const currentAngle = startAngle + (angle - startAngle) * ease;
        const currentSweepAngle = startSweepAngle + (angle - startSweepAngle) * ease;
        const currentOpacity = startOpacity + (1 - startOpacity) * Math.min(t * 5, 1);
        needle.style.transform = `rotate(${currentAngle}deg)`;
        needle.setAttribute("data-current", String(currentAngle));
        sweep.style.transform = `rotate(${currentSweepAngle}deg)`;
        sweep.setAttribute("data-current", String(currentSweepAngle));
        sweep.style.opacity = String(currentOpacity);

        if (t >= 1) {
          sweep.style.opacity = "1";
          nodes.forEach((n, i) => {
            if (i === si % nodes.length) {
              n.classList.add("active");
              n.style.opacity = "1";
              const c = n.querySelector(".counter-radar");
              if (c && c.dataset.target) animateCounter(c, +c.dataset.target);
            } else {
              n.classList.remove("active");
              n.style.opacity = "0.3";
            }
          });
          timer = setTimeout(() => {
            step++;
            rotateTo(angles[step % angles.length], step);
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
      <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "linear-gradient(#E8923A 1px,transparent 1px),linear-gradient(90deg,#E8923A 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-black uppercase tracking-widest mb-5 border border-primary/20">
            <i className="ph ph-chart-pie text-[10px]" /> {t("stat_impact_badge")}
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
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary rounded-full shadow-[0_0_20px_#E8923A]" style={{ animation: "pulse-dot 1.5s ease-in-out infinite" }} />
              </div>
            </div>

            <div id="radar-sweep" className="absolute inset-0 rounded-full overflow-hidden origin-center pointer-events-none">
              <div id="sweep-arc" className="absolute inset-0 origin-center opacity-0" style={{ background: "conic-gradient(from -45deg, transparent, rgba(217,138,48,0.15) 45deg, transparent 90deg)" }} />
            </div>

            <div className="w-8 h-8 bg-white border-4 border-primary rounded-full z-40 shadow-lg flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-primary rounded-full" style={{ animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
            </div>

            {statCounters.map((s, i) => (
              <div key={i} id={`stat-${i}`} className={`stat-node absolute ${RADAR_NODE_POSITIONS[i % RADAR_NODE_POSITIONS.length]} flex flex-col items-center gap-1 opacity-30`}>
                <div className="stat-icon-box w-14 h-14 rounded-full bg-white border-2 border-primary/20 flex flex-col items-center justify-center shadow-md">
                  <i className={`${s.icon} text-primary text-base`} />
                </div>
                <div className="text-center mt-2">
                  <div className="font-bricolage text-xl font-black text-[#1A1A1A] counter-radar" data-target={s.target} data-suffix={s.suffix}>
                    {s.target.toLocaleString("fr-FR")}{s.suffix}
                  </div>
                  <p className="text-[9px] text-gray-400 uppercase font-bold leading-tight">{t(s.labelKey)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-5 w-full max-w-sm lg:max-w-xs">
            {statCounters.map((s, i) => {
              const isFull = i === statCounters.length - 1;
              return (
                <div key={s.labelKey} className={`rounded-[20px] p-5 text-center ${isFull ? "col-span-2 bg-primary shadow-lg shadow-primary/20" : "bg-white border border-[#EAE3D8] shadow-sm hover:border-primary transition-all hover:-translate-y-1 duration-200"}`}>
                  <div className={`font-bricolage text-3xl font-black mb-1 ${isFull ? "text-white" : i === 0 ? "text-primary" : "text-[#2D5A42]"}`}>
                    <span ref={counterRefs[i]} data-target={s.target} className="counter">{s.target.toLocaleString("fr-FR")}{s.suffix}</span>
                  </div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${isFull ? "text-white/70" : "text-gray-400"}`}>{t(s.labelKey)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ Wallet / Rewards Section ═══ */

function WalletRewardsSection({ t }) {
  const steps = [
    { icon: "ph ph-file-plus", titleKey: "home_wallet_step1_title", descKey: "home_wallet_step1_desc" },
    { icon: "ph ph-handshake", titleKey: "home_wallet_step2_title", descKey: "home_wallet_step2_desc" },
    { icon: "ph ph-wallet", titleKey: "home_wallet_step3_title", descKey: "home_wallet_step3_desc" },
  ];

  return (
    <section className="py-16 px-5 relative overflow-hidden" style={{ backgroundColor: "#F7F7F7" }}>
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-black uppercase tracking-widest mb-5 border border-primary/20">
            <i className="ph ph-piggy-bank text-[10px]" /> {t("home_wallet_badge")}
          </span>
          <h2 className="font-bricolage text-2xl md:text-3xl font-black text-textMain tracking-normal mb-4">{t("home_wallet_title")}</h2>
          <p className="text-textMuted text-[14px] leading-relaxed max-w-xl mx-auto tracking-wide">{t("home_wallet_desc")}</p>
        </div>

        <div className="bg-white border border-borda rounded-[24px] p-6 md:p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {steps.map((s, i) => (
              <div key={i}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bricolage text-[13px] font-black text-primary">0{i + 1}</span>
                  <i className={`${s.icon} text-textMuted text-sm`} />
                </div>
                <h3 className="font-bricolage text-[15px] font-bold text-textMain mb-1">{t(s.titleKey)}</h3>
                <p className="text-textMuted text-[13px] leading-relaxed">{t(s.descKey)}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 pt-6 border-t border-borda flex flex-col sm:flex-row items-center justify-between gap-5">
            <p className="text-textMuted text-[12px] leading-relaxed text-center sm:text-left max-w-md">{t("home_wallet_footnote")}</p>
            <Link to="/login"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-green-dark text-white rounded-[18px] font-black text-[14px] hover:bg-green-mid transition-all flex-shrink-0"
            >
              {t("home_wallet_btn")} <i className="ph ph-arrow-right text-[11px]" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReferralSection({ t }) {
  return (
    <section className="py-20 px-5" style={{ backgroundColor: "#F7F7F7" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-black uppercase tracking-widest mb-6 border border-primary/20">
              <i className="ph ph-gift text-[10px]" /> {t("home_referral_badge")}
            </span>
            <h2 className="font-bricolage text-2xl md:text-3xl font-black text-textMain tracking-normal mb-6" dangerouslySetInnerHTML={{ __html: t("home_referral_title") }} />
            <p className="text-textMuted text-[14px] mb-8 leading-loose tracking-wide">{t("home_referral_desc")}</p>
            <ul className="space-y-4 mb-10">
              {[
                { icon: "ph ph-gift", text: t("home_referral_feature1") },
                { icon: "ph ph-coins", text: t("home_referral_feature2") },
                { icon: "ph ph-crown", text: t("home_referral_feature3") },
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
              {t("home_referral_btn")} <i className="ph ph-arrow-right text-[11px]" />
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
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#E8923A 1px, transparent 1px), linear-gradient(90deg, #E8923A 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-[80px]" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-5 py-2 bg-white/10 text-primary rounded-full text-[12px] font-black uppercase tracking-widest mb-6 border border-white/10 backdrop-blur-sm">
            <i className="ph ph-crown text-[10px]" /> {t("home_subscriptions_badge")}
          </span>
          <h2 className="font-bricolage text-3xl md:text-5xl font-black text-white tracking-tight mb-6">{t("home_subscriptions_title")}</h2>
          <p className="text-white/50 text-[15px] md:text-[17px] leading-relaxed max-w-2xl mx-auto tracking-wide">{t("home_subscriptions_desc")}</p>
        </div>

        <div id="pricing-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.length === 0 && (
            <div className="col-span-full text-center text-white/40 text-[13px] py-10">
              <i className="ph ph-circle-notch animate-spin mr-2" /> {t("home_subscriptions_loading")}
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
                  <i className={`${isFeatured ? 'ph ph-rocket' : 'ph ph-crown'} text-xl`} />
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
                        <i className="ph ph-check text-[10px]" />
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
            DÉCOUVRIR TOUS LES PLANS <i className="ph ph-arrow-right text-[11px]" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ t, lang }) {
  const scrollDuration = 5000;
  const barRef = useRef(null);
  const [real, setReal] = useState<PublicTestimonial[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    testimonialsService
      .listPublic(12)
      .then((res) => {
        if (alive && res.success && Array.isArray(res.data)) setReal(res.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const items = useMemo(() => {
    if (real.length > 0) {
      return real.map((item) => ({
        key: item.id,
        author: item.author_label,
        quote: item.comment,
        role: t(
          item.context === "RECOVERY"
            ? "testimonial_context_recovery"
            : "testimonial_context_match",
        ),
        icon: "ph ph-check-circle",
        level: levelFor(item.rating),
      }));
    }
    return testimonials.map((item) => ({
      key: item.author,
      author: item.author,
      quote: t(item.quoteKey),
      role: t(item.roleKey),
      icon: item.icon,
      level: null,
    }));
  }, [real, t]);

  const total = items.length;
  const safeIndex = total ? index % total : 0;

  const goTo = useCallback(
    (value: number) => setIndex(total ? ((value % total) + total) % total : 0),
    [total],
  );

  useEffect(() => {
    setIndex(0);
  }, [real.length]);

  useEffect(() => {
    if (!barRef.current) return;
    barRef.current.style.transition = "none";
    barRef.current.style.width = "0%";
    void barRef.current.offsetWidth;
    barRef.current.style.transition = `width ${scrollDuration}ms linear`;
    barRef.current.style.width = "100%";
  }, [safeIndex, real.length]);

  useEffect(() => {
    if (total < 2) return;
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % total), scrollDuration);
    return () => clearInterval(timer);
  }, [total, safeIndex]);

  return (
    <section className="py-20 px-5 overflow-hidden" style={{ backgroundColor: "#F7F7F7" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-black uppercase tracking-widest mb-5 border border-primary/20">
            <i className="ph ph-quotes text-[10px]" /> {t("testimonials_badge")}
          </span>
          <h2 className="font-bricolage text-2xl md:text-3xl font-black text-textMain tracking-normal mb-4">{t("testimonials_title")}</h2>
          <p className="text-textMuted text-[14px] tracking-wide leading-relaxed">{t("testimonials_subtitle")}</p>
        </div>

        <div className="relative rounded-[32px] overflow-hidden shadow-xl border border-borda">
          <div
            id="testimonial-rail"
            className="flex bg-white"
            style={{
              transform: `translateX(-${safeIndex * 100}%)`,
              transition: "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
          >
            {items.map((item) => (
              <div key={item.key} className="w-full flex-shrink-0">
                <div className="p-8 md:p-14 relative min-h-[320px] flex flex-col justify-center">
                  <div className="absolute top-6 right-10 text-6xl text-primary/10 select-none">
                    <i className="ph ph-quotes" />
                  </div>
                  <p className="text-lg text-textMain leading-relaxed mb-10 max-w-2xl font-medium italic">
                    “{item.quote}”
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-green-dark rounded-full flex items-center justify-center text-white text-xl shadow-lg">
                      <i className="ph ph-user" />
                    </div>
                    <div>
                      <h4 className="font-bricolage font-black text-textMain uppercase tracking-tight">
                        {item.author}
                      </h4>
                      <div className="flex items-center text-sm text-primary font-medium mt-0.5">
                        <i className={`${item.icon} mr-1.5 text-xs`} />
                        {item.role}
                      </div>
                      {item.level && (
                        <div className="flex items-center gap-1.5 text-[13px] text-textMuted mt-1">
                          <span className="text-base leading-none" aria-hidden="true">
                            {item.level.emoji}
                          </span>
                          {t(item.level.labelKey)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-borda w-full">
            <div ref={barRef} className="h-full bg-primary w-0" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-5 mt-8">
          <button
            onClick={() => goTo(safeIndex - 1)}
            aria-label={t("testimonials_prev")}
            className="w-11 h-11 rounded-full border border-borda bg-white flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white text-textMuted transition-all"
          >
            <i className="ph ph-caret-left text-sm" />
          </button>
          <div id="dots-container" className="flex items-center gap-2.5">
            {items.map((item, dotIndex) => (
              <button
                key={item.key}
                onClick={() => goTo(dotIndex)}
                aria-label={`${dotIndex + 1}`}
                aria-current={dotIndex === safeIndex}
                className={`h-2 rounded-full transition-all duration-500 ${
                  dotIndex === safeIndex ? "bg-primary w-8" : "bg-borda w-2"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => goTo(safeIndex + 1)}
            aria-label={t("testimonials_next")}
            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-all shadow-lg shadow-primary/30"
          >
            <i className="ph ph-caret-right text-sm" />
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
              <i className="ph ph-lightbulb text-[10px]" /> {t("home_tips_badge")}
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
    <section className="py-20 px-5" style={{ backgroundColor: "#F7F7F7" }}>
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
    <section className="py-20 px-5" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="max-w-7xl mx-auto">
        {/* Badge supérieur */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-black uppercase tracking-widest border border-primary/20">
            <i className="ph ph-device-mobile text-[10px]" /> {t("home_app_badge")}
          </span>
        </div>

        {/* Contenu sans carte */}
        <div className="relative">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">

            {/* Partie gauche : Texte et boutons */}
            <div className="px-4 md:px-8 flex flex-col justify-center">
              {/* Logo DocMaster */}
              <div className="mb-6 flex items-center gap-0">
                <img 
                  src="/src/assets/images/docmaster.png" 
                  alt="DocMaster" 
                  className="h-10 w-auto object-contain"
                />
                <span className="font-poppins font-bold text-green-dark text-[21px] leading-none tracking-tight">ocmaster</span>
              </div>

              <h2 className="font-bricolage text-[2.2rem] md:text-[2.8rem] lg:text-[3.5rem] font-extrabold text-textMain leading-[1.1] mb-6">
                {t("home_app_title")}
              </h2>
              
              <p className="text-textMuted text-[16px] leading-relaxed mb-10 max-w-md">
                {t("home_app_desc")}
              </p>

              {/* Boutons de téléchargement */}
              <div className="flex flex-wrap gap-3 mb-8">
                <a
                  href="https://play.google.com/store/apps/details?id=com.tesea.docmaster"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-[16px] font-black text-[14px] text-white transition-all hover:scale-105 active:scale-95 shadow-lg"
                  style={{ backgroundColor: "#2D5A42" }}
                >
                  <img 
                    src="/src/assets/images/Playstore.png" 
                    alt="Google Play" 
                    className="w-5 h-5 object-contain"
                  />
                  {t("home_app_playstore")}
                </a>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-[16px] font-bold text-[14px] text-textMain border-2 border-borderMain hover:bg-surface2 transition-all active:scale-95"
                >
                  <i className="ph ph-arrow-right text-sm" />
                  Accéder à l'app web
                </Link>
              </div>

              {/* Badge "Disponible sur" */}
              <div className="inline-flex items-center gap-2 text-textMuted text-[13px]">
                <i className="ph ph-check-circle text-green-mid text-sm" />
                <span className="font-medium">{t("home_app_available")} Android</span>
              </div>
            </div>

            {/* Partie droite : MOCKUP */}
            <div className="relative flex items-center justify-center lg:justify-end px-4 lg:px-0">
              <div className="relative w-full" style={{ maxWidth: "620px" }}>
                
                {/* Mockup de téléphone */}
                <div className="relative">
                  <img
                    src="/src/assets/images/mobile.png"
                    alt="DocMaster app mobile"
                    className="w-full h-auto object-contain"
                    style={{ 
                      maxHeight: "720px"
                    }}
                  />
                </div>
                
                {/* Badge flottant "Disponible" */}
                <div 
                  className="absolute top-16 -right-8 bg-primary px-5 py-2.5 rounded-full shadow-xl"
                  style={{ 
                    animation: "bounce 3s ease-in-out infinite"
                  }}
                >
                  <p className="text-white font-black text-[12px] uppercase tracking-wide whitespace-nowrap">
                    {t("home_app_available")}
                  </p>
                </div>
              </div>
            </div>

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
          <i className="ph ph-x text-white/70 text-sm" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <i className="ph ph-device-mobile text-[#2D5A42] text-lg" />
          </div>
          <p className="text-[13px] md:text-[15px] font-semibold text-white/90">
            {t("home_sticky_download")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href="https://play.google.com/store/apps/details?id=com.tesea.docmaster" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-primary text-[#2D5A42] px-5 py-2.5 rounded-[14px] font-black text-[12px] md:text-[13px] hover:bg-primary-dark transition-all whitespace-nowrap active:scale-95"
          >
            <img src="/src/assets/images/Playstore.png" className="w-4 h-4 object-contain" alt="" /> {t("home_app_playstore")}
          </a>
          <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 text-white px-5 py-2.5 rounded-[14px] font-black text-[12px] md:text-[13px] hover:bg-white/20 transition-all whitespace-nowrap active:scale-95"
          >
            <i className="ph ph-apple-logo text-base" /> {t("home_app_appstore")}
          </a>
        </div>
      </div>
    </div>
  );
}

/* ═══ Matching Section ═══ */

function MatchingSection({ t }) {
  const steps = [
    {
      icon: "ph ph-seal-warning",
      titleKey: "home_matching_step1_title",
      descKey: "home_matching_step1_desc",
    },
    {
      icon: "ph ph-robot",
      titleKey: "home_matching_step2_title",
      descKey: "home_matching_step2_desc",
    },
    {
      icon: "ph ph-bell",
      titleKey: "home_matching_step3_title",
      descKey: "home_matching_step3_desc",
    },
    {
      icon: "ph ph-handshake",
      titleKey: "home_matching_step4_title",
      descKey: "home_matching_step4_desc",
    },
  ];

  return (
    <section className="py-20 px-5 relative overflow-hidden" style={{ backgroundColor: "#F7F7F7" }}>
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-black uppercase tracking-widest mb-5 border border-primary/20">
            <i className="ph ph-brain text-[10px]" /> {t("home_matching_badge")}
          </span>
          <h2 className="font-bricolage text-2xl md:text-3xl font-black text-textMain tracking-normal mb-4">{t("home_matching_title")}</h2>
          <p className="text-textMuted text-[14px] leading-relaxed max-w-2xl mx-auto tracking-wide">{t("home_matching_desc")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="relative bg-white border border-borda rounded-[24px] p-7 hover:shadow-lg hover:-translate-y-1 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl mb-5 group-hover:scale-110 transition-transform">
                <i className={s.icon} />
              </div>
              <h3 className="font-bricolage text-[16px] font-bold text-textMain mb-2">{t(s.titleKey)}</h3>
              <p className="text-textMuted text-[13px] leading-relaxed">{t(s.descKey)}</p>
              {i < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -translate-y-1/2 -right-3 z-10 items-center justify-center">
                  <svg width="24" height="18" viewBox="0 0 24 18" className="text-primary/50">
                    <line x1="0" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />
                    <path d="M10 3 L18 9 L10 15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 bg-primary/5 border border-primary/10 rounded-[24px] p-6 md:p-8 max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-7">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl flex-shrink-0 shadow-lg shadow-primary/30">
              <i className="ph ph-percent" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="font-bricolage text-[17px] font-bold text-textMain mb-1">{t("home_matching_score_title")}</h4>
              <p className="text-textMuted text-[13px] leading-relaxed">{t("home_matching_score_desc")}</p>
            </div>
          </div>

          <div className="md:ml-[88px]">
            <div className="flex h-3 rounded-full overflow-hidden">
              <div className="bg-borda" style={{ width: "50%" }} title="< 50%" />
              <div className="bg-green-mid/60" style={{ width: "30%" }} title="50-80%" />
              <div className="bg-primary" style={{ width: "20%" }} title="≥ 80%" />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-[11px] font-bold text-textMuted uppercase tracking-wide">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-mid/60 flex-shrink-0" />
                {t("home_matching_potential")} · ≥50%
              </span>
              <span className="flex items-center gap-1.5 text-primary">
                <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                {t("home_matching_auto")} · ≥80%
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ Device Protection Section ═══ */

/* ═══ Illustration: Device Protection (flat, no background) ═══ */
function DeviceProtectionIllustration() {
  return (
    <svg viewBox="0 0 480 420" className="w-full h-auto">
      <ellipse cx="240" cy="220" rx="190" ry="150" fill="#16412E" opacity="0.07" />

      <g transform="translate(60,140)">
        <path d="M10 170 L230 170 L246 194 Q248 202 239 202 L1 202 Q-8 202 -6 194 Z" fill="#1A1A1A" />
        <rect x="18" y="150" width="204" height="18" rx="4" fill="#2E2E2E" />
        <rect x="30" y="10" width="180" height="140" rx="12" fill="#1A1A1A" />
        <rect x="40" y="20" width="160" height="120" rx="7" fill="#FFFFFF" />
        <path d="M120 40 L155 52 V85 C155 108 138 122 120 130 C102 122 85 108 85 85 V52 Z" fill="#16412E" opacity="0.9" />
        <path d="M107 86 l10 10 l22 -24" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <g transform="translate(255,90)">
        <rect x="0" y="0" width="120" height="220" rx="20" fill="#1A1A1A" />
        <rect x="8" y="14" width="104" height="192" rx="10" fill="#FFFFFF" />
        <g transform="translate(28,40)">
          <rect width="64" height="64" rx="4" fill="#F3F4F6" />
          <rect x="6" y="6" width="14" height="14" fill="#1A1A1A" />
          <rect x="44" y="6" width="14" height="14" fill="#1A1A1A" />
          <rect x="6" y="44" width="14" height="14" fill="#1A1A1A" />
          <rect x="26" y="6" width="6" height="6" fill="#1A1A1A" />
          <rect x="26" y="26" width="12" height="12" fill="#1A1A1A" />
          <rect x="44" y="44" width="6" height="6" fill="#1A1A1A" />
          <rect x="26" y="44" width="6" height="14" fill="#1A1A1A" />
          <rect x="44" y="26" width="6" height="6" fill="#1A1A1A" />
        </g>
        <rect x="34" y="118" width="52" height="8" rx="4" fill="#E5E7EB" />
        <rect x="34" y="134" width="36" height="6" rx="3" fill="#E5E7EB" />
      </g>

      <g transform="translate(70,60)">
        <circle cx="0" cy="0" r="22" fill="#E6F4EC" stroke="#16412E" strokeWidth="2" />
        <path d="M0 -9 L8 8 H-8 Z" fill="none" stroke="#16412E" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="0" cy="4" r="1.6" fill="#16412E" />
        <rect x="-1.2" y="-3" width="2.4" height="6" fill="#16412E" />
      </g>

      <g transform="translate(380,270)">
        <circle cx="0" cy="0" r="22" fill="#E6F4EC" stroke="#16412E" strokeWidth="2" />
        <path d="M0 -9 C6 -9 8 -4 8 0 C8 5 10 7 10 7 H-10 C-10 7 -8 5 -8 0 C-8 -4 -6 -9 0 -9 Z" fill="#16412E" />
        <rect x="-3" y="8" width="6" height="4" rx="2" fill="#16412E" />
      </g>

      <path d="M92 82 C 130 100, 150 120, 170 150" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="5 6" />
      <path d="M358 270 C 330 250, 310 230, 290 210" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="5 6" />
    </svg>
  );
}

function DeviceProtectionSection({ t }) {
  return (
    <section className="py-20 px-5 relative overflow-hidden bg-white">
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="p-8 md:p-14 lg:px-0 lg:py-10 overflow-hidden relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full mb-6 border border-primary/10 shadow-sm">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-dark opacity-75" style={{ animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-dark" />
                </span>
                <span className="text-xs font-black text-secondary uppercase tracking-widest">{t("home_device_badge")}</span>
              </div>

              <h2 className="font-bricolage text-2xl md:text-4xl font-black text-[#1A1A1A] leading-tight mb-8 tracking-normal">
                {t("home_device_title")}
              </h2>

              <p className="text-gray-600 text-[15px] leading-loose tracking-wide mb-8">{t("home_device_desc")}</p>

              <ul className="space-y-4 mb-10">
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <i className="ph ph-qr-code" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A1A]">{t("home_device_feature1_title")}</h4>
                    <p className="text-sm text-gray-500 mt-1">{t("home_device_feature1_desc")}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <i className="ph ph-warning" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A1A]">{t("home_device_feature2_title")}</h4>
                    <p className="text-sm text-gray-500 mt-1">{t("home_device_feature2_desc")}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0 mt-1">
                    <i className="ph ph-bell" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A1A]">{t("home_device_feature3_title")}</h4>
                    <p className="text-sm text-gray-500 mt-1">{t("home_device_feature3_desc")}</p>
                  </div>
                </li>
              </ul>

              <Link to="/login"
                className="inline-flex items-center gap-3 px-8 py-4 bg-green-dark text-white rounded-2xl font-bold hover:bg-green-mid transition-all shadow-lg hover:-translate-y-1"
              >
                <i className="ph ph-shield" /> {t("home_device_btn")}
              </Link>
            </div>

            <div className="relative flex justify-center lg:justify-end items-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 bg-green-dark/10 rounded-full blur-[60px] animate-pulse" />
              </div>
              <div className="relative z-10 w-full max-w-md lg:max-w-lg" style={{ filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.15))" }}>
                <DeviceProtectionIllustration />
                <div className="absolute top-4 -left-4 md:-left-8 bg-white border border-borda rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 z-20">
                  <div className="w-8 h-8 rounded-full bg-green-light flex items-center justify-center"><i className="ph ph-check text-green-dark text-[10px]" /></div>
                  <div><p className="text-[10px] font-black text-textMain">{t("home_device_tag_serial")}</p><p className="text-[9px] text-textMuted">{t("home_device_tag_saved")}</p></div>
                </div>
                <div className="absolute bottom-10 -right-4 md:-right-8 bg-white border border-borda rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 z-20">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><i className="ph ph-shield text-primary text-[10px]" /></div>
                  <div><p className="text-[10px] font-black text-textMain">{t("home_device_tag_protected")}</p><p className="text-[9px] text-textMuted">{t("home_device_tag_secure")}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

