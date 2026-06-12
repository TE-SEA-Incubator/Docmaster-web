import React from 'react';
import { useI18n } from "../../context/I18nContext";

interface Props {
  planName: string;
  usage: any;
  loading: boolean;
}

export const CurrentPlanCard: React.FC<Props> = ({ planName, usage, loading }) => {
  const { t } = useI18n();
  const percentage = usage?.percentage || 0;

  return (
    <div className="bg-green-dark rounded-[24px] p-6 text-white shadow-2xl shadow-green-950/40 w-full relative">
      {/* Decorative blobs - simplified for mobile */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-3 py-1 mb-4 inline-flex">
          <i className="fa-solid fa-bolt text-primary text-[10px]" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{t("abonnement_current_plan")}</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold leading-tight mb-4">
          {loading ? (
            <span className="inline-block w-40 h-8 bg-white/10 rounded animate-pulse" />
          ) : (
            `${t("abonnement_plan")} ${planName}`
          )}
        </h1>

        <div className="mb-6">
          <p className="text-white/70 text-sm mb-1">Quota utilisé</p>
          <div className="flex items-end gap-2">
            <strong className="text-3xl font-bold">{usage?.usage?.objects || 0}</strong>
            <span className="text-white/50 text-sm mb-1">/ {usage?.limits?.objects || 0} objets</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/50 text-[10px] uppercase font-bold">Déclarations</p>
                <p className="text-lg font-bold">{usage?.limits?.docs_per_type || 0}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/50 text-[10px] uppercase font-bold">Capacité</p>
                <p className="text-lg font-bold">{percentage}%</p>
            </div>
        </div>
      </div>
    </div>
  );
};
