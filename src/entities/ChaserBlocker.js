import Chaser from './Chaser.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
class ChaserBlocker extends Chaser {
    constructor(scene, x, y) {
        super(scene, x, y, 'Blocker');
        this.speed = GAME_CONFIG.CHASERS.BLOCKER.SPEED;
        this.leadDistance = GAME_CONFIG.CHASERS.BLOCKER.LEAD_DISTANCE;
        this.tooCloseDistance = GAME_CONFIG.CHASERS.BLOCKER.TOO_CLOSE_DISTANCE;
        this.backOffDistance = GAME_CONFIG.CHASERS.BLOCKER.BACK_OFF_DISTANCE;
    }
    moveTowardsTarget(delta, time = 0) {
        if (!this.target || !this.target.body) return;
        super.moveTowardsTarget(delta, time);
        if (this.state === 'CHASE' && this.navigationSystem) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < this.tooCloseDistance) {
                const angle = Math.atan2(dy, dx);
                const perpendicularAngle = angle + Math.PI / 2;
                const direction = Math.random() > 0.5 ? 1 : -1;
                const finalAngle = perpendicularAngle + (direction * Math.PI / 4);
                const speedMultiplier = this.getSpeedMultiplier();
                const backOffMultiplier = GAME_CONFIG.CHASERS.BLOCKER.BACK_OFF_SPEED_MULTIPLIER;
                const velocityX = Math.cos(finalAngle) * this.speed * backOffMultiplier * speedMultiplier;
                const velocityY = Math.sin(finalAngle) * this.speed * backOffMultiplier * speedMultiplier;
                this.setVelocity(velocityX, velocityY);
                return;
            }
            const playerVelX = this.target.body.velocity.x;
            const playerVelY = this.target.body.velocity.y;
            const playerSpeed = Math.sqrt(playerVelX * playerVelX + playerVelY * playerVelY);
            let predictedTileX = this.navigationSystem.worldToTile(this.target.x, this.target.y).x;
            let predictedTileY = this.navigationSystem.worldToTile(this.target.x, this.target.y).y;
            const standingThreshold = GAME_CONFIG.CHASERS.BLOCKER.PLAYER_STANDING_THRESHOLD;
            if (playerSpeed >= standingThreshold) {
                const normalizedVelX = playerVelX / playerSpeed;
                const normalizedVelY = playerVelY / playerSpeed;
                const predictedWorldX = this.target.x + normalizedVelX * this.leadDistance;
                const predictedWorldY = this.target.y + normalizedVelY * this.leadDistance;
                const predictedTile = this.navigationSystem.worldToTile(predictedWorldX, predictedWorldY);
                predictedTileX = predictedTile.x;
                predictedTileY = predictedTile.y;
            }
            const currentTargetTile = this.lastPlayerTile ||
                this.navigationSystem.worldToTile(this.target.x, this.target.y);
            if (currentTargetTile.x !== predictedTileX || currentTargetTile.y !== predictedTileY) {
                this.lastPlayerTile = { x: predictedTileX, y: predictedTileY };
                if (this.shouldRecalculatePath(time)) {
                    const fromTile = this.navigationSystem.worldToTile(this.x, this.y);
                    const path = this.navigationSystem.findPath(
                        fromTile.x, fromTile.y,
                        predictedTileX, predictedTileY
                    );
                    if (path && path.length > 0) {
                        this.currentPath = path;
                        this.pathIndex = 0;
                        this.updateCurrentWaypoint();
                        this.lastPathRecalculation = time;
                    }
                }
            }
        }
    }
}
export default ChaserBlocker;