import Chaser from './Chaser.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
class ChaserSticker extends Chaser {
    constructor(scene, x, y) {
        super(scene, x, y, 'Sticker');
        this.speed = GAME_CONFIG.CHASERS.STICKER.SPEED;
        this.hitCooldown = 0;
        this.hitCooldownDuration = GAME_CONFIG.CHASERS.STICKER.HIT_COOLDOWN;
        this.hitBackoffDistance = GAME_CONFIG.CHASERS.STICKER.HIT_BACKOFF_DISTANCE;
        this.captureSystem = null;
    }
    setCaptureSystem(captureSystem) {
        this.captureSystem = captureSystem;
    }
    update(delta) {
        if (this.hitCooldown > 0) {
            this.hitCooldown -= delta;
            if (this.hitCooldown < 0) {
                this.hitCooldown = 0;
            }
        }
        super.update(delta);
    }
    moveTowardsTarget(delta, time = 0) {
        if (!this.target) return;
        if (this.hitCooldown > 0) {
            this.hitCooldown -= delta;
            if (this.hitCooldown < 0) {
                this.hitCooldown = 0;
            }
        }
        if (this.hitCooldown > 0) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
                const speedMultiplier = this.getSpeedMultiplier();
                const retreatMultiplier = GAME_CONFIG.CHASERS.STICKER.RETREAT_SPEED_MULTIPLIER;
                const velocityX = -(dx / distance) * this.speed * retreatMultiplier * speedMultiplier;
                const velocityY = -(dy / distance) * this.speed * retreatMultiplier * speedMultiplier;
                this.setVelocity(velocityX, velocityY);
            }
            return;
        }
        super.moveTowardsTarget(delta, time);
    }
    onHitPlayer() {
        if (this.hitCooldown > 0) {
            return;
        }
        if (this.captureSystem) {
            const damage = GAME_CONFIG.CHASERS.STICKER.CAPTURE_DAMAGE;
            this.captureSystem.addCapture(damage);
        }
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
        this.hitCooldown = this.hitCooldownDuration;
    }
}
export default ChaserSticker;