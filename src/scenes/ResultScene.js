import { GAME_CONFIG } from '../config/gameConfig.js';
class ResultScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ResultScene' });
    }
    init(data) {
        this.currentBankedMoney = data.currentBankedMoney || 0;
        this.moneyAddedThisGame = data.moneyAddedThisGame || 0;
        this.timeSurvived = data.timeSurvived || 0;
        this.survivalBonus = data.survivalBonus || 0;
        this.gameoverMusic = null;
    }
    create() {
        const { width, height } = this.cameras.main;
        if (this.sound.get('gameover')) {
            this.gameoverMusic = this.sound.get('gameover');
        } else {
            this.gameoverMusic = this.sound.add('gameover', {
                volume: 0.5,
                loop: false
            });
        }
        this.gameoverMusic.play();
        this.events.once('shutdown', this.shutdown, this);
        const background = this.add.image(width / 2, height / 2, 'gameover_background');
        const scaleX = width / background.width;
        const scaleY = height / background.height;
        const scale = Math.max(scaleX, scaleY);
        background.setScale(scale);
        this.add.text(10, 10, GAME_CONFIG.VERSION, {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            stroke: '#000000',
            strokeThickness: 3,
            alpha: 0.7
        }).setDepth(1000);
        const menuBoxWidth = 550;
        const menuBoxHeight = 380;
        const menuBoxX = width / 2;
        const menuBoxY = height * 0.65;
        const menuShadow = this.add.rectangle(
            menuBoxX + 4,
            menuBoxY + 4,
            menuBoxWidth,
            menuBoxHeight,
            0x000000,
            0.4
        ).setDepth(2);
        const menuBox = this.add.rectangle(
            menuBoxX,
            menuBoxY,
            menuBoxWidth,
            menuBoxHeight,
            0x808080,
            0.9
        ).setStrokeStyle(3, 0x606060).setDepth(2);
        const resultsY = menuBoxY - 130;
        const lineSpacing = 60;
        let timeFormatted = '';
        const totalSeconds = Math.floor(this.timeSurvived);
        if (totalSeconds >= 60) {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            timeFormatted = `${minutes} хв ${seconds} сек`;
        } else {
            timeFormatted = `${totalSeconds} сек`;
        }
        const moneyText = this.add.text(
            menuBoxX,
            resultsY,
            `БАНК: $${this.currentBankedMoney.toLocaleString()}`,
            {
                fontSize: '28px',
                fill: '#FFD700',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(3);
        const moneyAddedText = this.add.text(
            menuBoxX,
            resultsY + lineSpacing,
            `+ $${this.moneyAddedThisGame.toLocaleString()}`,
            {
                fontSize: '24px',
                fill: '#90EE90',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(3);
        if (this.survivalBonus > 0) {
            const bonusText = this.add.text(
                menuBoxX,
                resultsY + lineSpacing * 2,
                `🎁 Бонус за виживання: +$${this.survivalBonus}`,
                {
                    fontSize: '20px',
                    fill: '#FFD700',
                    fontFamily: 'Arial, sans-serif',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 2
                }
            ).setOrigin(0.5).setDepth(3);
        }
        const timeText = this.add.text(
            menuBoxX,
            resultsY + lineSpacing * (this.survivalBonus > 0 ? 3 : 2),
            `ЧАС ВИЖИВАННЯ: ${timeFormatted}`,
            {
                fontSize: '28px',
                fill: '#FFFFFF',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(3);
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonSpacing = 110;
        const topButtonY = menuBoxY + 60;
        const bottomButtonY = menuBoxY + 130;
        const wideButtonWidth = 420;
        const playAgainButton = this.createMenuButton(
            menuBoxX,
            topButtonY,
            wideButtonWidth,
            buttonHeight,
            'ГРАТИ ЗАНОВО',
            () => {
                this.stopGameoverMusic();
                this.scene.start('GameScene');
            }
        );
        const shopButton = this.createMenuButton(
            menuBoxX - buttonSpacing,
            bottomButtonY,
            buttonWidth,
            buttonHeight,
            'МАГАЗИН',
            () => {
                this.stopGameoverMusic();
                this.scene.start('ShopScene');
            }
        );
        const menuButton = this.createMenuButton(
            menuBoxX + buttonSpacing,
            bottomButtonY,
            buttonWidth,
            buttonHeight,
            'МЕНЮ',
            () => {
                this.stopGameoverMusic();
                this.scene.start('MenuScene');
            }
        );
        background.setDepth(0);
        menuShadow.setDepth(2);
        menuBox.setDepth(2);
        playAgainButton.setDepth(3);
        shopButton.setDepth(3);
        menuButton.setDepth(3);
    }
    createMenuButton(x, y, width, height, text, callback) {
        const shadow = this.add.rectangle(x + 2, y + 2, width, height, 0x000000, 0.5).setDepth(3);
        const button = this.add.rectangle(x, y, width, height, 0x606060, 0.95)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x404040)
            .setDepth(4);
        const buttonText = this.add.text(x, y, text, {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(5);
        button.on('pointerover', () => {
            this.sound.play('menu_hover');
            button.setFillStyle(0x707070);
            button.setScale(1.02);
            shadow.setScale(1.02);
            buttonText.setScale(1.02);
            this.tweens.add({
                targets: [button, shadow, buttonText],
                scaleX: 1.02,
                scaleY: 1.02,
                duration: 100,
                ease: 'Power2'
            });
        });
        button.on('pointerout', () => {
            button.setFillStyle(0x606060);
            button.setScale(1);
            shadow.setScale(1);
            buttonText.setScale(1);
            this.tweens.add({
                targets: [button, shadow, buttonText],
                scaleX: 1,
                scaleY: 1,
                duration: 100,
                ease: 'Power2'
            });
        });
        button.on('pointerdown', () => {
            this.sound.play('menu_choise');
            button.setScale(0.98);
            shadow.setScale(0.98);
            buttonText.setScale(0.98);
            this.tweens.add({
                targets: [button, shadow, buttonText],
                scaleX: 0.98,
                scaleY: 0.98,
                duration: 50,
                ease: 'Power2',
                onComplete: () => {
                    button.setScale(1);
                    shadow.setScale(1);
                    buttonText.setScale(1);
                    if (callback) callback();
                }
            });
        });
        button.shadow = shadow;
        button.text = buttonText;
        return button;
    }
    stopGameoverMusic() {
        if (this.gameoverMusic) {
            this.gameoverMusic.stop();
        }
    }
    shutdown() {
        this.stopGameoverMusic();
    }
}
export default ResultScene;