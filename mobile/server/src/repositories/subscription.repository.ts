import { query } from '../database/db.ts';

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  date_debut: Date;
  date_fin: Date;
  status: string;
  auto_renew: boolean;
  avantages_restants: any;
  user_name?: string;
  user_email?: string;
  plan_name?: string;
}

class SubscriptionRepository {
  /**
   * Get all subscriptions with user and plan info
   */
  async findAll() {
    const sql = `
      SELECT us.*, 
             u.nom || ' ' || u.prenom as user_name, 
             u.email as user_email,
             p.name as plan_name
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id
      JOIN plans p ON us.plan_id = p.id
      ORDER BY us.date_debut DESC
    `;
    const result = await query(sql);
    return result.rows;
  }

  /**
   * Get subscription by ID
   */
  async findById(id: string) {
    const result = await query('SELECT * FROM user_subscriptions WHERE id = $1', [id]);
    return result.rows[0];
  }

  /**
   * Get subscriptions for a specific user
   */
  async findByUserId(userId: string) {
    const sql = `
      SELECT us.*, p.name as plan_name
      FROM user_subscriptions us
      JOIN plans p ON us.plan_id = p.id
      WHERE us.user_id = $1
      ORDER BY us.date_debut DESC
    `;
    const result = await query(sql, [userId]);
    return result.rows;
  }

