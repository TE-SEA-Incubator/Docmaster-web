import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service.ts';
import { PushTokenRepository } from '../repositories/push-token.repository.ts';

export class NotificationController {
  private notificationService: NotificationService;
  private pushTokenRepository: PushTokenRepository;

  constructor() {
    this.notificationService = new NotificationService();
    this.pushTokenRepository = new PushTokenRepository();
  }

  /**
   * Get all notifications for the authenticated user
   */
  getMyNotifications = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const notifications = await this.notificationService.getUserNotifications(userId);
      
      res.json({
        success: true,
        data: notifications,
        count: notifications.length,
        unreadCount: notifications.filter(n => !n.is_read).length
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * Mark a notification as read
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
   * Mark all notifications as read
   */
  markAllRead = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      await this.notificationService.markAllAsRead(userId);
      res.json({ success: true, message: 'Toutes les notifications ont été marquées comme lues.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * Register a push notification token for the authenticated user
   */
  registerPushToken = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { token, platform, device_name, unregister } = req.body;

      if (!token) {
        res.status(400).json({ success: false, message: 'Token is required' });
        return;
      }

      // Handle unregistration (logout / permission revoked)
      if (unregister === true) {
        await this.pushTokenRepository.delete(userId, token);
        res.json({ success: true, message: 'Push token unregistered' });
        return;
      }

      await this.pushTokenRepository.upsert({
        user_id: userId,
        token,
        platform: platform || 'android',
        device_name: device_name || null,
      });

      res.json({ success: true, message: 'Push token registered' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * Send a broadcast notification to all users (admin only)
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
