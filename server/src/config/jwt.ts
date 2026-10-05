import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1h';

export const jwtConfig = {
  secret: JWT_SECRET,
  expiry: JWT_EXPIRY,
  accessExpiry: ACCESS_TOKEN_EXPIRY,
};

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Generate JWT access token
 */
export const generateToken = (userId: string, email: string, role: string = 'USER'): string => {
  return jwt.sign(
    { id: userId, email, role },
    jwtConfig.secret,
    { expiresIn: jwtConfig.accessExpiry as jwt.SignOptions['expiresIn'] }
  );
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, jwtConfig.secret) as JwtPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
};
