import crypto from 'crypto';
import { IUser, User } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; jti: string };
    }
  }
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: string[];
}

export const registrationService = {
  async attemptLogin(username: string): Promise<ServiceResult<IUser>> {
    const idEmail = username.trim();
    const user = await User.findOne({ username: idEmail });

    if (!user) {
      return {
        success: false,
        error: 'Invalid username.',
      };
    }

    await user.save();
    return { success: true, data: user };
  },
};

export const generateSecureToken = (): { token: string; expires: Date } => {
  const token = crypto.randomBytes(64).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { token, expires };
};
