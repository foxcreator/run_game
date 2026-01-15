// MenuScene - головне меню
import { createStyledButton, createTitleText } from '../utils/ButtonHelper.js';

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Фон з градієнтом (через прямокутник)
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Заголовок з тінню
        const title = createTitleText(this, width / 2, height / 2 - 180, 'BUSIFICATION RUN', 56);
        
        // Підзаголовок
        this.add.text(width / 2, height / 2 - 110, 'Endless Chase', {
            fontSize: '28px',
            fill: '#a0a0a0',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'italic'
        }).setOrigin(0.5);

        // Кнопка Start
        const startButton = createStyledButton(
            this,
            width / 2,
            height / 2 + 20,
            280,
            70,
            'START',
            0x3498db,
            0x2980b9,
            () => {
                try {
                    this.scene.start('GameScene');
                } catch (error) {
                    console.error('Помилка запуску GameScene:', error);
                    alert('Помилка запуску гри: ' + error.message);
                }
            }
        );

        // Кнопка Shop
        const shopButton = createStyledButton(
            this,
            width / 2,
            height / 2 + 120,
            280,
            70,
            'SHOP',
            0x95a5a6,
            0x7f8c8d,
            () => {
                this.scene.start('ShopScene');
            }
        );
    }
}

export default MenuScene;
