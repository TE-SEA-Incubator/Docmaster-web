import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "../../context/I18nContext";
import { authService } from "../../services/authService";

export default function ForgotPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await authService.requestPasswordReset({ email });
      if (res.success) {
        setSent(true);
      } else {
        setError(res.message || t("forgot_send_error"));
      }
    } catch {
      setError(t("forgot_send_error_network"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2EBD9] overflow-x-hidden relative font-poppins flex items-center justify-center p-6">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="blob blob-4" />
      <div className="blob blob-5" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-[32px] p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

          <Link to="/login" className="inline-flex items-center gap-2 text-[12.5px] text-textMuted font-semibold hover:text-primary transition-colors mb-6">
            <i className="fa-solid fa-arrow-left" /> {t("forgot_back_to_login")}
          </Link>

          <div className="flex flex-col gap-6 relative z-10">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-3xl">
              <i className="fa-solid fa-key" />
            </div>

            <div className="space-y-2">
              <h1 className="font-bricolage text-3xl font-extrabold tracking-tight text-gray-900">
                {t("forgot_title")}
              </h1>
              <p className="text-gray-500 leading-relaxed text-[15px]">
                {t("forgot_desc")}
              </p>
            </div>

            {sent ? (
              <div className="flex flex-col items-center gap-4 text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-500 text-3xl">
                  <i className="fa-solid fa-envelope-circle-check" />
                </div>
                <p className="text-gray-700 font-semibold text-[15px]">{t("forgot_email_sent")}</p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {t("forgot_check_inbox").replace("{email}", email)}
                  <br />{t("forgot_check_spam")}
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all"
                >
                  {t("forgot_back_login")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-[14px] text-red-600 text-[12px] font-semibold flex items-center gap-2">
                    <i className="fa-solid fa-circle-exclamation" /> {error}
                  </div>
                )}

                <div className="flex flex-col">
                  <label className="text-[11px] font-bold text-textMuted uppercase tracking-wider ml-1 mb-1.5">
                    {t("forgot_your_email")}
                  </label>
                  <div className="relative flex items-center group">
                    <i className="fa-regular fa-envelope absolute left-3.5 text-[#c4bab0] text-[14px] pointer-events-none transition-colors group-focus-within:text-primary" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@exemple.com"
                      className="w-full py-3.5 pl-[42px] pr-4 bg-[#faf8f5] border-[1.5px] border-[#E0D5C4] rounded-[14px] font-poppins text-[15px] text-textMain outline-none transition-all focus:border-primary focus:shadow-[0_0_0_4px_rgba(245,166,75,0.15)] focus:bg-white placeholder:text-[#c4bab0]"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-base shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <i className="fa-solid fa-spinner fa-spin" />
                  ) : (
                    <><i className="fa-solid fa-paper-plane" /> {t("forgot_send_link")}</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .blob { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; }
        .blob-1 { width: 260px; height: 240px; background: #A8CBAF; top: -60px; right: -40px; opacity: 0.7; border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; }
        .blob-2 { width: 130px; height: 120px; background: #E8B89A; top: 10px; right: 200px; opacity: 0.6; border-radius: 50% 60% 40% 55% / 55% 45% 60% 40%; }
        .blob-3 { width: 200px; height: 190px; background: #A8CBAF; bottom: -40px; left: -50px; opacity: 0.6; border-radius: 45% 55% 60% 40% / 60% 40% 55% 45%; }
        .blob-4 { width: 130px; height: 130px; background: #F5A64B; bottom: 30px; right: 20px; border-radius: 50%; opacity: 0.75; }
        .blob-5 { width: 100px; height: 90px; background: #E8B89A; top: 50%; left: 10px; transform: translateY(-50%); opacity: 0.45; border-radius: 55% 45% 50% 50%; }
      `}</style>
    </div>
  );
}
