import { useI18n } from "../../context/I18nContext";

interface Step {
  label: string
  icon?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  orientation?: "horizontal" | "vertical"
}

export default function Stepper({ steps, currentStep, orientation = "horizontal" }: StepperProps) {
  const { t } = useI18n();
  if (orientation === "vertical") {
    return (
      <div className="space-y-0">
        {steps.map((s, i) => {
          const idx = i + 1;
          const done = idx < currentStep;
          const active = idx === currentStep;
          return (
            <div key={i}>
              <div className="flex items-start gap-3 py-1.5">
                <div className={`flex-shrink-0 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                  done ? "bg-primary border-primary text-white" :
                  active ? "bg-green-dark border-green-dark text-white shadow-[0_0_0_3px_rgba(30,58,47,0.15)]" :
                  "bg-white border-borda text-textMuted"
                }`}>
                  {done ? <i className="fa-solid fa-check text-[9px]" /> : idx}
                </div>
                <div className="min-w-0">
                  <p className={`text-[12px] font-semibold leading-tight ${
                    active ? "text-green-dark" : done ? "text-textMain" : "text-textMuted"
                  }`}>{s.label}</p>
                  <p className="text-[10px] text-textMuted">{active ? t("stepper_in_progress") : done ? t("stepper_completed") : t("stepper_pending")}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-[2px] h-5 ml-[12px] ${done || active ? "bg-primary" : "bg-borda"}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 mb-6">
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = idx < currentStep;
        const active = idx === currentStep;
        return (
          <div key={i} className="flex items-center gap-3 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
              active ? "bg-green-dark text-white shadow-lg shadow-green-dark/20" :
              done ? "bg-primary text-white" :
              "bg-white border-2 border-borda text-textMuted"
            }`}>
              {done ? <i className="fa-solid fa-check text-[10px]" /> : idx}
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 rounded ${idx <= currentStep ? "bg-primary" : "bg-borda"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
