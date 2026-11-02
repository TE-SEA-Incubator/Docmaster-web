import { useCallback, useEffect, useState } from "react";
import { Trans } from "react-i18next";
import {
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Card,
  Typography,
  Popconfirm,
  message,
  Tooltip,
  Badge,
  Empty,
  Drawer,
  Descriptions,
  Divider,
  DatePicker,
} from "antd";
import type { Dayjs } from "dayjs";
import {
  SafetyCertificateOutlined,
  StopOutlined,
  SearchOutlined,
  ReloadOutlined,
  IdcardOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FileOutlined,
  UserOutlined,
  PushpinOutlined,
  EditOutlined,
  WalletOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { autoritesService, type AutoriteDeclaration } from "../../services/autoritesService";
import { useAutorite } from "../../context/AutoriteContext";
import { useI18n } from "../../context/I18nContext";
import { autoritePalette } from "../../theme/autorites";

const TYPE_LABEL_KEYS: Record<string, string> = {
  LOST: "autorite_decl_type_lost",
  FOUND: "autorite_decl_type_found",
  PERDU: "autorite_decl_type_lost",
  TROUVE: "autorite_decl_type_found",
};
const TYPE_COLORS: Record<string, string> = { LOST: "red", FOUND: "blue", PERDU: "red", TROUVE: "blue" };
const isFoundDecl = (t?: string | null) => t === "FOUND" || t === "TROUVE";

const STATUS_META: Record<string, { labelKey: string; color: "success" | "processing" | "default" | "error" | "warning" }> = {
  SEARCHING: { labelKey: "autorite_status_searching", color: "processing" },
  AVAILABLE: { labelKey: "autorite_status_available", color: "default" },
  MATCHED: { labelKey: "autorite_status_matched", color: "warning" },
  RETURNED: { labelKey: "autorite_status_returned", color: "success" },
  RECOVERED: { labelKey: "autorite_status_recovered", color: "success" },
  CANCELLED: { labelKey: "autorite_status_cancelled", color: "error" },
  CLAIMED: { labelKey: "autorite_status_claimed", color: "warning" },
  PENDING: { labelKey: "autorite_status_pending", color: "default" },
};

const declarationStatus = (
  row: AutoriteDeclaration,
  t: (k: string, o?: Record<string, unknown>) => string
): { label: string; color: "success" | "processing" | "default" | "error" | "warning" } => {
  const key = String(row.status || "").toUpperCase();
  const meta = STATUS_META[key];
  return meta ? { label: t(meta.labelKey), color: meta.color } : { label: row.status || "—", color: "default" };
};

const parseFoundLocation = (row?: AutoriteDeclaration | null): string => {
  if (!row) return "";
  if (row.found_location_label) return row.found_location_label;
  const raw = row.found_location;
  if (!raw) return "";
  let obj: any = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  if (obj && typeof obj === "object") {
    return obj.city || obj.label || obj.nom || obj.quartier || obj.address || "";
  }
  return String(obj || "");
};

const reporterLabel = (
  row: AutoriteDeclaration,
  t: (k: string, o?: Record<string, unknown>) => string
): { label: string; isPartner: boolean } | null => {
  const isPartner = row.reporter_type === "PARTENAIRE" || !!row.reporter_partenaire_nom;
  if (isPartner) {
    return { label: row.reporter_partenaire_nom || t("autorite_decl_org_partner"), isPartner: true };
  }
  const name = isFoundDecl(row.declaration_type)
    ? [row.reporter_prenom, row.reporter_nom].filter(Boolean).join(" ")
    : row.finder_name;
  return name ? { label: name, isPartner: false } : null;
};

export default function Declarations() {
  const { autorite } = useAutorite();
  const { t, lang } = useI18n();
  const isHaute = autorite?.niveau === "HAUTE";

  const [data, setData] = useState<AutoriteDeclaration[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [certFilter, setCertFilter] = useState<string | undefined>();
  const [pays, setPays] = useState<string | undefined>();
  const [region, setRegion] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [options, setOptions] = useState<{ pays: string[]; regions: string[] }>({ pays: [], regions: [] });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [acting, setActing] = useState<string | null>(null);
  const [selected, setSelected] = useState<AutoriteDeclaration | null>(null);

  const localeTag = lang === "ar" ? "ar" : lang === "en" ? "en" : "fr-FR";
  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleDateString(localeTag, { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return value;
    }
  };

  const downloadPdf = async (row: AutoriteDeclaration | null) => {
    if (!row) return;
    try {
      const res = await autoritesService.getDeclarationPdf(row.id);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `declaration_${row.identifiant_doc_dm || row.id.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      message.error(t("autorite_decl_pdf_error"));
    }
  };

  useEffect(() => {
    autoritesService
      .getDeclarationOptions()
      .then((res) => setOptions(res.data.data))
      .catch(() => setOptions({ pays: [], regions: [] }));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await autoritesService.getDeclarations({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        search: search || undefined,
        is_certified: certFilter === undefined ? undefined : certFilter === "true",
        pays: pays || undefined,
        region: region || undefined,
        date_from: dateRange?.[0] ? dateRange[0].format("YYYY-MM-DD") : undefined,
        date_to: dateRange?.[1] ? dateRange[1].format("YYYY-MM-DD") : undefined,
        sort,
      });
      setData(res.data.data);
      setTotal(res.data.count);
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, certFilter, pays, region, dateRange, sort]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCertify = async (id: string) => {
    setActing(id);
    try {
      await autoritesService.certify(id);
      message.success(t("autorite_decl_success_certified"));
      fetchData();
      setSelected((prev) => (prev && prev.id === id ? { ...prev, is_certified: true } : prev));
    } catch (err: any) {
      message.error(err?.response?.data?.message || t("autorite_decl_error_certify"));
    } finally {
      setActing(null);
    }
  };

  const handleUncertify = async (id: string) => {
    setActing(id);
    try {
      await autoritesService.uncertify(id);
      message.success(t("autorite_decl_success_uncertified"));
      fetchData();
      setSelected((prev) => (prev && prev.id === id ? { ...prev, is_certified: false } : prev));
    } catch (err: any) {
      message.error(err?.response?.data?.message || t("autorite_decl_error_uncertify"));
    } finally {
      setActing(null);
    }
  };

  const openDetail = (row: AutoriteDeclaration) => {
    setSelected(row);
  };

  const columns: ColumnsType<AutoriteDeclaration> = [
    {
      title: t("autorite_decl_col_ref"),
      dataIndex: "identifiant_doc_dm",
      width: 130,
      render: (v: string, row) => (
        <Typography.Text strong style={{ color: autoritePalette.greenDark }}>
          {v || row.id.slice(0, 8).toUpperCase()}
        </Typography.Text>
      ),
    },
    {
      title: t("autorite_decl_col_doc_type"),
      dataIndex: "doc_type_nom",
      width: 170,
      render: (v: string, row) => (
        <Typography.Text style={{ color: autoritePalette.textMain }}>{v || row.doc_type || "—"}</Typography.Text>
      ),
    },
    {
      title: t("autorite_decl_col_owner"),
      dataIndex: "owner_name",
      width: 170,
      render: (v: string) => <Typography.Text style={{ color: autoritePalette.textMain }}>{v}</Typography.Text>,
    },
    {
      title: t("autorite_decl_col_doc_number"),
      dataIndex: "document_number",
      width: 140,
      render: (v?: string | null) => v || "—",
    },
    {
      title: t("autorite_decl_col_city"),
      dataIndex: "ville",
      width: 120,
      render: (v?: string | null) => v || "—",
    },
    {
      title: t("autorite_decl_col_date"),
      dataIndex: "created_at",
      width: 120,
      render: (v: string) => formatDate(v),
    },
    {
      title: t("autorite_decl_col_status"),
      key: "statut",
      width: 130,
      render: (_, row) => {
        const meta = declarationStatus(row, t);
        return <Badge status={meta.color} text={meta.label} />;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      fixed: "right",
      render: (_, row) => (
        <Space>
          {row.is_certified ? (
            isHaute ? (
              <Popconfirm
                title="Retirer la certification ?"
                description="La déclaration redeviendra non certifiée."
                onConfirm={() => handleUncertify(row.id)}
                okText="Retirer"
                okButtonProps={{ danger: true }}
                cancelText="Annuler"
              >
                <Button
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  loading={acting === row.id}
                  disabled={acting !== null}
                >
                  Décertifier
                </Button>
              </Popconfirm>
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Réservé aux autorités hautes
              </Typography.Text>
            )
          ) : (
            <Popconfirm
              title="Certifier cette déclaration ?"
              description="Vous confirmez l'authenticité de cette déclaration."
              onConfirm={() => handleCertify(row.id)}
              okText="Certifier"
              cancelText="Annuler"
            >
              <Button
                size="small"
                type="primary"
                icon={<SafetyCertificateOutlined />}
                loading={acting === row.id}
                disabled={acting !== null}
              >
                Certifier
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        style={{ marginBottom: 16, borderRadius: 10, border: `1px solid ${autoritePalette.border}` }}
        styles={{ body: { padding: "16px 20px" } }}
      >
        <Space wrap size={12}>
          <Input
            allowClear
            placeholder={t("autorite_decl_search_placeholder")}
            prefix={<SearchOutlined style={{ color: autoritePalette.textMuted }} />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 280 }}
          />
          <Select
            allowClear
            placeholder={t("autorite_decl_filter_certification")}
            value={certFilter}
            onChange={(v) => {
              setCertFilter(v);
              setPage(1);
            }}
            style={{ width: 160 }}
            options={[
              { value: "true", label: t("autorite_decl_certified") },
              { value: "false", label: t("autorite_decl_not_certified") },
            ]}
          />
          <Select
            allowClear
            placeholder={t("autorite_decl_pays")}
            value={pays}
            onChange={(v) => {
              setPays(v);
              setPage(1);
            }}
            style={{ width: 150 }}
            options={options.pays.map((p) => ({ value: p, label: p }))}
          />
          <Select
            allowClear
            placeholder={t("autorite_decl_region")}
            value={region}
            onChange={(v) => {
              setRegion(v);
              setPage(1);
            }}
            style={{ width: 160 }}
            options={options.regions.map((r) => ({ value: r, label: r }))}
          />
          <DatePicker.RangePicker
            allowClear
            value={dateRange}
            onChange={(v) => {
              setDateRange(v as [Dayjs | null, Dayjs | null] | null);
              setPage(1);
            }}
            style={{ width: 250 }}
          />
          <Select
            value={sort}
            onChange={(v) => {
              setSort(v);
              setPage(1);
            }}
            style={{ width: 190 }}
            options={[
              { value: "desc", label: t("autorite_decl_sort_recent") },
              { value: "asc", label: t("autorite_decl_sort_oldest") },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            {t("autorite_decl_refresh")}
          </Button>
        </Space>
        <div style={{ marginTop: 10 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {isHaute
              ? t("autorite_decl_access_haute")
              : t("autorite_decl_access_ville", { ville: autorite?.ville || "—" })}{" "}
            {t("autorite_decl_results", { count: total })}.
          </Typography.Text>
        </div>
      </Card>

      <Card style={{ borderRadius: 10, border: `1px solid ${autoritePalette.border}` }} styles={{ body: { padding: 12 } }}>
        <Table<AutoriteDeclaration>
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1200 }}
          onRow={(row) => ({
            onClick: () => openDetail(row),
            style: { cursor: "pointer" },
          })}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            showTotal: (tCount) => t("autorite_decl_total", { count: tCount }),
          }}
          locale={{
            emptyText: <Empty description={t("autorite_decl_empty")} />,
          }}
        />
      </Card>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        width={560}
        title={
          <Space>
            <FileOutlined style={{ color: autoritePalette.primary }} />
            <span>{t("autorite_decl_drawer_title")}</span>
            <Tag color={selected?.is_certified ? "success" : "default"} style={{ fontWeight: 500 }}>
              {selected?.is_certified ? t("autorite_status_certified") : t("autorite_status_not_certified")}
            </Tag>
            <Button
              size="small"
              type="link"
              icon={<DownloadOutlined />}
              onClick={() => { void downloadPdf(selected); }}
              style={{ fontSize: 12 }}
            >
              {t("autorite_decl_drawer_pdf")}
            </Button>
          </Space>
        }
      >
        {selected && (
          <DetailContent
            row={selected}
            isHaute={isHaute}
            acting={acting === selected.id}
            onCertify={() => handleCertify(selected.id)}
            onUncertify={() => handleUncertify(selected.id)}
            t={t}
            localeTag={localeTag}
          />
        )}
      </Drawer>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0" }}>
      <span style={{ color: autoritePalette.primary, marginTop: 2, minWidth: 16, textAlign: "center" }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <Typography.Text type="secondary" style={{ fontSize: 11, display: "block", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </Typography.Text>
        {value !== undefined && value !== null && String(value) !== "" ? (
          <Typography.Text style={{ fontSize: 13, color: autoritePalette.textMain }}>{value}</Typography.Text>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            —
          </Typography.Text>
        )}
      </div>
    </div>
  );
}

function DetailContent({
  row,
  isHaute,
  acting,
  onCertify,
  onUncertify,
  t,
  localeTag,
}: {
  row: AutoriteDeclaration;
  isHaute: boolean;
  acting: boolean;
  onCertify: () => void;
  onUncertify: () => void;
  t: (k: string, o?: Record<string, unknown>) => string;
  localeTag: string;
}) {
  const typeLabel = TYPE_LABEL_KEYS[row.declaration_type]
    ? t(TYPE_LABEL_KEYS[row.declaration_type])
    : row.declaration_type;
  const fmtDate = (v?: string | null) => {
    if (!v) return "—";
    try {
      return new Date(v).toLocaleDateString(localeTag);
    } catch {
      return v;
    }
  };

  return (
    <div>
      <div
        style={{
          background: `linear-gradient(135deg, ${autoritePalette.greenDark}, ${autoritePalette.greenMid})`,
          borderRadius: 10,
          padding: 18,
          color: "#fff",
          marginBottom: 16,
        }}
      >
        <Space align="center" style={{ width: "100%", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <Typography.Title level={4} style={{ color: "#fff", margin: 0 }}>
              {row.identifiant_doc_dm || row.id.slice(0, 8).toUpperCase()}
            </Typography.Title>
            <Typography.Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
              {row.doc_type_nom || row.doc_type || t("autorite_decl_doc_default")}
            </Typography.Text>
          </div>
          <Tag color={TYPE_COLORS[row.declaration_type] || "default"} style={{ fontWeight: 600, margin: 0 }}>
            {typeLabel}
          </Tag>
        </Space>

        <Space style={{ marginTop: 8, width: "100%", justifyContent: "space-between" }} wrap>
          <Space size={8}>
            <UserOutlined />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{row.owner_name}</span>
          </Space>
          {row.is_certified && (
            <Badge
              status="success"
              text={
                <span style={{ color: "#fff", fontSize: 12 }}>
                  {row.certified_by_prenom || row.certified_by_nom
                    ? t("autorite_decl_certified_drawer", { name: `${row.certified_by_prenom || ""} ${row.certified_by_nom || ""}`.trim() })
                    : t("autorite_decl_certified_by_unknown")}
                  {row.certified_at ? ` · ${fmtDate(row.certified_at)}` : ""}
                </span>
              }
            />
          )}
        </Space>
        {(() => {
          const r = reporterLabel(row, t);
          if (!r) return null;
          return (
            <Space size={8} style={{ marginTop: 10 }}>
              {r.isPartner ? (
                <i className="ph ph-building" style={{ color: "rgba(255,255,255,0.75)" }} />
              ) : (
                <SearchOutlined style={{ color: "rgba(255,255,255,0.75)" }} />
               )}
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                <Trans 
                  i18nKey="autorite_decl_found_by" 
                  components={{ strong: <strong /> }} 
                  values={{ name: r.label }} 
                />
              </span>
              {r.isPartner && (
                <Tag color="cyan" style={{ marginLeft: 8, fontWeight: 600 }}>
                  {t("autorite_decl_partner")}
                </Tag>
              )}
            </Space>
          );
        })()}
      </div>

      <Descriptions column={1} size="small" colon={false}>
        <Descriptions.Item label={<Space size={6}><IdcardOutlined /> {t("autorite_decl_label_doc_number")}</Space>}>
          {row.document_number || "—"}
        </Descriptions.Item>
        <Descriptions.Item label={<Space size={6}><FileOutlined /> {t("autorite_decl_label_type")}</Space>}>
          {row.doc_type_nom || row.doc_type || "—"}
        </Descriptions.Item>
        <Descriptions.Item label={<Space size={6}><ClockCircleOutlined /> {t("autorite_decl_col_status")}</Space>}>
          {declarationStatus(row, t).label}
        </Descriptions.Item>
        <Descriptions.Item label={<Space size={6}><EnvironmentOutlined /> {t("autorite_decl_label_location")}</Space>}>
          {[row.quartier, row.ville, row.region, row.pays].filter(Boolean).join(", ") || "—"}
        </Descriptions.Item>
        <Descriptions.Item label={<Space size={6}><PushpinOutlined /> {t("autorite_decl_label_found_location")}</Space>}>
          {parseFoundLocation(row) || "—"}
        </Descriptions.Item>
        <Descriptions.Item label={<Space size={6}><CalendarOutlined /> {t("autorite_decl_label_lost_date")}</Space>}>
          {fmtDate(row.date_perte)}
        </Descriptions.Item>
        <Descriptions.Item label={<Space size={6}><CalendarOutlined /> {t("autorite_decl_label_expiry_date")}</Space>}>
          {fmtDate(row.date_expiration)}
        </Descriptions.Item>
        <Descriptions.Item label={<Space size={6}><CalendarOutlined /> {t("autorite_decl_label_registered")}</Space>}>
          {row.created_at ? new Date(row.created_at).toLocaleString(localeTag) : "—"}
        </Descriptions.Item>
        <Descriptions.Item label={<Space size={6}><EditOutlined /> {t("autorite_decl_label_physical_state")}</Space>}>
          {row.etat_physique || "—"}
        </Descriptions.Item>
        <Descriptions.Item label={<Space size={6}><WalletOutlined /> {t("autorite_decl_label_reward")}</Space>}>
          {row.recompense_montant != null ? `${Number(row.recompense_montant).toLocaleString(localeTag)} XAF` : "—"}
        </Descriptions.Item>
      </Descriptions>

      {row.description && (
        <>
          <Divider style={{ margin: "12px 0" }} />
          <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {t("autorite_decl_description")}
          </Typography.Text>
          <Typography.Paragraph style={{ marginTop: 6, fontSize: 13, marginBottom: 0 }}>
            {row.description}
          </Typography.Paragraph>
        </>
      )}

      <Divider style={{ margin: "12px 0" }} />
      <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {t("autorite_decl_declarant_contact")}
      </Typography.Text>
      <div style={{ marginTop: 8 }}>
        <DetailRow icon={<PhoneOutlined />} label={t("autorite_decl_phone")} value={row.telephone_contact} />
        <DetailRow icon={<MailOutlined />} label={t("autorite_decl_email")} value={row.email_contact} />
        <DetailRow icon={<EnvironmentOutlined />} label={t("autorite_decl_contact_mode")} value={row.mode_contact} />
      </div>

      <Divider style={{ margin: "16px 0" }} />
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        {row.is_certified ? (
          isHaute ? (
            <Popconfirm
              title={t("autorite_decl_uncertify_title")}
              onConfirm={onUncertify}
              okText={t("autorite_decl_uncertify_ok")}
              okButtonProps={{ danger: true }}
              cancelText={t("autorite_decl_cancel")}
            >
              <Button danger icon={<StopOutlined />} loading={acting}>
                {t("autorite_decl_uncertify_btn")}
              </Button>
            </Popconfirm>
          ) : (
            <Typography.Text type="secondary">
              {t("autorite_decl_reserved_haute")}
            </Typography.Text>
          )
        ) : (
          <Popconfirm
            title={t("autorite_decl_certify_title")}
            description={t("autorite_decl_certify_desc")}
            onConfirm={onCertify}
            okText={t("autorite_decl_certify_ok")}
            cancelText={t("autorite_decl_cancel")}
          >
            <Button type="primary" icon={<SafetyCertificateOutlined />} loading={acting} size="large">
              {t("autorite_decl_certify_btn")}
            </Button>
          </Popconfirm>
        )}
      </div>
    </div>
  );
}
