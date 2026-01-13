// SpawnerSystem - система процедурного спавну об'єктів
import { GAME_CONFIG } from '../config/gameConfig.js';

class SpawnerSystem {
    constructor(scene, tilemap, player) {
        this.scene = scene;
        this.tilemap = tilemap;
        this.player = player;
        
        // Параметри зон спавну
        this.safeRadius = GAME_CONFIG.SPAWNER.SAFE_RADIUS;
        this.spawnRingMin = GAME_CONFIG.SPAWNER.SPAWN_RING_MIN;
        this.spawnRingMax = GAME_CONFIG.SPAWNER.SPAWN_RING_MAX;
        
        // Рейти спавну
        this.targetObstacles = GAME_CONFIG.SPAWNER.TARGET_OBSTACLES;
        this.targetMoney = GAME_CONFIG.SPAWNER.TARGET_MONEY;
        this.targetBonuses = GAME_CONFIG.SPAWNER.TARGET_BONUSES;
        this.targetChasers = GAME_CONFIG.SPAWNER.TARGET_CHASERS;
        
        // Таймер для перевірки спавну
        this.spawnCheckInterval = GAME_CONFIG.SPAWNER.SPAWN_CHECK_INTERVAL;
        this.lastSpawnCheck = 0;
        
        // Відстань для cleanup (видалення об'єктів позаду)
        this.cleanupDistance = GAME_CONFIG.SPAWNER.CLEANUP_DISTANCE;
    }
    
    update(time, delta) {
        // Перевіряємо чи потрібно спавнити об'єкти
        this.lastSpawnCheck += delta;
        if (this.lastSpawnCheck >= this.spawnCheckInterval) {
            this.lastSpawnCheck = 0;
            this.checkAndSpawn();
        }
        
        // Cleanup об'єктів позаду
        this.cleanup();
    }
    
    checkAndSpawn() {
        if (!this.player || !this.tilemap) return;
        
        // Перевіряємо та спавнимо об'єкти за потреби
        // Це буде викликатися з GameScene для конкретних типів об'єктів
    }
    
    /**
     * Знаходить валідну позицію для спавну в кільці навколо гравця
     * @returns {Object|null} {x, y} або null якщо не знайдено
     */
    findSpawnPosition(maxAttempts = 50) {
        if (!this.player || !this.tilemap) return null;
        
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            // Генеруємо випадковий кут
            const angle = Math.random() * Math.PI * 2;
            
            // Генеруємо відстань в кільці спавну
            const distance = Phaser.Math.Between(this.spawnRingMin, this.spawnRingMax);
            
            // Обчислюємо позицію
            const x = this.player.x + Math.cos(angle) * distance;
            const y = this.player.y + Math.sin(angle) * distance;
            
            // Перевіряємо межі світу
            if (x < 50 || x > GAME_CONFIG.WORLD.WIDTH - 50 ||
                y < 50 || y > GAME_CONFIG.WORLD.HEIGHT - 50) {
                continue;
            }
            
            // Перевіряємо чи не в safe radius
            const distToPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
            if (distToPlayer < this.safeRadius) {
                continue;
            }
            
            // Перевіряємо чи позиція прохідна
            if (!this.tilemap.isWalkable(x, y)) {
                continue;
            }
            
            // Знайшли валідну позицію
            return { x, y };
        }
        
        return null;
    }
    
    /**
     * Перевіряє чи позиція не занадто близько до інших об'єктів
     */
    isPositionValid(x, y, minDistance, existingObjects) {
        if (!existingObjects || existingObjects.length === 0) return true;
        
        for (const obj of existingObjects) {
            if (!obj || !obj.active) continue;
            
            const distance = Phaser.Math.Distance.Between(x, y, obj.x, obj.y);
            if (distance < minDistance) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Cleanup об'єктів, які далеко позаду гравця
     */
    cleanup() {
        if (!this.player) return;
        
        // Це буде викликатися з GameScene для конкретних масивів об'єктів
    }
    
    /**
     * Перевіряє чи об'єкт потрібно видалити (далеко позаду)
     */
    shouldCleanup(obj) {
        if (!obj || !this.player) return false;
        
        // Обчислюємо відстань позаду гравця (в напрямку руху)
        const dx = obj.x - this.player.x;
        const dy = obj.y - this.player.y;
        
        // Якщо об'єкт далі за cleanupDistance - видаляємо
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance > this.cleanupDistance;
    }
}

export default SpawnerSystem;
