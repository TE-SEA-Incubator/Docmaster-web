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
    <div className="max-w-5xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="font-bricolage text-2xl font-black text-gray-900">{t("admin_settings")}</h1>
          <InfoTooltip text="Paramètres généraux de l'application." />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Points & Rewards ── */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <i className="fa-solid fa-star text-primary text-sm" />
            </div>
            <h2 className="font-bricolage text-[17px] font-bold text-gray-900">Points & Récompenses</h2>
          </div>
          <p className="text-gray-400 text-[12px] font-medium mb-5">Conversion points → argent</p>

          {/* Conversion rate */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 mb-4">
            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Combien de points pour 1 XAF ?
              <InfoTooltip text="Définissez le nombre de points nécessaires pour obtenir 1 XAF. Ex: 10 signifie 10 pts = 1 XAF" />
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  value={pointsRatePreview}
                  onChange={(e) => setPointsRatePreview(Number(e.target.value) || 1)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-bold text-gray-800"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 font-medium">pts / 1 XAF</span>
              </div>
              <button
                onClick={savePointsRate}
                disabled={saving === "points_to_xaf_rate" || pointsRatePreview === pointsRate}
                className="px-5 py-3 bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[12px] rounded-xl transition-all flex items-center gap-2"
              >
                {saving === "points_to_xaf_rate" ? (
                  <><i className="fa-solid fa-spinner fa-spin" /></>
                ) : (
                  <><i className="fa-solid fa-check" /> Appliquer</>
                )}
              </button>
            </div>
          </div>

          {/* Live preview */}
          <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/[0.02] rounded-xl border border-primary/10 mb-4">
            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Aperçu en temps réel
            </label>
            <div className="space-y-2">
              {[100, 500, 1000, 10000].map((pts) => (
                <div key={pts} className="flex justify-between text-[13px]">
                  <span className="text-gray-500">{pts.toLocaleString()} points =</span>
                  <span className={`font-bold ${pts === 10000 ? "text-primary" : "text-gray-800"}`}>
                    {Math.round(pts / pointsRatePreview).toLocaleString()} XAF
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-700 flex items-start gap-2.5">
            <i className="fa-solid fa-circle-info mt-0.5" />
            <div>
              <span className="font-bold">Actuel :</span> {pointsRate} pts = 1 XAF
            </div>
          </div>
        </div>

        {/* ── Right: General Settings ── */}
        <div className="bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <i className="fa-solid fa-sliders text-gray-500 text-sm" />
            </div>
            <h2 className="font-bricolage text-[17px] font-bold text-gray-900">Autres paramètres</h2>
          </div>
          {Object.keys(settings).length === 0 ? (
            <EmptyState icon="fa-solid fa-sliders" message={t("admin_no_settings")} />
          ) : (
            <div className="space-y-3">
              {Object.entries(settings).filter(([key]) => key !== "points_to_xaf_rate").map(([key, value]) => (
                <SettingRow
                  key={key}
                  k={key}
                  value={value}
                  update={update}
                  saving={saving}
                  t={t}
                />
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
  min_withdrawal_amount: { label: "Retrait minimum", icon: "fa-money-bill-wave", hint: "Montant minimum pour effectuer un retrait (XAF)" },
  points_per_declaration: { label: "Points / déclaration", icon: "fa-file-lines", hint: "Points gagnés par déclaration soumise" },
  referral_points_parrain: { label: "Points parrainage", icon: "fa-user-group", hint: "Points gagnés par parrainage" },
};

function SettingRow({ k, value, update, saving, t }: { k: string; value: string; update: (k: string, v: string) => Promise<void>; saving: string | null; t: (k: string) => string }) {
  const [local, setLocal] = useState(value);
  const [saved, setSaved] = useState(false);
  const meta = SETTING_META[k] || { label: k.replace(/_/g, " "), icon: "fa-gear" };
  const changed = local !== value;

  const handleSave = async () => {
    if (!changed) return;
    await update(k, local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-all">
      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <i className={`fa-solid ${meta.icon} text-gray-400 text-sm`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <label className="text-[13px] font-semibold text-gray-700">{meta.label}</label>
          {meta.hint && (
            <InfoTooltip text={meta.hint} />
          )}
        </div>
        <input
          type="text"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={!changed || saving === k}
        className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-30 disabled:cursor-not-allowed text-white text-[12px] font-bold rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0"
      >
        {saving === k ? (
          <i className="fa-solid fa-spinner fa-spin" />
        ) : saved ? (
          <><i className="fa-solid fa-check" /> {t("admin_setting_saved")}</>
        ) : (
          <><i className="fa-solid fa-floppy-disk" /> Enregistrer</>
        )}
      </button>
    </div>
  );
}
