import { GAME_CONFIG } from '../config/gameConfig.js';
import SaveSystem from '../systems/SaveSystem.js';

class ShopScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ShopScene' });
    }

    init(data) {
        this.returnScene = data.returnScene || 'MenuScene';
        this.isOverlay = data.isOverlay || false;
    }

    create() {
        this.saveSystem = new SaveSystem();
        this.bankMoney = this.saveSystem.getBankedMoney();
        const { width, height } = this.cameras.main;

        // Background
        const bgAlpha = this.isOverlay ? 0.9 : 1;
        this.add.rectangle(0, 0, width, height, 0x1a1a1a, bgAlpha).setOrigin(0);

        // Header
        this.add.text(width / 2, 60, 'МАГАЗИН', {
            fontSize: '40px',
            fill: '#ffd700',
            fontFamily: 'Arial',
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.moneyText = this.add.text(width - 50, 50, `Банк: $${this.bankMoney}`, {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(1, 0.5);

        // Bonuses Grid
        const bonuses = Object.entries(GAME_CONFIG.BONUSES); // Array of [KEY, config]
        bonuses.sort((a, b) => a[1].PRICE - b[1].PRICE);

        const cols = 4;
        const cardWidth = 220;
        const paddingX = 250; // Distance between centers
        const paddingY = 270;

        // Calculate total grid layout width to center it
        const totalGridWidth = (cols - 1) * paddingX;
        const startX = (width - totalGridWidth) / 2;
        const startY = 200; // Starting Y Position

        bonuses.forEach(([key, bonus], index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * paddingX;
            const y = startY + row * paddingY;

            this.createProductCard(x, y, bonus, key);
        });

        // Close Button (Moved down)
        const closeY = height - 50;
        const closeBg = this.add.rectangle(width / 2, closeY, 200, 50, 0x444444)
            .setInteractive({ useHandCursor: true });
        closeBg.setStrokeStyle(2, 0x888888);

        const closeText = this.add.text(width / 2, closeY, 'НАЗАД [ESC]', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        const goBack = () => {
            if (this.returnScene === 'GameScene') {
                this.scene.stop();
                this.scene.resume('GameScene');
            } else {
                this.scene.start(this.returnScene);
            }
        };

        closeBg.on('pointerdown', goBack);
        closeBg.on('pointerover', () => closeBg.setFillStyle(0x666666));
        closeBg.on('pointerout', () => closeBg.setFillStyle(0x444444));

        // ESC Key handling
        this.input.keyboard.on('keydown-ESC', goBack);
    }

    createProductCard(x, y, bonus, bonusKey) {
        // ID adjustment: SaveSystem uses generic getter/setter. 
        // We'll use the 'bonusKey' (e.g. 'SPINNER', 'MAGNET') as the identifier for SaveSystem if possible,
        // OR we map it. My SaveSystem uses `bonusKey` (the type) passed to `getBonusCount(type)`.
        // So I should use `bonusKey` (e.g. 'SPINNER') for get/set.

        const bg = this.add.rectangle(x, y, 220, 250, 0x2a2a2a).setOrigin(0.5);
        bg.setStrokeStyle(2, 0x444444);

        // Icon
        // Assuming icons are loaded. If not, use placeholder logic or check key
        let iconKey = bonus.ICON;
        if (!this.textures.exists(iconKey)) {
            // Fallback
            iconKey = 'bonus_base'; // specific fallback if exists
        }

        const icon = this.add.image(x, y - 60, iconKey);
        icon.setDisplaySize(64, 64);

        // Name
        this.add.text(x, y - 10, bonus.NAME, {
            fontSize: '18px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Description
        this.add.text(x, y + 25, bonus.DESCRIPTION, {
            fontSize: '12px',
            fill: '#aaaaaa',
            align: 'center',
            wordWrap: { width: 200 }
        }).setOrigin(0.5);

        // Price
        this.add.text(x, y + 70, `$${bonus.PRICE}`, {
            fontSize: '20px',
            fill: '#ffd700',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Count
        let currentCount = this.saveSystem.getBonusCount(bonusKey);
        const countText = this.add.text(x + 80, y - 100, `${currentCount}`, {
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#555555',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5);

        // Buy Button
        const btnBg = this.add.rectangle(x, y + 100, 150, 30, 0x008800).setInteractive({ useHandCursor: true });
        const btnText = this.add.text(x, y + 100, 'КУПИТИ', { fontSize: '16px', fill: '#ffffff' }).setOrigin(0.5);

        btnBg.on('pointerdown', () => {
            const currentMoney = this.saveSystem.getBankedMoney();
            if (currentMoney >= bonus.PRICE) {
                this.saveSystem.setBankedMoney(currentMoney - bonus.PRICE);
                this.saveSystem.setBonusCount(bonusKey, this.saveSystem.getBonusCount(bonusKey) + 1);

                // Update UI
                this.bankMoney = this.saveSystem.getBankedMoney();
                this.moneyText.setText(`Банк: $${this.bankMoney}`);
                countText.setText(`${this.saveSystem.getBonusCount(bonusKey)}`);

                // Effect
                this.tweens.add({
                    targets: btnBg,
                    scale: 1.1,
                    duration: 50,
                    yoyo: true
                });
            } else {
                // Error shake
                this.cameras.main.shake(100, 0.005);
                btnBg.setFillStyle(0x880000);
                this.time.delayedCall(200, () => btnBg.setFillStyle(0x008800));

                // Show floating error text
                const errText = this.add.text(x, y + 100, 'Не вистачає грошей!', {
                    fontSize: '18px',
                    fill: '#ff0000',
                    fontFamily: 'Arial',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5).setDepth(100);

                this.tweens.add({
                    targets: errText,
                    y: y + 50,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => errText.destroy()
                });
            }
        });
    }
}
export default ShopScene;