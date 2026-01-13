// ChaserBlocker - перекривач, обганяє і стає попереду
import Chaser from './Chaser.js';
import { GAME_CONFIG } from '../config/gameConfig.js';

class ChaserBlocker extends Chaser {
    constructor(scene, x, y) {
        super(scene, x, y, 'Blocker');
        
        // Параметри Blocker
        this.speed = GAME_CONFIG.CHASERS.BLOCKER.SPEED;
        this.leadDistance = GAME_CONFIG.CHASERS.BLOCKER.LEAD_DISTANCE;
        this.tooCloseDistance = GAME_CONFIG.CHASERS.BLOCKER.TOO_CLOSE_DISTANCE;
        this.backOffDistance = GAME_CONFIG.CHASERS.BLOCKER.BACK_OFF_DISTANCE;
    }
    
    moveTowardsTarget(delta) {
        if (!this.target || !this.target.body) return;
        
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Якщо дуже близько - відходимо убік
        if (distance < this.tooCloseDistance) {
            // Відходимо перпендикулярно до напрямку до гравця
            const angle = Math.atan2(dy, dx);
            const perpendicularAngle = angle + Math.PI / 2; // 90 градусів
            
            // Випадково вибираємо напрямок (вліво або вправо)
            const direction = Math.random() > 0.5 ? 1 : -1;
            const finalAngle = perpendicularAngle + (direction * Math.PI / 4);
            
            const backOffMultiplier = GAME_CONFIG.CHASERS.BLOCKER.BACK_OFF_SPEED_MULTIPLIER;
            const velocityX = Math.cos(finalAngle) * this.speed * backOffMultiplier;
            const velocityY = Math.sin(finalAngle) * this.speed * backOffMultiplier;
            this.setVelocity(velocityX, velocityY);
            return;
        }
        
        // Визначаємо цільову точку
        let targetX, targetY;
        
        // Беремо напрямок руху гравця (velocity normalized)
        const playerVelX = this.target.body.velocity.x;
        const playerVelY = this.target.body.velocity.y;
        const playerSpeed = Math.sqrt(playerVelX * playerVelX + playerVelY * playerVelY);
        
        // Якщо гравець стоїть, рухаємося безпосередньо до нього
        const standingThreshold = GAME_CONFIG.CHASERS.BLOCKER.PLAYER_STANDING_THRESHOLD;
        if (playerSpeed < standingThreshold) {
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;
            targetX = this.target.x + normalizedDx * this.leadDistance;
            targetY = this.target.y + normalizedDy * this.leadDistance;
        } else {
            // Гравець рухається - прогнозуємо позицію
            const normalizedVelX = playerVelX / playerSpeed;
            const normalizedVelY = playerVelY / playerSpeed;
            
            // Цільова точка: позиція гравця + напрямок * leadDistance
            targetX = this.target.x + normalizedVelX * this.leadDistance;
            targetY = this.target.y + normalizedVelY * this.leadDistance;
        }
        
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
            const moveDx = targetX - this.x;
            const moveDy = targetY - this.y;
            const moveDistance = Math.sqrt(moveDx * moveDx + moveDy * moveDy);
            
            if (moveDistance > 0) {
                const velocityX = (moveDx / moveDistance) * this.speed;
                const velocityY = (moveDy / moveDistance) * this.speed;
                this.setVelocity(velocityX, velocityY);
            }
        }
    }
}

export default ChaserBlocker;
