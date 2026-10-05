import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SaveOutlined,
  ShopOutlined,
  UserOutlined,
  WalletOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { usePartenaire } from "../../context/PartenaireContext";
import { useI18n } from "../../context/I18nContext";
import { partenairesService } from "../../services/partenairesService";
import AntdLocationSelect from "../../components/ui/AntdLocationSelect";
import OsmStreetSearch from "../../components/ui/OsmStreetSearch";
import { partenairePalette } from "../../theme/partenaires";

interface ProfilFormValues {
  nom_organisation: string;
  telephone?: string;
  nom_contact?: string;
  prenom_contact?: string;
  adresse?: string;
  ville?: string;
  region?: string;
}

export default function Profil() {
  const { partenaire, refresh } = usePartenaire();
  const { t, lang } = useI18n();
  const localeTag = lang === "ar" ? "ar" : lang === "en" ? "en" : "fr-FR";
  const [form] = Form.useForm<ProfilFormValues>();
  const [locationValue, setLocationValue] = useState<{ region: string; department: string; arrondissement: string }>({
    region: "",
    department: "",
    arrondissement: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!partenaire) return;
    form.setFieldsValue({
      nom_organisation: partenaire.nom_organisation || "",
      telephone: partenaire.telephone || "",
      nom_contact: partenaire.nom_contact || "",
      prenom_contact: partenaire.prenom_contact || "",
      adresse: partenaire.adresse || "",
      ville: partenaire.ville || "",
      region: partenaire.region || "",
    });
    setLocationValue({
      region: partenaire.region || "",
      department: "",
      arrondissement: "",
    });
  }, [partenaire, form]);

  const onSave = async (values: ProfilFormValues) => {
    setSaving(true);
    setError("");
    setDone(false);
    try {
      await partenairesService.updateProfile({
        nom_organisation: values.nom_organisation,
        telephone: values.telephone || undefined,
        nom_contact: values.nom_contact || undefined,
        prenom_contact: values.prenom_contact || undefined,
        adresse: values.adresse || undefined,
        ville: values.ville || undefined,
        region: values.region || undefined,
      });
      await refresh();
      setDone(true);
      message.success(t("partenaire_profil_updated_msg"));
      setTimeout(() => setDone(false), 2500);
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      if (errors && typeof errors === "object") {
        const first = Object.values(errors)[0];
        setError(Array.isArray(first) ? (first[0] as string) : String(first));
      } else {
        setError(err?.response?.data?.message || t("partenaire_profil_error_default"));
      }
    } finally {
      setSaving(false);
    }
  };

  if (!partenaire) return null;

  const statutTag =
    partenaire.statut === "ACTIF" ? (
      <Tag icon={<CheckCircleOutlined />} color="green">
        {t("partenaire_profil_status_active")}
      </Tag>
    ) : partenaire.statut === "SUSPENDU" ? (
      <Tag color="red">{t("partenaire_profil_status_suspended")}</Tag>
    ) : (
      <Tag color="orange">{t("partenaire_profil_status_inactive")}</Tag>
    );

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* Carte organisation */}
        <Col xs={24} lg={9}>
          <Card style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <Avatar
                size={72}
                style={{
                  background: partenairePalette.primary,
                  fontSize: 30,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                {(partenaire.nom_organisation || "O").charAt(0).toUpperCase()}
              </Avatar>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {partenaire.nom_organisation}
              </Typography.Title>
              <div style={{ marginTop: 6 }}>{statutTag}</div>
            </div>

            <Divider style={{ margin: "4px 0 14px" }} />

            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <MailOutlined style={{ color: partenairePalette.primary, marginTop: 3 }} />
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    {t("partenaire_profil_email_label")}
                  </Typography.Text>
                  <Typography.Text strong>{partenaire.email}</Typography.Text>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <PhoneOutlined style={{ color: partenairePalette.primary, marginTop: 3 }} />
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    {t("partenaire_profil_phone_label")}
                  </Typography.Text>
                  <Typography.Text strong>{partenaire.telephone || "—"}</Typography.Text>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <UserOutlined style={{ color: partenairePalette.primary, marginTop: 3 }} />
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    {t("partenaire_profil_contact_person")}
                  </Typography.Text>
                  <Typography.Text strong>
                    {[partenaire.prenom_contact, partenaire.nom_contact].filter(Boolean).join(" ") || "—"}
                  </Typography.Text>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <EnvironmentOutlined style={{ color: partenairePalette.primary, marginTop: 3 }} />
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    {t("partenaire_profil_location")}
                  </Typography.Text>
                  <Typography.Text strong>
                    {[partenaire.ville, partenaire.region].filter(Boolean).join(", ") || "—"}
                  </Typography.Text>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <IdcardOutlined style={{ color: partenairePalette.primary, marginTop: 3 }} />
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    {t("partenaire_profil_address")}
                  </Typography.Text>
                  <Typography.Text strong>{partenaire.adresse || "—"}</Typography.Text>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <WalletOutlined style={{ color: partenairePalette.success, marginTop: 3 }} />
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    {t("partenaire_profil_balance")}
                  </Typography.Text>
                  <Typography.Text strong style={{ color: partenairePalette.success }}>
                    {Number(partenaire.wallet_balance || 0).toLocaleString(localeTag)} FCFA
                  </Typography.Text>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <StarOutlined style={{ color: "#D97706", marginTop: 3 }} />
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    {t("partenaire_profil_points")}
                  </Typography.Text>
                  <Typography.Text strong style={{ color: "#D97706" }}>
                    {Number(partenaire.points || 0).toLocaleString(localeTag)} pts
                  </Typography.Text>
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        {/* Formulaire de modification */}
        <Col xs={24} lg={15}>
          <Card
            style={{ borderRadius: 10, border: `1px solid ${partenairePalette.border}` }}
            title={
              <Space>
                <ShopOutlined style={{ color: partenairePalette.primary }} />
                <span>{t("partenaire_profil_edit_title")}</span>
              </Space>
            }
          >
            {done && (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message={t("partenaire_profil_updated")}
                style={{ marginBottom: 16 }}
              />
            )}
            {error && (
              <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} closable onClose={() => setError("")} />
            )}

            <Form form={form} layout="vertical" onFinish={onSave} requiredMark={false}>
              <Form.Item
                name="nom_organisation"
                label={t("partenaire_profil_org_name_label")}
                rules={[{ required: true, message: t("partenaire_profil_org_name_required") }]}
              >
                <Input placeholder={t("partenaire_profil_org_name_placeholder")} />
              </Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="telephone" label={t("partenaire_profil_phone")}>
                    <Input placeholder="ex: 671000000" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="prenom_contact" label={t("partenaire_profil_contact_firstname")}>
                    <Input placeholder={t("partenaire_profil_contact_firstname_placeholder")} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="nom_contact" label={t("partenaire_profil_contact_lastname")}>
                    <Input placeholder={t("partenaire_profil_contact_lastname_placeholder")} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label={t("partenaire_profil_location")} required>
                <AntdLocationSelect
                  value={locationValue}
                  onChange={(val) => {
                    setLocationValue(val);
                    form.setFieldsValue({
                      region: val.region,
                      ville: val.arrondissement || val.department,
                    });
                  }}
                />
              </Form.Item>

              <Form.Item name="adresse" label={t("partenaire_profil_street")}>
                <OsmStreetSearch
                  onChange={(adresse) => form.setFieldsValue({ adresse })}
                  placeholder={t("partenaire_profil_street_placeholder")}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[13px] outline-none focus:border-[#1F7A8C] transition-colors"
                />
              </Form.Item>

              <Divider style={{ margin: "8px 0 16px" }}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  <LockOutlined style={{ marginRight: 6 }} />
                  {t("partenaire_profil_admin_note")}
                </Typography.Text>
              </Divider>

              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} style={{ height: 40 }}>
                {t("partenaire_profil_save")}
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
