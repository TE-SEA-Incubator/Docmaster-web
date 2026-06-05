import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../services/api";
import { saveToken } from "../../utils/cookie";
import { useI18n } from "../../context/I18nContext";

export default function AdminLogin() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", mot_de_passe: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const adminLoggedIn = localStorage.getItem("docmaster_admin_login");
  if (adminLoggedIn) {
    navigate("/admin", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiClient.post("auth/login", form);
      const userRole = res.data.user?.role?.toUpperCase();
      
      if (userRole === "ADMIN") {
        saveToken(res.data.token);
        localStorage.setItem(
          "docmaster_admin_login",
          JSON.stringify({ role: "ADMIN", token: res.data.token, user: res.data.user })
        );
        navigate("/admin");
      } else {
        setError(t("admin_unauthorized"));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || t("admin_login_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4EFE6] via-[#FAF7F2] to-[#E8F5EE] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated blobs */}
      <div className="absolute w-[300px] h-[300px] rounded-full bg-gradient-to-br from-[#A8CBAF] to-[#E8F5EE] opacity-30 -top-20 -left-20 animate-[float_6s_ease-in-out_infinite]" />
      <div className="absolute w-[250px] h-[250px] rounded-full bg-gradient-to-br from-[#E8B89A] to-[#FEF0DC] opacity-30 -bottom-12 -right-12 animate-[float_6s_ease-in-out_infinite_2s]" />
      <div className="absolute w-[200px] h-[200px] rounded-full bg-gradient-to-br from-[#1E3A2F] to-[#2D5A42] opacity-[0.12] top-1/2 right-[10%] animate-[float_6s_ease-in-out_infinite_4s]" />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(20px); }
        }
        @keyframes rotate {
          0% { transform: rotateZ(0deg); }
          100% { transform: rotateZ(360deg); }
        }
      `}</style>

      <div className="w-full max-w-md relative z-10 animate-[slideUp_0.6s_ease-out]">
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div className="bg-white rounded-[24px] p-8 sm:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-[#EAE3D8]">
          {/* Header */}
          <div className="text-center mb-10">
            <div
              className="w-20 h-20 rounded-[20px] bg-gradient-to-br from-[#1E3A2F] to-[#2D5A42] flex items-center justify-center mx-auto mb-6 shadow-[0_10px_30px_rgba(30,58,47,0.2)]"
              style={{ animation: "rotate 20s linear infinite" }}
            >
              <i className="fa-solid fa-shield-halved text-4xl text-[#F5A64B]" />
            </div>
            <h1 className="font-bricolage text-[28px] font-extrabold text-[#1A1A1A] mb-2 tracking-tight">
              Admin DocMaster
            </h1>
            <p className="text-[14px] text-[#6B7280] font-medium">
              {t("admin_administration")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="p-3 bg-[#fef2f2] border border-[#FECACA] rounded-[10px] text-[#ef4444] text-[13px] font-medium flex items-center gap-2 animate-[shake_0.4s_ease-in-out]">
                <i className="fa-solid fa-circle-exclamation" /> {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-[12.5px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-envelope text-[#F5A64B] text-xs" />
                {t("admin_email")}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border-[1.5px] border-[#EAE3D8] rounded-xl bg-[#F9F6F1] text-[14px] text-[#1A1A1A] outline-none transition-all focus:border-[#F5A64B] focus:bg-white focus:shadow-[0_0_0_4px_rgba(245,166,75,0.12)] placeholder:text-[#C4BAB0] font-poppins"
                  placeholder="admin@docmaster.com"
                  required
                  autoFocus
                />
                <i className="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D98A30] text-sm pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[12.5px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-lock text-[#F5A64B] text-xs" />
                {t("admin_password")}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={form.mot_de_passe}
                  onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border-[1.5px] border-[#EAE3D8] rounded-xl bg-[#F9F6F1] text-[14px] text-[#1A1A1A] outline-none transition-all focus:border-[#F5A64B] focus:bg-white focus:shadow-[0_0_0_4px_rgba(245,166,75,0.12)] placeholder:text-[#C4BAB0] font-poppins"
                  placeholder="••••••••"
                  required
                />
                <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D98A30] text-sm pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center justify-between text-[13px] mt-1">
              <label className="flex items-center gap-1.5 cursor-pointer text-[#6B7280] font-medium">
                <input type="checkbox" className="w-4 h-4 cursor-pointer accent-[#F5A64B]" />
                {t("admin_remember")}
              </label>
              <a href="/forgot-password" className="text-[#F5A64B] font-semibold hover:text-[#D98A30] transition-colors no-underline">
                {t("admin_forgot_password")}
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-[#1E3A2F] to-[#2D5A42] text-white rounded-xl font-bricolage text-[15px] font-extrabold cursor-pointer transition-all mt-4 flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(30,58,47,0.2)] relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(30,58,47,0.3)] active:translate-y-0 disabled:opacity-80 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-0 bg-white/20 -translate-x-full transition-transform duration-300 hover:translate-x-full" />
              {loading ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <i className="fa-solid fa-arrow-right-to-bracket" />
              )}
              {loading ? t("admin_connecting") : t("admin_login")}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#EAE3D8]" />
            <span className="text-[12px] text-[#9CA3AF] font-medium">{t("admin_need_help")}</span>
            <div className="flex-1 h-px bg-[#EAE3D8]" />
          </div>

          {/* Footer */}
          <div className="pt-5 border-t border-[#EAE3D8] text-center flex flex-col gap-3">
            <a href="/login" className="text-[#F5A64B] no-underline text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:gap-3 transition-all">
              <i className="fa-solid fa-arrow-left text-xs" />
              {t("admin_back_user_login")}
            </a>
            <a href="https://docmaster.com/contact" target="_blank" rel="noopener noreferrer" className="text-[#F5A64B] no-underline text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:gap-3 transition-all">
              {t("admin_contact_support")}
              <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
