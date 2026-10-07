import { ActionIcon, Button, Group, Paper, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { useSmsUpsell, useUpsellSnooze } from "../../hooks/useSmsUpsell";

interface SmsAlertUpsellProps {
  spot: string;
  variant?: "inline" | "card";
}

export default function SmsAlertUpsell({ spot, variant = "inline" }: SmsAlertUpsellProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { ready, show, planName, planPrice } = useSmsUpsell();
  const { snoozed, snooze } = useUpsellSnooze(spot);

  if (!ready || !show || snoozed) return null;

  const isCard = variant === "card";
  const price = planPrice.toLocaleString("fr-FR");

  return (
    <Paper
      withBorder
      radius={isCard ? 18 : "md"}
      p={isCard ? "md" : "xs"}
      onClick={(e) => e.stopPropagation()}
      style={{
        background: isCard ? "var(--color-surface)" : "var(--color-surface2)",
        borderColor: isCard ? "var(--color-borda)" : undefined,
      }}
    >
      <Group gap="sm" align="flex-start" wrap="nowrap">
        <i
          className="fa-solid fa-comment-sms flex-shrink-0 text-textMuted"
          style={{ fontSize: isCard ? 17 : 15, marginTop: 2 }}
          aria-hidden="true"
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          {isCard && (
            <Text size="sm" fw={600} style={{ lineHeight: 1.4 }}>
              {t("upsell_sms_headline")}
            </Text>
          )}
          <Text
            size="xs"
            fw={isCard ? 400 : 600}
            c={isCard ? "dimmed" : undefined}
            mt={isCard ? 4 : 0}
            style={{ lineHeight: 1.5 }}
          >
            {t(isCard ? "upsell_sms_body" : "upsell_sms_body_short", { plan: planName, price })}
          </Text>
          <Button
            variant="subtle"
            color="green"
            size="sm"
            mt={isCard ? "sm" : 6}
            styles={{ root: { paddingLeft: 0 } }}
            rightSection={<i className="fa-solid fa-arrow-right text-[9px]" />}
            onClick={() => navigate("/abonnement")}
          >
            {t("upsell_sms_cta", { plan: planName })}
          </Button>
        </div>
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="md"
          aria-label={t("upsell_sms_dismiss")}
          onClick={snooze}
          styles={{ root: { width: 44, height: 44, flexShrink: 0, marginTop: -6 } }}
        >
          <i className="fa-solid fa-xmark text-sm" />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
