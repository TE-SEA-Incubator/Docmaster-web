import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../context/I18nContext";
import { useAuth } from "../../context/AuthContext";
import { declarationsService, type Declaration } from "../../services/declarationsService";
import { buildGapPatch, declarationGaps, type DeclarationLike } from "../../utils/declarationGaps";
import { extractApiError } from "../../utils/extractApiError";

interface Props {
  declaration: DeclarationLike;
  onClose: () => void;
  onSaved: (updated: Declaration) => void;
}

export default function CompleteDeclarationModal({ declaration, onClose, onSaved }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();

  const gaps = useMemo(() => declarationGaps(declaration), [declaration]);
  const profileName = `${user?.prenom || ""} ${user?.nom || ""}`.trim();

  const initialValues = useMemo(() => {
    const values: Record<string, string> = {};
    for (const gap of gaps) {
      values[gap.key] =
        gap.key === "owner_name"
          ? profileName
          : gap.key === "ville"
          ? String(user?.ville || "")
          : gap.key === "telephone_contact"
          ? String(user?.telephone || "")
          : gap.key === "email_contact"
          ? String(user?.email || "")
          : "";
    }
    return values;
  }, [gaps, profileName, user?.ville, user?.telephone, user?.email]);

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const patch = buildGapPatch(gaps, values);
  const canSave = Object.keys(patch).length > 0;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await declarationsService.update(declaration.id, patch);
      // C'est la ligne relue par le serveur qui alimente l'affichage, pas une promesse locale.
      onSaved(res.data);
    } catch (err: any) {
      setError(extractApiError(err));
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-green-dark/60 backdrop-blur-md z-[220] flex items-center justify-center p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white rounded-[28px] shadow-2xl max-w-[440px] w-full p-6 sm:p-8 animate-in slide-in-from-bottom-6 duration-300 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="font-bricolage text-lg sm:text-xl font-black text-textMain">
              {t("mesdeclarations_complete_title")}
            </h2>
            <p className="text-[12px] sm:text-[13px] text-textMuted leading-relaxed mt-1">
              {t("mesdeclarations_complete_intro")}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-textMuted hover:text-textMain transition-colors disabled:opacity-40"
            aria-label={t("detail_close")}
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        <div className="space-y-4">
          {gaps.map((gap) => (
            <div key={gap.key}>
              <label className="block text-[10px] font-bold text-textMuted uppercase tracking-widest mb-1.5">
                {t(gap.labelKey)}
              </label>
              {gap.input === "textarea" ? (
                <textarea
                  rows={3}
                  value={values[gap.key] || ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [gap.key]: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-borderMain bg-white text-sm text-textMain focus:border-primary focus:outline-none transition-colors resize-none"
                />
              ) : (
                <input
                  type={gap.input === "tel" ? "tel" : gap.input === "date" ? "date" : gap.input === "email" ? "email" : "text"}
                  value={values[gap.key] || ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [gap.key]: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-borderMain bg-white text-sm text-textMain focus:border-primary focus:outline-none transition-colors"
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-4 text-[12px] sm:text-[13px] font-semibold text-red-500 leading-relaxed">{error}</p>
        )}

        <div className="grid grid-cols-2 gap-3 mt-7">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3.5 border-2 border-borderMain bg-white text-textMain rounded-2xl text-sm font-bold hover:bg-bgMain transition-all active:scale-95 disabled:opacity-50"
          >
            {t("mesdeclarations_cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-6 py-3.5 bg-primary text-white rounded-2xl font-bricolage font-black text-sm hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <i className="fa-solid fa-spinner fa-spin" />
            ) : (
              <i className="fa-solid fa-check" />
            )}
            {t("mesdeclarations_complete_save")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
