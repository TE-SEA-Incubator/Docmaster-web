import { useState } from "react";
import { Button, Card, Form, Input, Typography, Alert, Space } from "antd";
import { LockOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { usePartenaire } from "../../context/PartenaireContext";
import { useI18n } from "../../context/I18nContext";
import { partenairesService } from "../../services/partenairesService";
import { partenairePalette } from "../../theme/partenaires";
import PartenaireDesignProvider from "../../components/partenaires/PartenaireDesignProvider";
import PartenaireBrandLogo from "../../components/partenaires/PartenaireBrandLogo";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";

export default function ChangementMotDePasse() {
  const { partenaire, refresh } = usePartenaire();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const onFinish = async (values: { ancien_mot_de_passe: string; nouveau_mot_de_passe: string }) => {
    setLoading(true);
    setError("");
    try {
      await partenairesService.changePassword(values.ancien_mot_de_passe, values.nouveau_mot_de_passe);
      setDone(true);
      await refresh();
      setTimeout(() => navigate("/partenaire/dashboard", { replace: true }), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || t("pwd_error_default"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PartenaireDesignProvider>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: `linear-gradient(135deg, ${partenairePalette.greenDark} 0%, ${partenairePalette.greenMid} 60%, ${partenairePalette.primaryDark} 100%)`,
        }}
      >
        <div style={{ position: "absolute", top: 16, right: 16 }}>
          <LanguageSwitcher onDark accentColor={partenairePalette.primary} />
        </div>

        <Card
          style={{
            width: 440,
            maxWidth: "100%",
            boxShadow: "0 12px 40px rgba(18, 52, 60, 0.22)",
            borderRadius: 10,
            border: `1px solid ${partenairePalette.border}`,
          }}
          styles={{ body: { padding: 36 } }}
        >
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ marginBottom: 16 }}>
              <PartenaireBrandLogo />
            </div>
            <Typography.Title level={5} style={{ margin: 0, color: partenairePalette.greenDark }}>
              {t("pwd_title")}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 6, fontSize: 13 }}>
              {partenaire && `${partenaire.nom_organisation} — `}
              {t("pwd_desc").replace(/^—\s*/, "")}
            </Typography.Text>
          </div>

          {done && (
            <Alert
              type="success"
              icon={<CheckCircleOutlined />}
              message={t("pwd_updated")}
              description={t("pwd_redirect")}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {error && (
            <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} closable onClose={() => setError("")} />
          )}

          <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
            <Form.Item
              name="ancien_mot_de_passe"
              label={t("pwd_temp_label")}
              rules={[{ required: true, message: t("pwd_temp_required") }]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: partenairePalette.textMuted }} />} placeholder="••••••••" />
            </Form.Item>

            <Form.Item
              name="nouveau_mot_de_passe"
              label={t("pwd_new_label")}
              rules={[
                { required: true, message: t("pwd_new_required") },
                { min: 8, message: t("pwd_min_length") },
              ]}
              extra={t("pwd_min_extra")}
            >
              <Input.Password prefix={<LockOutlined style={{ color: partenairePalette.textMuted }} />} placeholder="••••••••" />
            </Form.Item>

            <Form.Item
              name="confirmation"
              label={t("pwd_confirm_label")}
              dependencies={["nouveau_mot_de_passe"]}
              rules={[
                { required: true, message: t("pwd_confirm_required") },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("nouveau_mot_de_passe") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t("pwd_mismatch")));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: partenairePalette.textMuted }} />} placeholder="••••••••" />
            </Form.Item>

            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 46, fontWeight: 600 }}>
              {t("pwd_submit")}
            </Button>
          </Form>

          <Space direction="vertical" size={4} style={{ width: "100%", textAlign: "center", marginTop: 18 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t("pwd_footer")}
            </Typography.Text>
          </Space>
        </Card>
      </div>
    </PartenaireDesignProvider>
  );
}
