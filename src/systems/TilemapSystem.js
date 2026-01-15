// TilemapSystem - система tilemap для карти світу
import { GAME_CONFIG } from '../config/gameConfig.js';
import spriteManager from '../utils/SpriteManager.js';

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
        
        // Кольори для візуалізації (беремо з SpriteManager)
        this.TILE_COLORS = {
            [this.TILE_TYPES.ROAD]: spriteManager.getTileColor('ROAD'),
            [this.TILE_TYPES.SIDEWALK]: spriteManager.getTileColor('SIDEWALK'),
            [this.TILE_TYPES.YARD]: spriteManager.getTileColor('YARD'),
            [this.TILE_TYPES.BUILDING]: spriteManager.getTileColor('BUILDING'),
            [this.TILE_TYPES.KIOSK]: spriteManager.getTileColor('KIOSK'),
            [this.TILE_TYPES.FENCE]: spriteManager.getTileColor('FENCE')
        };
        
        // Які тайли мають колізії
        this.COLLISION_TILES = [
            this.TILE_TYPES.BUILDING,
            this.TILE_TYPES.KIOSK,
            this.TILE_TYPES.FENCE
        ];
        
        // Створюємо дані карти (2D масив) - тепер використовується для collision map
        this.mapData = [];
        
        // Collision map - 2D масив boolean (true = непрохідний)
        this.collisionMap = [];
        
        // Tile type map - 2D масив для зберігання типів тайлів (ROAD, SIDEWALK, etc.)
        this.tileTypeMap = [];
        
        // Система управління кіосками
        this.activeKiosks = []; // Масив активних кіосків { tileX, tileY, worldX, worldY, sprite, tileSprite }
        this.kioskSprites = []; // Масив спрайтів кіосків для візуалізації
        this.mapGraphics = null; // Графічний об'єкт для карти
        this.mapSprite = null; // Спрайт готової текстури карти
        
        try {
            this.loadCollisionMap();
        } catch (error) {
            console.error('Помилка завантаження collision map:', error);
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
    
    /**
     * Завантажує та аналізує collision_map для створення collision map
     * Червоне та сине = непрохідні області (будівлі та вода)
     */
    loadCollisionMap() {
        // Перевіряємо чи текстура завантажена
        if (!this.scene.textures.exists('collision_map')) {
            console.error('❌ Текстура collision_map не знайдена!');
            // Fallback: створюємо порожню collision map
            this.initializeEmptyCollisionMap();
            return;
        }
        
        
        // Отримуємо текстуру
        const texture = this.scene.textures.get('collision_map');
        const sourceImage = texture.getSourceImage();
        
        if (!sourceImage) {
            console.error('❌ Не вдалося отримати зображення з текстури collision_map');
            this.initializeEmptyCollisionMap();
            return;
        }
        
        // Створюємо Canvas для аналізу пікселів
        const canvas = document.createElement('canvas');
        canvas.width = sourceImage.width;
        canvas.height = sourceImage.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(sourceImage, 0, 0);
        
        // Ініціалізуємо collision map та tile type map
        this.collisionMap = [];
        this.tileTypeMap = [];
        
        // Масштабуємо collision map до розміру світу
        const scaleX = this.worldWidth / sourceImage.width;
        const scaleY = this.worldHeight / sourceImage.height;
        
        // Створюємо collision map з роздільною здатністю tileSize
        for (let tileY = 0; tileY < this.mapHeight; tileY++) {
            this.collisionMap[tileY] = [];
            for (let tileX = 0; tileX < this.mapWidth; tileX++) {
                // Конвертуємо координати тайла в координати на collision_map
                const worldX = tileX * this.tileSize + this.tileSize / 2;
                const worldY = tileY * this.tileSize + this.tileSize / 2;
                
                // Масштабуємо до розміру collision_map
                const mapX = Math.floor(worldX / scaleX);
                const mapY = Math.floor(worldY / scaleY);
                
                // Обмежуємо координати
                const clampedX = Phaser.Math.Clamp(mapX, 0, sourceImage.width - 1);
                const clampedY = Phaser.Math.Clamp(mapY, 0, sourceImage.height - 1);
                
                // Отримуємо піксель
                const imageData = ctx.getImageData(clampedX, clampedY, 1, 1);
                const r = imageData.data[0];
                const g = imageData.data[1];
                const b = imageData.data[2];
                
                // Визначаємо тип тайла та непрохідність
                // Червоне: переважає червоний канал (r значно більше за g та b)
                const isRed = r > 150 && r > g * 1.5 && r > b * 1.5 && g < 150 && b < 150;
                // Синє: переважає синій канал (b значно більше за r та g)
                const isBlue = b > 150 && b > r * 1.5 && b > g * 1.5 && r < 150 && g < 150;
                // Сіре: дорога (r, g, b приблизно рівні, середні значення)
                const isGray = Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30 && 
                               r > 100 && r < 200 && g > 100 && g < 200 && b > 100 && b < 200;
                // Жовте: тротуар (r та g високі, b низький)
                const isYellow = r > 200 && g > 200 && b < 100;
                
                // Зберігаємо тип тайла
                if (!this.tileTypeMap[tileY]) {
                    this.tileTypeMap[tileY] = [];
                }
                if (isGray) {
                    this.tileTypeMap[tileY][tileX] = this.TILE_TYPES.ROAD;
                } else if (isYellow) {
                    this.tileTypeMap[tileY][tileX] = this.TILE_TYPES.SIDEWALK;
                } else {
                    this.tileTypeMap[tileY][tileX] = this.TILE_TYPES.YARD;
                }
                
                // Непрохідні області
                this.collisionMap[tileY][tileX] = isRed || isBlue;
            }
        }
        
        // Краї карти - непрохідні
        for (let x = 0; x < this.mapWidth; x++) {
            this.collisionMap[0][x] = true;
            this.collisionMap[this.mapHeight - 1][x] = true;
        }
        for (let y = 0; y < this.mapHeight; y++) {
            this.collisionMap[y][0] = true;
            this.collisionMap[y][this.mapWidth - 1] = true;
        }
        
        
        // Генеруємо кіоски на прохідних областях
        this.generateKiosks();
    }
    
    /**
     * Ініціалізує порожню collision map (fallback)
     */
    initializeEmptyCollisionMap() {
        this.collisionMap = [];
        this.tileTypeMap = [];
        for (let y = 0; y < this.mapHeight; y++) {
            this.collisionMap[y] = [];
            this.tileTypeMap[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                // Краї непрохідні
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
        
        // Збираємо всі валідні позиції для кіосків (прохідні області)
        for (let y = 2; y < this.mapHeight - 2; y++) {
            if (!this.collisionMap[y]) continue;
            
            for (let x = 2; x < this.mapWidth - 2; x++) {
                if (this.collisionMap[y][x] === undefined) continue;
                
                // Пропускаємо непрохідні області
                if (this.collisionMap[y][x]) continue;
                
                // Перевіряємо чи є непрохідна область поруч (для реалістичності)
                const hasCollisionNearby = this.hasCollisionNearby(x, y, 2);
                
                // Кіоски можуть бути на прохідних областях, але не далеко від будівель/доріг
                if (hasCollisionNearby) {
                    validPositions.push({ x, y });
                }
            }
        }
        
        // Випадково вибираємо позиції для кіосків
        const shuffled = validPositions.sort(() => Math.random() - 0.5);
        const selectedPositions = shuffled.slice(0, Math.min(kioskCount, validPositions.length));
        
        // Розміщуємо кіоски
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
    
    /**
     * Перевіряє чи є непрохідна область поруч
     */
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
        // Створюємо спрайти для кіосків через SpriteManager
        for (const kiosk of this.activeKiosks) {
            const spriteConfig = spriteManager.TILE_SPRITES.KIOSK;
            let sprite;
            
            if (spriteConfig.type === 'texture') {
                // Використовуємо текстуру
                const textureKey = spriteConfig.value;
                
                if (!this.scene.textures.exists(textureKey)) {
                    console.error('❌ Текстура не знайдена:', textureKey);
                    console.error('Доступні текстури:', Object.keys(this.scene.textures.list));
                    // Fallback на колір якщо текстура не завантажена
                    sprite = this.scene.add.rectangle(
                        kiosk.worldX,
                        kiosk.worldY,
                        spriteConfig.width,
                        spriteConfig.height,
                        0x0000ff, // Синій колір як fallback
                        1.0
                    );
                } else {
                    sprite = this.scene.add.image(kiosk.worldX, kiosk.worldY, textureKey);
                    sprite.setDisplaySize(spriteConfig.width, spriteConfig.height);
                }
            } else {
                // Використовуємо колір
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
            sprite.setDepth(1); // Кіоски поверх тайлів карти (depth 0), але під гравцем (depth 10) та HUD (depth 200+)
            sprite.setVisible(true);
            kiosk.sprite = sprite;
            this.kioskSprites.push(sprite);
        }
    }
    
    updateTileVisual(tileX, tileY) {
        // Тепер не потрібно, оскільки використовуємо готову текстуру карти
        // Залишаємо для сумісності, але повертаємо null
        return null;
    }
    
    removeKiosk(tileX, tileY) {
        // Видаляємо кіоск з карти
        const kioskIndex = this.activeKiosks.findIndex(
            k => k.tileX === tileX && k.tileY === tileY
        );
        
        if (kioskIndex !== -1) {
            const kiosk = this.activeKiosks[kioskIndex];
            
            // Видаляємо спрайт кіоска
            if (kiosk.sprite) {
                kiosk.sprite.destroy();
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
            if (!this.collisionMap[y]) continue;
            
            for (let x = 2; x < this.mapWidth - 2; x++) {
                if (this.collisionMap[y][x] === undefined) continue;
                
                // Пропускаємо непрохідні області
                if (this.collisionMap[y][x]) continue;
                
                // Перевіряємо чи не зайнято іншим кіоском
                const hasKiosk = this.activeKiosks.some(k => k.tileX === x && k.tileY === y);
                if (hasKiosk) continue;
                
                // Перевіряємо чи є непрохідна область поруч
                if (this.hasCollisionNearby(x, y, 2)) {
                    validPositions.push({ x, y });
                }
            }
        }
        
        if (validPositions.length === 0) return null;
        
        // Випадково вибираємо позицію
        const randomPos = validPositions[Math.floor(Math.random() * validPositions.length)];
        const worldPos = this.tileToWorld(randomPos.x, randomPos.y);
        
        const kiosk = {
            tileX: randomPos.x,
            tileY: randomPos.y,
            worldX: worldPos.x,
            worldY: worldPos.y
        };
        
        // Створюємо спрайт кіоска через SpriteManager
        const spriteConfig = spriteManager.TILE_SPRITES.KIOSK;
        let sprite;
        
        if (spriteConfig.type === 'texture') {
            // Використовуємо текстуру
            // Перевіряємо чи текстура завантажена
            if (!this.scene.textures.exists(spriteConfig.value)) {
                console.error('Текстура не знайдена при респавні:', spriteConfig.value);
                // Fallback на колір якщо текстура не завантажена
                sprite = this.scene.add.rectangle(
                    kiosk.worldX,
                    kiosk.worldY,
                    spriteConfig.width,
                    spriteConfig.height,
                    0x0000ff, // Синій колір як fallback
                    1.0
                );
            } else {
                sprite = this.scene.add.image(kiosk.worldX, kiosk.worldY, spriteConfig.value);
                sprite.setDisplaySize(spriteConfig.width, spriteConfig.height);
            }
        } else {
            // Використовуємо колір
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
        
        // Масив для зберігання спрайтів тайлів з текстурами (тепер не використовується)
        this.tileSprites = [];
        
        // Для culling (рендеринг тільки видимих тайлів)
        this.camera = this.scene.cameras.main;
        
        // Флаг для оптимізації оновлення видимості (не кожен кадр)
        this.lastVisibilityUpdate = 0;
        this.visibilityUpdateInterval = 100; // Оновлюємо кожні 100мс
        
        // Перевіряємо чи текстура карти завантажена
        if (!this.scene.textures.exists('map')) {
            console.error('❌ Текстура map не знайдена! Використовується fallback.');
            // Fallback: створюємо простий graphics об'єкт
            this.mapGraphics = this.scene.add.graphics();
            this.mapGraphics.setScrollFactor(1);
            this.mapGraphics.fillStyle(0x90EE90, 1.0); // Зелений колір
            this.mapGraphics.fillRect(0, 0, this.worldWidth, this.worldHeight);
            return;
        }
        
        // Відображаємо готову текстуру карти
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
    
    /**
     * Створює один великий Canvas Texture для всіх тайлів з текстурою одного типу
     * Це значно оптимізує продуктивність замість тисяч окремих спрайтів
     */
    createCanvasTextureForTiles(textureKey, positions) {
        if (positions.length === 0) return;
        
        // Знаходимо межі всіх тайлів (координати вже початкові, не центри)
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
        
        // Створюємо Canvas
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');
        
        // Отримуємо текстуру
        const sourceTexture = this.scene.textures.get(textureKey);
        if (!sourceTexture) {
            console.warn('Текстура не знайдена для Canvas:', textureKey);
            return;
        }
        
        const sourceImage = sourceTexture.getSourceImage();
        if (!sourceImage) {
            console.warn('Зображення текстури не знайдено:', textureKey);
            return;
        }
        
        // Малюємо всі тайли на Canvas без проміжків
        // Використовуємо imageSmoothingEnabled = false для чітких піксельних тайлів
        ctx.imageSmoothingEnabled = false;
        
        // Малюємо тайли точно один до одного без проміжків
        for (const pos of positions) {
            // Використовуємо точні координати без округлення
            const drawX = pos.x - minX;
            const drawY = pos.y - minY;
            
            // Малюємо тайл точно по координатах, але з невеликим перекриттям
            // для заповнення можливих проміжків через округлення при рендерингу
            ctx.drawImage(
                sourceImage,
                0, 0, sourceImage.width, sourceImage.height,
                drawX - 0.5, drawY - 0.5, pos.width + 1, pos.height + 1
            );
        }
        
        // Створюємо Phaser Texture з Canvas
        const canvasTextureKey = `canvas-${textureKey}`;
        if (this.scene.textures.exists(canvasTextureKey)) {
            this.scene.textures.remove(canvasTextureKey);
        }
        
        this.scene.textures.addCanvas(canvasTextureKey, canvas);
        
        // Створюємо один спрайт з великим Canvas Texture
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
    
    // Перевірка чи тайл має колізію
    hasCollision(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        
        // Перевірка меж
        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
            return true; // За межами = колізія
        }
        
        // Використовуємо collision map
        if (this.collisionMap && this.collisionMap[tileY] && this.collisionMap[tileY][tileX] !== undefined) {
            return this.collisionMap[tileY][tileX];
        }
        
        // Fallback: перевіряємо старий mapData
        if (this.mapData && this.mapData[tileY] && this.mapData[tileY][tileX] !== undefined) {
            const tileType = this.mapData[tileY][tileX];
            return this.COLLISION_TILES.includes(tileType);
        }
        
        // Якщо немає даних - вважаємо прохідним
        return false;
    }
    
    // Перевірка чи позиція прохідна (для спавнера)
    isWalkable(worldX, worldY) {
        return !this.hasCollision(worldX, worldY);
    }
    
    // Перевірка чи тайл є дорогою або тротуаром
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
    
    // Перевірка чи тайл є дорогою (тільки сірий, без тротуарів)
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
    
    // Перевірка чи область (кілька тайлів) є дорогою або тротуаром
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
    
    // Отримати тип тайла
    getTileType(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        
        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
            return this.TILE_TYPES.FENCE; // За межами = огорожа
        }
        
        // Використовуємо collision map для визначення типу
        if (this.collisionMap && this.collisionMap[tileY] && this.collisionMap[tileY][tileX]) {
            return this.TILE_TYPES.BUILDING; // Непрохідна область = будівля
        }
        
        // Fallback: перевіряємо старий mapData
        if (this.mapData && this.mapData[tileY] && this.mapData[tileY][tileX] !== undefined) {
            return this.mapData[tileY][tileX];
        }
        
        // За замовчуванням - прохідна область
        return this.TILE_TYPES.YARD;
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
    
    /**
     * Визначає напрямок дороги в заданій позиції
     * Повертає: 'horizontal', 'vertical', 'intersection', або null
     */
    getRoadDirection(worldX, worldY) {
        const tile = this.worldToTile(worldX, worldY);
        
        if (tile.x < 0 || tile.x >= this.mapWidth || tile.y < 0 || tile.y >= this.mapHeight) {
            return null;
        }
        
        // Перевіряємо чи це дорога
        if (!this.isRoad(worldX, worldY)) {
            return null;
        }
        
        // Перевіряємо сусідні тайли для визначення напрямку
        const checkDistance = 2; // Перевіряємо 2 тайли в кожну сторону
        let hasRoadLeft = false;
        let hasRoadRight = false;
        let hasRoadUp = false;
        let hasRoadDown = false;
        
        // Перевіряємо горизонтальний напрямок
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
        
        // Перевіряємо вертикальний напрямок
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
        
        // Якщо є і горизонтальна і вертикальна дорога - це перехрестя
        if (hasHorizontal && hasVertical) {
            return 'intersection';
        }
        
        // Якщо тільки горизонтальна - горизонтальна дорога
        if (hasHorizontal && !hasVertical) {
            return 'horizontal';
        }
        
        // Якщо тільки вертикальна - вертикальна дорога
        if (hasVertical && !hasHorizontal) {
            return 'vertical';
        }
        
        // Якщо немає сусідніх доріг - невизначено
        return null;
    }
    
    /**
     * Отримує напрямок руху з collision map за кольором пікселя
     * #000000 (чорний) = right
     * #FFFFFF (білий) = left
     * #EF3EDA (рожевий) = up
     * #4998F5 (блакитний) = down
     * Повертає null якщо напрямок не визначено
     */
    getDirectionFromCollisionMap(worldX, worldY) {
        if (!this.scene || !this.scene.textures.exists('collision_map')) {
            return null;
        }
        
        const texture = this.scene.textures.get('collision_map');
        const sourceImage = texture.getSourceImage();
        
        if (!sourceImage) {
            return null;
        }
        
        // Масштабуємо координати
        const scaleX = sourceImage.width / this.worldWidth;
        const scaleY = sourceImage.height / this.worldHeight;
        
        const mapX = Math.floor(worldX * scaleX);
        const mapY = Math.floor(worldY * scaleY);
        
        // Обмежуємо межі
        const clampedX = Phaser.Math.Clamp(mapX, 0, sourceImage.width - 1);
        const clampedY = Phaser.Math.Clamp(mapY, 0, sourceImage.height - 1);
        
        // Читаємо піксель
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(sourceImage, clampedX, clampedY, 1, 1, 0, 0, 1, 1);
        const imageData = ctx.getImageData(0, 0, 1, 1);
        const r = imageData.data[0];
        const g = imageData.data[1];
        const b = imageData.data[2];
        
        // Визначаємо напрямок за точними кольорами
        // #000000 (чорний) = right - r, g, b всі 0 або близькі до 0
        if (r < 30 && g < 30 && b < 30) {
            return 'right';
        }
        
        // #FFFFFF (білий) = left - r, g, b всі 255 або близькі до 255
        if (r > 240 && g > 240 && b > 240) {
            return 'left';
        }
        
        // #EF3EDA (рожевий) = up
        // EF = 239, 3E = 62, DA = 218
        // r ≈ 239, g ≈ 62, b ≈ 218
        if (r > 200 && r < 255 && g > 40 && g < 100 && b > 180 && b < 255) {
            return 'up';
        }
        
        // #4998F5 (блакитний) = down
        // 49 = 73, 98 = 152, F5 = 245
        // r ≈ 73, g ≈ 152, b ≈ 245
        if (r > 50 && r < 100 && g > 120 && g < 180 && b > 220 && b < 255) {
            return 'down';
        }
        
        // Якщо не визначено - повертаємо null
        return null;
    }
    
    /**
     * Оновлення видимості спрайтів (culling)
     * Приховує спрайти, які не видимі в viewport камери
     * Оптимізовано: оновлюється не кожен кадр, а з інтервалом
     */
    updateVisibility(time) {
        if (!this.camera || !this.tileSprites) return;
        
        // Оптимізація: оновлюємо не кожен кадр
        if (time && time - this.lastVisibilityUpdate < this.visibilityUpdateInterval) {
            return;
        }
        this.lastVisibilityUpdate = time || 0;
        
        const viewport = this.camera.worldView;
        const margin = 200; // Margin для плавності (більший для Canvas Texture)
        
        for (const sprite of this.tileSprites) {
            if (!sprite || !sprite.active) continue;
            
            // Для Canvas Texture спрайтів перевіряємо чи перетинаються з viewport
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