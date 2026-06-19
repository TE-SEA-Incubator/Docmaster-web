import { Request, Response } from 'express';
import { SmsService } from '../services/sms.service.ts';

const smsService = new SmsService();

export class SmsController {
  /**
   * Get SMS Balance
   */
  async getBalance(req: Request, res: Response) {
    try {
      const balance = await smsService.getBalance();
      return res.status(200).json({
        success: true,
        data: balance
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get SMS Usage Statistics
   */
  async getUsage(req: Request, res: Response) {
    try {
      const usage = await smsService.getUsage();
      return res.status(200).json({
        success: true,
        data: usage
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get SMS Purchase History
   */
  async getPurchaseHistory(req: Request, res: Response) {
    try {
      const history = await smsService.getPurchaseHistory();
      return res.status(200).json({
        success: true,
        data: history
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Send SMS (Admin)
   */
  async sendSms(req: Request, res: Response) {
    try {
      const { recipients, message, type } = req.body;
      if (!message) {
        return res.status(400).json({ success: false, message: 'Message requis' });
      }
      const success = await smsService.sendSms(recipients || '', message);
      return res.status(200).json({ success: !!success, message: success ? 'SMS envoyé' : 'Échec partiel' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
