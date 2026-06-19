import { Request, Response } from 'express';
import { EarningsService } from '../services/earnings.service.ts';

export class EarningsController {
  private earningsService: EarningsService;

  constructor() {
    this.earningsService = new EarningsService();
  }

  getMyEarnings = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.earningsService.getUserEarnings(userId, limit, offset);

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        limit: result.limit,
        offset: result.offset
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
