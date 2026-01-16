// Chaser - базовий клас для переслідувачів (ворогів)
import { GAME_CONFIG } from '../config/gameConfig.js';
import spriteManager from '../utils/SpriteManager.js';

class Chaser extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type) {
        super(scene, x, y, null);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.type = type; // 'Blocker' або 'Sticker'
        this.active = true;
        
        // Фізика
        this.setCollideWorldBounds(true);
        this.setDrag(GAME_CONFIG.CHASERS.COMMON.DRAG);
        
        // Візуалізація
        this.createVisuals(scene);
        
        // Параметри руху (будуть встановлені в підкласах)
        this.speed = 200;
        this.target = null; // Ціль (гравець)
        this.pathfindingSystem = null; // Система обходу перешкод
        
        // Стан заморозки (для колізій з авто)
        this.isFrozen = false;
        this.frozenTimer = 0;
        
        // Дебафи швидкості (для бонусів)
        this.speedDebuffs = []; // Масив активних дебафів { multiplier, duration }
        
        // Втрата лока (для димової хмарки)
        this.lostLock = false; // Чи втратив лок
        this.lostLockTimer = 0; // Таймер втрати лока
        this.lastKnownPlayerPos = null; // Остання відома позиція гравця (для втрати лока)
    }
    
    setPathfindingSystem(pathfindingSystem) {
        this.pathfindingSystem = pathfindingSystem;
    }
    
    createVisuals(scene) {
        // Створюємо спрайт ворога через SpriteManager
        const textureKey = spriteManager.createChaserSprite(scene, this.type);
        this.setTexture(textureKey);
        
        const config = this.type === 'Blocker' 
            ? spriteManager.CHASER_SPRITES.BLOCKER 
            : spriteManager.CHASER_SPRITES.STICKER;
        const size = config.radius * 2;
        this.setDisplaySize(size, size);
        this.setDepth(GAME_CONFIG.CHASERS.COMMON.DEPTH);
    }
    
    setTarget(player) {
        this.target = player;
    }
    
    setFrozen(duration) {
        // Заморожуємо ворога на певний час
        this.isFrozen = true;
        this.frozenTimer = duration;
        if (this.body) {
            this.body.setVelocity(0, 0);
        }
    }
    
    update(delta) {
        if (!this.active) return;
        
        // Оновлюємо таймер заморозки
        if (this.isFrozen) {
            this.frozenTimer -= delta;
            if (this.frozenTimer <= 0) {
                this.isFrozen = false;
                this.frozenTimer = 0;
            } else {
                // Під час заморозки не рухаємося
                if (this.body) {
                    this.body.setVelocity(0, 0);
                }
                return;
            }
        }
        
        // Оновлюємо дебафи швидкості
        this.updateSpeedDebuffs(delta);
        
        // Оновлюємо втрату лока
        this.updateLostLock(delta);
        
        if (!this.target) return;
        
        // Базова логіка руху (перевизначається в підкласах)
        this.moveTowardsTarget(delta);
    }
    
    updateSpeedDebuffs(delta) {
        // Оновлюємо всі активні дебафи
        for (let i = this.speedDebuffs.length - 1; i >= 0; i--) {
            const debuff = this.speedDebuffs[i];
            debuff.duration -= delta;
            
            if (debuff.duration <= 0) {
                // Дебаф закінчився - видаляємо
                this.speedDebuffs.splice(i, 1);
            }
        }
    }
    
    updateLostLock(delta) {
        // Оновлюємо таймер втрати лока
        if (this.lostLockTimer > 0) {
            this.lostLockTimer -= delta;
            if (this.lostLockTimer <= 0) {
                this.lostLock = false;
                this.lostLockTimer = 0;
                this.lastKnownPlayerPos = null;
            }
        }
    }
    
    /**
     * Застосовує дебаф швидкості (для бонусу Жарт)
     * @param {number} multiplier - Множник швидкості (0.7 = 70%)
     * @param {number} duration - Тривалість дебафу (мс)
     */
    applySpeedDebuff(multiplier, duration) {
        this.speedDebuffs.push({
            multiplier: multiplier,
            duration: duration
        });
    }
    
    /**
     * Втрачає лок на гравця (для бонусу Димова хмарка)
     * @param {number} playerX - X позиція гравця
     * @param {number} playerY - Y позиція гравця
     * @param {number} duration - Тривалість втрати лока (мс)
     */
    loseLock(playerX, playerY, duration) {
        this.lostLock = true;
        this.lostLockTimer = duration;
        this.lastKnownPlayerPos = { x: playerX, y: playerY };
    }
    
    /**
     * Отримує поточний множник швидкості з урахуванням дебафів
     * @returns {number}
     */
    getSpeedMultiplier() {
        if (this.speedDebuffs.length === 0) {
            return 1.0;
        }
        
        // Застосовуємо найнижчий множник
        let minMultiplier = 1.0;
        for (const debuff of this.speedDebuffs) {
            minMultiplier = Math.min(minMultiplier, debuff.multiplier);
        }
        return minMultiplier;
    }
    
    moveTowardsTarget(delta) {
        // Якщо втратив лок - рухаємося до останньої відомої позиції
        if (this.lostLock && this.lastKnownPlayerPos) {
            const dx = this.lastKnownPlayerPos.x - this.x;
            const dy = this.lastKnownPlayerPos.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const speedMultiplier = this.getSpeedMultiplier();
                const velocityX = (dx / distance) * this.speed * speedMultiplier;
                const velocityY = (dy / distance) * this.speed * speedMultiplier;
                this.setVelocity(velocityX, velocityY);
            }
            return;
        }
        
        // Базова реалізація - рух до цілі (перевизначається в підкласах)
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const speedMultiplier = this.getSpeedMultiplier();
            const velocityX = (dx / distance) * this.speed * speedMultiplier;
            const velocityY = (dy / distance) * this.speed * speedMultiplier;
            this.setVelocity(velocityX, velocityY);
        }
    }
    
    destroy() {
        if (this.body) {
            this.body.destroy();
        }
        super.destroy();
    }
}

export default Chaser;
