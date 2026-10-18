import type { Server } from 'socket.io';
import { Notification } from '../models/Notification';
import { socketAuth } from '../middleware/socketAuth';

export function configureSocket(io: Server): void {
  io.use(socketAuth);
  io.on('connection', async socket => {
    const { userId } = socket.data.user as { userId: string; username: string };
    const room = `user:${userId}`;
    await socket.join(room);

    if (!userId) {
      console.error('Socket connected without userId');
      socket.disconnect(true);
      return;
    }

    console.log(`Socket connected: ${socket.id}, user: ${userId}`);

    try {
      const unread = await Notification.countDocuments({ userId, read: false });
      socket.emit('notification:count', { unread });
    } catch (error) {
      console.error('Unable to load unread count:', error);
    }

    socket.on('notification:ping', () =>
      socket.emit('notification:pong', { timestamp: new Date().toISOString() })
    );
    socket.on('error', error => console.error('Socket error:', error));
  });
}

export async function emitUnreadCount(io: Server, userId: string): Promise<void> {
  const unread = await Notification.countDocuments({ userId, read: false });
  io.to(`user:${userId}`).emit('notification:count', { unread });
}
