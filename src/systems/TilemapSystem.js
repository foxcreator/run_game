// TilemapSystem - система tilemap для карти світу
import { GAME_CONFIG } from '../config/gameConfig.js';

class TilemapSystem {
    constructor(scene) {
        // Перевіряємо чи scene передано
        if (!scene) {
            throw new Error('TilemapSystem: scene не передано в конструктор');
        }
        if (!scene.add) {
            throw new Error('TilemapSystem: scene не має методу add (можливо, це не Phaser Scene)');
        }
        
        this.scene = scene;
        this.tileSize = 32; // 32x32 пікселів на тайл
        this.worldWidth = 4000;
        this.worldHeight = 4000;
        this.mapWidth = Math.floor(this.worldWidth / this.tileSize); // 125 тайлів
        this.mapHeight = Math.floor(this.worldHeight / this.tileSize); // 125 тайлів
        
        // Типи тайлів (кольорові заглушки MVP)
        this.TILE_TYPES = {
            ROAD: 0,        // Сірий - прохідний
            SIDEWALK: 1,   // Жовтий - прохідний
            YARD: 2,       // Зелений - прохідний
            BUILDING: 3,   // Червоний - колізія
            KIOSK: 4,      // Синій - колізія
            FENCE: 5       // Чорний - колізія
        };
        
        // Кольори для візуалізації
        this.TILE_COLORS = {
            [this.TILE_TYPES.ROAD]: 0x808080,      // Сірий
            [this.TILE_TYPES.SIDEWALK]: 0xffd700,  // Жовтий
            [this.TILE_TYPES.YARD]: 0x228b22,      // Зелений
            [this.TILE_TYPES.BUILDING]: 0x8b0000, // Червоний
            [this.TILE_TYPES.KIOSK]: 0x0000ff,     // Синій
            [this.TILE_TYPES.FENCE]: 0x000000      // Чорний
        };
        
        // Які тайли мають колізії
        this.COLLISION_TILES = [
            this.TILE_TYPES.BUILDING,
            this.TILE_TYPES.KIOSK,
            this.TILE_TYPES.FENCE
        ];
        
        // Створюємо дані карти (2D масив)
        this.mapData = [];
        
        // Система управління кіосками
        this.activeKiosks = []; // Масив активних кіосків { tileX, tileY, worldX, worldY, sprite, tileSprite }
        this.kioskSprites = []; // Масив спрайтів кіосків для візуалізації
        this.mapGraphics = null; // Графічний об'єкт для карти
        
        try {
            this.generateMap();
        } catch (error) {
            console.error('Помилка генерації карти:', error);
            throw error;
        }
        
        // Створюємо візуалізацію
        try {
            this.createVisualMap();
            this.createKioskSprites();
        } catch (error) {
            console.error('Помилка створення візуалізації:', error);
            throw error;
        }
    }
    
    generateMap() {
        // Ініціалізуємо всю карту як Yard (базовий тип)
        for (let y = 0; y < this.mapHeight; y++) {
            this.mapData[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                this.mapData[y][x] = this.TILE_TYPES.YARD;
            }
        }
        
        // Краї карти - огорожі
        for (let x = 0; x < this.mapWidth; x++) {
            this.mapData[0][x] = this.TILE_TYPES.FENCE;
            this.mapData[this.mapHeight - 1][x] = this.TILE_TYPES.FENCE;
        }
        for (let y = 0; y < this.mapHeight; y++) {
            this.mapData[y][0] = this.TILE_TYPES.FENCE;
            this.mapData[y][this.mapWidth - 1] = this.TILE_TYPES.FENCE;
        }
        
        // Генеруємо органічну структуру міста (схожу на Дніпро)
        this.generateOrganicStreets();
        this.generateSidewalks();
        this.generateBuildings();
        this.generateKiosks();
        this.generateParks();
    }
    
