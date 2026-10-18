import { Router } from 'express';
import { User } from '../models/User';
import { signToken } from '../utils/jwt';

export const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    if (!username || username.length > 40) {
      res.status(400).json({ error: 'username is required and must be at most 40 characters' });
      return;
    }

    const user = await User.findOneAndUpdate(
      { username },
      { $setOnInsert: { username } },
      { upsert: true, returnDocument: 'after'}
    );
    const id = user.id;
    const token = signToken({ userId: id.toString(), username: user.username });
    res.json({ token, user: { id, username: user.username } });
  } catch (error) {
    next(error);
  }
});
