import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { useI18n } from "../../context/I18nContext";
import Topbar from "../../layout/Topbar";
import DatePicker from "../../components/ui/DatePicker";
import type { ApiResponse, UserProfile } from "../../types/api";

function validateRequired(v: any) {
  return v && String(v).trim().length > 0;
}

export default function InfosProfil() {
  const { t, lang, setLanguage } = useI18n();
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState<"personal" | "preferences">("personal");

  const [form, setForm] = useState({
    nom: user?.nom || "",
    prenom: user?.prenom || "",
    email: user?.email || "",
    telephone: user?.telephone || "",
    ville: user?.ville || "",
    date_naissance: user?.date_naissance || "",
    lieu_naissance: user?.lieu_naissance || "",
    currency: user?.currency || "XAF",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const [pwForm, setPwForm] = useState({ current: "", new: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.photo_url) {
      setPhotoPreview(
        user.photo_url.startsWith("http") || user.photo_url.startsWith("data:")
          ? user.photo_url
          : "/" + user.photo_url.replace(/^\//, "")
      );
    }
    if (user?.date_naissance) {
      try {
        const d = new Date(user.date_naissance);
        if (!isNaN(d.getTime())) {
          setForm((prev) => ({ ...prev, date_naissance: d.toISOString().split("T")[0] }));
        }
      } catch {
        /* ignore */
      }
    }
  }, [user]);

  const fields = ["telephone", "ville", "date_naissance", "lieu_naissance"] as const;
  const isIncomplete = fields.some((f) => {
    const v = f === "telephone" ? form.telephone : f === "ville" ? form.ville : f === "date_naissance" ? form.date_naissance : form.lieu_naissance;
    return !v || String(v).trim() === "";
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ ok: false, msg: t("profil_photo_too_large") });
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!validateRequired(form.nom) || !validateRequired(form.prenom)) {
      setFeedback({ ok: false, msg: t("profil_firstname_required") });
      return;
    }

    setSaving(true);
    try {
      let result: ApiResponse<UserProfile>;

      const validDate = form.date_naissance && !isNaN(new Date(form.date_naissance).getTime()) ? form.date_naissance : "";

      if (photoFile) {
        const fd = new FormData();
        fd.append("nom", String(form.nom).trim());
        fd.append("prenom", String(form.prenom).trim());
        fd.append("ville", String(form.ville).trim());
        fd.append("telephone", String(form.telephone).trim());
        if (validDate) fd.append("date_naissance", validDate);
        fd.append("lieu_naissance", String(form.lieu_naissance).trim());
        fd.append("currency", form.currency);
        fd.append("photo_profile", photoFile);

        result = await authService.updateProfile(fd as unknown as Partial<UserProfile>);
      } else {
        result = await authService.updateProfile({
          nom: String(form.nom).trim(),
          prenom: String(form.prenom).trim(),
          ville: String(form.ville).trim(),
          telephone: String(form.telephone).trim(),
          ...(validDate ? { date_naissance: validDate } : {}),
          lieu_naissance: String(form.lieu_naissance).trim(),
          currency: form.currency,
        });
      }

      if (result.success || result.data) {
        const updated = result.data || result.user || result;
        updateUser(updated);
        setPhotoFile(null);
        setFeedback({ ok: true, msg: t("profil_update_success") });

        if (updated.photo_url) {
          setPhotoPreview(
            updated.photo_url.startsWith("http") ? updated.photo_url : "/" + updated.photo_url.replace(/^\//, "")
          );
        }

        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ ok: false, msg: result.message || t("profil_update_error") });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || t("profil_network_error");
      setFeedback({ ok: false, msg });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (pwForm.new.length < 6) {
      setFeedback({ ok: false, msg: t("profil_password_length") });
      return;
    }
    if (pwForm.new !== pwForm.confirm) {
      setFeedback({ ok: false, msg: t("profil_password_mismatch") });
      return;
    }

    setPwSaving(true);
    try {
      await authService.changePassword(pwForm.current, pwForm.new);
      setPwForm({ current: "", new: "", confirm: "" });
      setFeedback({ ok: true, msg: t("profil_password_success") });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      const msg = err?.response?.data?.error || t("profil_password_change_error");
      setFeedback({ ok: false, msg });
    } finally {
      setPwSaving(false);
    }
  };

  const initials = user?.initial || "DM";

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("profil_title")}
        breadcrumbs={[
          { label: t("profil_breadcrumb_home"), href: "/dashboard" },
          { label: t("profil_breadcrumb_profile") },
        ]}
      />

      <div className="custom-scroll p-4 sm:p-6 flex flex-col gap-5 pb-24 md:pb-6 max-md:h-[calc(100vh-134px)] md:h-[calc(100vh-64px)] overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-5">


          {/* Completion notice */}
          {isIncomplete && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                <i className="fa-solid fa-circle-info" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-blue-900">{t("profil_completion_title")}</p>
                <p className="text-[12px] text-blue-700/80">{t("profil_completion_desc")}</p>
              </div>
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl flex items-center gap-3 text-[13px] font-semibold border ${
                feedback.ok
                  ? "bg-green-light border-green-mid/20 text-green-mid"
                  : "bg-red-50 border-red-200 text-red-600"
              }`}
            >
              <i className={`fa-solid ${feedback.ok ? "fa-check-circle" : "fa-circle-exclamation"}`} />
              {feedback.msg}
            </div>
          )}

          {/* Profile form card */}
          <div className="bg-white border border-borda rounded-[18px] overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-borda bg-surface-2/50">
              <button
                onClick={() => setTab("personal")}
                className={`flex-1 py-4 text-[13px] font-bold transition-all border-b-2 ${
                  tab === "personal"
                    ? "text-primary border-primary"
                    : "text-textMuted border-transparent hover:text-textMain"
                }`}
              >
                <i className="fa-solid fa-user-gear mr-2" />
                {t("profil_tab_personal")}
              </button>
              <button
                onClick={() => setTab("preferences")}
                className={`flex-1 py-4 text-[13px] font-bold transition-all border-b-2 ${
                  tab === "preferences"
                    ? "text-primary border-primary"
                    : "text-textMuted border-transparent hover:text-textMain"
                }`}
              >
                <i className="fa-solid fa-sliders mr-2" />
                {t("profil_tab_preferences")}
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <form onSubmit={handleSave} className="space-y-6">
                {/* TAB PERSONNEL */}
                <div className={tab !== "personal" ? "hidden" : "space-y-6"}>
                  {/* Photo */}
                  <div className="flex flex-col sm:flex-row items-center gap-5 pb-4 border-b border-bgMain">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-2xl bg-primary-light flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                        {photoPreview ? (
                          <img src={photoPreview} className="w-full h-full object-cover" alt={t("profil_photo_alt")} />
                        ) : (
                          <span className="text-2xl font-bold text-primary">{initials}</span>
                        )}
                      </div>
                      <label
                        htmlFor="photo-input"
                        className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-lg shadow-md border border-borda flex items-center justify-center cursor-pointer hover:bg-surface-2 transition-colors"
                      >
                        <i className="fa-solid fa-camera text-[13px] text-textMuted" />
                        <input
                          ref={photoInputRef}
                          id="photo-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
                      </label>
                    </div>
                    <div className="text-center sm:text-left">
                      <h3 className="font-bold text-[15px] text-textMain">{t("profil_photo_alt")}</h3>
                      <p className="text-[12px] text-textMuted mt-0.5">{t("profil_photo_hint")}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-textMuted uppercase tracking-wide mb-1.5 block">{t("profil_label_firstname")}</label>
                      <input
                        type="text"
                        value={form.prenom}
                        onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                        placeholder={t("profil_placeholder_firstname")}
                        required
                        className="w-full px-4 py-3 bg-bgMain border border-borda rounded-xl text-textMain text-[14px] outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-textMuted uppercase tracking-wide mb-1.5 block">{t("profil_label_lastname")}</label>
                      <input
                        type="text"
                        value={form.nom}
                        onChange={(e) => setForm({ ...form, nom: e.target.value })}
                        placeholder={t("profil_placeholder_lastname")}
                        required
                        className="w-full px-4 py-3 bg-bgMain border border-borda rounded-xl text-textMain text-[14px] outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-bold text-textMuted uppercase tracking-wide mb-1.5 block">{t("profil_label_email")}</label>
                      <input
                        type="email"
                        value={form.email}
                        readOnly
                        className="w-full px-4 py-3 bg-[#F4EFE6] border border-borda rounded-xl text-textMain text-[14px] outline-none cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-textMuted uppercase tracking-wide mb-1.5 block">{t("profil_label_city")}</label>
                      <input
                        type="text"
                        value={form.ville}
                        onChange={(e) => setForm({ ...form, ville: e.target.value })}
                        placeholder={t("profil_placeholder_city")}
                        className="w-full px-4 py-3 bg-bgMain border border-borda rounded-xl text-textMain text-[14px] outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-textMuted uppercase tracking-wide mb-1.5 block">{t("profil_label_phone")}</label>
                      <input
                        type="tel"
                        value={form.telephone}
                        onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                        placeholder={t("profil_placeholder_phone")}
                        className="w-full px-4 py-3 bg-bgMain border border-borda rounded-xl text-textMain text-[14px] outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* TAB PREFERENCES */}
                <div className={tab !== "preferences" ? "hidden" : "space-y-6"}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-textMuted uppercase tracking-wide mb-1.5 block">{t("profil_label_birthdate")}</label>
                      <DatePicker
                        value={form.date_naissance}
                        onChange={(v) => setForm({ ...form, date_naissance: v })}
                        className="w-full px-4 py-3 bg-bgMain border border-borda rounded-xl text-textMain text-[14px] outline-none focus:border-primary transition-colors"
                        placeholder={t("profil_placeholder_date")}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-textMuted uppercase tracking-wide mb-1.5 block">{t("profil_label_birthplace")}</label>
                      <input
                        type="text"
                        value={form.lieu_naissance}
                        onChange={(e) => setForm({ ...form, lieu_naissance: e.target.value })}
                        placeholder={t("profil_placeholder_region")}
                        className="w-full px-4 py-3 bg-bgMain border border-borda rounded-xl text-textMain text-[14px] outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-bold text-textMuted uppercase tracking-wide mb-1.5 block">{t("profil_label_currency")}</label>
                      <select
                        value={form.currency}
                        onChange={(e) => setForm({ ...form, currency: e.target.value })}
                        className="w-full px-4 py-3 bg-bgMain border border-borda rounded-xl text-textMain text-[14px] outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                      >
                        <option value="XAF">{t("profil_currency_xaf")}</option>
                        <option value="EUR">{t("profil_currency_eur")}</option>
                        <option value="USD">{t("profil_currency_usd")}</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-bold text-textMuted uppercase tracking-wide mb-1.5 block">{t("profil_label_language")}</label>
                      <select
                        value={lang}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-3 bg-bgMain border border-borda rounded-xl text-textMain text-[14px] outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                      >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                        <option value="ar" disabled className="text-textMuted">
                          العربية — {t("profil_coming_soon")}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-bgMain">
                  <p className="text-[12px] text-textMuted">&nbsp;</p>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-white text-[14px] font-bold hover:bg-primary-dark transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <><i className="fa-solid fa-spinner fa-spin" /> {t("profil_saving")}</>
                    ) : (
                      <><i className="fa-solid fa-floppy-disk" /> {t("profil_save")}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Change password card */}
          <div className="bg-white border border-borda rounded-[18px] p-5 sm:p-6">
            <h2 className="font-bricolage text-base font-black text-textMain mb-5 flex items-center gap-2">
              <i className="fa-solid fa-lock text-primary" />
              {t("profil_change_password")}
            </h2>
            <form onSubmit={handleChangePw} className="space-y-4 max-w-md">
              <div>
                <label className="text-[11px] font-bold text-textMuted uppercase tracking-wide mb-1.5 block">{t("profil_current_password")}</label>
                <input
                  type="password"
                  value={pwForm.current}
                  onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                  className="w-full px-4 py-3 bg-bgMain border border-borda rounded-xl text-textMain text-[14px] outline-none focus:border-primary transition-colors"
                  required
                  minLength={4}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-textMuted uppercase tracking-wide mb-1.5 block">{t("profil_new_password")}</label>
                <input
                  type="password"
                  value={pwForm.new}
                  onChange={(e) => setPwForm({ ...pwForm, new: e.target.value })}
                  className="w-full px-4 py-3 bg-bgMain border border-borda rounded-xl text-textMain text-[14px] outline-none focus:border-primary transition-colors"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-textMuted uppercase tracking-wide mb-1.5 block">{t("profil_confirm_password")}</label>
                <input
                  type="password"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                  className="w-full px-4 py-3 bg-bgMain border border-borda rounded-xl text-textMain text-[14px] outline-none focus:border-primary transition-colors"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={pwSaving}
                className="px-6 py-3 bg-green-dark text-white rounded-xl font-bold text-[13px] hover:bg-green-mid transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {pwSaving ? (
                  <><i className="fa-solid fa-spinner fa-spin" /> {t("profil_updating")}</>
                ) : (
                  <><i className="fa-solid fa-lock" /> {t("profil_update_password")}</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
