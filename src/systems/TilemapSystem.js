import { GAME_CONFIG } from '../config/gameConfig.js';
import spriteManager from '../utils/SpriteManager.js';
class TilemapSystem {
    constructor(scene) {
        if (!scene) {
            throw new Error('TilemapSystem: scene не передано в конструктор');
        }
        if (!scene.add) {
            throw new Error('TilemapSystem: scene не має методу add (можливо, це не Phaser Scene)');
        }
        this.scene = scene;
        this.tileSize = 32;
        this.worldWidth = 4000;
        this.worldHeight = 4000;
        this.mapWidth = Math.floor(this.worldWidth / this.tileSize);
        this.mapHeight = Math.floor(this.worldHeight / this.tileSize);
        this.TILE_TYPES = {
            ROAD: 0,
            SIDEWALK: 1,
            YARD: 2,
            BUILDING: 3,
            KIOSK: 4,
            FENCE: 5
        };
        this.TILE_COLORS = {
            [this.TILE_TYPES.ROAD]: spriteManager.getTileColor('ROAD'),
            [this.TILE_TYPES.SIDEWALK]: spriteManager.getTileColor('SIDEWALK'),
            [this.TILE_TYPES.YARD]: spriteManager.getTileColor('YARD'),
            [this.TILE_TYPES.BUILDING]: spriteManager.getTileColor('BUILDING'),
            [this.TILE_TYPES.KIOSK]: spriteManager.getTileColor('KIOSK'),
            [this.TILE_TYPES.FENCE]: spriteManager.getTileColor('FENCE')
        };
        this.COLLISION_TILES = [
            this.TILE_TYPES.BUILDING,
            this.TILE_TYPES.KIOSK,
            this.TILE_TYPES.FENCE
        ];
        this.mapData = [];
        this.collisionMap = [];
        this.tileTypeMap = [];
        this.activeKiosks = [];
        this.kioskSprites = [];
        this.mapGraphics = null;
        this.mapSprite = null;
        try {
            this.loadCollisionMap();
        } catch (error) {
            throw error;
        }
        try {
            this.createVisualMap();
            this.createKioskSprites();
        } catch (error) {
            throw error;
        }
    }
    loadCollisionMap() {
        if (!this.scene.textures.exists('collision_map')) {
            console.warn('TilemapSystem: collision_map texture missing');
            this.initializeEmptyCollisionMap();
            return;
        }

        const texture = this.scene.textures.get('collision_map');
        const sourceImage = texture.getSourceImage();

        if (!sourceImage) {
            console.warn('TilemapSystem: collision_map source image missing');
            this.initializeEmptyCollisionMap();
            return;
        }

        // Create canvas to read pixels
        const canvas = document.createElement('canvas');
        canvas.width = sourceImage.width;
        canvas.height = sourceImage.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(sourceImage, 0, 0);

        const imageData = ctx.getImageData(0, 0, sourceImage.width, sourceImage.height);
        const pixels = imageData.data;

        this.collisionMap = [];
        this.tileTypeMap = [];

        // Debug info
        let redCount = 0;
        let blueCount = 0;
        let grayCount = 0;
        let yellowCount = 0;
        let yardCount = 0;

        const scaleX = this.worldWidth / sourceImage.width;
        const scaleY = this.worldHeight / sourceImage.height;

        for (let tileY = 0; tileY < this.mapHeight; tileY++) {
            this.collisionMap[tileY] = [];
            this.tileTypeMap[tileY] = [];

            for (let tileX = 0; tileX < this.mapWidth; tileX++) {
                // Map tile coordinate to texture coordinate
                const worldX = tileX * this.tileSize;
                const worldY = tileY * this.tileSize;

                // Sample CENTER of the tile for better accuracy
                const centerX = worldX + this.tileSize / 2;
                const centerY = worldY + this.tileSize / 2;

                const mapX = Math.floor(centerX / scaleX);
                const mapY = Math.floor(centerY / scaleY);

                const clampedX = Math.max(0, Math.min(mapX, sourceImage.width - 1));
                const clampedY = Math.max(0, Math.min(mapY, sourceImage.height - 1));

                const index = (clampedY * sourceImage.width + clampedX) * 4;
                const r = pixels[index];
                const g = pixels[index + 1];
                const b = pixels[index + 2];

                // Collision Logic (Refined)
                // Red = Fence/Obstacle
                const isRed = r > 150 && r > g * 1.5 && r > b * 1.5;
                // Blue = Building/Kiosk
                const isBlue = b > 150 && b > r * 1.5 && b > g * 1.5;
                // Gray = Road
                const isGray = Math.abs(r - g) < 40 && Math.abs(g - b) < 40 && r > 80 && r < 220;
                // Yellow = Sidewalk
                const isYellow = r > 200 && g > 200 && b < 100;

                if (isGray) {
                    this.tileTypeMap[tileY][tileX] = this.TILE_TYPES.ROAD;
                    grayCount++;
                    this.collisionMap[tileY][tileX] = false;
                } else if (isYellow) {
                    this.tileTypeMap[tileY][tileX] = this.TILE_TYPES.SIDEWALK;
                    yellowCount++;
                    this.collisionMap[tileY][tileX] = false;
                } else if (isRed || isBlue) {
                    // Determine specific type if needed, but for collision it's just true
                    if (isBlue) {
                        this.tileTypeMap[tileY][tileX] = this.TILE_TYPES.BUILDING;
                        blueCount++;
                    } else {
                        this.tileTypeMap[tileY][tileX] = this.TILE_TYPES.FENCE;
                        redCount++;
                    }
                    this.collisionMap[tileY][tileX] = true;
                } else {
                    this.tileTypeMap[tileY][tileX] = this.TILE_TYPES.YARD;
                    yardCount++;
                    this.collisionMap[tileY][tileX] = false;
                }
            }
        }

        // Enforce boundary fence
        for (let x = 0; x < this.mapWidth; x++) {
            this.collisionMap[0][x] = true;
            this.tileTypeMap[0][x] = this.TILE_TYPES.FENCE;
            this.collisionMap[this.mapHeight - 1][x] = true;
            this.tileTypeMap[this.mapHeight - 1][x] = this.TILE_TYPES.FENCE;
        }
        for (let y = 0; y < this.mapHeight; y++) {
            this.collisionMap[y][0] = true;
            this.tileTypeMap[y][0] = this.TILE_TYPES.FENCE;
            this.collisionMap[y][this.mapWidth - 1] = true;
            this.tileTypeMap[y][this.mapWidth - 1] = this.TILE_TYPES.FENCE;
        }

        console.log(`[TilemapSystem] Collision Map Loaded. Stats: Road=${grayCount}, Sidewalk=${yellowCount}, Building=${blueCount}, Fence=${redCount}, Yard=${yardCount}`);

        this.generateKiosks();
    }
    initializeEmptyCollisionMap() {
        this.collisionMap = [];
        this.tileTypeMap = [];
        for (let y = 0; y < this.mapHeight; y++) {
            this.collisionMap[y] = [];
            this.tileTypeMap[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                if (x === 0 || x === this.mapWidth - 1 || y === 0 || y === this.mapHeight - 1) {
                    this.collisionMap[y][x] = true;
                    this.tileTypeMap[y][x] = this.TILE_TYPES.FENCE;
                } else {
                    this.collisionMap[y][x] = false;
                    this.tileTypeMap[y][x] = this.TILE_TYPES.YARD;
                }
            }
        }
    }
    generateOrganicStreets() {
        const blockSize = 15;
        for (let i = 1; i < 4; i++) {
            const y = i * blockSize;
            for (let x = 0; x < this.mapWidth; x++) {
                const offset = Math.sin(x * 0.05) * 1.5;
                const actualY = Math.floor(y + offset);
                for (let w = -1; w <= 1; w++) {
                    const roadY = actualY + w;
                    if (roadY >= 0 && roadY < this.mapHeight) {
                        this.mapData[roadY][x] = this.TILE_TYPES.ROAD;
                    }
                }
            }
        }
        for (let i = 1; i < 4; i++) {
            const x = i * blockSize;
            for (let y = 0; y < this.mapHeight; y++) {
                const offset = Math.sin(y * 0.05) * 1.5;
                const actualX = Math.floor(x + offset);
                for (let w = -1; w <= 1; w++) {
                    const roadX = actualX + w;
                    if (roadX >= 0 && roadX < this.mapWidth) {
                        this.mapData[y][roadX] = this.TILE_TYPES.ROAD;
                    }
                }
            }
        }
        for (let blockY = 0; blockY < this.mapHeight; blockY += blockSize) {
            for (let blockX = 0; blockX < this.mapWidth; blockX += blockSize) {
                if (Math.random() > 0.6) {
                    const midY = blockY + Math.floor(blockSize / 2);
                    const midX = blockX + Math.floor(blockSize / 2);
                    if (Math.random() > 0.5) {
                        for (let x = blockX; x < blockX + blockSize && x < this.mapWidth; x++) {
                            const offset = Math.sin(x * 0.2) * 1;
                            const y = Math.floor(midY + offset);
                            if (y >= 0 && y < this.mapHeight &&
                                this.mapData[y][x] === this.TILE_TYPES.YARD) {
                                this.mapData[y][x] = this.TILE_TYPES.ROAD;
                            }
                        }
                    }
                    if (Math.random() > 0.5) {
                        for (let y = blockY; y < blockY + blockSize && y < this.mapHeight; y++) {
                            const offset = Math.sin(y * 0.2) * 1;
                            const x = Math.floor(midX + offset);
                            if (x >= 0 && x < this.mapWidth &&
                                this.mapData[y][x] === this.TILE_TYPES.YARD) {
                                this.mapData[y][x] = this.TILE_TYPES.ROAD;
                            }
                        }
                    }
                }
            }
        }
    }
    generateBuildings() {
        const blockSize = 15;
        for (let blockY = 1; blockY < this.mapHeight - 1; blockY += blockSize) {
            for (let blockX = 1; blockX < this.mapWidth - 1; blockX += blockSize) {
                this.generateBlockBuildings(blockX, blockY, blockSize);
            }
        }
    }
    generateBlockBuildings(blockX, blockY, blockSize) {
        const buildings = [];
        const maxBuildings = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < maxBuildings; i++) {
            let x = blockX + Math.floor(Math.random() * (blockSize - 4)) + 2;
            let y = blockY + Math.floor(Math.random() * (blockSize - 4)) + 2;
            if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) continue;
            if (this.mapData[y][x] === this.TILE_TYPES.ROAD ||
                this.mapData[y][x] === this.TILE_TYPES.SIDEWALK) continue;
            const buildingType = Math.random();
            let width, height;
            if (buildingType < 0.3) {
                width = 4 + Math.floor(Math.random() * 3);
                height = 4 + Math.floor(Math.random() * 3);
            } else if (buildingType < 0.6) {
                width = 3 + Math.floor(Math.random() * 2);
                height = 3 + Math.floor(Math.random() * 2);
            } else if (buildingType < 0.85) {
                width = 4 + Math.floor(Math.random() * 2);
                height = 4 + Math.floor(Math.random() * 2);
                this.placeLShapedBuilding(x, y, width, height);
                continue;
            } else {
                width = 2 + Math.floor(Math.random() * 2);
                height = 2 + Math.floor(Math.random() * 2);
            }
            if (this.canPlaceBuilding(x, y, width, height)) {
                this.placeBuilding(x, y, width, height);
            }
        }
    }
    placeLShapedBuilding(startX, startY, width, height) {
        const leg1Width = Math.floor(width * 0.6);
        const leg1Height = height;
        const leg2Width = width;
        const leg2Height = Math.floor(height * 0.6);
        if (this.canPlaceBuilding(startX, startY, leg1Width, leg1Height)) {
            this.placeBuilding(startX, startY, leg1Width, leg1Height);
        }
        const leg2X = startX;
        const leg2Y = startY + leg1Height;
        if (this.canPlaceBuilding(leg2X, leg2Y, leg2Width, leg2Height)) {
            this.placeBuilding(leg2X, leg2Y, leg2Width, leg2Height);
        }
    }
    canPlaceBuilding(startX, startY, width, height) {
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const x = startX + dx;
                const y = startY + dy;
                if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return false;
                if (this.mapData[y][x] === this.TILE_TYPES.ROAD ||
                    this.mapData[y][x] === this.TILE_TYPES.SIDEWALK ||
                    this.mapData[y][x] === this.TILE_TYPES.BUILDING ||
                    this.mapData[y][x] === this.TILE_TYPES.FENCE) {
                    return false;
                }
            }
        }
        return true;
    }
    generateKiosks() {
        const kioskCount = GAME_CONFIG.KIOSKS.COUNT;
        const validPositions = [];
        for (let y = 2; y < this.mapHeight - 2; y++) {
            if (!this.collisionMap[y]) continue;
            for (let x = 2; x < this.mapWidth - 2; x++) {
                if (this.collisionMap[y][x] === undefined) continue;
                if (this.collisionMap[y][x]) continue;
                const hasCollisionNearby = this.hasCollisionNearby(x, y, 2);
                if (hasCollisionNearby) {
                    validPositions.push({ x, y });
                }
            }
        }
        const shuffled = validPositions.sort(() => Math.random() - 0.5);
        const selectedPositions = shuffled.slice(0, Math.min(kioskCount, validPositions.length));
        for (const pos of selectedPositions) {
            const worldPos = this.tileToWorld(pos.x, pos.y);
            this.activeKiosks.push({
                tileX: pos.x,
                tileY: pos.y,
                worldX: worldPos.x,
                worldY: worldPos.y
            });
        }
    }
    hasCollisionNearby(tileX, tileY, radius) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                const checkX = tileX + dx;
                const checkY = tileY + dy;
                if (checkX >= 0 && checkX < this.mapWidth &&
                    checkY >= 0 && checkY < this.mapHeight) {
                    if (this.collisionMap[checkY] && this.collisionMap[checkY][checkX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    createKioskSprites() {
        for (const kiosk of this.activeKiosks) {
            const spriteConfig = spriteManager.TILE_SPRITES.KIOSK;
            let sprite;
            if (spriteConfig.type === 'texture') {
                const textureKey = spriteConfig.value;
                if (!this.scene.textures.exists(textureKey)) {
                    sprite = this.scene.add.rectangle(
                        kiosk.worldX,
                        kiosk.worldY,
                        spriteConfig.width,
                        spriteConfig.height,
                        0x0000ff,
                        1.0
                    );
                } else {
                    sprite = this.scene.add.image(kiosk.worldX, kiosk.worldY, textureKey);
                    sprite.setDisplaySize(spriteConfig.width, spriteConfig.height);
                }
            } else {
                const kioskColor = spriteConfig.value;
                sprite = this.scene.add.rectangle(
                    kiosk.worldX,
                    kiosk.worldY,
                    spriteConfig.width,
                    spriteConfig.height,
                    kioskColor,
                    1.0
                );
            }
            sprite.setScrollFactor(1);
            sprite.setOrigin(0.5);
            sprite.setDepth(1);
            sprite.setVisible(true);
            kiosk.sprite = sprite;
            this.kioskSprites.push(sprite);
        }
    }
    updateTileVisual(tileX, tileY) {
        return null;
    }
    removeKiosk(tileX, tileY) {
        const kioskIndex = this.activeKiosks.findIndex(
            k => k.tileX === tileX && k.tileY === tileY
        );
        if (kioskIndex !== -1) {
            const kiosk = this.activeKiosks[kioskIndex];
            if (kiosk.sprite) {
                kiosk.sprite.destroy();
            }
            this.activeKiosks.splice(kioskIndex, 1);
            this.kioskSprites = this.kioskSprites.filter(s => s !== kiosk.sprite);
            return kiosk;
        }
        return null;
    }
    spawnKioskAtRandomPosition() {
        const validPositions = [];
        for (let y = 2; y < this.mapHeight - 2; y++) {
            if (!this.collisionMap[y]) continue;
            for (let x = 2; x < this.mapWidth - 2; x++) {
                if (this.collisionMap[y][x] === undefined) continue;
                if (this.collisionMap[y][x]) continue;
                const hasKiosk = this.activeKiosks.some(k => k.tileX === x && k.tileY === y);
                if (hasKiosk) continue;
                if (this.hasCollisionNearby(x, y, 2)) {
                    validPositions.push({ x, y });
                }
            }
        }
        if (validPositions.length === 0) return null;
        const randomPos = validPositions[Math.floor(Math.random() * validPositions.length)];
        const worldPos = this.tileToWorld(randomPos.x, randomPos.y);
        const kiosk = {
            tileX: randomPos.x,
            tileY: randomPos.y,
            worldX: worldPos.x,
            worldY: worldPos.y
        };
        const spriteConfig = spriteManager.TILE_SPRITES.KIOSK;
        let sprite;
        if (spriteConfig.type === 'texture') {
            if (!this.scene.textures.exists(spriteConfig.value)) {
                sprite = this.scene.add.rectangle(
                    kiosk.worldX,
                    kiosk.worldY,
                    spriteConfig.width,
                    spriteConfig.height,
                    0x0000ff,
                    1.0
                );
            } else {
                sprite = this.scene.add.image(kiosk.worldX, kiosk.worldY, spriteConfig.value);
                sprite.setDisplaySize(spriteConfig.width, spriteConfig.height);
            }
        } else {
            const kioskColor = spriteConfig.value;
            sprite = this.scene.add.rectangle(
                kiosk.worldX,
                kiosk.worldY,
                spriteConfig.width,
                spriteConfig.height,
                kioskColor,
                1.0
            );
        }
        sprite.setScrollFactor(1);
        sprite.setOrigin(0.5);
        sprite.setDepth(1);
        sprite.setVisible(true);
        kiosk.sprite = sprite;
        this.activeKiosks.push(kiosk);
        if (this.kioskSprites) {
            this.kioskSprites.push(sprite);
        }
        if (this.scene.minimap) {
            this.scene.minimap.refresh();
        }
        return kiosk;
    }
    getKioskAt(tileX, tileY) {
        return this.activeKiosks.find(
            k => k.tileX === tileX && k.tileY === tileY
        );
    }
    hasRoadNearby(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const checkX = x + dx;
                const checkY = y + dy;
                if (checkX >= 0 && checkX < this.mapWidth &&
                    checkY >= 0 && checkY < this.mapHeight) {
                    if (this.mapData[checkY][checkX] === this.TILE_TYPES.ROAD) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    isInQuarter(x, y) {
        let minDistToRoad = Infinity;
        for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
                const checkY = y + dy;
                const checkX = x + dx;
                if (checkY >= 0 && checkY < this.mapHeight &&
                    checkX >= 0 && checkX < this.mapWidth) {
                    if (this.mapData[checkY][checkX] === this.TILE_TYPES.ROAD) {
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        minDistToRoad = Math.min(minDistToRoad, dist);
                    }
                }
            }
        }
        return minDistToRoad > 2 && minDistToRoad < 15;
    }
    placeBuilding(startX, startY, width, height) {
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const x = startX + dx;
                const y = startY + dy;
                if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
                    this.mapData[y][x] = this.TILE_TYPES.BUILDING;
                }
            }
        }
        for (let dy = -1; dy <= height; dy++) {
            for (let dx = -1; dx <= width; dx++) {
                const x = startX + dx;
                const y = startY + dy;
                if ((dx === -1 || dx === width || dy === -1 || dy === height)) {
                    if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
                        if (this.mapData[y][x] === this.TILE_TYPES.YARD) {
                            if (Math.random() < 0.3) {
                            }
                        }
                    }
                }
            }
        }
    }
    generateParks() {
        const parkCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < parkCount; i++) {
            const size = 8 + Math.floor(Math.random() * 6);
            const x = Math.floor(Math.random() * (this.mapWidth - size - 4)) + 2;
            const y = Math.floor(Math.random() * (this.mapHeight - size - 4)) + 2;
            let canPlace = true;
            for (let dy = 0; dy < size; dy++) {
                for (let dx = 0; dx < size; dx++) {
                    const checkX = x + dx;
                    const checkY = y + dy;
                    if (checkX >= this.mapWidth || checkY >= this.mapHeight) {
                        canPlace = false;
                        break;
                    }
                    if (this.mapData[checkY][checkX] === this.TILE_TYPES.ROAD ||
                        this.mapData[checkY][checkX] === this.TILE_TYPES.BUILDING) {
                        canPlace = false;
                        break;
                    }
                }
                if (!canPlace) break;
            }
            if (canPlace) {
                for (let dy = -1; dy <= size; dy++) {
                    for (let dx = -1; dx <= size; dx++) {
                        const checkX = x + dx;
                        const checkY = y + dy;
                        if (checkX >= 0 && checkX < this.mapWidth &&
                            checkY >= 0 && checkY < this.mapHeight) {
                            if (dx === -1 || dx === size || dy === -1 || dy === size) {
                                if (this.mapData[checkY][checkX] === this.TILE_TYPES.YARD) {
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    generateSidewalks() {
        for (let y = 1; y < this.mapHeight - 1; y++) {
            if (!this.mapData[y]) continue;
            for (let x = 1; x < this.mapWidth - 1; x++) {
                if (this.mapData[y][x] === this.TILE_TYPES.ROAD) {
                    const neighbors = [
                        { x: x - 1, y: y },
                        { x: x + 1, y: y },
                        { x: x, y: y - 1 },
                        { x: x, y: y + 1 }
                    ];
                    for (const neighbor of neighbors) {
                        if (neighbor.x >= 0 && neighbor.x < this.mapWidth &&
                            neighbor.y >= 0 && neighbor.y < this.mapHeight) {
                            const tile = this.mapData[neighbor.y][neighbor.x];
                            if (tile !== this.TILE_TYPES.ROAD &&
                                tile !== this.TILE_TYPES.BUILDING &&
                                tile !== this.TILE_TYPES.FENCE &&
                                tile !== this.TILE_TYPES.KIOSK) {
                                this.mapData[neighbor.y][neighbor.x] = this.TILE_TYPES.SIDEWALK;
                            }
                        }
                    }
                }
            }
        }
    }
    createVisualMap() {
        if (!this.scene || !this.scene.add) {
            throw new Error('Scene не визначено або не має методу add');
        }
        this.tileSprites = [];
        this.camera = this.scene.cameras.main;
        this.lastVisibilityUpdate = 0;
        this.visibilityUpdateInterval = 100;
        if (!this.scene.textures.exists('map')) {
            this.mapGraphics = this.scene.add.graphics();
            this.mapGraphics.setScrollFactor(1);
            this.mapGraphics.fillStyle(0x90EE90, 1.0);
            this.mapGraphics.fillRect(0, 0, this.worldWidth, this.worldHeight);
            return;
        }
        this.mapSprite = this.scene.add.image(
            this.worldWidth / 2,
            this.worldHeight / 2,
            'map'
        );
        this.mapSprite.setDisplaySize(this.worldWidth, this.worldHeight);
        this.mapSprite.setScrollFactor(1);
        this.mapSprite.setDepth(0);
        this.mapSprite.setOrigin(0.5);
    }
    createCanvasTextureForTiles(textureKey, positions) {
        if (positions.length === 0) return;
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        for (const pos of positions) {
            const left = pos.x;
            const top = pos.y;
            const right = pos.x + pos.width;
            const bottom = pos.y + pos.height;
            minX = Math.min(minX, left);
            minY = Math.min(minY, top);
            maxX = Math.max(maxX, right);
            maxY = Math.max(maxY, bottom);
        }
        const canvasWidth = Math.ceil(maxX - minX);
        const canvasHeight = Math.ceil(maxY - minY);
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');
        const sourceTexture = this.scene.textures.get(textureKey);
        if (!sourceTexture) {
            return;
        }
        const sourceImage = sourceTexture.getSourceImage();
        if (!sourceImage) {
            return;
        }
        ctx.imageSmoothingEnabled = false;
        for (const pos of positions) {
            const drawX = pos.x - minX;
            const drawY = pos.y - minY;
            ctx.drawImage(
                sourceImage,
                0, 0, sourceImage.width, sourceImage.height,
                drawX - 0.5, drawY - 0.5, pos.width + 1, pos.height + 1
            );
        }
        const canvasTextureKey = `canvas-${textureKey}`;
        if (this.scene.textures.exists(canvasTextureKey)) {
            this.scene.textures.remove(canvasTextureKey);
        }
        this.scene.textures.addCanvas(canvasTextureKey, canvas);
        const sprite = this.scene.add.image(
            minX + canvasWidth / 2,
            minY + canvasHeight / 2,
            canvasTextureKey
        );
        sprite.setScrollFactor(1);
        sprite.setDepth(0);
        sprite.setOrigin(0.5);
        this.tileSprites.push(sprite);
    }
    hasCollision(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
            return true;
        }
        if (this.collisionMap && this.collisionMap[tileY] && this.collisionMap[tileY][tileX] !== undefined) {
            return this.collisionMap[tileY][tileX];
        }
        if (this.mapData && this.mapData[tileY] && this.mapData[tileY][tileX] !== undefined) {
            const tileType = this.mapData[tileY][tileX];
            return this.COLLISION_TILES.includes(tileType);
        }
        return false;
    }
    isWalkable(worldX, worldY) {
        return !this.hasCollision(worldX, worldY);
    }
    isRoadOrSidewalk(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
            return false;
        }
        if (this.tileTypeMap && this.tileTypeMap[tileY] && this.tileTypeMap[tileY][tileX] !== undefined) {
            const tileType = this.tileTypeMap[tileY][tileX];
            return tileType === this.TILE_TYPES.ROAD || tileType === this.TILE_TYPES.SIDEWALK;
        }
        return false;
    }
    isRoad(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
            return false;
        }
        if (this.tileTypeMap && this.tileTypeMap[tileY] && this.tileTypeMap[tileY][tileX] !== undefined) {
            const tileType = this.tileTypeMap[tileY][tileX];
            return tileType === this.TILE_TYPES.ROAD;
        }
        return false;
    }
    isWater(worldX, worldY) {
        if (!this.scene || !this.scene.textures.exists('collision_map')) {
            return false;
        }
        if (worldX < 0 || worldX >= this.worldWidth || worldY < 0 || worldY >= this.worldHeight) {
            return false;
        }
        const texture = this.scene.textures.get('collision_map');
        const canvas = texture.getSourceImage();
        if (!this.collisionMapCanvas) {
            this.collisionMapCanvas = document.createElement('canvas');
            this.collisionMapCanvas.width = canvas.width;
            this.collisionMapCanvas.height = canvas.height;
            const ctx = this.collisionMapCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, 0);
            this.collisionMapImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        const pixelX = Math.floor((worldX / this.worldWidth) * this.collisionMapCanvas.width);
        const pixelY = Math.floor((worldY / this.worldHeight) * this.collisionMapCanvas.height);
        const index = (pixelY * this.collisionMapCanvas.width + pixelX) * 4;
        const r = this.collisionMapImageData.data[index];
        const g = this.collisionMapImageData.data[index + 1];
        const b = this.collisionMapImageData.data[index + 2];
        return b > 150 && b > r && b > g;
    }
    isAreaRoadOrSidewalk(worldX, worldY, sizeInTiles) {
        const startTileX = Math.floor(worldX / this.tileSize);
        const startTileY = Math.floor(worldY / this.tileSize);
        for (let dy = 0; dy < sizeInTiles; dy++) {
            for (let dx = 0; dx < sizeInTiles; dx++) {
                const tileX = startTileX + dx;
                const tileY = startTileY + dy;
                if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
                    return false;
                }
                if (this.tileTypeMap && this.tileTypeMap[tileY] && this.tileTypeMap[tileY][tileX] !== undefined) {
                    const tileType = this.tileTypeMap[tileY][tileX];
                    if (tileType !== this.TILE_TYPES.ROAD && tileType !== this.TILE_TYPES.SIDEWALK) {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        }
        return true;
    }
    getTileType(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
            return this.TILE_TYPES.FENCE;
        }
        if (this.collisionMap && this.collisionMap[tileY] && this.collisionMap[tileY][tileX]) {
            return this.TILE_TYPES.BUILDING;
        }
        if (this.mapData && this.mapData[tileY] && this.mapData[tileY][tileX] !== undefined) {
            return this.mapData[tileY][tileX];
        }
        return this.TILE_TYPES.YARD;
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
    getRoadDirection(worldX, worldY) {
        const tile = this.worldToTile(worldX, worldY);
        if (tile.x < 0 || tile.x >= this.mapWidth || tile.y < 0 || tile.y >= this.mapHeight) {
            return null;
        }
        if (!this.isRoad(worldX, worldY)) {
            return null;
        }
        const checkDistance = 2;
        let hasRoadLeft = false;
        let hasRoadRight = false;
        let hasRoadUp = false;
        let hasRoadDown = false;
        for (let i = 1; i <= checkDistance; i++) {
            if (tile.x - i >= 0) {
                const worldPos = this.tileToWorld(tile.x - i, tile.y);
                if (this.isRoad(worldPos.x, worldPos.y)) {
                    hasRoadLeft = true;
                    break;
                }
            }
        }
        for (let i = 1; i <= checkDistance; i++) {
            if (tile.x + i < this.mapWidth) {
                const worldPos = this.tileToWorld(tile.x + i, tile.y);
                if (this.isRoad(worldPos.x, worldPos.y)) {
                    hasRoadRight = true;
                    break;
                }
            }
        }
        for (let i = 1; i <= checkDistance; i++) {
            if (tile.y - i >= 0) {
                const worldPos = this.tileToWorld(tile.x, tile.y - i);
                if (this.isRoad(worldPos.x, worldPos.y)) {
                    hasRoadUp = true;
                    break;
                }
            }
        }
        for (let i = 1; i <= checkDistance; i++) {
            if (tile.y + i < this.mapHeight) {
                const worldPos = this.tileToWorld(tile.x, tile.y + i);
                if (this.isRoad(worldPos.x, worldPos.y)) {
                    hasRoadDown = true;
                    break;
                }
            }
        }
        const hasHorizontal = hasRoadLeft || hasRoadRight;
        const hasVertical = hasRoadUp || hasRoadDown;
        if (hasHorizontal && hasVertical) {
            return 'intersection';
        }
        if (hasHorizontal && !hasVertical) {
            return 'horizontal';
        }
        if (hasVertical && !hasHorizontal) {
            return 'vertical';
        }
        return null;
    }
    getDirectionFromCollisionMap(worldX, worldY) {
        if (!this.scene || !this.scene.textures.exists('collision_map')) {
            return null;
        }
        const texture = this.scene.textures.get('collision_map');
        const sourceImage = texture.getSourceImage();
        if (!sourceImage) {
            return null;
        }
        const scaleX = sourceImage.width / this.worldWidth;
        const scaleY = sourceImage.height / this.worldHeight;
        const mapX = Math.floor(worldX * scaleX);
        const mapY = Math.floor(worldY * scaleY);
        const clampedX = Phaser.Math.Clamp(mapX, 0, sourceImage.width - 1);
        const clampedY = Phaser.Math.Clamp(mapY, 0, sourceImage.height - 1);
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(sourceImage, clampedX, clampedY, 1, 1, 0, 0, 1, 1);
        const imageData = ctx.getImageData(0, 0, 1, 1);
        const r = imageData.data[0];
        const g = imageData.data[1];
        const b = imageData.data[2];
        if (r < 30 && g < 30 && b < 30) {
            return 'right';
        }
        if (r > 240 && g > 240 && b > 240) {
            return 'left';
        }
        if (r > 200 && r < 255 && g > 40 && g < 100 && b > 180 && b < 255) {
            return 'up';
        }
        if (r > 50 && r < 100 && g > 120 && g < 180 && b > 220 && b < 255) {
            return 'down';
        }
        return null;
    }
    updateVisibility(time) {
        if (!this.camera || !this.tileSprites) return;
        if (time && time - this.lastVisibilityUpdate < this.visibilityUpdateInterval) {
            return;
        }
        this.lastVisibilityUpdate = time || 0;
        const viewport = this.camera.worldView;
        const margin = 200;
        for (const sprite of this.tileSprites) {
            if (!sprite || !sprite.active) continue;
            const spriteBounds = sprite.getBounds();
            const isVisible = (
                spriteBounds.right >= viewport.x - margin &&
                spriteBounds.left <= viewport.x + viewport.width + margin &&
                spriteBounds.bottom >= viewport.y - margin &&
                spriteBounds.top <= viewport.y + viewport.height + margin
            );
            sprite.setVisible(isVisible);
        }
    }
}
export default TilemapSystem;