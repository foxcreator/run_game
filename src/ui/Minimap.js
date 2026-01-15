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
        
        // Змінна для зображення міні-карти (якщо використовуємо текстуру)
        this.minimapImage = null;
        this.minimapTextureKey = 'minimap_preview';
        this.minimapCreated = false;
        
        // Масив спрайтів кіосків на міні-карті
        this.kioskIndicators = [];
        
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
        if (!this.minimapGraphics || !this.tilemap) {
            console.error('Міні-карта: не можу малювати - відсутні дані');
            return;
        }
        
        this.minimapGraphics.clear();
        
        try {
            // Перевіряємо чи є текстура карти для міні-карти
            if (this.scene.textures.exists('map')) {
                // Створюємо мініатюру тільки один раз
                if (!this.minimapCreated) {
                    const mapTexture = this.scene.textures.get('map');
                    const sourceImage = mapTexture.getSourceImage();
                    
                    if (sourceImage) {
                        // Створюємо мініатюру карти
                        const minimapCanvas = document.createElement('canvas');
                        minimapCanvas.width = this.width;
                        minimapCanvas.height = this.height;
                        const ctx = minimapCanvas.getContext('2d');
                        
                        // Малюємо масштабовану версію карти
                        ctx.drawImage(
                            sourceImage,
                            0, 0, sourceImage.width, sourceImage.height,
                            0, 0, this.width, this.height
                        );
                        
                        // Створюємо текстуру з мініатюри
                        if (this.scene.textures.exists(this.minimapTextureKey)) {
                            this.scene.textures.remove(this.minimapTextureKey);
                        }
                        this.scene.textures.addCanvas(this.minimapTextureKey, minimapCanvas);
                        
                        // Використовуємо Phaser Image для відображення мініатюри
                        if (this.minimapImage) {
                            this.minimapImage.destroy();
                        }
                        this.minimapImage = this.scene.add.image(
                            this.x + this.width / 2,
                            this.y + this.height / 2,
                            this.minimapTextureKey
                        );
                        this.minimapImage.setScrollFactor(0);
                        this.minimapImage.setDepth(101);
                        this.minimapImage.setOrigin(0.5);
                        
                        this.minimapCreated = true;
                    }
                }
            } else {
                // Fallback: малюємо на основі collision map
                if (!this.tilemap.collisionMap) {
                    console.warn('Міні-карта: немає даних для відображення');
                    return;
                }
                
                // Малюємо на основі collision map
                for (let y = 0; y < this.tilemap.mapHeight; y++) {
                    if (!this.tilemap.collisionMap[y]) continue;
                    
                    for (let x = 0; x < this.tilemap.mapWidth; x++) {
                        const hasCollision = this.tilemap.collisionMap[y][x];
                        if (hasCollision === undefined) continue;
                        
                        // Координати на міні-карті
                        const worldX = x * this.tilemap.tileSize;
                        const worldY = y * this.tilemap.tileSize;
                        const minimapX = this.x + worldX * this.scaleX;
                        const minimapY = this.y + worldY * this.scaleY;
                        const tileWidth = Math.max(1, this.tilemap.tileSize * this.scaleX);
                        const tileHeight = Math.max(1, this.tilemap.tileSize * this.scaleY);
                        
                        // Малюємо тайл (обрізаємо якщо виходить за межі)
                        if (minimapX + tileWidth >= this.x && minimapX < this.x + this.width &&
                            minimapY + tileHeight >= this.y && minimapY < this.y + this.height) {
                            // Непрохідні області - темно-червоні/сині
                            // Прохідні області - світло-зелені
                            const color = hasCollision ? 0x8b0000 : 0x90ee90;
                            this.minimapGraphics.fillStyle(color, 0.7);
                            this.minimapGraphics.fillRect(minimapX, minimapY, tileWidth, tileHeight);
                        }
                    }
                }
            }
            
            // Малюємо кіоски поверх карти (створюємо окремі спрайти)
            this.updateKioskIndicators();
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
    
    updateKioskIndicators() {
        // Видаляємо старі індикатори кіосків
        for (const indicator of this.kioskIndicators) {
            if (indicator && indicator.active) {
                indicator.destroy();
            }
        }
        this.kioskIndicators = [];
        
        // Створюємо нові індикатори для всіх активних кіосків
        if (this.tilemap.activeKiosks && this.tilemap.activeKiosks.length > 0) {
            for (const kiosk of this.tilemap.activeKiosks) {
                // Перевіряємо чи кіоск активний
                if (!kiosk.sprite || !kiosk.sprite.active) continue;
                
                const minimapX = this.x + kiosk.worldX * this.scaleX;
                const minimapY = this.y + kiosk.worldY * this.scaleY;
                const kioskSize = Math.max(4, 10 * this.scaleX); // Кіоски видимі на міні-карті
                
                // Перевіряємо чи кіоск в межах міні-карти
                if (minimapX >= this.x && minimapX < this.x + this.width &&
                    minimapY >= this.y && minimapY < this.y + this.height) {
                    // Створюємо спрайт для кіоска на міні-карті
                    const kioskIndicator = this.scene.add.circle(
                        minimapX,
                        minimapY,
                        kioskSize / 2,
                        0x0000ff, // Синій для кіосків
                        0.9
                    );
                    kioskIndicator.setScrollFactor(0);
                    kioskIndicator.setDepth(104); // Вище за мініатюру (101) та viewport (102) та гравця (103)
                    kioskIndicator.setOrigin(0.5);
                    
                    // Зберігаємо посилання на кіоск для оновлення
                    kioskIndicator.kioskData = kiosk;
                    
                    this.kioskIndicators.push(kioskIndicator);
                }
            }
        }
    }
    
    refresh() {
        // Оновлюємо карту (наприклад, коли з'являється новий кіоск)
        this.drawMap();
        // Оновлюємо індикатори кіосків
        this.updateKioskIndicators();
    }
}

export default Minimap;
