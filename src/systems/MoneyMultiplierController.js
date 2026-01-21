import { GAME_CONFIG } from '../config/gameConfig.js';
import MoneyMultiplierPickup from '../entities/MoneyMultiplierPickup.js';

/**
 * MoneyMultiplierController
 * 
 * Контролює спавн та управління Money Multiplier пікапом (x5).
 * Кожні 5 хвилин з'являється пікап, показує попередження, відстежує збір.
 */
export default class MoneyMultiplierController {
    constructor(scene, notificationManager) {
        this.scene = scene;
        this.notificationManager = notificationManager;
        
        this.config = GAME_CONFIG.MONEY_MULTIPLIER;
        
        // Стан
        this.currentPickup = null;
        this.isMultiplierActive = false;
        this.multiplierTimer = null;
        this.spawnTimer = null;
        this.warningTimer = null;
        this.lastSpawnTime = 0;
        
        this.init();
    }
    
    /**
     * Ініціалізація контролера
     */
    init() {
        this.lastSpawnTime = this.scene.time.now;
        this.scheduleNextSpawn();
        
        // Підписуємося на події
        this.scene.events.on('money-multiplier-collected', this.onPickupCollected, this);
        this.scene.events.on('money-multiplier-expired', this.onPickupExpired, this);
    }
    
    /**
     * Планує наступний спавн пікапа
     */
    scheduleNextSpawn() {
        // Очищаємо попередні таймери
        if (this.spawnTimer) {
            this.spawnTimer.remove();
        }
        if (this.warningTimer) {
            this.warningTimer.remove();
        }
        
        // Таймер попередження (за 25 секунд до спавну)
        const warningTime = this.config.SPAWN_INTERVAL - this.config.WARNING_TIME;
        this.warningTimer = this.scene.time.delayedCall(warningTime, () => {
            this.showWarning();
        });
        
        // Таймер спавну
        this.spawnTimer = this.scene.time.delayedCall(this.config.SPAWN_INTERVAL, () => {
            this.spawnPickup();
        });
    }
    
    /**
     * Показує попередження про наближення пікапа
     */
    showWarning() {
        
        this.notificationManager.show(
            this.config.MESSAGES.WARNING,
            GAME_CONFIG.NOTIFICATIONS.PRIORITY.MEDIUM,
            4000
        );
    }
    
    /**
     * Спавнить пікап на карті
     */
    spawnPickup() {
        // Якщо вже є активний пікап - не спавнимо новий
        if (this.currentPickup) {
            return;
        }
        
        // Знаходимо випадкову walkable позицію
        const position = this.findValidSpawnPosition();
        if (!position) {
            this.scheduleNextSpawn();
            return;
        }
        
        // Створюємо пікап
        this.currentPickup = new MoneyMultiplierPickup(this.scene, position.x, position.y);
        
        
        // Показуємо повідомлення
        this.notificationManager.show(
            this.config.MESSAGES.SPAWNED,
            GAME_CONFIG.NOTIFICATIONS.PRIORITY.HIGH,
            5000
        );
        
        this.lastSpawnTime = this.scene.time.now;
    }
    
    /**
     * Знаходить валідну позицію для спавну
     */
    findValidSpawnPosition() {
        const worldWidth = GAME_CONFIG.WORLD.WIDTH;
        const worldHeight = GAME_CONFIG.WORLD.HEIGHT;
        const maxAttempts = 50;
        
        for (let i = 0; i < maxAttempts; i++) {
            const x = Phaser.Math.Between(200, worldWidth - 200);
            const y = Phaser.Math.Between(200, worldHeight - 200);
            
            // Перевіряємо чи це walkable
            if (this.scene.tilemap && this.scene.tilemap.isWalkable(x, y)) {
                // Перевіряємо відстань від гравця
                if (this.scene.player) {
                    const distToPlayer = Phaser.Math.Distance.Between(
                        x, y,
                        this.scene.player.x, this.scene.player.y
                    );
                    
                    // Не спавнимо дуже близько до гравця (мін 300px)
                    if (distToPlayer > 300) {
                        return { x, y };
                    }
                }
            }
        }
        
        // Fallback - центр карти
        return { x: worldWidth / 2, y: worldHeight / 2 };
    }
    
    /**
     * Обробник збору пікапа
     */
    onPickupCollected(data) {
        
        // Видаляємо пікап
        this.currentPickup = null;
        
        // Активуємо множник
        this.activateMultiplier(data.multiplier, data.duration);
        
        // Плануємо наступний спавн
        this.scheduleNextSpawn();
    }
    
    /**
     * Обробник закінчення часу пікапа
     */
    onPickupExpired() {
        
        // Видаляємо пікап
        this.currentPickup = null;
        
        // Плануємо наступний спавн
        this.scheduleNextSpawn();
    }
    
    /**
     * Активує множник грошей
     */
    activateMultiplier(multiplier, duration) {
        this.isMultiplierActive = true;
        
        // Видаляємо попередній таймер якщо є
        if (this.multiplierTimer) {
            this.multiplierTimer.remove();
        }
        
        // Викликаємо подію для GameScene
        this.scene.events.emit('money-multiplier-activated', multiplier);
        
        // Таймер деактивації
        this.multiplierTimer = this.scene.time.delayedCall(duration, () => {
            this.deactivateMultiplier();
        });
        
    }
    
    /**
     * Деактивує множник грошей
     */
    deactivateMultiplier() {
        if (!this.isMultiplierActive) return;
        
        this.isMultiplierActive = false;
        
        // Викликаємо подію для GameScene
        this.scene.events.emit('money-multiplier-deactivated');
        
    }
    
    /**
     * Оновлення (викликається з GameScene.update)
     */
    update(delta) {
        // Оновлюємо пікап якщо він є
        if (this.currentPickup && this.scene.player) {
            this.currentPickup.update(delta, this.scene.player);
        }
    }
    
    /**
     * Чи активний множник
     */
    isActive() {
        return this.isMultiplierActive;
    }
    
    /**
     * Отримує поточний пікап (для мінімапи)
     */
    getCurrentPickup() {
        return this.currentPickup;
    }
    
    /**
     * Зупиняє контролер
     */
    pause() {
        if (this.spawnTimer) this.spawnTimer.paused = true;
        if (this.warningTimer) this.warningTimer.paused = true;
        if (this.multiplierTimer) this.multiplierTimer.paused = true;
    }
    
    /**
     * Відновлює контролер
     */
    resume() {
        if (this.spawnTimer) this.spawnTimer.paused = false;
        if (this.warningTimer) this.warningTimer.paused = false;
        if (this.multiplierTimer) this.multiplierTimer.paused = false;
    }
    
    /**
     * Скидає контролер
     */
    reset() {
        if (this.spawnTimer) {
            this.spawnTimer.remove();
            this.spawnTimer = null;
        }
        if (this.warningTimer) {
            this.warningTimer.remove();
            this.warningTimer = null;
        }
        if (this.multiplierTimer) {
            this.multiplierTimer.remove();
            this.multiplierTimer = null;
        }
        
        if (this.currentPickup) {
            this.currentPickup.destroy();
            this.currentPickup = null;
        }
        
        this.isMultiplierActive = false;
        this.lastSpawnTime = 0;
    }
    
    /**
     * Знищує контролер
     */
    destroy() {
        this.scene.events.off('money-multiplier-collected', this.onPickupCollected, this);
        this.scene.events.off('money-multiplier-expired', this.onPickupExpired, this);
        
        this.reset();
    }
}
