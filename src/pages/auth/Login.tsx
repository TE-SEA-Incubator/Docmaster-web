import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";
import { authService } from "../../services/authService";

const API_BASE = import.meta.env.VITE_API_URL || "/api/";

function classNames(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function FieldInput({
  icon,
  type,
  value,
  onChange,
  placeholder,
  rightButton,
  id,
  disabled,
}: {
  icon?: string;
  type: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder: string;
  rightButton?: React.ReactNode;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className="relative flex items-center group">
        {icon && (
          <i
            className={`${icon} absolute left-3.5 text-[#c4bab0] text-[14px] pointer-events-none transition-colors group-focus-within:text-primary`}
          />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full py-3.5 pl-[42px] pr-[45px] bg-[#faf8f5] border-[1.5px] border-[#E0D5C4] rounded-[14px] font-poppins text-[15px] text-textMain outline-none transition-all focus:border-primary focus:shadow-[0_0_0_4px_rgba(245,166,75,0.15)] focus:bg-white placeholder:text-[#c4bab0] ${disabled ? "opacity-60 cursor-not-allowed bg-gray-100" : ""}`}
          required
        />
        {rightButton && (
          <div className="absolute right-3">{rightButton}</div>
        )}
      </div>
    </div>
  );
}

export default function Login() {
  const { t } = useI18n();
  const { login, loginWithGoogle, register, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<"login" | "register">("login");
  const [prefix] = useState<"m" | "d">("d");

  // Login form
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register multi-step
  const [regStep, setRegStep] = useState(1);
  const [regForm, setRegForm] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    password: "",
    passwordConfirm: "",
    pseudo: "",
    referral: "",
  });
  const [pwStrength, setPwStrength] = useState(0);
  const [pwMatch, setPwMatch] = useState<boolean | null>(null);
  const [pseudoAvailable, setPseudoAvailable] = useState<boolean | null>(null);
  const [pinValues, setPinValues] = useState(["", "", "", "", "", ""]);
  const [pinSending, setPinSending] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinMethod, setPinMethod] = useState<"SMS" | "EMAIL" | null>(null);
  const [pinTarget, setPinTarget] = useState("");
  const [pinSent, setPinSent] = useState(false);
  const [showReferral, setShowReferral] = useState(() => !!localStorage.getItem("dm_referral_code"));
  const [referralLocked, setReferralLocked] = useState(() => !!localStorage.getItem("dm_referral_locked"));
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [pwVisible, setPwVisible] = useState(false);

  // Forgot password modal
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const forgotRef = useRef<HTMLDialogElement>(null);

  const pseudoSuggestions = regForm.nom
    ? [
        `${regForm.prenom?.toLowerCase?.() ?? ""}_${regForm.nom?.toLowerCase?.() ?? ""}`,
        `${regForm.nom?.toLowerCase?.() ?? ""}${Math.floor(Math.random() * 999)}`,
        `${(regForm.prenom?.[0] ?? "").toLowerCase()}${regForm.nom?.toLowerCase?.() ?? ""}${Math.floor(Math.random() * 99)}`,
        `${regForm.prenom?.toLowerCase?.() ?? ""}.${regForm.nom?.toLowerCase?.() ?? ""}${Math.floor(Math.random() * 99)}`,
      ]
    : [];

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const stored = localStorage.getItem("dm_referral_code");
    if (stored && !searchParams.get("ref") && !searchParams.get("code") && !regForm.referral) {
      setRegForm((f) => ({ ...f, referral: stored }));
    }
  }, []);

  useEffect(() => {
    const ref = searchParams.get("ref") || searchParams.get("code");
    if (ref) {
      setRegForm((f) => ({ ...f, referral: ref }));
      setShowReferral(true);
      setReferralLocked(true);
      localStorage.setItem("dm_referral_code", ref);
      localStorage.setItem("dm_referral_locked", "true");
    }
  }, [searchParams]);

  useEffect(() => {
    if (showForgot && forgotRef.current) {
      forgotRef.current.showModal();
    }
  }, [showForgot]);

  const calcPwStrength = useCallback((pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return score;
  }, []);

  const focusPinIdx = (i: number) => {
    document.querySelector<HTMLInputElement>(`[data-pin-idx="${i}"]`)?.focus();
  };

  const handlePinInput = (idx: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    const next = [...pinValues];
    next[idx] = digit;
    setPinValues(next);
    if (idx < 5) focusPinIdx(idx + 1);
  };

  const handlePinKey = (idx: number, e: React.KeyboardEvent) => {
    if (e.key !== "Backspace") return;
    e.preventDefault();
    if (pinValues[idx]) {
      const next = [...pinValues];
      next[idx] = "";
      setPinValues(next);
    } else if (idx > 0) {
      const next = [...pinValues];
      next[idx - 1] = "";
      setPinValues(next);
      focusPinIdx(idx - 1);
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    const next = [...pinValues];
    for (let i = 0; i < digits.length && i < 6; i++) next[i] = digits[i];
    setPinValues(next);
    focusPinIdx(Math.min(digits.length, 5));
  };

  const sendVerificationAndProceed = async () => {
    setRegStep(4);
    setPinSending(true);
    setPinError("");
    setPinValues(["", "", "", "", "", ""]);
    setPinSent(false);
    try {
      const res = await authService.sendVerificationPin({
        email: regForm.email,
        telephone: regForm.telephone,
      }) as { method: "SMS" | "EMAIL"; target: string };
      setPinMethod(res.method);
      setPinTarget(res.target);
      setPinSent(true);
    } catch (err: any) {
      setPinError(err.response?.data?.error || "Erreur d'envoi du code");
    } finally {
      setPinSending(false);
    }
  };

  const handleVerifyPin = async () => {
    setPinSending(true);
    setPinError("");
    try {
      await authService.verifyEmailPin({
        email: regForm.email,
        pin: pinValues.join(""),
      });
      setRegStep(5);
    } catch (err: any) {
      setPinError(err.response?.data?.error || "Code invalide ou expiré");
    } finally {
      setPinSending(false);
    }
  };

  const handleResendPin = async () => {
    setPinSending(true);
    setPinError("");
    setPinValues(["", "", "", "", "", ""]);
    try {
      const res = await authService.sendVerificationPin({
        email: regForm.email,
        telephone: regForm.telephone,
      }) as { method: "SMS" | "EMAIL"; target: string };
      setPinMethod(res.method);
      setPinTarget(res.target);
      setPinSent(true);
    } catch (err: any) {
      setPinError(err.response?.data?.error || "Erreur d'envoi du code");
    } finally {
      setPinSending(false);
    }
  };

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
    setRegError("");
    setLoginLoading(true);
    setRegLoading(true);
    const result = await loginWithGoogle();
    setLoginLoading(false);
    setRegLoading(false);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setLoginError(result.message);
      setRegError(result.message);
    }
  };

  const handleRegister = async () => {
    setRegError("");
    setRegLoading(true);
    const result = await register({
      nom: regForm.nom,
      prenom: regForm.prenom,
      email: regForm.email,
      mot_de_passe: regForm.password,
      telephone: regForm.telephone,
      code_parrainage: regForm.referral || undefined,
    });
    setRegLoading(false);
    if (result.success) {
      localStorage.removeItem("dm_referral_code");
      localStorage.removeItem("dm_referral_locked");
      navigate("/dashboard");
    } else {
      setRegError(result.message);
    }
  };

  const canGoNext = (step: number): boolean => {
    if (step === 1) return !!(regForm.nom && regForm.prenom);
    if (step === 2) return !!(regForm.email && regForm.telephone);
    if (step === 3) return !!(regForm.password && pwStrength >= 2 && pwMatch === true);
    if (step === 4) return pinSent && pinValues.every((v) => v !== "") && !pinSending;
    return true;
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

  const renderPwBars = (pw: string) => {
    const strength = calcPwStrength(pw);
    const levels = [
      { label: t("login_pw_weak"), color: "bg-red-500", active: strength >= 1 },
      { label: t("login_pw_medium"), color: "bg-yellow-500", active: strength >= 2 },
      { label: t("login_pw_strong"), color: "bg-green-500", active: strength >= 3 },
      { label: t("login_pw_very_strong"), color: "bg-green-600", active: strength >= 4 },
    ];
    return (
      <div className="flex gap-1 mt-1.5">
        {levels.map((l, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${l.active ? l.color : "bg-black/10"}`} />
        ))}
      </div>
    );
  };

  const renderStepDots = (current: number, total: number) => {
    const dots = [];
    for (let i = 1; i <= total; i++) {
      dots.push(
        <div key={`dot-${i}`} className="flex items-center gap-0 flex-1">
          <div
            className={classNames(
              "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all z-10",
              i === current ? "bg-green-dark text-white shadow-[0_0_0_4px_rgba(30,58,47,0.12)]" : "",
              i < current ? "bg-primary text-white" : "",
              i > current ? "bg-white border-2 border-[#E0D5C4] text-gray-400" : ""
            )}
          >
            {i}
          </div>
          {i < total && (
            <div
              className={classNames(
                "flex-1 h-0.5 transition-all",
                i < current ? "bg-primary" : "bg-[#E0D5C4]"
              )}
            />
          )}
        </div>
      );
    }
    return <div className="flex items-center gap-0 mb-1">{dots}</div>;
  };

  return (
    <div className="min-h-full bg-[#F2EBD9] overflow-x-hidden relative font-poppins">
      {/* Loader */}
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
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <img
                src="/src/assets/images/docmaster.png"
                alt="DocMaster"
                className="h-9 w-auto brightness-0 invert"
              />
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
          {/* Pill Toggle */}
          <div className="relative flex bg-white/50 backdrop-blur-md border-[1.5px] border-white/80 rounded-[16px] p-1.5 shadow-sm overflow-hidden">
            <div
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-3px)] bg-primary rounded-[12px] shadow-[0_3px_12px_rgba(245,166,75,0.4)] transition-all duration-300 ease-out z-0 ${
                tab === "register" ? "translate-x-full" : "translate-x-0"
              }`}
            />
            <button
              onClick={() => setTab("login")}
              className={`relative z-10 flex-1 py-2.5 rounded-[12px] text-[14px] font-semibold transition-colors duration-200 flex items-center justify-center gap-2 ${
                tab === "login" ? "text-white" : "text-textMuted"
              }`}
            >
              <i className="fa-solid fa-right-to-bracket text-[13px]" /> {t("login_tab_login")}
            </button>
            <button
              onClick={() => setTab("register")}
              className={`relative z-10 flex-1 py-2.5 rounded-[12px] text-[14px] font-semibold transition-colors duration-200 flex items-center justify-center gap-2 ${
                tab === "register" ? "text-white" : "text-textMuted"
              }`}
            >
              <i className="fa-solid fa-user-plus text-[13px]" /> {t("login_tab_register")}
            </button>
          </div>

          {/* Login Form (Mobile) */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
              <div className="mb-1">
                <h1 className="font-bricolage text-[23px] font-extrabold text-textMain tracking-tight mb-[3px]">
                  {t("login_welcome_back")}
                </h1>
                <p className="text-[13px] text-textMuted font-medium italic">
                  {t("login_subtitle")}
                </p>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-[14px] text-red-600 text-[12px] font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation" /> {loginError}
                </div>
              )}

              <FieldInput
                icon="fa-regular fa-envelope"
                type="email"
                value={loginForm.email}
                onChange={(v) => setLoginForm((f) => ({ ...f, email: v }))}
                placeholder={t("login_email_placeholder")}
              />
              <FieldInput
                icon="fa-solid fa-lock"
                type={pwVisible ? "text" : "password"}
                value={loginForm.password}
                onChange={(v) => setLoginForm((f) => ({ ...f, password: v }))}
                placeholder={t("login_password_placeholder")}
                id="login-pw"
                rightButton={
                  <button
                    type="button"
                    onClick={() => setPwVisible(!pwVisible)}
                    className="p-1.5 text-textMuted hover:text-primary transition-colors cursor-pointer"
                  >
                    <i className={`fa-regular ${pwVisible ? "fa-eye-slash" : "fa-eye"}`} />
                  </button>
                }
              />

              <div className="text-right -mt-1">
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-[12.5px] text-primary font-semibold hover:underline"
                >
                  <i className="fa-solid fa-key mr-1.5" />
                  {t("login_forgot_password")}
                </button>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 bg-primary text-white rounded-[14px] font-bricolage text-[16px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/40 active:scale-[0.98] disabled:opacity-60"
              >
                {loginLoading ? (
                  <i className="fa-solid fa-spinner fa-spin" />
                ) : (
                  <>
                    <i className="fa-solid fa-right-to-bracket" /> {t("login_btn_login")}
                  </>
                )}
              </button>

              <div className="flex items-center gap-2.5 text-textMuted text-[11.5px] font-medium before:content-[''] before:flex-1 before:h-[1px] before:bg-black/10 after:content-[''] after:flex-1 after:h-[1px] after:bg-black/10">
                {t("login_or_continue")}
              </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loginLoading}
                    className="flex-1 py-3 bg-white/65 backdrop-blur-md border-[1.5px] border-white/90 rounded-[14px] text-[13.5px] font-semibold text-gray-700 flex items-center justify-center gap-2 shadow-sm active:scale-[0.97] transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {loginLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-brands fa-google text-[#db4437]" /> Google</>}
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-3 bg-white/65 backdrop-blur-md border-[1.5px] border-white/90 rounded-[14px] text-[13.5px] font-semibold text-gray-700 flex items-center justify-center gap-2 shadow-sm active:scale-[0.97] transition-all whitespace-nowrap"
                  >
                    <i className="fa-brands fa-apple text-[#1a1a1a]" /> Apple
                  </button>
                </div>
            </form>
          )}

          {/* Register Mobile */}
          {tab === "register" && (
            <div className="flex flex-col gap-4">
              <div className="mb-1">
                <h1 className="font-bricolage text-[23px] font-extrabold text-textMain tracking-tight mb-[3px]">
                  {t("login_create_account")}
                </h1>
                <p className="text-[13px] text-textMuted font-medium italic">
                  {t("login_register_subtitle")}
                </p>
              </div>

              {renderStepDots(regStep, 5)}

              {regError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-[14px] text-red-600 text-[12px] font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation" /> {regError}
                </div>
              )}

              {/* Step 1: Identity */}
              {regStep === 1 && (
                <div className="flex flex-col animate-fade-in-scale">
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary text-4xl shadow-lg shadow-primary/10">
                      <i className="fa-solid fa-user-astronaut animate-bounce" style={{ animationDuration: "3s" }} />
                    </div>
                  </div>
                  <div className="text-center mb-6">
                    <h3 className="font-bricolage text-[20px] font-bold text-textMain mb-1">Bienvenue !</h3>
                    <p className="text-[13px] text-textMuted">Commençons par faire connaissance.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <FieldInput icon="fa-regular fa-user" type="text" value={regForm.nom} onChange={(v) => setRegForm((f) => ({ ...f, nom: v }))} placeholder={t("profil_placeholder_lastname")} />
                    <FieldInput icon="fa-regular fa-user" type="text" value={regForm.prenom} onChange={(v) => setRegForm((f) => ({ ...f, prenom: v }))} placeholder={t("profil_placeholder_firstname")} />
                  </div>
                  <button type="button" onClick={() => setRegStep(2)} disabled={!canGoNext(1)} className="w-full py-4 bg-primary text-white rounded-[16px] font-bricolage text-[16px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/40 active:scale-[0.98] disabled:opacity-60 mt-8">
                    {t("login_btn_continue")} <i className="fa-solid fa-arrow-right" />
                  </button>
                  <div className="flex items-center gap-2.5 text-textMuted text-[11.5px] font-medium my-6 before:content-[''] before:flex-1 before:h-[1px] before:bg-black/10 after:content-[''] after:flex-1 after:h-[1px] after:bg-black/10">
                      {t("login_or_register_with")}
                  </div>
                  <div className="flex gap-2.5">
                    <button type="button" onClick={handleGoogleLogin} disabled={regLoading} className="flex-1 py-3 bg-white/65 backdrop-blur-md border-[1.5px] border-white/90 rounded-[14px] text-[13.5px] font-semibold text-gray-700 flex items-center justify-center gap-2 shadow-sm active:scale-[0.97] transition-all disabled:opacity-50">
                      {regLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-brands fa-google text-[#db4437]" />}
                    </button>
                    <button type="button" className="flex-1 py-3 bg-white/65 backdrop-blur-md border-[1.5px] border-white/90 rounded-[14px] text-[13.5px] font-semibold text-gray-700 flex items-center justify-center gap-2 shadow-sm active:scale-[0.97] transition-all">
                      <i className="fa-brands fa-facebook text-blue-500" />
                    </button>
                    <button type="button" className="flex-1 py-3 bg-white/65 backdrop-blur-md border-[1.5px] border-white/90 rounded-[14px] text-[13.5px] font-semibold text-gray-700 flex items-center justify-center gap-2 shadow-sm active:scale-[0.97] transition-all">
                      <i className="fa-brands fa-apple text-[#1a1a1a]" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Contact */}
              {regStep === 2 && (
                <div className="flex flex-col animate-fade-in-scale">
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary text-4xl shadow-lg shadow-primary/10">
                      <i className="fa-solid fa-envelope-open-text animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center mb-6">
                    <h3 className="font-bricolage text-[20px] font-bold text-textMain mb-1">Contact</h3>
                    <p className="text-[13px] text-textMuted">Comment pouvons-nous vous joindre ?</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <FieldInput icon="fa-regular fa-envelope" type="email" value={regForm.email} onChange={(v) => setRegForm((f) => ({ ...f, email: v }))} placeholder={t("login_email_placeholder")} />
                    <FieldInput icon="fa-solid fa-phone" type="tel" value={regForm.telephone} onChange={(v) => setRegForm((f) => ({ ...f, telephone: v }))} placeholder={t("profil_placeholder_phone")} />
                  </div>
                  <div className="flex gap-2.5 mt-8">
                    <button type="button" onClick={() => setRegStep(1)} className="px-5 py-4 bg-white/65 backdrop-blur-md border-[1.5px] border-white/90 rounded-[16px] text-textMain flex items-center justify-center transition-all active:scale-[0.97]">
                      <i className="fa-solid fa-arrow-left" />
                    </button>
                    <button type="button" onClick={() => setRegStep(3)} disabled={!canGoNext(2)} className="flex-1 py-4 bg-primary text-white rounded-[16px] font-bricolage text-[16px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/40 active:scale-[0.98] disabled:opacity-60">
                      {t("login_btn_continue")} <i className="fa-solid fa-arrow-right" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Security */}
              {regStep === 3 && (
                <div className="flex flex-col animate-fade-in-scale">
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary text-4xl shadow-lg shadow-primary/10">
                      <i className="fa-solid fa-shield-halved" />
                    </div>
                  </div>
                  <div className="text-center mb-6">
                    <h3 className="font-bricolage text-[20px] font-bold text-textMain mb-1">Sécurité</h3>
                    <p className="text-[13px] text-textMuted">Protégez votre compte avec un mot de passe fort.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <FieldInput icon="fa-solid fa-lock" type={pwVisible ? "text" : "password"} value={regForm.password} onChange={(v) => { setRegForm((f) => ({ ...f, password: v })); setPwStrength(calcPwStrength(v)); }} placeholder={t("reset_placeholder_password")} id="m-pw1" />
                      {regForm.password && renderPwBars(regForm.password)}
                    </div>
                    <div>
                      <FieldInput icon="fa-solid fa-lock-open" type={pwVisible ? "text" : "password"} value={regForm.passwordConfirm} onChange={(v) => { setRegForm((f) => ({ ...f, passwordConfirm: v })); setPwMatch(v === regForm.password && v.length > 0); }} placeholder={t("reset_placeholder_confirm")} id="m-pw2" />
                      {regForm.passwordConfirm && pwMatch === false && (
                        <p className="text-[12px] font-medium mt-1.5 text-red-500"><i className="fa-solid fa-circle-xmark mr-1" /> {t("login_error_pw_mismatch")}</p>
                      )}
                      {pwMatch === true && (
                        <p className="text-[12px] font-medium mt-1.5 text-green-600"><i className="fa-solid fa-circle-check mr-1" /> {t("login_success_pw_match")}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2.5 mt-8">
                    <button type="button" onClick={() => setRegStep(2)} className="px-5 py-4 bg-white/65 backdrop-blur-md border-[1.5px] border-white/90 rounded-[16px] text-textMain flex items-center justify-center transition-all active:scale-[0.97]">
                      <i className="fa-solid fa-arrow-left" />
                    </button>
                    <button type="button" onClick={sendVerificationAndProceed} disabled={!canGoNext(3) || pinSending} className="flex-1 py-4 bg-primary text-white rounded-[16px] font-bricolage text-[16px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/40 active:scale-[0.98] disabled:opacity-60">
                      {pinSending ? <i className="fa-solid fa-spinner fa-spin" /> : <>{t("login_btn_validate")} <i className="fa-solid fa-arrow-right" /></>}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: PIN */}
              {regStep === 4 && (
                <div className="flex flex-col animate-fade-in-scale">
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary text-4xl shadow-lg shadow-primary/10">
                      <i className="fa-solid fa-mobile-screen-button" />
                    </div>
                  </div>
                  <div className="text-center mb-6">
                    <h3 className="font-bricolage text-[20px] font-bold text-textMain mb-1">Vérification</h3>
                    {pinMethod === "SMS" ? (
                      <p className="text-[13px] text-textMuted">{t("login_pin_sms_sent")} <span className="font-semibold text-textMain">{pinTarget}</span></p>
                    ) : (
                      <p className="text-[13px] text-textMuted">{t("login_pin_email_sent")} <span className="font-semibold text-textMain">{pinTarget}</span></p>
                    )}
                  </div>
                  <div className="flex justify-center gap-2.5 my-2">
                    {pinValues.map((val, idx) => (
                      <input key={idx} className={`w-12 h-14 text-center text-[22px] font-bold bg-white border-2 rounded-[14px] outline-none transition-all font-poppins text-textMain ${val ? "border-green-dark bg-green-light" : "border-[#E0D5C4]"} focus:border-primary focus:shadow-[0_0_0_4px_rgba(245,166,75,0.18)]`} maxLength={1} type="text" inputMode="numeric" autoComplete="one-time-code" value={val} disabled={pinSending} onChange={(e) => handlePinInput(idx, e.target.value)} onKeyDown={(e) => handlePinKey(idx, e)} onPaste={handlePinPaste} data-pin-idx={idx} />
                    ))}
                  </div>
                  <p className="text-[12px] text-textMuted text-center mt-4">
                    {t("login_pin_not_received")} <button type="button" onClick={handleResendPin} disabled={pinSending} className="text-primary font-semibold hover:underline disabled:opacity-50">{pinSending ? <i className="fa-solid fa-spinner fa-spin" /> : t("login_pin_resend")}</button>
                  </p>
                  <div className="flex gap-2.5 mt-8">
                    <button type="button" onClick={() => setRegStep(3)} disabled={pinSending} className="px-5 py-4 bg-white/65 backdrop-blur-md border-[1.5px] border-white/90 rounded-[16px] text-textMain flex items-center justify-center transition-all active:scale-[0.97] disabled:opacity-50">
                      <i className="fa-solid fa-arrow-left" />
                    </button>
                    <button type="button" onClick={handleVerifyPin} disabled={!canGoNext(4)} className="flex-1 py-4 bg-primary text-white rounded-[16px] font-bricolage text-[16px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/40 active:scale-[0.98] disabled:opacity-60">
                      {pinSending ? <i className="fa-solid fa-spinner fa-spin" /> : <>{t("login_btn_verify")} <i className="fa-solid fa-arrow-right" /></>}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Pseudo */}
              {regStep === 5 && (
                <div className="flex flex-col animate-fade-in-scale">
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary text-4xl shadow-lg shadow-primary/10">
                      <i className="fa-solid fa-rocket animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center mb-6">
                    <h3 className="font-bricolage text-[20px] font-bold text-textMain mb-1">Dernière étape !</h3>
                    <p className="text-[13px] text-textMuted">Choisissez votre nom d'utilisateur DocMaster.</p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col">
                      <label className="text-[12px] font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                        <i className="fa-solid fa-at text-primary text-[11px]" /> {t("login_pseudo_label")}
                      </label>
                      <div className="relative flex items-center group">
                        <span className="absolute left-3.5 text-[#c4bab0] text-[14px] font-bold">@</span>
                        <input type="text" value={regForm.pseudo} onChange={(e) => setRegForm((f) => ({ ...f, pseudo: e.target.value }))} placeholder="jean_dupont42" className="w-full py-3.5 pl-7 pr-[42px] bg-[#faf8f5] border-[1.5px] border-[#E0D5C4] rounded-[14px] font-poppins text-[15px] text-textMain outline-none transition-all focus:border-primary focus:shadow-[0_0_0_4px_rgba(245,166,75,0.15)] focus:bg-white placeholder:text-[#c4bab0]" required />
                        {regForm.pseudo && (
                          <span className="absolute right-3.5 text-[14px]">
                            <i className={`fa-solid ${pseudoAvailable === true ? "fa-check-circle text-green-500" : pseudoAvailable === false ? "fa-xmark-circle text-red-500" : "fa-circle-notch fa-spin text-gray-400"}`} />
                          </span>
                        )}
                      </div>
                    </div>
                    {pseudoSuggestions.length > 0 && (
                      <div>
                        <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">{t("login_suggestions")}</p>
                        <div className="flex flex-wrap gap-2">
                          {pseudoSuggestions.map((s) => (
                            <button key={s} type="button" onClick={() => setRegForm((f) => ({ ...f, pseudo: s }))} className="px-3.5 py-2 rounded-full border-[1.5px] border-[#E0D5C4] text-[13px] font-semibold text-textMain bg-white hover:bg-green-dark hover:text-white hover:border-green-dark transition-all">@{s}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <button type="button" onClick={() => setShowReferral(!showReferral)} className="flex items-center gap-2 text-[12.5px] font-semibold text-textMuted hover:text-primary transition-colors w-fit">
                        <i className="fa-solid fa-users text-primary text-[11px]" /> {t("login_referral_question")}
                        <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${showReferral ? "rotate-180" : ""}`} />
                      </button>
                      {showReferral && (
                        <div className="flex flex-col gap-1.5 animate-fade-in-scale">
                          <FieldInput icon="fa-solid fa-link" type="text" value={regForm.referral} onChange={(v) => { setRegForm((f) => ({ ...f, referral: v })); if (!referralLocked) localStorage.setItem("dm_referral_code", v); }} disabled={referralLocked} placeholder={t("login_referral_placeholder")} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2.5 mt-8">
                    <button type="button" onClick={() => setRegStep(4)} className="px-5 py-4 bg-white/65 backdrop-blur-md border-[1.5px] border-white/90 rounded-[16px] text-textMain flex items-center justify-center transition-all active:scale-[0.97]">
                      <i className="fa-solid fa-arrow-left" />
                    </button>
                    <button type="button" onClick={handleRegister} disabled={!regForm.pseudo || regLoading} className="flex-1 py-4 bg-green-dark text-white rounded-[16px] font-bricolage text-[16px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-black/20 active:scale-[0.98] disabled:opacity-60">
                      {regLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-rocket" /> {t("login_btn_create")}</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Social proof */}
          <div className="flex flex-col gap-2 mt-2">
            {[
              { icon: "fa-solid fa-circle-check", text: t("login_proof_docs") },
              { icon: "fa-solid fa-users", text: t("login_proof_members") },
              { icon: "fa-solid fa-shield-halved", text: t("login_proof_security") },
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
          {/* LEFT PANEL */}
          <aside className="w-[300px] shrink-0 bg-green-dark p-[44px_36px] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute w-[220px] h-[220px] bg-white/[0.04] rounded-full bottom-[-70px] left-[-50px]" />
              <div className="absolute w-[160px] h-[160px] bg-white/[0.04] rounded-full top-[-40px] right-[-40px]" />
            </div>
            <div className="relative z-10">
              <Link to="/" className="flex items-center gap-2.5">
                <img
                  src="/src/assets/images/docmaster.png"
                  alt="DocMaster"
                  className="h-14 w-auto brightness-0 invert"
                />
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
                { icon: "fa-solid fa-circle-check", text: t("login_proof_docs") },
                { icon: "fa-solid fa-users", text: t("login_proof_members") },
                { icon: "fa-solid fa-shield-halved", text: t("login_proof_security") },
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

          {/* RIGHT FORM PANEL */}
          <main className="flex-1 p-[36px_24px] xl:p-[44px_48px] bg-white flex flex-col gap-[22px] justify-center overflow-y-auto">
            {/* Pill Toggle */}
            <div className="relative flex bg-[#faf8f5] border-[1.5px] border-borda rounded-[16px] p-1.5 shadow-sm overflow-hidden">
              <div
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-3px)] bg-primary rounded-[12px] shadow-[0_3px_12px_rgba(245,166,75,0.4)] transition-all duration-300 ease-out z-0 ${
                  tab === "register" ? "translate-x-full" : "translate-x-0"
                }`}
              />
              <button
                onClick={() => setTab("login")}
                className={`relative z-10 flex-1 py-1.5 rounded-[12px] text-[14px] font-semibold transition-colors duration-200 flex items-center justify-center gap-2 ${
                  tab === "login" ? "text-white" : "text-textMuted"
                }`}
              >
                <i className="fa-solid fa-right-to-bracket" /> {t("login_tab_login")}
              </button>
              <button
                onClick={() => setTab("register")}
                className={`relative z-10 flex-1 py-1.5 rounded-[12px] text-[14px] font-semibold transition-colors duration-200 flex items-center justify-center gap-2 ${
                  tab === "register" ? "text-white" : "text-textMuted"
                }`}
              >
                <i className="fa-solid fa-user-plus" /> {t("login_tab_register")}
              </button>
            </div>

            {/* LOGIN DESKTOP */}
            {tab === "login" && (
              <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
                <div className="mb-1">
                  <h1 className="font-bricolage text-[26px] font-extrabold text-textMain tracking-tight mb-[3px]">
                    {t("login_welcome_back")}
                  </h1>
                  <p className="text-[13px] text-textMuted font-medium italic">
                    {t("login_subtitle")}
                  </p>
                </div>

                {loginError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-[14px] text-red-600 text-[12px] font-semibold flex items-center gap-2">
                    <i className="fa-solid fa-circle-exclamation" /> {loginError}
                  </div>
                )}

                <FieldInput
                  icon="fa-regular fa-envelope"
                  type="email"
                  value={loginForm.email}
                  onChange={(v) => setLoginForm((f) => ({ ...f, email: v }))}
                  placeholder={t("login_email_placeholder")}
                />

                <FieldInput
                  icon="fa-solid fa-lock"
                  type={pwVisible ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(v) => setLoginForm((f) => ({ ...f, password: v }))}
                  placeholder={t("login_password_placeholder")}
                  id="dlogin-pw"
                  rightButton={
                    <button
                      type="button"
                      onClick={() => setPwVisible(!pwVisible)}
                      className="p-1.5 text-textMuted hover:text-primary transition-colors cursor-pointer"
                    >
                      <i className={`fa-regular ${pwVisible ? "fa-eye-slash" : "fa-eye"}`} />
                    </button>
                  }
                />

                <div className="text-right -mt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-[12.5px] text-primary font-semibold hover:underline"
                  >
                    <i className="fa-solid fa-key mr-1.5" />
                    {t("login_forgot_password")}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-4 bg-primary text-white rounded-[14px] font-bricolage text-[16px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/40 active:scale-[0.98] disabled:opacity-60 mt-1"
                >
                  {loginLoading ? (
                    <i className="fa-solid fa-spinner fa-spin" />
                  ) : (
                    <>
                      <i className="fa-solid fa-right-to-bracket" /> {t("login_btn_login")}
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2.5 text-textMuted text-[11.5px] font-medium before:content-[''] before:flex-1 before:h-[1px] before:bg-borda after:content-[''] after:flex-1 after:h-[1px] after:bg-borda">
                  {t("login_or_continue")}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    className="flex-1 min-w-[100px] py-3 bg-[#faf8f5] border-[1.5px] border-borda rounded-[14px] text-[11px] xl:text-[13px] font-semibold text-gray-700 flex items-center justify-center gap-2 transition-all hover:border-gray-300 hover:bg-white active:scale-[0.97] whitespace-nowrap"
                  >
                    <i className="fa-brands fa-facebook text-blue-500" /> Facebook
                  </button>
                  <button 
                    type="button" 
                    onClick={handleGoogleLogin}
                    disabled={loginLoading || regLoading}
                    className="flex-1 min-w-[100px] py-3 bg-[#faf8f5] border-[1.5px] border-borda rounded-[14px] text-[11px] xl:text-[13px] font-semibold text-gray-700 flex items-center justify-center gap-2 transition-all hover:border-gray-300 hover:bg-white active:scale-[0.97] disabled:opacity-50 whitespace-nowrap"
                  >
                    {loginLoading || regLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-brands fa-google text-[#db4437]" /> Google</>}
                  </button>
                  <button
                    type="button"
                    className="flex-1 min-w-[100px] py-3 bg-[#faf8f5] border-[1.5px] border-borda rounded-[14px] text-[11px] xl:text-[13px] font-semibold text-gray-700 flex items-center justify-center gap-2 transition-all hover:border-gray-300 hover:bg-white active:scale-[0.97] whitespace-nowrap"
                  >
                    <i className="fa-brands fa-apple text-[#1a1a1a]" /> Apple
                  </button>
                </div>
              </form>
            )}

            {/* REGISTER DESKTOP */}
            {tab === "register" && (
              <div className="flex flex-col gap-4">
                <div>
                  <h1 className="font-bricolage text-[26px] font-extrabold text-textMain tracking-tight mb-[3px]">
                    {t("login_create_account")}
                  </h1>
                  <p className="text-[13px] text-textMuted font-medium italic">
                    {t("login_register_subtitle")}
                  </p>
                </div>

                {renderStepDots(regStep, 5)}

                {regError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-[14px] text-red-600 text-[12px] font-semibold flex items-center gap-2">
                    <i className="fa-solid fa-circle-exclamation" /> {regError}
                  </div>
                )}

                {/* Step 1 Desktop */}
                {regStep === 1 && (
                  <div className="flex flex-col animate-fade-in-scale">
                    <div className="flex justify-center mb-6">
                      <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary text-4xl shadow-lg shadow-primary/10">
                        <i className="fa-solid fa-user-astronaut animate-bounce" style={{ animationDuration: "3s" }} />
                      </div>
                    </div>
                    <div className="text-center mb-6">
                      <h3 className="font-bricolage text-[22px] font-bold text-textMain mb-1">Bienvenue !</h3>
                      <p className="text-[14px] text-textMuted">Commençons par faire connaissance.</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <FieldInput icon="fa-regular fa-user" type="text" value={regForm.nom} onChange={(v) => setRegForm((f) => ({ ...f, nom: v }))} placeholder={t("profil_placeholder_lastname")} />
                      </div>
                      <div className="flex-1">
                        <FieldInput icon="fa-regular fa-user" type="text" value={regForm.prenom} onChange={(v) => setRegForm((f) => ({ ...f, prenom: v }))} placeholder={t("profil_placeholder_firstname")} />
                      </div>
                    </div>
                    <button type="button" onClick={() => setRegStep(2)} disabled={!canGoNext(1)} className="w-full py-3.5 bg-primary text-white rounded-[14px] font-bricolage text-[16px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/40 active:scale-[0.98] disabled:opacity-60 mt-6">
                      {t("login_btn_continue")} <i className="fa-solid fa-arrow-right" />
                    </button>
                    <div className="flex items-center gap-2.5 text-textMuted text-[11.5px] font-medium my-6 before:content-[''] before:flex-1 before:h-[1px] before:bg-borda after:content-[''] after:flex-1 after:h-[1px] after:bg-borda">
                      {t("login_or_register_with")}
                    </div>
                    <div className="flex gap-2.5">
                      <button type="button" onClick={handleGoogleLogin} disabled={regLoading} className="flex-1 py-3 bg-[#faf8f5] border-[1.5px] border-borda rounded-[14px] text-[13px] font-semibold text-gray-700 flex items-center justify-center gap-2 transition-all hover:border-gray-300 hover:bg-white active:scale-[0.97] disabled:opacity-50">
                        {regLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-brands fa-google text-[#db4437]" /> Google</>}
                      </button>
                      <button type="button" className="flex-1 py-3 bg-[#faf8f5] border-[1.5px] border-borda rounded-[14px] text-[13px] font-semibold text-gray-700 flex items-center justify-center gap-2 transition-all hover:border-gray-300 hover:bg-white active:scale-[0.97]">
                        <i className="fa-brands fa-facebook text-blue-500" /> Facebook
                      </button>
                      <button type="button" className="flex-1 py-3 bg-[#faf8f5] border-[1.5px] border-borda rounded-[14px] text-[13px] font-semibold text-gray-700 flex items-center justify-center gap-2 transition-all hover:border-gray-300 hover:bg-white active:scale-[0.97]">
                        <i className="fa-brands fa-apple text-[#1a1a1a]" /> Apple
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2 Desktop */}
                {regStep === 2 && (
                  <div className="flex flex-col animate-fade-in-scale">
                    <div className="flex justify-center mb-6">
                      <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary text-4xl shadow-lg shadow-primary/10">
                        <i className="fa-solid fa-envelope-open-text animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center mb-6">
                      <h3 className="font-bricolage text-[22px] font-bold text-textMain mb-1">Contact</h3>
                      <p className="text-[14px] text-textMuted">Comment pouvons-nous vous joindre ?</p>
                    </div>
                    <div className="flex flex-col gap-4">
                      <FieldInput icon="fa-regular fa-envelope" type="email" value={regForm.email} onChange={(v) => setRegForm((f) => ({ ...f, email: v }))} placeholder={t("login_email_placeholder")} />
                      <FieldInput icon="fa-solid fa-phone" type="tel" value={regForm.telephone} onChange={(v) => setRegForm((f) => ({ ...f, telephone: v }))} placeholder={t("profil_placeholder_phone")} />
                    </div>
                    <div className="flex gap-3 mt-8">
                      <button type="button" onClick={() => setRegStep(1)} className="px-6 py-3.5 bg-[#faf8f5] border-[1.5px] border-borda rounded-[14px] text-textMain flex items-center justify-center transition-all hover:bg-white active:scale-[0.97]">
                        <i className="fa-solid fa-arrow-left" />
                      </button>
                      <button type="button" onClick={() => setRegStep(3)} disabled={!canGoNext(2)} className="flex-1 py-3.5 bg-primary text-white rounded-[14px] font-bricolage text-[16px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/40 active:scale-[0.98] disabled:opacity-60">
                        {t("login_btn_continue")} <i className="fa-solid fa-arrow-right" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3 Desktop */}
                {regStep === 3 && (
                  <div className="flex flex-col animate-fade-in-scale">
                    <div className="flex justify-center mb-6">
                      <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary text-4xl shadow-lg shadow-primary/10">
                        <i className="fa-solid fa-shield-halved" />
                      </div>
                    </div>
                    <div className="text-center mb-6">
                      <h3 className="font-bricolage text-[22px] font-bold text-textMain mb-1">Sécurité</h3>
                      <p className="text-[14px] text-textMuted">Protégez votre compte avec un mot de passe fort.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div>
                        <FieldInput icon="fa-solid fa-lock" type={pwVisible ? "text" : "password"} value={regForm.password} onChange={(v) => { setRegForm((f) => ({ ...f, password: v })); setPwStrength(calcPwStrength(v)); }} placeholder={t("reset_placeholder_password")} id="d-pw1" />
                        {regForm.password && renderPwBars(regForm.password)}
                      </div>
                      <div>
                        <FieldInput icon="fa-solid fa-lock-open" type={pwVisible ? "text" : "password"} value={regForm.passwordConfirm} onChange={(v) => { setRegForm((f) => ({ ...f, passwordConfirm: v })); setPwMatch(v === regForm.password && v.length > 0); }} placeholder={t("reset_placeholder_confirm")} id="d-pw2" />
                        {regForm.passwordConfirm && pwMatch === false && (
                          <p className="text-[12px] font-medium mt-1.5 text-red-500"><i className="fa-solid fa-circle-xmark mr-1" /> Les mots de passe ne correspondent pas.</p>
                        )}
                        {pwMatch === true && (
                          <p className="text-[12px] font-medium mt-1.5 text-green-600"><i className="fa-solid fa-circle-check mr-1" /> Parfait, les mots de passe correspondent !</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                      <button type="button" onClick={() => setRegStep(2)} className="px-6 py-3.5 bg-[#faf8f5] border-[1.5px] border-borda rounded-[14px] text-textMain flex items-center justify-center transition-all hover:bg-white active:scale-[0.97]">
                        <i className="fa-solid fa-arrow-left" />
                      </button>
                      <button type="button" onClick={sendVerificationAndProceed} disabled={!canGoNext(3) || pinSending} className="flex-1 py-3.5 bg-primary text-white rounded-[14px] font-bricolage text-[16px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/40 active:scale-[0.98] disabled:opacity-60">
                        {pinSending ? <i className="fa-solid fa-spinner fa-spin" /> : <>{t("login_btn_validate")} <i className="fa-solid fa-arrow-right" /></>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4 Desktop */}
                {regStep === 4 && (
                  <div className="flex flex-col animate-fade-in-scale">
                    <div className="flex justify-center mb-6">
                      <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary text-4xl shadow-lg shadow-primary/10">
                        <i className="fa-solid fa-mobile-screen-button" />
                      </div>
                    </div>
                    <div className="text-center mb-6">
                      <h3 className="font-bricolage text-[22px] font-bold text-textMain mb-1">Vérification</h3>
                      {pinMethod === "SMS" ? (
                        <p className="text-[14px] text-textMuted">{t("login_pin_sms_sent")} <span className="font-semibold text-textMain">{pinTarget}</span></p>
                      ) : (
                        <p className="text-[14px] text-textMuted">{t("login_pin_email_sent")} <span className="font-semibold text-textMain">{pinTarget}</span></p>
                      )}
                    </div>
                    <div className="flex justify-center gap-3 my-2">
                      {pinValues.map((val, idx) => (
                        <input key={idx} className={`w-12 h-14 text-center text-[22px] font-bold bg-white border-2 rounded-[14px] outline-none transition-all font-poppins text-textMain ${val ? "border-green-dark bg-green-light" : "border-[#E0D5C4]"} focus:border-primary focus:shadow-[0_0_0_4px_rgba(245,166,75,0.18)]`} maxLength={1} type="text" inputMode="numeric" autoComplete="one-time-code" value={val} disabled={pinSending} onChange={(e) => handlePinInput(idx, e.target.value)} onKeyDown={(e) => handlePinKey(idx, e)} onPaste={handlePinPaste} data-pin-idx={idx} />
                      ))}
                    </div>
                    <p className="text-[12px] text-textMuted text-center mt-4">
                      {t("login_pin_not_received")} <button type="button" onClick={handleResendPin} disabled={pinSending} className="text-primary font-semibold hover:underline disabled:opacity-50">{pinSending ? <i className="fa-solid fa-spinner fa-spin" /> : t("login_pin_resend")}</button>
                    </p>
                    <div className="flex gap-3 mt-8">
                      <button type="button" onClick={() => setRegStep(3)} disabled={pinSending} className="px-6 py-3.5 bg-[#faf8f5] border-[1.5px] border-borda rounded-[14px] text-textMain flex items-center justify-center transition-all hover:bg-white active:scale-[0.97] disabled:opacity-50">
                        <i className="fa-solid fa-arrow-left" />
                      </button>
                      <button type="button" onClick={handleVerifyPin} disabled={!canGoNext(4)} className="flex-1 py-3.5 bg-primary text-white rounded-[14px] font-bricolage text-[16px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/40 active:scale-[0.98] disabled:opacity-60">
                        {pinSending ? <i className="fa-solid fa-spinner fa-spin" /> : <>{t("login_btn_verify")} <i className="fa-solid fa-arrow-right" /></>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 5 Desktop */}
                {regStep === 5 && (
                  <div className="flex flex-col animate-fade-in-scale">
                    <div className="flex justify-center mb-6">
                      <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary text-4xl shadow-lg shadow-primary/10">
                        <i className="fa-solid fa-rocket animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center mb-6">
                      <h3 className="font-bricolage text-[22px] font-bold text-textMain mb-1">Dernière étape !</h3>
                      <p className="text-[14px] text-textMuted">Choisissez votre nom d'utilisateur DocMaster.</p>
                    </div>
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col">
                        <label className="text-[12px] font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                          <i className="fa-solid fa-at text-primary text-[11px]" /> {t("login_pseudo_label")}
                        </label>
                        <div className="relative flex items-center group">
                          <span className="absolute left-3.5 text-[#c4bab0] text-[14px] font-bold">@</span>
                          <input type="text" value={regForm.pseudo} onChange={(e) => setRegForm((f) => ({ ...f, pseudo: e.target.value }))} placeholder="jean_dupont42" className="w-full py-3.5 pl-7 pr-[42px] bg-[#faf8f5] border-[1.5px] border-[#E0D5C4] rounded-[14px] font-poppins text-[15px] text-textMain outline-none transition-all focus:border-primary focus:shadow-[0_0_0_4px_rgba(245,166,75,0.15)] focus:bg-white placeholder:text-[#c4bab0]" required />
                          {regForm.pseudo && (
                            <span className="absolute right-3.5 text-[14px]">
                              <i className={`fa-solid ${pseudoAvailable === true ? "fa-check-circle text-green-500" : pseudoAvailable === false ? "fa-xmark-circle text-red-500" : "fa-circle-notch fa-spin text-gray-400"}`} />
                            </span>
                          )}
                        </div>
                      </div>
                      {pseudoSuggestions.length > 0 && (
                        <div>
                          <p className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2">{t("login_suggestions")}</p>
                          <div className="flex flex-wrap gap-2">
                            {pseudoSuggestions.map((s) => (
                              <button key={s} type="button" onClick={() => setRegForm((f) => ({ ...f, pseudo: s }))} className="px-3.5 py-2 rounded-full border-[1.5px] border-[#E0D5C4] text-[13px] font-semibold text-textMain bg-white hover:bg-green-dark hover:text-white hover:border-green-dark transition-all">@{s}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <button type="button" onClick={() => setShowReferral(!showReferral)} className="flex items-center gap-2 text-[12.5px] font-semibold text-textMuted hover:text-primary transition-colors w-fit">
                          <i className="fa-solid fa-users text-primary text-[11px]" /> {t("login_referral_question")}
                          <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${showReferral ? "rotate-180" : ""}`} />
                        </button>
                        {showReferral && (
                          <div className="flex flex-col gap-1.5 animate-fade-in-scale">
                            <FieldInput icon="fa-solid fa-link" type="text" value={regForm.referral} onChange={(v) => { setRegForm((f) => ({ ...f, referral: v })); if (!referralLocked) localStorage.setItem("dm_referral_code", v); }} disabled={referralLocked} placeholder={t("login_referral_placeholder")} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                      <button type="button" onClick={() => setRegStep(4)} className="px-6 py-3.5 bg-[#faf8f5] border-[1.5px] border-borda rounded-[14px] text-textMain flex items-center justify-center transition-all hover:bg-white active:scale-[0.97]">
                        <i className="fa-solid fa-arrow-left" />
                      </button>
                      <button type="button" onClick={handleRegister} disabled={!regForm.pseudo || regLoading} className="flex-1 py-3.5 bg-green-dark text-white rounded-[14px] font-bricolage text-[16px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-black/20 active:scale-[0.98] disabled:opacity-60">
                        {regLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-rocket" /> {t("login_btn_create")}</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ═══ FORGOT PASSWORD MODAL ═══ */}
      <dialog ref={forgotRef} className="modal modal-bottom sm:modal-middle bg-transparent open:flex open:items-center open:justify-center">
        <div className="bg-white rounded-[32px] p-8 max-w-md w-full mx-4 relative overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

          <button onClick={() => { setShowForgot(false); forgotRef.current?.close(); }}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors z-20 cursor-pointer">
            <i className="fa-solid fa-xmark text-xl" />
          </button>

          <div className="flex flex-col gap-6 relative z-10">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-3xl">
              <i className="fa-solid fa-key" />
            </div>

            <div className="space-y-2">
              <h3 className="font-bricolage text-3xl font-extrabold tracking-tight text-gray-900">{t("forgot_title")}</h3>
              <p className="text-gray-500 leading-relaxed text-[15px]">{t("forgot_desc")}</p>
            </div>

            {forgotSent ? (
              <div className="flex flex-col items-center gap-4 text-center py-2">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-500 text-3xl">
                  <i className="fa-solid fa-envelope-circle-check" />
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
                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-textMuted uppercase tracking-wider ml-1 mb-1.5">{t("forgot_email_label")}</label>
                  <FieldInput icon="fa-regular fa-envelope" type="email" value={forgotEmail} onChange={setForgotEmail} placeholder={t("login_email_placeholder")} />
                </div>
                <button type="submit" disabled={forgotLoading || !forgotEmail}
                  className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-base shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {forgotLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-paper-plane" /> {t("forgot_btn")}</>}
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
        .blob-4 { width: 130px; height: 130px; background: #F5A64B; bottom: 30px; right: 20px; border-radius: 50%; opacity: 0.75; }
        .blob-5 { width: 100px; height: 90px; background: #E8B89A; top: 50%; left: 10px; transform: translateY(-50%); opacity: 0.45; border-radius: 55% 45% 50% 50%; }
        @keyframes fadeOut { to { opacity: 0; pointer-events: none; } }
        .modal::backdrop { background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); }
      `}</style>
    </div>
  );
}
