import { Group, Text, Badge } from "@mantine/core";
import { useI18n } from "../../../context/I18nContext";

interface FieldLabelProps {
  icon?: string;
  labelKey: string;
  required?: boolean;
  optional?: boolean;
}

/**
 * Uppercase micro-label used above every form input in the declaration flow.
 * Includes an optional icon, an optional "required" red asterisk, and an
 * "optional" badge when the field is not required.
 */
export default function FieldLabel({ icon, labelKey, required, optional }: FieldLabelProps) {
  const { t } = useI18n();
  return (
    <Group gap={6} mb={4}>
      {icon && <i className={`${icon}`} style={{ fontSize: 11, color: "var(--color-primary)" }} />}
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.4 }}>
        {t(labelKey)}
      </Text>
      {required && <Text c="red" fw={700} size="xs">*</Text>}
      {optional && (
        <Badge size="xs" variant="default" color="gray" radius="sm">
          {t("declarer_optional")}
        </Badge>
      )}
    </Group>
  );
}
