import { DocumentRepository } from '../repositories/document.repository.ts';
import { NotificationService } from './notification.service.ts';
import { MailService } from './mail.service.ts';
import { UserRepository } from '../repositories/auth.repository.ts';

export class ExpirationService {
  private documentRepository: DocumentRepository;
  private notificationService: NotificationService;
  private mailService: MailService;
  private userRepository: UserRepository;

  constructor() {
    this.documentRepository = new DocumentRepository();
    this.notificationService = new NotificationService();
    this.mailService = new MailService();
    this.userRepository = new UserRepository();
  }

  /**
   * Check for documents expiring soon and send reminders
   * Runs daily: reminds at 7 days, 3 days, and 1 day before expiry
   */
  async checkAndRemind(): Promise<void> {
    const windows = [7, 3, 1];

    for (const days of windows) {
      const docs = await this.documentRepository.findExpiringDocuments(days);

      for (const doc of docs) {
        try {
          const user = await this.userRepository.findById(doc.user_id);
          if (!user) continue;

          const docType = doc.type_doc || 'document';

          // In-app notification
          await this.notificationService.createNotification({
            user_id: doc.user_id,
            type: 'DOC_EXPIRING',
            title: 'Document bientôt expiré',
            message: `Votre ${docType} expire dans ${days} jour${days > 1 ? 's' : ''}. Pensez à le renouveler.`,
            metadata: { docId: doc.id, docType, daysBeforeExpiry: days }
          });

          // Email reminder (sent for all users who have email alerts)
          if (user.email) {
            await this.mailService.sendExpirationReminderEmail(
              user.email,
              `${user.prenom} ${user.nom}`,
              docType,
              days,
              doc.date_expiration
            );
          }

          // Mark as reminded
          await this.documentRepository.markExpirationReminded(doc.id);

          console.log(`⏰ Expiration reminder sent for doc ${doc.id} (${docType}) to user ${doc.user_id} (${days}d ahead)`);
        } catch (err) {
          console.error(`❌ Failed to send expiration reminder for doc ${doc.id}:`, err);
        }
      }
    }
  }

  /**
   * Archive all documents past their expiration date
   */
  async checkAndArchive(): Promise<void> {
    try {
      const count = await this.documentRepository.archiveExpiredDocuments();
      if (count > 0) {
        console.log(`📦 Archived ${count} expired document(s)`);

        // Notify admins about archiving
        await this.notificationService.notifyAdmins(
          'Documents archivés automatiquement',
          `${count} document(s) ont été archivés car leur date d'expiration est dépassée.`
        );
      }
    } catch (err) {
      console.error('❌ Error during document auto-archiving:', err);
    }
  }
}

export const expirationService = new ExpirationService();
