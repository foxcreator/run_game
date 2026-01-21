import { GAME_CONFIG } from '../config/gameConfig.js';
class Minimap {
    constructor(scene, tilemap, player) {
        this.scene = scene;
        this.tilemap = tilemap;
        this.player = player;
        this.width = 200;
        this.height = 200;
        this.padding = 10;
        this.scaleX = this.width / GAME_CONFIG.WORLD.WIDTH;
        this.scaleY = this.height / GAME_CONFIG.WORLD.HEIGHT;
        this.x = 0;
        this.y = 0;
        this.create();
    }
    create() {
        const cameraWidth = this.scene.cameras.main.width;
        const cameraHeight = this.scene.cameras.main.height;
        this.x = cameraWidth - this.width - this.padding;
        this.y = cameraHeight - this.height - this.padding;
        try {
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
        }
        try {
            this.minimapGraphics = this.scene.add.graphics();
            this.minimapGraphics.setScrollFactor(0);
            this.minimapGraphics.setDepth(101);
        } catch (error) {
        }
        this.minimapImage = null;
        this.minimapTextureKey = 'minimap_preview';
        this.minimapCreated = false;
        this.kioskIndicators = [];
        this.drawMap();
        try {
            this.viewportIndicator = this.scene.add.graphics();
            this.viewportIndicator.setScrollFactor(0);
            this.viewportIndicator.setDepth(102);
        } catch (error) {
        }
        try {
            this.playerIndicator = this.scene.add.circle(0, 0, 3, 0x3498db);
            this.playerIndicator.setScrollFactor(0);
            this.playerIndicator.setDepth(103);
        } catch (error) {
        }
    }
    drawMap() {
        if (!this.minimapGraphics || !this.tilemap) {
            return;
        }
        this.minimapGraphics.clear();
        try {
            if (this.scene.textures.exists('map')) {
                if (!this.minimapCreated) {
                    const mapTexture = this.scene.textures.get('map');
                    const sourceImage = mapTexture.getSourceImage();
                    if (sourceImage) {
                        const minimapCanvas = document.createElement('canvas');
                        minimapCanvas.width = this.width;
                        minimapCanvas.height = this.height;
                        const ctx = minimapCanvas.getContext('2d');
                        ctx.drawImage(
                            sourceImage,
                            0, 0, sourceImage.width, sourceImage.height,
                            0, 0, this.width, this.height
                        );
                        if (this.scene.textures.exists(this.minimapTextureKey)) {
                            this.scene.textures.remove(this.minimapTextureKey);
                        }
                        this.scene.textures.addCanvas(this.minimapTextureKey, minimapCanvas);
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
                if (!this.tilemap.collisionMap) {
                    return;
                }
                for (let y = 0; y < this.tilemap.mapHeight; y++) {
                    if (!this.tilemap.collisionMap[y]) continue;
                    for (let x = 0; x < this.tilemap.mapWidth; x++) {
                        const hasCollision = this.tilemap.collisionMap[y][x];
                        if (hasCollision === undefined) continue;
                        const worldX = x * this.tilemap.tileSize;
                        const worldY = y * this.tilemap.tileSize;
                        const minimapX = this.x + worldX * this.scaleX;
                        const minimapY = this.y + worldY * this.scaleY;
                        const tileWidth = Math.max(1, this.tilemap.tileSize * this.scaleX);
                        const tileHeight = Math.max(1, this.tilemap.tileSize * this.scaleY);
                        if (minimapX + tileWidth >= this.x && minimapX < this.x + this.width &&
                            minimapY + tileHeight >= this.y && minimapY < this.y + this.height) {
                            const color = hasCollision ? 0x8b0000 : 0x90ee90;
                            this.minimapGraphics.fillStyle(color, 0.7);
                            this.minimapGraphics.fillRect(minimapX, minimapY, tileWidth, tileHeight);
                        }
                    }
                }
            }
            this.updateKioskIndicators();
        } catch (error) {
        }
    }
    update() {
        if (!this.player || !this.tilemap) return;
        const playerMinimapX = this.x + this.player.x * this.scaleX;
        const playerMinimapY = this.y + this.player.y * this.scaleY;
        this.playerIndicator.setPosition(playerMinimapX, playerMinimapY);
        this.viewportIndicator.clear();
        const camera = this.scene.cameras.main;
        const viewportWidth = camera.width * this.scaleX;
        const viewportHeight = camera.height * this.scaleY;
        const viewportX = this.x + camera.worldView.x * this.scaleX;
        const viewportY = this.y + camera.worldView.y * this.scaleY;
        this.viewportIndicator.lineStyle(2, 0xffff00, 1);
        this.viewportIndicator.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
        
        // Оновлюємо індикатор Money Multiplier пікапа
        this.updateMoneyMultiplierIndicator();
    }
    
    /**
     * Оновлює індикатор Money Multiplier пікапа на мінімапі
     */
    updateMoneyMultiplierIndicator() {
        // Видаляємо старий індикатор якщо є
        if (this.moneyMultiplierIndicator) {
            this.moneyMultiplierIndicator.destroy();
            this.moneyMultiplierIndicator = null;
        }
        
        // Перевіряємо чи є активний пікап
        if (this.scene.moneyMultiplierController) {
            const pickup = this.scene.moneyMultiplierController.getCurrentPickup();
            if (pickup && pickup.isActive) {
                const minimapX = this.x + pickup.x * this.scaleX;
                const minimapY = this.y + pickup.y * this.scaleY;
                
                // Створюємо індикатор (золота зірка що пульсує)
                this.moneyMultiplierIndicator = this.scene.add.circle(
                    minimapX,
                    minimapY,
                    8,
                    0xffd700,
                    1
                );
                this.moneyMultiplierIndicator.setScrollFactor(0);
                this.moneyMultiplierIndicator.setDepth(105);
                this.moneyMultiplierIndicator.setOrigin(0.5);
                
                // Анімація пульсації
                this.scene.tweens.add({
                    targets: this.moneyMultiplierIndicator,
                    scaleX: 1.5,
                    scaleY: 1.5,
                    alpha: 0.5,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        }
    }
    updateKioskIndicators() {
        for (const indicator of this.kioskIndicators) {
            if (indicator && indicator.active) {
                indicator.destroy();
            }
        }
        this.kioskIndicators = [];
        if (this.tilemap.activeKiosks && this.tilemap.activeKiosks.length > 0) {
            for (const kiosk of this.tilemap.activeKiosks) {
                if (!kiosk.sprite || !kiosk.sprite.active) continue;
                const minimapX = this.x + kiosk.worldX * this.scaleX;
                const minimapY = this.y + kiosk.worldY * this.scaleY;
                const kioskSize = Math.max(4, 10 * this.scaleX);
                if (minimapX >= this.x && minimapX < this.x + this.width &&
                    minimapY >= this.y && minimapY < this.y + this.height) {
                    const kioskIndicator = this.scene.add.circle(
                        minimapX,
                        minimapY,
                        kioskSize / 2,
                        0x0000ff,
                        0.9
                    );
                    kioskIndicator.setScrollFactor(0);
                    kioskIndicator.setDepth(104);
                    kioskIndicator.setOrigin(0.5);
                    kioskIndicator.kioskData = kiosk;
                    this.kioskIndicators.push(kioskIndicator);
                }
            }
        }
    }
    refresh() {
        this.drawMap();
        this.updateKioskIndicators();
    }
}
export default Minimap;