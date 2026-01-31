import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getPlayerData(playerId) {
    const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { data: true, stats: true }
    });

    if (!player) return null;

    return {
        id: player.id,
        username: player.username,
        bankMoney: player.data?.bankMoney || 0,
        bonuses: player.data?.bonuses || {},
        stats: player.stats
    };
}

export async function syncPlayerData(playerId, data) {
    const { bankMoney, bonuses } = data;

    // Оновлюємо дані гравця
    await prisma.playerData.upsert({
        where: { playerId },
        update: {
            bankMoney: bankMoney ?? undefined,
            bonuses: bonuses ?? undefined
        },
        create: {
            playerId,
            bankMoney: bankMoney || 0,
            bonuses: bonuses || {}
        }
    });

    // Повертаємо актуальні дані
    return await getPlayerData(playerId);
}

export async function endGame(playerId, gameData) {
    const { score, survivalTime, moneyEarned } = gameData;

    // Оновлюємо статистику
    const currentStats = await prisma.playerStats.findUnique({
        where: { playerId }
    });

    const newBestTime = Math.max(currentStats?.bestSurvivalTime || 0, survivalTime);

    await prisma.playerStats.upsert({
        where: { playerId },
        update: {
            totalGames: { increment: 1 },
            totalPlaytime: { increment: survivalTime },
            totalMoneyEarned: { increment: moneyEarned },
            bestSurvivalTime: newBestTime
        },
        create: {
            playerId,
            totalGames: 1,
            totalPlaytime: survivalTime,
            totalMoneyEarned: moneyEarned,
            bestSurvivalTime: survivalTime
        }
    });

    // Записуємо в лідерборд
    await prisma.leaderboardEntry.create({
        data: {
            playerId,
            score,
            survivalTime
        }
    });

    // Повертаємо оновлені дані
    return await getPlayerData(playerId);
}
