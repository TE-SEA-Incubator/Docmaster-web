import { ThemeIcon, Title, Text, Paper, Group, Button, Stack } from "@mantine/core";
import { useI18n } from "../../../context/I18nContext";
import {
  Dialog,
  DialogContent,
  DialogBody,
} from "../../ui/dialog";

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
 * Renders as a Dialog responsive on all screen sizes.
 */
export default function ConfirmDeclarationModal({
  opened,
  isMobile,
  submitting,
  onClose,
  onConfirm,
}: ConfirmDeclarationModalProps) {
  const { t } = useI18n();

  return (
    <Dialog open={opened} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogBody>
          <Stack align="center" gap="sm">
            <ThemeIcon size={60} radius="xl" color="red" variant="light">
              <i className="ph ph-warning" style={{ fontSize: 24 }} />
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
                <i className="ph ph-info" style={{ marginRight: 6 }} />
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
                leftSection={!submitting && <i className="ph ph-check-circle" />}
              >
                {t("declarer_confirm")}
              </Button>
            </Group>
          </Stack>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
