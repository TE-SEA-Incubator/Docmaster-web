import { describe, it, expect } from "vitest";

import { matchRecoveryTarget } from "./notificationTargets";

describe("matchRecoveryTarget", () => {
  it("ouvre directement la récupération du propriétaire", () => {
    expect(
      matchRecoveryTarget("MATCH_FOUND", {
        docId: "lost-1",
        matchId: "match-1",
        foundId: "found-1",
        matchType: "LOST_SIDE",
      })
    ).toBe("/recuperer?id=lost-1&match=match-1&found=found-1");
    expect(
      matchRecoveryTarget("MATCH_POTENTIAL", {
        lostId: "lost-2",
        matchId: "match-2",
        foundId: "found-2",
        matchType: "LOST_SIDE",
      })
    ).toBe("/recuperer?id=lost-2&match=match-2&found=found-2");
  });

  it("retombe sur la liste quand le match n'est pas identifié", () => {
    expect(matchRecoveryTarget("MATCH_FOUND", { docId: "lost-1", matchType: "LOST_SIDE" })).toBe(
      "/correspondances?id=lost-1"
    );
  });

  it("oriente le trouveur vers les pertes associées à sa trouvaille", () => {
    expect(matchRecoveryTarget("MATCH_FOUND", { foundId: "found-1", matchType: "FOUND_SIDE" })).toBe(
      "/correspondances?id=found-1"
    );
  });

  it("oriente le trouveur payé vers la validation de la remise", () => {
    expect(matchRecoveryTarget("PAYMENT_PENDING", { docId: "lost-1", foundId: "found-1" })).toBe(
      "/rendre?id=found-1"
    );
  });

  it("renvoie le candidat évincé vers son tableau de bord", () => {
    expect(matchRecoveryTarget("MATCH_CLOSED", { foundId: "found-1" })).toBe("/dashboard");
  });

  it("ignore les autres types de notification", () => {
    expect(matchRecoveryTarget("PAYMENT_RECEIVED", { docId: "lost-1", matchType: "LOST_SIDE" })).toBeNull();
    expect(matchRecoveryTarget(undefined, null)).toBeNull();
  });

  it("ne construit pas une route sans identifiant exploitable", () => {
    expect(matchRecoveryTarget("match_found", { matchType: "LOST_SIDE" })).toBeNull();
  });
});
