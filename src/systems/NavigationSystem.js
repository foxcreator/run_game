// NavigationSystem - система навігації з єдиним grid для всіх ворогів
// Використовує A* pathfinding для пошуку шляхів між тайлами
import { GAME_CONFIG } from '../config/gameConfig.js';

class NavigationSystem {
    constructor(tilemap) {
        if (!tilemap) {
            throw new Error('NavigationSystem: tilemap обов\'язковий');
        }
        
        this.tilemap = tilemap;
        this.tileSize = tilemap.tileSize;
        this.mapWidth = tilemap.mapWidth;
        this.mapHeight = tilemap.mapHeight;
        
        // Єдиний навігаційний grid (будується один раз)
        this.grid = null;
        
        // Побудувати grid один раз при створенні
        this.buildGrid();
    }
    
    /**
     * Побудова навігаційного grid на основі collisionMap
     * Викликається один раз при створенні системи
     */
    buildGrid() {
        this.grid = [];
        
        for (let y = 0; y < this.mapHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                // Використовуємо collisionMap з TilemapSystem
                const isWalkable = !this.tilemap.hasCollision(
                    x * this.tileSize + this.tileSize / 2,
                    y * this.tileSize + this.tileSize / 2
                );
                
                this.grid[y][x] = {
                    x: x,
                    y: y,
                    walkable: isWalkable,
                    // Для A* pathfinding
                    g: 0,      // Вартість від старту
                    h: 0,      // Евристична вартість до цілі
                    f: 0,      // Загальна вартість (g + h)
                    parent: null
                };
            }
        }
    }
    
    /**
     * Перевіряє чи тайл прохідний
     * @param {number} tileX - X координата в тайлах
     * @param {number} tileY - Y координата в тайлах
     * @returns {boolean}
     */
    isWalkable(tileX, tileY) {
        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
            return false;
        }
        
        if (!this.grid || !this.grid[tileY] || !this.grid[tileY][tileX]) {
            return false;
        }
        
        return this.grid[tileY][tileX].walkable;
    }
    
    /**
     * Конвертує світові координати в тайл координати
     * @param {number} worldX - X координата в пікселях
     * @param {number} worldY - Y координата в пікселях
     * @returns {{x: number, y: number}}
     */
    worldToTile(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.tileSize),
            y: Math.floor(worldY / this.tileSize)
        };
    }
    
    /**
     * Конвертує тайл координати в світові координати (центр тайла)
     * @param {number} tileX - X координата в тайлах
     * @param {number} tileY - Y координата в тайлах
     * @returns {{x: number, y: number}}
     */
    tileToWorld(tileX, tileY) {
        return {
            x: tileX * this.tileSize + this.tileSize / 2,
            y: tileY * this.tileSize + this.tileSize / 2
        };
    }
    
    /**
     * Знаходить шлях між двома тайлами використовуючи A* pathfinding
     * @param {number} fromTileX - Початкова X координата в тайлах
     * @param {number} fromTileY - Початкова Y координата в тайлах
     * @param {number} toTileX - Цільова X координата в тайлах
     * @param {number} toTileY - Цільова Y координата в тайлах
     * @returns {Array<{x: number, y: number}>} Масив waypoints (тайли) або null якщо шлях не знайдено
     */
    findPath(fromTileX, fromTileY, toTileX, toTileY) {
        // Перевіряємо межі
        if (!this.isWalkable(fromTileX, fromTileY) || !this.isWalkable(toTileX, toTileY)) {
            // Якщо цільова точка непрохідна, намагаємося знайти найближчу прохідну
            if (!this.isWalkable(toTileX, toTileY)) {
                const nearestWalkable = this.findNearestWalkable(toTileX, toTileY, 5);
                if (!nearestWalkable) {
                    return null;
                }
                toTileX = nearestWalkable.x;
                toTileY = nearestWalkable.y;
            }
            
            if (!this.isWalkable(fromTileX, fromTileY)) {
                const nearestWalkable = this.findNearestWalkable(fromTileX, fromTileY, 5);
                if (!nearestWalkable) {
                    return null;
                }
                fromTileX = nearestWalkable.x;
                fromTileY = nearestWalkable.y;
            }
        }
        
        // Якщо початкова і цільова точка однакові - повертаємо короткий шлях
        if (fromTileX === toTileX && fromTileY === toTileY) {
            return [{ x: toTileX, y: toTileY }];
        }
        
        // А* pathfinding
        const openList = [];
        const closedList = new Set();
        
        // Отримуємо початкову тайл
        const startNode = this.grid[fromTileY][fromTileX];
        const endNode = this.grid[toTileY][toTileX];
        
        // Скидаємо значення для A*
        this.resetGridValues();
        
        // Ініціалізуємо початкову точку
        startNode.g = 0;
        startNode.h = this.heuristic(startNode, endNode);
        startNode.f = startNode.g + startNode.h;
        startNode.parent = null;
        
        openList.push(startNode);
        
        // Максимальна кількість ітерацій для безпеки
        const maxIterations = this.mapWidth * this.mapHeight;
        let iterations = 0;
        
        while (openList.length > 0 && iterations < maxIterations) {
            iterations++;
            
            // Знаходимо тайл з найменшою f
            let currentNode = openList[0];
            let currentIndex = 0;
            
            for (let i = 1; i < openList.length; i++) {
                if (openList[i].f < currentNode.f || 
                    (openList[i].f === currentNode.f && openList[i].h < currentNode.h)) {
                    currentNode = openList[i];
                    currentIndex = i;
                }
            }
            
            // Видаляємо поточний тайл з openList
            openList.splice(currentIndex, 1);
            closedList.add(`${currentNode.x},${currentNode.y}`);
            
            // Перевіряємо чи досягли цілі
            if (currentNode.x === endNode.x && currentNode.y === endNode.y) {
                // Будуємо шлях від кінця до початку
                return this.reconstructPath(startNode, currentNode);
            }
            
            // Перевіряємо сусідні тайли
            const neighbors = this.getNeighbors(currentNode.x, currentNode.y);
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                
                // Пропускаємо якщо вже перевірені або непрохідні
                if (closedList.has(neighborKey) || !neighbor.walkable) {
                    continue;
                }
                
                // Обчислюємо вартість руху до сусіда
                const tentativeG = currentNode.g + 1; // Вартість руху між сусідніми тайлами = 1
                
                // Перевіряємо чи знайдено кращий шлях
                const inOpenList = openList.includes(neighbor);
                
                if (!inOpenList) {
                    // Додаємо до openList
                    neighbor.g = tentativeG;
                    neighbor.h = this.heuristic(neighbor, endNode);
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = currentNode;
                    openList.push(neighbor);
                } else if (tentativeG < neighbor.g) {
                    // Знайдено кращий шлях - оновлюємо
                    neighbor.g = tentativeG;
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = currentNode;
                }
            }
        }
        
        // Шлях не знайдено
        return null;
    }
    
    /**
     * Скидає значення A* у всіх тайлах grid
     */
    resetGridValues() {
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const node = this.grid[y][x];
                node.g = 0;
                node.h = 0;
                node.f = 0;
                node.parent = null;
            }
        }
    }
    
    /**
     * Отримує сусідні тайли (8 напрямків)
     * @param {number} tileX - X координата в тайлах
     * @param {number} tileY - Y координата в тайлах
     * @returns {Array} Масив сусідніх тайлів
     */
    getNeighbors(tileX, tileY) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 },  // Вгору
            { x: 1, y: -1 },  // Вгору-вправо
            { x: 1, y: 0 },   // Вправо
            { x: 1, y: 1 },   // Вниз-вправо
            { x: 0, y: 1 },   // Вниз
            { x: -1, y: 1 },  // Вниз-вліво
            { x: -1, y: 0 },  // Вліво
            { x: -1, y: -1 }  // Вгору-вліво
        ];
        
        for (const dir of directions) {
            const checkX = tileX + dir.x;
            const checkY = tileY + dir.y;
            
            if (checkX >= 0 && checkX < this.mapWidth && 
                checkY >= 0 && checkY < this.mapHeight) {
                neighbors.push(this.grid[checkY][checkX]);
            }
        }
        
        return neighbors;
    }
    
    /**
     * Евристична функція для A* (Manhattan distance)
     * @param {Object} nodeA - Початкова тайл
     * @param {Object} nodeB - Цільова тайл
     * @returns {number}
     */
    heuristic(nodeA, nodeB) {
        // Manhattan distance для 8-напрямкового руху
        const dx = Math.abs(nodeA.x - nodeB.x);
        const dy = Math.abs(nodeA.y - nodeB.y);
        
        // Для діагонального руху використовуємо D*1.414, для прямого D*1
        return Math.max(dx, dy) + (Math.sqrt(2) - 1) * Math.min(dx, dy);
    }
    
    /**
     * Будує шлях від кінця до початку (reconstruct path)
     * @param {Object} startNode - Початкова тайл
     * @param {Object} endNode - Кінцева тайл
     * @returns {Array<{x: number, y: number}>} Масив waypoints
     */
    reconstructPath(startNode, endNode) {
        const path = [];
        let currentNode = endNode;
        
        while (currentNode && (currentNode.x !== startNode.x || currentNode.y !== startNode.y)) {
            path.unshift({ x: currentNode.x, y: currentNode.y });
            currentNode = currentNode.parent;
        }
        
        // Додаємо початкову точку (якщо потрібно)
        if (path.length === 0 || path[0].x !== startNode.x || path[0].y !== startNode.y) {
            path.unshift({ x: startNode.x, y: startNode.y });
        }
        
        // Додаємо кінцеву точку (якщо потрібно)
        if (path.length === 0 || 
            path[path.length - 1].x !== endNode.x || 
            path[path.length - 1].y !== endNode.y) {
            path.push({ x: endNode.x, y: endNode.y });
        }
        
        return path;
    }
    
    /**
     * Знаходить найближчу прохідну тайл навколо заданої позиції
     * @param {number} tileX - X координата в тайлах
     * @param {number} tileY - Y координата в тайлах
     * @param {number} maxRadius - Максимальний радіус пошуку
     * @returns {{x: number, y: number}|null}
     */
    findNearestWalkable(tileX, tileY, maxRadius = 5) {
        // Спочатку перевіряємо саму точку
        if (this.isWalkable(tileX, tileY)) {
            return { x: tileX, y: tileY };
        }
        
        // Пошук по спіралі
        for (let radius = 1; radius <= maxRadius; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    // Перевіряємо тільки периметр поточного радіусу
                    if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                        const checkX = tileX + dx;
                        const checkY = tileY + dy;
                        
                        if (this.isWalkable(checkX, checkY)) {
                            return { x: checkX, y: checkY };
                        }
                    }
                }
            }
        }
        
        return null;
    }
}

export default NavigationSystem;
