import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { getLeaderboard, getPlayerRank, getGlobalStats } from '../services/leaderboardService.js';
import { getAllPlayers, getPlayerCount } from '../services/authService.js';
import { config } from '../config.js';

const router = Router();

// GET /api/leaderboard - топ гравців
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 100);
        const leaderboard = await getLeaderboard(limit);
        res.json(leaderboard);
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/leaderboard/me - позиція поточного гравця
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const rank = await getPlayerRank(req.player.id);
        res.json(rank);
    } catch (error) {
        console.error('Get player rank error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/leaderboard/stats - глобальна статистика (для адмінки)
router.get('/stats', async (req, res) => {
    try {
        const stats = await getGlobalStats();
        res.json(stats);
    } catch (error) {
        console.error('Get global stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/leaderboard/admin/players - список гравців (адмін)
router.get('/admin/players', adminMiddleware(config.adminPassword), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const offset = parseInt(req.query.offset) || 0;
        const players = await getAllPlayers(limit, offset);
        const total = await getPlayerCount();
        res.json({ players, total });
    } catch (error) {
        console.error('Get admin players error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
