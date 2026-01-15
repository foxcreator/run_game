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
        
        const spriteConfig = spriteManager.OBSTACLE_SPRITES.PUDDLE_SLIP;
        const color = spriteConfig.type === 'color' ? spriteConfig.value : GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.COLOR;
        
        super(scene, x, y, width, height, color, 'PuddleSlip');
        
        // Зберігаємо розмір в тайлах
        this.sizeInTiles = sizeInTiles;
        
        // Параметри дебафу
        this.debuffDuration = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.DEBUFF_DURATION;
        this.controlMultiplier = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.CONTROL_MULTIPLIER;
        
        // Таймер для відстеження колізій
        this.collisionCooldown = 0;
        this.cooldownTime = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.COOLDOWN;
        
        // Візуалізація - робимо коло для калюжі
        this.setDisplaySize(width, height);
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
        // Оновлюємо cooldown
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= delta;
            if (this.collisionCooldown < 0) {
                this.collisionCooldown = 0;
            }
        }
    }
}

export default PuddleSlip;
