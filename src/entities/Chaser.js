// Chaser - базовий клас для переслідувачів (ворогів)
import { GAME_CONFIG } from '../config/gameConfig.js';

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
    }
    
    setPathfindingSystem(pathfindingSystem) {
        this.pathfindingSystem = pathfindingSystem;
    }
    
    createVisuals(scene) {
        // Створюємо простий спрайт для ворога
        const radius = GAME_CONFIG.CHASERS.COMMON.RADIUS;
        const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
        
        // Різні кольори для різних типів
        const color = this.type === 'Blocker' 
            ? GAME_CONFIG.CHASERS.COMMON.COLOR_BLOCKER 
            : GAME_CONFIG.CHASERS.COMMON.COLOR_STICKER;
        
        graphics.fillStyle(color, 1);
        graphics.fillCircle(radius, radius, radius);
        graphics.lineStyle(2, 0xffffff, 1);
        graphics.strokeCircle(radius, radius, radius);
        graphics.generateTexture(`chaser-${this.type}`, radius * 2, radius * 2);
        graphics.destroy();
        
        // Встановлюємо текстуру
        this.setTexture(`chaser-${this.type}`);
        this.setDisplaySize(radius * 2, radius * 2);
        this.setDepth(GAME_CONFIG.CHASERS.COMMON.DEPTH);
    }
    
    setTarget(player) {
        this.target = player;
    }
    
    update(delta) {
        if (!this.active || !this.target) return;
        
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
