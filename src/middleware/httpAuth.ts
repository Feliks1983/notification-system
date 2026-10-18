import { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload & {
        userId?: string;
        username?: string;
      };
    }
}}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
   console.log('HTTP auth started:', req.method, req.originalUrl);
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader && authHeader.split(' ')[1];

  try {
    req.auth = verifyToken(token);
    console.log('HTTP auth passed:', req.method, req.originalUrl);
    next();
  } catch (err) {
    console.error('HTTP auth failed:', err);
    res.status(403).json({ error: 'Invalid token' });
  }
}
