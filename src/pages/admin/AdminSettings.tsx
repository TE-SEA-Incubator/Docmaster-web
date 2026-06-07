import { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";
import InfoTooltip from "../../components/ui/InfoTooltip";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";

export default function AdminSettings() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminService
      .getAllSettings()
      .then(setSettings)
      .catch(() => setSettings({}))
      .finally(() => setLoading(false));
  }, []);

  const update = async (key: string, value: string) => {
    setSaving(key);
    setSaved(false);
    try {
      await adminService.updateSetting(key, value);
      setSettings((prev) => ({ ...prev, [key]: value }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {} finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="font-bricolage text-2xl font-black text-gray-900">{t("admin_settings")}</h1>
          <InfoTooltip text="Paramètres généraux de l'application. Modifiez les valeurs directement et cliquez ailleurs pour sauvegarder." />
        </div>
        <p className="text-gray-400 text-[13px] font-medium mt-1">{t("admin_settings_subtitle")}</p>
      </div>

      {saved && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-[12px] font-semibold flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
            <i className="fa-solid fa-check-circle text-emerald-600 text-sm" />
          </div>
          {t("admin_setting_updated")}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm">
        {Object.keys(settings).length === 0 ? (
          <EmptyState icon="fa-solid fa-sliders" message={t("admin_no_settings")} />
        ) : (
          <div className="space-y-4">
            {Object.entries(settings).map(([key, value]) => (
              <div key={key} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <label className="text-[13px] font-semibold text-gray-700 w-44 flex-shrink-0 capitalize">
                  {key.replace(/_/g, " ")}
                </label>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    defaultValue={value}
                    onBlur={(e) => {
                      if (e.target.value !== value) update(key, e.target.value);
                    }}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  {saving === key && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <i className="fa-solid fa-spinner fa-spin text-primary" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
