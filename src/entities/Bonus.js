// Bonus - базовий клас для бонусів
import spriteManager from '../utils/SpriteManager.js';
import { GAME_CONFIG } from '../config/gameConfig.js';

class Bonus extends Phaser.GameObjects.Container {
    constructor(scene, x, y, bonusType) {
        super(scene, x, y);
        
        const config = spriteManager.PICKUP_SPRITES[bonusType] || {
            type: 'color',
            value: 0x00ff00,
            width: 20,
            height: 20
        };
        
        this.bonusType = bonusType;
        scene.add.existing(this);
        this.setDepth(3); // Бонуси поверх перешкод, але під гравцем
        
        // Створюємо візуальний елемент
        let visual;
        
        // Для SCOOTER використовуємо текстуру
        if (bonusType === 'SCOOTER' && scene.textures.exists('scooter')) {
            const width = GAME_CONFIG.PICKUPS.SCOOTER.WIDTH;
            const height = GAME_CONFIG.PICKUPS.SCOOTER.HEIGHT;
            
            visual = scene.add.image(0, 0, 'scooter');
            visual.setDisplaySize(width, height);
            visual.setOrigin(0.5);
        }
        // Для SMOKE_CLOUD використовуємо текстуру
        else if (bonusType === 'SMOKE_CLOUD' && scene.textures.exists('cloud')) {
            const width = GAME_CONFIG.PICKUPS.SMOKE_CLOUD.WIDTH;
            const height = GAME_CONFIG.PICKUPS.SMOKE_CLOUD.HEIGHT;
            
            visual = scene.add.image(0, 0, 'cloud');
            visual.setDisplaySize(width, height);
            visual.setOrigin(0.5);
        }
        else {
            // Для інших бонусів використовуємо кольорові прямокутники
            const size = config.width || 20;
            const color = config.type === 'color' ? config.value : 0x00ff00;
            
            visual = scene.add.rectangle(0, 0, size, size, color);
            visual.setOrigin(0.5);
        }
        
        this.add(visual);
        this.visual = visual;
        
        // Анімація обертання (опційно)
        this.rotationSpeed = 0.03;
        
        // Параметри для магнітного ефекту (ТОЧНО ЯК У МОНЕТ)
        this.magnetRadius = 60; // Радіус притягування
        this.magnetSpeed = 300; // Швидкість притягування
        this.collected = false; // Флаг щоб не збирати двічі
    }
    
    update(delta, player) {
        if (!this.active || this.collected) return;
        
        // Легке обертання для візуального ефекту (обертаємо візуальний елемент)
        if (this.visual) {
            this.visual.rotation += this.rotationSpeed;
        }
        
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
