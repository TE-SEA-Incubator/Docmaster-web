import { Modal, Drawer, ThemeIcon, Title, Text, Paper, Group, Button, Stack, Box } from "@mantine/core";
import { useI18n } from "../../../context/I18nContext";

interface ConfirmDeclarationModalProps {
  opened: boolean;
  isMobile: boolean;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation step before submitting a declaration.
 *
 * Renders as a bottom-sheet Drawer on mobile and a centered Modal on desktop.
 */
export default function ConfirmDeclarationModal({
  opened,
  isMobile,
  submitting,
  onClose,
  onConfirm,
}: ConfirmDeclarationModalProps) {
  const { t } = useI18n();

  const body = (
    <Stack align="center" gap="sm">
      <ThemeIcon size={60} radius="xl" color="red" variant="light">
        <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 24 }} />
      </ThemeIcon>
      <Title order={3} ta="center" style={{ fontFamily: "Bricolage Grotesque" }}>
        {t("declarer_confirm_title")}
      </Title>
      <Text size="sm" c="dimmed" ta="center">
        {t("declarer_confirm_desc")}
      </Text>
      <Paper
        p="sm"
        radius="md"
        w="100%"
        style={{ background: "var(--mantine-color-orange-0)", border: "1px solid var(--mantine-color-orange-2)" }}
      >
        <Text size="xs" c="orange.9" fw={600}>
          <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }} />
          {t("declarer_cost_warning")}
        </Text>
      </Paper>
      <Group w="100%" gap="sm" grow>
        <Button variant="default" onClick={onClose}>
          {t("declarer_cancel")}
        </Button>
        <Button
          color="red"
          loading={submitting}
          onClick={onConfirm}
          leftSection={!submitting && <i className="fa-solid fa-circle-check" />}
        >
          {t("declarer_confirm")}
        </Button>
      </Group>
    </Stack>
  );

  if (isMobile) {
    return (
      <Drawer
        opened={opened}
        onClose={onClose}
        position="bottom"
        size="auto"
        withCloseButton={false}
        padding="lg"
        radius="lg"
        styles={{ content: { borderTopLeftRadius: 24, borderTopRightRadius: 24 } }}
      >
        <Box w={48} h={4} bg="gray.3" mx="auto" mb="md" style={{ borderRadius: 99 }} />
        {body}
      </Drawer>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      radius="lg"
      size="md"
      withCloseButton={false}
    >
      {body}
    </Modal>
  );
}
