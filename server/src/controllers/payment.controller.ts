import { Request, Response } from 'express';
import { query } from '../database/db.ts';
import { v4 as uuidv4 } from 'uuid';
import { subscriptionService } from '../services/subscription.service.ts';
import { notificationService } from '../services/notification.service.ts';

/**
 * Handle Nokash Payment Callback
 * Body format: { id, status, amount, phone, orderId }
 */
export const nokashCallback = async (req: Request, res: Response) => {
  console.log('Nokash Callback Received:', req.body);
  
  const { id, status, orderId } = req.body;

  try {
    // 1. Find the transaction
    const transRes = await query('SELECT * FROM transactions WHERE external_ref = $1', [id]);
    if (transRes.rows.length === 0) {
      console.warn(`Transaction not found for Nokash ID: ${id}`);
      return res.status(404).json({ success: false, message: 'Transaction non trouvée' });
    }

    const transaction = transRes.rows[0];

    // 2. If status is SUCCESS and transaction was PENDING
    if (status === 'SUCCESS' && transaction.status === 'PENDING') {
      let metadata = transaction.metadata;
      
      // Safety parse if string (some DB adapters return JSONB as string)
      if (typeof metadata === 'string') {
        try { metadata = JSON.parse(metadata); } catch(e) { 
          console.error('Metadata parse error:', e);
        }
      }

      const { planId, months } = metadata || {};

      // Update transaction status
      await query('UPDATE transactions SET status = $1 WHERE id = $2', ['SUCCESS', transaction.id]);

      // Activate subscription
      await subscriptionService.activateSubscription(transaction.user_id, planId, months);
      
      console.log(`Subscription activated for user ${transaction.user_id} via Nokash ${id}`);

      // Notify Admins
      await notificationService.notifyAdmins(
        'Nouveau Paiement Reçu',
        `Un paiement de ${transaction.amount} ${transaction.currency} a été effectué avec succès (Réf: ${id}).`,
        'INFO'
      );
    } else if (status === 'FAILED' || status === 'CANCELED') {
      await query('UPDATE transactions SET status = $1 WHERE id = $2', [status, transaction.id]);
      
      // Notify user of failure
      await notificationService.createNotification({
        user_id: transaction.user_id,
        type: 'PAYMENT_FAILED',
        title: 'Échec du Paiement',
        message: `Le paiement pour votre abonnement a échoué ou a été annulé.`,
        metadata: { nokashId: id }
      });
    }

    // Always respond 200 to Nokash
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Nokash Callback Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get current user's transactions
 */
export const getMyTransactions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non autorisé' });
    }

    const result = await query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.status(200).json({ 
      success: true, 
      transactions: result.rows 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
/**
 * Get all transactions (Admin)
 */
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT t.*, u.nom, u.prenom, u.email FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC'
    );

    res.status(200).json({ 
      success: true, 
      transactions: result.rows 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Process payment for document recovery
 * POST /api/payments/pay-recovery
 */
export const payRecovery = async (req: Request, res: Response) => {
    const { docId, amount, paymentMethod } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Utilisateur non authentifié' });
    }

    try {
        // 1. Check if declaration exists
        const declRes = await query('SELECT * FROM declarations WHERE id = $1', [docId]);
        if (declRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Déclaration non trouvée' });
        }
        const declaration = declRes.rows[0];

        // 2. Fetch document type to get pricing/commission
        const docTypeRes = await query('SELECT * FROM document_types WHERE code = $1 OR id::text = $1', [declaration.doc_type]);
        const docType = docTypeRes.rows[0];
        const finalAmount = docType ? Number(docType.prix_retrouvaille) : (amount || 5000);

        // 3. Create transaction for owner
        const transId = uuidv4();
        await query(
            `INSERT INTO transactions (id, user_id, amount, currency, status, payment_method, type, metadata) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                transId, 
                userId, 
                finalAmount, 
                'XAF', 
                'SUCCESS', 
                paymentMethod || 'MOBILE_MONEY',
                'recovery_fee', 
                JSON.stringify({ docId })
            ]
        );

        // 4. Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // 5. Identify finder and calculate commission
        const matchRes = await query(
            `SELECT * FROM matches 
             WHERE (lost_declaration_id = $1 OR found_declaration_id = $1) 
             ORDER BY created_at DESC LIMIT 1`,
            [docId]
        );

        let finderId = null;
        let finderReward = 0;
        
        if (matchRes.rows.length > 0) {
            const match = matchRes.rows[0];
            const otherId = match.lost_declaration_id === docId ? match.found_declaration_id : match.lost_declaration_id;
            const otherDeclRes = await query('SELECT reporter_id FROM declarations WHERE id = $1', [otherId]);
            if (otherDeclRes.rows.length > 0) {
                finderId = otherDeclRes.rows[0].reporter_id;
            }
        }

        // Calculate reward if finder identified
        if (finderId && docType) {
            const basePrice = Number(docType.prix_retrouvaille) || finalAmount;
            const percent = Number(docType.finder_percent) || 80;
            finderReward = (basePrice * percent) / 100;
        }

        // 6. Create or update claim
        const claimRes = await query('SELECT id FROM claims WHERE doc_id = $1 AND owner_id = $2', [docId, userId]);
        
        if (claimRes.rows.length > 0) {
            await query(
                'UPDATE claims SET status = $1, verification_code = $2, finder_id = $3 WHERE id = $4',
                ['PAID', verificationCode, finderId, claimRes.rows[0].id]
            );
        } else {
            await query(
                'INSERT INTO claims (doc_id, owner_id, finder_id, verification_code, status) VALUES ($1, $2, $3, $4, $5)',
                [docId, userId, finderId, verificationCode, 'PAID']
            );
        }

        // 6. Update declaration status
        await query('UPDATE declarations SET payment_status = $1, status = $2 WHERE id = $3', ['PAID', 'MATCHED', docId]);

        // 7. Notify finder about the payment (Informational)
        if (finderId) {
            await notificationService.createNotification({
                user_id: finderId,
                type: 'PAYMENT_PENDING',
                title: 'Paiement effectué par le propriétaire',
                message: `Le propriétaire a payé les frais. Vous recevrez votre récompense une fois le code de vérification validé lors de la remise.`,
                metadata: { docId }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                verificationCode,
                transactionId: transId
            }
        });

    } catch (error: any) {
        console.error('❌ [PayRecovery] Error:', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur lors du paiement.' });
    }
};
