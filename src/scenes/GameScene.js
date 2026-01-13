// GameScene - основна сцена гри
import Player from '../entities/Player.js';
import HUD from '../ui/HUD.js';
import Minimap from '../ui/Minimap.js';
import CaptureSystem from '../systems/CaptureSystem.js';
import TilemapSystem from '../systems/TilemapSystem.js';
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

        // Знаходимо прохідний тайл для старту гравця (біля центру)
        const startPos = this.findWalkablePosition(this.worldWidth / 2, this.worldHeight / 2);
        this.player = new Player(this, startPos.x, startPos.y);
        
        // Ініціалізуємо час останнього зіткнення з кіоском
        this.player.lastKioskCollisionTime = 0;
        
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
        
        // Масив переслідувачів (поки що порожній, будуть додані в задачі 5)
        this.chasers = [];
        
        // Таймер виживання
        this.timeSurvived = 0;
        this.score = 0;
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