import { useEffect, useState } from "react";
import { Alert, Button, Group, Stack, Text, Textarea } from "@mantine/core";
import { useI18n } from "../../context/I18nContext";
import {
  testimonialsService,
  type MyTestimonial,
} from "../../services/testimonialsService";
import { TESTIMONIAL_LEVELS, levelFor } from "../../utils/testimonialLevels";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "./dialog";

interface TestimonialModalProps {
  opened: boolean;
  onClose: () => void;
  declarationId: string | null;
  onSubmitted?: (testimonial: MyTestimonial) => void;
}

export default function TestimonialModal({
  opened,
  onClose,
  declarationId,
  onSubmitted,
}: TestimonialModalProps) {
  const { t } = useI18n();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<MyTestimonial | null>(null);

  useEffect(() => {
    if (!opened) return;
    setRating(null);
    setComment("");
    setSending(false);
    setError("");
    setSent(null);
  }, [opened]);

  const submit = async () => {
    if (!declarationId) return;
    if (!rating) {
      setError(t("testimonial_modal_rating_required"));
      return;
    }
    const trimmed = comment.trim();
    if (trimmed.length < 10) {
      setError(t("testimonial_modal_min_chars"));
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await testimonialsService.create({
        declaration_id: declarationId,
        rating,
        comment: trimmed,
      });
      if (!res.success || !res.data) {
        setError(res.message || t("testimonial_modal_error"));
        return;
      }
      setSent(res.data);
      onSubmitted?.(res.data);
    } catch (err: any) {
      const status = err?.response?.status;
      const payload = err?.response?.data;
      if (status === 409 && payload?.data?.id) {
        setError(t("testimonial_modal_already"));
      } else if (status === 409) {
        setError(t("testimonial_modal_not_eligible"));
      } else {
        setError(payload?.message || t("testimonial_modal_error"));
      }
    } finally {
      setSending(false);
    }
  };

  const sentLevel = sent ? levelFor(sent.rating) : null;

  return (
    <Dialog open={opened} onOpenChange={() => { if (!sending) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("testimonial_modal_title")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {sent && sentLevel ? (
            <Stack gap="md">
              <div className="text-center py-2">
                <span className="block text-4xl leading-none" aria-hidden="true">
                  {sentLevel.emoji}
                </span>
                <p className="mt-2 text-[12px] font-bold text-textMuted uppercase tracking-wider">
                  {t(sentLevel.labelKey)}
                </p>
              </div>
              <Alert color="green" variant="light" radius="md">
                {t("testimonial_modal_success")}
              </Alert>
              {sent.comment && (
                <Text size="sm" c="dimmed" className="italic">
                  "{sent.comment}"
                </Text>
              )}
              <Group justify="flex-end">
                <Button radius="xl" variant="default" onClick={onClose}>
                  {t("testimonial_modal_close")}
                </Button>
              </Group>
            </Stack>
          ) : (
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                {t("testimonial_modal_intro")}
              </Text>

              {error && (
                <Alert color="red" variant="light" radius="md">
                  {error}
                </Alert>
              )}

              <div>
                <p className="text-[11px] font-bold text-textMuted uppercase tracking-wider mb-2">
                  {t("testimonial_modal_rating")}
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {TESTIMONIAL_LEVELS.map((level) => {
                    const selected = rating === level.rating;
                    return (
                      <button
                        key={level.rating}
                        type="button"
                        onClick={() => setRating(level.rating)}
                        aria-pressed={selected}
                        aria-label={t(level.labelKey)}
                        className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 transition-colors ${
                          selected
                            ? "border-primary text-primary"
                            : "border-borderMain text-textMuted hover:border-primary/60 hover:text-textMain"
                        }`}
                      >
                        <span className="text-2xl leading-none" aria-hidden="true">
                          {level.emoji}
                        </span>
                        <span className="text-[10px] font-bold text-center leading-tight">
                          {t(level.labelKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Textarea
                label={t("testimonial_modal_comment")}
                placeholder={t("testimonial_modal_placeholder")}
                value={comment}
                onChange={(event) => setComment(event.currentTarget.value)}
                minRows={4}
                maxLength={500}
                radius="md"
                autosize
              />

              <Group justify="flex-end" gap="sm">
                <Button radius="xl" variant="default" onClick={onClose} disabled={sending}>
                  {t("testimonial_modal_cancel")}
                </Button>
                <Button
                  radius="xl"
                  loading={sending}
                  onClick={submit}
                  style={{ backgroundColor: "#2D5A42" }}
                  leftSection={<i className="ph ph-star" aria-hidden="true" />}
                >
                  {t("testimonial_modal_send")}
                </Button>
              </Group>
            </Stack>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
