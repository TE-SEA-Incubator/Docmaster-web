import { useI18n } from "../../context/I18nContext";

interface Step {
  label: string;
  icon?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  orientation?: "horizontal" | "vertical";
}

export default function Stepper({
  steps,
  currentStep,
  orientation = "horizontal",
}: StepperProps) {
  const { t } = useI18n();
  if (orientation === "vertical") {
    return (
      <div className="space-y-0">
        {steps.map((step, i) => {
          const idx = i + 1;
          const isDone = idx < currentStep;
          const isActive = idx === currentStep;

          return (
            <div key={i}>
              {/* Step */}
              <div className="flex items-start gap-3 py-3">
                {/* Circle */}
                <div
                  className={`flex-shrink-0 w-[26px] h-[26px] rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    isDone
                      ? "bg-primary border-primary text-white"
                      : isActive
                        ? "bg-green-dark border-green-dark text-white shadow-lg shadow-green-dark/20"
                        : "bg-white border-borderMain text-textMuted"
                  }`}
                >
                  {isDone ? (
                    <i className="fa-solid fa-check text-xs"></i>
                  ) : (
                    <span>{idx}</span>
                  )}
                </div>

                {/* Label & Status */}
                <div className="min-w-0 pt-0.5">
                  <p
                    className={`text-xs font-bold leading-tight ${
                      isActive
                        ? "text-green-dark"
                        : isDone
                          ? "text-textMain"
                          : "text-textMuted"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-textMuted mt-0.5">
                    {isActive ? t("stepper_in_progress") : isDone ? t("stepper_completed") : t("stepper_pending")}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {i < steps.length - 1 && (
                <div
                  className={`w-[2px] h-5 ml-[12px] ${
                    isDone || isActive ? "bg-primary" : "bg-borderMain"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal orientation
  return (
    <div className="flex items-center gap-3 mb-6">
      {steps.map((step, i) => {
        const idx = i + 1;
        const isDone = idx < currentStep;
        const isActive = idx === currentStep;

        return (
          <div key={i} className="flex items-center gap-3 flex-1">
            {/* Circle */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                isActive
                  ? "bg-green-dark text-white shadow-lg shadow-green-dark/20"
                  : isDone
                    ? "bg-primary text-white"
                    : "bg-white border-2 border-borderMain text-textMuted"
              }`}
            >
              {isDone ? (
                <i className="fa-solid fa-check text-xs"></i>
              ) : (
                <span>{idx}</span>
              )}
            </div>

            {/* Connector Line */}
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 rounded ${
                  idx <= currentStep ? "bg-primary" : "bg-borderMain"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}