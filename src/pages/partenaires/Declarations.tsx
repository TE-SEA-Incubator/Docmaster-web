import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  FileProtectOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { partenairesService, type PartenaireDeclaration } from "../../services/partenairesService";
import { useI18n } from "../../context/I18nContext";
import { partenairePalette } from "../../theme/partenaires";
import DeclarationDetailDrawer from "../../components/partenaires/DeclarationDetailDrawer";

const STATUS_LABEL_KEYS: Record<string, { labelKey: string; color: string }> = {
  AVAILABLE: { labelKey: "partenaire_dashboard_status_available", color: "blue" },
  MATCHED: { labelKey: "partenaire_dashboard_status_matched", color: "gold" },
  RETURNED: { labelKey: "partenaire_dashboard_status_returned", color: "green" },
};

export default function Declarations() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const localeTag = lang === "ar" ? "ar" : lang === "en" ? "en" : "fr-FR";
  const [data, setData] = useState<PartenaireDeclaration[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<PartenaireDeclaration | null>(null);

  const statusTag = (s?: string | null) => {
    const meta = STATUS_LABEL_KEYS[s || ""];
    if (!meta) return <Tag>{s || "—"}</Tag>;
    return <Tag color={meta.color}>{t(meta.labelKey)}</Tag>;
  };

  const formatDate = (v?: string | null) => {
    if (!v) return "—";
    try {
      return new Date(v).toLocaleDateString(localeTag, { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return v;
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await partenairesService.getDeclarations({
        page,
        limit: pageSize,
        q: search || undefined,
        status: statusFilter,
      });
      setData(res.data.rows);
      setTotal(res.data.total);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onDelete = async (id: string) => {
    try {
      await partenairesService.deleteDeclaration(id);
      if (detail?.id === id) setDetail(null);
      fetchData();
    } catch (err: any) {
      // noop
    }
  };

  const columns = [
    {
      title: t("partenaire_decl_col_ref"),
      dataIndex: "identifiant_doc_dm",
      key: "identifiant_doc_dm",
      width: 130,
      render: (v: string | null, row: PartenaireDeclaration) => (
        <Typography.Text strong style={{ color: partenairePalette.primaryDark }}>
          {v || row.id.slice(0, 8)}
        </Typography.Text>
      ),
    },
    {
      title: t("partenaire_decl_col_doc_type"),
      key: "doc_type",
      width: 190,
      render: (_: any, row: PartenaireDeclaration) => (
        <Typography.Text>{row.doc_type_name || row.doc_type || "—"}</Typography.Text>
      ),
    },
    {
      title: t("partenaire_decl_col_owner"),
      dataIndex: "owner_name",
      key: "owner_name",
      width: 180,
      render: (v: string) => <Typography.Text strong>{v || "—"}</Typography.Text>,
    },
    {
      title: t("partenaire_decl_col_doc_number"),
      dataIndex: "document_number",
      key: "document_number",
      width: 150,
      render: (v?: string | null) => v || "—",
    },
    {
      title: t("partenaire_decl_col_location"),
      key: "ville",
      width: 160,
      render: (_: any, row: PartenaireDeclaration) => [row.ville, row.quartier].filter(Boolean).join(", ") || "—",
    },
    {
      title: t("partenaire_decl_col_status"),
      dataIndex: "status",
      key: "status",
      width: 140,
      render: statusTag,
    },
    {
      title: t("partenaire_decl_col_date"),
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      render: formatDate,
    },
    {
      title: "",
      key: "actions",
      width: 180,
      render: (_: any, row: PartenaireDeclaration) => (
        <Space size={4}>
          {row.status === "MATCHED" && (
            <Button
              type="primary"
              size="small"
              onClick={() => navigate(`/partenaire/rendre?id=${row.id}`)}
            >
              {t("partenaire_rendre_btn")}
            </Button>
          )}
          <Button type="text" size="small" onClick={() => setDetail(row)}>
            {t("partenaire_decl_details")}
          </Button>
          <Popconfirm
            title={t("partenaire_decl_delete_title")}
            description={t("partenaire_decl_delete_desc")}
            okText={t("partenaire_decl_delete_ok")}
            okButtonProps={{ danger: true }}
            cancelText={t("partenaire_decl_cancel")}
            onConfirm={() => onDelete(row.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        style={{ marginBottom: 16, borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}
        styles={{ body: { padding: 16 } }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8}>
            <Input
              prefix={<SearchOutlined style={{ color: partenairePalette.textMuted }} />}
              placeholder={t("partenaire_decl_search_placeholder")}
              allowClear
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </Col>
          <Col xs={24} md={5}>
            <Select
              style={{ width: "100%" }}
              placeholder={t("partenaire_decl_filter_status")}
              allowClear
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              options={[
                { value: "AVAILABLE", label: t("partenaire_dashboard_status_available") },
                { value: "MATCHED", label: t("partenaire_dashboard_status_matched") },
                { value: "RETURNED", label: t("partenaire_dashboard_status_returned") },
              ]}
            />
          </Col>
          <Col xs={24} md={5}>
            <Button icon={<ReloadOutlined />} onClick={() => fetchData()}>
              {t("partenaire_decl_refresh")}
            </Button>
          </Col>
          <Col xs={24} md={6} style={{ textAlign: "right" }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/partenaire/declarer")}>
              {t("partenaire_decl_declare")}
            </Button>
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }} styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns}
          scroll={{ x: 1100 }}
          onRow={(row) => ({
            onClick: () => setDetail(row),
            style: { cursor: "pointer" },
          })}
          locale={{ emptyText: <Empty description={t("partenaire_decl_empty")} /> }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (tt) => `${tt === 1 ? t("partenaire_decl_total", { count: tt }) : t("partenaire_decl_total_other", { count: tt })}`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      <DeclarationDetailDrawer
        open={!!detail}
        declaration={detail}
        onClose={() => setDetail(null)}
        onDelete={onDelete}
      />
    </div>
  );
}
