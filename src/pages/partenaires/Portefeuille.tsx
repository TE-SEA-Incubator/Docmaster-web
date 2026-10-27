import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  RiseOutlined,
  StarOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  partenairesService,
  type PartenaireEarning,
  type PartenaireEarningsStats,
  type PartenaireWalletTransaction,
} from "../../services/partenairesService";
import { documentTypesService } from "../../services/declarationsService";
import type { DocTypeCatalog } from "../../types/api";
import { useI18n } from "../../context/I18nContext";
import { usePartenaire } from "../../context/PartenaireContext";
import { partenairePalette } from "../../theme/partenaires";
import { computePartnerPotentialEarnings } from "../../utils/partnerPotentialEarnings";

const REASON_LABEL_KEYS: Record<string, string> = {
  ADMIN_ADJUSTMENT: "partenaire_portefeuille_reason_admin",
  DECLARATION_REWARD: "partenaire_portefeuille_reason_reward",
  CLAIM_FEE: "partenaire_portefeuille_reason_claim",
  OTHER: "partenaire_portefeuille_reason_other",
};

const EARNING_TYPE_KEYS: Record<string, string> = {
  DECLARATION: "mesgains_declaration_points",
  RETURN: "mesgains_return_points",
  REFERRAL: "mesgains_referral_points",
  CONVERSION: "partenaire_portefeuille_earning_conversion",
  ADMIN: "partenaire_portefeuille_reason_admin",
};

function fmtAmount(n: number, localeTag: string) {
  return n.toLocaleString(localeTag);
}

