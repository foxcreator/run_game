import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export async function login(username) {
    // Шукаємо існуючого гравця
    let player = await prisma.player.findUnique({
        where: { username },
        include: { data: true, stats: true }
    });

    const isNewPlayer = !player;

    if (!player) {
        // Створюємо нового гравця
        player = await prisma.player.create({
            data: {
                username,
                sessionToken: uuidv4(),
                data: {
                    create: {
                        bankMoney: 0,
                        bonuses: {}
                    }
                },
                stats: {
                    create: {
                        totalGames: 0,
                        totalPlaytime: 0,
                        totalMoneyEarned: 0,
                        bestSurvivalTime: 0
                    }
                }
            },
            include: { data: true, stats: true }
        });
    } else {
        // Оновлюємо токен та lastSeen
        player = await prisma.player.update({
            where: { id: player.id },
            data: {
                sessionToken: uuidv4(),
                lastSeen: new Date()
            },
            include: { data: true, stats: true }
        });
    }

    return {
        success: true,
        token: player.sessionToken,
        player: {
            id: player.id,
            username: player.username,
            bankMoney: player.data?.bankMoney || 0,
            bonuses: player.data?.bonuses || {},
            stats: player.stats
        },
        isNewPlayer
    };
}

export async function validateToken(token) {
    if (!token) return null;

    const player = await prisma.player.findFirst({
        where: { sessionToken: token },
        include: { data: true, stats: true }
    });

    return player;
}

export async function getPlayerCount() {
    return await prisma.player.count();
}

export async function getAllPlayers(limit = 100, offset = 0) {
    return await prisma.player.findMany({
        take: limit,
        skip: offset,
        include: { data: true, stats: true },
        orderBy: { lastSeen: 'desc' }
    });
}
