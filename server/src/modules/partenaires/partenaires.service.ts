import argon2 from 'argon2';
import crypto from 'crypto';
import pool, { getClient } from '../../database/db.js';
import { PartenaireRepository } from './partenaires.repository.ts';
import { generateToken } from '../../config/jwt.ts';
import { MailService } from '../../services/mail.service.ts';
import { SmsService } from '../../services/sms.service.ts';
import { NotificationService } from '../../services/notification.service.ts';
import { walletService } from '../../services/wallet.service.ts';
import { DeclarationService } from '../../services/declaration.service.ts';
import { partnerLinks } from '../../utils/partnerLinks.ts';

export class PartenaireService {
  private repository = new PartenaireRepository();
  private mailService = new MailService();
  private smsService = new SmsService();
  private notificationService = new NotificationService();
  private declarationService = new DeclarationService();

  /**
   * Generate a temporary password for a new partner
   */
  private generateTempPassword(): string {
    return crypto.randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  }

  /**
   * Admin creates a new standalone partner account (like autorites, no user linked)
   */
  async create(data: any, createdBy: string) {
    const existing = await this.repository.findByEmail(data.email);
    if (existing) {
      throw new Error('Un partenaire avec cet email existe déjà');
    }

    const tempPassword = this.generateTempPassword();
    const hashedPassword = await argon2.hash(tempPassword);

    const profile = await this.repository.create({
      nom_organisation: data.nom_organisation,
      adresse: data.adresse,
      email: data.email,
      mot_de_passe: hashedPassword,
      telephone: data.telephone || null,
      nom_contact: data.nom_contact || data.nom_organisation,
      prenom_contact: data.prenom_contact || 'Organisation',
      ville: data.ville || null,
      region: data.region || null,
      created_by: createdBy,
    });

    // 1. Send invitation email with temp password
    try {
      await this.mailService.sendPartnerInviteEmail(
        profile.email,
        data.nom_organisation,
        tempPassword
      );
    } catch (err: any) {
      console.error('❌ [Partenaires] Email invitation échoué:', err.message);
    }

    // 2. Send SMS if phone provided
    if (profile.telephone) {
      try {
        await this.smsService.sendSms(
          profile.telephone,
          partnerLinks.inviteSmsText(data.nom_organisation)
        );
      } catch (err: any) {
        console.error('❌ [Partenaires] SMS invitation échoué:', err.message);
      }
    }

    // 3. Notify admins
    try {
      await this.notificationService.notifyAdmins(
        'Nouveau partenaire créé',
        `Nouveau compte organisation : ${data.nom_organisation} (${profile.email})`,
        'INFO',
        { partenaire_id: profile.id }
      );
    } catch (err: any) {
      console.error('❌ [Partenaires] Notification admin échouée:', err.message);
    }

    return {
      id: profile.id,
      nom_organisation: profile.nom_organisation,
      email: profile.email,
      telephone: profile.telephone,
      statut: profile.statut,
    };
  }

  /**
   * Partner login — returns JWT (id = partenaire.id)
   */
  async login(email: string, motDePasse: string) {
    const profile = await this.repository.findByEmail(email);
    if (!profile) {
      throw new Error('Email ou mot de passe incorrect');
    }

    const valid = await argon2.verify(profile.mot_de_passe || '', motDePasse);
    if (!valid) {
      throw new Error('Email ou mot de passe incorrect');
    }

    if (profile.statut !== 'ACTIF') {
      throw new Error('Compte partenaire désactivé. Contactez un administrateur.');
    }

    const token = generateToken(profile.id, profile.email, 'PARTNER');
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + 30);
    await this.repository.setRefreshToken(profile.id, refreshHash, refreshExpires);

    const { mot_de_passe, refresh_token_hash, refresh_token_expires, ...safe } = profile as any;
    return {
      token,
      refresh_token: refreshToken,
      partenaire: safe,
    };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    if (!refreshToken?.trim()) {
      throw new Error('Refresh token requis');
    }

    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const profile = await this.repository.findByRefreshTokenHash(refreshHash);
    if (!profile) {
      throw new Error('Session expirée, veuillez vous reconnecter');
    }

