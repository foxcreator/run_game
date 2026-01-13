// PathfindingSystem - система для обходу перешкод (steering behaviors)
import { GAME_CONFIG } from '../config/gameConfig.js';

class PathfindingSystem {
    constructor(tilemap) {
        this.tilemap = tilemap;
    }
    
    /**
     * Отримує напрямок руху з обходом перешкод
     * @param {number} fromX - Початкова X координата
     * @param {number} fromY - Початкова Y координата
     * @param {number} toX - Цільова X координата
     * @param {number} toY - Цільова Y координата
     * @param {number} radius - Радіус об'єкта для перевірки колізій
     * @returns {Object} - {x, y} нормалізований напрямок з урахуванням обходу
     */
    getSteeringDirection(fromX, fromY, toX, toY, radius = 12) {
        // Прямий напрямок до цілі
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            return { x: 0, y: 0 };
        }
        
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // Перевіряємо чи є перешкода на прямому шляху
        const lookAheadDistance = radius * 2; // Дивимось вперед на 2 радіуси
        const checkX = fromX + normalizedDx * lookAheadDistance;
        const checkY = fromY + normalizedDy * lookAheadDistance;
        
        // Перевіряємо кілька точок на шляху
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
        
        // Якщо немає перешкоди - рухаємося прямо
        if (!hasObstacle) {
            return { x: normalizedDx, y: normalizedDy };
        }
        
        // Якщо є перешкода - намагаємося обійти
        return this.findAvoidanceDirection(fromX, fromY, toX, toY, normalizedDx, normalizedDy, radius);
    }
    
    /**
     * Знаходить напрямок для обходу перешкоди
     */
    findAvoidanceDirection(fromX, fromY, toX, toY, dirX, dirY, radius) {
        // Перевіряємо напрямки вліво та вправо від основного напрямку
        const angles = [
            Math.PI / 4,   // 45 градусів вправо
            -Math.PI / 4,  // 45 градусів вліво
            Math.PI / 2,   // 90 градусів вправо
            -Math.PI / 2,  // 90 градусів вліво
            Math.PI / 6,   // 30 градусів вправо
            -Math.PI / 6   // 30 градусів вліво
        ];
        
        const currentAngle = Math.atan2(dirY, dirX);
        const lookAheadDistance = radius * 3;
        
        // Перевіряємо кожен кут
        for (const angleOffset of angles) {
            const testAngle = currentAngle + angleOffset;
            const testDx = Math.cos(testAngle);
            const testDy = Math.sin(testAngle);
            
            // Перевіряємо кілька точок у цьому напрямку
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
                // Знайшли вільний напрямок
                return { x: testDx, y: testDy };
            }
        }
        
        // Якщо не знайшли вільний напрямок - намагаємося відійти назад
        return { x: -dirX * 0.5, y: -dirY * 0.5 };
    }
    
    /**
     * Перевіряє чи можна рухатися в заданому напрямку
     */
    canMoveInDirection(fromX, fromY, dirX, dirY, distance, radius) {
        const checkX = fromX + dirX * distance;
        const checkY = fromY + dirY * distance;
        
        // Перевіряємо кілька точок навколо
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
