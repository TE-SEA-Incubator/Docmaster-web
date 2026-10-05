import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { jwtConfig } from '../config/jwt.ts';

const JWT_SECRET = jwtConfig.secret;

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
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
    const decoded = jwt.verify(token, JWT_SECRET);

    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expiré.'
    });
  }
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
