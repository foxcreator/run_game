import { GAME_CONFIG } from '../config/gameConfig.js';
import SaveSystem from '../systems/SaveSystem.js';

class ShopScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ShopScene' });
    }
    
    init() {
        // Ініціалізуємо SaveSystem
        this.saveSystem = new SaveSystem();
        this.bankedMoney = this.saveSystem.getBankedMoney();
        this.spinnerCount = this.saveSystem.getSpinnerCount();
    }
    
    create() {
        const { width, height } = this.cameras.main;
        const background = this.add.image(width / 2, height / 2, 'menu_background');
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
        const titleText = 'МАГАЗИН';
        const titleY = height * 0.15;
        const title = this.add.text(width / 2, titleY, titleText, {
            fontSize: '64px',
            fill: '#0057B7',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#FFD700',
            strokeThickness: 8
        }).setOrigin(0.5).setDepth(1);
        const menuBoxWidth = 600;
        const menuBoxHeight = 400;
        const menuBoxX = width / 2;
        const menuBoxY = height / 2;
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
        // Відображаємо баланс
        this.balanceText = this.add.text(width / 2, height * 0.25, `💰 Баланс: $${this.bankedMoney}`, {
            fontSize: '28px',
            fill: '#FFD700',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(3);
        
        // Відображаємо кількість вертушок
        this.spinnerCountText = this.add.text(width / 2, height * 0.32, `🌀 Вертушки: ${this.spinnerCount}`, {
            fontSize: '22px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(3);
        
        // Кнопка купівлі вертушки
        const spinnerPrice = GAME_CONFIG.SPINNER_BONUS.SHOP_PRICE;
        const buyButtonY = height / 2 - 20;
        
        const buyButton = this.createShopButton(
            menuBoxX,
            buyButtonY,
            400,
            70,
            `КУПИТИ ВЕРТУШКУ - $${spinnerPrice}`,
            () => {
                this.buySpinner();
            }
        );
        
        // Опис вертушки
        const descriptionText = this.add.text(width / 2, buyButtonY + 60, '🌀 Відкидає та заморожує всіх ворогів\nв радіусі на 4 секунди\n\nАктивація: клавіша E', {
            fontSize: '16px',
            fill: '#CCCCCC',
            fontFamily: 'Arial, sans-serif',
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5).setDepth(3);
        const menuButton = this.createMenuButton(
            menuBoxX,
            menuBoxY + 150,
            280,
            60,
            'НАЗАД',
            () => {
                this.scene.start('ResultScene', {
                    currentBankedMoney: this.bankedMoney,
                    moneyAddedThisGame: 0,
                    timeSurvived: 0
                });
            }
        );
        background.setDepth(0);
        title.setDepth(1);
        menuShadow.setDepth(2);
        menuBox.setDepth(2);
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
    
    createShopButton(x, y, width, height, text, callback) {
        const shadow = this.add.rectangle(x + 2, y + 2, width, height, 0x000000, 0.5).setDepth(3);
        const button = this.add.rectangle(x, y, width, height, 0x2ecc71, 0.95)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(3, 0x27ae60)
            .setDepth(4);
        const buttonText = this.add.text(x, y, text, {
            fontSize: '22px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(5);
        
        button.on('pointerover', () => {
            this.sound.play('menu_hover');
            button.setFillStyle(0x3ae374);
            button.setScale(1.02);
            shadow.setScale(1.02);
            buttonText.setScale(1.02);
        });
        
        button.on('pointerout', () => {
            button.setFillStyle(0x2ecc71);
            button.setScale(1);
            shadow.setScale(1);
            buttonText.setScale(1);
        });
        
        button.on('pointerdown', () => {
            this.sound.play('menu_choise');
            button.setScale(0.98);
            shadow.setScale(0.98);
            buttonText.setScale(0.98);
            this.time.delayedCall(50, () => {
                button.setScale(1);
                shadow.setScale(1);
                buttonText.setScale(1);
                if (callback) callback();
            });
        });
        
        button.shadow = shadow;
        button.text = buttonText;
        return button;
    }
    
    buySpinner() {
        const price = GAME_CONFIG.SPINNER_BONUS.SHOP_PRICE;
        
        // Перевіряємо чи вистачає грошей
        if (this.bankedMoney < price) {
            // Показуємо повідомлення про недостатньо грошей
            const errorText = this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height * 0.7,
                '❌ Недостатньо грошей!',
                {
                    fontSize: '24px',
                    fill: '#ff0000',
                    fontFamily: 'Arial, sans-serif',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 3
                }
            ).setOrigin(0.5).setDepth(10);
            
            // Анімація зникнення
            this.tweens.add({
                targets: errorText,
                alpha: 0,
                y: errorText.y - 50,
                duration: 2000,
                ease: 'Power2',
                onComplete: () => {
                    errorText.destroy();
                }
            });
            
            return;
        }
        
        // Віднімаємо гроші
        this.bankedMoney -= price;
        this.saveSystem.setBankedMoney(this.bankedMoney);
        
        // Додаємо вертушку
        this.spinnerCount++;
        this.saveSystem.addSpinnerCount(1);
        
        // Оновлюємо текст
        this.balanceText.setText(`💰 Баланс: $${this.bankedMoney}`);
        this.spinnerCountText.setText(`🌀 Вертушки: ${this.spinnerCount}`);
        
        // Показуємо повідомлення про успішну покупку
        const successText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height * 0.7,
            '✅ Вертушку куплено!',
            {
                fontSize: '28px',
                fill: '#00ff00',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(10);
        
        // Анімація зникнення
        this.tweens.add({
            targets: successText,
            alpha: 0,
            y: successText.y - 50,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                successText.destroy();
            }
        });
        
    }
}
export default ShopScene;