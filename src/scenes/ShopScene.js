// ShopScene - сцена магазину
import { createStyledButton, createTitleText } from '../utils/ButtonHelper.js';

class ShopScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ShopScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Фон
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Заголовок
        const title = createTitleText(this, width / 2, height / 2 - 200, 'SHOP', 64);
        title.setFill('#f39c12');

        // Картка для контенту
        const cardBg = this.add.rectangle(width / 2, height / 2 + 20, 500, 250, 0x2c3e50, 0.8)
            .setStrokeStyle(2, 0xffffff, 0.3);

        // Тимчасовий текст
        this.add.text(width / 2, height / 2 + 20, 'Магазин апгрейдів', {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 2 + 70, 'Реалізація в наступних задачах', {
            fontSize: '20px',
            fill: '#a0a0a0',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'italic'
        }).setOrigin(0.5);

        // Кнопка Menu
        const menuButton = createStyledButton(
            this,
            width / 2,
            height / 2 + 200,
            220,
            65,
            'MENU',
            0x3498db,
            0x2980b9,
            () => {
                this.scene.start('MenuScene');
            }
        );
    }
}

export default ShopScene;