    generateOrganicStreets() {
        // Створюємо сітку доріг з кварталами (схоже на реальне місто)
        // Основні магістралі - 4 горизонтальні та 4 вертикальні
        const blockSize = 15; // Розмір кварталу в тайлах
        
        // Горизонтальні магістралі
        for (let i = 1; i < 4; i++) {
            const y = i * blockSize;
            for (let x = 0; x < this.mapWidth; x++) {
                // Додаємо легку кривину
                const offset = Math.sin(x * 0.05) * 1.5;
                const actualY = Math.floor(y + offset);
                
                // Ширина дороги 2-3 тайли
                for (let w = -1; w <= 1; w++) {
                    const roadY = actualY + w;
                    if (roadY >= 0 && roadY < this.mapHeight) {
                        this.mapData[roadY][x] = this.TILE_TYPES.ROAD;
                    }
                }
            }
        }
        
        // Вертикальні магістралі
        for (let i = 1; i < 4; i++) {
            const x = i * blockSize;
            for (let y = 0; y < this.mapHeight; y++) {
                // Додаємо легку кривину
                const offset = Math.sin(y * 0.05) * 1.5;
                const actualX = Math.floor(x + offset);
                
                // Ширина дороги 2-3 тайли
                for (let w = -1; w <= 1; w++) {
                    const roadX = actualX + w;
                    if (roadX >= 0 && roadX < this.mapWidth) {
                        this.mapData[y][roadX] = this.TILE_TYPES.ROAD;
                    }
                }
            }
        }
        
        // Другорядні вулиці всередині кварталів (менші, з більшою кривиною)
        for (let blockY = 0; blockY < this.mapHeight; blockY += blockSize) {
            for (let blockX = 0; blockX < this.mapWidth; blockX += blockSize) {
                // Додаємо вулиці всередині кварталу (не завжди)
                if (Math.random() > 0.6) {
                    const midY = blockY + Math.floor(blockSize / 2);
                    const midX = blockX + Math.floor(blockSize / 2);
                    
                    // Горизонтальна вулиця в кварталі
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
                    
                    // Вертикальна вулиця в кварталі
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
        // Генеруємо будівлі різних форм у кварталах
        const blockSize = 15;
        
        for (let blockY = 1; blockY < this.mapHeight - 1; blockY += blockSize) {
            for (let blockX = 1; blockX < this.mapWidth - 1; blockX += blockSize) {
                // Генеруємо будівлі в кожному кварталі
                this.generateBlockBuildings(blockX, blockY, blockSize);
            }
        }
    }
    
    generateBlockBuildings(blockX, blockY, blockSize) {
        const buildings = [];
        const maxBuildings = 3 + Math.floor(Math.random() * 3); // 3-5 будівель на квартал
        
        for (let i = 0; i < maxBuildings; i++) {
            // Випадкова позиція в кварталі
            let x = blockX + Math.floor(Math.random() * (blockSize - 4)) + 2;
            let y = blockY + Math.floor(Math.random() * (blockSize - 4)) + 2;
            
            // Перевіряємо межі
            if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) continue;
            
            // Перевіряємо чи не перетинається з дорогою або іншими будівлями
            if (this.mapData[y][x] === this.TILE_TYPES.ROAD || 
                this.mapData[y][x] === this.TILE_TYPES.SIDEWALK) continue;
            
            // Визначаємо форму будівлі
            const buildingType = Math.random();
            let width, height;
            
            if (buildingType < 0.3) {
                // Великі прямокутні будівлі
                width = 4 + Math.floor(Math.random() * 3); // 4-6
                height = 4 + Math.floor(Math.random() * 3); // 4-6
            } else if (buildingType < 0.6) {
                // Середні будівлі
                width = 3 + Math.floor(Math.random() * 2); // 3-4
                height = 3 + Math.floor(Math.random() * 2); // 3-4
            } else if (buildingType < 0.85) {
                // L-подібні будівлі
                width = 4 + Math.floor(Math.random() * 2); // 4-5
                height = 4 + Math.floor(Math.random() * 2); // 4-5
                this.placeLShapedBuilding(x, y, width, height);
                continue;
            } else {
                // Малі будівлі
                width = 2 + Math.floor(Math.random() * 2); // 2-3
                height = 2 + Math.floor(Math.random() * 2); // 2-3
            }
            
            // Перевіряємо чи можна розмістити
            if (this.canPlaceBuilding(x, y, width, height)) {
                this.placeBuilding(x, y, width, height);
            }
        }
    }
    
    placeLShapedBuilding(startX, startY, width, height) {
        // Створюємо L-подібну будівлю
        const leg1Width = Math.floor(width * 0.6);
        const leg1Height = height;
        const leg2Width = width;
        const leg2Height = Math.floor(height * 0.6);
        
        // Розміщуємо першу частину
        if (this.canPlaceBuilding(startX, startY, leg1Width, leg1Height)) {
            this.placeBuilding(startX, startY, leg1Width, leg1Height);
        }
        
        // Розміщуємо другу частину (перпендикулярно)
        const leg2X = startX;
        const leg2Y = startY + leg1Height;
        if (this.canPlaceBuilding(leg2X, leg2Y, leg2Width, leg2Height)) {
            this.placeBuilding(leg2X, leg2Y, leg2Width, leg2Height);
        }
    }
    
    canPlaceBuilding(startX, startY, width, height) {
        // Перевіряємо чи можна розмістити будівлю
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const x = startX + dx;
                const y = startY + dy;
                // Перевіряємо межі
                if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return false;
                // Перевіряємо тип тайла
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
        // Генеруємо рівно 5 кіосків на карті
        const kioskCount = GAME_CONFIG.KIOSKS.COUNT;
        const validPositions = [];
        
        // Збираємо всі валідні позиції для кіосків (біля доріг)
        for (let y = 2; y < this.mapHeight - 2; y++) {
            if (!this.mapData[y]) continue;
            
            for (let x = 2; x < this.mapWidth - 2; x++) {
                if (this.mapData[y][x] === undefined) continue;
                
                // Пропускаємо дороги та будівлі
                if (this.mapData[y][x] === this.TILE_TYPES.ROAD || 
                    this.mapData[y][x] === this.TILE_TYPES.BUILDING ||
                    this.mapData[y][x] === this.TILE_TYPES.FENCE) continue;
                
                // Перевіряємо чи є дорога поруч
                if (this.hasRoadNearby(x, y)) {
                    // Кіоски можуть бути на тротуарах або дворових зонах
                    if (this.mapData[y][x] === this.TILE_TYPES.SIDEWALK || 
                        this.mapData[y][x] === this.TILE_TYPES.YARD) {
                        validPositions.push({ x, y });
                    }
                }
            }
        }
        
        // Випадково вибираємо позиції для кіосків
        const shuffled = validPositions.sort(() => Math.random() - 0.5);
        const selectedPositions = shuffled.slice(0, Math.min(kioskCount, validPositions.length));
        
        // Розміщуємо кіоски
        for (const pos of selectedPositions) {
            this.mapData[pos.y][pos.x] = this.TILE_TYPES.KIOSK;
            const worldPos = this.tileToWorld(pos.x, pos.y);
            
            this.activeKiosks.push({
                tileX: pos.x,
                tileY: pos.y,
                worldX: worldPos.x,
                worldY: worldPos.y
            });
        }
    }
    
    createKioskSprites() {
        // Створюємо спрайти для кіосків
        for (const kiosk of this.activeKiosks) {
            // Створюємо спрайт кіоска
            const kioskColor = this.TILE_COLORS[this.TILE_TYPES.KIOSK]; // 0x0000ff - синій
            const sprite = this.scene.add.rectangle(
                kiosk.worldX,
                kiosk.worldY,
                this.tileSize,
                this.tileSize,
                kioskColor,
                1.0
            );
            sprite.setScrollFactor(1);
            sprite.setOrigin(0.5);
            sprite.setDepth(1); // Кіоски поверх тайлів карти (depth 0), але під гравцем (depth 10) та HUD (depth 200+)
            sprite.setVisible(true);
            kiosk.sprite = sprite;
            this.kioskSprites.push(sprite);
        }
    }
    
    updateTileVisual(tileX, tileY) {
        // Оновлюємо візуалізацію конкретного тайла
        // Створюємо окремий спрайт для тайла, щоб перекрити кіоск
        const tileType = this.mapData[tileY][tileX];
        const color = this.TILE_COLORS[tileType];
        const worldPos = this.tileToWorld(tileX, tileY);
        
        // Створюємо спрайт тайла поверх кіоска
        const tileSprite = this.scene.add.rectangle(
            worldPos.x,
            worldPos.y,
            this.tileSize,
            this.tileSize,
            color,
            0.9
        );
        tileSprite.setScrollFactor(1);
        tileSprite.setOrigin(0.5);
        tileSprite.setDepth(0); // Тайл під гравцем (depth 10) та кіосками (depth 1)
        
        return tileSprite;
    }
    
    removeKiosk(tileX, tileY) {
        // Видаляємо кіоск з карти
        const kioskIndex = this.activeKiosks.findIndex(
            k => k.tileX === tileX && k.tileY === tileY
        );
        
        if (kioskIndex !== -1) {
            const kiosk = this.activeKiosks[kioskIndex];
            
            // Видаляємо з mapData (повертаємо на попередній тип)
            // Визначаємо тип тайла до кіоска (тротуар або дворова зона)
            const neighbors = [
                { x: tileX - 1, y: tileY },
                { x: tileX + 1, y: tileY },
                { x: tileX, y: tileY - 1 },
                { x: tileX, y: tileY + 1 }
            ];
            
            let newTileType = this.TILE_TYPES.YARD; // За замовчуванням
            for (const neighbor of neighbors) {
                if (neighbor.x >= 0 && neighbor.x < this.mapWidth &&
                    neighbor.y >= 0 && neighbor.y < this.mapHeight) {
                    const tile = this.mapData[neighbor.y][neighbor.x];
                    if (tile === this.TILE_TYPES.SIDEWALK) {
                        newTileType = this.TILE_TYPES.SIDEWALK;
                        break;
                    }
                }
            }
            
            // Оновлюємо mapData
            this.mapData[tileY][tileX] = newTileType;
            
            // Спочатку видаляємо спрайт кіоска
            if (kiosk.sprite) {
                kiosk.sprite.destroy();
            }
            
            // Потім оновлюємо візуалізацію тайла (створюємо спрайт поверх)
            const tileSprite = this.updateTileVisual(tileX, tileY);
            if (tileSprite) {
                kiosk.tileSprite = tileSprite; // Зберігаємо для можливого видалення
            }
            
            // Видаляємо з масивів
            this.activeKiosks.splice(kioskIndex, 1);
            this.kioskSprites = this.kioskSprites.filter(s => s !== kiosk.sprite);
            
            return kiosk;
        }
        
        return null;
    }
    
    spawnKioskAtRandomPosition() {
        // Знаходимо випадкову валідну позицію для кіоска
        const validPositions = [];
        
        for (let y = 2; y < this.mapHeight - 2; y++) {
            if (!this.mapData[y]) continue;
            
            for (let x = 2; x < this.mapWidth - 2; x++) {
                if (this.mapData[y][x] === undefined) continue;
                
                // Пропускаємо дороги, будівлі, огорожі та інші кіоски
                if (this.mapData[y][x] === this.TILE_TYPES.ROAD || 
                    this.mapData[y][x] === this.TILE_TYPES.BUILDING ||
                    this.mapData[y][x] === this.TILE_TYPES.FENCE ||
                    this.mapData[y][x] === this.TILE_TYPES.KIOSK) continue;
                
                // Перевіряємо чи є дорога поруч
                if (this.hasRoadNearby(x, y)) {
                    if (this.mapData[y][x] === this.TILE_TYPES.SIDEWALK || 
                        this.mapData[y][x] === this.TILE_TYPES.YARD) {
                        validPositions.push({ x, y });
                    }
                }
            }
        }
        
        if (validPositions.length === 0) return null;
        
        // Випадково вибираємо позицію
        const randomPos = validPositions[Math.floor(Math.random() * validPositions.length)];
        
        // Розміщуємо кіоск
        this.mapData[randomPos.y][randomPos.x] = this.TILE_TYPES.KIOSK;
        const worldPos = this.tileToWorld(randomPos.x, randomPos.y);
        
        const kiosk = {
            tileX: randomPos.x,
            tileY: randomPos.y,
            worldX: worldPos.x,
            worldY: worldPos.y
        };
        
        // Створюємо спрайт кіоска
        const kioskColor = this.TILE_COLORS[this.TILE_TYPES.KIOSK]; // 0x0000ff - синій
        const sprite = this.scene.add.rectangle(
            kiosk.worldX,
            kiosk.worldY,
            this.tileSize,
            this.tileSize,
            kioskColor,
            1.0
        );
        sprite.setScrollFactor(1);
        sprite.setOrigin(0.5);
        sprite.setDepth(1); // Кіоски поверх тайлів карти (depth 0), але під гравцем (depth 10) та HUD (depth 200+)
        sprite.setVisible(true); // Переконаємося, що спрайт видимий
        
        kiosk.sprite = sprite;
        
        this.activeKiosks.push(kiosk);
        if (this.kioskSprites) {
            this.kioskSprites.push(sprite);
        }
        
        // Оновлюємо міні-карту якщо вона існує
        if (this.scene.minimap) {
            this.scene.minimap.refresh();
        }
        
        return kiosk;
    }
    
    getKioskAt(tileX, tileY) {
        // Отримуємо кіоск на заданій позиції
        return this.activeKiosks.find(
            k => k.tileX === tileX && k.tileY === tileY
        );
    }
    
    hasRoadNearby(x, y) {
        // Перевіряємо чи є дорога в радіусі 1 тайл
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue; // Пропускаємо поточну позицію
                
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
        // Перевіряємо чи позиція знаходиться в кварталі (між дорогами)
        // Шукаємо найближчу дорогу
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
        
        // Якщо далеко від доріг - це не квартал
        return minDistToRoad > 2 && minDistToRoad < 15;
    }
    
    placeBuilding(startX, startY, width, height) {
        // Розміщуємо будівлю
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const x = startX + dx;
                const y = startY + dy;
                // Перевіряємо межі
                if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
                    this.mapData[y][x] = this.TILE_TYPES.BUILDING;
                }
            }
        }
        
