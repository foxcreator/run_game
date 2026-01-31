import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getLeaderboard(limit = 100) {
    const entries = await prisma.leaderboardEntry.findMany({
        take: limit,
        orderBy: { survivalTime: 'desc' },
        include: {
            player: {
                select: { username: true }
            }
        },
        distinct: ['playerId'] // Тільки найкращий результат кожного гравця
    });

    return entries.map((entry, index) => ({
        rank: index + 1,
        username: entry.player.username,
        survivalTime: entry.survivalTime,
        score: entry.score,
        date: entry.createdAt
    }));
}

export async function getPlayerRank(playerId) {
    // Отримуємо найкращий результат гравця
    const playerBest = await prisma.leaderboardEntry.findFirst({
        where: { playerId },
        orderBy: { survivalTime: 'desc' }
    });

    if (!playerBest) {
        return { rank: null, survivalTime: 0 };
    }

    // Рахуємо скільки гравців мають кращий результат
    const betterPlayers = await prisma.leaderboardEntry.groupBy({
        by: ['playerId'],
        _max: { survivalTime: true },
        having: {
            survivalTime: { _max: { gt: playerBest.survivalTime } }
        }
    });

    return {
        rank: betterPlayers.length + 1,
        survivalTime: playerBest.survivalTime,
        score: playerBest.score
    };
}

export async function getGlobalStats() {
    const playerCount = await prisma.player.count();
    const totalGames = await prisma.playerStats.aggregate({
        _sum: { totalGames: true, totalPlaytime: true }
    });
    const topPlayer = await prisma.playerStats.findFirst({
        orderBy: { bestSurvivalTime: 'desc' },
        include: { player: { select: { username: true } } }
    });

    return {
        playerCount,
        totalGames: totalGames._sum.totalGames || 0,
        totalPlaytime: totalGames._sum.totalPlaytime || 0,
        topPlayer: topPlayer ? {
            username: topPlayer.player.username,
            bestSurvivalTime: topPlayer.bestSurvivalTime
        } : null
    };
}
