import { describe, expect, it } from "vitest";
import {
  buildLostDeclarationBody,
  walletTypeId,
  type LostDeclarationContext,
} from "./lostDeclarationPayload";

const base: LostDeclarationContext = {
  ownerName: "Awa Ndiaye",
  ville: "Douala",
  lieu: "Transports en commun",
  lieuLabel: "Lieu",
  delivranceLabel: "Date de délivrance",
  datePerte: "2026-10-05",
  urgence: 2,
  telephone: "697123456",
  email: "awa@example.cm",
  circonstances: "Oubliée dans le bus 212",
  rewardEnabled: true,
  reward: "5000",
};

describe("buildLostDeclarationBody", () => {
  it("poste les clés du CreateDeclarationDTO et aucune clé inventée", () => {
    const body = buildLostDeclarationBody("7c1e-uuid", { nom_complet: "Awa Ndiaye", numero_doc: "112233" }, base);

    expect(body.doc_type).toBe("7c1e-uuid");
    expect(body.owner_name).toBe("Awa Ndiaye");
    expect(body.ville).toBe("Douala");
    expect(body.document_number).toBe("112233");
    expect(body.date_perte).toBe("2026-10-05");

    // Les clés du vie implant n'existaient pas côté serveur : déclaration refusée en 400.
    expect(body).not.toHaveProperty("document_id");
    expect(body).not.toHaveProperty("numero_document");
    expect(body).not.toHaveProperty("type_document");
    expect(body).not.toHaveProperty("nom_complet");
    expect(body).not.toHaveProperty("lieu_perte");
  });

  it("garantit les deux obligatoires même quand le formulaire est vide", () => {
    const body = buildLostDeclarationBody("7c1e-uuid", {}, base);
    expect(body.owner_name).toBe("Awa Ndiaye");
    expect(body.ville).toBe("Douala");
  });

  it("carte urgence et récompense sur les valeurs acceptées par le DTO", () => {
    expect(buildLostDeclarationBody("x", {}, base).urgence_niveau).toBe("Modérée");
    expect(buildLostDeclarationBody("x", {}, { ...base, urgence: 3 }).urgence_niveau).toBe("Haute");
    expect(buildLostDeclarationBody("x", {}, { ...base, urgence: 9 }).urgence_niveau).toBe("Modérée");
    expect(buildLostDeclarationBody("x", {}, base).recompense_montant).toBe(5000);
    expect(buildLostDeclarationBody("x", {}, { ...base, rewardEnabled: false })).not.toHaveProperty("recompense_montant");
  });

  it("n'envoie ni téléphone ni e-mail vides, qui feraient échouer @IsEmail / @Matches", () => {
    const body = buildLostDeclarationBody("x", {}, { ...base, telephone: "", email: "" });
    expect(body).not.toHaveProperty("telephone_contact");
    expect(body).not.toHaveProperty("email_contact");
    expect(body.mode_contact).toBe("APP_CHAT");
    expect(buildLostDeclarationBody("x", {}, base).mode_contact).toBe("PHONE");
  });

  it("tronque la description à 500 caractères et garde la date de délivrance en metadata", () => {
    const body = buildLostDeclarationBody(
      "x",
      { date_delivrance: "2021-03-09", description: "N".repeat(600) },
      { ...base, circonstances: "C".repeat(600) }
    );
    expect(String(body.description).length).toBe(500);
    expect(body.metadata).toMatchObject({ Lieu: "Transports en commun", "Date de délivrance": "2021-03-09" });
  });

  it("ne lie le document du coffre que pour la déclaration qui le concerne", () => {
    const linked = buildLostDeclarationBody("x", {}, base, "doc-uuid");
    expect(linked.source_document_id).toBe("doc-uuid");
    expect(buildLostDeclarationBody("x", {}, base)).not.toHaveProperty("source_document_id");
  });
});

describe("walletTypeId", () => {
  it("retombe sur un id local connu quand le code du coffre en a un", () => {
    expect(walletTypeId("CNI")).toBe("cni");
    expect(walletTypeId("carte_blue")).toBe("carte_bancaire");
    expect(walletTypeId(" acte_naissance ")).toBe("acte_naissance");
  });

  it("laisse intact un code que le modal ne propose pas", () => {
    expect(walletTypeId("CARTE_GRISE")).toBe("CARTE_GRISE");
    expect(walletTypeId("")).toBe("cni");
  });
});
