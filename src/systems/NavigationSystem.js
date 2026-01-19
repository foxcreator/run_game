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
        this.grid = null;
        this.buildGrid();
    }
    buildGrid() {
        this.grid = [];
        for (let y = 0; y < this.mapHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                const isWalkable = !this.tilemap.hasCollision(
                    x * this.tileSize + this.tileSize / 2,
                    y * this.tileSize + this.tileSize / 2
                );
                this.grid[y][x] = {
                    x: x,
                    y: y,
                    walkable: isWalkable,
                    g: 0,
                    h: 0,
                    f: 0,
                    parent: null
                };
            }
        }
    }
    isWalkable(tileX, tileY) {
        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
            return false;
        }
        if (!this.grid || !this.grid[tileY] || !this.grid[tileY][tileX]) {
            return false;
        }
        return this.grid[tileY][tileX].walkable;
    }
    worldToTile(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.tileSize),
            y: Math.floor(worldY / this.tileSize)
        };
    }
    tileToWorld(tileX, tileY) {
        return {
            x: tileX * this.tileSize + this.tileSize / 2,
            y: tileY * this.tileSize + this.tileSize / 2
        };
    }
    findPath(fromTileX, fromTileY, toTileX, toTileY) {
        if (!this.isWalkable(fromTileX, fromTileY) || !this.isWalkable(toTileX, toTileY)) {
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
        if (fromTileX === toTileX && fromTileY === toTileY) {
            return [{ x: toTileX, y: toTileY }];
        }
        const openList = [];
        const closedList = new Set();
        const startNode = this.grid[fromTileY][fromTileX];
        const endNode = this.grid[toTileY][toTileX];
        this.resetGridValues();
        startNode.g = 0;
        startNode.h = this.heuristic(startNode, endNode);
        startNode.f = startNode.g + startNode.h;
        startNode.parent = null;
        openList.push(startNode);
        const maxIterations = this.mapWidth * this.mapHeight;
        let iterations = 0;
        while (openList.length > 0 && iterations < maxIterations) {
            iterations++;
            let currentNode = openList[0];
            let currentIndex = 0;
            for (let i = 1; i < openList.length; i++) {
                if (openList[i].f < currentNode.f ||
                    (openList[i].f === currentNode.f && openList[i].h < currentNode.h)) {
                    currentNode = openList[i];
                    currentIndex = i;
                }
            }
            openList.splice(currentIndex, 1);
            closedList.add(`${currentNode.x},${currentNode.y}`);
            if (currentNode.x === endNode.x && currentNode.y === endNode.y) {
                return this.reconstructPath(startNode, currentNode);
            }
            const neighbors = this.getNeighbors(currentNode.x, currentNode.y);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (closedList.has(neighborKey) || !neighbor.walkable) {
                    continue;
                }
                const tentativeG = currentNode.g + 1;
                const inOpenList = openList.includes(neighbor);
                if (!inOpenList) {
                    neighbor.g = tentativeG;
                    neighbor.h = this.heuristic(neighbor, endNode);
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = currentNode;
                    openList.push(neighbor);
                } else if (tentativeG < neighbor.g) {
                    neighbor.g = tentativeG;
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = currentNode;
                }
            }
        }
        return null;
    }
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
    getNeighbors(tileX, tileY) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 },
            { x: 1, y: -1 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
            { x: -1, y: 1 },
            { x: -1, y: 0 },
            { x: -1, y: -1 }
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
    heuristic(nodeA, nodeB) {
        const dx = Math.abs(nodeA.x - nodeB.x);
        const dy = Math.abs(nodeA.y - nodeB.y);
        return Math.max(dx, dy) + (Math.sqrt(2) - 1) * Math.min(dx, dy);
    }
    reconstructPath(startNode, endNode) {
        const path = [];
        let currentNode = endNode;
        while (currentNode && (currentNode.x !== startNode.x || currentNode.y !== startNode.y)) {
            path.unshift({ x: currentNode.x, y: currentNode.y });
            currentNode = currentNode.parent;
        }
        if (path.length === 0 || path[0].x !== startNode.x || path[0].y !== startNode.y) {
            path.unshift({ x: startNode.x, y: startNode.y });
        }
        if (path.length === 0 ||
            path[path.length - 1].x !== endNode.x ||
            path[path.length - 1].y !== endNode.y) {
            path.push({ x: endNode.x, y: endNode.y });
        }
        return path;
    }
    findNearestWalkable(tileX, tileY, maxRadius = 5) {
        if (this.isWalkable(tileX, tileY)) {
            return { x: tileX, y: tileY };
        }
        for (let radius = 1; radius <= maxRadius; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
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