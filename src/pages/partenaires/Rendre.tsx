import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Progress,
  Row,
  Space,
  Spin,
  Steps,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  KeyOutlined,
  LoadingOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { documentTypesService } from "../../services/declarationsService";
import { partenairesService } from "../../services/partenairesService";
import { useI18n } from "../../context/I18nContext";
import { partenairePalette } from "../../theme/partenaires";
import { computeDeclarationReward } from "../../utils/partnerPotentialEarnings";
import { useTimingConfig } from "../../hooks/useTimingConfig";
import type { DocTypeCatalog } from "../../types/api";

function isOwnerPaid(doc: Record<string, any> | null) {
  if (!doc) return false;
  const ps = (doc.payment_status || "").toUpperCase();
  const ds = (doc.status || "").toUpperCase();
  return (
    ps === "PAID" ||
    ds === "PAID" ||
    ds === "RETURNED" ||
    doc.claim?.status === "PAID" ||
    doc.claim?.status === "VALIDATED"
  );
}

function isReturned(doc: Record<string, any> | null, validated: boolean) {
  if (validated) return true;
  return (doc?.status || "").toUpperCase() === "RETURNED";
}

export default function PartenaireRendre() {
  const timing = useTimingConfig();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("id");
  const localeTag = lang === "ar" ? "ar" : lang === "en" ? "en" : "fr-FR";

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<Record<string, any> | null>(null);
  const [docTypes, setDocTypes] = useState<DocTypeCatalog[]>([]);
  const [error, setError] = useState("");
  const [ownerPaid, setOwnerPaid] = useState(false);
  const [claimReady, setClaimReady] = useState(false);
  const [codeValues, setCodeValues] = useState(["", "", "", "", "", ""]);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [codeError, setCodeError] = useState("");

  const loadContext = useCallback(async () => {
    if (!docId) {
      setLoading(false);
      setError(t("partenaire_rendre_missing_id"));
      return;
    }
    try {
      const [ctxRes, typesRes] = await Promise.all([
        partenairesService.getRenderContext(docId),
        documentTypesService.getActive(),
      ]);
      if (ctxRes.success && ctxRes.data) {
        const d = ctxRes.data;
        setDoc(d);
        setOwnerPaid(isOwnerPaid(d));
        setClaimReady(Boolean(d.claim || (d.matches?.length ?? 0) > 0));
        if (isReturned(d, false)) setValidated(true);
      } else {
        setError(t("partenaire_rendre_not_found"));
      }
      if (typesRes.success && Array.isArray(typesRes.data)) {
        setDocTypes(typesRes.data as DocTypeCatalog[]);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || t("partenaire_rendre_load_error"));
    } finally {
      setLoading(false);
    }
  }, [docId, t]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (ownerPaid || validated || !docId) return;
    const interval = setInterval(async () => {
      try {
        const res = await partenairesService.getRenderContext(docId);
        if (res.success && res.data) {
          const d = res.data;
          setDoc(d);
          if (isOwnerPaid(d)) {
            setOwnerPaid(true);
            clearInterval(interval);
          }
          if (d.claim || (d.matches?.length ?? 0) > 0) setClaimReady(true);
        }
      } catch {
        /* silent poll */
      }
    }, timing.paymentPollIntervalMs);
    return () => clearInterval(interval);
  }, [ownerPaid, validated, docId, timing.paymentPollIntervalMs]);

  const docTypeLabel =
    doc?.docTypeInfo?.nom || doc?.doc_type_name || doc?.doc_type || t("partenaire_dashboard_doc_default");
  const reference = doc?.identifiant_doc_dm || doc?.reference || docId?.slice(0, 8) || "—";
  const ownerName = useMemo(() => {
    const cp = doc?.counterPart;
    if (cp?.prenom || cp?.nom) return `${cp.prenom || ""} ${cp.nom || ""}`.trim();
    if (doc?.counterPartDeclaration?.owner_name) return doc.counterPartDeclaration.owner_name;
    return doc?.owner_name || t("partenaire_detail_owner_unknown");
  }, [doc, t]);

  const rewardAmount = computeDeclarationReward(
    doc
      ? {
          id: doc.id,
          doc_type: doc.doc_type,
          owner_name: doc.owner_name || "",
          created_at: doc.created_at,
        }
      : null,
    docTypes,
    doc
  );

  const currentStep = validated || isReturned(doc, validated)
    ? 3
    : ownerPaid
    ? 2
    : claimReady || doc?.status === "MATCHED"
    ? 1
    : 0;

  const progressPct = validated || isReturned(doc, validated) ? 100 : ownerPaid ? 75 : claimReady ? 50 : 25;

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...codeValues];
    next[index] = digit;
    setCodeValues(next);
    setCodeError("");
  };

  const handleValidate = async () => {
    const fullCode = codeValues.join("");
    if (fullCode.length < 6) {
      setCodeError(t("partenaire_rendre_code_incomplete"));
      return;
    }
    if (!docId) return;
    setValidating(true);
    setCodeError("");
    try {
      const result = await partenairesService.validateRecovery(docId, fullCode);
      if (result.success) {
        setValidated(true);
        message.success(result.message || t("partenaire_rendre_success"));
      } else {
        setCodeError(result.message || t("partenaire_rendre_invalid_code"));
        setCodeValues(["", "", "", "", "", ""]);
      }
    } catch (e: any) {
      setCodeError(e.response?.data?.message || t("partenaire_rendre_validation_error"));
      setCodeValues(["", "", "", "", "", ""]);
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin indicator={<LoadingOutlined spin />} size="large" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <Card style={{ borderRadius: 12, border: `1px solid ${partenairePalette.border}`, textAlign: "center", padding: 24 }}>
        <Typography.Title level={4}>{t("partenaire_rendre_not_found")}</Typography.Title>
        <Typography.Paragraph type="secondary">{error || t("partenaire_rendre_load_error")}</Typography.Paragraph>
        <Button type="primary" icon={<ArrowLeftOutlined />} onClick={() => navigate("/partenaire/declarations")}>
          {t("partenaire_rendre_back_declarations")}
        </Button>
      </Card>
    );
  }

  const done = validated || isReturned(doc, validated);

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/partenaire/declarations")}
        style={{ marginBottom: 12, color: partenairePalette.textMuted }}
      >
        {t("partenaire_rendre_back_declarations")}
      </Button>

      {/* Banner statut */}
      <Card
        style={{
          marginBottom: 20,
          borderRadius: 14,
          border: "none",
          background: `linear-gradient(135deg, ${partenairePalette.greenDark} 0%, ${partenairePalette.greenMid} 100%)`,
        }}
        styles={{ body: { padding: "22px 26px" } }}
      >
        <Row align="middle" gutter={[16, 16]}>
          <Col flex="none">
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {done ? (
                <CheckCircleOutlined style={{ fontSize: 28, color: "#fff" }} />
              ) : (
                <ClockCircleOutlined style={{ fontSize: 28, color: "#fff" }} />
              )}
            </div>
          </Col>
          <Col flex="auto">
            <Typography.Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
              {t("partenaire_rendre_ref_label")} #{reference}
            </Typography.Text>
            <Typography.Title level={4} style={{ margin: "4px 0 10px", color: "#fff", fontWeight: 700 }}>
              {done
                ? t("partenaire_rendre_banner_done")
                : ownerPaid
                ? t("partenaire_rendre_banner_ready")
                : claimReady
                ? t("partenaire_rendre_banner_matched")
                : t("partenaire_rendre_banner_waiting")}
            </Typography.Title>
            <Progress percent={progressPct} showInfo={false} strokeColor="#fff" trailColor="rgba(255,255,255,0.2)" />
          </Col>
          <Col flex="none">
            <Typography.Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 28, fontWeight: 800 }}>
              {progressPct}%
            </Typography.Text>
          </Col>
        </Row>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <Typography.Text strong style={{ color: partenairePalette.greenDark }}>
                {t("partenaire_rendre_timeline_title")}
              </Typography.Text>
            }
            style={{ borderRadius: 12, border: `1px solid ${partenairePalette.border}`, marginBottom: 20 }}
          >
            <Steps
              direction="vertical"
              current={currentStep}
              items={[
                {
                  title: t("partenaire_rendre_step_found"),
                  description: (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {docTypeLabel} — {reference}
                    </Typography.Text>
                  ),
                },
                {
                  title: t("partenaire_rendre_step_match"),
                  description: claimReady ? (
                    <Tag color="green">{ownerName}</Tag>
                  ) : (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t("partenaire_rendre_step_match_wait")}
                    </Typography.Text>
                  ),
                },
                {
                  title: t("partenaire_rendre_step_payment"),
                  description: (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {ownerPaid ? t("partenaire_rendre_step_payment_done") : t("partenaire_rendre_step_payment_wait")}
                    </Typography.Text>
                  ),
                },
                {
                  title: t("partenaire_rendre_step_validate"),
                  description: (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {done ? t("partenaire_rendre_step_validate_done") : t("partenaire_rendre_step_validate_wait")}
                    </Typography.Text>
                  ),
                },
              ]}
            />
          </Card>

          {/* Gains potentiels / récompense */}
          <Card style={{ borderRadius: 12, border: `1px solid ${partenairePalette.border}` }}>
            <Row align="middle" gutter={16}>
              <Col flex="none">
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "#FFFBEB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <DollarOutlined style={{ fontSize: 22, color: "#D97706" }} />
                </div>
              </Col>
              <Col flex="auto">
                <Typography.Text strong style={{ color: partenairePalette.greenDark, display: "block" }}>
                  {done ? t("partenaire_rendre_reward_credited") : t("mesgains_potential_title")}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {done ? t("partenaire_rendre_success_desc") : t("mesgains_potential_note")}
                </Typography.Text>
              </Col>
              <Col flex="none">
                <Typography.Title level={3} style={{ margin: 0, color: "#D97706" }}>
                  {rewardAmount.toLocaleString(localeTag)} FCFA
                </Typography.Title>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            style={{
              borderRadius: 14,
              border: `1px solid ${partenairePalette.border}`,
              textAlign: "center",
            }}
            styles={{ body: { padding: "28px 24px" } }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: partenairePalette.greenLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              {done ? (
                <CheckCircleOutlined style={{ fontSize: 34, color: partenairePalette.success }} />
              ) : (
                <KeyOutlined style={{ fontSize: 34, color: partenairePalette.primary }} />
              )}
            </div>

            <Typography.Title level={4} style={{ marginBottom: 8 }}>
              {done ? t("partenaire_rendre_success") : t("partenaire_rendre_code_title")}
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 24 }}>
              {done
                ? t("partenaire_rendre_success_desc")
                : ownerPaid
                ? t("partenaire_rendre_code_hint")
                : t("partenaire_rendre_waiting_payment")}
            </Typography.Paragraph>

            {done ? (
              <Space direction="vertical" style={{ width: "100%" }}>
                <Button type="primary" block size="large" onClick={() => navigate("/partenaire/portefeuille")}>
                  {t("partenaire_dashboard_view_history")}
                </Button>
                <Button block onClick={() => navigate("/partenaire/declarations")}>
                  {t("partenaire_rendre_back_declarations")}
                </Button>
              </Space>
            ) : (
              <>
                {codeError && (
                  <Alert type="error" message={codeError} showIcon style={{ marginBottom: 16, textAlign: "left" }} />
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 8,
                    marginBottom: 20,
                    opacity: ownerPaid ? 1 : 0.45,
                    pointerEvents: ownerPaid ? "auto" : "none",
                  }}
                >
                  {codeValues.map((val, idx) => (
                    <Input
                      key={idx}
                      value={val}
                      maxLength={1}
                      inputMode="numeric"
                      disabled={validating || !ownerPaid}
                      onChange={(e) => handleCodeChange(idx, e.target.value)}
                      style={{
                        width: 44,
                        height: 52,
                        textAlign: "center",
                        fontSize: 20,
                        fontWeight: 700,
                        borderRadius: 10,
                      }}
                    />
                  ))}
                </div>
                <Button
                  type="primary"
                  block
                  size="large"
                  loading={validating}
                  disabled={!ownerPaid || codeValues.some((v) => !v)}
                  onClick={handleValidate}
                  style={{ height: 48, borderRadius: 12, fontWeight: 700 }}
                >
                  {ownerPaid ? t("partenaire_rendre_validate_btn") : t("partenaire_rendre_waiting_payment")}
                </Button>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
