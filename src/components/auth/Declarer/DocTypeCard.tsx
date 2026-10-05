import { Card, Text, Badge, ThemeIcon, ActionIcon, Group } from "@mantine/core";
import { useI18n } from "../../../context/I18nContext";

interface DocTypeCatalog {
  id: string;
  code: string;
  nom: string;
  icone: string;
  is_active: boolean;
  delai_expiration_mois: number;
}

interface DocTypeCardProps {
  doc: DocTypeCatalog;
  selected: boolean;
  count: number;
  onToggle: (id: string) => void;
  onAddMore: (id: string) => void;
  onRemoveMore: (id: string) => void;
}

/**
 * Selectable tile representing one document type. Visual states:
 * - selected: orange-tinted background, check badge in corner, filled icon
 * - unselected: white background, light icon variant
 *
 * A dedicated "+" button appears once the type is selected: it adds
 * another instance of the same type (e.g. a second CNI) without
 * triggering the toggle. A "-" button appears if count > 1.
 */
export default function DocTypeCard({ doc, selected, count, onToggle, onAddMore, onRemoveMore }: DocTypeCardProps) {
  const { t } = useI18n();
  const hasExp = (doc.delai_expiration_mois ?? 0) > 0;

  return (
    <Card
      component="button"
      type="button"
      onClick={() => onToggle(doc.id)}
      padding="md"
      radius="lg"
      withBorder
      style={{
        cursor: "pointer",
        textAlign: "center",
        background: selected ? "var(--color-primary-light)" : "white",
        borderColor: selected ? "var(--color-primary)" : "var(--color-borda)",
        boxShadow: selected ? "0 0 0 3px rgba(217,138,48,.18)" : undefined,
        transition: "all .2s",
        position: "relative",
        minHeight: 96,
      }}
    >
      {selected && (
        <>
          <ThemeIcon
            size="sm"
            radius="xl"
            color="orange"
            variant="filled"
            style={{ position: "absolute", top: 6, right: 6 }}
          >
            <i className="fa-solid fa-check" style={{ fontSize: 9 }} />
          </ThemeIcon>
          {count > 0 && (
            <Badge
              size="sm"
              color="orange"
              variant="light"
              radius="xl"
              style={{ position: "absolute", top: 6, left: 6 }}
            >
              ×{count}
            </Badge>
          )}
          <Group gap={4} style={{ position: "absolute", bottom: 8, right: 8 }}>
            {count > 1 && (
              <ActionIcon
                size="sm"
                radius="xl"
                variant="filled"
                color="red.6"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveMore(doc.id);
                }}
                aria-label={t("declarer_remove_another")}
                title={t("declarer_remove_another")}
              >
                <i className="fa-solid fa-minus" style={{ fontSize: 10 }} />
              </ActionIcon>
            )}
            <ActionIcon
              size="sm"
              radius="xl"
              variant="filled"
              color="green.9"
              onClick={(e) => {
                e.stopPropagation();
                onAddMore(doc.id);
              }}
              aria-label={t("declarer_add_another")}
              title={t("declarer_add_another")}
            >
              <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />
            </ActionIcon>
          </Group>
        </>
      )}
      <ThemeIcon
        size={40}
        radius="md"
        color="orange"
        variant={selected ? "filled" : "light"}
        mx="auto"
        mb="xs"
      >
        <i className={`fa-solid fa-${doc.icone || "file"}`} style={{ fontSize: 18 }} />
      </ThemeIcon>
      <Text size="xs" fw={600} c={selected ? "orange.8" : "dark.6"} lh={1.25}>
        {doc.nom}
      </Text>
      <Badge
        size="xs"
        mt={6}
        variant="light"
        color={hasExp ? "yellow" : "gray"}
        radius="sm"
      >
        {hasExp ? t("has_expiration") : t("no_expiration")}
      </Badge>
    </Card>
  );
}
