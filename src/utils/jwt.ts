import jwt, { type SignOptions } from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  username: string;
}

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET is not configured');
  return value;
}

export function signToken(payload: JwtPayload): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
  return jwt.sign(payload, secret(), { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, secret());
  if (typeof decoded === 'string' || !decoded.userId || !decoded.username) {
    throw new Error('Invalid token payload');
  }
  return { userId: String(decoded.userId), username: String(decoded.username) };
}
