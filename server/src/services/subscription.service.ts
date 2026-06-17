import { subscriptionRepository } from '../repositories/subscription.repository.ts';
import { query } from '../database/db.ts';
import { notificationService } from './notification.service.ts';
import { nokashService } from './nokash.service.ts';
import { v4 as uuidv4 } from 'uuid';

class SubscriptionService {
  private resolveObjectsLimit(features: any) {
    const rawLimit = features?.objects ?? features?.objects_limit ?? 0;
    const parsed = Number(rawLimit);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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
      const amountToPay = plan.price * months;

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

      // Map frontend method to Nokash method
      let nokashMethod: any = 'MTN_MOMO';
      if (paymentDetails.method === 'ORANGE_MONEY') nokashMethod = 'ORANGE_MONEY';
      // Add other mappings if needed

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
          nokashRes.data.id, // Nokash ID
          JSON.stringify({ planId, months, orderId })
        ]
      );

      return { 
        status: 'PENDING_PAYMENT', 
        message: 'Paiement initié. Veuillez valider sur votre téléphone.',
        transactionId: nokashRes.data.id
      };
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

    return { status: 'SUCCESS', data: newSub };
  }

  async getUserUsage(userId: string) {
    const activeSub = await this.getActiveSubscription(userId);
    let planData;
    let features;

    if (!activeSub) {
      const freePlan = await query("SELECT * FROM plans WHERE id = 'free'");
      planData = freePlan.rows[0] || { name: 'Gratuit', features: { docs_per_type: 1, objects: 2, alerts: ['email'] } };
      features = planData.features || { docs_per_type: 1, objects: 2, alerts: ['email'] };
    } else {
      planData = activeSub; // Contains plan_name, etc.
      features = activeSub.features;
    }

    // 1. Objects Usage (Docs + Devices)
    const docsCountRes = await query(`SELECT COUNT(*) FROM my_documents WHERE user_id = $1`, [userId]);
    const devicesCountRes = await query(`SELECT COUNT(*) FROM my_devices WHERE user_id = $1`, [userId]);
    const currentObjects = parseInt(docsCountRes.rows[0].count) + parseInt(devicesCountRes.rows[0].count);
    const objectsLimit = this.resolveObjectsLimit(features) || 2;

    // 2. Declarations Usage (Current active declarations)
    const declCountRes = await query(`SELECT COUNT(*) FROM declarations WHERE reporter_id = $1 AND status != 'RECOVERED'`, [userId]);
    const currentDeclarations = parseInt(declCountRes.rows[0].count);
    // Since docs_per_type is per type, we might want an overall limit or just show the max.
    // For simplicity, let's use the sum of docs_per_type * estimated common types (e.g. 5) 
    // or just return the limits as is for UI.
    
    // 3. Referral Benefits
    const referralBonus = activeSub?.avantages_restants?.declarations || 0;

    // Calculate percentage based on objects (most tangible limit)
    const percentage = objectsLimit > 0 ? Math.min(Math.round((currentObjects / objectsLimit) * 100), 100) : 100;

    return {
      plan_name: planData.plan_name || planData.name,
      subscription_id: activeSub?.id,
      expires_at: activeSub?.date_fin,
      usage: {
        objects: currentObjects,
        declarations: currentDeclarations,
        bonus: referralBonus
      },
      limits: {
        objects: objectsLimit,
        docs_per_type: features.docs_per_type,
        alerts: features.alerts || [],
        geo: features.geo || 'none'
      },
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
    
    // Default to FREE plan if no active subscription (or if we want to force active sub)
    // For DocMaster, every user might have a default FREE plan entry, but if not, we handle it.
    if (!activeSub) {
      // If no subscription, we might want to fetch the FREE plan features from the DB
      const freePlan = await query("SELECT * FROM plans WHERE id = 'free'");
      const features = freePlan.rows[0]?.features || { docs_per_type: 1, objects: 2, alerts: ['email'] };
      return this.checkLimits(userId, action, features, null, metadata);
    }

    // Check if user has "free declarations" from referral
    if (action === 'CREATE_DECLARATION' && activeSub.avantages_restants?.declarations > 0) {
      return { allowed: true, useBenefit: true, subscriptionId: activeSub.id };
    }

    return this.checkLimits(userId, action, activeSub.features, activeSub, metadata);
  }

  private async checkLimits(userId: string, action: string, features: any, subscription: any, metadata: any) {
    switch (action) {
      case 'CREATE_DECLARATION': {
        const docTypeId = metadata.docTypeId;
        if (!docTypeId) throw new Error("docTypeId requis pour valider la déclaration");

        // Get count of existing declarations for this type in the current period
        // For simplicity, let's count active declarations
        const sql = `SELECT COUNT(*) FROM declarations WHERE reporter_id = $1 AND doc_type = $2 AND status != 'RECOVERED'`;
        const countRes = await query(sql, [userId, docTypeId]);
        const currentCount = parseInt(countRes.rows[0].count);

        const limit = features.docs_per_type || 0;
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
        const alertType = metadata.alertType; // 'email', 'sms', 'push'
        const key = alertType === 'sms' ? 'sms_alerts' : alertType === 'email' ? 'email_alerts' : alertType;
        const allowed = features[key] === true || features.alerts?.includes(alertType) || features.alerts?.includes('all');
        if (!allowed) {
          return { 
            allowed: false, 
            reason: `Votre plan ne supporte pas les alertes par ${alertType}.`
          };
        }
        return { allowed: true };
      }

      case 'GEO_TRACK': {
        const level = features.geo; // 'basic', 'advanced'
        if (!level || (metadata.required === 'advanced' && level === 'basic')) {
          return { 
            allowed: false, 
            reason: "Géolocalisation avancée non incluse dans votre plan."
          };
        }
        return { allowed: true };
      }

      case 'EXPIRATION_MGMT': {
        const allowed = features.expiration_management === true;
        if (!allowed) {
          return {
            allowed: false,
            reason: "Votre plan ne permet pas de définir une date d'expiration sur les documents. Passez à une offre supérieure."
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
      const sub = await subscriptionRepository.findById(subscriptionId);
      if (sub && sub.avantages_restants?.declarations > 0) {
        const newAvantages = { ...sub.avantages_restants };
        newAvantages.declarations -= 1;
        
        await query(
          'UPDATE user_subscriptions SET avantages_restants = $1 WHERE id = $2',
          [JSON.stringify(newAvantages), subscriptionId]
        );
        return true;
      }
    }
    return false;
  }
}

export const subscriptionService = new SubscriptionService();
