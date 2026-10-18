import { Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';

export async function socketAuth(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token;

  if (typeof token !== 'string' || !token) {
    next(new Error('Authentication token required'));
    return;
  }
  try {
    const payload = verifyToken(token);

    socket.data.user = payload;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}
