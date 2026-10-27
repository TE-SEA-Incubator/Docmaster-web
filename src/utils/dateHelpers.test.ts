import { afterEach, describe, expect, it, vi } from "vitest";
import { todayISO } from "./dateHelpers";

/**
 * Référence calculée avec les getters locaux : c'est ce qui sépare `todayISO()`
 * d'un `toISOString().slice(0, 10)`, dont la troncature rend la veille des que la
 * machine n'est pas a l'UTC.
 */
const localISO = (d: Date) =>
  [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, "0")).join("-");

describe("todayISO", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("suit le jour local et non le jour UTC", () => {
    const now = new Date("2026-10-19T23:30:00Z");
    vi.useFakeTimers({ now });
    expect(todayISO()).toBe(localISO(now));
  });

  it("garde le format YYYY-MM-DD sur deux chiffres", () => {
    vi.useFakeTimers({ now: new Date(2026, 0, 5, 10, 0, 0) });
    expect(todayISO()).toBe("2026-01-05");
  });
});
