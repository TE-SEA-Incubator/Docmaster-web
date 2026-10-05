import { Actor } from '../utils/actor.utils.ts';
import { ConversationFilter, ConversationRepository, conversationRepository } from '../repositories/conversation.repository.ts';
import { NotificationService } from './notification.service.ts';
import { SocketService } from './socket.service.ts';

interface DeclarationActor {
  reporter_id: string | null;
  reporter_type?: 'USER' | 'PARTENAIRE';
  identifiant_doc_dm?: string;
}

export interface PairInput {
  claimId: string | null;
  lostDeclaration: DeclarationActor & { id: string };
  foundDeclaration: (DeclarationActor & { id: string }) | null;
}

const OPENED_SYSTEM_MESSAGE = (docLabel: string) =>
  `Fil ouvert après le paiement des frais de récupération (${docLabel}).`;

export class MessagingService {
  constructor(
    private repository: ConversationRepository = conversationRepository,
    private notificationService: NotificationService = new NotificationService(),
    private socketService: SocketService = SocketService.getInstance()
  ) {}

  private actorOf(declaration: DeclarationActor): Actor | null {
    if (!declaration?.reporter_id) return null;
    return { type: declaration.reporter_type === 'PARTENAIRE' ? 'PARTENAIRE' : 'USER', id: declaration.reporter_id };
  }

  /**
   * Idempotent : appelé par activateRecovery(), qui a plusieurs voies d'entrée
   * (webhook NoKash, polling, points, cron de réconciliation).
   */
  async openConversationForPair(input: PairInput): Promise<string | null> {
    const { claimId, lostDeclaration, foundDeclaration } = input;
    if (!foundDeclaration) return null;

    const owner = this.actorOf(lostDeclaration);
    const finder = this.actorOf(foundDeclaration);
    if (!owner || !finder) return null;
    if (owner.type === finder.type && owner.id === finder.id) return null;

    const conversation = await this.repository.createPair(claimId, lostDeclaration.id, foundDeclaration.id);
    if (!conversation) return null;

    await this.repository.addParticipant(conversation.id, owner, 'OWNER');
    await this.repository.addParticipant(conversation.id, finder, 'FINDER');

    const alreadyOpened = (await this.repository.listMessages(conversation.id, null, 1)).length > 0;
    if (!alreadyOpened) {
      const docLabel = lostDeclaration.identifiant_doc_dm || 'document';
      await this.repository.insertMessage(conversation.id, owner, OPENED_SYSTEM_MESSAGE(docLabel), 'SYSTEM');
    }

    const payload = {
      conversationId: conversation.id,
      declarationId: lostDeclaration.id,
      openedAt: conversation.opened_at,
    };
    for (const participant of [owner, finder]) {
      this.socketService.sendToActor(participant.type, participant.id, 'CONVERSATION_OPENED', payload);
    }

    if (alreadyOpened) return conversation.id;

    await this.notificationService.createNotification({
      destinataire_type: owner.type,
      destinataire_id: owner.id,
      type: 'CONVERSATION_OPENED',
      title: 'Conversation ouverte',
      message: 'Vous pouvez maintenant échanger avec la personne qui a retrouvé votre document.',
      metadata: { conversationId: conversation.id, docId: lostDeclaration.id },
    });
    await this.notificationService.createNotification({
      destinataire_type: finder.type,
      destinataire_id: finder.id,
      type: 'CONVERSATION_OPENED',
      title: 'Nouveau message de votre client',
      message: 'Le propriétaire a payé les frais. Une conversation vient de s’ouvrir.',
      metadata: { conversationId: conversation.id, docId: lostDeclaration.id },
    });

    return conversation.id;
  }

  async listConversations(actor: Actor, filter: ConversationFilter) {
    return this.repository.listByActor(actor, filter);
  }

  private async requireMembership(conversationId: string, actor: Actor) {
    const conversation = await this.repository.findById(conversationId);
    if (!conversation) {
      throw Object.assign(new Error('Conversation introuvable'), { status: 404 });
    }
    const membership = await this.repository.findMembership(conversationId, actor);
    if (!membership) {
      throw Object.assign(new Error('Action non autorisée'), { status: 403 });
    }
    return { conversation, membership };
  }

  async getMessages(actor: Actor, conversationId: string, before: string | null) {
    await this.requireMembership(conversationId, actor);
    const messages = await this.repository.listMessages(conversationId, before);
    await this.repository.markRead(conversationId, actor);
    return messages;
  }

  async sendMessage(actor: Actor, conversationId: string, body: string) {
    const trimmed = (body || '').trim();
    if (!trimmed) {
      throw Object.assign(new Error('Message requis'), { status: 400 });
    }
    if (trimmed.length > 2000) {
      throw Object.assign(new Error('Message trop long (2000 caractères maximum)'), { status: 400 });
    }

    const { conversation } = await this.requireMembership(conversationId, actor);
    if (conversation.status !== 'OPEN') {
      throw Object.assign(new Error('Cette conversation est fermée'), { status: 409 });
    }

    const message = await this.repository.insertMessage(conversationId, actor, trimmed);
    this.socketService.emitToConversation(conversationId, 'MESSAGE_NEW', message);
    return message;
  }

  async markRead(actor: Actor, conversationId: string) {
    await this.requireMembership(conversationId, actor);
    await this.repository.markRead(conversationId, actor);
  }

  /** Le trouveur et le propriétaire peuvent clore un fil ; la réouverture n'est pas prévue. */
  async close(actor: Actor, conversationId: string) {
    const { conversation } = await this.requireMembership(conversationId, actor);
    if (conversation.status === 'OPEN') {
      const updated = await this.repository.setStatus(conversationId, 'CLOSED');
      this.socketService.emitToConversation(conversationId, 'CONVERSATION_CLOSED', { conversationId });
      return updated;
    }
    return conversation;
  }

  async setArchived(actor: Actor, conversationId: string, archived: boolean) {
    await this.requireMembership(conversationId, actor);
    return this.repository.setStatus(conversationId, archived ? 'ARCHIVED' : 'OPEN');
  }
}

export const messagingService = new MessagingService();
