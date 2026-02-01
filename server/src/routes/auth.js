import { Router } from 'express';
import { login } from '../services/authService.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username } = req.body;

        if (!username || typeof username !== 'string') {
            return res.status(400).json({ error: 'Username is required' });
        }

        const trimmedUsername = username.trim();

        if (trimmedUsername.length < 2 || trimmedUsername.length > 50) {
            return res.status(400).json({ error: 'Username must be 2-50 characters' });
        }

        // Перевірка на допустимі символи (літери, цифри, _, -, пробіл)
        if (!/^[a-zA-Z0-9_\u0400-\u04FF -]+$/.test(trimmedUsername)) {
            return res.status(400).json({ error: 'Username can only contain letters, numbers, _, - and spaces' });
        }

        const result = await login(trimmedUsername);
        res.json(result);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
