import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import syntheseRoutes from './routes/syntheseRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import folderRoutes from './routes/folderRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import revisionRoutes from './routes/revisionRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import exerciseRoutes from './routes/exerciseRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import xpRoutes from './routes/xpRoutes.js';
import bagRoutes from './routes/bagRoutes.js';
import seasonRoutes from './routes/seasonRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import shareRoutes from './routes/shareRoutes.js';
import planningRoutes from './routes/planningRoutes.js';
import cardRoutes from './routes/cardRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

dotenv.config();

const app = express();

// Trust proxy (required when behind Nginx/Cloudflare)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing (limite augmentée pour les images base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/syntheses', syntheseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/revision', revisionRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/xp', xpRoutes);
app.use('/api/bags', bagRoutes);
app.use('/api/seasons', seasonRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/tickets', supportRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
