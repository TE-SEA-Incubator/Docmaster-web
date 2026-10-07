import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { usePromo } from "../hooks/usePromo";
import { useConversationUnread } from "../hooks/useConversationUnread";
import { getPhotoUrl } from "../utils/image";
import VipAvatar, { isVipUser } from "../components/ui/VipBadge";
import { Avatar, Group, Text, UnstyledButton, Modal, Stack, Title, Button } from "@mantine/core";

type SidebarNavItem = { to: string; icon: string; label: string; badge?: number };

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { promo } = usePromo();
  const { unreadTotal: unreadMessages } = useConversationUnread();
  const [open, setOpen] = useState(() => window.innerWidth >= 900);
  const [userClosed, setUserClosed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isLargeScreen = () => window.innerWidth >= 900;

  const navItems: { section: string; items: SidebarNavItem[] }[] = [
    {
      section: t("sidebar_primary"),
      items: [
        { to: "/dashboard", icon: "fa-solid fa-house", label: t("sidebar_dashboard") },
        { to: "/mes-documents", icon: "fa-solid fa-list-check", label: t("sidebar_saved") },
        { to: "/mes-appareils", icon: "fa-solid fa-mobile-screen-button", label: t("sidebar_devices") },
      ],
    },
    {
      section: t("sidebar_account"),
      items: [
        { to: "/mes-declarations", icon: "fa-solid fa-clock-rotate-left", label: t("sidebar_declarations") },
        {
          to: "/messagerie",
          icon: "fa-solid fa-message",
          label: "Messagerie",
          badge: unreadMessages,
        },
        { to: "/mes-gains", icon: "fa-solid fa-wallet", label: t("sidebar_earnings") },
        { to: "/parrainage", icon: "fa-solid fa-gift", label: t("sidebar_referral") },
        { to: "/abonnement", icon: "fa-solid fa-crown", label: t("sidebar_subscription") },
        { to: "/infos-profil", icon: "fa-solid fa-user", label: t("sidebar_profile") },
      ],
    },
  ];

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 900 && !userClosed) setOpen(true);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [userClosed]);

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar", open ? "260px" : "0px");
  }, [open]);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    navigate("/");
  };

  const close = () => { setOpen(false); setUserClosed(true); };
  const toggle = () => { setOpen((p) => !p); setUserClosed(true); };
  (window as any).__sidebarToggle = toggle;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 md:hidden ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={close}
      />

      <aside
        id="sidebar"
        className={`fixed left-0 top-0 bottom-0 w-[260px] z-40 flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ backgroundColor: "#2D5A42" }}
      >
        {/* Logo */}
        <div className="flex items-center px-5 py-4 border-b border-white/10 flex-shrink-0">
          <Link to="/dashboard">
            <img src="/src/assets/images/docmaster.png" alt="DocMaster" className="h-14 w-auto object-contain rounded brightness-0 invert" />
          </Link>
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto py-2 custom-scroll">
          {navItems.map((section) => (
            <div key={section.section}>
              <div className="px-5 pt-4 pb-1 text-[9.5px] font-bold text-white/30 uppercase tracking-widest">
                {section.section}
              </div>
              <nav className="flex flex-col gap-0.5 px-2">
                {section.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => { if (!isLargeScreen()) close(); }}
                      className={`sb-item ${isActive(item.to) ? "active" : ""}`}
                    >
                      <div className="nav-icon">
                        <i className={`${item.icon}`} />
                      </div>
                      {item.label}
                      {!!item.badge && (
                        <span
                          title={`${item.badge} message(s) non lu(s)`}
                          className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center"
                        >
                          {item.badge > 9 ? "9+" : item.badge}
                        </span>
                      )}
                    </Link>
                ))}
              </nav>
            </div>
          ))}
          <div className="px-5 pt-4 pb-1 text-[9.5px] font-bold text-white/30 uppercase tracking-widest">
            Actions
          </div>
          <nav className="flex flex-col gap-0.5 px-2">
            <a
              onClick={handleLogout}
              className="sb-item flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-red-400/70 hover:bg-white/5 hover:text-red-400"
              style={{ cursor: "pointer" }}
            >
              <div className="nav-icon">
                <i className="fa-solid fa-right-from-bracket" />
              </div>
              {t("sidebar_logout")}
            </a>
          </nav>
        </div>

        {promo && (() => {
          const p = promo as any;
          const origPrice = p.original_price ?? 0;
          const discount = origPrice > 0 ? Math.round((1 - p.price / origPrice) * 100) : 0;
          return (
            <div className="relative mx-2 mb-1 px-3 py-2.5 bg-sky-600 rounded-[12px] overflow-hidden flex-shrink-0">
              <img
                src="/src/assets/images/promo.png"
                alt=""
                className="absolute right-0 top-0 h-full w-auto object-contain pointer-events-none select-none"
              />
              <Link to="/abonnement" className="block relative z-10" onClick={() => { if (!isLargeScreen()) close(); }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">-{discount}%</span>
                  <span className="text-white/70 text-[9px] font-medium">VIP {p.duration_months} mois</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white text-[13px] font-extrabold">
                    {p.price.toLocaleString("fr-FR")} <span className="text-[10px] font-bold text-white/70">XAF</span>
                  </span>
                  <span className="text-white/80 text-[9px] font-semibold underline underline-offset-2">Activer</span>
                </div>
              </Link>
            </div>
          );
        })()}

        {/* User footer */}
        <div className="px-2 py-3 border-t border-white/10">
          <UnstyledButton
            component={Link}
            to="/infos-profil"
            className="flex items-center w-full px-3 py-2 rounded-[10px] hover:bg-white/5 transition-colors"
          >
            <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
              <VipAvatar isVip={isVipUser(user)}>
                {user?.photo_url ? (
                  <Avatar src={getPhotoUrl(user.photo_url)} size={30} radius="md" />
                ) : (
                  <Avatar size={30} radius="md" color="gold">
                    {user?.initial || "DM"}
                  </Avatar>
                )}
              </VipAvatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={600} c="white" truncate>
                  {user?.prenom || ""} {user?.nom || ""}
                </Text>
                <Group gap={6} mt={2}>
                  <div className={`w-1.5 h-1.5 rounded-full ${user?.subscription?.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <Text size="xs" c="white.4" truncate>
                    {user?.subscription?.plan_name || t("sidebar_plan_standard")}
                  </Text>
                </Group>
              </div>
              <i className="fa-solid fa-chevron-right" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }} />
            </Group>
          </UnstyledButton>
        </div>
      </aside>

      <Modal
        opened={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        withCloseButton={false}
        size="sm"
        padding="lg"
      >
        <Stack align="center" gap="md">
          <i className="fa-solid fa-right-from-bracket text-red-500 text-2xl" />
          <Title order={3} size="lg" ta="center">{t("logout_confirm_title")}</Title>
          <Text size="sm" c="dimmed" ta="center">{t("logout_confirm_desc")}</Text>
          <Group gap="sm" className="w-full">
            <Button
              onClick={() => setShowLogoutConfirm(false)}
              variant="default"
              className="flex-1"
              radius="lg"
            >
              {t("logout_confirm_cancel")}
            </Button>
            <Button
              onClick={confirmLogout}
              color="red"
              className="flex-1 shadow-lg shadow-red-500/20"
              radius="lg"
            >
              {t("logout_confirm_yes")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
