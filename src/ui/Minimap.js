// Minimap - міні-карта для навігації
import { GAME_CONFIG } from '../config/gameConfig.js';

class Minimap {
    constructor(scene, tilemap, player) {
        this.scene = scene;
        this.tilemap = tilemap;
        this.player = player;
        
        // Розміри міні-карти
        this.width = 200;
        this.height = 200;
        this.padding = 10;
        
        // Масштаб для відображення всієї карти
        this.scaleX = this.width / GAME_CONFIG.WORLD.WIDTH;
        this.scaleY = this.height / GAME_CONFIG.WORLD.HEIGHT;
        
        // Позиція буде обчислена в create() після того як камера буде готова
        this.x = 0;
        this.y = 0;
        
        this.create();
    }
    
    create() {
        // Обчислюємо позицію на основі розмірів камери (тепер камера вже готова)
        const cameraWidth = this.scene.cameras.main.width;
        const cameraHeight = this.scene.cameras.main.height;
        this.x = cameraWidth - this.width - this.padding;
        this.y = cameraHeight - this.height - this.padding;
        
        try {
            // Фон міні-карти
            const bgX = this.x + this.width / 2;
            const bgY = this.y + this.height / 2;
            this.background = this.scene.add.rectangle(
                bgX,
                bgY,
                this.width + 4,
                this.height + 4,
                0x000000,
                0.9
            );
            this.background.setScrollFactor(0);
            this.background.setDepth(100);
            this.background.setStrokeStyle(2, 0xffffff, 1);
        } catch (error) {
            console.error('Помилка створення фону міні-карти:', error);
        }
        
        // Графічний об'єкт для міні-карти
        try {
            this.minimapGraphics = this.scene.add.graphics();
            this.minimapGraphics.setScrollFactor(0);
            this.minimapGraphics.setDepth(101);
        } catch (error) {
            console.error('Помилка створення graphics:', error);
        }
        
        // Малюємо карту
        this.drawMap();
        
        // Виділення поточної області (квадрат)
        try {
            this.viewportIndicator = this.scene.add.graphics();
            this.viewportIndicator.setScrollFactor(0);
            this.viewportIndicator.setDepth(102);
        } catch (error) {
            console.error('Помилка створення viewport indicator:', error);
        }
        
        // Індикатор позиції гравця
        try {
            this.playerIndicator = this.scene.add.circle(0, 0, 3, 0x3498db);
            this.playerIndicator.setScrollFactor(0);
            this.playerIndicator.setDepth(103);
        } catch (error) {
            console.error('Помилка створення player indicator:', error);
        }
    }
    
    drawMap() {
        if (!this.minimapGraphics || !this.tilemap || !this.tilemap.mapData) {
            console.error('Міні-карта: не можу малювати - відсутні дані');
            return;
        }
        
        this.minimapGraphics.clear();
        let tilesDrawn = 0;
        
        try {
            // Малюємо всі тайли
            for (let y = 0; y < this.tilemap.mapHeight; y++) {
                if (!this.tilemap.mapData[y]) continue;
                
                for (let x = 0; x < this.tilemap.mapWidth; x++) {
                    const tileType = this.tilemap.mapData[y][x];
                    if (tileType === undefined) continue;
                    
                    // Перевіряємо чи колір існує (0 є валідним кольором для FENCE)
                    if (!(tileType in this.tilemap.TILE_COLORS)) continue;
                    const color = this.tilemap.TILE_COLORS[tileType];
                    
                    // Пропускаємо кіоски - вони малюються окремо
                    if (tileType === this.tilemap.TILE_TYPES.KIOSK) continue;
                    
                    // Координати на міні-карті (використовуємо світові координати)
                    const worldX = x * this.tilemap.tileSize;
                    const worldY = y * this.tilemap.tileSize;
                    const minimapX = this.x + worldX * this.scaleX;
                    const minimapY = this.y + worldY * this.scaleY;
                    const tileWidth = Math.max(1, this.tilemap.tileSize * this.scaleX); // Мінімум 1 піксель
                    const tileHeight = Math.max(1, this.tilemap.tileSize * this.scaleY);
                    
                    // Малюємо тайл (обрізаємо якщо виходить за межі)
                    if (minimapX + tileWidth >= this.x && minimapX < this.x + this.width &&
                        minimapY + tileHeight >= this.y && minimapY < this.y + this.height) {
                        this.minimapGraphics.fillStyle(color, 0.7);
                        this.minimapGraphics.fillRect(minimapX, minimapY, tileWidth, tileHeight);
                        tilesDrawn++;
                    }
                }
            }
            
            // Малюємо кіоски
            if (this.tilemap.activeKiosks && this.tilemap.activeKiosks.length > 0) {
                for (const kiosk of this.tilemap.activeKiosks) {
                    const minimapX = this.x + kiosk.worldX * this.scaleX;
                    const minimapY = this.y + kiosk.worldY * this.scaleY;
                    const tileWidth = Math.max(2, this.tilemap.tileSize * this.scaleX); // Кіоски трохи більші
                    const tileHeight = Math.max(2, this.tilemap.tileSize * this.scaleY);
                    
                    // Малюємо кіоск (обрізаємо якщо виходить за межі)
                    if (minimapX + tileWidth >= this.x && minimapX < this.x + this.width &&
                        minimapY + tileHeight >= this.y && minimapY < this.y + this.height) {
                        this.minimapGraphics.fillStyle(this.tilemap.TILE_COLORS[this.tilemap.TILE_TYPES.KIOSK], 0.9);
                        this.minimapGraphics.fillRect(minimapX, minimapY, tileWidth, tileHeight);
                    }
                }
            }
        } catch (error) {
            console.error('Помилка малювання міні-карти:', error);
        }
    }
    
    update() {
        if (!this.player || !this.tilemap) return;
        
        // Оновлюємо позицію індикатора гравця
        const playerMinimapX = this.x + this.player.x * this.scaleX;
        const playerMinimapY = this.y + this.player.y * this.scaleY;
        this.playerIndicator.setPosition(playerMinimapX, playerMinimapY);
        
        // Малюємо виділення поточної області (область камери)
        this.viewportIndicator.clear();
        const camera = this.scene.cameras.main;
        const viewportWidth = camera.width * this.scaleX;
        const viewportHeight = camera.height * this.scaleY;
        const viewportX = this.x + camera.worldView.x * this.scaleX;
        const viewportY = this.y + camera.worldView.y * this.scaleY;
        
        // Малюємо прямокутник виділення
        this.viewportIndicator.lineStyle(2, 0xffff00, 1);
        this.viewportIndicator.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
    }
    
    refresh() {
        // Оновлюємо карту (наприклад, коли з'являється новий кіоск)
        this.drawMap();
    }
}

export default Minimap;
