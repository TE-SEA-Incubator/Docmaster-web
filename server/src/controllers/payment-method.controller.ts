import { Request, Response } from 'express';
import { PaymentMethodRepository } from '../repositories/payment-method.repository.ts';

const repo = new PaymentMethodRepository();

function idFromParams(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

export class PaymentMethodController {
  async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const methods = await repo.findbyUserId(userId);
      res.json({ success: true, data: methods });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { method_type, account_name, account_number, bank_name, is_default } = req.body;

      if (!method_type || !account_number) {
        res.status(400).json({ success: false, message: 'method_type et account_number requis' });
        return;
      }

      const validTypes = ['MTN', 'ORANGE', 'BANK'];
      if (!validTypes.includes(method_type.toUpperCase())) {
        res.status(400).json({ success: false, message: 'Type invalide. Utilisez MTN, ORANGE ou BANK' });
        return;
      }

      if (is_default) {
        await repo.clearDefault(userId);
      }

      const method = await repo.create({
        user_id: userId,
        method_type: method_type.toUpperCase(),
        account_name,
        account_number,
        bank_name,
        is_default: !!is_default,
      });

      res.status(201).json({ success: true, data: method });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = idFromParams(req);
      const existing = await repo.findById(id);
      if (!existing || existing.user_id !== userId) {
        res.status(404).json({ success: false, message: 'Moyen de paiement introuvable' });
        return;
      }

      const { method_type, account_name, account_number, bank_name, is_default } = req.body;

      if (is_default) {
        await repo.clearDefault(userId);
      }

      const updated = await repo.update(id, {
        method_type: method_type?.toUpperCase(),
        account_name,
        account_number,
        bank_name,
        is_default: !!is_default,
      });

      res.json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = idFromParams(req);
      const existing = await repo.findById(id);
      if (!existing || existing.user_id !== userId) {
        res.status(404).json({ success: false, message: 'Moyen de paiement introuvable' });
        return;
      }

      await repo.delete(id);
      res.json({ success: true, message: 'Moyen de paiement supprimé' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async setDefault(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = idFromParams(req);
      const existing = await repo.findById(id);
      if (!existing || existing.user_id !== userId) {
        res.status(404).json({ success: false, message: 'Moyen de paiement introuvable' });
        return;
      }

      const updated = await repo.setDefault(id, userId);
      res.json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
