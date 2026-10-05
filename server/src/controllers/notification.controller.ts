import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service.ts';
import { PushTokenRepository } from '../repositories/push-token.repository.ts';
import { DestinataireType } from '../repositories/notification.repository.ts';

export class NotificationController {
  private notificationService: NotificationService;
  private pushTokenRepository: PushTokenRepository;

  constructor() {
    this.notificationService = new NotificationService();
    this.pushTokenRepository = new PushTokenRepository();
  }

  /**
   * Mappe le rôle JWT vers le type de destinataire en BDD.
   */
  private resolveDestinataire(req: Request): { type: DestinataireType; id: string } | null {
    const user = (req as any).user;
    if (!user || !user.id) return null;
    const role = String(user.role || 'USER').toUpperCase();
    switch (role) {
      case 'PARTNER':
        return { type: 'PARTENAIRE', id: user.id };
      case 'AUTORITE':
      case 'AUTHORITY':
        return { type: 'AUTORITE', id: user.id };
      case 'ADMIN':
      case 'USER':
      default:
        return { type: 'USER', id: user.id };
    }
  }

  /**
   * Get all notifications for the authenticated user (tous rôles).
   */
  getMyNotifications = async (req: Request, res: Response) => {
    try {
      const destinataire = this.resolveDestinataire(req);
      if (!destinataire) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      const notifications = await this.notificationService.getDestinataireNotifications(
        destinataire.type,
        destinataire.id
      );

      res.json({
        success: true,
        data: notifications,
        count: notifications.length,
        unreadCount: notifications.filter((n) => !n.is_read).length,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * Mark a specific notification as read.
   */
  markAsRead = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await this.notificationService.markAsRead(id);
      res.json({ success: true, message: 'Notification marquée comme lue.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * Mark all notifications of the current destinataire as read.
   */
  markAllRead = async (req: Request, res: Response) => {
    try {
      const destinataire = this.resolveDestinataire(req);
      if (!destinataire) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }
      await this.notificationService.markAllAsRead(destinataire.type, destinataire.id);
      res.json({ success: true, message: 'Toutes les notifications ont été marquées comme lues.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * Register a push notification token (USER, PARTENAIRE, AUTORITE).
   */
  registerPushToken = async (req: Request, res: Response) => {
    try {
      const destinataire = this.resolveDestinataire(req);
      if (!destinataire) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      const { token, platform, device_name, unregister } = req.body;

      if (!token) {
        res.status(400).json({ success: false, message: 'Token is required' });
        return;
      }

      if (unregister === true) {
        await this.pushTokenRepository.delete(destinataire.id, token);
        console.log(`🔕 [Push FCM] Token désenregistré pour ${destinataire.type} (${destinataire.id})`);
        res.json({ success: true, message: 'Push token unregistered' });
        return;
      }

      await this.pushTokenRepository.upsert({
        user_id: destinataire.id,
        destinataire_type: destinataire.type,
        token,
        platform: platform || 'android',
        device_name: device_name || null,
      });

      console.log(`🔔 [Push FCM] Token enregistré avec succès pour ${destinataire.type} (${destinataire.id}) sur ${platform || 'android'}`);
      res.json({ success: true, message: 'Push token registered' });
    } catch (error: any) {
      console.error('❌ [Push FCM] Erreur enregistrement token:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * Send a broadcast (admin only).
   */
  sendBroadcast = async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user.id;
      const { title, message } = req.body;

      if (!title || !message) {
        res.status(400).json({ success: false, message: 'Title and message are required' });
        return;
      }

      const result = await this.notificationService.sendBroadcast(title, message, adminId);

      res.json({
        success: true,
        message: 'Broadcast envoyé',
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
