// GameScene - основна сцена гри
import { createSubtitleText } from '../utils/ButtonHelper.js';

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Фон
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Тимчасовий текст для тестування
        const cardBg = this.add.rectangle(width / 2, height / 2, 600, 300, 0x2c3e50, 0.8)
            .setStrokeStyle(2, 0xffffff, 0.3);

        createSubtitleText(this, width / 2, height / 2 - 60, 'GAME SCENE', 40);

        this.add.text(width / 2, height / 2, 'Натисніть SPACE для програшу\n(тимчасово для тестування)', {
            fontSize: '24px',
            fill: '#a0a0a0',
            fontFamily: 'Arial, sans-serif',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);

        // Тимчасовий тригер для переходу до ResultScene (для тестування)
        this.input.keyboard.once('keydown-SPACE', () => {
            // Передаємо дані про результат (тимчасово порожні)
            this.scene.start('ResultScene', {
                score: 0,
                moneyEarned: 0,
                timeSurvived: 0
            });
        });
    }
}

export default GameScene;