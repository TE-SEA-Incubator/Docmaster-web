import { describe, expect, it } from "vitest";

import {
  buildDocTypeCards,
  findDocTypeStats,
  foundRecentItems,
  oldestCityOf,
  parseDocTypeStats,
  parseDocTypeStatsList,
  toStatNumber,
} from "./docTypeStats";

// Ligne telle que la rend `GET /declarations/stats-by-type` : les compteurs `numeric` peuvent
// arriver en chaîne, le parsing ne doit jamais les lire avec un `as number` silencieux.
const cniRow = {
  id: "3e4f3574-db05-47e0-b9ef-4ef06f90c477",
  code: "CNI",
  name: "Carte Nationale d'Identité",
  categorie: "IDENTITE",
  icone: "id-card-outline",
  total: 2,
  lost: 1,
  found: "1",
  returned: 0,
  previous_count: 0,
  trend: "100",
  recent_items: [
    {
      id: "66904f56-4621-4bb2-a901-11680c9fba27",
      type: "FOUND",
      ville: "Yaoundé I",
      date: "2026-10-05T20:06:12.485975+01:00",
    },
    {
      id: "7935536e-b152-4a7f-b3a9-eca573b226e0",
      type: "LOST",
      ville: "Yaoundé I",
      date: "2026-10-05T19:41:46.483664+01:00",
    },
  ],
};

describe("toStatNumber — les compteurs du serveur peuvent être des chaînes", () => {
  it("lit les numeric rendus en chaîne", () => {
    expect(toStatNumber("12.5")).toBe(12.5);
    expect(toStatNumber("-33.3")).toBe(-33.3);
    expect(toStatNumber("1,234")).toBe(1234);
  });

  it("laisse les vrais nombres et ne fabrique rien sur un absent", () => {
    expect(toStatNumber(7)).toBe(7);
    expect(toStatNumber(null)).toBe(0);
    expect(toStatNumber(undefined)).toBe(0);
    expect(toStatNumber("—")).toBe(0);
  });
});

describe("parseDocTypeStats", () => {
  it("transforme la ligne du serveur en compteurs d'objets trouvés", () => {
    const stats = parseDocTypeStats(cniRow);
    expect(stats?.code).toBe("CNI");
    expect(stats?.found).toBe(1);
    expect(stats?.returned).toBe(0);
    expect(stats?.recentItems).toHaveLength(2);
    expect(stats?.recentItems[0].ville).toBe("Yaoundé I");
  });

  it("ne rend que les trouvailles à l'affichage", () => {
    const stats = parseDocTypeStats(cniRow)!;
    expect(foundRecentItems(stats).map((item) => item.id)).toEqual([
      "66904f56-4621-4bb2-a901-11680c9fba27",
    ]);
  });

  it("extrait la ville la plus ancienne par type de mouvement", () => {
    const stats = parseDocTypeStats(cniRow)!;
    expect(oldestCityOf(stats, "FOUND")).toBe("Yaoundé I");
    expect(oldestCityOf(stats, "LOST")).toBe("Yaoundé I");
  });

  it("renvoie null plutôt que « undefined » quand le type n'a aucun mouvement", () => {
    const stats = parseDocTypeStats({ ...cniRow, recent_items: [] })!;
    expect(oldestCityOf(stats, "FOUND")).toBeNull();
  });

  it("rejette une ligne sans identifiant plutôt que d'inventer un type", () => {
    expect(parseDocTypeStats({ found: 3 })).toBeNull();
    expect(parseDocTypeStatsList([cniRow, null, "x", {}])).toHaveLength(1);
  });
});

describe("buildDocTypeCards", () => {
  const catalogue = [
    { id: "cni-id", nom: "Carte Nationale d'Identité", code: "CNI" },
    { id: "passeport-id", nom: "Passeport", code: "PASSPORT" },
    { id: "permis-id", nom: "Permis de Conduire", code: "PERMIS" },
  ];

  it("greffe les compteurs sur le catalogue, y compris les types à zéro", () => {
    const cards = buildDocTypeCards(
      catalogue,
      parseDocTypeStatsList([
        { ...cniRow, id: "cni-id" },
        { ...cniRow, id: "permis-id", code: "PERMIS", name: "Permis de Conduire", found: 5 },
      ])
    );

    expect(cards.map((card) => card.code)).toEqual(["PERMIS", "CNI", "PASSPORT"]);
    const passeport = cards.find((card) => card.code === "PASSPORT");
    expect(passeport?.stats.found).toBe(0);
    expect(passeport?.name).toBe("Passeport");
    expect(passeport?.icon).toBe("fa-passport");
  });

  it("distingue le type illustré de celui qui retombe sur l'icône", () => {
    const cards = buildDocTypeCards(catalogue, []);
    expect(cards.find((card) => card.code === "CNI")?.hasImage).toBe(true);
    expect(cards.find((card) => card.code === "PERMIS")?.hasImage).toBe(true);
  });
});

describe("findDocTypeStats", () => {
  const rows = parseDocTypeStatsList([cniRow]);

  it("retrouve un type par son code, majuscules ou minuscules", () => {
    expect(findDocTypeStats(rows, "cni")?.found).toBe(1);
    expect(findDocTypeStats(rows, "CNI")?.found).toBe(1);
    expect(findDocTypeStats(rows, "ACTE_DECES")).toBeNull();
    expect(findDocTypeStats(rows, undefined)).toBeNull();
  });

  it("accepte aussi l'identifiant, la route pouvant recevoir l'un ou l'autre", () => {
    expect(findDocTypeStats(rows, cniRow.id)?.code).toBe("CNI");
  });
});
