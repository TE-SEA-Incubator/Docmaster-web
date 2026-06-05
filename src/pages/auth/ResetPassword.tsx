import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { authService } from "../../services/authService";

export default function ResetPassword() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pwVisible, setPwVisible] = useState(false);

  const calcStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return score;
  };
  const pwStrength = calcStrength(password);
  const pwMatch = confirm.length > 0 ? password === confirm : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError(t("reset_invalid_error"));
      return;
    }
    if (!password.trim() || pwStrength < 2) {
      setError(t("reset_weak_password"));
      return;
    }
    if (password !== confirm) {
      setError(t("reset_mismatch"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authService.resetPassword({ token, mot_de_passe: password });
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.message || t("reset_failed"));
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || t("reset_network_error");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token && !success) {
    return (
      <div className="min-h-screen bg-[#F2EBD9] overflow-x-hidden relative font-poppins flex items-center justify-center p-6">
        <div className="blob blob-1" /><div className="blob blob-2" />
        <div className="blob blob-3" /><div className="blob blob-4" /><div className="blob blob-5" />
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-[32px] p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
            <div className="flex flex-col items-center gap-4 text-center relative z-10">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 text-3xl">
                <i className="fa-solid fa-link-slash" />
              </div>
              <h1 className="font-bricolage text-2xl font-extrabold tracking-tight text-gray-900">
                {t("reset_invalid_link")}
              </h1>
              <p className="text-gray-500 text-[14px] leading-relaxed">
                {t("reset_invalid_desc")}
              </p>
              <Link
                to="/forgot-password"
                className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all mt-2"
              >
                <i className="fa-solid fa-key mr-2" /> {t("reset_new_request")}
              </Link>
            </div>
          </div>
        </div>
        <style>{blobStyles}</style>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F2EBD9] overflow-x-hidden relative font-poppins flex items-center justify-center p-6">
        <div className="blob blob-1" /><div className="blob blob-2" />
        <div className="blob blob-3" /><div className="blob blob-4" /><div className="blob blob-5" />
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-[32px] p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-green-500/5 rounded-full blur-3xl" />
            <div className="flex flex-col items-center gap-4 text-center relative z-10">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-500 text-3xl">
                <i className="fa-solid fa-check-circle" />
              </div>
              <h1 className="font-bricolage text-2xl font-extrabold tracking-tight text-gray-900">
                {t("reset_success_title")}
              </h1>
              <p className="text-gray-500 text-[14px] leading-relaxed">
                {t("reset_success_desc")}
              </p>
              <Link
                to="/login"
                className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all mt-2"
              >
                <i className="fa-solid fa-right-to-bracket mr-2" /> {t("reset_login")}
              </Link>
            </div>
          </div>
        </div>
        <style>{blobStyles}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2EBD9] overflow-x-hidden relative font-poppins flex items-center justify-center p-6">
      <div className="blob blob-1" /><div className="blob blob-2" />
      <div className="blob blob-3" /><div className="blob blob-4" /><div className="blob blob-5" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-[32px] p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

          <div className="flex flex-col gap-6 relative z-10">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-3xl">
              <i className="fa-solid fa-lock-open" />
            </div>

            <div className="space-y-2">
              <h1 className="font-bricolage text-3xl font-extrabold tracking-tight text-gray-900">
                {t("reset_title")}
              </h1>
              <p className="text-gray-500 leading-relaxed text-[15px]">
                {t("reset_desc")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-[14px] text-red-600 text-[12px] font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation" /> {error}
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-textMuted uppercase tracking-wider ml-1 mb-1.5 block">
                  {t("reset_new_password")}
                </label>
                <div className="relative flex items-center group">
                  <i className="fa-solid fa-lock absolute left-3.5 text-[#c4bab0] text-[14px] pointer-events-none transition-colors group-focus-within:text-primary" />
                  <input
                    type={pwVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("reset_placeholder_password")}
                    className="w-full py-3.5 pl-[42px] pr-[45px] bg-[#faf8f5] border-[1.5px] border-[#E0D5C4] rounded-[14px] font-poppins text-[15px] text-textMain outline-none transition-all focus:border-primary focus:shadow-[0_0_0_4px_rgba(245,166,75,0.15)] focus:bg-white placeholder:text-[#c4bab0]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setPwVisible(!pwVisible)}
                    className="absolute right-3 p-1.5 text-textMuted hover:text-primary transition-colors cursor-pointer"
                  >
                    <i className={`fa-regular ${pwVisible ? "fa-eye-slash" : "fa-eye"}`} />
                  </button>
                </div>
                {password && (
                  <div className="flex gap-1 mt-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full ${
                          pwStrength >= i
                            ? i <= 2 ? (i === 1 ? "bg-red-500" : "bg-yellow-500") : "bg-green-500"
                            : "bg-black/10"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-textMuted uppercase tracking-wider ml-1 mb-1.5 block">
                  {t("reset_confirm_password")}
                </label>
                <div className="relative flex items-center group">
                  <i className="fa-solid fa-lock-open absolute left-3.5 text-[#c4bab0] text-[14px] pointer-events-none transition-colors group-focus-within:text-primary" />
                  <input
                    type={pwVisible ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder={t("reset_placeholder_confirm")}
                    className="w-full py-3.5 pl-[42px] pr-4 bg-[#faf8f5] border-[1.5px] border-[#E0D5C4] rounded-[14px] font-poppins text-[15px] text-textMain outline-none transition-all focus:border-primary focus:shadow-[0_0_0_4px_rgba(245,166,75,0.15)] focus:bg-white placeholder:text-[#c4bab0]"
                    required
                  />
                </div>
                {confirm && pwMatch === false && (
                  <p className="text-[12px] font-medium mt-1.5 text-red-500">
                    <i className="fa-solid fa-circle-xmark mr-1" />
                    {t("reset_mismatch")}
                  </p>
                )}
                {pwMatch === true && (
                  <p className="text-[12px] font-medium mt-1.5 text-green-600">
                    <i className="fa-solid fa-circle-check mr-1" />
                    {t("reset_match")}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password.trim() || password !== confirm}
                className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-base shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <i className="fa-solid fa-spinner fa-spin" />
                ) : (
                  <><i className="fa-solid fa-check" /> {t("reset_button")}</>
                )}
              </button>
            </form>

            <div className="text-center">
              <Link to="/login" className="text-[12.5px] text-primary font-semibold hover:underline">
                <i className="fa-solid fa-arrow-left mr-1.5" />
                {t("reset_back_to_login")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{blobStyles}</style>
    </div>
  );
}

const blobStyles = `
  .blob { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; }
  .blob-1 { width: 260px; height: 240px; background: #A8CBAF; top: -60px; right: -40px; opacity: 0.7; border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; }
  .blob-2 { width: 130px; height: 120px; background: #E8B89A; top: 10px; right: 200px; opacity: 0.6; border-radius: 50% 60% 40% 55% / 55% 45% 60% 40%; }
  .blob-3 { width: 200px; height: 190px; background: #A8CBAF; bottom: -40px; left: -50px; opacity: 0.6; border-radius: 45% 55% 60% 40% / 60% 40% 55% 45%; }
  .blob-4 { width: 130px; height: 130px; background: #F5A64B; bottom: 30px; right: 20px; border-radius: 50%; opacity: 0.75; }
  .blob-5 { width: 100px; height: 90px; background: #E8B89A; top: 50%; left: 10px; transform: translateY(-50%); opacity: 0.45; border-radius: 55% 45% 50% 50%; }
`;
