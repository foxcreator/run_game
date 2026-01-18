// MenuScene - головне меню
import { createStyledButton } from '../utils/ButtonHelper.js';
import AudioManager from '../systems/AudioManager.js';

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.audioManager = null;
    }

    create() {
        const { width, height } = this.cameras.main;
        
        // Очищаємо старе значення audioUnlocked (якщо було збережене раніше)
        localStorage.removeItem('audioUnlocked');
        
        // Ініціалізуємо AudioManager (спільний для всіх сцен через localStorage)
        if (!this.audioManager) {
            this.audioManager = new AudioManager(this);
            this.audioManager.init();
        }

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
        
        // Показуємо екран "Клікни для початку" при першому завантаженні
        this.showClickToStartOverlay();
    }
    
    showClickToStartOverlay() {
        // Перевіряємо реальний стан аудіо контексту
        if (this.sound.context && this.sound.context.state !== 'suspended') {
            // Аудіо вже активне, не показуємо екран
            return;
        }
        
        // Створюємо напівпрозорий оверлей
        const overlay = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.8
        ).setDepth(1000).setInteractive();
        
        // Текст підказки
        const clickText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            '🖱️ КЛІКНИ ДЛЯ ПОЧАТКУ 🖱️',
            {
                fontSize: '48px',
                fill: '#FFFFFF',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 6
            }
        ).setOrigin(0.5).setDepth(1001);
        
        // Анімація миготіння тексту
        this.tweens.add({
            targets: clickText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Обробник кліку
        overlay.once('pointerdown', () => {
            // Розблоковуємо аудіо контекст
            if (this.sound.context && this.sound.context.state === 'suspended') {
                this.sound.context.resume().then(() => {
                    // Відтворюємо тестовий звук для підтвердження
                    if (this.audioManager) {
                        this.audioManager.playSound('menu_hover', false);
                    }
                });
            }
            
            // Видаляємо оверлей з анімацією
            this.tweens.add({
                targets: [overlay, clickText],
                alpha: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    overlay.destroy();
                    clickText.destroy();
                }
            });
        });
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
            // Відтворюємо звук наведення
            if (this.audioManager) {
                this.audioManager.playSound('menu_hover', false);
            }
            
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
            // Відтворюємо звук кліку
            if (this.audioManager) {
                this.audioManager.playSound('menu_choise', false);
            }
            
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

        // Вікно налаштувань
        const settingsWidth = 550;
        const settingsHeight = 480;
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
        const title = this.add.text(settingsBoxX, settingsBoxY - 180, 'НАЛАШТУВАННЯ', {
            fontSize: '48px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(102);

        // === МУЗИКА ===
        const musicLabelY = settingsBoxY - 100;
        const musicLabel = this.add.text(settingsBoxX - 200, musicLabelY, 'МУЗИКА', {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5).setDepth(102);
        
        // Слайдер гучності музики
        const sliderY = musicLabelY + 50;
        const sliderWidth = 320;
        const sliderHeight = 10;
        const sliderStartX = settingsBoxX - 180;
        
        // Фон слайдера
        const musicSliderBg = this.add.rectangle(
            sliderStartX + sliderWidth / 2,
            sliderY,
            sliderWidth,
            sliderHeight,
            0x333333
        ).setDepth(102);
        
        // Заповнення слайдера
        const currentVolume = this.audioManager ? this.audioManager.getMusicVolume() : 0.5;
        const musicSliderFill = this.add.rectangle(
            sliderStartX,
            sliderY,
            sliderWidth * currentVolume,
            sliderHeight,
            0x00ff00
        ).setOrigin(0, 0.5).setDepth(103);
        
        // Повзунок
        const musicSliderHandle = this.add.circle(
            sliderStartX + sliderWidth * currentVolume,
            sliderY,
            15,
            0xffffff
        ).setDepth(104);
        musicSliderHandle.setInteractive({ draggable: true, useHandCursor: true });
        
        // Текст гучності (ліворуч від слайдера)
        const musicVolumeText = this.add.text(
            sliderStartX - 50,
            sliderY,
            `${Math.round(currentVolume * 100)}%`,
            {
                fontSize: '18px',
                fill: '#FFFFFF',
                fontFamily: 'Arial, sans-serif'
            }
        ).setOrigin(0.5).setDepth(102);
        
        // Обробник перетягування
        musicSliderHandle.on('drag', (pointer, dragX) => {
            const minX = sliderStartX;
            const maxX = sliderStartX + sliderWidth;
            const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);
            
            musicSliderHandle.x = clampedX;
            
            const volume = (clampedX - minX) / sliderWidth;
            musicSliderFill.width = sliderWidth * volume;
            musicVolumeText.setText(`${Math.round(volume * 100)}%`);
            
            if (this.audioManager) {
                this.audioManager.setMusicVolume(volume);
            }
        });
        
        // Іконка вимкнення/увімкнення музики (справа від слайдера)
        const isMusicEnabled = this.audioManager ? this.audioManager.isMusicEnabled() : true;
        const musicToggleIcon = this.add.text(
            sliderStartX + sliderWidth + 40,
            sliderY,
            isMusicEnabled ? '🔊' : '🔇',
            {
                fontSize: '32px'
            }
        ).setOrigin(0.5).setDepth(102)
        .setInteractive({ useHandCursor: true });
        
        musicToggleIcon.on('pointerover', () => {
            if (this.audioManager) {
                this.audioManager.playSound('menu_hover', false);
            }
        });
        
        musicToggleIcon.on('pointerdown', () => {
            if (this.audioManager) {
                this.audioManager.playSound('menu_choise', false);
                const newState = !this.audioManager.isMusicEnabled();
                this.audioManager.setMusicEnabled(newState);
                musicToggleIcon.setText(newState ? '🔊' : '🔇');
            }
        });
        
        // === ЗВУКИ ===
        const soundsLabelY = sliderY + 80;
        const soundsLabel = this.add.text(settingsBoxX - 200, soundsLabelY, 'ЗВУКИ', {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5).setDepth(102);
        
        // Слайдер гучності звуків
        const soundsSliderY = soundsLabelY + 50;
        
        // Фон слайдера
        const soundsSliderBg = this.add.rectangle(
            sliderStartX + sliderWidth / 2,
            soundsSliderY,
            sliderWidth,
            sliderHeight,
            0x333333
        ).setDepth(102);
        
        // Заповнення слайдера
        const currentSoundsVolume = this.audioManager ? this.audioManager.getSoundsVolume() : 0.7;
        const soundsSliderFill = this.add.rectangle(
            sliderStartX,
            soundsSliderY,
            sliderWidth * currentSoundsVolume,
            sliderHeight,
            0x00ff00
        ).setOrigin(0, 0.5).setDepth(103);
        
        // Повзунок
        const soundsSliderHandle = this.add.circle(
            sliderStartX + sliderWidth * currentSoundsVolume,
            soundsSliderY,
            15,
            0xffffff
        ).setDepth(104);
        soundsSliderHandle.setInteractive({ draggable: true, useHandCursor: true });
        
        // Текст гучності (ліворуч від слайдера)
        const soundsVolumeText = this.add.text(
            sliderStartX - 50,
            soundsSliderY,
            `${Math.round(currentSoundsVolume * 100)}%`,
            {
                fontSize: '18px',
                fill: '#FFFFFF',
                fontFamily: 'Arial, sans-serif'
            }
        ).setOrigin(0.5).setDepth(102);
        
        // Обробник перетягування
        soundsSliderHandle.on('drag', (pointer, dragX) => {
            const minX = sliderStartX;
            const maxX = sliderStartX + sliderWidth;
            const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);
            
            soundsSliderHandle.x = clampedX;
            
            const volume = (clampedX - minX) / sliderWidth;
            soundsSliderFill.width = sliderWidth * volume;
            soundsVolumeText.setText(`${Math.round(volume * 100)}%`);
            
            if (this.audioManager) {
                this.audioManager.setSoundsVolume(volume);
            }
        });
        
        // Іконка вимкнення/увімкнення звуків (справа від слайдера)
        const isSoundsEnabled = this.audioManager ? this.audioManager.isSoundsEnabled() : true;
        const soundsToggleIcon = this.add.text(
            sliderStartX + sliderWidth + 40,
            soundsSliderY,
            isSoundsEnabled ? '🔊' : '🔇',
            {
                fontSize: '32px'
            }
        ).setOrigin(0.5).setDepth(102)
        .setInteractive({ useHandCursor: true });
        
        soundsToggleIcon.on('pointerover', () => {
            if (this.audioManager) {
                this.audioManager.playSound('menu_hover', false);
            }
        });
        
        soundsToggleIcon.on('pointerdown', () => {
            if (this.audioManager) {
                this.audioManager.playSound('menu_choise', false);
                const newState = !this.audioManager.isSoundsEnabled();
                this.audioManager.setSoundsEnabled(newState);
                soundsToggleIcon.setText(newState ? '🔊' : '🔇');
            }
        });

        // Кнопка закриття
        const closeButton = this.createMenuButton(
            settingsBoxX,
            settingsBoxY + 180,
            220,
            55,
            'ЗАКРИТИ',
            () => {
                overlay.destroy();
                settingsShadow.destroy();
                settingsBox.destroy();
                title.destroy();
                musicLabel.destroy();
                musicSliderBg.destroy();
                musicSliderFill.destroy();
                musicSliderHandle.destroy();
                musicVolumeText.destroy();
                musicToggleIcon.destroy();
                soundsLabel.destroy();
                soundsSliderBg.destroy();
                soundsSliderFill.destroy();
                soundsSliderHandle.destroy();
                soundsVolumeText.destroy();
                soundsToggleIcon.destroy();
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
            musicLabel.destroy();
            musicSliderBg.destroy();
            musicSliderFill.destroy();
            musicSliderHandle.destroy();
            musicVolumeText.destroy();
            musicToggleIcon.destroy();
            soundsLabel.destroy();
            soundsSliderBg.destroy();
            soundsSliderFill.destroy();
            soundsSliderHandle.destroy();
            soundsVolumeText.destroy();
            soundsToggleIcon.destroy();
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
