import { validateToken } from '../services/authService.js';

export async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.substring(7);
    const player = await validateToken(token);

    if (!player) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    req.player = player;
    next();
}

export function adminMiddleware(adminPassword) {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Admin ')) {
            return res.status(401).json({ error: 'Unauthorized: Admin access required' });
        }

        const password = authHeader.substring(6);

        if (password !== adminPassword) {
            return res.status(403).json({ error: 'Forbidden: Invalid admin password' });
        }

        next();
    };
}
