import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { config, isSupabaseConfigured } from './config.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';
import { api } from './routes/api.js';
import { startWorker } from './services/worker.js';
import { setIo } from './socket/hub.js';
import { registerSocket } from './socket/register.js';

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: config.clientOrigins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Server-Time', new Date().toISOString());
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: isSupabaseConfigured(),
    service: 'toodle',
    time: new Date().toISOString(),
    configured: isSupabaseConfigured(),
  });
});

app.use('/api', api);
app.use(errorMiddleware);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.clientOrigins, credentials: true },
});

setIo(io);
registerSocket(io);
startWorker();

httpServer.listen(config.port, '0.0.0.0', () => {
  console.log(`Toodle server on :${config.port}`);
  if (!isSupabaseConfigured()) {
    console.log('Supabase keys are missing. Add them to server/.env');
  }
});