export default function Portefeuille() {
  const { t, lang } = useI18n();
  const { partenaire, refresh } = usePartenaire();
  const localeTag = lang === "ar" ? "ar" : lang === "en" ? "en" : "fr-FR";

  const [balance, setBalance] = useState(0);
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<PartenaireWalletTransaction[]>([]);
  const [earningsStats, setEarningsStats] = useState<PartenaireEarningsStats | null>(null);
  const [earningsHistory, setEarningsHistory] = useState<PartenaireEarning[]>([]);
  const [pointsHistory, setPointsHistory] = useState<PartenaireEarning[]>([]);
  const [pointsHistoryTotal, setPointsHistoryTotal] = useState(0);
  const [pointsHistoryFilter, setPointsHistoryFilter] = useState<string | null>(null);
  const [pointsHistoryLoading, setPointsHistoryLoading] = useState(false);
  const [potential, setPotential] = useState(0);
  const [potentialPts, setPotentialPts] = useState(0);
  const [potentialCount, setPotentialCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertAmount, setConvertAmount] = useState<number | null>(null);
  const [convertRate, setConvertRate] = useState(10);
  const [converting, setConverting] = useState(false);

  const formatDate = (v?: string | null) => {
    if (!v) return "—";
    try {
      return new Date(v).toLocaleDateString(localeTag, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return v;
    }
  };

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const [walletRes, statsRes, earningsRes, declRes, typesRes, rateRes] = await Promise.all([
        partenairesService.getWallet({ limit: 100 }),
        partenairesService.getEarningsStats(),
        partenairesService.getEarnings({ limit: 50 }),
        partenairesService.getDeclarations({ limit: 200 }),
        documentTypesService.getActive(),
        partenairesService.getPointsRate().catch(() => null),
      ]);

      setBalance(walletRes.data.data.balance);
      setHistory(walletRes.data.data.history);

      const stats = statsRes.data.data;
      setEarningsStats(stats);
      setPoints(stats.total_points ?? partenaire?.points ?? 0);

      const earningsPayload = earningsRes.data.data;
      setEarningsHistory(Array.isArray(earningsPayload) ? earningsPayload : earningsPayload.data ?? []);

      const declarations = declRes.data.rows ?? [];
      const docTypes =
        typesRes.success && Array.isArray(typesRes.data) ? (typesRes.data as DocTypeCatalog[]) : [];
      const potentialData = computePartnerPotentialEarnings(declarations, docTypes);
      setPotential(potentialData.total);
      setPotentialPts(potentialData.totalPts);
      setPotentialCount(potentialData.count);

      if (rateRes?.data?.rate) setConvertRate(rateRes.data.rate);
    } catch {
      setBalance(0);
      setHistory([]);
      setEarningsStats(null);
      setEarningsHistory([]);
      setPotential(0);
      setPotentialPts(0);
      setPotentialCount(0);
    } finally {
      setLoading(false);
    }
  }, [partenaire?.points]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const fetchPointsHistory = useCallback(async (type?: string | null) => {
    setPointsHistoryLoading(true);
    try {
      const res = await partenairesService.getPointsHistory({
        limit: 50,
        type: type || undefined,
      });
      if (res.data.success && res.data.data) {
        setPointsHistory(res.data.data.history || []);
        setPointsHistoryTotal(res.data.data.total || 0);
      }
    } catch (err) {
      console.error("Erreur chargement historique:", err);
      setPointsHistory([]);
      setPointsHistoryTotal(0);
    } finally {
      setPointsHistoryLoading(false);
    }
  }, []);

  const pointsBreakdown = earningsStats?.points_breakdown ?? {
    declarations: { points: 0, count: 0, pts_per_unit: 5 },
    returns: { points: 0, count: 0 },
    referrals: { points: 0, count: 0 },
  };

  const totalPoints = earningsStats?.total_points ?? points;
  const xafFromConvert = Math.round((convertAmount ?? 0) / convertRate);

  const handleConvert = async () => {
    if (!convertAmount || convertAmount <= 0) return;
    if (convertAmount > totalPoints) {
      message.error(t("partenaire_portefeuille_convert_insufficient"));
      return;
    }
    setConverting(true);
    try {
      await partenairesService.convertPoints(convertAmount);
      message.success(t("partenaire_portefeuille_convert_success"));
      setConvertOpen(false);
      setConvertAmount(null);
      await Promise.all([fetchWallet(), refresh()]);
    } catch (err: any) {
      message.error(err?.response?.data?.message || t("mesgains_convert_error"));
    } finally {
      setConverting(false);
    }
  };

  const walletColumns = useMemo(
    () => [
      {
        title: t("partenaire_portefeuille_col_date"),
        dataIndex: "created_at",
        key: "created_at",
        width: 160,
        render: formatDate,
      },
      {
        title: t("partenaire_portefeuille_col_type"),
        dataIndex: "type",
        key: "type",
        width: 110,
        render: (typeVal: string) =>
          typeVal === "CREDIT" ? (
            <Tag icon={<ArrowUpOutlined />} color="green">
              {t("partenaire_portefeuille_credit")}
            </Tag>
          ) : (
            <Tag icon={<ArrowDownOutlined />} color="red">
              {t("partenaire_portefeuille_debit")}
            </Tag>
          ),
      },
      {
        title: t("partenaire_portefeuille_col_amount"),
        dataIndex: "amount",
        key: "amount",
        width: 140,
        render: (v: string, row: PartenaireWalletTransaction) => (
          <Typography.Text
            strong
            style={{ color: row.type === "CREDIT" ? partenairePalette.success : partenairePalette.danger }}
          >
            {row.type === "CREDIT" ? "+" : "−"} {Number(v).toLocaleString(localeTag)} FCFA
          </Typography.Text>
        ),
      },
      {
        title: t("partenaire_portefeuille_col_reason"),
        key: "reason",
        render: (_: unknown, row: PartenaireWalletTransaction) => {
          const motif = (row.metadata as Record<string, unknown>)?.motif;
          const reasonKey = REASON_LABEL_KEYS[row.reason];
          return <Typography.Text>{String(motif || (reasonKey ? t(reasonKey) : row.reason))}</Typography.Text>;
        },
      },
      {
        title: t("partenaire_portefeuille_col_balance"),
        dataIndex: "balance_after",
        key: "balance_after",
        width: 140,
        render: (v: string) => `${Number(v).toLocaleString(localeTag)} FCFA`,
      },
    ],
    [t, localeTag]
  );

  const earningsColumns = useMemo(
    () => [
      {
        title: t("partenaire_portefeuille_col_date"),
        dataIndex: "created_at",
        key: "created_at",
        width: 160,
        render: formatDate,
      },
      {
        title: t("partenaire_portefeuille_col_reason"),
        key: "type",
        render: (_: unknown, row: PartenaireEarning) => {
          const key = EARNING_TYPE_KEYS[row.type] || row.type;
          return (
            <Typography.Text>
              {row.description || (EARNING_TYPE_KEYS[row.type] ? t(key) : row.type)}
            </Typography.Text>
          );
        },
      },
      {
        title: t("partenaire_portefeuille_col_amount"),
        dataIndex: "amount",
        key: "amount",
        width: 140,
        render: (v: string | number, row: PartenaireEarning) => {
          const isPoints = row.currency === "POINTS";
          return (
            <Typography.Text strong style={{ color: isPoints ? "#D97706" : partenairePalette.success }}>
              +{Number(v).toLocaleString(localeTag)} {isPoints ? "pts" : "FCFA"}
            </Typography.Text>
          );
        },
      },
    ],
    [t, localeTag]
  );

  if (loading) {
    return (
      <div style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Card
        style={{
          marginBottom: 20,
          borderRadius: 10,
          border: `1px solid ${partenairePalette.border}`,
          background: `linear-gradient(135deg, ${partenairePalette.greenDark} 0%, ${partenairePalette.greenMid} 100%)`,
        }}
        styles={{ body: { padding: "24px 28px" } }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Space size={14} align="center">
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <WalletOutlined style={{ fontSize: 24, color: "#FFFFFF" }} />
              </div>
              <div>
                <Typography.Text style={{ color: "rgba(255,255,255,0.75)", display: "block", fontSize: 12 }}>
                  {t("partenaire_portefeuille_balance_label")}
                </Typography.Text>
                <Typography.Title level={2} style={{ margin: 0, color: "#FFFFFF", fontWeight: 700 }}>
                  {balance.toLocaleString(localeTag)} FCFA
                </Typography.Title>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space size={14} align="center">
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <StarOutlined style={{ fontSize: 24, color: "#F5A64B" }} />
              </div>
              <div>
                <Typography.Text style={{ color: "rgba(255,255,255,0.75)", display: "block", fontSize: 12 }}>
                  {t("mesgains_points_title")}
                </Typography.Text>
                <Typography.Title level={2} style={{ margin: 0, color: "#F5A64B", fontWeight: 700 }}>
                  {fmtAmount(totalPoints, localeTag)} pts
                </Typography.Title>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={6}>
            <Statistic
              title={<span style={{ color: "rgba(255,255,255,0.75)" }}>{t("partenaire_portefeuille_operations")}</span>}
              value={history.length}
              valueStyle={{ color: "#FFFFFF" }}
            />
          </Col>
        </Row>
      </Card>

      {earningsStats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}>
              <Statistic
                title={t("mesgains_docs_found")}
                value={earningsStats.stats.total_found}
                valueStyle={{ color: partenairePalette.greenDark, fontSize: 22 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}>
              <Statistic
                title={t("mesgains_docs_returned")}
                value={earningsStats.stats.total_returned}
                valueStyle={{ color: partenairePalette.primary, fontSize: 22 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}>
              <Statistic
                title={t("partenaire_dashboard_card_available")}
                value={earningsStats.stats.total_available}
                valueStyle={{ fontSize: 22 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}>
              <Statistic
                title={t("partenaire_dashboard_card_matched")}
                value={earningsStats.stats.total_matched}
                valueStyle={{ fontSize: 22 }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {potentialCount > 0 && (
        <Card
          style={{ marginBottom: 20, borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}
          styles={{ body: { padding: "18px 22px" } }}
        >
          <Row align="middle" gutter={16}>
            <Col flex="none">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "#FFFBEB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <RiseOutlined style={{ color: "#D97706", fontSize: 20 }} />
              </div>
            </Col>
            <Col flex="auto">
              <Typography.Text strong style={{ color: partenairePalette.greenDark, display: "block" }}>
                {t("mesgains_potential_title")}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t("mesgains_potential_desc")} ({potentialCount})
              </Typography.Text>
            </Col>
            <Col flex="none">
              <Typography.Text strong style={{ color: "#D97706", fontSize: 18, display: "block", textAlign: "right" }}>
                {potential.toLocaleString(localeTag)} FCFA
              </Typography.Text>
              <Typography.Text style={{ color: partenairePalette.primary, fontSize: 14, display: "block", textAlign: "right" }}>
                +{potentialPts.toLocaleString(localeTag)} pts
              </Typography.Text>
            </Col>
          </Row>
        </Card>
      )}

      <Card
        title={
          <Space>
            <StarOutlined style={{ color: partenairePalette.primary }} />
            <Typography.Text strong style={{ color: partenairePalette.greenDark }}>
              {t("mesgains_points_title")}
            </Typography.Text>
          </Space>
        }
        extra={
          totalPoints > 0 ? (
            <Button type="primary" size="small" onClick={() => setConvertOpen(true)}>
              {t("mesgains_convert_points")}
            </Button>
          ) : null
        }
        style={{ marginBottom: 20, borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
          {t("partenaire_portefeuille_points_admin_note")}
        </Typography.Paragraph>

        <Space direction="vertical" size={12} style={{ width: "100%", marginBottom: 16 }}>
          <PointsBreakdownRow
            label={t("mesgains_declared_docs")}
            detail={`(+${pointsBreakdown.declarations.pts_per_unit || 5} pts × ${pointsBreakdown.declarations.count})`}
            pts={pointsBreakdown.declarations.points}
            color={partenairePalette.primary}
          />
          <PointsBreakdownRow
            label={t("mesgains_returned_docs_points")}
            detail={`(${pointsBreakdown.returns.count} ${t("mesgains_docs")})`}
            pts={pointsBreakdown.returns.points}
            color={partenairePalette.success}
          />
        </Space>
      </Card>

      <Card
        title={
          <Typography.Text strong style={{ color: partenairePalette.greenDark }}>
            {t("partenaire_portefeuille_points_history_title")}
          </Typography.Text>
        }
        style={{ marginBottom: 20, borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}
      >
        <Tabs
          defaultActiveKey="recent"
          onChange={(key) => {
            if (key === "history" && pointsHistory.length === 0) {
              fetchPointsHistory();
            }
          }}
          items={[
            {
              key: "recent",
              label: "Gains récents",
              children: (
                <Table
                  rowKey="id"
                  dataSource={earningsHistory}
                  columns={earningsColumns}
                  scroll={{ x: 560 }}
                  pagination={{ pageSize: 10, hideOnSinglePage: true }}
                  locale={{ emptyText: t("mesgains_no_earnings") }}
                />
              ),
            },
            {
              key: "history",
              label: "Historique complet",
              children: (
                <div>
                  <Space style={{ marginBottom: 16 }}>
                    <Select
                      placeholder="Filtrer par type"
                      style={{ width: 200 }}
                      allowClear
                      value={pointsHistoryFilter}
                      onChange={(value) => {
                        setPointsHistoryFilter(value);
                        fetchPointsHistory(value);
                      }}
                      options={[
                        { value: "DECLARATION", label: "Déclarations" },
                        { value: "REFERRAL", label: "Parrainages" },
                        { value: "MATCH", label: "Matchs" },
                        { value: "CONVERSION", label: "Conversions" },
                        { value: "WITHDRAWAL", label: "Retraits" },
                        { value: "BONUS", label: "Bonus" },
                      ]}
                    />
                    <Typography.Text type="secondary">
                      {pointsHistoryTotal} transaction{pointsHistoryTotal > 1 ? "s" : ""}
                    </Typography.Text>
                  </Space>
                  <Table
                    rowKey="id"
                    dataSource={pointsHistory}
                    columns={earningsColumns}
                    loading={pointsHistoryLoading}
                    scroll={{ x: 560 }}
                    pagination={{ pageSize: 10, hideOnSinglePage: false }}
                    locale={{ emptyText: t("mesgains_no_earnings") }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Card
        title={
          <Typography.Text strong style={{ color: partenairePalette.greenDark }}>
            {t("partenaire_portefeuille_history_title")}
          </Typography.Text>
        }
        style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="id"
          dataSource={history}
          columns={walletColumns}
          scroll={{ x: 760 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (tt) =>
              tt === 1
                ? t("partenaire_portefeuille_total", { count: tt })
                : t("partenaire_portefeuille_total_other", { count: tt }),
          }}
          locale={{ emptyText: t("partenaire_portefeuille_empty") }}
        />
      </Card>

      <Modal
        title={t("mesgains_convert_title")}
        open={convertOpen}
        onCancel={() => {
          setConvertOpen(false);
          setConvertAmount(null);
        }}
        onOk={handleConvert}
        okText={t("mesgains_convert_button")}
        cancelText={t("confirm_cancel")}
        confirmLoading={converting}
        okButtonProps={{ disabled: !convertAmount || convertAmount <= 0 || convertAmount > totalPoints }}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div>
            <Typography.Text type="secondary">{t("mesgains_convert_balance")}</Typography.Text>
            <Typography.Title level={4} style={{ margin: "4px 0 0", color: "#D97706" }}>
              {fmtAmount(totalPoints, localeTag)} pts
            </Typography.Title>
          </div>
          <div>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
              {t("mesgains_convert_amount")}
            </Typography.Text>
            <InputNumber
              min={1}
              max={totalPoints}
              value={convertAmount}
              onChange={(v) => setConvertAmount(typeof v === "number" ? v : null)}
              style={{ width: "100%" }}
              addonAfter="pts"
            />
            <Typography.Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 6 }}>
              {t("mesgains_convert_rate")}: {convertRate} pt = 1 FCFA
            </Typography.Text>
          </div>
          {convertAmount != null && convertAmount > 0 && (
            <Typography.Text strong style={{ color: partenairePalette.success }}>
              {t("mesgains_convert_receive")}: {xafFromConvert.toLocaleString(localeTag)} FCFA
            </Typography.Text>
          )}
        </Space>
      </Modal>
    </div>
  );
}

function PointsBreakdownRow({
  label,
  detail,
  pts,
  color,
}: {
  label: string;
  detail: string;
  pts: number;
  color: string;
}) {
  const pct = Math.min((pts / Math.max(pts, 50)) * 100, 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span>
          {label} <strong>{detail}</strong>
        </span>
        <strong>{pts} pts</strong>
      </div>
      <Progress percent={pct} showInfo={false} strokeColor={color} size="small" />
    </div>
  );
}
