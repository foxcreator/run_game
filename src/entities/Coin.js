// Coin - монета (пікап) з різними номіналами та текстурами
import spriteManager from '../utils/SpriteManager.js';
import { GAME_CONFIG } from '../config/gameConfig.js';

class Coin extends Phaser.GameObjects.Image {
    constructor(scene, x, y, denomination = null) {
        // Номінал має бути переданий з GameScene
        // Якщо не передано - використовуємо базовий (10 грн)
        if (!denomination) {
            const denominations = GAME_CONFIG.PICKUPS.COINS.DENOMINATIONS;
            denomination = denominations.find(d => d.value === 10) || denominations[0];
        }
        
        // Використовуємо текстуру монети
        const textureKey = denomination.texture || 'coin_10';
        const finalTextureKey = scene.textures.exists(textureKey) ? textureKey : 'coin_10';
        
        super(scene, x, y, finalTextureKey);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setOrigin(0.5);
        this.setDepth(3); // Монети поверх перешкод, але під гравцем
        
        // Розмір монети залежить від номіналу (більші номінали - більші монети)
        const baseSize = 32; // Базовий розмір для текстур
        const sizeMultiplier = Math.sqrt(denomination.value / 10); // 10=1x, 20=1.41x, 50=2.24x, 100=3.16x
        const displaySize = Math.max(baseSize, Math.min(baseSize * sizeMultiplier, 64));
        this.setDisplaySize(displaySize, displaySize);
        
        // Збільшуємо hitbox для легшого збору
        if (this.body) {
            this.body.setSize(displaySize * 1.5, displaySize * 1.5); // Збільшуємо hitbox
        }
        
        // Значення монети
        this.value = denomination.value;
        this.denomination = denomination;
        
        // Анімація обертання (швидше для більших номіналів)
        this.rotationSpeed = 0.02 + (this.value / 1000);
        
        // Параметри для магнітного ефекту
        this.magnetRadius = 60; // Радіус притягування
        this.magnetSpeed = 300; // Швидкість притягування
        this.collected = false; // Флаг щоб не збирати двічі
        
        // Параметри для анімації руху (плавне коливання)
        this.floatAmplitude = 3 + (this.value / 20); // Амплітуда коливання (більші монети коливаються більше)
        this.floatSpeed = 2 + (this.value / 50); // Швидкість коливання
        this.floatTime = Math.random() * Math.PI * 2; // Початкова фаза (випадкова)
        this.startY = y; // Початкова Y позиція
    }
    
    
    update(delta, player) {
        if (!this.active || this.collected) return;
        
        // Легке обертання для візуального ефекту
        this.rotation += this.rotationSpeed;
        
        // Анімація коливання (плавний рух вгору-вниз)
        this.floatTime += (this.floatSpeed * delta) / 1000;
        const floatOffset = Math.sin(this.floatTime) * this.floatAmplitude;
        this.y = this.startY + floatOffset;
        
        // Магнітний ефект - притягування до гравця
        if (player && player.active) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Якщо гравець в радіусі притягування
            if (distance < this.magnetRadius && distance > 0) {
                // Притягуємо пікап до гравця
                const speed = this.magnetSpeed * (delta / 1000);
                const moveX = (dx / distance) * speed;
                const moveY = (dy / distance) * speed;
                
                this.x += moveX;
                this.y += moveY;
                
                // Оновлюємо початкову позицію для коливання
                this.startY = this.y;
                
                // Оновлюємо позицію body (Phaser автоматично синхронізує body з this.x/this.y)
                if (this.body) {
                    this.body.x = this.x;
                    this.body.y = this.y;
                }
            }
        } else {
            // Оновлюємо позицію body для коливання
            if (this.body) {
                this.body.x = this.x;
                this.body.y = this.y;
            }
        }
    }
    
    collect() {
        // Видаляємо монету при зборі
        if (this.body) {
            this.body.destroy();
        }
        this.destroy();
    }
}

export default Coin;
