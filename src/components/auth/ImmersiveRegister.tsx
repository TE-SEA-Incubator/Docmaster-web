import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Anchor, Button, Paper, Text, Title, TextInput, PasswordInput, Alert, Group, Loader } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleButton, FacebookButton } from "./SocialButtons/SocialButtons";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../context/I18nContext";
import { useGoogleOneTap } from "../../hooks/useGoogleOneTap";
import { authService } from "../../services/authService";
import {
  registerSchema,
  registerDefaultValues,
  registerStepFields,
  type RegisterFormValues,
} from "../../types/register";
import styles from "./ImmersiveRegister.module.css";
import DocMascot from "./Docmascot";
import bgLang from "../../assets/images/login.jpg";

const TOTAL_STEPS = 6;

function localIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toIsoDate(value: string | Date | null): string {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return localIsoDate(value);
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : String(value);
}

export default function ImmersiveRegister() {
  const { t, lang, setLanguage } = useI18n();
  const { register, loginWithGoogle } = useAuth();
  useGoogleOneTap();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [langStep, setLangStep] = useState(true);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const {
    register: registerField,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: registerDefaultValues,
  });
  const form = watch();
  const [pinValues, setPinValues] = useState(["", "", "", "", "", ""]);
  const [pinSending, setPinSending] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinMethod, setPinMethod] = useState<"SMS" | "EMAIL" | null>(null);
  const [pinTarget, setPinTarget] = useState("");
  const [pinSent, setPinSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [showReferral, setShowReferral] = useState(() => !!localStorage.getItem("dm_referral_code"));
  const [referralLocked, setReferralLocked] = useState(() => !!localStorage.getItem("dm_referral_locked"));
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pseudoSuggestions = form.nom
    ? [
        `${form.prenom?.toLowerCase?.() ?? ""}_${form.nom?.toLowerCase?.() ?? ""}`,
        `${form.nom?.toLowerCase?.() ?? ""}${Math.floor(Math.random() * 999)}`,
        `${(form.prenom?.[0] ?? "").toLowerCase()}${form.nom?.toLowerCase?.() ?? ""}${Math.floor(Math.random() * 99)}`,
        `${form.prenom?.toLowerCase?.() ?? ""}.${form.nom?.toLowerCase?.() ?? ""}${Math.floor(Math.random() * 99)}`,
      ]
    : [];

  useEffect(() => {
    const stored = localStorage.getItem("dm_referral_code");
    if (stored && !searchParams.get("ref") && !searchParams.get("code") && !form.referral) {
      setValue("referral", stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ref = searchParams.get("ref") || searchParams.get("code");
    if (ref) {
      setValue("referral", ref);
      setShowReferral(true);
      setReferralLocked(true);
      localStorage.setItem("dm_referral_code", ref);
      localStorage.setItem("dm_referral_locked", "true");
    }
  }, [searchParams]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (!resendSuccess) return;
    const t = setTimeout(() => setResendSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [resendSuccess]);

  useEffect(() => {
    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    const email = form.email.trim();
    if (!email || !email.includes("@")) {
      setEmailExists(null);
      setEmailChecking(false);
      return;
    }
    setEmailChecking(true);
    setEmailExists(null);
    emailCheckTimer.current = setTimeout(async () => {
      try {
        const res = await authService.checkEmail(email);
        setEmailExists(res.exists);
      } catch {
        setEmailExists(false);
      } finally {
        setEmailChecking(false);
      }
    }, 600);
    return () => {
      if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    };
  }, [form.email]);

  const calcPwStrength = useCallback((pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return score;
  }, []);

  const pwStrength = form.password ? calcPwStrength(form.password) : 0;
  const pwMatch: boolean | null = !form.passwordConfirm
    ? null
    : form.passwordConfirm === form.password;

  const focusPinIdx = (i: number) => {
    document.querySelector<HTMLInputElement>(`[data-pin-idx="${i}"]`)?.focus();
  };

  const handlePinInput = (idx: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    const next = [...pinValues];
    next[idx] = digit;
    setPinValues(next);
    if (idx < 5) setTimeout(() => focusPinIdx(idx + 1), 0);
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

  const goNext = async (s: number) => {
    const fields = registerStepFields[s];
    if (fields && !(await trigger(fields))) return;
    setDirection("next");
    setStep((cur) => Math.min(cur + 1, TOTAL_STEPS));
  };

  const goPrev = () => {
    setDirection("prev");
    setStep((s) => Math.max(s - 1, 1));
  };

  const canGoNext = (s: number): boolean => {
    if (s === 1) return !!(form.nom && form.prenom) && !errors.nom && !errors.prenom;
    if (s === 2) return !!form.dateNaissance && !errors.dateNaissance;
    if (s === 3) return !!(form.email && form.telephone && form.telephone.length >= 8) && emailExists !== true && !emailChecking && !errors.email && !errors.telephone;
    if (s === 4) return !!(form.password && pwStrength >= 2 && pwMatch === true) && !errors.password && !errors.passwordConfirm;
    if (s === 6) return pinSent && pinValues.every((v) => v !== "") && !pinSending;
    return true;
  };

  const proceedToPseudo = async () => {
    const ok = await trigger(registerStepFields[4]);
    if (!ok) return;
    setDirection("next");
    setStep(5);
  };

  const handleVerifyPin = async () => {
    setPinSending(true);
    setPinError("");
    try {
      await authService.verifyEmailPin({
        email: form.email,
        pin: pinValues.join(""),
      });
      localStorage.removeItem("dm_referral_code");
      localStorage.removeItem("dm_referral_locked");
      // OTP verified → now create the account
      setRegError("");
      await onFinalSubmit(form);
    } catch (err: any) {
      setPinError(err.response?.data?.error || "Code invalide ou expiré");
      setPinValues(["", "", "", "", "", ""]);
      setTimeout(() => focusPinIdx(0), 100);
    } finally {
      setPinSending(false);
    }
  };

  const handleResendPin = async () => {
    if (resendCountdown > 0) return;
    setPinSending(true);
    setPinError("");
    setResendSuccess(null);
    setPinValues(["", "", "", "", "", ""]);
    try {
      const res = await authService.sendVerificationPin({
        email: form.email,
        telephone: form.telephone,
      }) as { method: "SMS" | "EMAIL"; target: string };
      setPinMethod(res.method);
      setPinTarget(res.target);
      setPinSent(true);
      setResendCountdown(30);
      setResendSuccess(
        res.method === "SMS"
          ? `Code renvoyé par SMS au ${res.target}`
          : `Code renvoyé par e-mail à ${res.target}`
      );
      setTimeout(() => focusPinIdx(0), 100);
    } catch (err: any) {
      setPinError(err.response?.data?.error || "Erreur d'envoi du code");
    } finally {
      setPinSending(false);
    }
  };

  const handleSendByEmail = async () => {
    if (pinSending) return;
    setPinSending(true);
    setPinError("");
    setResendSuccess(null);
    setPinValues(["", "", "", "", "", ""]);
    try {
      const res = await authService.sendVerificationPin({
        email: form.email,
      }) as { method: "SMS" | "EMAIL"; target: string };
      setPinMethod(res.method);
      setPinTarget(res.target);
      setPinSent(true);
      setResendCountdown(30);
      setResendSuccess(`Code envoyé par e-mail à ${res.target}`);
      setTimeout(() => focusPinIdx(0), 100);
    } catch (err: any) {
      setPinError(err.response?.data?.error || "Erreur d'envoi du code");
    } finally {
      setPinSending(false);
    }
  };

const onFinalSubmit = async (data: RegisterFormValues) => {
    setRegError("");
    setRegLoading(true);
    const result = await register({
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      mot_de_passe: data.password,
      telephone: data.telephone,
      date_naissance: data.dateNaissance,
      code_parrainage: data.referral || undefined,
    });
    setRegLoading(false);
    if (result.success) {
      localStorage.removeItem("dm_referral_code");
      localStorage.removeItem("dm_referral_locked");
      navigate("/dashboard", { replace: true });
    } else {
      setRegError(result.message);
    }
  };

  /**
   * Step 5 → send OTP first, then go to PIN verification.
   * Account creation happens AFTER successful OTP verification.
   */
  const handleSendPinThenSubmit = async () => {
    setRegError("");
    setPinValues(["", "", "", "", "", ""]);
    setPinError("");
    setPinSent(false);
    setResendCountdown(30);
    setPinSending(true);
    try {
      const pinRes = await authService.sendVerificationPin({
        email: form.email,
        telephone: form.telephone,
      }) as { method: "SMS" | "EMAIL"; target: string };
      setPinMethod(pinRes.method);
      setPinTarget(pinRes.target);
      setPinSent(true);
      setDirection("next");
      setStep(6);
      setTimeout(() => focusPinIdx(0), 100);
    } catch (err: any) {
      setPinError(err.response?.data?.error || "Erreur d'envoi du code");
    } finally {
      setPinSending(false);
    }
  };

  const handleFinalSubmit = () => {
    void trigger(registerStepFields[5]).then((valid) => {
      if (valid) void handleSendPinThenSubmit();
    });
  };

  const handleGoogleLogin = async () => {
    setRegError("");
    setRegLoading(true);
    const result = await loginWithGoogle();
    setRegLoading(false);
    if (result.success) navigate("/dashboard");
    else setRegError(result.message);
  };

  const handleLangSelect = (code: string) => {
    setLanguage(code);
    setLangStep(false);
  };

  const renderDots = (light = false) => (
    <div className={styles.dots}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={`${styles.dot} ${
            i + 1 === step
              ? light ? styles.dotActiveWhite : styles.dotActive
              : i + 1 < step
              ? styles.dotDone
              : styles.dotInactive
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className={styles.container}>
      {/* ═══ LANGUAGE SELECTION ═══ */}
      {langStep && (
        <div className={styles.langWrapper}>
          <div className={styles.langImage} style={{ backgroundImage: `url(${bgLang})` }} />
          <Paper className={styles.langForm} shadow="md">
            <img src="/src/assets/images/docmaster.png" alt="DocMaster" className={styles.langFormLogo} />
            <Title order={2} className={styles.langTitle}>
              Choisissez votre langue
            </Title>
            <Text c="dimmed" size="sm" ta="center" mt="xs" mb="lg">
              Choose your language / اختر لغتك
            </Text>

            <div className={styles.langOptions}>
              {[
                { code: "fr", label: "Français" },
                { code: "en", label: "English" },
                { code: "ar", label: "العربية" },
              ].map((opt) => (
                <Button
                  key={opt.code}
                  variant={lang === opt.code ? "filled" : "outline"}
                  color={lang === opt.code ? "gold" : "gray"}
                  size="lg"
                  radius="md"
                  fullWidth
                  onClick={() => handleLangSelect(opt.code)}
                  styles={{
                    root: {
                      height: 56,
                      fontSize: 16,
                      fontWeight: 700,
                    },
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            <Text ta="center" mt="xl" size="sm" c="dimmed">
              {t("login_no_account")}{" "}
              <Anchor component={Link} to="/login" fw={600}>
                {t("login_tab_login")}
              </Anchor>
            </Text>
          </Paper>
        </div>
      )}

      {/* ═══ STEP 1: Prénom + Nom (SPLIT LAYOUT) ═══ */}
      {!langStep && step === 1 && (
        <div className={`${styles.step1Split} ${direction === "prev" ? styles.prev : ""}`} key="step1">
          {/* ── LEFT: Brand panel ── */}
          <div className={styles.step1Brand}>
            <div className={`${styles.step1BrandDecor} ${styles.step1BrandDecorTop}`} />
            <div className={`${styles.step1BrandDecor} ${styles.step1BrandDecorBottom}`} />
            <img src="/src/assets/images/docmaster.png" alt="DocMaster" className={styles.step1Logo} />
            <div className={styles.mascotWrap}>
              <div className={styles.mascotGlow} />
              <DocMascot variant="welcome" />
            </div>
            <h2 className={styles.step1BrandTitle}>Ravi de vous rencontrer !</h2>
            <p className={styles.step1BrandText}>
              Commençons par faire connaissance et créons votre espace sécurisé.
            </p>
            <div className={styles.step1BrandProofs}>
              <div className={styles.step1ProofItem}>
                <i className="fa-solid fa-circle-check" /> {t("login_proof_docs")}
              </div>
              <div className={styles.step1ProofItem}>
                <i className="fa-solid fa-users" /> {t("login_proof_members")}
              </div>
              <div className={styles.step1ProofItem}>
                <i className="fa-solid fa-shield-halved" /> {t("login_proof_security")}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Form panel ── */}
          <div className={styles.step1Form}>
            <div className={styles.step1FormInner}>
              <h1 className={styles.step1FormTitle}>Bienvenue</h1>
              <p className={styles.step1FormSubtitle}>Entrez vos informations pour commencer.</p>

              {regError && (
                <Alert variant="light" color="red" icon={<i className="fa-solid fa-circle-exclamation" />} px="md" py="sm">
                  {regError}
                </Alert>
              )}

              <div className={styles.fields} style={{ marginTop: 4 }}>
                <TextInput
                  {...registerField("nom")}
                  placeholder={t("profil_placeholder_lastname")}
                  leftSection={<i className="fa-regular fa-user" />}
                  size="lg"
                  radius="lg"
                  required
                  error={errors.nom?.message}
                />
                <TextInput
                  {...registerField("prenom")}
                  onKeyDown={(e) => e.key === "Enter" && canGoNext(1) && goNext(1)}
                  placeholder={t("profil_placeholder_firstname")}
                  leftSection={<i className="fa-regular fa-user" />}
                  size="lg"
                  radius="lg"
                  required
                  error={errors.prenom?.message}
                />
              </div>

              <div className={styles.btnRow}>
                <button
                  className={`${styles.btnPrimary} ${styles.btnPrimaryGold}`}
                  onClick={() => goNext(1)}
                  disabled={!canGoNext(1)}
                >
                  {t("login_btn_continue")} <i className="fa-solid fa-arrow-right" />
                </button>
              </div>

              <div className={styles.divider}>{t("login_or_register_with")}</div>
              <Group justify="center" p="md" gap="sm">
                <GoogleButton onClick={handleGoogleLogin}>Google</GoogleButton>
                <FacebookButton>Facebook</FacebookButton>
              </Group>

              {renderDots()}

              <div className={styles.loginLink}>
                {t("login_no_account")}{" "}
                <Link to="/login">{t("login_tab_login")}</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: Date de naissance ═══ */}
      {!langStep && step === 2 && (
        <div className={`${styles.stepWrapper} ${styles.step2} ${direction === "prev" ? styles.prev : ""}`} key="step2">
          <div className={`${styles.decor} ${styles.decor2a}`} />
          <div className={`${styles.decor} ${styles.decor2b}`} />

          <div className={styles.content}>
            <div className={styles.mascotWrap}>
              <div className={`${styles.mascotGlow} ${styles.mascotGlowLight}`} />
              <DocMascot variant="birthday" />
            </div>

            <h1 className={`${styles.title} ${styles.titleLight}`}>Votre date de naissance</h1>
            <p className={`${styles.subtitle} ${styles.subtitleLight}`}>
              Pour personnaliser votre expérience DocMaster.
            </p>

            <DateInput
              value={form.dateNaissance || ""}
              onChange={(val) => setValue("dateNaissance", toIsoDate(val ?? null), { shouldValidate: true })}
              maxDate={localIsoDate(new Date())}
              size="lg"
              radius="lg"
              placeholder="Sélectionnez votre date de naissance"
              leftSection={<i className="fa-solid fa-calendar-days" />}
              clearable
              valueFormat="DD/MM/YYYY"
              locale="fr"
              error={errors.dateNaissance?.message}
            />

            <div className={styles.btnRow}>
              <button className={styles.btnBack} onClick={goPrev}>
                <i className="fa-solid fa-arrow-left" />
              </button>
              <button
                className={`${styles.btnPrimary} ${styles.btnPrimaryWhite}`}
                onClick={() => goNext(2)}
                disabled={!canGoNext(2)}
              >
                {t("login_btn_continue")} <i className="fa-solid fa-arrow-right" />
              </button>
            </div>

            {renderDots()}
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Email + Téléphone ═══ */}
      {!langStep && step === 3 && (
        <div className={`${styles.stepWrapper} ${styles.step3} ${direction === "prev" ? styles.prev : ""}`} key="step3">
          <div className={`${styles.decor} ${styles.decor3a}`} />
          <div className={`${styles.decor} ${styles.decor3b}`} />

          <div className={styles.content}>
            <div className={styles.mascotWrap}>
              <div className={styles.mascotGlow} />
              <DocMascot variant="contact" />
            </div>

            <h1 className={`${styles.title} ${styles.titleDark}`}>Comment vous joindre ?</h1>
            <p className={`${styles.subtitle} ${styles.subtitleDark}`}>
              Nous ne vous enverrons que des notifications importantes.
            </p>

            <div className={styles.fields}>
              <div>
                <TextInput
                  type="email"
                  {...registerField("email")}
                  placeholder={t("login_email_placeholder")}
                  leftSection={<i className="fa-regular fa-envelope" />}
                  rightSection={
                    emailChecking ? (
                      <Loader size="sm" color="gray" />
                    ) : emailExists === true ? (
                      <i className="fa-solid fa-circle-xmark" style={{ color: "#e03131" }} />
                    ) : emailExists === false && form.email.trim() ? (
                      <i className="fa-solid fa-circle-check" style={{ color: "#2f9e44" }} />
                    ) : null
                  }
                  size="lg"
                  radius="lg"
                  error={emailExists === true ? "Cet email est déjà utilisé" : errors.email?.message}
                  styles={{
                    input: {
                      background: "rgba(255,255,255,0.20)",
                      border: emailExists === true
                        ? "2px solid #e03131"
                        : emailExists === false && form.email.trim()
                        ? "2px solid #2f9e44"
                        : "2px solid rgba(255,255,255,0.25)",
                      color: "#1A1A1A",
                    },
                  }}
                  required
                />
                {emailExists === true && (
                  <Text size="xs" color="red" mt={4}>
                    Cet email est déjà utilisé. <Anchor component="button" size="xs" onClick={() => navigate("/login")}>Se connecter</Anchor>
                  </Text>
                )}
                {emailExists === false && form.email.trim() && (
                  <Text size="xs" color="green" mt={4}>
                    Cet email est disponible
                  </Text>
                )}
              </div>
              <PhoneInput
                country={"cm"}
                value={form.telephone}
                onChange={(phone) => setValue("telephone", phone, { shouldValidate: true })}
                onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && canGoNext(3) && goNext(3)}
                placeholder={t("profil_placeholder_phone")}
                enableSearch
                searchPlaceholder="Rechercher un pays..."
                inputProps={{
                  required: true,
                  size: "lg",
                }}
                containerStyle={{
                  width: "100%",
                }}
                inputStyle={{
                  width: "100%",
                  height: "48px",
                  fontSize: "16px",
                  borderRadius: "12px",
                  border: "2px solid rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.20)",
                  color: "#1A1A1A",
                  paddingLeft: "56px",
                }}
                buttonStyle={{
                  borderRadius: "12px 0 0 12px",
                  border: "2px solid rgba(255,255,255,0.25)",
                  borderRight: "none",
                  background: "rgba(255,255,255,0.25)",
                }}
                dropdownStyle={{
                  borderRadius: "12px",
                  border: "1px solid rgba(0,0,0,0.1)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                }}
              />
            </div>

            <div className={styles.btnRow}>
              <button className={`${styles.btnBack} ${styles.btnBackDark}`} onClick={goPrev}>
                <i className="fa-solid fa-arrow-left" />
              </button>
              <button
                className={`${styles.btnPrimary} ${styles.btnPrimaryGold}`}
                onClick={() => goNext(3)}
                disabled={!canGoNext(3)}
              >
                {t("login_btn_continue")} <i className="fa-solid fa-arrow-right" />
              </button>
            </div>

            {renderDots()}
          </div>
        </div>
      )}

      {/* ═══ STEP 4: Mot de passe ═══ */}
      {!langStep && step === 4 && (
        <div className={`${styles.stepWrapper} ${styles.step4} ${direction === "prev" ? styles.prev : ""}`} key="step4">
          <div className={`${styles.decor} ${styles.decor4a}`} />
          <div className={`${styles.decor} ${styles.decor4b}`} />

          <div className={styles.content}>
            <div className={styles.mascotWrap}>
              <div className={styles.mascotGlow} />
              <DocMascot variant="security" />
            </div>

            <h1 className={`${styles.title} ${styles.titleLight}`}>Sécurisez votre compte</h1>
            <p className={`${styles.subtitle} ${styles.subtitleLight}`}>
              Choisissez un mot de passe fort pour protéger vos documents.
            </p>

            <div className={styles.fields}>
              <PasswordInput
                {...registerField("password")}
                placeholder={t("reset_placeholder_password")}
                leftSection={<i className="fa-solid fa-lock" />}
                size="lg"
                radius="lg"
                error={errors.password?.message}
                styles={{
                  input: {
                    background: "rgba(255,255,255,0.08)",
                    border: "2px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    backdropFilter: "blur(4px)",
                  },
                  innerInput: { color: "#fff" },
                  placeholder: { color: "rgba(255,255,255,0.40)" },
                  section: { color: "rgba(255,255,255,0.50)" },
                }}
                required
              />
              {form.password && (
                <div className={styles.strengthBars}>
                  {[1, 2, 3, 4].map((l) => (
                    <div
                      key={l}
                      className={`${styles.strengthBar} ${
                        pwStrength >= l
                          ? [styles.strengthBarActive1, styles.strengthBarActive2, styles.strengthBarActive3, styles.strengthBarActive4][l - 1]
                          : styles.strengthBarInactive
                      }`}
                    />
                  ))}
                </div>
              )}
              <PasswordInput
                {...registerField("passwordConfirm")}
                onKeyDown={(e) => e.key === "Enter" && canGoNext(4) && proceedToPseudo()}
                placeholder={t("reset_placeholder_confirm")}
                leftSection={<i className="fa-solid fa-lock" />}
                size="lg"
                radius="lg"
                error={errors.passwordConfirm?.message}
                styles={{
                  input: {
                    background: "rgba(255,255,255,0.08)",
                    border: pwMatch === false
                      ? "2px solid #ef4444"
                      : pwMatch === true
                      ? "2px solid #E8923A"
                      : "2px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    backdropFilter: "blur(4px)",
                  },
                  innerInput: { color: "#fff" },
                  placeholder: { color: "rgba(255,255,255,0.40)" },
                  section: { color: "rgba(255,255,255,0.50)" },
                }}
                required
              />
              {form.passwordConfirm && pwMatch === false && (
                <div className={`${styles.pwMatch} ${styles.pwMatchError}`}>
                  <i className="fa-solid fa-circle-xmark" /> {t("login_error_pw_mismatch")}
                </div>
              )}
              {pwMatch === true && (
                <div className={`${styles.pwMatch} ${styles.pwMatchOk}`}>
                  <i className="fa-solid fa-circle-check" /> {t("login_success_pw_match")}
                </div>
              )}
            </div>

            <div className={styles.btnRow}>
              <button className={styles.btnBack} onClick={goPrev}>
                <i className="fa-solid fa-arrow-left" />
              </button>
              <button
                className={`${styles.btnPrimary} ${styles.btnPrimaryGold}`}
                onClick={proceedToPseudo}
                disabled={!canGoNext(4)}
              >
                <>{t("login_btn_validate")} <i className="fa-solid fa-arrow-right" /></>
              </button>
            </div>

            {renderDots()}
          </div>
        </div>
      )}

      {/* ═══ STEP 5: Pseudo + Parrainage ═══ */}
      {!langStep && step === 5 && (
        <div className={`${styles.stepWrapper} ${styles.step6} ${direction === "prev" ? styles.prev : ""}`} key="step5">
          <div className={`${styles.decor} ${styles.decor6a}`} />
          <div className={`${styles.decor} ${styles.decor6b}`} />

          <div className={styles.content}>
            <div className={styles.mascotWrap}>
              <div className={styles.mascotGlow} />
              <DocMascot variant="launch" />
            </div>

            <h1 className={`${styles.title} ${styles.titleLight}`}>Plus qu'une étape !</h1>
            <p className={`${styles.subtitle} ${styles.subtitleLight}`}>
              Choisissez votre nom d'utilisateur pour finaliser votre inscription.
            </p>

            {regError && (
              <Alert variant="light" color="red" icon={<i className="fa-solid fa-circle-exclamation" />} px="md" py="sm">
                {regError}
              </Alert>
            )}

            <div className={styles.fields}>
              <div className={styles.pseudoWrap}>
                <span className={styles.pseudoPrefix}>@</span>
                <input
                  className={`${styles.pseudoInput} ${errors.pseudo ? styles.pseudoInputError : ""}`}
                  type="text"
                  {...registerField("pseudo")}
                  onKeyDown={(e) => e.key === "Enter" && form.pseudo && !regLoading && handleFinalSubmit()}
                  placeholder="jean_dupont42"
                />
              </div>
              {errors.pseudo && (
                <Text size="xs" c="red" mt={4}>
                  {errors.pseudo.message}
                </Text>
              )}

              {pseudoSuggestions.length > 0 && (
                <>
                  <span className={styles.suggestionsLabel}>{t("login_suggestions")}</span>
                  <div className={styles.suggestions}>
                    {pseudoSuggestions.map((s) => (
                      <button
                        key={s}
                        className={styles.suggestionBtn}
                        onClick={() => setValue("pseudo", s, { shouldValidate: true })}
                      >
                        @{s}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <button
                className={styles.referralToggle}
                onClick={() => setShowReferral(!showReferral)}
              >
                <i className="fa-solid fa-gift" />
                {t("login_referral_question")}
                <i className={`fa-solid fa-chevron-down ${styles.referralToggleIcon} ${showReferral ? styles.referralToggleIconOpen : ""}`} />
              </button>

              {showReferral && (
                <TextInput
                  variant="unstyled"
                  className={styles.inputDark}
                  {...registerField("referral")}
                  onChange={(e) => {
                    registerField("referral").onChange(e);
                    if (!referralLocked) localStorage.setItem("dm_referral_code", e.target.value);
                  }}
                  disabled={referralLocked}
                  placeholder={t("login_referral_placeholder")}
                  leftSection={<i className="fa-solid fa-gift" />}
                />
              )}
            </div>

            <div className={styles.btnRow}>
              <button className={styles.btnBack} onClick={goPrev}>
                <i className="fa-solid fa-arrow-left" />
              </button>
              <button
                className={`${styles.btnPrimary} ${styles.btnPrimaryGreen}`}
                onClick={handleFinalSubmit}
                disabled={!form.pseudo || regLoading}
              >
                {regLoading ? (
                  <i className="fa-solid fa-spinner fa-spin" />
                ) : (
                  <><i className="fa-solid fa-rocket" /> {t("login_btn_create")}</>
                )}
              </button>
            </div>

            {renderDots()}
          </div>
        </div>
      )}

      {/* ═══ STEP 6: PIN ═══ */}
      {!langStep && step === 6 && (
        <div className={`${styles.stepWrapper} ${styles.step5} ${direction === "prev" ? styles.prev : ""}`} key="step6">
          <div className={`${styles.decor} ${styles.decor5a}`} />
          <div className={`${styles.decor} ${styles.decor5b}`} />

          <div className={styles.content}>
            <div className={styles.mascotWrap}>
              <div className={`${styles.mascotGlow} ${styles.mascotGlowLight}`} />
              <DocMascot variant="verify" />
            </div>

            <h1 className={`${styles.title} ${styles.titleLight}`}>Vérification</h1>
            <p className={styles.pinInfo}>
              {pinMethod === "SMS"
                ? "Un code PIN a été envoyé par SMS au "
                : "Un code PIN a été envoyé à "}
              {pinTarget && <span className={styles.pinTarget}>{pinTarget}</span>}
            </p>

            <div className={styles.pinGrid}>
              {pinValues.map((val, idx) => (
                <input
                  key={idx}
                  className={`${styles.pinInput} ${val ? styles.filled : ""}`}
                  maxLength={1}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={val}
                  disabled={pinSending}
                  onChange={(e) => handlePinInput(idx, e.target.value)}
                  onKeyDown={(e) => handlePinKey(idx, e)}
                  onPaste={handlePinPaste}
                  data-pin-idx={idx}
                />
              ))}
            </div>

            {resendSuccess && (
              <div className={styles.pinSuccess}>
                <i className="fa-solid fa-circle-check" /> {resendSuccess}
              </div>
            )}
            {pinError && (
              <div className={styles.pinError}>
                <i className="fa-solid fa-circle-exclamation" /> {pinError}
              </div>
            )}

            <div className={styles.pinActions}>
              <span style={{ color: "rgba(255,255,255,0.50)", fontSize: 13 }}>
                {t("login_pin_not_received")}
              </span>
              <button
                className={styles.pinActionBtn}
                onClick={handleResendPin}
                disabled={resendCountdown > 0 || pinSending}
              >
                {pinSending ? (
                  <i className="fa-solid fa-spinner fa-spin" />
                ) : resendCountdown > 0 ? (
                  <><i className="fa-solid fa-clock" />{resendCountdown}s</>
                ) : (
                  <><i className="fa-solid fa-rotate-right" /> {t("login_pin_resend")}</>
                )}
              </button>
            </div>

            {pinMethod === "SMS" && (
              <button
                className={styles.pinActionBtn}
                onClick={handleSendByEmail}
                disabled={resendCountdown > 0 || pinSending}
                style={{ marginTop: -4 }}
              >
                <i className="fa-solid fa-envelope" /> Je n'ai pas reçu le SMS — envoyer par e-mail
              </button>
            )}

            <div className={styles.btnRow}>
              <button
                className={styles.btnBack}
                onClick={() => { setDirection("prev"); setStep(5); }}
                disabled={pinSending}
              >
                <i className="fa-solid fa-arrow-left" />
              </button>
              <button
                className={`${styles.btnPrimary} ${styles.btnPrimaryWhite}`}
                onClick={handleVerifyPin}
                disabled={!canGoNext(6) || pinSending}
              >
                {pinSending ? (
                  <i className="fa-solid fa-spinner fa-spin" />
                ) : (
                  <>{t("login_btn_verify")} <i className="fa-solid fa-arrow-right" /></>
                )}
              </button>
            </div>

            <div style={{ height: 8 }} />
          </div>
        </div>
      )}
    </div>
  );
}