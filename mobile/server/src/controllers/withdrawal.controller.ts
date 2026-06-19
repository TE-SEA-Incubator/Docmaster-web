import { Request, Response } from 'express';
import { WithdrawalRepository } from '../repositories/withdrawal.repository.js';
import { SettingRepository } from '../repositories/setting.repository.js';
import { UserRepository } from '../repositories/auth.repository.js';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { notificationService } from '../services/notification.service.js';
import { pool } from '../database/db.js';

const withdrawalRepo = new WithdrawalRepository();
const settingRepo = new SettingRepository();
const userRepo = new UserRepository();
const transactionRepo = new TransactionRepository();

export class WithdrawalController {

  /**
   * Admin: Approve a withdrawal
   */
  async approveWithdrawal(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { adminNote } = req.body;

      const withdrawalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const withdrawal = await withdrawalRepo.updateStatus(withdrawalId, 'COMPLETED', adminNote);
      
      // Update transaction status to SUCCESS
      const transactions = await transactionRepo.findByUser(withdrawal.user_id);
      const tx = transactions.find((t: any) => t.type === 'withdrawal' && t.metadata?.withdrawalId === id);
      
      if (tx) {
        await transactionRepo.updateStatus(tx.id, 'SUCCESS');
      }

      res.json({ success: true, message: 'Retrait approuvé et marqué comme terminé.', data: withdrawal });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Admin: Reject a withdrawal
   */
  async rejectWithdrawal(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { adminNote } = req.body;

      const withdrawalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const withdrawal = await withdrawalRepo.updateStatus(withdrawalId, 'REJECTED', adminNote);
      
      // Refund user balance
      await userRepo.updateBalance(withdrawal.user_id, Number(withdrawal.amount));

      // Update transaction status to FAILED
      const transactions = await transactionRepo.findByUser(withdrawal.user_id);
      const tx = transactions.find((t: any) => t.type === 'withdrawal' && t.metadata?.withdrawalId === id);
      
      if (tx) {
        await transactionRepo.updateStatus(tx.id, 'FAILED');
      }

      res.json({ success: true, message: 'Retrait rejeté. Les fonds ont été restitués à l\'utilisateur.', data: withdrawal });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Admin: List all pending withdrawals
   */
  async getAllPendingWithdrawals(req: Request, res: Response) {
    try {
      const query = 'SELECT w.*, u.nom, u.prenom, u.email FROM withdrawals w JOIN users u ON w.user_id = u.id WHERE w.status = \'PENDING\' ORDER BY w.created_at ASC';
      const { rows } = await pool.query(query);
      res.json({ success: true, data: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  async requestWithdrawal(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { amount, paymentMethod, paymentDetails } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Montant invalide.' });
      }

      // 1. Get minimum withdrawal amount from settings
      const minAmount = await settingRepo.getByKey('min_withdrawal_amount');
      if (amount < Number(minAmount)) {
        return res.status(400).json({ 
          success: false, 
          message: `Le montant minimum pour un retrait est de ${minAmount} XAF.` 
        });
      }

      // 2. Check user balance
      const user = await userRepo.findById(userId);
      if (!user || user.wallet_balance < amount) {
        return res.status(400).json({ success: false, message: 'Solde insuffisant.' });
      }

      // 3. Create withdrawal request
      const withdrawal = await withdrawalRepo.create({
        user_id: userId,
        amount,
        payment_method: paymentMethod,
        payment_details: paymentDetails
      });

      // 4. Record as a pending transaction (to lock the funds)
      await transactionRepo.create({
        user_id: userId,
        amount: -amount,
        type: 'withdrawal',
        status: 'PENDING',
        payment_method: paymentMethod,
        metadata: { withdrawalId: withdrawal.id, phone: paymentDetails }
      });

      // 5. Deduct balance (optional: some systems wait for approval, but locking is safer)
      await userRepo.updateBalance(userId, -amount);

      // Notify admins
      await notificationService.notifyAdmins(
        'Nouvelle demande de retrait',
        `L'utilisateur ${user.nom} a demandé un retrait de ${amount} XAF via ${paymentMethod}.`,
        'ALERT'
      );

      res.json({ 
        success: true, 
        message: 'Demande de retrait enregistrée avec succès. Elle sera traitée sous peu.',
        data: withdrawal 
      });

    } catch (error: any) {
      console.error('Withdrawal Request Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getMyWithdrawals(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const withdrawals = await withdrawalRepo.findByUserId(userId);
      res.json({ success: true, data: withdrawals });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
