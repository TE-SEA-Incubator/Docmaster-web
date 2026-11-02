import { useEffect, useState } from "react";
import { useI18n } from "../../context/I18nContext";
import { adminService } from "../../services/admin";
import { paymentsService } from "../../services/paymentsService";
import type { SavedPaymentMethod } from "../../services/paymentsService";
import InfoTooltip from "../../components/ui/InfoTooltip";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";

export default function AdminSettings() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [pointsRate, setPointsRate] = useState<number>(10);
  const [pointsRatePreview, setPointsRatePreview] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      adminService.getAllSettings(),
      fetch("/api/points/rate").then((r) => r.json()).catch(() => ({ rate: 10 })),
    ])
      .then(([settingsData, pointsData]) => {
        setSettings(settingsData);
        const rate = pointsData.rate ?? 10;
        setPointsRate(rate);
        setPointsRatePreview(rate);
      })
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

  const savePointsRate = async () => {
    setSaving("points_to_xaf_rate");
    setSaved(false);
    try {
      await adminService.updateSetting("points_to_xaf_rate", String(pointsRatePreview));
      setPointsRate(pointsRatePreview);
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
    <div className="max-w-4xl">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">{t("admin_settings")}</h1>
          <InfoTooltip text="Paramètres généraux de l'application." />
        </div>
        <p className="text-gray-500 text-[13px] mt-0.5">{t("admin_settings_subtitle")}</p>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-[13px] flex items-center gap-2">
          <i className="ph ph-check-circle text-green-600 shrink-0" />
          {t("admin_setting_updated")}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Points & Rewards */}
        <div className="bg-white border border-gray-200 rounded p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
              <i className="ph ph-star text-[#E8923A] text-sm" />
            </div>
            <h2 className="font-bold text-base text-gray-900">Points &amp; Récompenses</h2>
          </div>
          <p className="text-gray-500 text-[12px] mb-5">Conversion points → argent</p>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded mb-4">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              Combien de points pour 1 XAF ?
              <InfoTooltip text="Ex: 10 signifie 10 pts = 1 XAF" />
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number" min="1"
                  value={pointsRatePreview}
                  onChange={(e) => setPointsRatePreview(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] font-bold text-gray-800"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">pts / 1 XAF</span>
              </div>
              <button
                onClick={savePointsRate}
                disabled={saving === "points_to_xaf_rate" || pointsRatePreview === pointsRate}
                className="px-4 py-2.5 bg-[#2D5A42] text-white text-[12px] font-semibold rounded hover:bg-[#2D5A42] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {saving === "points_to_xaf_rate" ? <i className="ph ph-spinner animate-spin text-xs" /> : <><i className="ph ph-check text-xs" /> Appliquer</>}
              </button>
            </div>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded mb-4">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Aperçu en temps réel</label>
            <div className="space-y-1.5">
              {[100, 500, 1000, 10000].map((pts) => (
                <div key={pts} className="flex justify-between text-[13px]">
                  <span className="text-gray-500">{pts.toLocaleString()} pts =</span>
                  <span className={`font-bold ${pts === 10000 ? "text-[#E8923A]" : "text-gray-800"}`}>
                    {Math.round(pts / pointsRatePreview).toLocaleString()} XAF
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[12px] text-amber-700 flex items-center gap-2">
            <i className="ph ph-info shrink-0" />
            <span><strong>Actuel :</strong> {pointsRate} pts = 1 XAF</span>
          </div>
        </div>

        {/* General settings */}
        <div className="bg-white border border-gray-200 rounded p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
              <i className="ph ph-sliders-horizontal text-gray-500 text-sm" />
            </div>
            <h2 className="font-bold text-base text-gray-900">Autres paramètres</h2>
          </div>
          {Object.keys(settings).length === 0 ? (
            <EmptyState icon="ph ph-sliders-horizontal" message={t("admin_no_settings")} />
          ) : (
            <div className="space-y-2">
              {Object.entries(settings).filter(([key]) => key !== "points_to_xaf_rate").map(([key, value]) => (
                <SettingRow key={key} k={key} value={value} update={update} saving={saving} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Individual Setting Row ── */

const SETTING_META: Record<string, { label: string; icon: string; hint?: string }> = {
  min_withdrawal_amount: { label: "Retrait minimum", icon: "ph ph-money-wavy", hint: "Montant minimum pour effectuer un retrait (XAF)" },
  points_per_declaration: { label: "Points / déclaration", icon: "ph ph-file-text", hint: "Points gagnés par déclaration soumise" },
  referral_points_parrain: { label: "Points parrainage", icon: "ph ph-users-three", hint: "Points gagnés par parrainage" },
};

function SettingRow({ k, value, update, saving, t }: { k: string; value: string; update: (k: string, v: string) => Promise<void>; saving: string | null; t: (k: string) => string }) {
  const [local, setLocal] = useState(value);
  const [saved, setSaved] = useState(false);
  const meta = SETTING_META[k] || { label: k.replace(/_/g, " "), icon: "ph ph-gear" };
  const changed = local !== value;

  const handleSave = async () => {
    if (!changed) return;
    await update(k, local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 p-3 border border-gray-200 rounded bg-white hover:border-gray-300 transition-colors">
      <div className="w-8 h-8 rounded border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
        <i className={`${meta.icon} text-gray-400 text-sm`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-1">
          <label className="text-[13px] font-semibold text-gray-700">{meta.label}</label>
          {meta.hint && <InfoTooltip text={meta.hint} />}
        </div>
        <input
          type="text"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] outline-none focus:border-[#E8923A] transition-colors"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={!changed || saving === k}
        className="px-3 py-2 bg-[#2D5A42] text-white text-[12px] font-semibold rounded hover:bg-[#2D5A42] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 flex-shrink-0"
      >
        {saving === k ? (
          <i className="ph ph-spinner animate-spin text-xs" />
        ) : saved ? (
          <><i className="ph ph-check text-xs" /> {t("admin_setting_saved")}</>
        ) : (
          <><i className="ph ph-floppy-disk text-xs" /> Enregistrer</>
        )}
      </button>
    </div>
  );
}
