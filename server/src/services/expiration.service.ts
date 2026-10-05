import { DocumentRepository } from '../repositories/document.repository.ts';
import { NotificationService } from './notification.service.ts';
import { subscriptionService } from './subscription.service.ts';
import { UserRepository } from '../repositories/auth.repository.ts';

export class ExpirationService {
  private documentRepository: DocumentRepository;
  private notificationService: NotificationService;
  private userRepository: UserRepository;

  constructor() {
    this.documentRepository = new DocumentRepository();
    this.notificationService = new NotificationService();
    this.userRepository = new UserRepository();
  }

  /**
   * Check for documents expiring soon and send reminders (respects plan expiration_reminders + email_alerts)
   */
  async checkAndRemind(): Promise<void> {
    const windows = [7, 3, 1];

    for (const days of windows) {
      const docs = await this.documentRepository.findExpiringDocuments(days);

      for (const doc of docs) {
        try {
          const reminderCheck = await subscriptionService.validateAction(
            doc.user_id,
            'EXPIRATION_REMINDERS'
          );
          if (!(reminderCheck as any).allowed) {
            continue;
          }

          const user = await this.userRepository.findById(doc.user_id);
          if (!user) continue;

          const docType = doc.type_doc || 'document';

          await this.notificationService.createNotification({
            user_id: doc.user_id,
            type: 'DOC_EXPIRING',
            title: 'Document bientôt expiré',
            message: `Votre ${docType} expire dans ${days} jour${days > 1 ? 's' : ''}. Pensez à le renouveler.`,
            metadata: { docId: doc.id, docType, daysBeforeExpiry: days },
          });

          await this.documentRepository.markExpirationReminded(doc.id);

          console.log(
            `⏰ Expiration reminder sent for doc ${doc.id} (${docType}) to user ${doc.user_id} (${days}d ahead)`
          );
        } catch (err) {
          console.error(`❌ Failed to send expiration reminder for doc ${doc.id}:`, err);
        }
      }
    }
  }

  /**
   * Archive expired documents — only for users whose plan includes auto_archive
   */
  async checkAndArchive(): Promise<void> {
    try {
      const expired = await this.documentRepository.findExpiredDocuments();
      if (!expired.length) return;

      const byUser = new Map<string, string[]>();
      for (const doc of expired) {
        const list = byUser.get(doc.user_id) || [];
        list.push(doc.id);
        byUser.set(doc.user_id, list);
      }

      let totalArchived = 0;
      for (const [userId, docIds] of byUser.entries()) {
        const archiveCheck = await subscriptionService.validateAction(userId, 'AUTO_ARCHIVE');
        if (!(archiveCheck as any).allowed) {
          continue;
        }
        const n = await this.documentRepository.archiveDocumentsByIds(docIds);
        totalArchived += n;
      }

      if (totalArchived > 0) {
        console.log(`📦 Archived ${totalArchived} expired document(s)`);
        await this.notificationService.notifyAdmins(
          'Documents archivés automatiquement',
          `${totalArchived} document(s) ont été archivés car leur date d'expiration est dépassée.`
        );
      }
    } catch (err) {
      console.error('❌ Error during document auto-archiving:', err);
    }
  }
}

export const expirationService = new ExpirationService();
