import { Request, Response, NextFunction } from 'express';
import { activityLogService } from '../services/activity-log.service.ts';

export function logActivity(actionType: string, getMeta?: (req: Request) => {
  entity_type?: string;
  entity_id?: string;
  description?: string;
  metadata?: Record<string, any>;
}) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const originalJson = _res.json.bind(_res);
    _res.json = function (body: any) {
      const userId = (req as any).user?.id || null;
      const meta = getMeta ? getMeta(req) : {};

      activityLogService.log({
        user_id: userId,
        action_type: actionType,
        entity_type: meta.entity_type,
        entity_id: meta.entity_id,
        description: meta.description,
        metadata: meta.metadata,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      }).catch(() => {});

      return originalJson(body);
    };
    next();
  };
}
