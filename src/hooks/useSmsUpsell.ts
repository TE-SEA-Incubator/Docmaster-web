import { useCallback, useEffect, useState } from "react";
import { subscriptionsService } from "../services/subscriptionsService";
import type { Plan } from "../types/api";

export interface SmsUpsellState {
  ready: boolean;
  show: boolean;
  planName: string;
  planPrice: number;
}

const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
const EMPTY: SmsUpsellState = { ready: false, show: false, planName: "", planPrice: 0 };

let current: SmsUpsellState = EMPTY;
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function grantsSms(plan: Plan): boolean {
  const f = (plan.features ?? {}) as Record<string, unknown>;
  const alerts = Array.isArray(f.alerts) ? (f.alerts as string[]) : [];
  return f.sms_alerts === true || alerts.includes("sms") || alerts.includes("all");
}

function computeState(limits: Record<string, unknown> | null, plans: Plan[]): SmsUpsellState {
  const cheapest = plans
    .filter((p) => grantsSms(p) && Number(p.price) > 0)
    .sort((a, b) => Number(a.price) - Number(b.price))[0];

  return {
    ready: true,
    show: Boolean(limits) && limits!.sms_alerts !== true && Boolean(cheapest),
    planName: String(cheapest?.name ?? ""),
    planPrice: Number(cheapest?.price ?? 0),
  };
}

function publish(next: SmsUpsellState) {
  current = next;
  listeners.forEach((l) => l());
}

async function load() {
  const [usageRes, plansRes] = await Promise.all([
    subscriptionsService.getUsage().catch(() => null),
    subscriptionsService.getAllPlans().catch(() => null),
  ]);
  publish(
    computeState(
      (usageRes?.data as { limits?: Record<string, unknown> } | null)?.limits ?? null,
      plansRes?.data ?? []
    )
  );
}

/** Feeds the cache from data a page already fetched (e.g. after a plan change). */
export function seedSmsUpsell(usageData: unknown, plans: Plan[]) {
  const limits = (usageData as { limits?: Record<string, unknown> } | null)?.limits ?? null;
  if (limits) publish(computeState(limits, plans));
}

function startLoad() {
  if (inflight || current.ready) return;
  inflight = load().finally(() => {
    inflight = null;
  });
}

function readSnooze(key: string): boolean {
  try {
    return Number(localStorage.getItem(key) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function writeSnooze(key: string) {
  try {
    localStorage.setItem(key, String(Date.now() + SNOOZE_MS));
  } catch {
    console.warn("[useSmsUpsell] localStorage indisponible");
  }
}

export function useSmsUpsell(): SmsUpsellState {
  const [state, setState] = useState(current);

  useEffect(() => {
    const onChange = () => setState(current);
    listeners.add(onChange);
    startLoad();
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  return state;
}

export function useUpsellSnooze(spot: string) {
  const key = `docmaster.smsUpsell.${spot}`;
  const [snoozed, setSnoozed] = useState(() => readSnooze(key));

  const snooze = useCallback(() => {
    writeSnooze(key);
    setSnoozed(true);
  }, [key]);

  return { snoozed, snooze };
}
