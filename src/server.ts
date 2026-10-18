import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import path from 'path';
import { connectDatabase, disconnectDatabase } from './db/mongo.js';
import { router as authRoutes } from './routes/auth';
import { createNotificationsRouter } from './routes/notifications';
import { configureSocket } from './socket/index.js';

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

const port = Number(process.env.PORT || 3000);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);
app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.originalUrl);
  next();
});
app.use('/api/auth', authRoutes);
app.use('/api/notifications', createNotificationsRouter(io));
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  const err = error as { status?: number; code?: number; message?: string };
  if (err.code === 11000) {
    res.status(400).json({ error: 'A record with these details already exists' });
    return;
  }
  const status = err.status && [400, 401, 404].includes(err.status) ? err.status : 500;
  res
    .status(status)
    .json({ error: status === 500 ? 'Internal server error' : err.message || 'Request failed' });
});

configureSocket(io);
async function start() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
    throw new Error('JWT_SECRET must be configured and contain at least 24 characters');
  }
  await connectDatabase(process.env.MONGODB_URI);
  httpServer.listen(port, () => console.log(`Chat server listening on http://localhost:${port}`));
}
async function shutdown() {
  io.close();
  httpServer.close();
  await disconnectDatabase();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

start().catch(error => {
  console.error('Server startup failed:', error);
  process.exit(1);
});
