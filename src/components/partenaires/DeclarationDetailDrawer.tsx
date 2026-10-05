import { Button, Drawer, Popconfirm, Tag, Typography } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { partenairePalette } from "../../theme/partenaires";
import type { PartenaireDeclaration } from "../../services/partenairesService";

const STATUS_LABEL_KEYS: Record<string, { labelKey: string; color: string }> = {
  AVAILABLE: { labelKey: "partenaire_dashboard_status_available", color: "blue" },
  MATCHED: { labelKey: "partenaire_dashboard_status_matched", color: "gold" },
  RETURNED: { labelKey: "partenaire_dashboard_status_returned", color: "green" },
};

export default function DeclarationDetailDrawer({
  declaration,
  open,
  onClose,
  onDelete,
  deleting,
}: {
  declaration: PartenaireDeclaration | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  deleting?: boolean;
}) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const localeTag = lang === "ar" ? "ar" : lang === "en" ? "en" : "fr-FR";

  const statusTag = (s?: string | null) => {
    const meta = STATUS_LABEL_KEYS[s || ""];
    if (!meta) return <Tag>{s || "—"}</Tag>;
    return <Tag color={meta.color}>{t(meta.labelKey)}</Tag>;
  };

  const fmtDate = (v?: string | null) => {
    if (!v) return "—";
    try {
      return new Date(v).toLocaleDateString(localeTag, { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return "—";
    }
  };

  const imgUrl = (src?: string | null) => {
    if (!src) return null;
    if (src.startsWith("http") || src.startsWith("data:")) return src;
    return window.location.origin + "/" + src.replace(/^\//, "");
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={440}
      title={
        <Typography.Text strong style={{ color: partenairePalette.greenDark, fontSize: 16 }}>
          {t("partenaire_detail_title")}
        </Typography.Text>
      }
    >
      {!declaration ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Reference + status */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Typography.Text
              style={{
                background: partenairePalette.primaryLight,
                color: partenairePalette.primaryDark,
                borderRadius: 999,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              {declaration.identifiant_doc_dm || declaration.id.slice(0, 8)}
            </Typography.Text>
            {statusTag(declaration.status)}
          </div>

          {/* Main info */}
          <div>
            <Typography.Title level={4} style={{ margin: 0, color: partenairePalette.textMain }}>
              {t("partenaire_detail_found", {
                type: declaration.doc_type_name || declaration.doc_type || t("partenaire_dashboard_doc_default"),
              })}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12.5 }}>
              {t("partenaire_detail_declared_on", { date: fmtDate(declaration.created_at) })}
            </Typography.Text>
          </div>

          {/* Status card */}
          <div
            style={{
              background: partenairePalette.greenLight,
              border: `1px solid ${partenairePalette.border}`,
              borderRadius: 12,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography.Text strong style={{ fontSize: 13, color: partenairePalette.textMuted }}>
              {t("partenaire_detail_status_label")}
            </Typography.Text>
            {statusTag(declaration.status)}
          </div>

          {/* Photos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <ImageBox src={imgUrl(declaration.photo_recto)} label={t("partenaire_detail_recto")} />
            <ImageBox src={imgUrl(declaration.photo_verso)} label={t("partenaire_detail_verso")} />
          </div>

          {/* Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
            <DetailRow icon="fa-regular fa-user" label={t("partenaire_detail_owner")} value={declaration.owner_name || t("partenaire_detail_owner_unknown")} />
            <DetailRow
              icon="fa-solid fa-hashtag"
              label={t("partenaire_detail_doc_number")}
              value={declaration.document_number || t("partenaire_detail_owner_unknown")}
            />
            <DetailRow
              icon="fa-solid fa-location-dot"
              label={t("partenaire_detail_location")}
              value={[declaration.ville, declaration.quartier].filter(Boolean).join(", ") || t("partenaire_detail_owner_unknown")}
            />
          </div>

          {/* Description */}
          <div style={{ borderTop: `1px solid ${partenairePalette.border}`, paddingTop: 16 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: partenairePalette.textMuted,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              {t("partenaire_detail_description")}
            </p>
            <div
              style={{
                background: partenairePalette.bgMain,
                borderRadius: 12,
                padding: 14,
                fontSize: 13.5,
                lineHeight: 1.6,
                fontStyle: "italic",
                whiteSpace: "pre-wrap",
                color: partenairePalette.textMain,
              }}
            >
              "{declaration.description || t("partenaire_detail_no_description")}"
            </div>
          </div>

          {/* Actions */}
          {declaration.status === "MATCHED" && (
            <Button
              type="primary"
              block
              size="large"
              icon={<i className="fa-solid fa-hand-holding-dollar" />}
              onClick={() => {
                onClose();
                navigate(`/partenaire/rendre?id=${declaration.id}`);
              }}
              style={{ borderRadius: 10, fontWeight: 700, height: 46 }}
            >
              {t("partenaire_rendre_btn")}
            </Button>
          )}

          {onDelete && (
            <div style={{ borderTop: `1px solid ${partenairePalette.border}`, paddingTop: 16 }}>
              <Popconfirm
                title={t("partenaire_detail_delete_title")}
                description={t("partenaire_detail_delete_desc")}
                okText={t("partenaire_detail_delete_ok")}
                okButtonProps={{ danger: true }}
                cancelText={t("partenaire_detail_cancel")}
                onConfirm={() => onDelete(declaration.id)}
              >
                <button
                  disabled={deleting}
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    border: `1px solid ${partenairePalette.danger}55`,
                    background: "transparent",
                    color: partenairePalette.danger,
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <DeleteOutlined /> {t("partenaire_detail_delete_btn")}
                </button>
              </Popconfirm>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

function ImageBox({ src, label }: { src: string | null; label: string }) {
  const { t } = useI18n();
  return (
    <div
      style={{
        aspectRatio: "4/3",
        background: partenairePalette.bgMain,
        border: `1px solid ${partenairePalette.border}`,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {src ? (
        <img
          src={src}
          alt={label}
          style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
          onClick={() => window.open(src)}
        />
      ) : (
        <div style={{ textAlign: "center", color: partenairePalette.textMuted, opacity: 0.5 }}>
          <i className="fa-solid fa-image" style={{ fontSize: 22, display: "block", marginBottom: 6 }} />
          <span style={{ fontSize: 10 }}>{t("partenaire_detail_no_photo")}</span>
        </div>
      )}
      <span
        style={{
          position: "absolute",
          bottom: 6,
          left: 6,
          padding: "2px 8px",
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          fontSize: 9,
          fontWeight: 700,
          borderRadius: 6,
          textTransform: "uppercase",
          pointerEvents: "none",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: partenairePalette.bgMain,
          border: `1px solid ${partenairePalette.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: partenairePalette.textMuted,
          flexShrink: 0,
        }}
      >
        <i className={icon} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: partenairePalette.textMuted, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>
          {label}
        </p>
        <p style={{ fontSize: 14, fontWeight: 700, color: partenairePalette.textMain, margin: 0, wordBreak: "break-word" }}>
          {value}
        </p>
      </div>
    </div>
  );
}
