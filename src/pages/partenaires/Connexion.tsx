import { useState } from "react";
import { Button, Card, Form, Input, Typography, Alert, Space } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useNavigate, Link } from "react-router-dom";
import { usePartenaire } from "../../context/PartenaireContext";
import { useI18n } from "../../context/I18nContext";
import { partenairePalette } from "../../theme/partenaires";
import PartenaireDesignProvider from "../../components/partenaires/PartenaireDesignProvider";
import PartenaireBrandLogo from "../../components/partenaires/PartenaireBrandLogo";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";

export default function PartenaireConnexion() {
  const { login } = usePartenaire();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onFinish = async (values: { email: string; mot_de_passe: string }) => {
    setLoading(true);
    setError("");
    try {
      const partenaire = await login(values.email, values.mot_de_passe);
      if (partenaire.must_change_password) {
        navigate("/partenaire/changement-mot-de-passe", { replace: true });
      } else {
        navigate("/partenaire/dashboard", { replace: true });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || t("partenaire_login_error_default"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PartenaireDesignProvider>
      <div
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          overflow: "hidden",
          backgroundColor: partenairePalette.greenDark,
        }}
      >
        {/* ── Illustration vectorielle de fond ── */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
        >
          <defs>
            <pattern id="dm-partner-dots" width="38" height="38" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="#FFFFFF" opacity="0.055" />
            </pattern>
            <linearGradient id="dm-partner-wave" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={partenairePalette.greenMid} />
              <stop offset="0.5" stopColor={partenairePalette.primary} />
              <stop offset="1" stopColor={partenairePalette.greenMid} />
            </linearGradient>
          </defs>

          <rect width="1440" height="900" fill="url(#dm-partner-dots)" />

          {/* halo central */}
          <circle cx="720" cy="450" r="460" fill={partenairePalette.primary} opacity="0.06" />

          {/* bâtiment / enseigne partenariat */}
          <g fill="none" stroke={partenairePalette.primary} strokeOpacity="0.35" strokeWidth="3">
            <path d="M 280 160 L 330 130 L 380 160 L 380 280 L 280 280 Z" />
            <path d="M 305 195 L 355 195 M 305 220 L 355 220 M 305 245 L 355 245" strokeOpacity="0.45" />
          </g>

          {/* documents plies */}
          <g fill={partenairePalette.primary} fillOpacity="0.18">
            <path d="M 1100 180 L 1180 180 L 1180 260 L 1100 260 Z" stroke={partenairePalette.primary} strokeOpacity="0.3" strokeWidth="2" fillOpacity="0.06" />
            <path d="M 1180 180 L 1210 210 L 1180 210 Z" />
            <path d="M 1116 210 L 1164 210 M 1116 228 L 1164 228 M 1116 246 L 1144 246" stroke={partenairePalette.primary} strokeOpacity="0.3" strokeWidth="2" />
          </g>
          <g fill={partenairePalette.primary} fillOpacity="0.14">
            <path d="M 1010 260 L 1074 260 L 1074 324 L 1010 324 Z" stroke={partenairePalette.primary} strokeOpacity="0.25" strokeWidth="2" fillOpacity="0.05" />
            <path d="M 1074 260 L 1096 282 L 1074 282 Z" />
          </g>

          {/* onde inferieure */}
          <path
            d="M 0 760 C 240 700 420 820 720 770 C 1020 720 1200 840 1440 770 L 1440 900 L 0 900 Z"
            fill="url(#dm-partner-wave)"
            opacity="0.14"
          />
        </svg>

        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 2 }}>
          <LanguageSwitcher onDark accentColor={partenairePalette.primary} />
        </div>

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
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ marginBottom: 16 }}>
              <PartenaireBrandLogo />
            </div>
            <Typography.Text style={{ color: partenairePalette.textMuted, fontSize: 13 }}>
              {t("partenaire_login_title")}
            </Typography.Text>
          </div>

          {error && (
            <Alert type="error" message={error} showIcon style={{ marginBottom: 18 }} closable onClose={() => setError("")} />
          )}

          <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
            <Form.Item
              name="email"
              label={t("portal_email_label")}
              rules={[
                { required: true, message: t("portal_email_required") },
                { type: "email", message: t("portal_email_invalid") },
              ]}
            >
              <Input prefix={<MailOutlined style={{ color: partenairePalette.textMuted }} />} placeholder="organisation@exemple.cm" />
            </Form.Item>

            <Form.Item
              name="mot_de_passe"
              label={t("portal_password_label")}
              rules={[{ required: true, message: t("portal_password_required") }]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: partenairePalette.textMuted }} />} placeholder="••••••••" />
            </Form.Item>

            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 46, fontWeight: 600 }}>
              {t("portal_submit")}
            </Button>
          </Form>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Link to="/partenaire/mot-de-passe-oublie" style={{ fontSize: 13, color: partenairePalette.primaryDark, fontWeight: 500 }}>
              {t("portal_forgot_link")}
            </Link>
          </div>

          <Space direction="vertical" size={4} style={{ width: "100%", textAlign: "center", marginTop: 20 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t("partenaire_login_footer_access")}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t("portal_temp_password_footer")}
            </Typography.Text>
          </Space>
        </Card>
      </div>
    </PartenaireDesignProvider>
  );
}
