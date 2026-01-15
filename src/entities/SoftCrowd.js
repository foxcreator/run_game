// SoftCrowd - черга людей (перешкода типу 2)
import Obstacle from './Obstacle.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import spriteManager from '../utils/SpriteManager.js';

class SoftCrowd extends Obstacle {
    constructor(scene, x, y) {
        const spriteConfig = spriteManager.OBSTACLE_SPRITES.SOFT_CROWD;
        const width = spriteConfig.width;
        const height = spriteConfig.height;
        const color = spriteConfig.type === 'color' ? spriteConfig.value : GAME_CONFIG.OBSTACLES.SOFT_CROWD.COLOR;
        
        super(scene, x, y, width, height, color, 'SoftCrowd');
        
        // Параметри дебафу
        this.debuffDuration = GAME_CONFIG.OBSTACLES.SOFT_CROWD.DEBUFF_DURATION;
        this.speedMultiplier = GAME_CONFIG.OBSTACLES.SOFT_CROWD.SPEED_MULTIPLIER;
        
        // Таймер для відстеження колізій
        this.collisionCooldown = 0;
        this.cooldownTime = GAME_CONFIG.OBSTACLES.SOFT_CROWD.COOLDOWN;
    }
    
    onPlayerCollision(player) {
        // Перевіряємо cooldown
        if (this.collisionCooldown > 0) {
            return;
        }
        
        // Застосовуємо дебаф швидкості
        if (player && !player.isFrozen) {
            // Встановлюємо множник швидкості на певний час
            player.applySpeedDebuff(this.speedMultiplier, this.debuffDuration);
            
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

export default SoftCrowd;
