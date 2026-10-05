import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";
import { useTopbar } from "../../hooks/useTopbar";
import { useReferrals } from "../../hooks/useReferrals";
import { useToast } from "../../context/ToastContext";
import type { Referral } from "../../types/api";

import {
  Paper,
  Title,
  Text,
  Group,
  Stack,
  SimpleGrid,
  Progress,
  Loader,
  Modal,
  TextInput,
  Badge,
  Divider,
} from "@mantine/core";

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
  useTopbar(t("parrainage_title"), [{ label: t("parrainage_breadcrumb_home"), href: "/dashboard" }, { label: t("parrainage_breadcrumb_referral") }]);
  const { user } = useAuth();
  const { referrals: rawReferrals, stats, loading } = useReferrals();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "recent">("all");
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
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

  const copyLink = () => {
    navigator.clipboard.writeText(refLink).then(() => {
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareVia = (platform: string) => {
    const msg = `Rejoins DocMaster avec mon code *${code}* 🎉 Tu reçois 50 points de parrainage et je gagne 50% du montant de ton abonnement quand tu souscris ! ${refLink}`;
    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    } else if (platform === "sms") {
      window.open(`sms:?body=${encodeURIComponent(msg)}`);
    } else {
      copyLink();
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(refLink).then(() => toast.success("Lien copié !"));
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
      <div className="flex flex-col h-screen">
        <div className="flex-1 flex items-center justify-center">
          <Loader color="gold" size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <div className="h-full overflow-y-auto w-full space-y-5">

          {/* Greeting */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <Title order={4} className="text-textMain">
                {t("parrainage_title")}
              </Title>
              <Text size="sm" c="dimmed" fs="italic">
                {t("parrainage_subtitle")}
              </Text>
            </div>
            <Paper bg="white" withBorder p="xs" radius="md">
              <Group gap={6}>
                <i className="fa-regular fa-calendar text-primary text-sm" />
                <Text size="xs" c="dimmed">{today}</Text>
              </Group>
            </Paper>
          </div>

          {/* Hero Banner */}
          <div className="relative bg-green-dark rounded-[20px] sm:rounded-[24px] overflow-hidden p-6 sm:p-8 min-h-[180px]">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute w-64 h-64 rounded-full bg-primary/8 -top-16 -right-16" />
              <div className="absolute w-40 h-40 rounded-full bg-primary/5 bottom-0 left-8" />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex-1">
                <Badge color="gold" variant="light" radius="xl" size="sm" leftSection={<i className="fa-solid fa-gift" />} mb="sm">
                  {t("parrainage_program")}
                </Badge>
                <Title order={2} c="white" mb="xs">
                  {t("parrainage_headline")}
                  <i className="fa-solid fa-sparkles text-primary text-xl align-middle ml-1" aria-hidden="true" />
                </Title>
                <Text size="sm" c="white.8" className="max-w-[560px]">{t("parrainage_description")}</Text>
              </div>
              <Paper bg="white.1" p="md" radius="lg" className="text-center min-w-[160px]" style={{ backdropFilter: "blur(16px)" }}>
                <Title order={1} c="gold" className="font-bricolage">{activeCount}</Title>
                <Text size="xs" c="white.6">{t("parrainage_active_godchildren")}</Text>
              </Paper>
            </div>
          </div>

          {/* Code + Stats */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {/* Referral code card */}
            <Paper withBorder radius="lg" p="md" className="sm:col-span-2 lg:col-span-1">
              <Text size="xs" tt="uppercase" c="dimmed" fw={700} mb="sm">{t("parrainage_my_code")}</Text>
              <Paper bg="gray.0" withBorder p="xs" radius="md" mb="sm">
                <Group gap="sm">
                  <Text fw={700} size="xl" className="tracking-widest flex-1 font-bricolage">{code}</Text>
                  <button
                    onClick={copyLink}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-lg transition-all ${copied ? "bg-green-600" : "bg-primary hover:bg-primary-dark"}`}
                  >
                    <i className={`${copied ? "fa-solid fa-check" : "fa-regular fa-copy"} text-[11px]`} />
                    {copied ? t("parrainage_copied") : t("parrainage_copy")}
                  </button>
                </Group>
              </Paper>
              <Group gap="sm">
                <button
                  onClick={() => shareVia("whatsapp")}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#25D366]/10 border border-[#25D366]/20 text-[#1a9e4e] text-xs font-bold rounded-lg hover:bg-[#25D366]/20 transition-colors"
                >
                  <i className="fa-brands fa-whatsapp text-base" /> WhatsApp
                </button>
                <button
                  onClick={() => shareVia("sms")}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <i className="fa-solid fa-message text-base" /> SMS
                </button>
                <button
                  onClick={() => shareVia("copy-link")}
                  className="flex items-center justify-center w-10 py-2 bg-surface2 border border-borda text-textMuted rounded-lg hover:border-primary hover:text-primary transition-colors"
                >
                  <i className="fa-solid fa-link text-xs" />
                </button>
              </Group>
            </Paper>

            {/* Earnings card */}
            <Paper withBorder radius="lg" p="md">
              <Group justify="space-between" mb="md">
                <Paper bg="primary.0" p="xs" radius="md">
                  <i className="fa-solid fa-wallet text-primary" />
                </Paper>
                <Badge color="green" variant="light" size="sm">{t("parrainage_this_month")}</Badge>
              </Group>
              <div>
                <Title order={3} className="text-textMain font-bricolage">
                  {totalGains.toLocaleString("fr-FR")} <Text component="span" size="sm" c="dimmed">XAF</Text>
                </Title>
                <Text size="xs" c="dimmed">{t("parrainage_earnings_total")}</Text>
              </div>
              <Progress value={Math.min((totalGains / 5000) * 100, 100)} color="gold" size="sm" mt="md" radius="xl" />
              <Text size="xs" c="dimmed" mt="xs">
                {t("parrainage_next_milestone")} : <Text component="span" fw={700} c="dark">5 000 XAF</Text>
              </Text>
            </Paper>

            {/* Slots card */}
            <Paper withBorder radius="lg" p="md">
              <Group justify="space-between" mb="md">
                <Paper bg="green.0" p="xs" radius="md">
                  <i className="fa-solid fa-file-circle-plus text-green-mid" />
                </Paper>
                <Badge color="gold" variant="light" size="sm">Bonus actifs</Badge>
              </Group>
              <div>
                <Title order={3} className="text-textMain font-bricolage">
                  +{totalSlots} <Text component="span" size="sm" c="dimmed">slots</Text>
                </Title>
                <Text size="xs" c="dimmed">{t("parrainage_bonus_reports")}</Text>
              </div>
              <Group gap="xs" mt="md">
                <i className="fa-solid fa-circle-info text-sm" />
                <Text size="xs" c="dimmed">{t("parrainage_slots_per_referral")}</Text>
              </Group>
            </Paper>
          </SimpleGrid>

          {/* How it works */}
          <Paper withBorder radius="lg" p="md">
            <Title order={5} mb="md" className="text-textMain">
              <Group gap="xs" component="span">
                <i className="fa-solid fa-circle-question text-primary" /> {t("parrainage_how_it_works")}
              </Group>
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
              {[
                {
                  icon: "fa-solid fa-share-nodes",
                  bg: "bg-primary/10",
                  border: "border-primary/20",
                  color: "text-primary",
                  step: "1",
                  title: "Partagez votre code",
                  desc: "Envoyez votre code à un ami via WhatsApp, SMS ou lien direct.",
                },
                {
                  icon: "fa-solid fa-user-plus",
                  bg: "bg-green-light",
                  border: "border-green-dark/20",
                  color: "text-green-mid",
                  step: "2",
                  title: "Il s'inscrit & valide",
                  desc: "Votre filleul crée son compte avec votre code et effectue son 1er enregistrement.",
                },
                {
                  icon: "fa-solid fa-trophy",
                  bg: "bg-amber-50",
                  border: "border-amber-200",
                  color: "text-amber-500",
                  step: "3",
                  title: "Vous gagnez tous les deux",
                  desc: "50% de l'abonnement pour vous + 1 mois gratuit pour votre filleul.",
                },
              ].map((item) => (
                <Stack key={item.step} align="center" gap="sm" className="text-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${item.bg} ${item.border} ${item.color}`}>
                    <i className={`${item.icon} text-xl`} />
                  </div>
                  <div>
                    <Badge color="gold" variant="light" size="xs" mb="xs">Étape {item.step}</Badge>
                    <Text fw={600} size="sm" mb={2}>{item.title}</Text>
                    <Text size="xs" c="dimmed">{item.desc}</Text>
                  </div>
                </Stack>
              ))}
            </SimpleGrid>
          </Paper>

          {/* Rewards */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Paper withBorder radius="lg" p="md">
              <Title order={5} mb="md" className="text-textMain">
                <Group gap="xs" component="span">
                  <i className="fa-solid fa-medal text-primary" />Vos récompenses
                </Group>
              </Title>
              <Stack gap="sm">
                {[
                  { icon: "fa-solid fa-coins", bg: "bg-primary/10", color: "text-primary", label: "Bonus en cash", sub: "50% de l'abonnement du filleul", value: "Variable" },
                  { icon: "fa-solid fa-file-circle-plus", bg: "bg-green-light", color: "text-green-mid", label: "Signalement bonus", sub: "Par parrainage validé", value: "+2 slots" },
                  { icon: "fa-solid fa-crown", bg: "bg-amber-50", color: "text-amber-500", label: "Upgrade de plan", sub: "À partir de 5 filleuls", value: "1 mois Pro" },
                ].map((item) => (
                  <Group key={item.label} justify="space-between" py="sm" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
                    <Group gap="sm">
                      <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                        <i className={`${item.icon} ${item.color} text-xs`} />
                      </div>
                      <div>
                        <Text size="sm" fw={600}>{item.label}</Text>
                        <Text size="xs" c="dimmed">{item.sub}</Text>
                      </div>
                    </Group>
                    <Text fw={700} size="sm" className={`font-bricolage ${item.color}`}>{item.value}</Text>
                  </Group>
                ))}
              </Stack>
            </Paper>
            <Paper bg="green-dark" radius="lg" p="md" className="relative overflow-hidden">
              <div className="absolute w-40 h-40 rounded-full bg-primary/8 -bottom-10 -right-10 pointer-events-none" />
              <div className="relative z-10">
                <Title order={5} c="white" mb="xs">
                  <Group gap="xs" component="span">
                    <i className="fa-solid fa-gift text-primary" />Cadeau pour votre filleul
                  </Group>
                </Title>
                <Text size="xs" c="white.5" mb="md">Ce que reçoit chaque personne que vous parrainez</Text>
                <Stack gap="sm">
                  {[
                    "1 mois d'abonnement Standard offert",
                    "3 déclarations gratuites dès l'inscription",
                    "Accès prioritaire au support",
                  ].map((text) => (
                    <Group key={text} gap="sm">
                      <Paper bg="primary.2" p={4} radius="xl">
                        <i className="fa-solid fa-check text-primary text-xs" />
                      </Paper>
                      <Text size="sm" c="white.8">{text}</Text>
                    </Group>
                  ))}
                </Stack>
              </div>
            </Paper>
          </SimpleGrid>

          {/* Friends Circle Trigger Card */}
          <Paper
            withBorder
            radius="lg"
            className="overflow-hidden cursor-pointer hover:border-primary hover:shadow-sm transition-all"
            onClick={openPanel}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPanel(); } }}
          >
            <div className="p-5 pb-4">
              <Group justify="space-between" mb="md">
                <Group gap="sm">
                  <Paper bg="primary.0" p="xs" radius="md">
                    <i className="fa-solid fa-users text-primary" />
                  </Paper>
                  <div>
                    <Text fw={700} size="sm" className="text-textMain">Cercle d'amis</Text>
                    <Text size="xs" c="dimmed">Vos filleuls parrainés</Text>
                  </div>
                </Group>
                <Group gap="sm">
                  <Badge color="green" variant="light" size="sm" leftSection={<i className="fa-solid fa-circle text-green-mid text-[7px]" />}>
                    {activeCount} actifs
                  </Badge>
                  <Paper bg="gray.0" withBorder p="xs" radius="md">
                    <i className="fa-solid fa-chevron-up text-xs md:hidden" />
                    <i className="fa-solid fa-expand text-xs hidden md:block" />
                  </Paper>
                </Group>
              </Group>

              {/* Mini stats */}
              <SimpleGrid cols={3} spacing="sm" mb="md">
                <Paper bg="gray.0" p="sm" radius="md" className="text-center">
                  <Text fw={700} size="lg" className="font-bricolage text-textMain">{totalFriends}</Text>
                  <Text size="xs" c="dimmed">Total</Text>
                </Paper>
                <Paper bg="gray.0" p="sm" radius="md" className="text-center">
                  <Text fw={700} size="lg" className="font-bricolage text-primary">{totalGains.toLocaleString("fr-FR")}</Text>
                  <Text size="xs" c="dimmed">XAF gagnés</Text>
                </Paper>
                <Paper bg="gray.0" p="sm" radius="md" className="text-center">
                  <Text fw={700} size="lg" className="font-bricolage text-green-mid">+{totalSlots}</Text>
                  <Text size="xs" c="dimmed">Slots bonus</Text>
                </Paper>
              </SimpleGrid>

              {/* Avatar stack */}
              <Group justify="space-between">
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
                <Group gap={4} c="gold" className="text-xs">
                  <span className="md:hidden">Voir tous</span>
                  <span className="hidden md:inline">Ouvrir le détail</span>
                  <i className="fa-solid fa-arrow-up-from-line text-[10px] md:hidden" />
                  <i className="fa-solid fa-up-right-from-square text-[10px] hidden md:inline" />
                </Group>
              </Group>
            </div>

            {/* Last activity */}
            <Paper bg="gray.0" p="sm" className="flex items-center gap-2.5" style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
              {latestFriend ? (
                <>
                  <div className={`w-6 h-6 rounded-full ${latestFriend.color} flex items-center justify-center text-[9px] font-bold flex-shrink-0`}>
                    {latestFriend.initials}
                  </div>
                  <Text size="xs" c="dimmed" className="flex-1">
                    <Text component="span" fw={600} c="dark">{latestFriend.name}</Text> a rejoint {relativeDate(latestFriend.joined).toLowerCase()}
                  </Text>
                  <i className="fa-solid fa-clock text-textMuted text-[10px]" />
                </>
              ) : (
                <Text size="xs" c="dimmed">Aucun filleul pour le moment.</Text>
              )}
            </Paper>
          </Paper>
        </div>
      </div>

      {/* Friends Panel - Bottom sheet on mobile, Modal on desktop */}
      <Modal
        opened={panelOpen}
        onClose={closePanel}
        size="lg"
        padding="md"
        title={
          <div>
            <Text fw={700} size="md">Cercle d'amis parrainés</Text>
            <Text size="xs" c="dimmed">
              {totalFriends} filleuls · <Text component="span" c="gold" fw={600}>{activeCount} avec abonnement</Text>
            </Text>
          </div>
        }
      >
        {/* Search */}
        <TextInput
          placeholder="Rechercher un filleul…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          radius="xl"
          size="sm"
          mb="sm"
          leftSection={<i className="fa-solid fa-magnifying-glass text-textMuted text-xs" />}
        />

        {/* Filters */}
        <Group gap="xs" mb="md">
          {(["all", "active", "inactive", "recent"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
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
        </Group>

        <Divider mb="md" />

        {/* Gains summary */}
        <Paper bg="gray.0" p="sm" radius="md" mb="md">
          <Group gap="md">
            <Group gap="xs">
              <Paper bg="primary.0" p={6} radius="md">
                <i className="fa-solid fa-coins text-primary text-xs" />
              </Paper>
              <div>
                <Text fw={700} size="sm">{totalGains.toLocaleString("fr-FR")} XAF</Text>
                <Text size="xs" c="dimmed">Cash total</Text>
              </div>
            </Group>
            <Divider orientation="vertical" />
            <Group gap="xs">
              <Paper bg="green.0" p={6} radius="md">
                <i className="fa-solid fa-file-circle-plus text-green-mid text-xs" />
              </Paper>
              <div>
                <Text fw={700} size="sm">+{totalSlots} slots</Text>
                <Text size="xs" c="dimmed">Bonus</Text>
              </div>
            </Group>
            <Divider orientation="vertical" />
            <Group gap="xs">
              <Paper bg="gold.0" p={6} radius="md">
                <i className="fa-solid fa-trophy text-amber-500 text-xs" />
              </Paper>
              <div>
                <Text fw={700} size="sm">{Math.min(totalFriends, 10)} / 10</Text>
                <Text size="xs" c="dimmed">Vers Pro</Text>
              </div>
            </Group>
          </Group>
        </Paper>

        {/* Progress bar */}
        <div className="mb-4">
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed">Progression vers le palier Pro</Text>
            <Text fw={700} size="xs">{Math.min(totalFriends, 10)} / 10</Text>
          </Group>
          <Progress value={progressPct} color="gold" size="sm" radius="xl" />
        </div>

        {/* Friend list or empty state */}
        <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
          {getFiltered().length === 0 ? (
            <Stack align="center" py="xl" gap="md">
              <Paper bg="gray.0" withBorder p="md" radius="lg">
                <i className="fa-solid fa-user-slash text-textMuted text-2xl" />
              </Paper>
              <Text fw={600} size="sm">Aucun résultat</Text>
              <Text size="xs" c="dimmed">Essayez un autre filtre ou recherche</Text>
            </Stack>
          ) : (
            <Stack gap={0}>
              {getFiltered().map((f, i) => (
                <Group key={f.id} gap="sm" py="sm" className="hover:bg-surface2 transition-colors" style={{ animation: `fadeUp 0.25s ease both`, animationDelay: `${i * 40}ms` }}>
                  <div className="relative flex-shrink-0">
                    <div className={`w-11 h-11 rounded-full ${f.color} flex items-center justify-center font-bricolage text-[13px] font-bold`}>
                      {f.initials}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-[10px] h-[10px] rounded-full border-2 border-white ${f.active ? "bg-green-mid" : "bg-gray-300"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Text size="sm" fw={600} truncate>{f.name}</Text>
                    <Text size="xs" c="dimmed">
                      <i className="fa-regular fa-calendar text-[9px] mr-1" />{relativeDate(f.joined)}
                    </Text>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {f.active ? (
                      <Badge color="green" variant="light" size="xs">Abonné</Badge>
                    ) : (
                      <Badge color="gray" variant="light" size="xs">Sans abonnement</Badge>
                    )}
                    {f.reward > 0 ? (
                      <Text size="xs" c="gold" fw={600}>+{f.reward} XAF · +{f.slots} slots</Text>
                    ) : (
                      <Text size="xs" c="dimmed" fs="italic">En attente</Text>
                    )}
                  </div>
                </Group>
              ))}
            </Stack>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => { closePanel(); copyInviteLink(); }}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-green-dark text-white text-sm font-bold rounded-xl hover:bg-green-mid transition-colors mt-4"
        >
          <i className="fa-solid fa-user-plus text-sm" /> Inviter un nouvel ami
        </button>
      </Modal>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .avatar-active { animation: pulseRing 2s infinite; }
        @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(217,138,48,0.4); } 70% { box-shadow: 0 0 0 8px rgba(217,138,48,0); } 100% { box-shadow: 0 0 0 0 rgba(217,138,48,0); } }
      `}</style>
    </div>
  );
}
