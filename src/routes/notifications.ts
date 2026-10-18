import { Router, Request, Response, NextFunction } from 'express';
import type { Server } from 'socket.io';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/httpAuth';
import { Notification, NotificationTypes } from '../models/Notification';
import { emitUnreadCount } from '../socket';
import type { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer;
export const router = Router();

export function createNotificationsRouter(server: Server): Router {
  io = server;
  router.use(authenticate);

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, title, body } = req.body ?? {};
      if (!NotificationTypes.includes(type)) {
        res.status(400).json({ error: `type must be one of: ${NotificationTypes.join(', ')}` });
        return;
      }
      if (
        typeof title !== 'string' ||
        !title.trim() ||
        title.length > 160 ||
        typeof body !== 'string' ||
        !body.trim() ||
        body.length > 5000
      ) {
        res.status(400).json({ error: 'title (1-160 chars) and body (1-5000 chars) are required' });
        return;
      }
      const userId = req.auth?.userId;
       if (!userId) {
         res.status(401).json({ error: 'User ID missing from token' });
         return;
       }

      const notification = await Notification.create({
        userId,
        type,
        title: title.trim(),
        body: body.trim(),
      });
      const dto = {
        type: notification.type,
        title: notification.title,
        body: notification.body,
      };

      io.to(`user:${userId}`).emit('notification:new', dto);
      await emitUnreadCount(io, userId);
      res.status(201).json(dto);
    } catch (error) {
      next(error);
    }
  });

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth?.userId;

      if (!userId) {
        res.status(401).json({ error: 'User ID missing from token' });
        return;
      }
      const parsedLimit = Number.parseInt(String(req.query.limit ?? '20'), 10);
      const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 20;
      const unreadOnly = String(req.query.unreadOnly ?? 'false').toLowerCase() === 'true';
      const filter: Record<string, unknown> = { userId};
      if (unreadOnly) filter.read = false;
      const [items, unread] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
        Notification.countDocuments({ userId, read: false }),
      ]);

      res.json({
        notifications: items.map(n => ({
          id: String(n._id),
          userId: String(n.userId),
          type: n.type,
          title: n.title,
          body: n.body,
          read: n.read,
          createdAt: n.createdAt,
        })),
        unread,
      });
    } catch (error) {
      console.error('[GET] Handler failed:', error);
      next(error);
    }
  });

  router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
    try {
       const userId = req.auth?.userId;

       if (!userId) {
         res.status(401).json({ error: 'User ID missing from token' });
         return;
       }
      if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId},
        { $set: { read: true } },
        { returnDocument: 'after' }
      );
      if (!notification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }
      await emitUnreadCount(io, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('[PATCH] Handler failed:', error);
      next(error);
    }
  });

  return router;
}