  /**
   * Update subscription status
   */
  async updateStatus(id: string, status: string) {
    const result = await query(
      'UPDATE user_subscriptions SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0];
  }

  /**
   * Create new subscription
   */
  async create(sub: Partial<Subscription>) {
    const sql = `
      INSERT INTO user_subscriptions (user_id, plan_id, date_debut, date_fin, status, auto_renew, avantages_restants)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const params = [
      sub.user_id,
      sub.plan_id,
      sub.date_debut || new Date(),
      sub.date_fin,
      sub.status || 'ACTIVE',
      sub.auto_renew || false,
      sub.avantages_restants || {}
    ];
    const result = await query(sql, params);
    return result.rows[0];
  }

  /**
   * Get comprehensive stats for admin dashboard including variations and graphs
   */
  async getAdminStats() {
    // Current month and previous month timestamps
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    // 1. Total Users
    const usersRes = await query('SELECT COUNT(*) as count FROM users');
    const usersPrevRes = await query('SELECT COUNT(*) as count FROM users WHERE created_at < $1', [currentMonthStart]);
    const totalUsers = parseInt(usersRes.rows[0].count);
    const prevUsers = parseInt(usersPrevRes.rows[0].count);
    const usersGrowth = prevUsers === 0 ? 100 : ((totalUsers - prevUsers) / prevUsers) * 100;

    // 2. Active Subscriptions
    const activeSubsRes = await query("SELECT COUNT(*) as count FROM user_subscriptions WHERE status = 'ACTIVE'");
    // Approximation for previous month active subs: created before current month
    const activeSubsPrevRes = await query("SELECT COUNT(*) as count FROM user_subscriptions WHERE status = 'ACTIVE' AND date_debut < $1", [currentMonthStart]);
    const activeSubs = parseInt(activeSubsRes.rows[0].count);
    const prevSubs = parseInt(activeSubsPrevRes.rows[0].count);
    const subsGrowth = prevSubs === 0 ? 100 : ((activeSubs - prevSubs) / prevSubs) * 100;

    // 3. Estimated Revenue
    const totalRevenueRes = await query(`
        SELECT SUM(p.price) as sum
        FROM user_subscriptions us 
        JOIN plans p ON us.plan_id = p.id 
        WHERE us.status = 'ACTIVE'
    `);
    const totalRevenuePrevRes = await query(`
        SELECT SUM(p.price) as sum
        FROM user_subscriptions us 
        JOIN plans p ON us.plan_id = p.id 
        WHERE us.status = 'ACTIVE' AND us.date_debut < $1
    `, [currentMonthStart]);
    const estimatedMonthlyRevenue = parseFloat(totalRevenueRes.rows[0].sum || 0);
    const prevRevenue = parseFloat(totalRevenuePrevRes.rows[0].sum || 0);
    const revenueGrowth = prevRevenue === 0 ? 100 : ((estimatedMonthlyRevenue - prevRevenue) / prevRevenue) * 100;

    // 4. Lost Documents
    const lostDocsRes = await query("SELECT COUNT(*) as count FROM declarations WHERE declaration_type = 'LOST'");
    const lostDocsPrevRes = await query("SELECT COUNT(*) as count FROM declarations WHERE declaration_type = 'LOST' AND created_at < $1", [currentMonthStart]);
    const lostDocs = parseInt(lostDocsRes.rows[0].count);
    const prevLostDocs = parseInt(lostDocsPrevRes.rows[0].count);
    const lostDocsGrowth = prevLostDocs === 0 ? 100 : ((lostDocs - prevLostDocs) / prevLostDocs) * 100;

    // 5. Found Documents
    const foundDocsRes = await query("SELECT COUNT(*) as count FROM declarations WHERE declaration_type = 'FOUND'");
    const foundDocsPrevRes = await query("SELECT COUNT(*) as count FROM declarations WHERE declaration_type = 'FOUND' AND created_at < $1", [currentMonthStart]);
    const foundDocs = parseInt(foundDocsRes.rows[0].count);
    const prevFoundDocs = parseInt(foundDocsPrevRes.rows[0].count);
    const foundDocsGrowth = prevFoundDocs === 0 ? 100 : ((foundDocs - prevFoundDocs) / prevFoundDocs) * 100;

    // 6. Graphs Data (Revenue & Subscriptions over the last 6 months)
    const monthlyGraphRes = await query(`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE - INTERVAL '5 months'),
          date_trunc('month', CURRENT_DATE),
          '1 month'::interval
        ) as month
      )
      SELECT 
        to_char(m.month, 'Mon') as label,
        COALESCE(SUM(p.price), 0) as revenue,
        COUNT(us.id) as subscriptions
      FROM months m
      LEFT JOIN user_subscriptions us ON date_trunc('month', us.date_debut) = m.month AND us.status = 'ACTIVE'
      LEFT JOIN plans p ON us.plan_id = p.id
      GROUP BY m.month
      ORDER BY m.month ASC;
    `);

    // 7. Plan Distribution Graph
    const planDistRes = await query(`
      SELECT p.name as label, COUNT(us.id) as count
      FROM user_subscriptions us
      JOIN plans p ON us.plan_id = p.id
      WHERE us.status = 'ACTIVE'
      GROUP BY p.name
    `);

    // 8. Recent Transactions
    const recentTransactionsRes = await query(`
      SELECT 
        t.id, t.amount, t.currency, t.status, t.type, t.created_at,
        u.nom, u.prenom
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `);

    return {
      totalUsers,
      usersGrowth: parseFloat(usersGrowth.toFixed(1)),
      activeSubscriptions: activeSubs,
      subsGrowth: parseFloat(subsGrowth.toFixed(1)),
      estimatedMonthlyRevenue,
      revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
      lostDocs,
      lostDocsGrowth: parseFloat(lostDocsGrowth.toFixed(1)),
      foundDocs,
      foundDocsGrowth: parseFloat(foundDocsGrowth.toFixed(1)),
      graphs: {
        monthly: monthlyGraphRes.rows.map(r => ({
          label: r.label,
          revenue: parseFloat(r.revenue),
          subscriptions: parseInt(r.subscriptions)
        })),
        plans: planDistRes.rows.map(r => ({
          label: r.label,
          count: parseInt(r.count)
        }))
      },
      recentTransactions: recentTransactionsRes.rows
    };
  }

  /**
   * Find active subscription for a user
   */
  async findActiveByUserId(userId: string) {
    const sql = `
      SELECT us.*, p.name as plan_name, p.features
      FROM user_subscriptions us
      JOIN plans p ON us.plan_id = p.id
      WHERE us.user_id = $1 AND us.status = 'ACTIVE'
      ORDER BY 
        CASE 
          WHEN NOW() BETWEEN us.date_debut AND us.date_fin THEN 0
          WHEN us.date_debut > NOW() THEN 1
          ELSE 2
        END ASC,
        us.date_debut ASC
      LIMIT 1
    `;
    const result = await query(sql, [userId]);
    return result.rows[0];
  }
}

export const subscriptionRepository = new SubscriptionRepository();
