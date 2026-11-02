import { useEffect, useState } from "react";
import { Button, Card, Col, Empty, Progress, Row, Space, Spin, Tag, Typography } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  FileProtectOutlined,
  PlusCircleOutlined,
  RiseOutlined,
  ShopOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { partenairesService, type PartenaireStats, type PartenaireDeclaration } from "../../services/partenairesService";
import { documentTypesService } from "../../services/declarationsService";
import { statsService } from "../../services/statsService";
import { computePartnerPotentialEarnings } from "../../utils/partnerPotentialEarnings";
import type { DocTypeCatalog } from "../../types/api";
import { useStatsByType } from "../../hooks/useStats";
import { usePartenaire } from "../../context/PartenaireContext";
import { useI18n } from "../../context/I18nContext";
import { partenairePalette } from "../../theme/partenaires";
import DeclarationDetailDrawer from "../../components/partenaires/DeclarationDetailDrawer";

const STATUS_LABEL_KEYS: Record<string, { labelKey: string; color: string }> = {
  AVAILABLE: { labelKey: "partenaire_dashboard_status_available", color: "blue" },
  MATCHED: { labelKey: "partenaire_dashboard_status_matched", color: "gold" },
  RETURNED: { labelKey: "partenaire_dashboard_status_returned", color: "green" },
};

function getIconForType(type?: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("cni")) return "ph ph-identification-card";
  if (t.includes("pass")) return "ph ph-book-open";
  if (t.includes("permis")) return "ph ph-car";
  if (t.includes("diplome")) return "ph ph-graduation-cap";
  if (t.includes("acte")) return "ph ph-invoice";
  if (t.includes("carte")) return "ph ph-credit-card";
  return "ph ph-file-text";
}

