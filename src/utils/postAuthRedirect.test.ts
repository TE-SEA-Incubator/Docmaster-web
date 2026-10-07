import { describe, expect, it } from "vitest";
import type { Location } from "react-router-dom";
import { postAuthRedirect } from "./postAuthRedirect";

function at(state?: unknown, pathname = "/login"): Location {
  return { key: "default", pathname, search: "", hash: "", state } as Location;
}

describe("postAuthRedirect — ne pas perdre la page visée avant la connexion", () => {
  it("reprend la déclaration pré-remplie que ProtectedRoute a mémorisée", () => {
    const location = at({ from: { pathname: "/declarer", search: "?from=decl-found-1" } });
    expect(postAuthRedirect(location, new URLSearchParams())).toBe("/declarer?from=decl-found-1");
  });

  it("le ?redirect passe avant la page mémorisée", () => {
    const location = at({ from: { pathname: "/recuperer", search: "?id=1" } });
    const params = new URLSearchParams({ redirect: "/transfert-appareil?token=abc" });
    expect(postAuthRedirect(location, params)).toBe("/transfert-appareil?token=abc");
  });

  it("défaut sur le tableau de bord quand rien n'a été demandé", () => {
    expect(postAuthRedirect(at(), new URLSearchParams())).toBe("/dashboard");
    expect(postAuthRedirect(at(null), new URLSearchParams())).toBe("/dashboard");
    expect(postAuthRedirect(at({ from: {} }), new URLSearchParams())).toBe("/dashboard");
  });

  it("refuse un destinataire hors du site", () => {
    expect(postAuthRedirect(at(), new URLSearchParams({ redirect: "//evil.example" }))).toBe("/dashboard");
    expect(postAuthRedirect(at(), new URLSearchParams({ redirect: "https://evil.example" }))).toBe("/dashboard");
    expect(
      postAuthRedirect(at({ from: { pathname: "//evil.example", search: "" } }), new URLSearchParams())
    ).toBe("/dashboard");
  });
});
