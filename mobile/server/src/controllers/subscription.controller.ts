import { Request, Response } from 'express';
import { subscriptionService } from '../services/subscription.service.ts';

/**
 * Controller for subscription management
 */
export const getAllSubscriptions = async (req: Request, res: Response) => {
  try {
    const subscriptions = await subscriptionService.getAllSubscriptions();
    res.status(200).json({ success: true, data: subscriptions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const stats = await subscriptionService.getAdminStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSubscriptionStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const updated = await subscriptionService.updateSubscriptionStatus(id, status);
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserUsage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non autorisé' });
    }
    const usage = await subscriptionService.getUserUsage(userId);
    res.status(200).json({ success: true, data: usage });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
