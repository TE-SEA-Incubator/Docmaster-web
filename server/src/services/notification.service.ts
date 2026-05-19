import { NotificationRepository, Notification } from '../repositories/notification.repository.ts';
import { subscriptionService } from './subscription.service.ts';
import { SocketService } from './socket.service.ts';
import { MailService } from './mail.service.ts';
import { SmsService } from './sms.service.ts';
import { UserRepository } from '../repositories/auth.repository.ts';

export class NotificationService {
  private notificationRepository: NotificationRepository;
  private socketService: SocketService;
  private mailService: MailService;
  private smsService: SmsService;
  private userRepository: UserRepository;

  constructor() {
    this.notificationRepository = new NotificationRepository();
    this.socketService = SocketService.getInstance();
    this.mailService = new MailService();
    this.smsService = new SmsService();
    this.userRepository = new UserRepository();
  }

  async createNotification(data: Notification) {
    // 1. Check user subscription for allowed channels
    const userId = data.user_id;
    const channels: any = { in_app: true }; // In-app is always enabled
    
    // Check SMS
    const smsVal = await subscriptionService.validateAction(userId, 'ADD_ALERT', { alertType: 'sms' });
    channels.sms = smsVal.allowed;
    
    // Check Email
    const emailVal = await subscriptionService.validateAction(userId, 'ADD_ALERT', { alertType: 'email' });
    channels.email = emailVal.allowed;

    // Check Push
    const pushVal = await subscriptionService.validateAction(userId, 'ADD_ALERT', { alertType: 'push' });
    channels.push = pushVal.allowed;

    // 2. Enrich data with allowed channels
    const enrichedData = {
      ...data,
      channels: channels
    };

    const savedNotif = await this.notificationRepository.create(enrichedData);
    
    // 3. Trigger actual delivery (mocked for now)
    await this.deliverNotification(savedNotif);

    return savedNotif;
  }

  /**
   * Actual delivery logic to external providers
   */
  private async deliverNotification(notification: any) {
    const { channels, title, message, user_id, type, metadata } = notification;
    
    // 1. Always send real-time in-app notification if user is connected
    this.socketService.sendToUser(user_id, 'NEW_NOTIFICATION', notification);

    // Fetch user details for external channels
    const user = await this.userRepository.findById(user_id);
    if (!user) return;

    // 2. Send SMS if allowed and phone is available
    if (channels.sms && user.telephone) {
      console.log(`[SMS] Sending SMS to ${user.telephone}: ${title}`);
      try {
        let smsMessage = message;
        // Customize SMS message if it's a match
        if (type === 'MATCH_FOUND') {
          const docType = metadata?.docType || 'document';
          smsMessage = `DocMaster: Bonne nouvelle ! Votre ${docType} a été retrouvé. Connectez-vous pour voir les détails.`;
        }
        await this.smsService.sendSms(user.telephone, smsMessage);
      } catch (err) {
        console.error('Error sending notification SMS:', err);
      }
    }

    // 3. Send Email if allowed and email is available
    if (channels.email && user.email) {
      console.log(`[EMAIL] Sending Email to ${user.email}: ${title}`);
      try {
        if (type === 'MATCH_FOUND') {
          const docType = metadata?.docType || 'document';
          const matchType = metadata?.matchType || 'LOST_SIDE';
          await this.mailService.sendMatchNotificationEmail(
            user.email, 
            `${user.prenom} ${user.nom}`, 
            docType, 
            matchType as any
          );
        } else {
          // General notification email (optional, can be implemented if needed)
          console.log(`[EMAIL-PROVIDER] General email not implemented yet for type: ${type}`);
        }
      } catch (err) {
        console.error('Error sending notification Email:', err);
      }
    }

    if (channels.push) {
      console.log(`[PUSH-PROVIDER] Sending Push to user ${user_id}: ${title}`);
    }
  }

  async getUserNotifications(userId: string) {
    return await this.notificationRepository.findByUserId(userId);
  }

  async markAsRead(id: string) {
    return await this.notificationRepository.markAsRead(id);
  }

  async markAllAsRead(userId: string) {
    return await this.notificationRepository.markAllAsRead(userId);
  }

