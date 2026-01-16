// MenuScene - головне меню
import { createStyledButton } from '../utils/ButtonHelper.js';

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Фонове зображення (на всю екран)
        const background = this.add.image(width / 2, height / 2, 'menu_background');
        // Масштабуємо щоб покрити весь екран
        const scaleX = width / background.width;
        const scaleY = height / background.height;
        const scale = Math.max(scaleX, scaleY);
        background.setScale(scale);

        // Центральне меню - сірий прямокутник (розташовано нижче, щоб не перекривати назву на зображенні)
        const menuBoxWidth = 400;
        const menuBoxHeight = 320;
        const menuBoxX = width / 2;
        const menuBoxY = height * 0.65; // 65% від верху (нижче, щоб не перекривати назву)
        
        // Тінь меню
        const menuShadow = this.add.rectangle(
            menuBoxX + 4, 
            menuBoxY + 4, 
            menuBoxWidth, 
            menuBoxHeight, 
            0x000000, 
            0.4
        );
        
        // Основний блок меню
        const menuBox = this.add.rectangle(
            menuBoxX, 
            menuBoxY, 
            menuBoxWidth, 
            menuBoxHeight, 
            0x808080, // Сірий колір
            0.9
        ).setStrokeStyle(3, 0x606060); // Темно-сірий контур

        // Кнопки меню (вертикально)
        const buttonWidth = 320;
        const buttonHeight = 60;
        const buttonSpacing = 15;
        const startY = menuBoxY - 120; // Починаємо з верху меню

        // Кнопка "ГРАТИ"
        const playButton = this.createMenuButton(
            menuBoxX, 
            startY, 
            buttonWidth, 
            buttonHeight, 
            'ГРАТИ',
            () => {
                try {
                    this.scene.start('GameScene');
                } catch (error) {
                    console.error('Помилка запуску GameScene:', error);
                    alert('Помилка запуску гри: ' + error.message);
                }
            }
        );

        // Кнопка "НАЛАШТУВАННЯ"
        const settingsButton = this.createMenuButton(
            menuBoxX, 
            startY + buttonHeight + buttonSpacing, 
            buttonWidth, 
            buttonHeight, 
            'НАЛАШТУВАННЯ',
            () => {
                // Просте меню налаштувань (тимчасово через alert)
                const settingsMenu = this.createSettingsMenu();
            }
        );

        // Кнопка "ПРО ГРУ"
        const aboutButton = this.createMenuButton(
            menuBoxX, 
            startY + (buttonHeight + buttonSpacing) * 2, 
            buttonWidth, 
            buttonHeight, 
            'ПРО ГРУ',
            () => {
                // Показуємо інформацію про гру
                this.showAboutInfo();
            }
        );

        // Кнопка "ДОНАТ НА ЗСУ"
        const donateButton = this.createMenuButton(
            menuBoxX, 
            startY + (buttonHeight + buttonSpacing) * 3, 
            buttonWidth, 
            buttonHeight, 
            'ДОНАТ НА ЗСУ',
            () => {
                // TODO: Реалізувати функціонал донату
                console.log('Донат на ЗСУ - в розробці');
                // Тимчасово відкриваємо посилання
                window.open('https://bank.gov.ua/ua/about/support-the-armed-forces', '_blank');
            }
        );

        // Встановлюємо правильний порядок відображення
        background.setDepth(0);
        menuShadow.setDepth(2);
        menuBox.setDepth(2);
        playButton.setDepth(3);
        settingsButton.setDepth(3);
        aboutButton.setDepth(3);
        donateButton.setDepth(3);
    }

    createMenuButton(x, y, width, height, text, callback) {
        // Тінь кнопки
        const shadow = this.add.rectangle(x + 2, y + 2, width, height, 0x000000, 0.5);
        
        // Основний блок кнопки
        const button = this.add.rectangle(x, y, width, height, 0x606060, 0.95) // Темно-сірий
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x404040); // Ще темніший контур

        // Текст кнопки
        const buttonText = this.add.text(x, y, text, {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Встановлюємо правильну глибину - текст має бути над кнопкою
        shadow.setDepth(3);
        button.setDepth(4);
        buttonText.setDepth(5);

        // Hover ефект - включаємо текст в анімацію
        button.on('pointerover', () => {
            button.setFillStyle(0x707070); // Світліший сірий
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
            button.setFillStyle(0x606060); // Повертаємо темно-сірий
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

        // Зберігаємо посилання для управління глибиною
        button.shadow = shadow;
        button.text = buttonText;

        return button;
    }

    createSettingsMenu() {
        const { width, height } = this.cameras.main;
        
        // Створюємо затемнений фон
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setDepth(100)
            .setInteractive();

        // Вікно налаштувань - сірий прямокутник в стилі меню
        const settingsWidth = 550;
        const settingsHeight = 420;
        const settingsBoxX = width / 2;
        const settingsBoxY = height / 2;
        
        // Тінь вікна
        const settingsShadow = this.add.rectangle(
            settingsBoxX + 4, 
            settingsBoxY + 4, 
            settingsWidth, 
            settingsHeight, 
            0x000000, 
            0.5
        ).setDepth(101);

        const settingsBox = this.add.rectangle(
            settingsBoxX, 
            settingsBoxY, 
            settingsWidth, 
            settingsHeight, 
            0x808080, 
            0.95
        )
        .setDepth(101)
        .setStrokeStyle(3, 0x606060);

        // Заголовок
        const title = this.add.text(settingsBoxX, settingsBoxY - 150, 'НАЛАШТУВАННЯ', {
            fontSize: '42px',
            fill: '#0057B7',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#FFD700',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(102);

        // Тимчасовий текст (пізніше можна додати реальні налаштування)
        const infoText = this.add.text(settingsBoxX, settingsBoxY - 20, 'Налаштування в розробці\n\nТут будуть:\n• Гучність звуку\n• Гучність музики\n• Якість графіки\n• Управління', {
            fontSize: '20px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            align: 'center',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
            lineSpacing: 8
        }).setOrigin(0.5).setDepth(102);

        // Кнопка закриття
        const closeButton = this.createMenuButton(
            settingsBoxX,
            settingsBoxY + 150,
            220,
            55,
            'ЗАКРИТИ',
            () => {
                overlay.destroy();
                settingsShadow.destroy();
                settingsBox.destroy();
                title.destroy();
                infoText.destroy();
                closeButton.destroy();
                closeButton.shadow.destroy();
                closeButton.text.destroy();
            }
        );
        closeButton.setDepth(102);
        closeButton.shadow.setDepth(101);
        closeButton.text.setDepth(102);

        // Закриваємо при кліку на затемнений фон
        overlay.on('pointerdown', () => {
            overlay.destroy();
            settingsShadow.destroy();
            settingsBox.destroy();
            title.destroy();
            infoText.destroy();
            closeButton.destroy();
            closeButton.shadow.destroy();
            closeButton.text.destroy();
        });
    }

    showAboutInfo() {
        const { width, height } = this.cameras.main;
        
        // Створюємо затемнений фон
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setDepth(100)
            .setInteractive();

        // Вікно інформації - сірий прямокутник в стилі меню
        const aboutWidth = 650;
        const aboutHeight = 480;
        const aboutBoxX = width / 2;
        const aboutBoxY = height / 2;
        
        // Тінь вікна
        const aboutShadow = this.add.rectangle(
            aboutBoxX + 4, 
            aboutBoxY + 4, 
            aboutWidth, 
            aboutHeight, 
            0x000000, 
            0.5
        ).setDepth(101);

        const aboutBox = this.add.rectangle(
            aboutBoxX, 
            aboutBoxY, 
            aboutWidth, 
            aboutHeight, 
            0x808080, 
            0.95
        )
        .setDepth(101)
        .setStrokeStyle(3, 0x606060);

        // Заголовок
        const title = this.add.text(aboutBoxX, aboutBoxY - 180, 'ПРО ГРУ', {
            fontSize: '42px',
            fill: '#0057B7',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#FFD700',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(102);

        // Текст інформації
        const aboutText = `ВТЕЧА ВІД ТЦК

Endless chase гра у стилі pixel art.

Мета: втекти від переслідувачів, збирати гроші та вижити якнайдовше.

Особливості:
• Динамічний геймплей з ривками та стаміною
• Процедурна генерація перешкод
• Система апгрейдів та мета-прогресу
• Підтримка ЗСУ через донат

Гра створена в розважальних цілях.`;

        const infoText = this.add.text(aboutBoxX, aboutBoxY - 20, aboutText, {
            fontSize: '18px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            align: 'center',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2,
            wordWrap: { width: aboutWidth - 80 },
            lineSpacing: 10
        }).setOrigin(0.5).setDepth(102);

        // Кнопка закриття
        const closeButton = this.createMenuButton(
            aboutBoxX,
            aboutBoxY + 180,
            220,
            55,
            'ЗАКРИТИ',
            () => {
                overlay.destroy();
                aboutShadow.destroy();
                aboutBox.destroy();
                title.destroy();
                infoText.destroy();
                closeButton.destroy();
                closeButton.shadow.destroy();
                closeButton.text.destroy();
            }
        );
        closeButton.setDepth(102);
        closeButton.shadow.setDepth(101);
        closeButton.text.setDepth(102);

        // Закриваємо при кліку на затемнений фон
        overlay.on('pointerdown', () => {
            overlay.destroy();
            aboutShadow.destroy();
            aboutBox.destroy();
            title.destroy();
            infoText.destroy();
            closeButton.destroy();
            closeButton.shadow.destroy();
            closeButton.text.destroy();
        });
    }
}

export default MenuScene;
