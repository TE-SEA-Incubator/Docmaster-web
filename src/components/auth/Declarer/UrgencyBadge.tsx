import { Card, Group, Text } from "@mantine/core";

interface UrgencyBadgeProps {
  level: string;
  label: string;
  color: "green" | "yellow" | "red";
  icon: string;
  active: boolean;
  onSelect: (level: string) => void;
}

/**
 * Toggleable urgency level tile (low / medium / high) with themed color and icon.
 */
export default function UrgencyBadge({ level, label, color, icon, active, onSelect }: UrgencyBadgeProps) {
  return (
    <Card
      component="button"
      type="button"
      onClick={() => onSelect(level)}
      padding="sm"
      radius="md"
      withBorder
      style={{
        cursor: "pointer",
        flex: 1,
        textAlign: "center",
        background: active ? `var(--mantine-color-${color}-light)` : "white",
        borderColor: active ? `var(--mantine-color-${color}-filled)` : "var(--color-borda)",
      }}
    >
      <Group gap="xs" justify="center" wrap="nowrap">
        <i className={`${icon}`} style={{ fontSize: 8, color: `var(--mantine-color-${color}-filled)` }} />
        <Text size="sm" fw={600} c={active ? `${color}.7` : "dimmed"}>
          {label}
        </Text>
      </Group>
    </Card>
  );
}
