import { useState } from "react";
import { Button, Card, Form, Input, Typography, Alert, Result } from "antd";
import { LockOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { partenairesService } from "../../services/partenairesService";
import { partenairePalette } from "../../theme/partenaires";
import PartenaireDesignProvider from "../../components/partenaires/PartenaireDesignProvider";
import PartenaireBrandLogo from "../../components/partenaires/PartenaireBrandLogo";
import PortalAuthBackground from "../../components/ui/PortalAuthBackground";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";

export default function PartenaireReinitialisationMotDePasse() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const onFinish = async (values: { nouveau_mot_de_passe: string }) => {
    setLoading(true);
    setError("");
    try {
      await partenairesService.resetPassword(token, values.nouveau_mot_de_passe);
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || t("portal_reset_error_default"));
    } finally {
      setLoading(false);
    }
  };

  const card = (content: React.ReactNode) => (
    <Card
      style={{
        width: 420,
        maxWidth: "100%",
        boxShadow: "0 12px 40px rgba(18, 52, 60, 0.22)",
        position: "relative",
        zIndex: 1,
        borderRadius: 10,
        border: `1px solid ${partenairePalette.border}`,
      }}
      styles={{ body: { padding: 36 } }}
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <PartenaireBrandLogo />
        </div>
        <Typography.Text style={{ color: partenairePalette.textMuted, fontSize: 13 }}>
          {t("partenaire_login_title")}
        </Typography.Text>
      </div>
      {content}
    </Card>
  );

  const switcher = (
    <div style={{ position: "absolute", top: 16, right: 16, zIndex: 2 }}>
      <LanguageSwitcher onDark accentColor={partenairePalette.primary} />
    </div>
  );

  if (!token && !done) {
    return (
      <PartenaireDesignProvider>
        <PortalAuthBackground palette={partenairePalette} variant="building" background={partenairePalette.greenDark}>
          {switcher}
          {card(
            <Result
              status="error"
              title={t("portal_reset_invalid_title")}
              subTitle={t("portal_reset_invalid_desc")}
              extra={[
                <Button
                  key="retry"
                  type="primary"
                  block
                  onClick={() => navigate("/partenaire/mot-de-passe-oublie")}
                  style={{ height: 44, fontWeight: 600 }}
                >
                  {t("portal_reset_request_new")}
                </Button>,
              ]}
            />
          )}
        </PortalAuthBackground>
      </PartenaireDesignProvider>
    );
  }

  if (done) {
    return (
      <PartenaireDesignProvider>
        <PortalAuthBackground palette={partenairePalette} variant="building" background={partenairePalette.greenDark}>
          {switcher}
          {card(
            <Result
              status="success"
              title={t("portal_reset_success_title")}
              subTitle={t("portal_reset_success_desc")}
              extra={[
                <Button
                  key="login"
                  type="primary"
                  block
                  onClick={() => navigate("/partenaire/connexion")}
                  style={{ height: 44, fontWeight: 600 }}
                >
                  {t("portal_login_now")}
                </Button>,
              ]}
            />
          )}
        </PortalAuthBackground>
      </PartenaireDesignProvider>
    );
  }

  return (
    <PartenaireDesignProvider>
      <PortalAuthBackground palette={partenairePalette} variant="building" background={partenairePalette.greenDark}>
        {switcher}
        {card(
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <Typography.Title level={4} style={{ margin: 0, color: partenairePalette.greenDark }}>
                {t("portal_reset_title")}
              </Typography.Title>
              <Typography.Text type="secondary" style={{ display: "block", marginTop: 6, fontSize: 13 }}>
                {t("portal_reset_desc")}
              </Typography.Text>
            </div>

            {error && (
              <Alert type="error" message={error} showIcon style={{ marginBottom: 18 }} closable onClose={() => setError("")} />
            )}

            <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
              <Form.Item
                name="nouveau_mot_de_passe"
                label={t("portal_reset_new_label")}
                rules={[
                  { required: true, message: t("portal_reset_new_required") },
                  { min: 8, message: t("portal_reset_min_message") },
                ]}
                extra={t("portal_reset_min_extra")}
              >
                <Input.Password prefix={<LockOutlined style={{ color: partenairePalette.textMuted }} />} placeholder="••••••••" />
              </Form.Item>

              <Form.Item
                name="confirmation"
                label={t("portal_reset_confirm_label")}
                dependencies={["nouveau_mot_de_passe"]}
                rules={[
                  { required: true, message: t("portal_reset_confirm_required") },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("nouveau_mot_de_passe") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error(t("portal_reset_mismatch")));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: partenairePalette.textMuted }} />} placeholder="••••••••" />
              </Form.Item>

              <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 46, fontWeight: 600 }}>
                {t("portal_reset_submit")}
              </Button>
            </Form>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <Link to="/partenaire/connexion" style={{ fontSize: 13, color: partenairePalette.primaryDark, fontWeight: 500 }}>
                <ArrowLeftOutlined style={{ marginRight: 6 }} />
                {t("portal_forgot_back_login")}
              </Link>
            </div>
          </>
        )}
      </PortalAuthBackground>
    </PartenaireDesignProvider>
  );
}
