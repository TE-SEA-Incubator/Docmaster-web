import type { ReactNode } from "react";
import { Alert } from "@mantine/core";

export function FlowCard({
  title,
  icon,
  aside,
  children,
  id,
  className = "",
}: {
  title?: ReactNode;
  icon?: string;
  aside?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`bg-surface border border-borderMain rounded-3xl overflow-hidden ${className}`}
    >
      {(title || aside) && (
        <header className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-borderMain">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <i className={`${icon} text-textMuted text-sm`} aria-hidden="true" />}
            <h2 className="font-bricolage text-[15px] sm:text-base font-bold text-textMain truncate">{title}</h2>
          </div>
          {aside && <div className="flex items-center gap-2 flex-shrink-0">{aside}</div>}
        </header>
      )}
      <div className="px-5 sm:px-6 py-5 sm:py-6">{children}</div>
    </section>
  );
}

export function FlowStepper({
  steps,
  current,
  caption,
}: {
  steps: string[];
  current: number;
  caption: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold text-textMuted uppercase tracking-widest">{caption}</p>
      <ol className="flex items-start mt-3">
        {steps.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className="relative flex-1 min-w-0 flex flex-col items-center"
            >
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute top-4 right-1/2 -left-1/2 h-[2px] ${done || active ? "bg-green-dark" : "bg-borderMain"}`}
                />
              )}
              <span
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border-2 bg-surface ${
                  done
                    ? "border-green-dark bg-green-dark text-white"
                    : active
                      ? "border-primary text-white bg-primary"
                      : "border-borderMain text-textMuted"
                }`}
              >
                {done ? <i className="ph ph-check text-[10px]" aria-hidden="true" /> : n}
              </span>
              <span
                className={`mt-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-tight text-center leading-tight ${
                  active ? "text-primary-dark" : done ? "text-green-dark" : "text-textMuted"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function FlowFact({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] sm:text-[11px] font-bold text-textMuted uppercase tracking-wider">{label}</p>
      <p
        className={`mt-1 text-[13px] sm:text-sm font-semibold text-textMain break-words ${mono ? "font-mono tabular-nums" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

export function FlowNotice({
  tone = "gray",
  icon,
  children,
}: {
  tone?: "gray" | "green" | "orange" | "red" | "blue";
  icon?: string;
  children: ReactNode;
}) {
  return (
    <Alert color={tone} variant="light" radius="md" icon={<i className={icon || "ph ph-info"} aria-hidden="true" />}>
      <div className="text-[12px] sm:text-[13px] leading-relaxed font-medium">{children}</div>
    </Alert>
  );
}
