import { useEffect, useState } from "react";
import { Alert, Button, Group, Select, Stack, Text, Textarea } from "@mantine/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "./dialog";
import {
  reportsService,
  type ReportReasonCategory,
  type ReportTargetType,
} from "../../services/reportsService";
import { useI18n } from "../../context/I18nContext";

interface ReportModalProps {
  opened: boolean;
  onClose: () => void;
  targetType?: ReportTargetType;
  targetId?: string | null;
  title?: string;
  intro?: string;
}

const REASON_KEYS: Array<{ value: ReportReasonCategory; key: string }> = [
  { value: "WRONG_DOCUMENT", key: "reports_reason_wrong_document" },
  { value: "NO_HANDOVER", key: "reports_reason_no_handover" },
  { value: "FRAUD", key: "reports_reason_fraud" },
  { value: "ABUSIVE", key: "reports_reason_abusive" },
  { value: "OTHER", key: "reports_reason_other" },
];

export default function ReportModal({
  opened,
  onClose,
  targetType = "SUPPORT",
  targetId = null,
  title,
  intro,
}: ReportModalProps) {
  const { t } = useI18n();
  const isSupport = targetType === "SUPPORT";
  const reasonOptions = REASON_KEYS.map((option) => ({ value: option.value, label: t(option.key) }));
  const [reason, setReason] = useState<ReportReasonCategory>(isSupport ? "OTHER" : "WRONG_DOCUMENT");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentId, setSentId] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setReason(isSupport ? "OTHER" : "WRONG_DOCUMENT");
    setDescription("");
    setError("");
    setSentId(null);
    setSending(false);
  }, [opened, isSupport]);

  const submit = async () => {
    const trimmed = description.trim();
    if (trimmed.length < 10) {
      setError(t("report_modal_min_chars"));
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await reportsService.create({
        target_type: targetType,
        target_id: isSupport ? null : targetId,
        reason_category: reason,
        description: trimmed,
      });
      if (!res.success) {
        setError(res.message || t("report_modal_error_send"));
        return;
      }
      setSentId(res.data?.id || "sent");
    } catch (err: any) {
      setError(err?.response?.data?.message || t("report_modal_error_send_generic"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={opened}
      onOpenChange={(open) => {
        if (!open && !sending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title || t(isSupport ? "report_modal_title_support" : "report_modal_title_report")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
      {sentId ? (
        <Stack gap="md">
          <Alert color="green" variant="light" radius="md">
            {t(isSupport ? "report_modal_success_support" : "report_modal_success_report")}
          </Alert>
          <Text size="xs" c="dimmed">
            {t("report_modal_reference")} : SIG-{String(sentId).slice(0, 8).toUpperCase()}
          </Text>
          <Group justify="flex-end">
            <Button radius="xl" variant="default" onClick={onClose}>
              {t("report_modal_close")}
            </Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {intro ||
              t(isSupport ? "report_modal_intro_support" : "report_modal_intro_report")}
          </Text>

          {error && (
            <Alert color="red" variant="light" radius="md">
              {error}
            </Alert>
          )}

          <Select
            label={t("report_modal_reason")}
            data={reasonOptions}
            value={reason}
            onChange={(value) => setReason((value as ReportReasonCategory) || "OTHER")}
            radius="md"
            allowDeselect={false}
          />

          <Textarea
            label={t("report_modal_description")}
            placeholder={t("report_modal_placeholder")}
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
            minRows={4}
            maxLength={2000}
            radius="md"
            autosize
          />

          <Group justify="flex-end" gap="sm">
            <Button radius="xl" variant="default" onClick={onClose} disabled={sending}>
              {t("report_modal_cancel")}
            </Button>
            <Button
              radius="xl"
              loading={sending}
              onClick={submit}
              style={{ backgroundColor: "#2D5A42" }}
              leftSection={<i className="ph ph-flag" aria-hidden="true" />}
            >
              {t("report_modal_send")}
            </Button>
          </Group>
        </Stack>
      )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