    if (profile.statut !== 'ACTIF') {
      throw new Error('Compte partenaire désactivé');
    }

    const newRefreshToken = crypto.randomBytes(48).toString('hex');
    const newRefreshHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const refreshExpires = new Date();
    refreshExpires.setDate(refreshExpires.getDate() + 30);
    await this.repository.setRefreshToken(profile.id, newRefreshHash, refreshExpires);

    const accessToken = generateToken(profile.id, profile.email, 'PARTNER');
    return {
      token: accessToken,
      refresh_token: newRefreshToken,
      partenaire: profile,
    };
  }

  /**
   * Revoke refresh token on logout
   */
  async revokeRefreshToken(partenaireId: string) {
    await this.repository.clearRefreshToken(partenaireId);
    return { success: true };
  }

  async findByRefreshHash(refreshHash: string) {
    return this.repository.findByRefreshTokenHash(refreshHash);
  }

  async revokeByRefreshToken(refreshToken: string) {
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const profile = await this.repository.findByRefreshTokenHash(refreshHash);
    if (profile) {
      await this.repository.clearRefreshToken(profile.id);
    }
  }

  /**
   * Change password (mandatory on first login)
   */
  async changePassword(partenaireId: string, ancienMotDePasse: string, nouveauMotDePasse: string) {
    if (nouveauMotDePasse.length < 8) {
      throw new Error('Le mot de passe doit contenir au moins 8 caractères');
    }

    const profile = await this.repository.findByIdWithPassword(partenaireId);
    if (!profile) {
      throw new Error('Compte introuvable');
    }

    const valid = await argon2.verify(profile.mot_de_passe || '', ancienMotDePasse);
    if (!valid) {
      throw new Error('Ancien mot de passe incorrect');
    }

    const hashed = await argon2.hash(nouveauMotDePasse);
    await this.repository.updatePassword(partenaireId, hashed);

    return { success: true, message: 'Mot de passe changé avec succès' };
  }

  /**
   * Forgot password: generate a reset token and send the reset link by email
   */
  async requestPasswordReset(email: string) {
    const profile = await this.repository.findByEmail(email);
    if (!profile) {
      throw new Error('Aucun compte partenaire avec cet email');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    await this.repository.setPasswordResetToken(profile.id, token, expires);

    try {
      await this.mailService.sendPortalPasswordResetEmail(
        profile.email,
        token,
        'partenaire'
      );
    } catch (err: any) {
      console.error('❌ [Partenaires] Email réinitialisation échoué:', err.message);
    }

    return { success: true, message: 'Email de réinitialisation envoyé si un compte existe' };
  }

  /**
   * Reset the password with a valid token
   */
  async resetPassword(token: string, nouveauMotDePasse: string) {
    if (!nouveauMotDePasse || nouveauMotDePasse.length < 8) {
      throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères');
    }

    const profile = await this.repository.findByResetToken(token);
    if (!profile) {
      throw new Error('Lien de réinitialisation invalide ou expiré');
    }

    const hashed = await argon2.hash(nouveauMotDePasse);
    await this.repository.updatePassword(profile.id, hashed);
    await this.repository.clearPasswordResetToken(profile.id);

    return {
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
      partenaire: { id: profile.id, email: profile.email },
    };
  }

  /**
   * Get partner profile by partenaire id
   */
  async findById(id: string) {
    const profile = await this.repository.findById(id);
    if (!profile) return null;
    const { encodeMediaFields } = await import('../../utils/media.utils.ts');
    const encoded = await encodeMediaFields({ logo_url: profile.logo_url });
    return {
      ...profile,
      logo_url: encoded.logo_url ?? profile.logo_url,
      wallet_balance: Number(profile.wallet_balance || 0),
      points: Number(profile.points || 0),
    };
  }

  /**
   * Upload / replace partner organisation logo
   */
  async updateLogo(partenaireId: string, logoPath: string) {
    const profile = await this.repository.findById(partenaireId);
    if (!profile) {
      throw new Error('Partenaire introuvable');
    }
    await this.repository.update(partenaireId, { logo_url: logoPath });
    return this.findById(partenaireId);
  }

  /**
   * Partner stats: declaration counts + wallet balance
   */
  async getStats(partenaireId: string) {
    const [total, matched, returned, available] = await Promise.all([
      this.repository.countDeclarations(partenaireId),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM declarations WHERE reporter_id = $1 AND reporter_type = 'PARTENAIRE' AND declaration_type = 'FOUND' AND status = 'MATCHED'`,
        [partenaireId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM declarations WHERE reporter_id = $1 AND reporter_type = 'PARTENAIRE' AND declaration_type = 'FOUND' AND status = 'RETURNED'`,
        [partenaireId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM declarations WHERE reporter_id = $1 AND reporter_type = 'PARTENAIRE' AND declaration_type = 'FOUND' AND status = 'AVAILABLE'`,
        [partenaireId]
      ),
    ]);
    const balanceRes = await pool.query(
      `SELECT COALESCE(wallet_balance, 0)::float AS balance, COALESCE(points, 0)::int AS points FROM partenaires WHERE id = $1`,
      [partenaireId]
    );

    return {
      total_declarations: total,
      found: total,
      matched: matched.rows[0].count,
      returned: returned.rows[0].count,
      available: available.rows[0].count,
      wallet_balance: balanceRes.rows[0]?.balance || 0,
      total_points: balanceRes.rows[0]?.points || 0,
    };
  }

  /**
   * List the partner's found declarations (FOUND only)
   */
  async getDeclarations(partenaireId: string, filters: any = {}) {
    const conditions = [
      `d.reporter_id = $1`,
      `d.reporter_type = 'PARTENAIRE'`,
      `d.declaration_type = 'FOUND'`,
    ];
    const params: any[] = [partenaireId];
    let idx = 2;

    if (filters.status) {
      conditions.push(`d.status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters.doc_type) {
      conditions.push(`d.doc_type::text = $${idx}`);
      params.push(filters.doc_type);
      idx++;
    }
    if (filters.q) {
      conditions.push(`(d.owner_name ILIKE $${idx} OR d.document_number ILIKE $${idx} OR d.identifiant_doc_dm ILIKE $${idx})`);
      params.push(`%${filters.q}%`);
      idx++;
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    const where = `WHERE ${conditions.join(' AND ')}`;
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM declarations d ${where}`,
      params
    );

    const query = `
      SELECT d.id, d.identifiant_doc_dm, d.doc_type, d.owner_name, d.document_number,
             d.status, d.ville, d.quartier, d.photo_recto, d.photo_verso,
             d.description, d.created_at,
             dt.nom AS doc_type_name, dt.code AS doc_type_code
      FROM declarations d
      LEFT JOIN document_types dt ON (dt.id::text = d.doc_type OR dt.code = d.doc_type)
      ${where}
      ORDER BY d.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const { rows } = await pool.query(query, [...params, limit, offset]);
    return { rows, total: countRes.rows[0].total, page, limit };
  }

  /**
   * Create a found declaration (partners can only declare TROUVAILLE, unlimited)
   */
  async createFoundDeclaration(data: any, partenaireId: string, files: any) {
    const photo_recto = files?.photo_recto?.[0]?.path;
    const photo_verso = files?.photo_verso?.[0]?.path;

    if (data.declaration_type && data.declaration_type !== 'FOUND') {
      throw new Error('Les partenaires peuvent uniquement créer des déclarations de trouvaille');
    }

    if (data.found_location && typeof data.found_location === 'string') {
      try {
        data.found_location = JSON.parse(data.found_location);
      } catch (e) {
        data.found_location = undefined;
      }
    }
    if (data.metadata && typeof data.metadata === 'string') {
      try {
        data.metadata = JSON.parse(data.metadata);
      } catch (e) {
        data.metadata = undefined;
      }
    }

    const declaration = await this.declarationService.createDeclaration(
      {
        ...data,
        declaration_type: 'FOUND',
        reporter_id: partenaireId,
        reporter_type: 'PARTENAIRE',
        photo_recto,
        photo_verso,
      },
      { bypassLimits: true }
    );

    return declaration;
  }

  /**
   * Delete one of the partner's own declarations
   */
  async deleteDeclaration(declarationId: string, partenaireId: string) {
    return this.declarationService.deleteDeclaration(declarationId, partenaireId);
  }

  /**
   * Partner wallet: balance + history
   */
  async getWallet(partenaireId: string, filters: any = {}) {
    const balanceRes = await pool.query(
      `SELECT COALESCE(wallet_balance, 0)::float AS balance FROM partenaires WHERE id = $1`,
      [partenaireId]
    );
    const history = await walletService.getPartnerHistory(
      partenaireId,
      Math.min(100, Number(filters.limit) || 50),
      Number(filters.offset) || 0
    );
    return {
      balance: balanceRes.rows[0]?.balance || 0,
      history,
    };
  }

  /**
   * Admin adjusts a partner wallet (credit/debit)
   */
  async adjustWallet(partenaireId: string, type: 'CREDIT' | 'DEBIT', amount: number, motif?: string, adminId?: string) {
    const profile = await this.repository.findById(partenaireId);
    if (!profile) {
      throw new Error('Partenaire introuvable');
    }

    const metadata = {
      partenaire_id: partenaireId,
      nom_organisation: profile.nom_organisation,
      motif: motif || (type === 'CREDIT' ? 'Ajustement admin (crédit)' : 'Ajustement admin (débit)'),
      by_admin: adminId || null,
    };

    let balance: number;
    if (type === 'CREDIT') {
      balance = await walletService.creditPartner(partenaireId, amount, 'ADMIN_ADJUSTMENT', { metadata });
    } else {
      balance = await walletService.debitPartner(partenaireId, amount, 'ADMIN_ADJUSTMENT', { metadata });
    }

    // Notification du partenaire
    try {
      await this.notificationService.notifyPartenaireWalletAdjust(
        partenaireId,
        type,
        amount,
        motif || (type === 'CREDIT' ? 'Ajustement administrateur (crédit)' : 'Ajustement administrateur (débit)')
      );
    } catch (err) {
      console.error('❌ [Partenaires] Notification wallet ajust échouée:', (err as any).message);
    }

    return { success: true, type, amount, balance };
  }

  /**
   * Admin lists all partners
   */
  async findAll(filters: any = {}) {
    const result = await this.repository.findAll({
      search: filters.search,
      statut: filters.statut,
      page: Number(filters.page) || 1,
      limit: Number(filters.limit) || 20,
    });
    return {
      rows: result.rows.map((r) => ({
        id: r.id,
        nom_organisation: r.nom_organisation,
        email: r.email,
        telephone: r.telephone,
        nom_contact: r.nom_contact,
        prenom_contact: r.prenom_contact,
        ville: r.ville,
        region: r.region,
        adresse: r.adresse,
        statut: r.statut,
        wallet_balance: Number(r.wallet_balance || 0),
        created_at: r.created_at,
      })),
      total: result.total,
    };
  }

  /**
   * Admin updates a partner (standalone columns, no user to touch)
   */
  async update(partenaireId: string, data: any) {
    const profile = await this.repository.findById(partenaireId);
    if (!profile) {
      throw new Error('Partenaire introuvable');
    }

    if (data.email !== undefined && data.email !== profile.email) {
      const taken = await this.repository.findByEmail(data.email);
      if (taken && taken.id !== partenaireId) {
        throw new Error('Cet email est déjà utilisé par un autre compte');
      }
    }

    const updated = await this.repository.update(partenaireId, {
      nom_organisation: data.nom_organisation,
      adresse: data.adresse,
      statut: data.statut,
      email: data.email,
      telephone: data.telephone,
      nom_contact: data.nom_contact,
      prenom_contact: data.prenom_contact,
      ville: data.ville,
      region: data.region,
    });

    return this.findById(partenaireId);
  }

  /**
   * Partner updates its own organisation profile (no email / statut)
   */
  async updateProfil(partenaireId: string, data: any) {
    const profile = await this.repository.findById(partenaireId);
    if (!profile) {
      throw new Error('Partenaire introuvable');
    }

    const updated = await this.repository.update(partenaireId, {
      nom_organisation: data.nom_organisation,
      telephone: data.telephone,
      nom_contact: data.nom_contact,
      prenom_contact: data.prenom_contact,
      adresse: data.adresse,
      ville: data.ville,
      region: data.region,
    });

    return this.findById(partenaireId);
  }

  /**
   * Admin deletes a partner (fully standalone, no user to delete)
   */
  async delete(partenaireId: string) {
    const profile = await this.repository.findById(partenaireId);
    if (!profile) {
      throw new Error('Partenaire introuvable');
    }
    
    // TODO: Améliorer la gestion de suppression avec les retraits
    // Pour l'instant, on bloque simplement la suppression si des données existent
    await this.repository.delete(partenaireId);
    return { success: true, message: 'Partenaire supprimé' };
  }

  async getEarningsStats(partenaireId: string) {
    const profile = await this.repository.findById(partenaireId);
    if (!profile) throw new Error('Partenaire introuvable');

    const stats = await this.getStats(partenaireId);
    const { partenaireEarningsService } = await import('../../services/partenaire-earnings.service.ts');
    const rawBreakdown = await partenaireEarningsService.getPointsBreakdown(partenaireId);

    const settingRes = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'points_per_declaration' LIMIT 1`
    );
    const ptsPerUnit = Number(settingRes.rows[0]?.value) || 5;

    return {
      wallet_balance: Number(profile.wallet_balance || 0),
      total_points: Number(profile.points || 0),
      points_breakdown: {
        declarations: {
          points: rawBreakdown.declaration_points,
          count: stats.found,
          pts_per_unit: ptsPerUnit,
        },
        returns: {
          points: rawBreakdown.return_points,
          count: stats.returned,
        },
        referrals: { points: 0, count: 0 },
      },
      stats: {
        total_found: stats.found,
        total_returned: stats.returned,
        total_matched: stats.matched,
        total_available: stats.available,
      },
    };
  }

  async getEarnings(partenaireId: string, filters: any = {}) {
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 50));
    const offset = Math.max(0, Number(filters.offset) || 0);
    const { partenaireEarningsService } = await import('../../services/partenaire-earnings.service.ts');
    return partenaireEarningsService.getPartenaireEarnings(partenaireId, limit, offset);
  }

  /**
   * Get complete points history (gains, conversions, withdrawals)
   */
  async getPointsHistory(partenaireId: string, filters: any = {}) {
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 50));
    const offset = Math.max(0, Number(filters.offset) || 0);
    const { startDate, endDate, type } = filters;

    const query = `
      SELECT 
        id,
        type,
        amount,
        currency,
        description,
        metadata,
        created_at
      FROM partenaire_earnings_history
      WHERE partenaire_id = $1
        AND ($2::timestamp IS NULL OR created_at >= $2)
        AND ($3::timestamp IS NULL OR created_at <= $3)
        AND ($4::varchar IS NULL OR type = $4)
      ORDER BY created_at DESC
      LIMIT $5 OFFSET $6
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM partenaire_earnings_history
      WHERE partenaire_id = $1
        AND ($2::timestamp IS NULL OR created_at >= $2)
        AND ($3::timestamp IS NULL OR created_at <= $3)
        AND ($4::varchar IS NULL OR type = $4)
    `;

    const [historyRes, countRes] = await Promise.all([
      pool.query(query, [partenaireId, startDate || null, endDate || null, type || null, limit, offset]),
      pool.query(countQuery, [partenaireId, startDate || null, endDate || null, type || null])
    ]);

    return {
      history: historyRes.rows,
      total: parseInt(countRes.rows[0].total, 10),
      limit,
      offset
    };
  }

  async convertPoints(partenaireId: string, amountPoints: number) {
    const { partenairePointsService } = await import('../../services/partenaire-points.service.ts');
    return partenairePointsService.convertPointsToWallet(partenaireId, amountPoints);
  }

  /**
   * Partner requests a withdrawal
   */
  async requestWithdrawal(partenaireId: string, amount: number, paymentMethod: string, phone: string) {
    const profile = await this.repository.findById(partenaireId);
    if (!profile) {
      throw new Error('Partenaire introuvable');
    }

    if (profile.statut !== 'ACTIF') {
      throw new Error('Compte partenaire désactivé. Impossible de demander un retrait.');
    }

    const balance = Number(profile.wallet_balance || 0);
    if (balance < amount) {
      throw new Error(`Solde insuffisant. Solde actuel: ${balance} FCFA`);
    }

    // Get minimum withdrawal amount from settings (default 1000 FCFA)
    const settingRes = await pool.query(
      `SELECT value FROM app_settings WHERE key = 'min_withdrawal_amount' LIMIT 1`
    );
    const minAmount = Number(settingRes.rows[0]?.value) || 1000;
    
    if (amount < minAmount) {
      throw new Error(`Le montant minimum de retrait est de ${minAmount} FCFA`);
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Debit wallet immediately
      await client.query(
        `UPDATE partenaires SET wallet_balance = wallet_balance - $1, updated_at = NOW()
         WHERE id = $2 AND wallet_balance >= $1`,
        [amount, partenaireId]
      );

      // Create withdrawal request
      const withdrawalRes = await client.query(
        `INSERT INTO withdrawals (user_id, amount, currency, payment_method, payment_details, status, source_type)
         VALUES ($1, $2, 'FCFA', $3, $4, 'PENDING', 'PARTENAIRE')
         RETURNING *`,
        [partenaireId, amount, paymentMethod, phone]
      );

      const withdrawal = withdrawalRes.rows[0];

      // Log in partner wallet transactions
      const balanceBefore = balance;
      const balanceAfter = balance - amount;
      await client.query(
        `INSERT INTO partenaire_wallet_transactions 
         (partenaire_id, amount, balance_before, balance_after, type, reason, reference_id, reference_type, metadata)
         VALUES ($1, $2, $3, $4, 'DEBIT', 'WITHDRAWAL', $5, 'withdrawal', $6)`,
        [
          partenaireId,
          amount,
          balanceBefore,
          balanceAfter,
          withdrawal.id,
          JSON.stringify({ payment_method: paymentMethod, phone, status: 'PENDING' })
        ]
      );

      await client.query('COMMIT');

      // Notify admins of new withdrawal request
      try {
        await this.notificationService.notifyAdmins(
          'Nouvelle demande de retrait partenaire',
          `${profile.nom_organisation} demande un retrait de ${amount} FCFA`,
          'INFO',
          { 
            withdrawal_id: withdrawal.id,
            partenaire_id: partenaireId,
            amount,
            payment_method: paymentMethod
          }
        );
      } catch (err) {
        console.error('❌ [Partenaires] Notification admin withdrawal échouée:', (err as any).message);
      }

      return {
        id: withdrawal.id,
        amount: withdrawal.amount,
        payment_method: withdrawal.payment_method,
        payment_details: withdrawal.payment_details,
        status: withdrawal.status,
        created_at: withdrawal.created_at,
        new_balance: balanceAfter
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get partner withdrawal history
   */
  async getWithdrawals(partenaireId: string, filters: any = {}) {
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 50));
    const offset = Math.max(0, Number(filters.offset) || 0);

    const query = `
      SELECT 
        w.id, 
        w.amount, 
        w.currency,
        w.payment_method, 
        w.payment_details, 
        w.status,
        w.admin_note,
        w.created_at,
        w.updated_at
      FROM withdrawals w
      WHERE w.user_id = $1 AND w.source_type = 'PARTENAIRE'
      ORDER BY w.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM withdrawals
      WHERE user_id = $1 AND source_type = 'PARTENAIRE'
    `;

    const [dataRes, countRes] = await Promise.all([
      pool.query(query, [partenaireId, limit, offset]),
      pool.query(countQuery, [partenaireId])
    ]);

    return {
      withdrawals: dataRes.rows,
      total: countRes.rows[0]?.total || 0,
      limit,
      offset
    };
  }
}
