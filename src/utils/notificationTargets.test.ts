import { describe, it, expect } from "vitest";

import { matchRecoveryTarget } from "./notificationTargets";

describe("matchRecoveryTarget", () => {
  it("ouvre le parcours de récupération sur le signal reçu par le propriétaire", () => {
    expect(matchRecoveryTarget("MATCH_FOUND", { docId: "lost-1", matchType: "LOST_SIDE" })).toBe(
      "/recuperer?id=lost-1"
    );
  });

  it("reste muet pour le trouveur : la notification ne porte que l id de la déclaration perdue", () => {
    expect(matchRecoveryTarget("MATCH_FOUND", { docId: "lost-1", matchType: "FOUND_SIDE" })).toBeNull();
  });

  it("ignore les autres types de notification", () => {
    expect(matchRecoveryTarget("PAYMENT_RECEIVED", { docId: "lost-1", matchType: "LOST_SIDE" })).toBeNull();
    expect(matchRecoveryTarget(undefined, null)).toBeNull();
  });

  it("ne construit pas une route sans identifiant exploitable", () => {
    expect(matchRecoveryTarget("match_found", { matchType: "LOST_SIDE" })).toBeNull();
  });
});
