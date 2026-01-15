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
        
        if (!this.target) return;
        
        // Базова логіка руху (перевизначається в підкласах)
        this.moveTowardsTarget(delta);
    }
    
    moveTowardsTarget(delta) {
        // Базова реалізація - рух до цілі (перевизначається в підкласах)
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const velocityX = (dx / distance) * this.speed;
            const velocityY = (dy / distance) * this.speed;
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
