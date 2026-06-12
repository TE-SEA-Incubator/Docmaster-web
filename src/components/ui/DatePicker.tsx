import { useRef, useEffect } from "react";
import flatpickr from "flatpickr";
import { French } from "flatpickr/dist/l10n/fr.js";
import "flatpickr/dist/flatpickr.min.css";
import "./flatpickr-override.css";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  icon?: string;
  disabled?: boolean;
}

function isValidDateString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0 && !isNaN(new Date(v).getTime());
}

export default function DatePicker({ value, onChange, className, placeholder, icon, disabled }: DatePickerProps) {
  const ref = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const safeValue = isValidDateString(value) ? value : "";

  useEffect(() => {
    if (disabled) return;
    fpRef.current = flatpickr(ref.current!, {
      locale: French,
      dateFormat: "Y-m-d",
      defaultDate: safeValue || undefined,
      onChange: (dates) => {
        if (dates[0]) {
          const y = dates[0].getFullYear();
          const m = String(dates[0].getMonth() + 1).padStart(2, "0");
          const d = String(dates[0].getDate()).padStart(2, "0");
          onChangeRef.current(`${y}-${m}-${d}`);
        } else {
          onChangeRef.current("");
        }
      },
    });

    return () => fpRef.current?.destroy();
  }, [disabled]);

  useEffect(() => {
    const fp = fpRef.current;
    if (!fp) return;
    if (!safeValue) {
      fp.clear(false);
    } else if (fp.selectedDates[0]?.toISOString().split("T")[0] !== safeValue) {
      fp.setDate(safeValue, false);
    }
  }, [safeValue]);

  return (
    <div className="relative">
      {icon && <i className={`${icon} absolute left-[13px] top-0 bottom-0 flex items-center text-textMuted text-[13px] pointer-events-none z-10`} />}
      <input
        ref={ref}
        type="text"
        placeholder={placeholder}
        readOnly
        disabled={disabled}
        autoComplete="off"
        inputMode="none"
        className={className || "w-full px-4 py-3 bg-bgMain border border-borda rounded-xl text-textMain text-[14px] outline-none focus:border-primary transition-colors"}
      />
    </div>
  );
}
