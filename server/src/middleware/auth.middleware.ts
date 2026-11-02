import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { jwtConfig } from '../config/jwt.ts';
import pool from '../database/db.ts';

const JWT_SECRET = jwtConfig.secret;

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  let decoded: any;
  try {
    let token = req.cookies?.docmaster_token;
    const authHeader = req.headers.authorization;

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé. Token manquant.'
      });
    }
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expiré.'
    });
  }

  // Les comptes bloqués perdent immédiatement l'accès, même avec un token
  // encore valide. Les tokens partenaires pointent vers une autre table.
  if (decoded?.role !== 'PARTNER' && decoded?.id) {
    try {
      const { rows } = await pool.query('SELECT blocked_at FROM users WHERE id = $1', [
        decoded.id,
      ]);
      if (rows[0]?.blocked_at) {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_BLOCKED',
          message: 'Votre compte est suspendu. Contactez le support.',
        });
      }
    } catch (error) {
      console.error('[Auth] Blocked-account check failed:', error);
      return res.status(503).json({
        success: false,
        message: 'Service temporairement indisponible. Réessayez.',
      });
    }
  }

  (req as any).user = decoded;
  next();
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!(req as any).user || (req as any).user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Accès interdit. Privilèges administrateur requis.'
    });
  }
  next();
};
