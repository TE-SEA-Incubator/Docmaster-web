import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import {
  Text,
  Stack,
  Group,
  Modal,
  Affix,
  UnstyledButton,
  ThemeIcon,
  Paper,
  Button,
  Divider,
  useMantineTheme,
} from "@mantine/core";
import {
  IconHome,
  IconCirclePlus,
  IconFolderOpen,
  IconDeviceMobile,
  IconAlertTriangle,
  IconFileCheck,
  IconFile,
  IconSearch,
  IconChevronRight,
} from "@tabler/icons-react";

export default function MobileNav() {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const [declModalOpen, setDeclModalOpen] = useState(false);

  if (!user) return null;

  const current = location.pathname;

  // Cacher la bottom nav sur la page messagerie (expérience fullscreen)
  if (current.startsWith("/messagerie")) return null;

  const items = [
    { to: "/dashboard", Icon: IconHome, label: t("nav_home") },
    { to: "#decl", Icon: IconCirclePlus, label: t("mobile_declaration"), isPlus: true },
    { to: "/mes-documents", Icon: IconFolderOpen, label: t("mobile_documents") },
    { to: "/mes-appareils", Icon: IconDeviceMobile, label: t("mobile_objects") },
  ];

  const declOptions = [
    {
      Icon: IconAlertTriangle,
      color: "red",
      title: t("mobile_declare_lost"),
      desc: t("mobile_lost_document_desc"),
      onClick: () => { setDeclModalOpen(false); navigate("/declarer"); },
    },
    {
      Icon: IconFileCheck,
      color: "blue",
      title: t("mobile_declare_found"),
      desc: t("mobile_found_something_desc"),
      onClick: () => { setDeclModalOpen(false); navigate("/trouver"); },
    },
    {
      Icon: IconFile,
      color: "orange",
      title: t("mobile_my_declarations"),
      desc: t("mobile_view_declarations"),
      onClick: () => { setDeclModalOpen(false); navigate("/mes-declarations"); },
    },
    {
      Icon: IconSearch,
      color: "orange",
      title: t("mobile_search"),
      desc: t("mobile_search_document"),
      onClick: () => { setDeclModalOpen(false); navigate("/rechercher"); },
    },
  ];

  return (
    <>
      <Affix position={{ bottom: 0, left: 0, right: 0 }} zIndex={50} hiddenFrom="md">
        <Paper
          component="nav"
          radius={0}
          shadow="md"
          withBorder
          style={{
            borderLeft: "none",
            borderRight: "none",
            borderBottom: "none",
            backgroundColor: "var(--mantine-color-body)",
            backdropFilter: "blur(20px)",
            paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)",
            paddingTop: "0.5rem",
          }}
        >
          <Group justify="space-between" wrap="nowrap" px="xs" style={{ maxWidth: 480, margin: "0 auto" }}>
            {items.map((item) => {
              const isActive = current === item.to;
              return (
                <UnstyledButton
                  key={item.to}
                  component={item.isPlus ? "button" : Link}
                  to={item.isPlus ? undefined : item.to}
                  onClick={item.isPlus ? () => setDeclModalOpen(true) : undefined}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <Stack align="center" gap={4} py={4}>
                    <item.Icon
                      size={20}
                      stroke={2}
                      color={isActive ? theme.colors.orange[5] : "var(--mantine-color-gray-5)"}
                      style={isActive ? { filter: `drop-shadow(0 0 8px ${theme.colors.orange[5]}99)`, transform: "scale(1.1)" } : undefined}
                    />
                    <Text
                      size="9px"
                      fw={700}
                      tt="uppercase"
                      truncate
                      c={isActive ? "orange.5" : "dimmed"}
                      style={{ letterSpacing: -0.2 }}
                    >
                      {item.label}
                    </Text>
                  </Stack>
                </UnstyledButton>
              );
            })}
          </Group>
        </Paper>
      </Affix>

      {/* Declaration options bottom sheet */}
      <Modal
        opened={declModalOpen}
        onClose={() => setDeclModalOpen(false)}
        padding="lg"
        radius="lg"
        withCloseButton={false}
      >
        <Stack align="center" gap="lg">
          <Divider w={40} size="md" radius="xl" color="gray.3" style={{ alignSelf: "center" }} />
          <Text fw={700} size="lg" ta="center" className="font-bricolage">{t("mobile_make_declaration")}</Text>
          <Stack gap="sm" w="100%">
            {declOptions.map((opt) => (
              <Paper
                key={opt.title}
                component="button"
                onClick={opt.onClick}
                withBorder
                radius="md"
                p="sm"
                bg={`${opt.color}.0`}
                style={{ borderColor: `var(--mantine-color-${opt.color}-1)`, textAlign: "left", cursor: "pointer" }}
              >
                <Group gap="sm" wrap="nowrap">
                  <ThemeIcon size={40} radius="md" color={opt.color} variant="filled">
                    <opt.Icon size={18} stroke={2} />
                  </ThemeIcon>
                  <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={700} size="sm" truncate>{opt.title}</Text>
                    <Text size="xs" c={`${opt.color}.7`} truncate>{opt.desc}</Text>
                  </Stack>
                  <IconChevronRight size={14} color={`var(--mantine-color-${opt.color}-3)`} style={{ flexShrink: 0 }} />
                </Group>
              </Paper>
            ))}
          </Stack>
          <Button onClick={() => setDeclModalOpen(false)} variant="subtle" color="gray" fullWidth tt="uppercase" fw={700} styles={{ label: { letterSpacing: 1.5 } }}>
            {t("mobile_cancel")}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}