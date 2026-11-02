import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import apiClient from "../../services/api";
import { saveToken, saveRefreshToken } from "../../utils/cookie";
import { useI18n } from "../../context/I18nContext";
import { checkAdminAuth } from "../../utils/adminAuth";

export default function AdminLogin() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", mot_de_passe: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (checkAdminAuth()) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiClient.post("auth/login", form);
      const userRole = res.data.user?.role?.toUpperCase();
      if (userRole === "ADMIN") {
        saveToken(res.data.token, "admin");
        if (res.data.refresh_token) {
          saveRefreshToken(res.data.refresh_token, "admin");
        }
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
    <div className="min-h-screen bg-[#F5F6F7] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#2D5A42] rounded mb-5">
            <i className="ph ph-shield text-[#E8923A] text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Administration DocMaster</h1>
          <p className="text-[13px] text-gray-500">{t("admin_administration")}</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-[13px] flex items-center gap-2">
                <i className="ph ph-warning-circle shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-gray-600 uppercase tracking-wider">
                {t("admin_email")}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded text-[14px] text-gray-900 outline-none transition-colors focus:border-[#E8923A] focus:ring-2 focus:ring-[#E8923A]/15 bg-white placeholder:text-gray-400"
                placeholder="admin@docmaster.com"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-gray-600 uppercase tracking-wider">
                {t("admin_password")}
              </label>
              <input
                type="password"
                value={form.mot_de_passe}
                onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded text-[14px] text-gray-900 outline-none transition-colors focus:border-[#E8923A] focus:ring-2 focus:ring-[#E8923A]/15 bg-white placeholder:text-gray-400"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-between text-[13px] pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-600">
                <input type="checkbox" className="w-4 h-4 accent-[#E8923A]" />
                {t("admin_remember")}
              </label>
              <a href="/forgot-password" className="text-[#E8923A] font-semibold hover:underline text-[13px]">
                {t("admin_forgot_password")}
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#2D5A42] text-white rounded text-[14px] font-bold hover:bg-[#2D5A42] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <i className="ph ph-spinner animate-spin text-sm" />
              ) : (
                <i className="ph ph-sign-in text-sm" />
              )}
              {loading ? t("admin_connecting") : t("admin_login")}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between text-[12px]">
            <a href="/login" className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <i className="ph ph-arrow-left text-[10px]" />
              {t("admin_back_user_login")}
            </a>
            <a href="https://docmaster.com/contact" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
              {t("admin_contact_support")}
              <i className="ph ph-arrow-square-out text-[10px]" />
            </a>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-4">
          DocMaster Admin — Accès restreint
        </p>
      </div>
    </div>
  );
}
