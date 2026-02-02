import express from 'express';
import { adminMiddleware } from '../middleware/auth.js';
import { config } from '../config.js';

const router = express.Router();

// Middleware to check admin password for all routes
// Expects header: "Authorization: Admin <password>"
router.use(adminMiddleware(config.adminPassword));

/**
 * Force reload all connected clients
 * POST /api/admin/force-reload
 */
router.post('/force-reload', (req, res) => {
    try {
        const io = req.app.get('io');
        if (!io) {
            return res.status(500).json({ error: 'Socket.IO not initialized' });
        }

        const timestamp = Date.now();
        io.emit('system:force_reload', {
            timestamp,
            message: 'Server updated. Reloading...'
        });

        console.log(`[Admin] Force reload signal sent at ${new Date().toISOString()}`);

        res.json({
            success: true,
            message: 'Force reload signal sent to all clients',
            timestamp
        });
    } catch (error) {
        console.error('Force reload error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
