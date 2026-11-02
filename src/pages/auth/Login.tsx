import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Alert } from "@mantine/core";
import { InputTooltip } from "../../components/auth/InputTooltip";
import { GoogleButton, FacebookButton } from "../../components/auth/SocialButtons/SocialButtons";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";
import { useGoogleOneTap } from "../../hooks/useGoogleOneTap";
import { postAuthRedirect } from "../../utils/postAuthRedirect";

const API_BASE = import.meta.env.VITE_API_URL || "/api/";

export default function Login() {
  const { t } = useI18n();
  const { login, loginWithGoogle, user } = useAuth();
  useGoogleOneTap();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const loginRedirect = postAuthRedirect(location, searchParams);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const forgotRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (user) {
      navigate(loginRedirect, { replace: true });
    }
  }, [user, navigate, loginRedirect]);

  useEffect(() => {
    if (showForgot && forgotRef.current) {
      forgotRef.current.showModal();
    }
  }, [showForgot]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const result = await login(loginForm.email, loginForm.password);
    setLoginLoading(false);
    if (!result.success) {
      setLoginError(result.message);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError("");
    setLoginLoading(true);
    const result = await loginWithGoogle();
    setLoginLoading(false);
    if (result.success) {
      navigate(loginRedirect, { replace: true });
    } else {
      setLoginError(result.message);
    }
  };

  const renderBlobs = () => (
    <>
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="blob blob-4" />
      <div className="blob blob-5" />
    </>
  );

  return (
    <div className="min-h-full bg-[#F2EBD9] overflow-x-hidden relative font-poppins">
      <div
        id="page-loader"
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#F4EFE6]"
        style={{ animation: "fadeOut 0.5s 0.3s forwards" }}
      >
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>

      {renderBlobs()}

      <div className="relative z-10 min-h-screen flex flex-col md:flex-row md:items-center md:justify-center p-0 md:p-10">
        {/* ═══ MOBILE HEADER ═══ */}
        <div className="p-[48px_28px_32px] md:hidden">
          <div className="flex items-center gap-2.5 mb-5">
            <Link to="/" className="flex items-center gap-0 flex-shrink-0">
              <img
                src="/src/assets/images/docmaster.png"
                alt="DocMaster"
                className="h-9 w-auto"
              />
              <span className="font-poppins font-bold text-green-dark text-[18px] leading-none tracking-tight">ocmaster</span>
            </Link>
          </div>
          <h2 className="font-bricolage text-[28px] font-extrabold text-textMain leading-[1.2] tracking-tight mb-1.5">
            {t("login_hero_title")}
          </h2>
          <p className="text-[13.5px] text-textMuted leading-[1.55] font-medium">
            {t("login_hero_subtitle")}
          </p>
        </div>

        {/* ═══ MOBILE FORM AREA ═══ */}
        <div className="flex-1 p-[0_28px_48px] flex flex-col gap-5 md:hidden">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="mb-1">
              <h1 className="font-bricolage text-[23px] font-extrabold text-textMain tracking-tight mb-[3px]">
                {t("login_welcome_back")}
              </h1>
              <p className="text-[13px] text-textMuted font-medium italic">
                {t("login_subtitle")}
              </p>
            </div>

            {loginError && (
              <Alert variant="light" color="red" icon={<i className="ph ph-warning-circle" />} px="md" py="sm">
                {loginError}
              </Alert>
            )}

            <InputTooltip
              type="text"
              value={loginForm.email}
              onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
              placeholder={t("login_email_placeholder")}
              leftSection={<i className="ph ph-envelope" />}
              size="lg"
              radius="lg"
              required
              tooltipLabel={t("login_email_tooltip")}
            />

            <InputTooltip
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={t("login_password_placeholder")}
              leftSection={<i className="ph ph-lock" />}
              size="lg"
              radius="lg"
              required
              tooltipLabel={t("login_password_tooltip")}
            />

            <div className="text-right -mt-1">
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-[12.5px] text-primary font-semibold hover:underline cursor-pointer"
              >
                <i className="ph ph-key mr-1.5" />
                {t("login_forgot_password")}
              </button>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-primary text-white rounded-[14px] font-bricolage text-[16px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/40 active:scale-[0.98] disabled:opacity-60"
            >
              {loginLoading ? (
                <i className="ph ph-spinner animate-spin" />
              ) : (
                <><i className="ph ph-sign-in" /> {t("login_btn_login")}</>
              )}
            </button>

            <div className="flex items-center gap-2.5 text-textMuted text-[11.5px] font-medium before:content-[''] before:flex-1 before:h-[1px] before:bg-black/10 after:content-[''] after:flex-1 after:h-[1px] after:bg-black/10">
              {t("login_or_continue")}
            </div>
            <div className="flex flex-col gap-2">
              <GoogleButton onClick={handleGoogleLogin} disabled={loginLoading} fullWidth>Google</GoogleButton>
              <FacebookButton fullWidth>Facebook</FacebookButton>
            </div>

            <p className="text-center text-[12px] text-textMuted mt-2">
              {t("login_no_account")}{" "}
              <Link to="/inscription" className="text-primary font-bold hover:underline">
                {t("login_tab_register")}
              </Link>
            </p>
          </form>

          <div className="flex flex-col gap-2 mt-2">
            {[
              { icon: "ph ph-check-circle", text: t("login_proof_docs") },
              { icon: "ph ph-users", text: t("login_proof_members") },
              { icon: "ph ph-shield", text: t("login_proof_security") },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-2.5 py-2.5 px-3.5 bg-white/45 backdrop-blur-md border-white/70 border rounded-[12px]"
              >
                <i className={`${item.icon} text-primary text-[13px] w-3.5 text-center`} />
                <span className="text-[12px] text-gray-700 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ DESKTOP CARD ═══ */}
        <div className="hidden md:flex w-full max-w-[980px] min-h-[500px] xl:min-h-[580px] max-h-[calc(100vh-5rem)] bg-white rounded-[24px] shadow-2xl shadow-black/10 overflow-hidden relative z-20">
          <aside className="w-[300px] shrink-0 bg-green-dark p-[44px_36px] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute w-[220px] h-[220px] bg-white/[0.04] rounded-full bottom-[-70px] left-[-50px]" />
              <div className="absolute w-[160px] h-[160px] bg-white/[0.04] rounded-full top-[-40px] right-[-40px]" />
            </div>
            <div className="relative z-10">
              <Link to="/" className="flex items-center gap-0">
                <img
                  src="/src/assets/images/docmaster.png"
                  alt="DocMaster"
                  className="h-14 w-auto brightness-0 invert"
                />
                <span className="font-poppins font-bold text-white text-[29px] leading-none tracking-tight">ocmaster</span>
              </Link>
            </div>
            <div className="relative z-10">
              <h2 className="font-bricolage text-[26px] font-extrabold text-white leading-[1.25] mb-3 tracking-tight">
                {t("login_hero_title")}
              </h2>
              <p className="text-[13.5px] text-white/60 leading-[1.6]">
                {t("login_desktop_hero_desc")}
              </p>
            </div>
            <div className="flex flex-col gap-2.5 relative z-10">
              {[
                { icon: "ph ph-check-circle", text: t("login_proof_docs") },
                { icon: "ph ph-users", text: t("login_proof_members") },
                { icon: "ph ph-shield", text: t("login_proof_security") },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2.5 py-2.5 px-3.5 bg-white/5 border-white/10 border rounded-[12px]"
                >
                  <i className={`${item.icon} text-primary text-[13px] w-3.5 text-center`} />
                  <span className="text-[12px] text-white/80 font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </aside>

          <main className="flex-1 p-[36px_24px] xl:p-[44px_48px] bg-white flex flex-col gap-5 justify-center overflow-y-auto">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="mb-1">
                <h1 className="font-bricolage text-[26px] font-extrabold text-textMain tracking-tight mb-[3px]">
                  {t("login_welcome_back")}
                </h1>
                <p className="text-[13px] text-textMuted font-medium italic">
                  {t("login_subtitle")}
                </p>
              </div>

              {loginError && (
                <Alert variant="light" color="red" icon={<i className="ph ph-warning-circle" />} px="md" py="sm">
                  {loginError}
                </Alert>
              )}

              <InputTooltip
                type="text"
                value={loginForm.email}
                onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                placeholder={t("login_email_placeholder")}
                leftSection={<i className="ph ph-envelope" />}
                size="lg"
                radius="lg"
                required
                tooltipLabel={t("login_email_tooltip")}
              />

              <InputTooltip
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={t("login_password_placeholder")}
                leftSection={<i className="ph ph-lock" />}
                size="lg"
                radius="lg"
                required
                tooltipLabel={t("login_password_tooltip")}
              />

              <div className="text-right -mt-1">
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-[12.5px] text-primary font-semibold hover:underline cursor-pointer"
                >
                  <i className="ph ph-key mr-1.5" />
                  {t("login_forgot_password")}
                </button>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-4 bg-primary text-white rounded-[14px] font-bricolage text-[16px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/40 active:scale-[0.98] disabled:opacity-60 mt-1"
              >
                {loginLoading ? (
                  <i className="ph ph-spinner animate-spin" />
                ) : (
                  <><i className="ph ph-sign-in" /> {t("login_btn_login")}</>
                )}
              </button>

              <div className="flex items-center gap-2.5 text-textMuted text-[11.5px] font-medium before:content-[''] before:flex-1 before:h-[1px] before:bg-borda after:content-[''] after:flex-1 after:h-[1px] after:bg-borda">
                {t("login_or_continue")}
              </div>
              <div className="flex flex-col gap-2">
                <GoogleButton onClick={handleGoogleLogin} disabled={loginLoading} fullWidth>Google</GoogleButton>
                <FacebookButton fullWidth>Facebook</FacebookButton>
              </div>

              <p className="text-center text-[13px] text-textMuted mt-2">
                {t("login_no_account")}{" "}
                <Link to="/inscription" className="text-primary font-bold hover:underline">
                  {t("login_tab_register")}
                </Link>
              </p>
            </form>
          </main>
        </div>
      </div>

      {/* ═══ FORGOT PASSWORD MODAL ═══ */}
      <dialog ref={forgotRef} className="forgot-dialog fixed inset-0 z-50 w-full h-full bg-transparent open:flex open:items-end md:open:items-center open:justify-center">
        <div className="bg-white rounded-t-[32px] md:rounded-[32px] p-8 max-w-md w-full md:max-w-md md:mx-4 md:mb-0 relative overflow-hidden shadow-2xl sheet-up">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 h-1.5 w-12 rounded-full bg-black/10 md:hidden" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

          <button onClick={() => { setShowForgot(false); forgotRef.current?.close(); }}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors z-20 cursor-pointer">
            <i className="ph ph-x text-xl" />
          </button>

          <div className="flex flex-col gap-6 relative z-10">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-3xl">
              <i className="ph ph-key" />
            </div>

            <div className="space-y-2">
              <h3 className="font-bricolage text-3xl font-extrabold tracking-tight text-gray-900">{t("forgot_title")}</h3>
              <p className="text-gray-500 leading-relaxed text-[15px]">{t("forgot_desc")}</p>
            </div>

            {forgotSent ? (
              <div className="flex flex-col items-center gap-4 text-center py-2">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-500 text-3xl">
                  <i className="ph ph-envelope-simple" />
                </div>
                <p className="text-gray-700 font-semibold">{t("forgot_sent_title")}</p>
                <p className="text-gray-400 text-sm">{t("forgot_sent_desc")}</p>
                <button onClick={() => { setShowForgot(false); forgotRef.current?.close(); setForgotSent(false); }}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all">
                  {t("forgot_close")}
                </button>
              </div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!forgotEmail) return;
                setForgotLoading(true);
                try {
                  await fetch(`${API_BASE}auth/forgot-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: forgotEmail }),
                  });
                  setForgotSent(true);
                } catch {
                  // ignore
                } finally {
                  setForgotLoading(false);
                }
              }} className="flex flex-col gap-4">
              <InputTooltip
                type="text"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder={t("login_email_placeholder")}
                leftSection={<i className="ph ph-envelope" />}
                size="lg"
                radius="lg"
                required
                label={<span className="text-[11px] font-bold text-textMuted uppercase tracking-wider">{t("forgot_email_label")}</span>}
                tooltipLabel={t("login_email_tooltip")}
              />
                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail}
                  className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-base shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {forgotLoading ? <i className="ph ph-spinner animate-spin" /> : <><i className="ph ph-paper-plane" /> {t("forgot_btn")}</>}
                </button>
              </form>
            )}
          </div>
        </div>
        <form method="dialog" className="fixed inset-0 bg-black/40 backdrop-blur-sm -z-10">
          <button className="cursor-default outline-none w-full h-full" onClick={() => { setShowForgot(false); }} />
        </form>
      </dialog>

      <style>{`
        .blob { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; }
        .blob-1 { width: 260px; height: 240px; background: #A8CBAF; top: -60px; right: -40px; opacity: 0.7; border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; }
        .blob-2 { width: 130px; height: 120px; background: #E8B89A; top: 10px; right: 200px; opacity: 0.6; border-radius: 50% 60% 40% 55% / 55% 45% 60% 40%; }
        .blob-3 { width: 200px; height: 190px; background: #A8CBAF; bottom: -40px; left: -50px; opacity: 0.6; border-radius: 45% 55% 60% 40% / 60% 40% 55% 45%; }
        .blob-4 { width: 130px; height: 130px; background: #E8923A; bottom: 30px; right: 20px; border-radius: 50%; opacity: 0.75; }
        .blob-5 { width: 100px; height: 90px; background: #E8B89A; top: 50%; left: 10px; transform: translateY(-50%); opacity: 0.45; border-radius: 55% 45% 50% 50%; }
        @keyframes fadeOut { to { opacity: 0; pointer-events: none; } }
        .modal::backdrop { background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .forgot-dialog[open] .sheet-up { animation: sheetUp .35s cubic-bezier(.32,.72,0,1); }
      `}</style>
    </div>
  );
}
