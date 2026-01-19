import { GAME_CONFIG } from '../config/gameConfig.js';
class PathfindingSystem {
    constructor(tilemap) {
        this.tilemap = tilemap;
    }
    getSteeringDirection(fromX, fromY, toX, toY, radius = 12) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) {
            return { x: 0, y: 0 };
        }
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        const lookAheadDistance = radius * 2;
        const checkX = fromX + normalizedDx * lookAheadDistance;
        const checkY = fromY + normalizedDy * lookAheadDistance;
        const checkPoints = [
            { x: checkX, y: checkY },
            { x: fromX + normalizedDx * (lookAheadDistance * 0.5), y: fromY + normalizedDy * (lookAheadDistance * 0.5) },
            { x: fromX + normalizedDx * (lookAheadDistance * 0.25), y: fromY + normalizedDy * (lookAheadDistance * 0.25) }
        ];
        let hasObstacle = false;
        for (const point of checkPoints) {
            if (this.tilemap.hasCollision(point.x, point.y)) {
                hasObstacle = true;
                break;
            }
        }
        if (!hasObstacle) {
            return { x: normalizedDx, y: normalizedDy };
        }
        return this.findAvoidanceDirection(fromX, fromY, toX, toY, normalizedDx, normalizedDy, radius);
    }
    findAvoidanceDirection(fromX, fromY, toX, toY, dirX, dirY, radius) {
        const angles = [
            Math.PI / 4,
            -Math.PI / 4,
            Math.PI / 2,
            -Math.PI / 2,
            Math.PI / 6,
            -Math.PI / 6
        ];
        const currentAngle = Math.atan2(dirY, dirX);
        const lookAheadDistance = radius * 3;
        for (const angleOffset of angles) {
            const testAngle = currentAngle + angleOffset;
            const testDx = Math.cos(testAngle);
            const testDy = Math.sin(testAngle);
            let isClear = true;
            for (let i = 1; i <= 3; i++) {
                const checkX = fromX + testDx * (lookAheadDistance * i / 3);
                const checkY = fromY + testDy * (lookAheadDistance * i / 3);
                if (this.tilemap.hasCollision(checkX, checkY)) {
                    isClear = false;
                    break;
                }
            }
            if (isClear) {
                return { x: testDx, y: testDy };
            }
        }
        return { x: -dirX * 0.5, y: -dirY * 0.5 };
    }
    canMoveInDirection(fromX, fromY, dirX, dirY, distance, radius) {
        const checkX = fromX + dirX * distance;
        const checkY = fromY + dirY * distance;
        const checkPoints = [
            { x: checkX, y: checkY },
            { x: checkX + radius, y: checkY },
            { x: checkX - radius, y: checkY },
            { x: checkX, y: checkY + radius },
            { x: checkX, y: checkY - radius }
        ];
        for (const point of checkPoints) {
            if (this.tilemap.hasCollision(point.x, point.y)) {
                return false;
            }
        }
        return true;
    }
}
export default PathfindingSystem;