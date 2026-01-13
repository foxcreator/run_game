// GameScene - основна сцена гри
import Player from '../entities/Player.js';
import HUD from '../ui/HUD.js';

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // Розміри світу (1км x 1км = 4000x4000 пікселів, масштаб 1px = 0.25м)
        this.worldWidth = 4000;
        this.worldHeight = 4000;
        
        // Встановлюємо межі світу для фізики
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Створюємо фон світу
        this.createWorldBackground();

        // Створюємо гравця в центрі світу
        this.player = new Player(this, this.worldWidth / 2, this.worldHeight / 2);
        
        // Налаштовуємо камеру для слідкування за гравцем
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1); // Плавне слідкування
        this.cameras.main.setDeadzone(100, 100); // Мертва зона для плавнішого руху
        
        // Створюємо HUD (залишаємо на фіксованій позиції екрану)
        this.hud = new HUD(this);
        this.hud.create(this.player);
    }
    
    createWorldBackground() {
        const gridSize = 80; // Розмір клітинки сітки
        const gridColor1 = 0x16213e; // Темніша зона
        const gridColor2 = 0x0f3460; // Світліша зона
        const gridLineColor = 0x2c3e50; // Колір ліній сітки
        
        // Створюємо сітку для всього світу
        for (let y = 0; y < this.worldHeight; y += gridSize) {
            for (let x = 0; x < this.worldWidth; x += gridSize) {
                const isEven = ((x / gridSize) + (y / gridSize)) % 2 === 0;
                const color = isEven ? gridColor1 : gridColor2;
                
                this.add.rectangle(x + gridSize / 2, y + gridSize / 2, gridSize, gridSize, color, 0.8)
                    .setOrigin(0.5)
                    .setScrollFactor(1); // Слідує за камерою
            }
        }
        
        // Додаємо лінії сітки
        const graphics = this.add.graphics();
        graphics.lineStyle(1, gridLineColor, 0.5);
        graphics.setScrollFactor(1);
        
        // Вертикальні лінії
        for (let x = 0; x <= this.worldWidth; x += gridSize) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, this.worldHeight);
        }
        
        // Горизонтальні лінії
        for (let y = 0; y <= this.worldHeight; y += gridSize) {
            graphics.moveTo(0, y);
            graphics.lineTo(this.worldWidth, y);
        }
        
        graphics.strokePath();
        
        // Додаємо обведення світу (межі)
        const borderGraphics = this.add.graphics();
        borderGraphics.lineStyle(8, 0xe74c3c, 1); // Червона рамка (товстіша для великого світу)
        borderGraphics.setScrollFactor(1);
        borderGraphics.strokeRect(0, 0, this.worldWidth, this.worldHeight);
    }
    
    update(time, delta) {
        // Оновлення гравця
        if (this.player) {
            this.player.update(time, delta);
        }
        
        // Оновлення HUD
        if (this.hud) {
            this.hud.update();
        }
    }
}

export default GameScene;