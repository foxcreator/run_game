// ShopScene - сцена магазину
import { GAME_CONFIG } from '../config/gameConfig.js';

class ShopScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ShopScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Фонове зображення (як у головного меню)
        const background = this.add.image(width / 2, height / 2, 'menu_background');
        const scaleX = width / background.width;
        const scaleY = height / background.height;
        const scale = Math.max(scaleX, scaleY);
        background.setScale(scale);

        // Версія гри (зверху зліва)
        this.add.text(10, 10, GAME_CONFIG.VERSION, {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            stroke: '#000000',
            strokeThickness: 3,
            alpha: 0.7
        }).setDepth(1000);

        // Заголовок "МАГАЗИН"
        const titleText = 'МАГАЗИН';
        const titleY = height * 0.15;
        const title = this.add.text(width / 2, titleY, titleText, {
            fontSize: '64px',
            fill: '#0057B7', // Синій колір
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#FFD700', // Жовтий контур
            strokeThickness: 8
        }).setOrigin(0.5).setDepth(1);

        // Центральне меню - сірий прямокутник
        const menuBoxWidth = 600;
        const menuBoxHeight = 400;
        const menuBoxX = width / 2;
        const menuBoxY = height / 2;
        
        // Тінь меню
        const menuShadow = this.add.rectangle(
            menuBoxX + 4, 
            menuBoxY + 4, 
            menuBoxWidth, 
            menuBoxHeight, 
            0x000000, 
            0.4
        ).setDepth(2);
        
        // Основний блок меню
        const menuBox = this.add.rectangle(
            menuBoxX, 
            menuBoxY, 
            menuBoxWidth, 
            menuBoxHeight, 
            0x808080, // Сірий колір
            0.9
        ).setStrokeStyle(3, 0x606060).setDepth(2); // Темно-сірий контур

        // Текст інформації
        const infoText = this.add.text(width / 2, height / 2 - 80, 'Магазин апгрейдів', {
            fontSize: '32px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(3);

        const descriptionText = this.add.text(width / 2, height / 2 + 20, 'Реалізація в наступних задачах\n\nТут будуть:\n• Підвищення стаміни\n• Покращення відновлення стаміни\n• Зменшення cooldown dash\n• Збільшення базової швидкості\n• Збільшення удачі', {
            fontSize: '18px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5).setDepth(3);

        // Кнопка "МЕНЮ"
        const menuButton = this.createMenuButton(
            menuBoxX,
            menuBoxY + 140,
            280,
            60,
            'МЕНЮ',
            () => {
                this.scene.start('MenuScene');
            }
        );

        // Встановлюємо правильний порядок відображення
        background.setDepth(0);
        title.setDepth(1);
        menuShadow.setDepth(2);
        menuBox.setDepth(2);
        menuButton.setDepth(3);
    }

    createMenuButton(x, y, width, height, text, callback) {
        // Тінь кнопки
        const shadow = this.add.rectangle(x + 2, y + 2, width, height, 0x000000, 0.5).setDepth(3);
        
        // Основний блок кнопки
        const button = this.add.rectangle(x, y, width, height, 0x606060, 0.95)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x404040)
            .setDepth(4);

        // Текст кнопки
        const buttonText = this.add.text(x, y, text, {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(5);

        // Hover ефект
        button.on('pointerover', () => {
            // Відтворюємо звук наведення
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
            // Відтворюємо звук кліку
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
}

export default ShopScene;
