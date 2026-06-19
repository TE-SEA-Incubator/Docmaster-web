import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service.ts';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
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
}