  /**
   * Notify when a declaration is successfully created
   */
  async notifyDeclarationCreated(userId: string, type: string, docType: string) {
    const isLost = type === 'LOST';
    await this.createNotification({
      user_id: userId,
      type: isLost ? 'LOST_SUBMITTED' : 'FOUND_SUBMITTED',
      title: isLost ? 'Déclaration de perte enregistrée' : 'Document trouvé enregistré',
      message: isLost 
        ? `Votre déclaration pour votre ${docType} est maintenant en cours de recherche.`
        : `Merci d'avoir signalé avoir trouvé ce ${docType}. Le propriétaire sera informé si une correspondance est trouvée.`,
      metadata: { docType, action: 'CREATE' }
    });
  }

  /**
   * Notify when a document is added to the user's vault
   */
  async notifyDocumentAdded(userId: string, docType: string) {
    await this.createNotification({
      user_id: userId,
      type: 'DOC_ADDED',
      title: 'Document sauvegardé',
      message: `Votre ${docType} a été ajouté à votre coffre-fort numérique.`,
      metadata: { docType, action: 'ADD' }
    });
  }

  /**
   * Notify when a document is deleted
   */
  async notifyDocumentDeleted(userId: string, docType: string) {
    await this.createNotification({
      user_id: userId,
      type: 'DOC_DELETED',
      title: 'Document supprimé',
      message: `Le document ${docType} a été retiré de votre compte.`,
      metadata: { docType, action: 'DELETE' }
    });
  }

  /**
   * Notify when a document is updated
   */
  async notifyDocumentUpdated(userId: string, docType: string) {
    await this.createNotification({
      user_id: userId,
      type: 'DOC_UPDATED',
      title: 'Document mis à jour',
      message: `Les informations de votre ${docType} ont été modifiées avec succès.`,
      metadata: { docType, action: 'UPDATE' }
    });
  }

  /**
   * Notify when a declaration is updated
   */
  async notifyDeclarationUpdated(userId: string, docType: string) {
    await this.createNotification({
      user_id: userId,
      type: 'DECL_UPDATED',
      title: 'Déclaration mise à jour',
      message: `Votre déclaration pour le document ${docType} a été mise à jour.`,
      metadata: { docType, action: 'UPDATE' }
    });
  }

  /**
   * Specific helper for match notifications
   */
  async notifyMatchFound(lostUserId: string, foundUserId: string, docId: string, docType: string) {
    // Notify the loser
    await this.createNotification({
      user_id: lostUserId,
      type: 'MATCH_FOUND',
      title: 'Bonne nouvelle ! Document trouvé',
      message: `Quelqu'un a signalé avoir trouvé votre ${docType}.`,
      metadata: { docId, docType, matchType: 'LOST_SIDE' }
    });

    // Notify the finder
    await this.createNotification({
      user_id: foundUserId,
      type: 'MATCH_FOUND',
      title: 'Correspondance trouvée !',
      message: `Le propriétaire du document ${docType} que vous avez trouvé a été identifié.`,
      metadata: { docId, docType, matchType: 'FOUND_SIDE' }
    });
  }

  /**
   * Notify the finder that the owner has paid
   */
  async notifyPaymentReceived(finderId: string, docType: string, docId: string) {
    await this.createNotification({
      user_id: finderId,
      type: 'PAYMENT_RECEIVED',
      title: 'Paiement reçu !',
      message: `Le propriétaire du document (${docType}) a effectué le paiement. Il vous contactera bientôt avec un code de vérification.`,
      metadata: { docId, action: 'RECOVERY_START' }
    });
  }
  /**
   * Notify the owner that the document has been successfully recovered
   */
  async notifyDocumentRecovered(ownerId: string, docType: string, docId: string) {
    await this.createNotification({
      user_id: ownerId,
      type: 'RECOVERY_SUCCESS',
      title: 'Document récupéré !',
      message: `Votre ${docType} a été officiellement marqué comme récupéré. Merci d'avoir utilisé DocMaster !`,
      metadata: { docId, action: 'RECOVERY_COMPLETE' }
    });
  }
  /**
   * Admin Notifications
   */
  async notifyAdmins(title: string, message: string, type: 'ALERT' | 'INFO' = 'INFO') {
    try {
      const { pool } = await import('../database/db.ts');
      const admins = await pool.query("SELECT id FROM users WHERE role = 'ADMIN'");
      
      const promises = admins.rows.map((admin: any) => {
        return this.createNotification({
          user_id: admin.id,
          title,
          message,
          type
        });
      });
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  }

}

export const notificationService = new NotificationService();
