// PuddleSlip - калюжа (перешкода типу 3)
import Obstacle from './Obstacle.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import spriteManager from '../utils/SpriteManager.js';

class PuddleSlip extends Obstacle {
    constructor(scene, x, y, sizeInTiles = 1) {
        // sizeInTiles: 1, 2 або 4 тайли
        const tileSize = 32;
        const width = sizeInTiles * tileSize;
        const height = sizeInTiles * tileSize;
        
        // Використовуємо старий Rectangle для Obstacle (для логіки), але замінимо на Image для візуалізації
        const spriteConfig = spriteManager.OBSTACLE_SPRITES.PUDDLE_SLIP;
        const color = spriteConfig.type === 'color' ? spriteConfig.value : GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.COLOR;
        
        super(scene, x, y, width, height, color, 'PuddleSlip');
        
        // Зберігаємо розмір в тайлах
        this.sizeInTiles = sizeInTiles;
        
        // Створюємо Image з текстурою для візуалізації
        const textureKey = 'lake';
        this.visualSprite = null;
        
        if (scene.textures.exists(textureKey)) {
            // Створюємо Image з текстурою
            this.visualSprite = scene.add.image(x, y, textureKey);
            this.visualSprite.setOrigin(0.5);
            this.visualSprite.setDepth(this.depth);
            // Масштабуємо текстуру в залежності від розміру калюжі
            this.visualSprite.setDisplaySize(width, height);
            // Синхронізуємо scrollFactor з основним об'єктом
            this.visualSprite.setScrollFactor(this.scrollFactorX, this.scrollFactorY);
            
            // Приховуємо Rectangle (він все ще використовується для колізій)
            this.setVisible(false);
            this.setAlpha(0);
        } else {
            // Fallback: показуємо Rectangle якщо текстури немає
            // Rectangle вже видимий за замовчуванням
            this.visualSprite = null;
        }
        
        // Параметри дебафу
        this.debuffDuration = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.DEBUFF_DURATION;
        this.controlMultiplier = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.CONTROL_MULTIPLIER;
        
        // Таймер для відстеження колізій
        this.collisionCooldown = 0;
        this.cooldownTime = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.COOLDOWN;
    }
    
    onPlayerCollision(player) {
        // Перевіряємо cooldown
        if (this.collisionCooldown > 0) {
            return;
        }
        
        // Застосовуємо дебаф керованості
        if (player && !player.isFrozen) {
            player.applyControlDebuff(this.controlMultiplier, this.debuffDuration);
            
            // Встановлюємо cooldown для цієї перешкоди
            this.collisionCooldown = this.cooldownTime;
        }
    }
    
    update(delta) {
        // Оновлюємо позицію та глибину візуального спрайту (якщо він є)
        if (this.visualSprite && this.visualSprite.active) {
            this.visualSprite.x = this.x;
            this.visualSprite.y = this.y;
            this.visualSprite.setDepth(this.depth);
            // visualSprite завжди видимий (Rectangle прихований для колізій)
            this.visualSprite.setVisible(true);
            this.visualSprite.setAlpha(1);
        }
        
        // Оновлюємо cooldown
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= delta;
            if (this.collisionCooldown < 0) {
                this.collisionCooldown = 0;
            }
        }
    }
    
    destroy() {
        // Видаляємо візуальний спрайт
        if (this.visualSprite) {
            this.visualSprite.destroy();
            this.visualSprite = null;
        }
        // Викликаємо метод батьківського класу
        super.destroy();
    }
}

export default PuddleSlip;
