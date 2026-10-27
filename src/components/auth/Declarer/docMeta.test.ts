import { describe, expect, it } from "vitest";
import { DOC_META } from "./docMeta";

describe("DOC_META", () => {
  it("ne demande jamais le numero de document", () => {
    for (const [code, meta] of Object.entries(DOC_META)) {
      const numero = meta.fields.find((f) => f.id === "numero");
      if (numero) expect(numero.optional, `numero requis pour ${code}`).toBe(true);
    }
  });

  it("inventorie les champs de date, seul date_expiration reste libre", () => {
    const dateFields = new Set<string>();
    for (const meta of Object.values(DOC_META)) {
      for (const field of meta.fields) {
        if (field.type === "date") dateFields.add(field.id);
      }
    }
    expect([...dateFields].sort()).toEqual(
      ["date_delivrance", "date_deces", "date_expiration", "date_marriage", "date_naissance"].sort()
    );
  });
});
