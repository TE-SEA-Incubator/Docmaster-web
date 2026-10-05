import { describe, it, expect, vi, beforeEach } from 'vitest';

import { MessagingService } from '../services/messaging.service.ts';
import type { Actor } from '../utils/actor.utils.ts';

const OWNER: Actor = { type: 'USER', id: 'user-1' };
const FINDER: Actor = { type: 'PARTENAIRE', id: 'partner-1' };

function makeRepository() {
  return {
    createPair: vi.fn(async (_claimId: string | null, lostId: string, foundId: string) => ({
      id: 'conv-1',
      claim_id: null,
      lost_declaration_id: lostId,
      found_declaration_id: foundId,
      status: 'OPEN',
      opened_at: '2026-10-05T10:00:00Z',
      closed_at: null,
    })),
    findById: vi.fn(async () => ({ id: 'conv-1', status: 'OPEN' })),
    addParticipant: vi.fn(async () => undefined),
    findMembership: vi.fn(async () => ({ actor_role: 'OWNER' })),
    listParticipants: vi.fn(async () => []),
    insertMessage: vi.fn(async (conversationId: string, sender: Actor, body: string, kind = 'TEXT') => ({
      id: 'msg-1',
      conversation_id: conversationId,
      sender_type: sender.type,
      sender_id: sender.id,
      body,
      kind,
      created_at: '2026-10-05T10:00:00Z',
    })),
    listMessages: vi.fn(async () => []),
    markRead: vi.fn(async () => undefined),
    setStatus: vi.fn(async (_id: string, status: string) => ({ id: 'conv-1', status })),
  };
}

function makeSocket() {
  return { sendToActor: vi.fn(), emitToConversation: vi.fn() };
}

function makeNotifier() {
  return { createNotification: vi.fn(async (data: any) => data) };
}

const pairInput = () => ({
  claimId: 'claim-1',
  lostDeclaration: { id: 'decl-lost', reporter_id: OWNER.id, reporter_type: 'USER' as const, identifiant_doc_dm: 'DOC_1' },
  foundDeclaration: { id: 'decl-found', reporter_id: FINDER.id, reporter_type: 'PARTENAIRE' as const },
});

describe('MessagingService.openConversationForPair', () => {
  let repository: ReturnType<typeof makeRepository>;
  let socket: ReturnType<typeof makeSocket>;
  let notifier: ReturnType<typeof makeNotifier>;
  let service: MessagingService;

  beforeEach(() => {
    repository = makeRepository();
    socket = makeSocket();
    notifier = makeNotifier();
    service = new MessagingService(repository as any, notifier as any, socket as any);
  });

  it('ouvre le fil entre le propriétaire et le trouveur', async () => {
    const conversationId = await service.openConversationForPair(pairInput());

    expect(conversationId).toBe('conv-1');
    expect(repository.addParticipant).toHaveBeenCalledWith('conv-1', OWNER, 'OWNER');
    expect(repository.addParticipant).toHaveBeenCalledWith('conv-1', FINDER, 'FINDER');
    expect(repository.insertMessage).toHaveBeenCalledWith('conv-1', OWNER, expect.any(String), 'SYSTEM');
    expect(notifier.createNotification).toHaveBeenCalledTimes(2);
    expect(notifier.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ destinataire_type: 'PARTENAIRE', destinataire_id: FINDER.id })
    );
    expect(socket.sendToActor).toHaveBeenCalledWith('USER', OWNER.id, 'CONVERSATION_OPENED', expect.any(Object));
  });

  it('ne rouvre pas un fil déjà entamé : ni message système ni notification', async () => {
    repository.listMessages.mockResolvedValueOnce([{ id: 'msg-old' }] as any);

    await service.openConversationForPair(pairInput());

    expect(repository.insertMessage).not.toHaveBeenCalled();
    expect(notifier.createNotification).not.toHaveBeenCalled();
    expect(socket.sendToActor).toHaveBeenCalledTimes(2);
  });

  it('ignore une paire sans déclaration de trouvaille', async () => {
    const input = { ...pairInput(), foundDeclaration: null };

    expect(await service.openConversationForPair(input)).toBeNull();
    expect(repository.createPair).not.toHaveBeenCalled();
  });

  it('ignore une paire dont les deux déclarations viennent du même acteur', async () => {
    const input = {
      ...pairInput(),
      foundDeclaration: { id: 'decl-found', reporter_id: OWNER.id, reporter_type: 'USER' as const },
    };

    expect(await service.openConversationForPair(input)).toBeNull();
    expect(repository.createPair).not.toHaveBeenCalled();
  });
});

describe('MessagingService.sendMessage', () => {
  let repository: ReturnType<typeof makeRepository>;
  let socket: ReturnType<typeof makeSocket>;
  let service: MessagingService;

  beforeEach(() => {
    repository = makeRepository();
    socket = makeSocket();
    service = new MessagingService(repository as any, makeNotifier() as any, socket as any);
  });

  it('persiste puis diffuse le message dans la room du fil', async () => {
    await service.sendMessage(OWNER, 'conv-1', '  Bonjour  ');

    expect(repository.insertMessage).toHaveBeenCalledWith('conv-1', OWNER, 'Bonjour');
    expect(socket.emitToConversation).toHaveBeenCalledWith('conv-1', 'MESSAGE_NEW', expect.objectContaining({ body: 'Bonjour' }));
  });

  it('refuse un acteur qui ne participe pas au fil', async () => {
    repository.findMembership.mockResolvedValueOnce(null as any);

    await expect(service.sendMessage({ type: 'USER', id: 'intrus' }, 'conv-1', 'Salut')).rejects.toMatchObject({
      status: 403,
    });
    expect(repository.insertMessage).not.toHaveBeenCalled();
  });

  it('refuse un fil inexistant', async () => {
    repository.findById.mockResolvedValueOnce(null as any);

    await expect(service.sendMessage(OWNER, 'conv-inconnue', 'Salut')).rejects.toMatchObject({ status: 404 });
  });

  it('refuse d écrire dans un fil fermé', async () => {
    repository.findById.mockResolvedValueOnce({ id: 'conv-1', status: 'CLOSED' });

    await expect(service.sendMessage(OWNER, 'conv-1', 'Salut')).rejects.toMatchObject({ status: 409 });
    expect(repository.insertMessage).not.toHaveBeenCalled();
  });

  it('rejette un message vide ou trop long', async () => {
    await expect(service.sendMessage(OWNER, 'conv-1', '   ')).rejects.toMatchObject({ status: 400 });
    await expect(service.sendMessage(OWNER, 'conv-1', 'a'.repeat(2001))).rejects.toMatchObject({ status: 400 });
  });
});

describe('MessagingService.consultation', () => {
  it('markRead est déclenché par la lecture du fil', async () => {
    const repository = makeRepository();
    const service = new MessagingService(repository as any, makeNotifier() as any, makeSocket() as any);

    await service.getMessages(OWNER, 'conv-1', null);

    expect(repository.markRead).toHaveBeenCalledWith('conv-1', OWNER);
  });

  it('clôture le fil et prévient la room', async () => {
    const repository = makeRepository();
    const socket = makeSocket();
    const service = new MessagingService(repository as any, makeNotifier() as any, socket as any);

    await service.close(OWNER, 'conv-1');

    expect(repository.setStatus).toHaveBeenCalledWith('conv-1', 'CLOSED');
    expect(socket.emitToConversation).toHaveBeenCalledWith('conv-1', 'CONVERSATION_CLOSED', { conversationId: 'conv-1' });
  });
});
