import { useEffect, useState } from "react";
import {
  Card,
  Table,
  Typography,
  Space,
  Button,
  Modal,
  Form,
  Input,
  Tag,
  Empty,
  Badge,
  Popconfirm,
  Divider,
  message,
} from "antd";
import { UserAddOutlined, ReloadOutlined, DeleteOutlined, KeyOutlined } from "@ant-design/icons";
import { autoritesService, AutoriteSession } from "../../services/autoritesService";
import { useI18n } from "../../context/I18nContext";
import { autoritePalette } from "../../theme/autorites";
import AntdLocationSelect from "../../components/ui/AntdLocationSelect";

const { Title, Text } = Typography;

export default function GestionAutorites() {
  const { t } = useI18n();
  const [autorites, setAutorites] = useState<AutoriteSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [locationValue, setLocationValue] = useState<{ region: string; department: string; arrondissement: string }>({ region: "", department: "", arrondissement: "" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAutorites = () => {
    setLoading(true);
    autoritesService
      .getManagedAutorites()
      .then((res) => setAutorites(res.data.data || []))
      .catch(() => setAutorites([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAutorites();
  }, []);

  useEffect(() => {
    if (modalOpen) {
      setLocationValue({ region: "", department: "", arrondissement: "" });
      form.resetFields();
    }
  }, [modalOpen]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const res = await autoritesService.createByHaute(values);
      setTempPassword(res.data.data?.temp_password || null);
      setModalOpen(false);
      form.resetFields();
      fetchAutorites();
      message.success(t("autorite_gestion_create_success"));
    } catch (err: any) {
      if (err?.response?.data?.message) {
        message.error(err.response.data.message);
      } else if (err?.response?.data?.errors) {
        const first = Object.values(err.response.data.errors)[0] as string[];
        message.error(first?.[0] || t("autorite_gestion_create_error"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await autoritesService.deleteManaged(id);
      message.success(t("autorite_gestion_delete_success"));
      fetchAutorites();
    } catch (err: any) {
      message.error(err?.response?.data?.message || t("autorite_gestion_delete_error"));
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      title: t("autorite_gestion_col_autorite"),
      key: "autorite",
      render: (_: unknown, a: AutoriteSession) => (
        <Space>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: autoritePalette.greenDark,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {`${(a.prenom || "").charAt(0)}${(a.nom || "").charAt(0)}`.toUpperCase()}
          </div>
          <div>
            <Text strong style={{ fontSize: 13, color: autoritePalette.textMain }}>
              {a.prenom} {a.nom}
            </Text>
            <div style={{ fontSize: 11, color: autoritePalette.textMuted }}>{a.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: t("autorite_gestion_col_ville"),
      dataIndex: "ville",
      width: 160,
      render: (v: string, a: AutoriteSession) => (
        <Text style={{ fontSize: 12, color: autoritePalette.textMain }}>
          {v}
          {a.region ? `, ${a.region}` : ""}
          {a.bureau ? ` (${a.bureau})` : ""}
        </Text>
      ),
    },
    {
      title: t("autorite_gestion_col_niveau"),
      dataIndex: "niveau",
      width: 120,
      render: (v: string) => (
        <Tag color={v === "HAUTE" ? "orange" : "green"} style={{ fontWeight: 600 }}>
          {v === "HAUTE" ? t("autorite_gestion_niveau_haute") : t("autorite_gestion_niveau_normal")}
        </Tag>
      ),
    },
    {
      title: t("autorite_gestion_col_statut"),
      dataIndex: "is_active",
      width: 110,
      render: (v: boolean) =>
        v ? (
          <Badge status="success" text={<Text style={{ fontSize: 12 }}>{t("autorite_gestion_active")}</Text>} />
        ) : (
          <Badge status="default" text={<Text style={{ fontSize: 12 }}>{t("autorite_gestion_inactive")}</Text>} />
        ),
    },
    {
      title: t("autorite_gestion_col_password"),
      dataIndex: "must_change_password",
      width: 170,
      render: (v: boolean) =>
        v ? (
          <Tag icon={<KeyOutlined />} color="warning" style={{ fontSize: 11 }}>
            {t("autorite_gestion_to_change")}
          </Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("autorite_gestion_set")}
          </Text>
        ),
    },
    {
      title: t("autorite_gestion_col_actions"),
      key: "actions",
      width: 90,
      align: "right" as const,
      render: (_: unknown, a: AutoriteSession) => (
        <Popconfirm
          title={t("autorite_gestion_delete_title")}
          description={t("autorite_gestion_delete_desc")}
          onConfirm={() => handleDelete(a.id)}
          okText={t("autorite_gestion_delete_ok")}
          okButtonProps={{ danger: true }}
          cancelText={t("autorite_gestion_cancel")}
        >
          <Button
            danger
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            loading={deletingId === a.id}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: autoritePalette.greenDark }}>
            {t("autorite_gestion_title")}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t("autorite_gestion_subtitle")}
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchAutorites}>
            {t("autorite_gestion_refresh")}
          </Button>
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setModalOpen(true)} style={{ background: autoritePalette.primary, borderColor: autoritePalette.primary }}>
            {t("autorite_gestion_create")}
          </Button>
        </Space>
      </div>

      <Card
        style={{ borderRadius: 10, border: `1px solid ${autoritePalette.border}` }}
        styles={{ body: { padding: 12 } }}
      >
        <Table<AutoriteSession>
          rowKey="id"
          columns={columns}
          dataSource={autorites}
          loading={loading}
          pagination={false}
          locale={{
            emptyText: <Empty description={t("autorite_gestion_empty")} />,
          }}
        />
      </Card>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={
          <Space>
            <UserAddOutlined style={{ color: autoritePalette.primary }} />
            {t("autorite_gestion_modal_title")}
          </Space>
        }
        okText={t("autorite_gestion_modal_ok")}
        okButtonProps={{
          loading: saving,
          style: { background: autoritePalette.primary, borderColor: autoritePalette.primary },
        }}
        onOk={handleCreate}
        width={520}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item
              name="prenom"
              label={t("autorite_gestion_prenom")}
              rules={[{ required: true, message: t("autorite_gestion_prenom_required") }]}
            >
              <Input placeholder="ex: Marie" />
            </Form.Item>
            <Form.Item name="nom" label={t("autorite_gestion_nom")} rules={[{ required: true, message: t("autorite_gestion_nom_required") }]}>
              <Input placeholder="ex: Ngono" />
            </Form.Item>
          </div>
          <Form.Item
            name="email"
            label={t("autorite_gestion_email")}
            rules={[
              { required: true, message: t("autorite_gestion_email_required") },
              { type: "email", message: t("autorite_gestion_email_invalid") },
            ]}
          >
            <Input placeholder="ex: marie.ngono@pndp.cm" />
          </Form.Item>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="telephone" label={t("autorite_gestion_telephone")}>
              <Input placeholder="ex: 671000000" />
            </Form.Item>
          </div>
          <Form.Item name="bureau" label={t("autorite_gestion_bureau")}>
            <Input placeholder={t("autorite_gestion_bureau_placeholder")} />
          </Form.Item>
          <Form.Item
            label={t("autorite_gestion_location")}
            required
            rules={[{ validator: async () => {
              if (!locationValue.department) throw new Error(t("autorite_gestion_city_required"));
            }}]}
          >
            <AntdLocationSelect
              value={locationValue}
              onChange={(val) => {
                setLocationValue(val);
                form.setFieldsValue({
                  region: val.region,
                  department: val.department,
                  arrondissement: val.arrondissement,
                  ville: val.arrondissement || val.department,
                });
              }}
            />
          </Form.Item>
          <Divider style={{ margin: "8px 0 16px" }} />
          <div
            style={{
              padding: "10px 14px",
              background: "#fff7e6",
              border: "1px solid #ffd591",
              borderRadius: 8,
              fontSize: 12,
              color: "#d46b08",
            }}
          >
            {t("autorite_gestion_info_box")}
          </div>
        </Form>
      </Modal>

      <Modal
        open={tempPassword !== null}
        onCancel={() => setTempPassword(null)}
        footer={
          <Button type="primary" onClick={() => setTempPassword(null)} style={{ background: autoritePalette.primary, borderColor: autoritePalette.primary }}>
            {t("autorite_gestion_temp_close")}
          </Button>
        }
        width={420}
      >
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "#f6ffed",
              border: "1px solid #b7eb8f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
            }}
          >
            <KeyOutlined style={{ color: "#52c41a", fontSize: 20 }} />
          </div>
          <Title level={4} style={{ margin: 0, color: autoritePalette.greenDark }}>
            {t("autorite_gestion_temp_title")}
          </Title>
          <Text type="secondary" style={{ fontSize: 13, display: "block", margin: "8px 0 14px" }}>
            {t("autorite_gestion_temp_desc")}
          </Text>
          <div
            style={{
              background: autoritePalette.greenDark,
              color: "#a7f3d0",
              fontFamily: "monospace",
              borderRadius: 8,
              padding: "12px",
              textAlign: "center",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.12em",
            }}
          >
            {tempPassword}
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 12 }}>
            {t("autorite_gestion_temp_footer")}
          </Text>
        </div>
      </Modal>
    </div>
  );
}
