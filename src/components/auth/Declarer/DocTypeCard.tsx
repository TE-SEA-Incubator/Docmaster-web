import { Card, Text, Badge, ThemeIcon } from "@mantine/core";
import { useI18n } from "../../../context/I18nContext";
import { phClass } from "../../../utils/phosphorIcons";

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
  onToggle: (id: string) => void;
}

/**
 * Selectable tile representing one document type. Visual states:
 * - selected: orange-tinted background, check badge in corner, filled icon
 * - unselected: white background, light icon variant
 *
 * Règle métier : une seule déclaration de perte active à la fois, donc un seul
 * type sélectionnable (le clic remplace la sélection précédente).
 */
export default function DocTypeCard({ doc, selected, onToggle }: DocTypeCardProps) {
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
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {selected && (
        <ThemeIcon
          size="sm"
          radius="xl"
          color="orange"
          variant="filled"
          style={{ position: "absolute", top: 6, right: 6 }}
        >
          <i className="ph ph-check" style={{ fontSize: 9 }} />
        </ThemeIcon>
      )}
      <ThemeIcon
        size={40}
        radius="md"
        color="orange"
        variant={selected ? "filled" : "light"}
        mx="auto"
        mb="xs"
      >
        <i className={`${phClass(doc.icone || "file")}`} style={{ fontSize: 18 }} />
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
