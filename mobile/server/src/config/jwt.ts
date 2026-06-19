import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

export const jwtConfig = {
  secret: JWT_SECRET,
  expiry: JWT_EXPIRY,
};

/**
 * Generate JWT token for user
 */
export const generateToken = (userId: string, email: string, role: string = 'USER'): string => {
  return jwt.sign(
    { id: userId, email, role },
    jwtConfig.secret,
    { expiresIn: '24h' }
  );
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, jwtConfig.secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};