        // Додаємо дворові зони навколо будівлі (якщо є місце)
        for (let dy = -1; dy <= height; dy++) {
            for (let dx = -1; dx <= width; dx++) {
                const x = startX + dx;
                const y = startY + dy;
                
                // Тільки по периметру
                if ((dx === -1 || dx === width || dy === -1 || dy === height)) {
                    if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
                        if (this.mapData[y][x] === this.TILE_TYPES.YARD) {
                            // 30% шанс додати дворову зону
                            if (Math.random() < 0.3) {
                                // Залишаємо як YARD (зелений)
                            }
                        }
                    }
                }
            }
        }
    }
    
    generateParks() {
        // Генеруємо парки/зелені зони (як центральний парк на зображенні)
        const parkCount = 3 + Math.floor(Math.random() * 3); // 3-5 парків
        
        for (let i = 0; i < parkCount; i++) {
            const size = 8 + Math.floor(Math.random() * 6); // 8-13 тайлів
            const x = Math.floor(Math.random() * (this.mapWidth - size - 4)) + 2;
            const y = Math.floor(Math.random() * (this.mapHeight - size - 4)) + 2;
            
            // Перевіряємо чи можна розмістити парк
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
                // Розміщуємо парк (залишаємо як YARD - зелений)
                // Можна додати огорожу навколо
                for (let dy = -1; dy <= size; dy++) {
                    for (let dx = -1; dx <= size; dx++) {
                        const checkX = x + dx;
                        const checkY = y + dy;
                        if (checkX >= 0 && checkX < this.mapWidth &&
                            checkY >= 0 && checkY < this.mapHeight) {
                            // Огорожа навколо парку
                            if (dx === -1 || dx === size || dy === -1 || dy === size) {
                                if (this.mapData[checkY][checkX] === this.TILE_TYPES.YARD) {
                                    // Можна додати огорожу, але поки що залишаємо як є
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    generateSidewalks() {
        // Додаємо тротуари навколо доріг
        for (let y = 1; y < this.mapHeight - 1; y++) {
            // Перевіряємо чи рядок існує
            if (!this.mapData[y]) continue;
            
            for (let x = 1; x < this.mapWidth - 1; x++) {
                if (this.mapData[y][x] === this.TILE_TYPES.ROAD) {
                    // Перевіряємо сусідні тайли
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
                            // Якщо сусід - не дорога і не будівля, робимо тротуар
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
        // Перевіряємо чи scene існує
        if (!this.scene || !this.scene.add) {
            throw new Error('Scene не визначено або не має методу add');
        }
        
        // Оптимізована візуалізація: використовуємо один graphics об'єкт
        this.mapGraphics = this.scene.add.graphics();
        this.mapGraphics.setScrollFactor(1); // Слідує за камерою
        
        // Малюємо всі тайли одним проходом
        for (let y = 0; y < this.mapHeight; y++) {
            // Перевіряємо чи рядок існує
            if (!this.mapData[y]) {
                console.warn(`Рядок ${y} не існує в mapData`);
                continue;
            }
            
            for (let x = 0; x < this.mapWidth; x++) {
                const tileType = this.mapData[y][x];
                // Перевіряємо чи тип тайла валідний (0 є валідним кольором для FENCE)
                if (tileType === undefined || !(tileType in this.TILE_COLORS)) {
                    console.warn(`Невалідний тип тайла на позиції (${x}, ${y}): ${tileType}`);
                    continue;
                }
                
                const color = this.TILE_COLORS[tileType];
                const worldX = x * this.tileSize;
                const worldY = y * this.tileSize;
                
                // Пропускаємо кіоски - вони малюються окремо
                if (tileType === this.TILE_TYPES.KIOSK) continue;
                
                // Малюємо тайл
                this.mapGraphics.fillStyle(color, 0.9);
                this.mapGraphics.fillRect(worldX, worldY, this.tileSize, this.tileSize);
            }
        }
        
        // Додаємо сітку для кращої видимості
        this.mapGraphics.lineStyle(1, 0x333333, 0.3);
        
        for (let x = 0; x <= this.mapWidth; x++) {
            const worldX = x * this.tileSize;
            this.mapGraphics.moveTo(worldX, 0);
            this.mapGraphics.lineTo(worldX, this.worldHeight);
        }
        
        for (let y = 0; y <= this.mapHeight; y++) {
            const worldY = y * this.tileSize;
            this.mapGraphics.moveTo(0, worldY);
            this.mapGraphics.lineTo(this.worldWidth, worldY);
        }
        
        this.mapGraphics.strokePath();
    }
    
    // Перевірка чи тайл має колізію
    hasCollision(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        
        // Перевірка меж
        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
            return true; // За межами = колізія
        }
        
        const tileType = this.mapData[tileY][tileX];
        return this.COLLISION_TILES.includes(tileType);
    }
    
    // Перевірка чи позиція прохідна (для спавнера)
    isWalkable(worldX, worldY) {
        return !this.hasCollision(worldX, worldY);
    }
    
    // Отримати тип тайла
    getTileType(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        
        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
            return this.TILE_TYPES.FENCE; // За межами = огорожа
        }
        
        return this.mapData[tileY][tileX];
    }
    
    // Конвертація світових координат в тайл координати
    worldToTile(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.tileSize),
            y: Math.floor(worldY / this.tileSize)
        };
    }
    
    // Конвертація тайл координат в світові
    tileToWorld(tileX, tileY) {
        return {
            x: tileX * this.tileSize + this.tileSize / 2,
            y: tileY * this.tileSize + this.tileSize / 2
        };
    }
}

export default TilemapSystem;