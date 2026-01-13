// ResultScene - сцена після програшу
import { createStyledButton, createTitleText, createSubtitleText } from '../utils/ButtonHelper.js';

class ResultScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ResultScene' });
    }

    init(data) {
        // Дані з GameScene
        this.score = data.score || 0;
        this.moneyEarned = data.moneyEarned || 0;
        this.timeSurvived = data.timeSurvived || 0;
    }

    create() {
        const { width, height } = this.cameras.main;

        // Фон
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Заголовок
        const title = createTitleText(this, width / 2, height / 2 - 220, 'GAME OVER', 64);
        title.setFill('#e74c3c');

        // Результати в картці
        const cardBg = this.add.rectangle(width / 2, height / 2 - 30, 400, 200, 0x2c3e50, 0.8)
            .setStrokeStyle(2, 0xffffff, 0.3);

        // Score
        createSubtitleText(this, width / 2, height / 2 - 80, `Score: ${this.score.toLocaleString()}`, 32);

        // Money
        createSubtitleText(this, width / 2, height / 2 - 30, `Money Earned: $${this.moneyEarned.toLocaleString()}`, 28);

        // Time
        createSubtitleText(this, width / 2, height / 2 + 20, `Time Survived: ${this.timeSurvived.toFixed(1)}s`, 28);

        // Кнопки
        const shopButton = createStyledButton(
            this,
            width / 2 - 140,
            height / 2 + 140,
            220,
            65,
            'SHOP',
            0x95a5a6,
            0x7f8c8d,
            () => {
                this.scene.start('ShopScene');
            }
        );

        const menuButton = createStyledButton(
            this,
            width / 2 + 140,
            height / 2 + 140,
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

export default ResultScene;