import { useEffect, useState } from "react";
import apiClient from "../services/api";

/**
 * Delais partages servis par l'API (`GET /settings/timing`).
 * Les valeurs de repli ne servent qu'avant la reponse : une fois chargees,
 * tous les ecrans attendent exactement les memes durees que le serveur.
 */
export interface TimingConfig {
  matchingIntervalMs: number;
  paymentPollIntervalMs: number;
  paymentPollTimeoutMs: number;
  paymentPhaseOperatorMs: number;
  paymentPhaseProcessingMs: number;
  claimCodeTtlHours: number;
  emailVerificationTtlMinutes: number;
}

const DEFAULTS: TimingConfig = {
  matchingIntervalMs: 30_000,
  paymentPollIntervalMs: 5_000,
  paymentPollTimeoutMs: 300_000,
  paymentPhaseOperatorMs: 60_000,
  paymentPhaseProcessingMs: 120_000,
  claimCodeTtlHours: 72,
  emailVerificationTtlMinutes: 10,
};

let cached: TimingConfig | null = null;
let pending: Promise<TimingConfig> | null = null;

function loadTiming(): Promise<TimingConfig> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = apiClient
      .get("settings/timing")
      .then((res) => {
        const data = res.data?.data;
        cached = data ? { ...DEFAULTS, ...data } : DEFAULTS;
        return cached;
      })
      .catch(() => DEFAULTS)
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

export function useTimingConfig(): TimingConfig {
  const [config, setConfig] = useState<TimingConfig>(cached ?? DEFAULTS);

  useEffect(() => {
    let mounted = true;
    loadTiming().then((value) => {
      if (mounted) setConfig(value);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return config;
}
