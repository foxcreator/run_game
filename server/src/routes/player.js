import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getPlayerData, syncPlayerData, endGame } from '../services/playerService.js';

const router = Router();

// GET /api/player - отримати дані гравця
router.get('/', authMiddleware, async (req, res) => {
    try {
        const data = await getPlayerData(req.player.id);
        res.json(data);
    } catch (error) {
        console.error('Get player error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/player/sync - синхронізувати дані
router.post('/sync', authMiddleware, async (req, res) => {
    try {
        const { bankMoney, bonuses } = req.body;
        const data = await syncPlayerData(req.player.id, { bankMoney, bonuses });
        res.json(data);
    } catch (error) {
        console.error('Sync player error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/player/game-end - завершення гри
router.post('/game-end', authMiddleware, async (req, res) => {
    try {
        const { score, survivalTime, moneyEarned } = req.body;

        if (typeof survivalTime !== 'number' || survivalTime < 0) {
            return res.status(400).json({ error: 'Invalid survival time' });
        }

        const data = await endGame(req.player.id, {
            score: score || 0,
            survivalTime: Math.floor(survivalTime),
            moneyEarned: moneyEarned || 0
        });

        // Emit WebSocket event для оновлення лідерборду
        const io = req.app.get('io');
        if (io) {
            io.emit('leaderboard:update', { playerId: req.player.id });
        }

        res.json(data);
    } catch (error) {
        console.error('Game end error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
