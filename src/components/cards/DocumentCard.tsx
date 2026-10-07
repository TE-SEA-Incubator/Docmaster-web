import { useState, useRef, useEffect } from "react";
import { Card, Text, Group, Badge, Menu, ActionIcon } from "@mantine/core";
import { useI18n } from "../../context/I18nContext";
import type { Document } from "../../types/api";

interface DocumentCardProps {
  doc: Document;
  catLabels: Record<string, string>;
  onView: (doc: Document) => void;
  onEdit: (doc: Document) => void;
  onShare: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onReportLost: (doc: Document) => void;
}

export default function DocumentCard({ doc, catLabels, onView, onEdit, onShare, onDelete, onReportLost }: DocumentCardProps) {
  const { t } = useI18n();
  const getPhotoUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `${window.location.origin}/${url.replace(/^\//, "")}`;
  };

  const isExpired = doc.date_expiration && doc.validity_option === 'EXPIRING' && new Date(doc.date_expiration) < new Date();

  return (
    <Card withBorder radius="lg" padding={0} opacity={doc.is_archived ? 0.6 : 1}>
      <Card.Section style={{ position: "relative", height: 140, cursor: "pointer" }} onClick={() => onView(doc)}>
        {doc.photo_recto ? (
          <img src={getPhotoUrl(doc.photo_recto)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
            <i className="fa-regular fa-file" style={{ fontSize: 30, color: "#cbd5e1" }} />
          </div>
        )}
        {doc.is_archived && (
          <Badge style={{ position: "absolute", top: 8, right: 8 }} size="sm" color="gray">
            <i className="fa-solid fa-box-archive" style={{ fontSize: 7 }} /> {t("doccard_archived")}
          </Badge>
        )}
        {doc.is_lost && (
          <Badge style={{ position: "absolute", top: 8, right: 8 }} size="sm" color="red" variant="light">
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 7 }} /> {t("doccard_lost")}
          </Badge>
        )}
        {doc.is_verified && (
          <Badge style={{ position: "absolute", top: 8, left: 8 }} size="sm" color="green" variant="light">
            <i className="fa-solid fa-check" style={{ fontSize: 7 }} /> {t("doccard_verified")}
          </Badge>
        )}
        {doc.validity_option === 'PERMANENT' && (
          <Badge style={{ position: "absolute", bottom: 8, left: 8 }} size="sm" color="blue" variant="light">
            <i className="fa-solid fa-infinity" style={{ fontSize: 7 }} /> {t("doccard_permanent")}
          </Badge>
        )}
        {isExpired && (
          <Badge style={{ position: "absolute", bottom: 8, right: 8 }} size="sm" color="orange" variant="light">
            <i className="fa-solid fa-clock" style={{ fontSize: 7 }} /> {t("doccard_expired")}
          </Badge>
        )}
      </Card.Section>
      <div style={{ padding: 12 }}>
        <Group justify="space-between" align="flex-start" mb="xs">
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text fz={14} fw={700} truncate>{doc.nom_sur_doc || t("doccard_no_name")}</Text>
            <Text size="xs" c="dimmed" truncate>{catLabels[doc.type_doc ?? ""] || doc.type_doc} — N° {doc.numero_doc || "---"}</Text>
          </div>
          <Menu shadow="md" width={160}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gold">
                <i className="fa-solid fa-ellipsis-vertical" />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<i className="fa-solid fa-eye" style={{ fontSize: 10 }} />} onClick={() => onView(doc)}>
                {t("doccard_view")}
              </Menu.Item>
              <Menu.Item leftSection={<i className="fa-solid fa-pen" style={{ fontSize: 10 }} />} onClick={() => onEdit(doc)}>
                {t("doccard_edit")}
              </Menu.Item>
              <Menu.Item leftSection={<i className="fa-solid fa-share-nodes" style={{ fontSize: 10 }} />} onClick={() => onShare(doc)}>
                {t("doccard_share")}
              </Menu.Item>
              {!doc.is_lost && (
                <Menu.Item leftSection={<i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 10 }} />} color="red" onClick={() => onReportLost(doc)}>
                  {t("doccard_report_lost")}
                </Menu.Item>
              )}
              <Menu.Item leftSection={<i className="fa-solid fa-trash" style={{ fontSize: 10 }} />} onClick={() => onDelete(doc)}>
                {t("doccard_delete")}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
        <Group justify="space-between" pt="sm" style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
          <Text size="xs" c="dimmed">
            <i className="fa-regular fa-calendar" style={{ marginRight: 4 }} />
            {new Date(doc.created_at).toLocaleDateString("fr-FR")}
          </Text>
          {!doc.is_lost && (
            <Text size="xs" fw={700} c="red" style={{ cursor: "pointer" }} onClick={() => onReportLost(doc)}>
              <i className="fa-solid fa-flag" style={{ marginRight: 2 }} /> {t("doccard_lost_question")}
            </Text>
          )}
        </Group>
      </div>
    </Card>
  );
}
