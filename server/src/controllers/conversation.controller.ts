import { Request, Response } from 'express';
import { actorFromRequest } from '../utils/actor.utils.ts';
import { MessagingService } from '../services/messaging.service.ts';
import { ConversationFilter } from '../repositories/conversation.repository.ts';

const service = new MessagingService();

const unauthorized = (res: Response) =>
  res.status(401).json({ success: false, message: 'Accès non autorisé.' });

const fail = (res: Response, error: any) => {
  const status = typeof error?.status === 'number' ? error.status : 500;
  if (status === 500) console.error('[Conversations]', error);
  return res.status(status).json({ success: false, message: error?.message || 'Erreur interne.' });
};

const readFilter = (raw: unknown): ConversationFilter =>
  raw === 'unread' || raw === 'archived' ? raw : 'all';

// Express 5 autorise les paramètres de route répétés : on normalise en chaîne unique.
const conversationIdOf = (req: Request): string => String(req.params.id ?? '');

export const listConversations = async (req: Request, res: Response) => {
  const actor = actorFromRequest(req);
  if (!actor) return unauthorized(res);
  try {
    const conversations = await service.listConversations(actor, readFilter(req.query.filter));
    return res.json({ success: true, data: conversations });
  } catch (error) {
    return fail(res, error);
  }
};

export const getMessages = async (req: Request, res: Response) => {
  const actor = actorFromRequest(req);
  if (!actor) return unauthorized(res);
  try {
    const before = typeof req.query.before === 'string' ? req.query.before : null;
    const messages = await service.getMessages(actor, conversationIdOf(req), before);
    return res.json({ success: true, data: messages });
  } catch (error) {
    return fail(res, error);
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  const actor = actorFromRequest(req);
  if (!actor) return unauthorized(res);
  try {
    const message = await service.sendMessage(actor, conversationIdOf(req), req.body?.body);
    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    return fail(res, error);
  }
};

export const markRead = async (req: Request, res: Response) => {
  const actor = actorFromRequest(req);
  if (!actor) return unauthorized(res);
  try {
    await service.markRead(actor, conversationIdOf(req));
    return res.json({ success: true });
  } catch (error) {
    return fail(res, error);
  }
};

export const closeConversation = async (req: Request, res: Response) => {
  const actor = actorFromRequest(req);
  if (!actor) return unauthorized(res);
  try {
    const conversation = await service.close(actor, conversationIdOf(req));
    return res.json({ success: true, data: conversation });
  } catch (error) {
    return fail(res, error);
  }
};

export const setArchived = async (req: Request, res: Response) => {
  const actor = actorFromRequest(req);
  if (!actor) return unauthorized(res);
  try {
    const conversation = await service.setArchived(actor, conversationIdOf(req), req.body?.archived !== false);
    return res.json({ success: true, data: conversation });
  } catch (error) {
    return fail(res, error);
  }
};
