import { Request, Response } from 'express';
import { PartenaireService } from './partenaires.service.ts';
import { validateDTO } from '../../utils/validation.utils.ts';
import {
  CreatePartenaireDTO,
  LoginPartenaireDTO,
  ChangePasswordPartenaireDTO,
  ForgotPasswordPartenaireDTO,
  ResetPasswordPartenaireDTO,
  RefreshTokenPartenaireDTO,
  UpdatePartenaireDTO,
  UpdateProfilPartenaireDTO,
  WalletAdjustDTO,
} from './partenaires.dto.ts';
import { CreateDeclarationDTO } from '../../dtos/declaration.dto.ts';
import { walletService } from '../../services/wallet.service.ts';

export class PartenaireController {
  private service = new PartenaireService();

  /**
   * POST /api/partenaires  (ADMIN) — create a partner
   */
  create = async (req: Request, res: Response) => {
    try {
      const errors = await validateDTO(req.body, CreatePartenaireDTO);
      if (errors) {
        return res.status(400).json({ success: false, errors });
      }
      const createdBy = (req as any).user?.id;
      const result = await this.service.create(req.body, createdBy);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/partenaires/login  (PUBLIC) — partner login
   */
  login = async (req: Request, res: Response) => {
    try {
      const errors = await validateDTO(req.body, LoginPartenaireDTO);
      if (errors) {
        return res.status(400).json({ success: false, errors });
      }
      const result = await this.service.login(req.body.email, req.body.mot_de_passe);
      res.cookie('docmaster_token', result.token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(401).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/partenaires/refresh-token  (PUBLIC) — refresh access token
   */
  refreshToken = async (req: Request, res: Response) => {
    try {
      const errors = await validateDTO(req.body, RefreshTokenPartenaireDTO);
      if (errors) {
        return res.status(400).json({ success: false, errors });
      }
      const result = await this.service.refreshAccessToken(req.body.refresh_token);
      res.cookie('docmaster_token', result.token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(401).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/partenaires/logout  (PUBLIC) — clear auth cookie + revoke refresh token
   */
  logout = async (req: Request, res: Response) => {
    try {
      const refreshToken = req.body?.refresh_token as string | undefined;
      if (refreshToken) {
        await this.service.revokeByRefreshToken(refreshToken);
      }
    } catch {
      // Déconnexion locale prioritaire
    }
    res.clearCookie('docmaster_token', { httpOnly: true, sameSite: 'lax' });
    res.json({ success: true, message: 'Déconnecté' });
  };

  /**
   * POST /api/partenaires/forgot-password  (PUBLIC) — send password reset link
   */
  forgotPassword = async (req: Request, res: Response) => {
    try {
      const errors = await validateDTO(req.body, ForgotPasswordPartenaireDTO);
      if (errors) {
        return res.status(400).json({ success: false, errors });
      }
      const result = await this.service.requestPasswordReset(req.body.email);
      res.json(result);
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/partenaires/reset-password  (PUBLIC) — reset password with token
   */
  resetPassword = async (req: Request, res: Response) => {
    try {
      const errors = await validateDTO(req.body, ResetPasswordPartenaireDTO);
      if (errors) {
        return res.status(400).json({ success: false, errors });
      }
      const result = await this.service.resetPassword(
        req.body.token,
        req.body.nouveau_mot_de_passe
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/partenaires/change-password  (PARTNER) — first login password change
   */
  changePassword = async (req: Request, res: Response) => {
    try {
      const errors = await validateDTO(req.body, ChangePasswordPartenaireDTO);
      if (errors) {
        return res.status(400).json({ success: false, errors });
      }
      const partenaire = (req as any).partenaire;
      const result = await this.service.changePassword(
        partenaire.id,
        req.body.ancien_mot_de_passe,
        req.body.nouveau_mot_de_passe
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/partenaires/me  (PARTNER) — current partner profile
   */
  me = async (req: Request, res: Response) => {
    try {
      const profile = await this.service.findById((req as any).partenaire.id);
      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PUT /api/partenaires/profil  (PARTNER) — update own organisation profile
   */
  updateProfil = async (req: Request, res: Response) => {
    try {
      const errors = await validateDTO(req.body, UpdateProfilPartenaireDTO);
      if (errors) {
        return res.status(400).json({ success: false, errors });
      }
      const profile = await this.service.updateProfil((req as any).partenaire.id, req.body);
      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/partenaires/profil/logo  (PARTNER) — upload organisation logo
   */
  uploadLogo = async (req: Request, res: Response) => {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file?.path) {
        return res.status(400).json({ success: false, message: 'Fichier logo requis' });
      }
      const profile = await this.service.updateLogo((req as any).partenaire.id, file.path);
      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/partenaires/stats  (PARTNER) — dashboard stats
   */
  getStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.service.getStats((req as any).partenaire.id);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/partenaires/declarations  (PARTNER) — own found declarations
   */
  getDeclarations = async (req: Request, res: Response) => {
    try {
      const result = await this.service.getDeclarations((req as any).partenaire.id, req.query);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/partenaires/declarations  (PARTNER) — create found declaration
   */
  createFoundDeclaration = async (req: Request, res: Response) => {
    try {
      const errors = await validateDTO(req.body, CreateDeclarationDTO);
      if (errors) {
        return res.status(400).json({ success: false, message: 'Validation échouée', errors });
      }
      const result = await this.service.createFoundDeclaration(
        req.body,
        (req as any).partenaire.id,
        req.files
      );
      res.status(201).json({ success: true, message: 'Déclaration de document trouvé enregistrée', data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  /**
   * DELETE /api/partenaires/declarations/:id  (PARTNER) — delete own declaration
   */
  deleteDeclaration = async (req: Request, res: Response) => {
    try {
      const result = await this.service.deleteDeclaration(
        req.params.id as string,
        (req as any).partenaire.id
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/partenaires/wallet  (PARTNER) — balance + history
   */
  getWallet = async (req: Request, res: Response) => {
    try {
      const wallet = await this.service.getWallet((req as any).partenaire.id, req.query);
      res.json({ success: true, data: wallet });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getEarningsStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.service.getEarningsStats((req as any).partenaire.id);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getEarnings = async (req: Request, res: Response) => {
    try {
      const earnings = await this.service.getEarnings((req as any).partenaire.id, req.query);
      res.json({ success: true, data: earnings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  convertPoints = async (req: Request, res: Response) => {
    try {
      const amountPoints = Number(req.body?.amountPoints);
      if (!amountPoints || amountPoints <= 0) {
        return res.status(400).json({ success: false, message: 'Montant de points invalide' });
      }
      const result = await this.service.convertPoints((req as any).partenaire.id, amountPoints);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 400).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/partenaires/withdrawals/request  (PARTNER) — request withdrawal
   */
  requestWithdrawal = async (req: Request, res: Response) => {
    try {
      const { amount, payment_method, phone } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Montant invalide' });
      }
      if (!payment_method || !['MTN_MOMO', 'ORANGE_MONEY'].includes(payment_method)) {
        return res.status(400).json({ success: false, message: 'Méthode de paiement invalide' });
      }
      if (!phone || !/^\d{9,15}$/.test(phone.replace(/\D/g, ''))) {
        return res.status(400).json({ success: false, message: 'Numéro de téléphone invalide' });
      }

      const result = await this.service.requestWithdrawal(
        (req as any).partenaire.id,
        Number(amount),
        payment_method,
        phone
      );
      res.status(201).json({ success: true, data: result, message: 'Demande de retrait enregistrée avec succès' });
    } catch (error: any) {
      res.status(error.status || 400).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/partenaires/withdrawals  (PARTNER) — get withdrawal history
   */
  getWithdrawals = async (req: Request, res: Response) => {
    try {
      const withdrawals = await this.service.getWithdrawals(
        (req as any).partenaire.id,
        req.query
      );
      res.json({ success: true, data: withdrawals });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/partenaires/:id/wallet  (ADMIN) — partner balance + full history
   */
  getAdminWallet = async (req: Request, res: Response) => {
    try {
      const profile = await this.service.findById(req.params.id as string);
      if (!profile) {
        return res.status(404).json({ success: false, message: 'Partenaire introuvable' });
      }
      const history = await walletService.getPartnerHistory(
        req.params.id as string,
        Math.min(100, Number(req.query.limit) || 50),
        Number(req.query.offset) || 0
      );
      res.json({ success: true, data: { balance: profile.wallet_balance, history } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/partenaires  (ADMIN) — list partners
   */
  findAll = async (req: Request, res: Response) => {
    try {
      const result = await this.service.findAll(req.query);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/partenaires/:id  (ADMIN) — partner detail
   */
  findById = async (req: Request, res: Response) => {
    try {
      const profile = await this.service.findById(req.params.id as string);
      if (!profile) {
        return res.status(404).json({ success: false, message: 'Partenaire introuvable' });
      }
      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PUT /api/partenaires/:id  (ADMIN) — update partner
   */
  update = async (req: Request, res: Response) => {
    try {
      const errors = await validateDTO(req.body, UpdatePartenaireDTO);
      if (errors) {
        return res.status(400).json({ success: false, errors });
      }
      const profile = await this.service.update(req.params.id as string, req.body);
      if (!profile) {
        return res.status(404).json({ success: false, message: 'Partenaire introuvable' });
      }
      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/partenaires/:id/wallet  (ADMIN) — credit/debit partner wallet
   */
  adjustWallet = async (req: Request, res: Response) => {
    try {
      const errors = await validateDTO(req.body, WalletAdjustDTO);
      if (errors) {
        return res.status(400).json({ success: false, errors });
      }
      const result = await this.service.adjustWallet(
        req.params.id as string,
        req.body.type,
        Number(req.body.amount),
        req.body.motif,
        (req as any).user?.id
      );
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  /**
   * DELETE /api/partenaires/:id  (ADMIN) — delete partner
   */
  delete = async (req: Request, res: Response) => {
    try {
      const result = await this.service.delete(req.params.id as string);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
}