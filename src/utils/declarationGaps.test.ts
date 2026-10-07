import { describe, it, expect } from "vitest";
import { buildGapPatch, declarationGaps, isCompletable } from "./declarationGaps";

const lostDecl = (overrides: Record<string, any> = {}) => ({
  id: "decl-1",
  declaration_type: "LOST",
  status: "MATCHED",
  owner_name: "Awa Ndiaye",
  document_number: "112233",
  ville: "Douala",
  date_perte: "2026-10-05",
  telephone_contact: "+237 697 12 34 56",
  email_contact: "awa@example.cm",
  description: "Oubliée dans le bus 212",
  ...overrides,
});

const keysOf = (decl: any) => declarationGaps(decl).map((g) => g.key);

describe("declarationGaps — ne redemander que ce qui manque", () => {
  it("ne propose rien quand la déclaration est déjà complète", () => {
    expect(declarationGaps(lostDecl())).toEqual([]);
  });

  it("propose les champs laissés vides par la déclaration créée depuis le coffre", () => {
    expect(
      keysOf(
        lostDecl({
          document_number: "",
          ville: null,
          date_perte: undefined,
          telephone_contact: "",
          email_contact: "",
        })
      )
    ).toEqual(["document_number", "ville", "date_perte", "telephone_contact", "email_contact"]);
  });

  it("lit aussi les clés héritées que l API renvoie encore", () => {
    expect(keysOf(lostDecl({ owner_name: null, nom_complet: "Awa Ndiaye" }))).toEqual([]);
    expect(keysOf(lostDecl({ owner_name: null, nom_complet: "  " }))).toContain("owner_name");
  });

  it("la date de perte ne se demande que sur une perte", () => {
    expect(keysOf(lostDecl({ date_perte: "" }))).toContain("date_perte");
    expect(keysOf(lostDecl({ declaration_type: "FOUND", date_perte: "" }))).not.toContain("date_perte");
  });

  it("une déclaration close n a plus rien à compléter", () => {
    const closed = lostDecl({ status: "RETURNED", ville: "" });
    expect(declarationGaps(closed)).toEqual([]);
    expect(isCompletable(closed)).toBe(false);
    expect(isCompletable(lostDecl({ status: "MATCHED" }))).toBe(true);
  });
});

describe("buildGapPatch — la charge du PATCH", () => {
  const gaps = declarationGaps(lostDecl({ document_number: "", ville: "", date_perte: "", telephone_contact: "", description: "" }));

  it("écarte les champs que le serveur refuse et les saisies vides", () => {
    const patch = buildGapPatch(gaps, {
      document_number: " 112233 ",
      ville: "",
      date_perte: "2026-10-05",
      telephone_contact: "+237 697 12 34 56",
      description: "  ",
      status: "RETURNED",
      doc_type: "PASSPORT",
    } as any);

    expect(patch).toEqual({
      document_number: "112233",
      date_perte: "2026-10-05",
      telephone_contact: "+237 697 12 34 56",
    });
  });

  it("normalise la date et le téléphone avant l envoi", () => {
    const patch = buildGapPatch(gaps, {
      date_perte: "2026-10-05T14:30:00.000Z",
      telephone_contact: "697é123456",
    });

    expect(patch.date_perte).toBe("2026-10-05");
    expect(patch.telephone_contact).toBe("697123456");
  });

  it("rejette une date non conforme plutôt que de la faire refuser par le serveur", () => {
    expect(buildGapPatch(gaps, { date_perte: "05/10/2026" }).date_perte).toBeUndefined();
  });

  it("plafonne la description à la longueur acceptée par le DTO", () => {
    const patch = buildGapPatch(gaps, { description: "a".repeat(700) });
    expect(patch.description).toHaveLength(500);
  });

  it("rien à envoyer quand l utilisateur n a rien saisi", () => {
    expect(buildGapPatch(gaps, {})).toEqual({});
  });
});
