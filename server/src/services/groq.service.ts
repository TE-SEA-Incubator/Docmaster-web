import axios from 'axios';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { planService } from './plan.service.ts';
import { pointsService } from './points.service.ts';
import { DocumentTypeRepository } from '../repositories/document-type.repository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTEXT_PATH = path.join(__dirname, '../context/docmaster-context.md');

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatUserContext {
  prenom?: string;
  nom?: string;
  points?: number;
  subscription?: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GroqChoice {
  message?: { content?: string };
}

interface GroqResponse {
  choices?: GroqChoice[];
}

class GroqService {
  private context: string = "";
  private docTypeRepo = new DocumentTypeRepository();

  constructor() {
    try {
      this.context = readFileSync(CONTEXT_PATH, "utf8");
      console.log("🤖 [Groq] Contexte Docmaster chargé:", this.context.length, "caractères");
    } catch (err) {
      console.warn("⚠️  [Groq] Impossible de charger le contexte Docmaster:", err);
      this.context = "";
    }
  }

  /**
   * Build the system prompt: static knowledge base + live data from the DB
   */
  private async buildSystemPrompt(user?: ChatUserContext): Promise<string> {
    let live = "";
    try {
      const [plans, rate, docTypes] = await Promise.all([
        planService.getAllPlans(),
        pointsService.getExchangeRate(),
        this.docTypeRepo.findAllActive(),
      ]);

      if (docTypes && docTypes.length > 0) {
        live += "\n\n## FRAIS DE RETROUVAILLE PAR TYPE DE DOCUMENT (données officielles — OBLIGATOIRE d'utiliser ces chiffres exacts pour toute question sur les frais ou récompenses)\n";
        for (const d of docTypes) {
          const prix = d.prix_retrouvaille != null ? `${Number(d.prix_retrouvaille).toLocaleString("fr-FR")} FCFA` : "Variable";
          live += `- ${d.nom}: ${prix}`;
          if (d.points_recompense) live += ` (récompense: ${d.points_recompense} points)`;
          if (d.finder_percent != null) live += ` (part du trouveur: ${d.finder_percent}%)`;
          live += "\n";
        }
      }

      if (plans && plans.length > 0) {
        live += "\n\n## TARIFS ACTUELS (données officielles, ne jamais inventer d'autres prix)\n";
        for (const p of plans) {
          const price = p.price != null ? `${Number(p.price).toLocaleString("fr-FR")} FCFA` : "Prix variable";
          live += `- ${p.name || "Plan"}: ${price}`;
          if (p.duration_months) live += ` (${p.duration_months} mois)`;
          if (p.interval) live += ` — ${p.interval}`;
          live += "\n";
        }
      }
      if (rate) {
        live += `\nTaux de conversion des points: 1 point = ${rate} FCFA.`;
      }
    } catch (err) {
      console.warn("⚠️  [Groq] Données live indisponibles:", err);
    }

    // Règle d'usage impérative : ces sections live priment sur le reste du contexte
    if (live.trim()) {
      live += "\n\nRÈGLE : les sections ci-dessus (FRAIS DE RETROUVAILLE, TARIFS, TAUX) sont la référence absolue. Si l'utilisateur demande un prix, un frais, une récompense ou un montant : citez TOUJOURS la valeur exacte de ces sections, jamais une autre valeur, et ne dites jamais que l'information est absente si elle s'y trouve.";
    }

    let userInfo = "";
    if (user && (user.prenom || user.points != null || user.subscription)) {
      userInfo = `\n\n## UTILISATEUR CONNECTÉ (contexte)\n`;
      if (user.prenom) userInfo += `- Prénom: ${user.prenom}\n`;
      if (user.nom) userInfo += `- Nom: ${user.nom}\n`;
      if (user.points != null) userInfo += `- Points: ${user.points}\n`;
      if (user.subscription) userInfo += `- Abonnement actuel: ${user.subscription}\n`;
      userInfo += "Utilisez ces informations pour personnaliser les réponses, sans jamais les répéter à l'utilisateur ni les partager.";
    }

    // Les données live (prix, tarifs, taux) sont placées EN TÊTE du prompt :
    // c'est la première chose lue par le modèle, ce qui garantit qu'il les cite.
    return (live ? live + "\n\n" : "") + this.context + userInfo;
  }

  /**
   * Résumé compact des données live, injecté à la fin du dernier message utilisateur.
   */
  private async buildQuickFacts(): Promise<string> {
    try {
      const [docTypes, rate] = await Promise.all([
        this.docTypeRepo.findAllActive(),
        pointsService.getExchangeRate(),
      ]);
      const lines: string[] = [];
      if (docTypes && docTypes.length > 0) {
        lines.push("Frais de retrouvaille par document:");
        for (const d of docTypes.slice(0, 12)) {
          const prix = d.prix_retrouvaille != null ? `${Number(d.prix_retrouvaille).toLocaleString("fr-FR")} FCFA` : "variable";
          lines.push(`- ${d.nom}: ${prix} (${d.points_recompense || 0} pts, trouveur ${d.finder_percent ?? 0}%)`);
        }
      }
      if (rate) lines.push(`Taux: 1 point = ${rate} FCFA.`);
      lines.push("Citez ces chiffres exacts si la question porte sur un montant, un frais ou une récompense.");
      return lines.join("\n");
    } catch {
      return "";
    }
  }

  /**
   * Send the conversation to Groq with retry on rate-limit / 5xx
   */
  async chat(messages: ChatMessage[], user?: ChatUserContext): Promise<string> {
    if (!GROQ_API_KEY) {
      throw Object.assign(new Error("GROQ_API_KEY non configurée sur le serveur"), { status: 503 });
    }

    const systemPrompt = await this.buildSystemPrompt(user);
    const payload = [
      { role: "system" as const, content: systemPrompt },
      ...messages,
    ];

    // Injecte un résumé compact des données officielles DANS le dernier message
    // utilisateur : zone de plus haute attention pour le modèle.
    const facts = await this.buildQuickFacts();
    const lastIdx = payload.length - 1;
    if (facts && payload[lastIdx]?.role === "user") {
      payload[lastIdx] = {
        ...payload[lastIdx],
        content: payload[lastIdx].content + "\n\n[DONNÉES OFFICIELLES À UTILISER POUR RÉPONDRE PRÉCISÉMENT]\n" + facts,
      };
    }

    const attempts = [0, 1000, 2500, 5000];
    let lastError: any = null;

    for (let i = 0; i < attempts.length; i++) {
      if (i > 0) await sleep(attempts[i]);
      try {
        const response = await axios.post<GroqResponse>(
          GROQ_URL,
          {
            model: GROQ_MODEL,
            messages: payload,
            temperature: 0.7,
            max_tokens: 600,
          },
          {
            headers: {
              "Authorization": `Bearer ${GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        );
        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) throw new Error("Réponse Groq vide");
        return content;
      } catch (err: any) {
        lastError = err;
        const status = err?.response?.status;
        const retryable = status === 429 || status === 500 || status === 502 || status === 503;
        if (!retryable) break;
      }
    }

    const status = lastError?.response?.status;
    throw Object.assign(
      new Error(status ? `Groq a répondu avec le statut ${status}` : "Impossible de contacter Groq"),
      { status: status || 502 }
    );
  }
}

export const groqService = new GroqService();
