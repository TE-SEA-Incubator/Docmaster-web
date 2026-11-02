import { describe, expect, it } from "vitest";

import { lostRecoveryTarget } from "./recoveryTargets";

describe("lostRecoveryTarget", () => {
  it("ouvre directement la récupération quand un seul document trouvé est actif", () => {
    expect(
      lostRecoveryTarget("lost-1", [
        { id: "match-1", status: "PENDING", found_declaration_id: "found-1" },
        { id: "match-old", status: "REJECTED", found_declaration_id: "found-old" },
      ]),
    ).toEqual({
      href: "/recuperer?id=lost-1&match=match-1&found=found-1",
      multiple: false,
      hasMatch: true,
    });
  });

  it("garde la page des correspondances quand plusieurs documents sont actifs", () => {
    expect(
      lostRecoveryTarget("lost-1", [
        { id: "match-1", status: "PENDING", found_declaration_id: "found-1" },
        { id: "match-2", status: "CONFIRMED", found_declaration_id: "found-2" },
      ]),
    ).toEqual({
      href: "/correspondances?id=lost-1",
      multiple: true,
      hasMatch: true,
    });
  });

  it("ne propose pas de récupération sans correspondance active", () => {
    expect(lostRecoveryTarget("lost-1", [])).toEqual({
      href: "/correspondances?id=lost-1",
      multiple: false,
      hasMatch: false,
    });
  });

  it("ignore une correspondance sans document trouvé exploitable", () => {
    expect(
      lostRecoveryTarget("lost-1", [{ id: "match-1", status: "PENDING" }]),
    ).toEqual({
      href: "/correspondances?id=lost-1",
      multiple: false,
      hasMatch: false,
    });
  });
});
