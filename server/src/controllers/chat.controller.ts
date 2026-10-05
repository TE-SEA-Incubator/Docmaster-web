import { Request, Response } from 'express';
import { groqService, ChatMessage, ChatUserContext } from '../services/groq.service.ts';

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 2000;
const VALID_ROLES: ChatMessage["role"][] = ["user", "assistant"];

/**
 * POST /api/chat
 * Body: { messages: [{ role: "user" | "assistant", content: string }], user?: { prenom, nom, points, subscription } }
 */
export const chatCompletion = async (req: Request, res: Response) => {
  const { messages, user } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, message: "Le champ messages (tableau) est requis." });
  }

  // Validate & sanitize messages
  const cleaned: ChatMessage[] = messages
    .slice(-MAX_MESSAGES)
    .filter((m: any) => m && typeof m.content === "string")
    .map((m: any) => ({
      role: VALID_ROLES.includes(m.role) ? m.role : "user",
      content: m.content.slice(0, MAX_CONTENT_LENGTH),
    }))
    .filter((m) => m.content.trim().length > 0);

  if (cleaned.length === 0) {
    return res.status(400).json({ success: false, message: "Aucun message valide fourni." });
  }

  // Ensure the conversation starts with a user message (keeps Groq happy)
  if (cleaned[0].role !== "user") {
    cleaned.shift();
  }

  let userContext: ChatUserContext | undefined;
  if (user && typeof user === "object") {
    userContext = {
      prenom: typeof user.prenom === "string" ? user.prenom.slice(0, 100) : undefined,
      nom: typeof user.nom === "string" ? user.nom.slice(0, 100) : undefined,
      points: typeof user.points === "number" ? user.points : undefined,
      subscription: typeof user.subscription === "string" ? user.subscription.slice(0, 100) : undefined,
    };
  }

  try {
    const reply = await groqService.chat(cleaned, userContext);
    res.json({ success: true, message: reply });
  } catch (err: any) {
    const status = err?.status || 502;
    console.error("❌ [Chat] Erreur:", err.message);
    res.status(status).json({
      success: false,
      message: "Le service de chat est momentanément indisponible. Veuillez réessayer dans quelques instants.",
    });
  }
};