export default function Dashboard() {
  const { partenaire } = usePartenaire();
  const { t, lang } = useI18n();
  const localeTag = lang === "ar" ? "ar" : lang === "en" ? "en" : "fr-FR";
  const navigate = useNavigate();
  const [stats, setStats] = useState<PartenaireStats | null>(null);
  const [recent, setRecent] = useState<PartenaireDeclaration[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [globalStats, setGlobalStats] = useState<{ total_lost: number; total_recovered: number } | null>(null);
  const [perfPeriod, setPerfPeriod] = useState("month");
  const [detail, setDetail] = useState<PartenaireDeclaration | null>(null);
  const [potential, setPotential] = useState(0);
  const [potentialPts, setPotentialPts] = useState(0);
  const [potentialCount, setPotentialCount] = useState(0);
  const { stats: perfStats, loading: perfLoading } = useStatsByType(perfPeriod);

  const today = new Intl.DateTimeFormat(localeTag, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  function greeting() {
    const h = new Date().getHours();
    if (h >= 18 || h < 5) return t("partenaire_dashboard_greeting_evening");
    return t("partenaire_dashboard_greeting_morning");
  }

  const formatDate = (v?: string | null) => {
    if (!v) return "—";
    try {
      return new Date(v).toLocaleDateString(localeTag, { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return v;
    }
  };

  const statusTag = (s?: string | null) => {
    const meta = STATUS_LABEL_KEYS[s || ""];
    if (!meta) return <Tag>{s || "—"}</Tag>;
    return <Tag color={meta.color}>{t(meta.labelKey)}</Tag>;
  };

  useEffect(() => {
    let cancelled = false;
    partenairesService
      .getStats()
      .then((res) => {
        if (!cancelled) setStats(res.data.data);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.message || t("partenaire_dashboard_stats_error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    statsService
      .getGlobal()
      .then((res) => {
        if (!cancelled) setGlobalStats(res.data || null);
      })
      .catch(() => {
        if (!cancelled) setGlobalStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    setRecentLoading(true);
    Promise.all([
      partenairesService.getDeclarations({ limit: 6 }),
      partenairesService.getDeclarations({ limit: 200 }),
      documentTypesService.getActive(),
    ])
      .then(([recentRes, allRes, typesRes]) => {
        if (cancelled) return;
        setRecent(recentRes.data.rows);
        const declarations = allRes.data.rows ?? [];
        const docTypes =
          typesRes.success && Array.isArray(typesRes.data) ? (typesRes.data as DocTypeCatalog[]) : [];
        const potentialData = computePartnerPotentialEarnings(declarations, docTypes);
        setPotential(potentialData.total);
        setPotentialPts(potentialData.totalPts);
        setPotentialCount(potentialData.count);
      })
      .catch(() => {
        if (!cancelled) {
          setRecent([]);
          setPotential(0);
          setPotentialPts(0);
          setPotentialCount(0);
        }
      })
      .finally(() => {
        if (!cancelled) setRecentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <Typography.Text style={{ color: partenairePalette.textMuted }}>{error}</Typography.Text>
        </div>
      </Card>
    );
  }

  const cards = [
    {
      title: t("partenaire_dashboard_card_findings"),
      value: stats?.total_declarations ?? 0,
      icon: <FileProtectOutlined style={{ color: "#f59e0b" }} />,
      iconBg: "rgba(245,158,11,0.12)",
      hint: t("partenaire_dashboard_hint_findings"),
    },
    {
      title: t("partenaire_dashboard_card_available"),
      value: stats?.available ?? 0,
      icon: <ClockCircleOutlined style={{ color: "#3b82f6" }} />,
      iconBg: "rgba(59,130,246,0.12)",
      hint: t("partenaire_dashboard_hint_available"),
    },
    {
      title: t("partenaire_dashboard_card_matched"),
      value: stats?.matched ?? 0,
      icon: <RiseOutlined style={{ color: "#8b5cf6" }} />,
      iconBg: "rgba(139,92,246,0.12)",
      hint: t("partenaire_dashboard_hint_matched"),
    },
    {
      title: t("partenaire_dashboard_card_returned"),
      value: stats?.returned ?? 0,
      icon: <CheckCircleOutlined style={{ color: "#10b981" }} />,
      iconBg: "rgba(16,185,129,0.12)",
      hint: t("partenaire_dashboard_hint_returned"),
    },
  ];

  const donutTotal = (stats?.total_declarations ?? 0) || 1;

  const perfData = Array.isArray(perfStats) ? perfStats : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Greeting */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0, color: partenairePalette.greenDark, fontSize: 22 }}>
            {greeting()}, <span>{partenaire?.nom_organisation || t("partenaire_dashboard_org_default")}</span>
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontStyle: "italic", fontSize: 13 }}>
            {t("partenaire_dashboard_subtitle")}
          </Typography.Text>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: partenairePalette.surface,
            border: `1px solid ${partenairePalette.border}`,
            borderRadius: 10,
            padding: "8px 12px",
            whiteSpace: "nowrap",
          }}
        >
          <i className="ph ph-calendar" style={{ color: partenairePalette.primary, fontSize: 14 }} />
          <Typography.Text type="secondary" style={{ fontSize: 13, textTransform: "capitalize" }}>
            {today}
          </Typography.Text>
        </div>
      </div>

      {/* Stat cards */}
      <Row gutter={[16, 16]}>
        {cards.map((c) => (
          <Col xs={12} md={6} key={c.title}>
            <Card style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}`, height: "100%" }} styles={{ body: { padding: 18 } }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <Typography.Text style={{ fontSize: 11.5, color: partenairePalette.textMuted, fontWeight: 500 }}>
                  {c.title}
                </Typography.Text>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: c.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                >
                  {c.icon}
                </div>
              </div>
              <Typography.Text style={{ fontSize: 26, fontWeight: 800, color: partenairePalette.greenDark, display: "block", lineHeight: 1.2 }}>
                {c.value}
              </Typography.Text>
              <Typography.Text style={{ fontSize: 11, color: partenairePalette.textMuted }}>{c.hint}</Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Statistiques DocMaster (globales) */}
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}`, height: "100%" }} styles={{ body: { padding: 18 } }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <Typography.Text style={{ fontSize: 11.5, color: partenairePalette.textMuted, fontWeight: 500 }}>
                {t("partenaire_dashboard_global_lost_label")}
              </Typography.Text>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: "rgba(239,68,68,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginLeft: 8,
                }}
              >
                <i className="ph ph-warning" style={{ color: "#ef4444", fontSize: 16 }} />
              </div>
            </div>
            <Typography.Text style={{ fontSize: 26, fontWeight: 800, color: partenairePalette.greenDark, display: "block", lineHeight: 1.2 }}>
              {globalStats?.total_lost ?? "—"}
            </Typography.Text>
            <Typography.Text style={{ fontSize: 11, color: partenairePalette.textMuted }}>
              {t("partenaire_dashboard_global_lost_desc")}
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}`, height: "100%" }} styles={{ body: { padding: 18 } }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <Typography.Text style={{ fontSize: 11.5, color: partenairePalette.textMuted, fontWeight: 500 }}>
                {t("partenaire_dashboard_global_found_label")}
              </Typography.Text>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: "rgba(139,92,246,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginLeft: 8,
                }}
              >
                <i className="ph ph-hand-heart" style={{ color: "#8b5cf6", fontSize: 16 }} />
              </div>
            </div>
            <Typography.Text style={{ fontSize: 26, fontWeight: 800, color: partenairePalette.greenDark, display: "block", lineHeight: 1.2 }}>
              {globalStats?.total_recovered ?? "—"}
            </Typography.Text>
            <Typography.Text style={{ fontSize: 11, color: partenairePalette.textMuted }}>
              {t("partenaire_dashboard_global_found_desc")}
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      {/* Activities + CTA */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* Quick actions / empty state */}
          {recent.length === 0 && !recentLoading ? (
            <Card
              style={{
                borderRadius: 10,
                border: `1px dashed ${partenairePalette.border}`,
                textAlign: "center",
                background: partenairePalette.surface,
              }}
              styles={{ body: { padding: 36 } }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: partenairePalette.greenLight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                }}
              >
                <i className="ph ph-folder-open" style={{ color: partenairePalette.textMuted, fontSize: 24 }} />
              </div>
              <Typography.Title level={4} style={{ marginBottom: 4, color: partenairePalette.greenDark }}>
                {t("partenaire_dashboard_empty_title")}
              </Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 18 }}>
                {t("partenaire_dashboard_empty_desc")}
              </Typography.Text>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<PlusCircleOutlined />}
                  onClick={() => navigate("/partenaire/declarer")}
                  style={{ height: 38 }}
                >
                  {t("partenaire_dashboard_declare")}
                </Button>
                <Button icon={<FileProtectOutlined />} onClick={() => navigate("/partenaire/declarations")} style={{ height: 38 }}>
                  {t("partenaire_dashboard_view_declarations")}
                </Button>
              </Space>
            </Card>
          ) : (
            <Card
              style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}
              title={
                <Space size={8}>
                  <i className="ph ph-clock-counter-clockwise" style={{ color: partenairePalette.primary, fontSize: 14 }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: partenairePalette.greenDark }}>
                    {t("partenaire_dashboard_recent_activity")}
                  </span>
                </Space>
              }
              extra={
                <Typography.Text
                  style={{ fontSize: 12, fontWeight: 600, color: partenairePalette.primaryDark, cursor: "pointer" }}
                  onClick={() => navigate("/partenaire/declarations")}
                >
                  {t("partenaire_dashboard_view_all")} <i className="ph ph-arrow-right" style={{ fontSize: 9 }} />
                </Typography.Text>
              }
              styles={{ body: { padding: 0 } }}
            >
              {recentLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                  <Spin />
                </div>
              ) : recent.length === 0 ? (
                <Empty description={t("partenaire_dashboard_no_activity")} style={{ padding: 24 }} />
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 16,
                    padding: 16,
                  }}
                >
                  {recent.slice(0, 6).map((decl) => (
                    <FoundCard
                      key={decl.id}
                      decl={decl}
                      onOpen={() => setDetail(decl)}
                      onRendre={(id) => navigate(`/partenaire/rendre?id=${id}`)}
                    />
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* CTA rapide */}
          <Card style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }} styles={{ body: { padding: 20 } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 11,
                  background: partenairePalette.greenLight,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ShopOutlined style={{ fontSize: 20, color: partenairePalette.greenDark }} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <Typography.Text strong style={{ display: "block", color: partenairePalette.greenDark }}>
                  {partenaire?.nom_organisation}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  <Tag color="cyan" style={{ marginRight: 6 }}>
                    {t("partenaire_dashboard_partner")}
                  </Tag>
                  <EnvironmentOutlined style={{ marginRight: 4, fontSize: 11 }} />
                  {partenaire?.ville || "—"}
                  {partenaire?.region ? `, ${partenaire.region}` : ""}
                </Typography.Text>
              </div>
              <Button type="primary" icon={<PlusCircleOutlined />} onClick={() => navigate("/partenaire/declarer")}>
                {t("partenaire_dashboard_declare")}
              </Button>
            </div>
          </Card>
        </div>

      {/* Portefeuille + Donut sur la même ligne */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}`, height: "100%" }} styles={{ body: { padding: 20 } }}>
            <Space size={8} style={{ marginBottom: 14 }}>
              <i className="ph ph-wallet" style={{ color: partenairePalette.primary, fontSize: 14 }} />
              <Typography.Text strong style={{ color: partenairePalette.greenDark, fontSize: 15 }}>
                {t("partenaire_dashboard_portefeuille")}
              </Typography.Text>
            </Space>
            <Typography.Text type="secondary" style={{ fontSize: 11.5, display: "block", marginBottom: 4 }}>
              {t("partenaire_dashboard_balance")}
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0, color: partenairePalette.success, fontWeight: 800 }}>
              {Number(partenaire?.wallet_balance ?? stats?.wallet_balance ?? 0).toLocaleString(localeTag)} FCFA
            </Typography.Title>
            <Typography.Text style={{ display: "block", marginTop: 6, color: "#D97706", fontWeight: 600 }}>
              <i className="ph ph-star" style={{ marginRight: 6, fontSize: 11 }} />
              {Number(stats?.total_points ?? partenaire?.points ?? 0).toLocaleString(localeTag)} pts
            </Typography.Text>
            {potentialCount > 0 && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#FFFBEB",
                  border: `1px solid ${partenairePalette.border}`,
                }}
              >
                <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  {t("mesgains_potential_title")} ({potentialCount})
                </Typography.Text>
                <Typography.Text strong style={{ color: "#D97706", fontSize: 16, display: "block" }}>
                  {potential.toLocaleString(localeTag)} FCFA
                </Typography.Text>
                <Typography.Text style={{ color: partenairePalette.primary, fontSize: 13 }}>
                  +{potentialPts.toLocaleString(localeTag)} pts
                </Typography.Text>
              </div>
            )}
            <Button
              block
              style={{ marginTop: 14, height: 36 }}
              onClick={() => navigate("/partenaire/portefeuille")}
              icon={<i className="ph ph-arrow-right" style={{ fontSize: 11 }} />}
            >
              {t("partenaire_dashboard_view_history")}
            </Button>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}`, height: "100%" }} styles={{ body: { padding: 20 } }}>
            <Space size={8} style={{ marginBottom: 16 }}>
              <i className="ph ph-chart-pie" style={{ color: partenairePalette.primary, fontSize: 14 }} />
              <Typography.Text strong style={{ color: partenairePalette.greenDark, fontSize: 15 }}>
                {t("partenaire_dashboard_findings_split")}
              </Typography.Text>
            </Space>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <Progress
                  type="dashboard"
                  percent={Math.round(((stats?.total_declarations ?? 0) / donutTotal) * 100)}
                  size={120}
                  strokeColor={{ "0%": partenairePalette.primary, "100%": partenairePalette.success }}
                  format={() => (
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: partenairePalette.greenDark, lineHeight: 1 }}>
                        {stats?.total_declarations ?? 0}
                      </div>
                      <div style={{ fontSize: 10, color: partenairePalette.textMuted }}>{t("partenaire_dashboard_findings_count")}</div>
                    </div>
                  )}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 160 }}>
                <DonutRow color="#3b82f6" label={t("partenaire_dashboard_card_available")} value={stats?.available ?? 0} />
                <DonutRow color="#8b5cf6" label={t("partenaire_dashboard_card_matched")} value={stats?.matched ?? 0} />
                <DonutRow color="#10b981" label={t("partenaire_dashboard_status_returned")} value={stats?.returned ?? 0} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Performances DocMaster */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }} styles={{ body: { padding: 20 } }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div>
                <Typography.Text strong style={{ color: partenairePalette.greenDark, fontSize: 15 }}>
                  {t("partenaire_dashboard_perf_title")}
                </Typography.Text>
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 12, fontStyle: "italic" }}>
                  {t("partenaire_dashboard_perf_subtitle")}
                </Typography.Text>
              </div>
              <Space wrap size={4}>
                {PERIODS.map((p) => (
                  <Button
                    key={p.key}
                    size="small"
                    type={perfPeriod === p.key ? "primary" : "default"}
                    onClick={() => setPerfPeriod(p.key)}
                    style={{ fontSize: 12 }}
                  >
                    {t(p.labelKey)}
                  </Button>
                ))}
              </Space>
            </div>
            <Row gutter={[12, 12]}>
              {perfLoading ? (
                <Col span={24} style={{ textAlign: "center", padding: 24 }}>
                  <Spin />
                </Col>
              ) : perfData.length > 0 ? (
                perfData.slice(0, 8).map((doc: any, idx: number) => (
                  <Col xs={12} sm={8} lg={6} key={doc.code || idx}>
                    <PerfCard doc={doc} period={perfPeriod} />
                  </Col>
                ))
              ) : (
                <Col span={24}>
                  <Empty description={t("partenaire_dashboard_perf_empty")} />
                </Col>
              )}
            </Row>
          </Card>
        </Col>
      </Row>

      <DeclarationDetailDrawer
        open={!!detail}
        declaration={detail}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}

const FOUND_STEP_COLORS: Record<string, { bg: string; border: string; text: string; faded: string; line: string; fill: string; headerBg: string; iconBg: string }> = {
  blue: {
    bg: "#3B82F6",
    border: "#3B82F6",
    text: "#2563EB",
    faded: "#93C5FD",
    line: "#BFDBFE",
    fill: "#3B82F6",
    headerBg: "rgba(59,130,246,0.05)",
    iconBg: "rgba(59,130,246,0.1)",
  },
  green: {
    bg: "#22C55E",
    border: "#22C55E",
    text: "#16A34A",
    faded: "#86EFAC",
    line: "#BBF7D0",
    fill: "#22C55E",
    headerBg: "rgba(34,197,94,0.05)",
    iconBg: "rgba(34,197,94,0.1)",
  },
};

function FoundStepIndicator({ steps, current, color }: { steps: string[]; current: number; color: "blue" | "green" }) {
  const c = FOUND_STEP_COLORS[color] || FOUND_STEP_COLORS.blue;
  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0 8px", marginTop: 16 }}>
      <div style={{ position: "absolute", top: 12, left: 40, right: 40, height: 2, backgroundColor: c.line }} />
      <div style={{ position: "absolute", top: 12, left: 40, height: 2, width: `${((current - 1) / (steps.length - 1)) * 100}%`, backgroundColor: c.fill }} />
      {steps.map((step, i) => {
        const done = i < current - 1;
        const active = i === current - 1;
        return (
          <div key={step} style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 52 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                background: done ? c.bg : "white",
                border: done ? "none" : `2px solid ${active ? c.border : c.line}`,
                color: done ? "white" : active ? c.text : c.faded,
              }}
            >
              {done ? <i className="ph ph-check" /> : <i className={`${i === 0 ? "ph ph-magnifying-glass" : i === 1 ? "ph ph-pen-nib" : i === 2 ? "ph ph-user-check" : "ph ph-handshake"}`} />}
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: -0.3, color: done || active ? c.text : c.faded }}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FoundCard({ decl, onOpen, onRendre }: { decl: PartenaireDeclaration; onOpen: () => void; onRendre: (id: string) => void }) {
  const { t } = useI18n();
  const isDone = decl.status === "RETURNED" || decl.status === "MATCHED";
  const c = FOUND_STEP_COLORS[isDone ? "green" : "blue"];

  let step = 1;
  if (decl.status === "AVAILABLE") step = 2;
  if (decl.status === "MATCHED") step = 3;
  if (decl.status === "RETURNED") step = 4;

  const headerLabel = decl.status === "RETURNED"
    ? t("partenaire_dashboard_card_returned_header")
    : decl.status === "MATCHED"
    ? t("partenaire_dashboard_card_matched_header")
    : t("partenaire_dashboard_card_found_header");
  const headerIcon = decl.status === "RETURNED" ? "ph ph-check-circle" : decl.status === "MATCHED" ? "ph ph-handshake" : "ph ph-hand-heart";
  const badgeLabel = decl.status === "RETURNED"
    ? t("partenaire_dashboard_status_returned")
    : decl.status === "MATCHED"
    ? t("partenaire_dashboard_status_to_return")
    : t("partenaire_dashboard_status_reported");
  const badgeColor = isDone ? "green" : "blue";

  return (
    <Card
      style={{
        borderRadius: 14,
        border: `1px solid ${partenairePalette.border}`,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        overflow: "hidden",
        cursor: "pointer",
      }}
      styles={{ body: { padding: 0 } }}
      onClick={onOpen}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 16px",
          background: c.headerBg,
          borderBottom: `1px solid ${c.line}`,
        }}
      >
        <Space size={8}>
          <i className={`${headerIcon}`} style={{ color: c.text }} />
          <Typography.Text strong style={{ color: c.text, fontSize: 13 }}>
            {headerLabel}
          </Typography.Text>
        </Space>
        <Tag color={badgeColor} style={{ margin: 0, fontWeight: 700 }}>
          {badgeLabel}
        </Tag>
      </div>
      <div style={{ padding: "16px 20px" }}>
        <Space size={12} style={{ marginBottom: 4 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: c.iconBg,
              color: c.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i className={`${getIconForType(decl.doc_type)}`} style={{ fontSize: 18 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <Typography.Text strong style={{ fontSize: 13.5, display: "block" }}>
              {decl.doc_type_name || decl.doc_type || t("partenaire_dashboard_doc_default")} — {decl.owner_name || t("partenaire_dashboard_owner_unknown")}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11.5, fontStyle: "italic" }}>
              Réf : {decl.identifiant_doc_dm || decl.id.slice(0, 8)} · {STATUS_LABEL_KEYS[decl.status || ""] ? t(STATUS_LABEL_KEYS[decl.status].labelKey) : decl.status || "—"}
            </Typography.Text>
          </div>
        </Space>
        <FoundStepIndicator
          steps={[
            t("partenaire_dashboard_step_found"),
            t("partenaire_dashboard_step_reported"),
            t("partenaire_dashboard_step_owner"),
            t("partenaire_dashboard_step_returned"),
          ]}
          current={step}
          color={isDone ? "green" : "blue"}
        />
        {decl.status === "MATCHED" && (
          <Button
            type="primary"
            block
            style={{ marginTop: 16, height: 38, borderRadius: 10, fontWeight: 700 }}
            onClick={(e) => {
              e.stopPropagation();
              onRendre(decl.id);
            }}
          >
            {t("partenaire_rendre_btn")}
          </Button>
        )}
        {decl.status !== "MATCHED" && decl.status !== "RETURNED" && (
          <div
            style={{
              marginTop: 16,
              fontSize: 11,
              color: partenairePalette.textMuted,
              fontStyle: "italic",
              textAlign: "center",
              background: "rgba(59,130,246,0.1)",
              borderRadius: 12,
              padding: "8px 12px",
            }}
          >
            <i className="ph ph-clock-counter-clockwise" style={{ color: "#3B82F6", marginRight: 4 }} />
            {t("partenaire_dashboard_waiting")}
          </div>
        )}
      </div>
    </Card>
  );
}

function DonutRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <Space size={8} style={{ fontSize: 13 }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
      <Space size={24} style={{ width: "100%", justifyContent: "space-between" }}>
        <Typography.Text style={{ fontWeight: 500 }}>{label}</Typography.Text>
        <Typography.Text strong>{value}</Typography.Text>
      </Space>
    </Space>
  );
}

const PERIODS = [
  { key: "day", labelKey: "partenaire_dashboard_period_day" },
  { key: "week", labelKey: "partenaire_dashboard_period_week" },
  { key: "month", labelKey: "partenaire_dashboard_period_month" },
  { key: "year", labelKey: "partenaire_dashboard_period_year" },
];

const PERIOD_LABEL_KEYS: Record<string, string> = {
  day: "partenaire_dashboard_period_label_day",
  week: "partenaire_dashboard_period_label_week",
  month: "partenaire_dashboard_period_label_month",
  year: "partenaire_dashboard_period_label_year",
};

function periodLabelKey(p?: string) {
  return PERIOD_LABEL_KEYS[p || "month"] || "partenaire_dashboard_period_label_month";
}

const PERF_TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  CNI: { icon: "ph ph-identification-card", color: "#3b82f6" },
  PASSPORT: { icon: "ph ph-book-open", color: "#8b5cf6" },
  PERMIS: { icon: "ph ph-car", color: "#10b981" },
  DIPLOME: { icon: "ph ph-graduation-cap", color: "#f59e0b" },
  CARTE_BLUE: { icon: "ph ph-credit-card", color: "#6366f1" },
  CARTE_GRISE: { icon: "ph ph-invoice", color: "#ef4444" },
  ACTE_NAISSANCE: { icon: "ph ph-file-plus", color: "#14b8a6" },
  DEFAULT: { icon: "ph ph-file-text", color: "#6b7280" },
};

function timeAgo(dateString?: string) {
  const { t } = useI18n();
  if (!dateString) return "—";
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return t("partenaire_dashboard_just_now");
  if (diff < 3600) return t("partenaire_dashboard_time_min", { count: Math.floor(diff / 60) });
  if (diff < 86400) return t("partenaire_dashboard_time_hour", { count: Math.floor(diff / 3600) });
  if (diff < 604800) return t("partenaire_dashboard_time_day", { count: Math.floor(diff / 86400) });
  return t("partenaire_dashboard_recently");
}

function PerfCard({ doc, period }: { doc: any; period?: string }) {
  const { t, lang } = useI18n();
  const localeTag = lang === "ar" ? "ar" : lang === "en" ? "en" : "fr-FR";
  const code = doc.code || "DEFAULT";
  const cfg = PERF_TYPE_ICONS[code] || PERF_TYPE_ICONS.DEFAULT;
  const trend = parseFloat(doc.trend) || 0;
  const isUp = trend >= 0;
  const total = parseInt(doc.total) || 0;
  const lost = parseInt(doc.lost) || 0;
  const found = parseInt(doc.found) || 0;
  const latest = doc.recent_items?.[0];
  const activityText = latest
    ? `${latest.type === "LOST" ? t("partenaire_dashboard_lost_verb") : t("partenaire_dashboard_found_verb")} ${timeAgo(latest.date)}${latest.ville ? ` à ${latest.ville}` : ""}`
    : t("partenaire_dashboard_no_recent_activity");

  return (
    <Card style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}`, height: "100%" }} styles={{ body: { padding: 14 } }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: `${cfg.color}1A`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <i className={`${cfg.icon}`} style={{ color: cfg.color, fontSize: 12 }} />
        </div>
        <Typography.Text
          strong
          style={{ fontSize: 12.5, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {doc.name || t("partenaire_dashboard_doc_default")}
        </Typography.Text>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: isUp ? "#16a34a" : "#ef4444",
            background: isUp ? "#dcfce7" : "#fee2e2",
            padding: "2px 6px",
            borderRadius: 6,
            whiteSpace: "nowrap",
          }}
        >
          <i className={`${isUp ? "ph ph-arrow-up" : "ph ph-arrow-down"}`} style={{ fontSize: 7, marginRight: 2 }} />{" "}
          {Math.abs(trend)}%
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <Typography.Text style={{ fontSize: 18, fontWeight: 800, color: partenairePalette.primaryDark }}>
          {total.toLocaleString(localeTag)}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 10.5, fontStyle: "italic" }}>
          {t(periodLabelKey(period))}
        </Typography.Text>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <div style={{ fontSize: 9.5, color: "#d97706", background: "#fef3c7", padding: "2px 6px", borderRadius: 6 }}>
          <i className="ph ph-arrow-down" style={{ fontSize: 7, marginRight: 3 }} /> {t("partenaire_dashboard_lost_count", { count: lost })}
        </div>
        <div style={{ fontSize: 9.5, color: "#16a34a", background: "#dcfce7", padding: "2px 6px", borderRadius: 6 }}>
          <i className="ph ph-arrow-up" style={{ fontSize: 7, marginRight: 3 }} /> {t("partenaire_dashboard_found_count", { count: found })}
        </div>
      </div>
      <div
        style={{
          fontSize: 9.5,
          color: partenairePalette.textMuted,
          background: partenairePalette.bgMain,
          padding: "3px 6px",
          borderRadius: 6,
          marginTop: 6,
          width: "fit-content",
          maxWidth: "100%",
        }}
      >
        <i className="ph ph-clock-counter-clockwise" style={{ fontSize: 7, marginRight: 4 }} /> {activityText}
      </div>
    </Card>
  );
}
