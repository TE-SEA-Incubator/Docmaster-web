import { ActivityLogRepository } from '../repositories/activity-log.repository.ts';

export class ActivityLogService {
  private repo: ActivityLogRepository;

  constructor() {
    this.repo = new ActivityLogRepository();
  }

  async log(data: {
    user_id: string | null;
    action_type: string;
    entity_type?: string;
    entity_id?: string;
    description?: string;
    metadata?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
  }) {
    return this.repo.log(data);
  }

  async findAll(filters: {
    userId?: string;
    actionType?: string;
    entityType?: string;
    page?: number;
    limit?: number;
    fromDate?: string;
    toDate?: string;
  }) {
    const limit = filters.limit || 50;
    const offset = filters.page ? (filters.page - 1) * limit : 0;
    return this.repo.findAll({ ...filters, limit, offset });
  }

  async getDistinctActionTypes() {
    return this.repo.getDistinctActionTypes();
  }
}

export const activityLogService = new ActivityLogService();
