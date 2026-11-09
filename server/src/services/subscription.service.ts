import { subscriptionRepository } from '../repositories/subscription.repository.ts';
import { query } from '../database/db.ts';
import { notificationService } from './notification.service.ts';
import { startNokashPaymentPolling } from '../controllers/payment.controller.ts';
import { v4 as uuidv4 } from 'uuid';
import { getPaymentProvider } from '../config/features.js';

class SubscriptionService {
  private resolveObjectsLimit(features: any) {
    const normalized = this.normalizePlanFeatures(features);
    const rawLimit = normalized.objects_limit ?? 0;
    const parsed = Number(rawLimit);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  /**
   * Normalize plan.features JSON (legacy keys + current seed format)
   */
  normalizePlanFeatures(raw: any) {
    if (!raw) {
      return {
        docs_per_type: 1,
        objects_limit: 2,
        sms_alerts: false,
        email_alerts: true,
        push_alerts: true,
        geo_tracking: false,
        expiration_management: true,
        expiration_reminders: false,
        auto_archive: true,
        export_data: false,
        history_days: 30,
      };
    }
    const f = typeof raw === 'string' ? JSON.parse(raw) : { ...raw };
    const alerts: string[] = Array.isArray(f.alerts) ? f.alerts : [];

    return {
      ...f,
      docs_per_type: Number(f.docs_per_type ?? f.max_declarations ?? 1),
      objects_limit: Number(f.objects_limit ?? f.objects ?? 2),
      sms_alerts:
        f.sms_alerts === true || alerts.includes('sms') || alerts.includes('all'),
      email_alerts:
        f.email_alerts === true ||
        alerts.includes('email') ||
        alerts.includes('all') ||
        (f.email_alerts !== false && f.email_alerts === undefined && alerts.length === 0),
      push_alerts:
        f.push_alerts !== false &&
        (f.push_alerts === true || alerts.includes('push') || alerts.includes('all') || f.push_alerts === undefined),
      geo_tracking:
        f.geo_tracking === true || (f.geo && f.geo !== 'none' && f.geo !== false),
      expiration_management: f.expiration_management === true,
      expiration_reminders: f.expiration_reminders === true,
      auto_archive: f.auto_archive !== false,
      export_data: f.export_data === true,
      priority_support: f.priority_support === true,
      verified_badge: f.verified_badge === true,
      ads_free: f.ads_free === true,
      history_days: Number(f.history_days ?? 30),
    };
  }

  private async resolveFeaturesForUser(userId: string) {
    const activeSub = await this.getActiveSubscription(userId);
    if (activeSub?.features) {
      return this.normalizePlanFeatures(activeSub.features);
    }
    const freePlan = await query("SELECT features FROM plans WHERE id = 'free'");
    return this.normalizePlanFeatures(freePlan.rows[0]?.features);
  }

  async getAllSubscriptions() {
    return await subscriptionRepository.findAll();
  }

  async getAdminStats() {
    return await subscriptionRepository.getAdminStats();
  }

  async updateSubscriptionStatus(id: string, status: string) {
    return await subscriptionRepository.updateStatus(id, status);
  }

  async getSubscriptionById(id: string) {
    return await subscriptionRepository.findById(id);
  }

  async getActiveSubscription(userId: string) {
    return await subscriptionRepository.findActiveByUserId(userId);
  }

  /**
   * Handle user subscription to a plan
   */
  async subscribeUser(userId: string, planId: string, months: number = 1, paymentDetails: any = {}) {
    // 1. Validate plan
    const planRes = await query('SELECT * FROM plans WHERE id = $1', [planId]);
    if (planRes.rows.length === 0) {
      throw new Error('Plan invalide.');
    }
    const plan = planRes.rows[0];

    // 2. Handle Payment
    if (plan.price > 0) {
      const orderId = `SUB-${uuidv4().substring(0, 8)}`;
      const discount = months >= 12 ? 0.8 : 1;
      const amountToPay = Math.round(plan.price * months * discount);

      if (paymentDetails.method === 'POINTS') {
        const { pointsService } = await import('./points.service.ts');
        const pointsNeeded = await pointsService.calculatePointsNeeded(amountToPay);
        await pointsService.redeemPoints(userId, pointsNeeded, 'POINTS_REDEMPTION', `Paiement abonnement plan ${plan.name}`, { planId, months });
        
        // Log transaction
        await query(
          `INSERT INTO transactions (user_id, amount, currency, status, payment_method, type, external_ref, metadata) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [userId, amountToPay, 'POINTS', 'SUCCESS', 'POINTS', 'subscription', orderId, JSON.stringify({ planId, months, orderId })]
        );
        
        return await this.activateSubscription(userId, planId, months);
      }

      // Map frontend method to payment provider method
      const provider = getPaymentProvider('USER');
      
      if (provider === 'SHAREPAY') {
        // Use SharePay for payment
        const { getSharePayService } = await import('./sharepay.service.js');
        const sharepay = getSharePayService();
        
        if (!paymentDetails.phone) {
          throw new Error('Numéro de téléphone requis pour le paiement SharePay.');
        }

        const normalizedMethod = String(paymentDetails.method || '').toUpperCase();
        const paymentMethod = normalizedMethod.includes('ORANGE') || normalizedMethod === 'OM'
          ? 'ORANGE_MONEY_CM'
          : 'MTN_MOMO_CM';

        console.log(`[SharePay] 🚀 Initiation paiement abonnement`, {
          userId,
          planId,
          planName: plan.name,
          months,
          amount: Math.round(amountToPay),
          currency: 'XAF',
          paymentMethod,
          phone: paymentDetails.phone?.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'), // masque le numéro dans les logs
          orderId,
        });
        
        // Create charge (direct debit)
        const result = await sharepay.createCharge({
          amount: Math.round(amountToPay),
          currency: 'XAF',
          paymentMethod,
          payerAccount: paymentDetails.phone,
          payerName: `User ${userId}`,
          merchantReference: orderId,
          description: `Abonnement ${plan.name} - ${months} mois`,
          idempotencyKey: orderId,
        });

        console.log(`[SharePay] ✅ Réponse charge reçue`, {
          reference: result.reference,
          status: result.status,
          amount: result.amount,
          currency: result.currency,
        });

        if (result.status !== 'PENDING' && result.status !== 'SUCCESS') {
          console.error(`[SharePay] ❌ Statut inattendu: ${result.status}`, result);
          throw new Error("Le paiement n'a pas pu être initié. Veuillez réessayer.");
        }

        // Create PENDING transaction
        await query(
          `INSERT INTO transactions (user_id, amount, currency, status, payment_method, type, external_ref, metadata) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            userId, 
            amountToPay, 
            'XAF',
            'PENDING', 
            paymentDetails.method || 'MOMO', 
            'subscription', 
            result.reference,
            JSON.stringify({ planId, months, orderId, provider: 'SHAREPAY' })
          ]
        );

        // For SharePay, webhook will handle activation
        return { 
          status: 'PENDING_PAYMENT', 
          message: 'Paiement SharePay initié. Validez sur votre téléphone.',
          transactionId: result.reference,
          provider: 'SHAREPAY'
        };
      } else {
        // Use Nokash (legacy)
        const { nokashService } = await import('./nokash.service.js');
        
        let nokashMethod: any = 'MTN_MOMO';
        if (paymentDetails.method === 'ORANGE_MONEY') nokashMethod = 'ORANGE_MONEY';

        const nokashRes = await nokashService.initiatePayment({
          payment_method: nokashMethod,
          amount: amountToPay,
          order_id: orderId,
          user_phone: paymentDetails.phone,
          country: 'CM'
        });

        console.log('🚀 [Nokash Response]', JSON.stringify(nokashRes, null, 2));

        if (nokashRes.status !== 'REQUEST_OK' && nokashRes.status !== 'SUCCESS') {
          const rawMsg = nokashRes.message || (nokashRes.data && nokashRes.data.message) || '';
          let userFriendlyMsg = "Le service de paiement est temporairement indisponible. Veuillez réessayer plus tard.";

          if (rawMsg.includes("pas encore intégré cette méthode")) {
            userFriendlyMsg = "Ce mode de paiement n'est pas encore disponible pour ce plan. Veuillez en choisir un autre.";
          } else if (rawMsg.includes("montant") || rawMsg.includes("amount")) {
            userFriendlyMsg = "Le montant de la transaction est invalide.";
          } else if (rawMsg.includes("phone") || rawMsg.includes("numéro")) {
            userFriendlyMsg = "Le numéro de téléphone fourni est incorrect ou mal formaté.";
          }

          throw new Error(`Nokash: ${userFriendlyMsg}`);
        }

        // Create PENDING transaction
        await query(
          `INSERT INTO transactions (user_id, amount, currency, status, payment_method, type, external_ref, metadata) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            userId, 
            amountToPay, 
            'XAF',
            'PENDING', 
            paymentDetails.method || 'MOMO', 
            'subscription', 
            nokashRes.data.id,
            JSON.stringify({ planId, months, orderId, provider: 'NOKASH' })
          ]
        );

        startNokashPaymentPolling({
          externalRef: nokashRes.data.id,
          onSuccess: async (transaction) => {
            const metadata = typeof transaction.metadata === 'string' ? JSON.parse(transaction.metadata) : transaction.metadata;
            await this.activateSubscription(transaction.user_id, metadata.planId, metadata.months);
          }
        });

        return { 
          status: 'PENDING_PAYMENT', 
          message: 'Paiement Nokash initié. Veuillez valider sur votre téléphone.',
          transactionId: nokashRes.data.id,
          provider: 'NOKASH'
        };
      }
    }

    // 3. If Free (or price 0), activate immediately
    return await this.activateSubscription(userId, planId, months);
  }

  /**
   * Actually activates the subscription (called after successful payment)
   */
  async activateSubscription(userId: string, planId: string, months: number = 1) {
    const planRes = await query('SELECT * FROM plans WHERE id = $1', [planId]);
    const plan = planRes.rows[0];
    if (!plan) {
      throw new Error(`Plan introuvable: ${planId}`);
    }

    // Determine start date (Stacking logic)
    const latestSubRes = await query(
      "SELECT date_fin FROM user_subscriptions WHERE user_id = $1 AND status = 'ACTIVE' ORDER BY date_fin DESC LIMIT 1",
      [userId]
    );
    
    let dateDebut = new Date();
    if (latestSubRes.rows.length > 0) {
      const lastExpiry = new Date(latestSubRes.rows[0].date_fin);
      if (lastExpiry > dateDebut) {
        dateDebut = lastExpiry;
      }
    }

    const dateFin = new Date(dateDebut);
    const planDuration = plan.duration_months || 1;
    dateFin.setMonth(dateFin.getMonth() + (planDuration * months));

    const newSub = await subscriptionRepository.create({
      user_id: userId,
      plan_id: planId,
      date_debut: dateDebut,
      date_fin: dateFin,
      status: 'ACTIVE',
      avantages_restants: plan.features?.bonus || { declarations: 0 }
    });

    const { activityLogService } = await import('./activity-log.service.ts');
    activityLogService.log({
      user_id: userId,
      action_type: 'SUBSCRIPTION_PURCHASED',
      entity_type: 'subscription',
      entity_id: newSub.id,
      description: `Abonnement au plan ${plan.name} (${plan.price} XAF) - ${months} mois`,
      metadata: { planId, planName: plan.name, price: plan.price, months, subId: newSub.id },
    });

    const isQueued = dateDebut > new Date();
    await notificationService.createNotification({
      user_id: userId,
      type: isQueued ? 'SUBSCRIPTION_QUEUED' : 'SUBSCRIPTION_ACTIVATED',
      title: isQueued ? 'Abonnement Planifié' : 'Abonnement Activé !',
      message: isQueued 
        ? `Votre nouvel abonnement au plan ${plan.name} est planifié et débutera le ${dateDebut.toLocaleDateString('fr-FR')}.`
        : `Votre abonnement au plan ${plan.name} est maintenant actif jusqu'au ${dateFin.toLocaleDateString('fr-FR')}.`,
      metadata: { planId, subId: newSub.id, startDate: dateDebut }
    });

    // Reward referrer if this user was referred and is subscribing to a paid plan
    if (plan.price > 0 && months > 0) {
      try {
        const { ReferralRepository } = await import('../repositories/referral.repository.ts');
        const referralRepo = new ReferralRepository();
        const subscriptionTotal = Math.round(plan.price * months * (months >= 12 ? 0.8 : 1));
        await referralRepo.rewardReferrerOnSubscription(userId, subscriptionTotal);
      } catch {
        // Referral reward failure should not block subscription activation
      }
    }

    return { status: 'SUCCESS', data: newSub };
  }

  async getUserUsage(userId: string) {
    let activeSub = await this.getActiveSubscription(userId);

    // Auto-create free subscription if user has none
    if (!activeSub) {
      const existingFree = await query(
        "SELECT id FROM user_subscriptions WHERE user_id = $1 AND plan_id = 'free' AND status = 'ACTIVE' LIMIT 1",
        [userId]
      );
      if (existingFree.rows.length === 0) {
        // Get user creation date for date_debut
        const userRes = await query("SELECT created_at FROM users WHERE id = $1", [userId]);
        const userCreatedAt = userRes.rows[0]?.created_at || new Date();

        const newSub = await subscriptionRepository.create({
          user_id: userId,
          plan_id: 'free',
          date_debut: userCreatedAt,
          date_fin: null,
          status: 'ACTIVE',
          avantages_restants: { declarations: 0 }
        });
        activeSub = newSub;
        // Enrich with plan data
        const planRes = await query("SELECT name, features FROM plans WHERE id = 'free'");
        if (planRes.rows[0]) {
          activeSub.plan_name = planRes.rows[0].name;
          activeSub.features = planRes.rows[0].features;
        }
      } else {
        // Re-fetch with plan data
        activeSub = await this.getActiveSubscription(userId);
      }
    }

    let planData;
    let features;

    if (!activeSub) {
      const freePlan = await query("SELECT * FROM plans WHERE id = 'free'");
      planData = freePlan.rows[0] || { name: 'Gratuit', features: {} };
      features = this.normalizePlanFeatures(planData.features);
    } else {
      planData = activeSub;
      features = this.normalizePlanFeatures(activeSub.features);
    }

    // 1. Objects Usage (Docs + Devices)
    const docsCountRes = await query(`SELECT COUNT(*) FROM my_documents WHERE user_id = $1`, [userId]);
    const devicesCountRes = await query(`SELECT COUNT(*) FROM my_devices WHERE user_id = $1`, [userId]);
    const currentObjects = parseInt(docsCountRes.rows[0].count) + parseInt(devicesCountRes.rows[0].count);
    const objectsLimit = this.resolveObjectsLimit(features) || 2;

    // 2. Declarations Usage (active LOST declarations only)
    const declCountRes = await query(
      `SELECT COUNT(*) FROM declarations
       WHERE reporter_id = $1
         AND declaration_type = 'LOST'
         AND status NOT IN ('RETURNED', 'CANCELLED', 'CLAIMED')`,
      [userId]
    );
    const currentDeclarations = parseInt(declCountRes.rows[0].count);
    // Since docs_per_type is per type, we might want an overall limit or just show the max.
    // For simplicity, let's use the sum of docs_per_type * estimated common types (e.g. 5) 
    // or just return the limits as is for UI.
    
    // 3. Referral Benefits
    const referralBonus = activeSub?.avantages_restants?.declarations || 0;

    // Calculate percentage based on objects (most tangible limit)
    const percentage = objectsLimit > 0 ? Math.min(Math.round((currentObjects / objectsLimit) * 100), 100) : 100;

    let daysRemaining: number | null = null;
    let daysTotal: number | null = null;
    let daysUsed = 0;
    let subscriptionEnd: string | null = null;
    let subscriptionStart: string | null = null;

    if (activeSub?.date_fin) {
      subscriptionEnd = activeSub.date_fin;
      subscriptionStart = activeSub.date_debut;
      const end = new Date(activeSub.date_fin).getTime();
      const start = new Date(activeSub.date_debut).getTime();
      const now = Date.now();
      daysTotal = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
      daysUsed = Math.min(daysTotal, Math.max(0, daysTotal - daysRemaining));
    } else if (activeSub?.date_debut) {
      // Free plan (date_fin is NULL = permanent) → cycle mensuel
      subscriptionStart = activeSub.date_debut;
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      daysTotal = lastDay.getDate();
      daysUsed = now.getDate();
      daysRemaining = daysTotal - daysUsed;
    }

    return {
      plan_name: planData.plan_name || planData.name,
      subscription_id: activeSub?.id,
      expires_at: activeSub?.date_fin,
      subscription_end: activeSub?.date_fin,
      subscription_start: activeSub?.date_debut,
      days_remaining: daysRemaining,
      days_total: daysTotal,
      days_used: daysUsed,
      usage: {
        objects: currentObjects,
        declarations: currentDeclarations,
        bonus: referralBonus
      },
      limits: {
        objects: objectsLimit,
        docs_per_type: features.docs_per_type,
        sms_alerts: features.sms_alerts,
        email_alerts: features.email_alerts,
        push_alerts: features.push_alerts,
        geo_tracking: features.geo_tracking,
        expiration_management: features.expiration_management,
        expiration_reminders: features.expiration_reminders,
        auto_archive: features.auto_archive,
        export_data: features.export_data,
        history_days: features.history_days,
        priority_support: features.priority_support,
        verified_badge: features.verified_badge,
        ads_free: features.ads_free,
      },
      features,
      percentage,
      // Legacy fields for backward compatibility (e.g. Dashboard)
      doc_limit: objectsLimit,
      doc_count: currentObjects
    };
  }

  /**
   * Validates if a user can perform an action based on their subscription
   * @param userId User ID
   * @param action Action type ('CREATE_DECLARATION', 'ADD_ALERT', 'GEO_TRACK')
   * @param metadata Additional info needed for validation (e.g., doc_type_id)
   */
  async validateAction(userId: string, action: string, metadata: any = {}) {
    const activeSub = await this.getActiveSubscription(userId);
    const features = await this.resolveFeaturesForUser(userId);

    if (!activeSub) {
      return this.checkLimits(userId, action, features, null, metadata);
    }

    if (action === 'CREATE_DECLARATION' && activeSub.avantages_restants?.declarations > 0) {
      return { allowed: true, useBenefit: true, subscriptionId: activeSub.id };
    }

    return this.checkLimits(userId, action, features, activeSub, metadata);
  }

  private async checkLimits(userId: string, action: string, rawFeatures: any, subscription: any, metadata: any) {
    const features = this.normalizePlanFeatures(rawFeatures);
    switch (action) {
      case 'CREATE_DECLARATION': {
        const docTypeId = metadata.docTypeId;
        const docTypeCode = metadata.docTypeCode;
        if (!docTypeId && !docTypeCode) {
          throw new Error('docTypeId requis pour valider la déclaration');
        }

        const sql = `
          SELECT COUNT(*) FROM declarations
          WHERE reporter_id = $1
            AND declaration_type = 'LOST'
            AND status NOT IN ('RETURNED', 'CANCELLED', 'CLAIMED')
            AND (
              doc_type = $2
              OR ($3::text IS NOT NULL AND doc_type = $3)
              OR doc_type::text = $2::text
            )
        `;
        const countRes = await query(sql, [userId, docTypeId, docTypeCode || null]);
        const currentCount = parseInt(countRes.rows[0].count);

        const limit = features.docs_per_type ?? 1;
        if (limit <= 0) {
          return {
            allowed: false,
            reason: 'Votre plan ne permet pas de créer de déclarations de perte.',
            current: currentCount,
            limit: 0,
          };
        }
        if (currentCount >= limit) {
          return { 
            allowed: false, 
            reason: `Limite de déclarations atteinte pour ce type (${limit}). Passez au plan supérieur !`,
            current: currentCount,
            limit: limit
          };
        }
        return { allowed: true };
      }

      case 'ADD_ALERT': {
        const alertType = metadata.alertType as string;
        if (alertType === 'push') {
          return features.push_alerts
            ? { allowed: true }
            : { allowed: false, reason: 'Les notifications push ne sont pas incluses dans votre plan.' };
        }
        if (alertType === 'sms') {
          return features.sms_alerts
            ? { allowed: true }
            : { allowed: false, reason: 'Votre plan ne supporte pas les alertes par SMS.' };
        }
        if (alertType === 'email') {
          return features.email_alerts
            ? { allowed: true }
            : { allowed: false, reason: 'Votre plan ne supporte pas les alertes par email.' };
        }
        return { allowed: false, reason: `Type d'alerte inconnu: ${alertType}` };
      }

      case 'GEO_TRACK': {
        if (!features.geo_tracking) {
          return {
            allowed: false,
            reason: 'La géolocalisation avancée n\'est pas incluse dans votre plan.',
          };
        }
        return { allowed: true };
      }

      case 'EXPIRATION_MGMT': {
        if (!features.expiration_management) {
          return {
            allowed: false,
            reason: "Votre plan ne permet pas de définir une date d'expiration sur les documents.",
          };
        }
        return { allowed: true };
      }

      case 'EXPIRATION_REMINDERS': {
        if (!features.expiration_reminders) {
          return {
            allowed: false,
            reason: 'Les rappels d\'expiration par email ne sont pas inclus dans votre plan.',
          };
        }
        return { allowed: true };
      }

      case 'AUTO_ARCHIVE': {
        if (!features.auto_archive) {
          return {
            allowed: false,
            reason: 'L\'archivage automatique n\'est pas inclus dans votre plan.',
          };
        }
        return { allowed: true };
      }

      case 'EXPORT_DATA': {
        if (!features.export_data) {
          return {
            allowed: false,
            reason: 'L\'export de données n\'est pas inclus dans votre plan.',
          };
        }
        return { allowed: true };
      }

      case 'REGISTER_OBJECT': {
        // Objects limit usually applies to the sum of private vault items (docs + devices)
        const docsCountRes = await query(`SELECT COUNT(*) FROM my_documents WHERE user_id = $1`, [userId]);
        const devicesCountRes = await query(`SELECT COUNT(*) FROM my_devices WHERE user_id = $1`, [userId]);
        
        const currentCount = parseInt(docsCountRes.rows[0].count) + parseInt(devicesCountRes.rows[0].count);

        const limit = this.resolveObjectsLimit(features);
        if (limit <= 0) {
          return { allowed: true };
        }
        if (currentCount >= limit) {
          return { 
            allowed: false, 
            reason: `Limite d'objets personnels atteinte (${limit}). Libérez de l'espace ou passez au plan supérieur !`,
            current: currentCount,
            limit: limit
          };
        }
        return { allowed: true };
      }

      default:
        return { allowed: true };
    }
  }

  /**
   * Consumes a benefit (like a free declaration)
   */
  async consumeBenefit(subscriptionId: string, benefitType: string) {
    if (benefitType === 'declaration') {
      const result = await query(
        `UPDATE user_subscriptions
         SET avantages_restants = jsonb_set(
           COALESCE(avantages_restants, '{}'::jsonb),
           '{declarations}',
           to_jsonb(GREATEST(0, COALESCE((avantages_restants->>'declarations')::int, 0) - 1))
         )
         WHERE id = $1
           AND COALESCE((avantages_restants->>'declarations')::int, 0) > 0
         RETURNING id`,
        [subscriptionId]
      );
      return result.rows.length > 0;
    }
    return false;
  }
}

export const subscriptionService = new SubscriptionService();
