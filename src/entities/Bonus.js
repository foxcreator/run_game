// Bonus - базовий клас для бонусів
import spriteManager from '../utils/SpriteManager.js';

class Bonus extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y, bonusType) {
        const config = spriteManager.PICKUP_SPRITES[bonusType] || {
            type: 'color',
            value: 0x00ff00,
            width: 20,
            height: 20
        };
        
        const size = config.width || 20;
        const color = config.type === 'color' ? config.value : 0x00ff00;
        
        super(scene, x, y, size, size, color);
        
        scene.add.existing(this);
        // НЕ ДОДАЄМО physics body - магнітний ефект працює напряму через this.x/this.y
        
        this.setOrigin(0.5);
        this.setDepth(3); // Бонуси поверх перешкод, але під гравцем
        
        this.bonusType = bonusType; // 'SCOOTER', 'JOKE', 'SMOKE'
        
        // Анімація обертання (опційно)
        this.rotationSpeed = 0.03;
        
        // Параметри для магнітного ефекту (ТОЧНО ЯК У МОНЕТ)
        this.magnetRadius = 60; // Радіус притягування
        this.magnetSpeed = 300; // Швидкість притягування
        this.collected = false; // Флаг щоб не збирати двічі
    }
    
    update(delta, player) {
        if (!this.active || this.collected) return;
        
        // Легке обертання для візуального ефекту
        this.rotation += this.rotationSpeed;
        
        // Магнітний ефект - притягування до гравця (ТОЧНО ЯК В COIN.JS)
        if (player && player.active) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Якщо гравець в радіусі притягування
            if (distance < this.magnetRadius && distance > 0) {
                // Притягуємо пікап до гравця (ТОЧНО ЯК В COIN.JS)
                const speed = this.magnetSpeed * (delta / 1000);
                const moveX = (dx / distance) * speed;
                const moveY = (dy / distance) * speed;
                
                this.x += moveX;
                this.y += moveY;
            }
        }
    }
    
    collect() {
        // Видаляємо бонус при зборі
        this.destroy();
    }
    
    /**
     * Застосовує ефект бонусу до гравця
     * @param {Player} player
     * @param {GameScene} scene
     */
    applyEffect(player, scene) {
        // Перевизначається в підкласах
    }
}

export default Bonus;
