import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';

const messaging = vi.hoisted(() => ({
  listConversations: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  markRead: vi.fn(),
  close: vi.fn(),
  setArchived: vi.fn(),
}));

vi.mock('../services/messaging.service.ts', () => ({
  MessagingService: class {
    listConversations = messaging.listConversations;
    getMessages = messaging.getMessages;
    sendMessage = messaging.sendMessage;
    markRead = messaging.markRead;
    close = messaging.close;
    setArchived = messaging.setArchived;
  },
}));

import { closeConversation, setArchived } from '../controllers/conversation.controller.ts';

const makeReq = (overrides: Partial<{ user: unknown }> = {}) =>
  ({
    user: { id: 'user-1', role: 'USER' },
    params: { id: 'conv-1' },
    query: {},
    body: { archived: true },
    ...overrides,
  }) as unknown as Request;

type TestResponse = Response & { statusCode: number; payload: any };

const makeRes = (): TestResponse => {
  const res: any = { statusCode: 200, payload: null };
  res.status = (code: number) => {
    res.statusCode = code;
    res.json = (payload: any) => {
      res.payload = payload;
      return res;
    };
    return res;
  };
  res.json = (payload: any) => {
    res.payload = payload;
    return res;
  };
  return res;
};

const postgresError = () =>
  new Error('inconsistent types deduced for parameter $2');

describe('conversation.controller — formatage des erreurs', () => {
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logError.mockRestore();
  });

  it('remplace une erreur technique par un message générique', async () => {
    messaging.setArchived.mockRejectedValueOnce(postgresError());
    const res = makeRes();

    await setArchived(makeReq(), res);

    expect(res.statusCode).toBe(500);
    expect(res.payload).toEqual({
      success: false,
      message: 'Une erreur est survenue. Réessayez dans un instant.',
    });
    expect(JSON.stringify(res.payload)).not.toMatch(/parameter|types deduced|conversation/i);
  });

  it('garde la cause technique dans les logs serveur', async () => {
    const error = postgresError();
    messaging.setArchived.mockRejectedValueOnce(error);

    await setArchived(makeReq(), makeRes());

    expect(logError).toHaveBeenCalledWith('[Conversations]', error);
  });

  it('une 5xx revendiquée par une dépendance reste générique', async () => {
    messaging.close.mockRejectedValueOnce(Object.assign(new Error('ECONNREFUSED 127.0.0.1:5432'), { status: 503 }));
    const res = makeRes();

    await closeConversation(makeReq(), res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.message).not.toContain('ECONNREFUSED');
  });

  it('conserve le message rédigé des rejets 4xx', async () => {
    messaging.close.mockRejectedValueOnce(
      Object.assign(new Error('Cette conversation est fermée'), { status: 409 })
    );
    const res = makeRes();

    await closeConversation(makeReq(), res);

    expect(res.statusCode).toBe(409);
    expect(res.payload.message).toBe('Cette conversation est fermée');
    expect(logError).not.toHaveBeenCalled();
  });

  it('refuse un acteur absent avant d appeler le service', async () => {
    const res = makeRes();

    await setArchived(makeReq({ user: undefined }), res);

    expect(res.statusCode).toBe(401);
    expect(res.payload.message).toBe('Accès non autorisé.');
    expect(messaging.setArchived).not.toHaveBeenCalled();
  });
});
