import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import pool from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import menuRoutes from './routes/menu.routes.js';
import orderRoutes from './routes/order.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import mealPlanRoutes from './routes/meal-plan.routes.js';
import studentRoutes from './routes/student.routes.js';
import adminRoutes from './routes/admin.routes.js';
import shiftRoutes from './routes/shift.routes.js';
import flashDiscountRoutes from './routes/flash-discount.routes.js';
import promoRoutes from './routes/promo.routes.js';

import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDbReady({ retries = 5, backoffMs = 500 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        console.log('[startup] DB is ready');
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      lastErr = err;
      console.warn(
        `[startup] DB not ready (attempt ${attempt}/${retries}): ${err?.message || err}`
      );
      if (attempt < retries) {
        await delay(backoffMs * attempt);
      }
    }
  }
  throw lastErr;
}


const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

// NEW: remember the most recent kitchen broadcast so that a kitchen
// display which connects (or reconnects, e.g. after a crash/refresh)
// AFTER the broadcast was sent still receives it, instead of silently
// missing it because io.emit() only reaches sockets connected at that
// exact moment.
let lastKitchenBroadcast = null;

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // NEW: replay the last broadcast to this newly-connected socket, if any.
  if (lastKitchenBroadcast) {
    socket.emit('kitchen:broadcast', lastKitchenBroadcast);
  }

  socket.on('update_order_status', async ({ orderId, status }) => {
    if (!orderId || !status) return;
    try {
      const { updateOrderStatus } = await import('./services/order.service.js');
      const order = await updateOrderStatus(orderId, status);
      io.emit('order_status_changed', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
      });
      io.emit('order:status', { orderId: order.id, status: order.status });
    } catch (err) {
      console.error('Socket status update failed:', err.message);
    }
  });

  const relayKitchenBroadcast = (payload = {}) => {
    const message = payload?.message?.trim() || 'Kitchen update';
    const sentAt = payload?.sentAt || new Date().toISOString();
    lastKitchenBroadcast = { message, sentAt }; // NEW: remember it
    console.log('[socket] kitchen broadcast received', { socketId: socket.id, message, sentAt });
    io.emit('kitchen:broadcast', { message, sentAt });
  };

  socket.on('kitchen:broadcast', relayKitchenBroadcast);
  socket.on('kds:broadcast', relayKitchenBroadcast);

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

app.use(helmet());
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(generalLimiter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    success: true,
    message: 'QuickByte Café API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: env.nodeEnv,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/meal-plans', mealPlanRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/flash-discounts', flashDiscountRoutes);
app.use('/api/promo', promoRoutes);


app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  httpServer.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${env.port} is already in use.\n` +
        `Either set a different PORT environment variable or stop the process using this port.`);
      process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
  });

  (async () => {
    console.log('[startup] Waiting for DB ready...');
    await waitForDbReady({
      retries: parseInt(process.env.DB_READY_RETRIES || '5', 10),
      backoffMs: parseInt(process.env.DB_READY_BACKOFF_MS || '500', 10),
    });

    httpServer.listen(env.port, () => {
      console.log(`Server running on port ${env.port} [${env.nodeEnv}]`);
    });
  })().catch((err) => {
    console.error('[startup] Fatal: DB not ready, not starting server:', err);
    process.exit(1);
  });

  const shutdown = () => {
    console.log('Shutting down server...');
    httpServer.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

export { app, io };