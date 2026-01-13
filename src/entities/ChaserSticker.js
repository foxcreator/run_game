// ChaserSticker - прилипала, наздоганяє і робить удар
import Chaser from './Chaser.js';
import { GAME_CONFIG } from '../config/gameConfig.js';

class ChaserSticker extends Chaser {
    constructor(scene, x, y) {
        super(scene, x, y, 'Sticker');
        
        // Параметри Sticker
        this.speed = GAME_CONFIG.CHASERS.STICKER.SPEED;
        this.hitCooldown = 0;
        this.hitCooldownDuration = GAME_CONFIG.CHASERS.STICKER.HIT_COOLDOWN;
        this.hitBackoffDistance = GAME_CONFIG.CHASERS.STICKER.HIT_BACKOFF_DISTANCE;
        this.captureSystem = null; // Буде встановлено ззовні
    }
    
    setCaptureSystem(captureSystem) {
        this.captureSystem = captureSystem;
    }
    
    moveTowardsTarget(delta) {
        if (!this.target) return;
        
        // Оновлюємо cooldown
        if (this.hitCooldown > 0) {
            this.hitCooldown -= delta;
            if (this.hitCooldown < 0) {
                this.hitCooldown = 0;
            }
        }
        
        // Якщо на cooldown - відходимо назад
        if (this.hitCooldown > 0) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                // Рухаємося від гравця
                const retreatMultiplier = GAME_CONFIG.CHASERS.STICKER.RETREAT_SPEED_MULTIPLIER;
                const velocityX = -(dx / distance) * this.speed * retreatMultiplier;
                const velocityY = -(dy / distance) * this.speed * retreatMultiplier;
                this.setVelocity(velocityX, velocityY);
            }
            return;
        }
        
        // Рухаємося безпосередньо на гравця з обходом перешкод
        const targetX = this.target.x;
        const targetY = this.target.y;
        
        // Використовуємо pathfinding для обходу перешкод
        if (this.pathfindingSystem) {
            const radius = GAME_CONFIG.CHASERS.COMMON.COLLISION_RADIUS;
            const direction = this.pathfindingSystem.getSteeringDirection(
                this.x, this.y, targetX, targetY, radius
            );
            
            const velocityX = direction.x * this.speed;
            const velocityY = direction.y * this.speed;
            this.setVelocity(velocityX, velocityY);
        } else {
            // Якщо pathfinding не доступний - рухаємося напряму
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const velocityX = (dx / distance) * this.speed;
                const velocityY = (dy / distance) * this.speed;
                this.setVelocity(velocityX, velocityY);
            }
        }
    }
    
    onHitPlayer() {
        if (this.hitCooldown > 0) return; // Ще на cooldown
        
        // Додаємо capture
        if (this.captureSystem) {
            this.captureSystem.addCapture(GAME_CONFIG.CHASERS.STICKER.CAPTURE_DAMAGE);
        }
        
        // Відскакуємо назад
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const backoffX = -(dx / distance) * this.hitBackoffDistance;
                const backoffY = -(dy / distance) * this.hitBackoffDistance;
                this.x += backoffX;
                this.y += backoffY;
            }
        }
        
        // Встановлюємо cooldown
        this.hitCooldown = this.hitCooldownDuration;
    }
}

export default ChaserSticker;
