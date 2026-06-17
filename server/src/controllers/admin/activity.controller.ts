import { Request, Response } from 'express';
import { activityLogService } from '../../services/activity-log.service.ts';

export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const {
      userId, actionType, entityType, page, limit,
      fromDate, toDate
    } = req.query;

    const data = await activityLogService.findAll({
      userId: userId as string | undefined,
      actionType: actionType as string | undefined,
      entityType: entityType as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      fromDate: fromDate as string | undefined,
      toDate: toDate as string | undefined,
    });

    const actionTypes = await activityLogService.getDistinctActionTypes();

    res.status(200).json({ success: true, data: data.rows, total: data.total, actionTypes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
