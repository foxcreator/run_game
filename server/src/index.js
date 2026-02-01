import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import playerRoutes from './routes/player.js';
import leaderboardRoutes from './routes/leaderboard.js';
import { setupWebSocket } from './websocket/leaderboard.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: config.corsOrigin,
        methods: ['GET', 'POST']
    }
});

// Зберігаємо io в app для доступу з роутів
app.set('io', io);

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Логування запитів
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket
setupWebSocket(io);

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
httpServer.listen(config.port, () => {
    console.log(`🚀 API Server running on port ${config.port}`);
    console.log(`📊 Environment: ${config.nodeEnv}`);
});
