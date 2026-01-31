import { getLeaderboard } from '../services/leaderboardService.js';

export function setupWebSocket(io) {
    let onlineCount = 0;

    io.on('connection', async (socket) => {
        onlineCount++;

        // Оновлюємо кількість онлайн
        io.emit('players:online', { count: onlineCount });

        // Відправляємо початковий лідерборд
        try {
            const leaderboard = await getLeaderboard(10);
            socket.emit('leaderboard:initial', leaderboard);
        } catch (error) {
            console.error('Error sending initial leaderboard:', error);
        }

        socket.on('disconnect', () => {
            onlineCount--;
            io.emit('players:online', { count: onlineCount });
        });
    });

    // Метод для broadcast оновлення лідерборду
    io.updateLeaderboard = async () => {
        try {
            const leaderboard = await getLeaderboard(10);
            io.emit('leaderboard:update', leaderboard);
        } catch (error) {
            console.error('Error broadcasting leaderboard:', error);
        }
    };

    console.log('WebSocket server initialized');
}
