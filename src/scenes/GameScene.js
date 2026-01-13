// GameScene - основна сцена гри
import Player from '../entities/Player.js';
import HUD from '../ui/HUD.js';
import Minimap from '../ui/Minimap.js';
import CaptureSystem from '../systems/CaptureSystem.js';
import TilemapSystem from '../systems/TilemapSystem.js';
import PathfindingSystem from '../systems/PathfindingSystem.js';
import SpawnerSystem from '../systems/SpawnerSystem.js';
import SoftCrowd from '../entities/SoftCrowd.js';
import ChaserBlocker from '../entities/ChaserBlocker.js';
import ChaserSticker from '../entities/ChaserSticker.js';
import { GAME_CONFIG } from '../config/gameConfig.js';

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // Розміри світу (1км x 1км = 4000x4000 пікселів, масштаб 1px = 0.25м)
        this.worldWidth = 4000;
        this.worldHeight = 4000;
        
        // Встановлюємо межі світу для фізики
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Створюємо tilemap систему
        try {
            this.tilemap = new TilemapSystem(this);
        } catch (error) {
            console.error('Помилка створення tilemap:', error);
            console.error('Stack trace:', error.stack);
            // Показуємо помилку на екрані з деталями
            const errorText = `Помилка завантаження карти:\n${error.message}`;
            this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 
                errorText, { fontSize: '20px', fill: '#ff0000', align: 'center' })
                .setOrigin(0.5);
            return;
        }
        
        // Створюємо систему обходу перешкод (pathfinding)
        this.pathfindingSystem = new PathfindingSystem(this.tilemap);

        // Знаходимо прохідний тайл для старту гравця (біля центру)
        const startPos = this.findWalkablePosition(this.worldWidth / 2, this.worldHeight / 2);
        this.player = new Player(this, startPos.x, startPos.y);
        
        // Ініціалізуємо час останнього зіткнення з кіоском
        this.player.lastKioskCollisionTime = 0;
        
        // Створюємо систему процедурного спавну (після створення гравця)
        if (GAME_CONFIG.SPAWNER.ENABLED) {
            this.spawnerSystem = new SpawnerSystem(this, this.tilemap, this.player);
        } else {
            this.spawnerSystem = null;
        }
        
        // Налаштовуємо камеру для слідкування за гравцем
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1); // Плавне слідкування
        this.cameras.main.setDeadzone(100, 100); // Мертва зона для плавнішого руху
        
        // Створюємо систему захоплення
        this.captureSystem = new CaptureSystem(this);
        
        // Створюємо HUD (залишаємо на фіксованій позиції екрану)
        // HUD створюється після tilemap, щоб бути поверх кіосків
        this.hud = new HUD(this);
        this.hud.create(this.player);
        this.hud.setCaptureSystem(this.captureSystem);
        
        // Створюємо міні-карту
        try {
            this.minimap = new Minimap(this, this.tilemap, this.player);
        } catch (error) {
            console.error('Помилка створення міні-карти:', error);
            this.minimap = null;
        }
        
        // Масив переслідувачів (ворогів)
        this.chasers = [];
        
        // Створюємо початкових ворогів
        this.spawnInitialChasers();
        
        // Масив перешкод
        this.obstacles = [];
        
        // Створюємо початкові перешкоди (далі будуть спавнитися через SpawnerSystem)
        this.spawnInitialObstacles();
        
        // Налаштовуємо колізії між гравцем та перешкодами
        this.setupObstacleCollisions();
        
        // Налаштовуємо колізії між гравцем та ворогами
        this.setupChaserCollisions();
        
        // Таймер виживання
        this.timeSurvived = 0;
        this.score = 0;
    }
    
    spawnInitialObstacles() {
        // Спавнимо початкові черги людей на карті (далі будуть спавнитися через SpawnerSystem)
        const initialCount = 5; // Початкова кількість
        let spawned = 0;
        let attempts = 0;
        const maxAttempts = 100;
        
        while (spawned < initialCount && attempts < maxAttempts) {
            attempts++;
            
            // Використовуємо SpawnerSystem для пошуку позиції (якщо увімкнено)
            let pos;
            if (this.spawnerSystem) {
                pos = this.spawnerSystem.findSpawnPosition(20);
            } else {
                // Якщо SpawnerSystem вимкнено, генеруємо випадкову позицію
                const x = Phaser.Math.Between(100, this.worldWidth - 100);
                const y = Phaser.Math.Between(100, this.worldHeight - 100);
                if (!this.tilemap.isWalkable(x, y)) continue;
                pos = { x, y };
            }
            
            if (!pos) continue;
            
            // Перевіряємо чи немає перешкод поруч
            const minDistance = GAME_CONFIG.SPAWNER.MIN_DISTANCE_BETWEEN_OBJECTS;
            if (this.spawnerSystem && !this.spawnerSystem.isPositionValid(pos.x, pos.y, minDistance, this.obstacles)) {
                continue;
            } else if (!this.spawnerSystem) {
                // Якщо SpawnerSystem вимкнено, перевіряємо вручну
                let tooClose = false;
                for (const obstacle of this.obstacles) {
                    const distance = Phaser.Math.Distance.Between(pos.x, pos.y, obstacle.x, obstacle.y);
                    if (distance < minDistance) {
                        tooClose = true;
                        break;
                    }
                }
                if (tooClose) continue;
            }
            
            // Створюємо чергу людей
            const crowd = new SoftCrowd(this, pos.x, pos.y);
            this.obstacles.push(crowd);
            spawned++;
        }
    }
    
    spawnObstacle() {
        // Спавнимо одну перешкоду через SpawnerSystem (якщо увімкнено)
        if (!this.spawnerSystem) return null;
        
        const pos = this.spawnerSystem.findSpawnPosition(30);
        if (!pos) return null;
        
        // Перевіряємо чи немає перешкод поруч
        const minDistance = GAME_CONFIG.SPAWNER.MIN_DISTANCE_BETWEEN_OBJECTS;
        if (!this.spawnerSystem.isPositionValid(pos.x, pos.y, minDistance, this.obstacles)) {
            return null;
        }
        
        // Створюємо чергу людей
        const crowd = new SoftCrowd(this, pos.x, pos.y);
        this.obstacles.push(crowd);
        return crowd;
    }
    
    handleSpawnerLogic() {
        // Перевіряємо та спавнимо об'єкти за потреби
        if (!this.spawnerSystem || !this.player) return;
        
        // Перевіряємо перешкоди
        const activeObstacles = this.obstacles.filter(o => o && o.active).length;
        const targetObstacles = GAME_CONFIG.SPAWNER.TARGET_OBSTACLES;
        
        if (activeObstacles < targetObstacles) {
            // Потрібно додати перешкоди
            const toSpawn = targetObstacles - activeObstacles;
            for (let i = 0; i < toSpawn; i++) {
                this.spawnObstacle();
            }
        }
        
        // Перевіряємо ворогів (поки що не спавнимо додаткових, тільки початкові)
        // Це буде реалізовано пізніше з урахуванням складності
    }
    
    setupObstacleCollisions() {
        // Налаштовуємо колізії між гравцем та перешкодами
        this.physics.add.overlap(
            this.player,
            this.obstacles,
            this.handleObstacleCollision,
            null,
            this
        );
    }
    
    handleObstacleCollision(player, obstacle) {
        if (!obstacle.active) return;
        
        // Викликаємо метод обробки колізії перешкоди
        if (obstacle.onPlayerCollision) {
            obstacle.onPlayerCollision(player);
        }
    }
    
    spawnInitialChasers() {
        // Спочатку спавнимо початкових ворогів
        const initialCount = GAME_CONFIG.CHASERS.SPAWN.INITIAL_COUNT;
        
        // Розподіляємо ворогів між типами (50% Blocker, 50% Sticker)
        const blockerCount = Math.floor(initialCount / 2);
        const stickerCount = initialCount - blockerCount;
        
        // Створюємо Blockers
        for (let i = 0; i < blockerCount; i++) {
            const chaser = this.spawnChaser('Blocker');
            if (!chaser) {
                console.warn(`Не вдалося заспавнити Blocker ${i + 1}`);
            }
        }
        
        // Створюємо Stickers
        for (let i = 0; i < stickerCount; i++) {
            const chaser = this.spawnChaser('Sticker');
            if (!chaser) {
                console.warn(`Не вдалося заспавнити Sticker ${i + 1}`);
            }
        }
    }
    
    spawnChaser(type) {
        // Знаходимо позицію для спавну (подалі від гравця)
        const spawnConfig = GAME_CONFIG.CHASERS.SPAWN;
        let attempts = 0;
        const maxAttempts = spawnConfig.MAX_SPAWN_ATTEMPTS;
        let spawnX, spawnY;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            // Генеруємо позицію на відстані від гравця
            const angle = Math.random() * Math.PI * 2;
            const distance = Phaser.Math.Between(
                spawnConfig.MIN_DISTANCE_FROM_PLAYER,
                spawnConfig.MAX_DISTANCE_FROM_PLAYER
            );
            spawnX = this.player.x + Math.cos(angle) * distance;
            spawnY = this.player.y + Math.sin(angle) * distance;
            
            // Перевіряємо межі світу
            if (spawnX < 50 || spawnX > this.worldWidth - 50 ||
                spawnY < 50 || spawnY > this.worldHeight - 50) {
                continue;
            }
            
            // Перевіряємо чи позиція прохідна
            if (!this.tilemap.isWalkable(spawnX, spawnY)) {
                continue;
            }
            
            // Перевіряємо чи немає інших ворогів поруч
            let tooClose = false;
            for (const chaser of this.chasers) {
                if (chaser && chaser.active) {
                    const dist = Phaser.Math.Distance.Between(spawnX, spawnY, chaser.x, chaser.y);
                    if (dist < spawnConfig.MIN_DISTANCE_BETWEEN) {
                        tooClose = true;
                        break;
                    }
                }
            }
            
            if (tooClose) {
                continue;
            }
            
            // Знайшли валідну позицію
            break;
        }
        
        if (attempts >= maxAttempts) {
            // Не знайшли позицію - використовуємо позицію гравця + відстань
            const angle = Math.random() * Math.PI * 2;
            const distance = (spawnConfig.MIN_DISTANCE_FROM_PLAYER + spawnConfig.MAX_DISTANCE_FROM_PLAYER) / 2;
            spawnX = this.player.x + Math.cos(angle) * distance;
            spawnY = this.player.y + Math.sin(angle) * distance;
            
            // Перевіряємо межі світу для fallback позиції
            spawnX = Phaser.Math.Clamp(spawnX, 50, this.worldWidth - 50);
            spawnY = Phaser.Math.Clamp(spawnY, 50, this.worldHeight - 50);
            
            // Якщо fallback позиція теж не прохідна, шукаємо найближчу прохідну
            if (!this.tilemap.isWalkable(spawnX, spawnY)) {
                const fallbackPos = this.findWalkablePosition(spawnX, spawnY);
                spawnX = fallbackPos.x;
                spawnY = fallbackPos.y;
            }
        }
        
        // Перевіряємо чи позиція все ще валідна перед створенням
        if (!this.tilemap.isWalkable(spawnX, spawnY)) {
            console.warn(`Не вдалося знайти валідну позицію для ${type} на (${spawnX}, ${spawnY})`);
            return null;
        }
        
        // Створюємо ворога
        let chaser;
        if (type === 'Blocker') {
            chaser = new ChaserBlocker(this, spawnX, spawnY);
        } else if (type === 'Sticker') {
            chaser = new ChaserSticker(this, spawnX, spawnY);
            chaser.setCaptureSystem(this.captureSystem);
        } else {
            return null;
        }
        
        chaser.setTarget(this.player);
        chaser.setPathfindingSystem(this.pathfindingSystem);
        this.chasers.push(chaser);
        
        return chaser;
    }
    
    setupChaserCollisions() {
        // Налаштовуємо колізії між гравцем та ворогами
        this.physics.add.overlap(
            this.player,
            this.chasers,
            this.handleChaserCollision,
            null,
            this
        );
    }
    
    handleChaserCollision(player, chaser) {
        if (!chaser.active) return;
        
        // Обробка колізії з Sticker (удар)
        if (chaser.type === 'Sticker' && chaser.onHitPlayer) {
            chaser.onHitPlayer();
        }
        
        // Blocker просто блокує шлях (фізична колізія)
    }
    
    findWalkablePosition(centerX, centerY) {
        // Шукаємо прохідний тайл біля центру
        const searchRadius = 50; // Радіус пошуку в тайлах
        const tile = this.tilemap.worldToTile(centerX, centerY);
        
        // Спочатку перевіряємо центр
        if (this.tilemap.isWalkable(centerX, centerY)) {
            return { x: centerX, y: centerY };
        }
        
        // Якщо центр не прохідний, шукаємо по спіралі
        for (let radius = 1; radius <= searchRadius; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Перевіряємо тільки периметр поточного радіусу
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    
                    const checkTile = { x: tile.x + dx, y: tile.y + dy };
                    const worldPos = this.tilemap.tileToWorld(checkTile.x, checkTile.y);
                    
                    if (this.tilemap.isWalkable(worldPos.x, worldPos.y)) {
                        return worldPos;
                    }
                }
            }
        }
        
        // Якщо не знайшли, повертаємо центр
        return { x: centerX, y: centerY };
    }
    
    update(time, delta) {
        // Оновлення гравця
        if (this.player) {
            this.player.update(time, delta);
            
            // Перевірка колізій гравця з тайлами
            this.checkTilemapCollisions();
        }
        
        // Оновлення системи захоплення
        if (this.captureSystem && this.player) {
            this.captureSystem.update(delta, this.player, this.chasers);
            
            // Перевірка програшу (capture досяг 100)
            if (this.captureSystem.isMaxed()) {
                this.handleGameOver();
            }
        }
        
        // Оновлення таймера виживання
        this.timeSurvived += delta / 1000; // в секундах
        
        // Оновлення системи спавну
        if (this.spawnerSystem) {
            this.spawnerSystem.update(time, delta);
            this.handleSpawnerLogic();
        }
        
        // Оновлення перешкод
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            if (!obstacle || !obstacle.active) {
                this.obstacles.splice(i, 1);
                continue;
            }
            
            // Cleanup перешкод позаду
            if (this.spawnerSystem && this.spawnerSystem.shouldCleanup(obstacle)) {
                obstacle.destroy();
                this.obstacles.splice(i, 1);
                continue;
            }
            
            if (obstacle.update) {
                obstacle.update(delta);
            }
        }
        
        // Оновлення ворогів
        for (let i = this.chasers.length - 1; i >= 0; i--) {
            const chaser = this.chasers[i];
            if (!chaser || !chaser.active) {
                this.chasers.splice(i, 1);
                continue;
            }
            
            // Cleanup ворогів позаду (але не видаляємо ворогів, вони завжди активні)
            // Вороги будуть видалятися тільки при смерті або інших умовах
            
            chaser.update(delta);
            // Перевіряємо колізії ворогів з тайлами карти
            this.checkChaserTilemapCollisions(chaser);
        }
        
        // Оновлення HUD
        if (this.hud) {
            this.hud.update();
            // Переконаємося, що HUD завжди поверх всього
            this.children.bringToTop(this.hud.staminaBarBg);
            this.children.bringToTop(this.hud.staminaBar);
            this.children.bringToTop(this.hud.staminaText);
            this.children.bringToTop(this.hud.dashCooldownBg);
            this.children.bringToTop(this.hud.dashCooldownBar);
            this.children.bringToTop(this.hud.dashText);
            this.children.bringToTop(this.hud.captureBarBg);
            this.children.bringToTop(this.hud.captureBar);
            this.children.bringToTop(this.hud.captureText);
        }
        
        // Оновлення міні-карти
        if (this.minimap) {
            this.minimap.update();
        }
    }
    
    checkChaserTilemapCollisions(chaser) {
        if (!this.tilemap || !chaser) return;
        
        const chaserX = chaser.x;
        const chaserY = chaser.y;
        const chaserRadius = GAME_CONFIG.CHASERS.COMMON.COLLISION_RADIUS;
        
        // Перевіряємо колізії ворога з тайлами
        const checkPoints = [
            { x: chaserX, y: chaserY },
            { x: chaserX + chaserRadius, y: chaserY },
            { x: chaserX - chaserRadius, y: chaserY },
            { x: chaserX, y: chaserY + chaserRadius },
            { x: chaserX, y: chaserY - chaserRadius },
        ];
        
        let hasCollision = false;
        for (const point of checkPoints) {
            if (this.tilemap.hasCollision(point.x, point.y)) {
                hasCollision = true;
                break;
            }
        }
        
        if (hasCollision) {
            // Блокуємо рух ворога в напрямку колізії
            const currentVelocityX = chaser.body.velocity.x;
            const currentVelocityY = chaser.body.velocity.y;
            
            // Перевіряємо горизонтальний рух
            if (currentVelocityX !== 0) {
                const checkX = chaserX + (currentVelocityX > 0 ? chaserRadius : -chaserRadius);
                if (this.tilemap.hasCollision(checkX, chaserY)) {
                    chaser.body.setVelocityX(0);
                }
            }
            
            // Перевіряємо вертикальний рух
            if (currentVelocityY !== 0) {
                const checkY = chaserY + (currentVelocityY > 0 ? chaserRadius : -chaserRadius);
                if (this.tilemap.hasCollision(chaserX, checkY)) {
                    chaser.body.setVelocityY(0);
                }
            }
        }
    }
    
    checkTilemapCollisions() {
        if (!this.tilemap || !this.player) return;
        
        // Якщо гравець заморожений, утримуємо його на місці
        if (this.player.isFrozen) {
            // Під час заморозки утримуємо гравця на місці (вже відштовхнутому від кіоска)
            const frozenPos = this.player.getFrozenPosition();
            if (frozenPos) {
                this.player.setPosition(frozenPos.x, frozenPos.y);
            }
            this.player.body.setVelocity(0, 0);
            return; // Не перевіряємо інші колізії під час заморозки
        }
        
        // Перевіряємо чи гравець не в колізійному тайлі
        const playerX = this.player.x;
        const playerY = this.player.y;
        const playerRadius = 15; // Радіус гравця
        
        // Перевірка кількох точок навколо гравця для кращої колізії
        const checkPoints = [
            { x: playerX, y: playerY }, // Центр
            { x: playerX + playerRadius, y: playerY }, // Право
            { x: playerX - playerRadius, y: playerY }, // Ліво
            { x: playerX, y: playerY + playerRadius }, // Низ
            { x: playerX, y: playerY - playerRadius }, // Верх
        ];
        
        let hasCollision = false;
        let isKioskCollision = false;
        
        for (const point of checkPoints) {
            const tileType = this.tilemap.getTileType(point.x, point.y);
            
            // Перевіряємо чи це кіоск
            if (tileType === this.tilemap.TILE_TYPES.KIOSK) {
                isKioskCollision = true;
                hasCollision = true;
                break;
            }
            
            // Перевіряємо інші колізії
            if (this.tilemap.hasCollision(point.x, point.y)) {
                hasCollision = true;
                break;
            }
        }
        
        if (isKioskCollision) {
            // Знаходимо кіоск, з яким зіткнувся гравець
            const tile = this.tilemap.worldToTile(playerX, playerY);
            const kiosk = this.tilemap.getKioskAt(tile.x, tile.y);
            
            if (kiosk) {
                // Перевіряємо чи не було нещодавнього зіткнення з кіоском
                const currentTime = this.time.now;
                const timeSinceLastCollision = currentTime - this.player.lastKioskCollisionTime;
                
                // Якщо зіткнення з кіоском і минуло достатньо часу - заморожуємо
                if (timeSinceLastCollision >= GAME_CONFIG.KIOSKS.COOLDOWN) {
                    // Відштовхуємо гравця від кіоска одразу
                    this.pushPlayerAwayFromKiosk();
                    
                    // Поповнюємо стаміну до максимуму (купляємо енергетик)
                    this.player.restoreStamina();
                    
                    // Заморожуємо гравця
                    this.player.freeze(GAME_CONFIG.KIOSKS.FREEZE_DURATION);
                    this.player.lastKioskCollisionTime = currentTime;
                    
                    // Блокуємо рух
                    this.player.body.setVelocity(0, 0);
                    
                    // Плануємо зникнення кіоска (трохи раніше закінчення заморозки)
                    const disappearDelay = GAME_CONFIG.KIOSKS.FREEZE_DURATION - GAME_CONFIG.KIOSKS.DISAPPEAR_BEFORE_FREEZE_END;
                    const respawnDelay = GAME_CONFIG.KIOSKS.RESPAWN_DELAY;
                    
                    // Зникає кіоск
                    this.time.delayedCall(disappearDelay, () => {
                        this.removeKiosk(kiosk.tileX, kiosk.tileY);
                    });
                    
                    // Респавн кіоска через 20 секунд
                    this.time.delayedCall(disappearDelay + respawnDelay, () => {
                        this.tilemap.spawnKioskAtRandomPosition();
                        // Оновлюємо міні-карту
                        if (this.minimap) {
                            this.minimap.refresh();
                        }
                    });
                } else {
                    // Якщо нещодавно було зіткнення, просто відштовхуємо без заморозки
                    this.pushPlayerAwayFromKiosk();
                }
            }
        } else if (hasCollision) {
            // Для інших колізій (будівлі, огорожі) - блокуємо тільки напрямок, який веде в будівлю
            this.blockMovementIntoBuilding(playerX, playerY);
        }
    }
    
    blockMovementIntoBuilding(playerX, playerY) {
        // Блокуємо тільки той напрямок руху, який веде в будівлю
        const velocityX = this.player.body.velocity.x;
        const velocityY = this.player.body.velocity.y;
        const playerRadius = 15;
        
        let blockedX = velocityX;
        let blockedY = velocityY;
        
        // Перевіряємо колізію в напрямку руху
        if (velocityX > 0) {
            // Рух вправо - перевіряємо праву сторону
            if (this.tilemap.hasCollision(playerX + playerRadius, playerY)) {
                blockedX = 0;
            }
        } else if (velocityX < 0) {
            // Рух вліво - перевіряємо ліву сторону
            if (this.tilemap.hasCollision(playerX - playerRadius, playerY)) {
                blockedX = 0;
            }
        }
        
        if (velocityY > 0) {
            // Рух вниз - перевіряємо нижню сторону
            if (this.tilemap.hasCollision(playerX, playerY + playerRadius)) {
                blockedY = 0;
            }
        } else if (velocityY < 0) {
            // Рух вгору - перевіряємо верхню сторону
            if (this.tilemap.hasCollision(playerX, playerY - playerRadius)) {
                blockedY = 0;
            }
        }
        
        // Встановлюємо velocity тільки для дозволених напрямків
        this.player.body.setVelocity(blockedX, blockedY);
    }
    
    removeKiosk(tileX, tileY) {
        // Видаляємо кіоск
        this.tilemap.removeKiosk(tileX, tileY);
    }
    
    pushPlayerAwayFromKiosk() {
        // Відштовхуємо гравця від кіоска
        const playerX = this.player.x;
        const playerY = this.player.y;
        const tile = this.tilemap.worldToTile(playerX, playerY);
        
        // Шукаємо найближчу прохідну позицію (спочатку перевіряємо сусідні тайли)
        const directions = [
            { x: 0, y: -1 }, { x: 0, y: 1 },  // Верх, низ
            { x: -1, y: 0 }, { x: 1, y: 0 }, // Ліво, право
            { x: -1, y: -1 }, { x: 1, y: -1 }, // Діагоналі
            { x: -1, y: 1 }, { x: 1, y: 1 }
        ];
        
        // Шукаємо прохідну позицію на більшій відстані, якщо сусідні зайняті
        for (let radius = 1; radius <= 3; radius++) {
            for (const dir of directions) {
                const checkTile = { 
                    x: tile.x + dir.x * radius, 
                    y: tile.y + dir.y * radius 
                };
                const worldPos = this.tilemap.tileToWorld(checkTile.x, checkTile.y);
                
                // Перевіряємо чи це не кіоск і не інша колізія
                const tileType = this.tilemap.getTileType(worldPos.x, worldPos.y);
                if (tileType === this.tilemap.TILE_TYPES.KIOSK) continue;
                
                if (!this.tilemap.hasCollision(worldPos.x, worldPos.y)) {
                    // Переміщуємо гравця на прохідну позицію
                    this.player.setPosition(worldPos.x, worldPos.y);
                    // Оновлюємо заморожену позицію
                    if (this.player.isFrozen) {
                        this.player.frozenPosition = { x: worldPos.x, y: worldPos.y };
                    }
                    return;
                }
            }
        }
    }
    
    handleGameOver() {
        // Перехід до ResultScene з даними
        this.scene.start('ResultScene', {
            score: this.score,
            moneyEarned: 0, // Буде додано в задачі 8
            timeSurvived: this.timeSurvived
        });
    }
}

export default GameScene;