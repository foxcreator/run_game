import { createStyledButton } from '../utils/ButtonHelper.js';
import AudioManager from '../systems/AudioManager.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import apiClient from '../systems/ApiClient.js';
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.audioManager = null;
    }
    create() {
        const { width, height } = this.cameras.main;
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => {
                loader.remove();
            }, 500);
        }
        localStorage.removeItem('audioUnlocked');
        if (!this.audioManager) {
            this.audioManager = new AudioManager(this);
            this.audioManager.init();
        }
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

        // === ЛІДЕРБОРД (зліва під версією) ===
        this.createLeaderboard(10, 40);

        const menuBoxWidth = 400;
        const menuBoxHeight = 320;
        const menuBoxX = width / 2;
        const menuBoxY = height * 0.65;
        const menuShadow = this.add.rectangle(
            menuBoxX + 4,
            menuBoxY + 4,
            menuBoxWidth,
            menuBoxHeight,
            0x000000,
            0.4
        );
        const menuBox = this.add.rectangle(
            menuBoxX,
            menuBoxY,
            menuBoxWidth,
            menuBoxHeight,
            0x808080,
            0.9
        ).setStrokeStyle(3, 0x606060);
        const buttonWidth = 320;
        const buttonHeight = 60;
        const buttonSpacing = 15;
        const startY = menuBoxY - 120;
        const playButton = this.createMenuButton(
            menuBoxX,
            startY,
            buttonWidth,
            buttonHeight,
            'ГРАТИ',
            () => {
                try {
                    // Прямий старт ігрової сцени (вона сама покаже свій екран завантаження)
                    this.scene.start('GameScene');
                } catch (error) {
                    alert('Помилка запуску гри: ' + error.message);
                }
            }
        );
        const settingsButton = this.createMenuButton(
            menuBoxX,
            startY + buttonHeight + buttonSpacing,
            buttonWidth,
            buttonHeight,
            'НАЛАШТУВАННЯ',
            () => {
                const settingsMenu = this.createSettingsMenu();
            }
        );
        const aboutButton = this.createMenuButton(
            menuBoxX,
            startY + (buttonHeight + buttonSpacing) * 2,
            buttonWidth,
            buttonHeight,
            'ПРО ГРУ',
            () => {
                this.showAboutInfo();
            }
        );
        const shopButton = this.createMenuButton(
            menuBoxX,
            startY + (buttonHeight + buttonSpacing) * 3,
            buttonWidth,
            buttonHeight,
            'МАГАЗИН',
            () => {
                this.scene.start('ShopScene');
            }
        );

        // --- Custom Donate Button (Top Right) ---
        const donateWidth = 200;
        const donateHeight = 50;
        const donateX = width - donateWidth / 2 - 20;
        const donateY = 40;

        const donateContainer = this.add.container(donateX, donateY);

        // Background (Blue)
        const donateBg = this.add.rectangle(0, 0, donateWidth, donateHeight, 0x0057B7, 1)
            .setStrokeStyle(2, 0xFFD700); // Gold border

        // Text
        const donateText = this.add.text(0, 0, '🇺🇦 ДОНАТ НА ЗСУ', {
            fontSize: '20px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        donateContainer.add([donateBg, donateText]);
        donateContainer.setSize(donateWidth, donateHeight);
        donateContainer.setInteractive(new Phaser.Geom.Rectangle(-donateWidth / 2, -donateHeight / 2, donateWidth, donateHeight), Phaser.Geom.Rectangle.Contains);

        // Hover Effect
        donateContainer.on('pointerover', () => {
            if (this.audioManager) this.audioManager.playSound('menu_hover', false);
            this.tweens.add({
                targets: donateContainer,
                scale: 1.05,
                duration: 100
            });
            donateBg.setFillStyle(0x004494); // Darker blue
        });

        donateContainer.on('pointerout', () => {
            this.tweens.add({
                targets: donateContainer,
                scale: 1,
                duration: 100
            });
            donateBg.setFillStyle(0x0057B7);
        });

        donateContainer.on('pointerdown', () => {
            if (this.audioManager) this.audioManager.playSound('menu_choise', false);
            window.open(GAME_CONFIG.DONATE_LINK, '_blank');
        });

        // Pulse Animation (Heartbeat)
        this.tweens.add({
            targets: donateContainer,
            scale: 1.02,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        background.setDepth(0);
        menuShadow.setDepth(2);
        menuBox.setDepth(2);
        playButton.setDepth(3);
        settingsButton.setDepth(3);
        aboutButton.setDepth(3);
        shopButton.setDepth(3);
        donateContainer.setDepth(10);
        if (GAME_CONFIG.UI.SHOW_CLICK_TO_START) {
            this.showClickToStartOverlay();
        }
        const shouldShowWelcome = GAME_CONFIG.UI.SHOW_WELCOME_POPUP &&
            (GAME_CONFIG.UI.ALWAYS_SHOW_WELCOME_POPUP || !localStorage.getItem('welcomeShown'));

        if (shouldShowWelcome) {
            this.time.delayedCall(800, () => {
                this.showWelcomePopup();
            });
        }
    }
    showClickToStartOverlay() {
        if (this.sound.context && this.sound.context.state !== 'suspended') {
            return;
        }
        const overlay = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.8
        ).setDepth(1000).setInteractive();
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
        this.tweens.add({
            targets: clickText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        overlay.once('pointerdown', () => {
            if (this.sound.context && this.sound.context.state === 'suspended') {
                this.sound.context.resume().then(() => {
                    if (this.audioManager) {
                        this.audioManager.playSound('menu_hover', false);
                    }
                });
            }
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
        const shadow = this.add.rectangle(x + 2, y + 2, width, height, 0x000000, 0.5);
        const button = this.add.rectangle(x, y, width, height, 0x606060, 0.95)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x404040);
        const buttonText = this.add.text(x, y, text, {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        shadow.setDepth(3);
        button.setDepth(4);
        buttonText.setDepth(5);
        button.on('pointerover', () => {
            if (this.audioManager) {
                const existingHover = this.audioManager.getSound('menu_hover_current');
                if (existingHover && existingHover.isPlaying) {
                    existingHover.stop();
                }
                this.audioManager.playSound('menu_hover_current', false, null, 'menu_hover');
            }
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
        button.shadow = shadow;
        button.text = buttonText;
        return button;
    }
    createSettingsMenu() {
        const { width, height } = this.cameras.main;
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setDepth(100)
            .setInteractive();
        const settingsWidth = 550;
        const settingsHeight = 480;
        const settingsBoxX = width / 2;
        const settingsBoxY = height / 2;
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
        const title = this.add.text(settingsBoxX, settingsBoxY - 180, 'НАЛАШТУВАННЯ', {
            fontSize: '48px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(102);
        const musicLabelY = settingsBoxY - 100;
        const musicLabel = this.add.text(settingsBoxX - 200, musicLabelY, 'МУЗИКА', {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5).setDepth(102);
        const sliderY = musicLabelY + 50;
        const sliderWidth = 320;
        const sliderHeight = 10;
        const sliderStartX = settingsBoxX - 180;
        const musicSliderBg = this.add.rectangle(
            sliderStartX + sliderWidth / 2,
            sliderY,
            sliderWidth,
            sliderHeight,
            0x333333
        ).setDepth(102);
        const currentVolume = this.audioManager ? this.audioManager.getMusicVolume() : 0.5;
        const musicSliderFill = this.add.rectangle(
            sliderStartX,
            sliderY,
            sliderWidth * currentVolume,
            sliderHeight,
            0x00ff00
        ).setOrigin(0, 0.5).setDepth(103);
        const musicSliderHandle = this.add.circle(
            sliderStartX + sliderWidth * currentVolume,
            sliderY,
            15,
            0xffffff
        ).setDepth(104);
        musicSliderHandle.setInteractive({ draggable: true, useHandCursor: true });
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
                const existingHover = this.audioManager.getSound('menu_hover_current');
                if (existingHover && existingHover.isPlaying) {
                    existingHover.stop();
                }
                this.audioManager.playSound('menu_hover_current', false, null, 'menu_hover');
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
        const soundsLabelY = sliderY + 80;
        const soundsLabel = this.add.text(settingsBoxX - 200, soundsLabelY, 'ЗВУКИ', {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5).setDepth(102);
        const soundsSliderY = soundsLabelY + 50;
        const soundsSliderBg = this.add.rectangle(
            sliderStartX + sliderWidth / 2,
            soundsSliderY,
            sliderWidth,
            sliderHeight,
            0x333333
        ).setDepth(102);
        const currentSoundsVolume = this.audioManager ? this.audioManager.getSoundsVolume() : 0.7;
        const soundsSliderFill = this.add.rectangle(
            sliderStartX,
            soundsSliderY,
            sliderWidth * currentSoundsVolume,
            sliderHeight,
            0x00ff00
        ).setOrigin(0, 0.5).setDepth(103);
        const soundsSliderHandle = this.add.circle(
            sliderStartX + sliderWidth * currentSoundsVolume,
            soundsSliderY,
            15,
            0xffffff
        ).setDepth(104);
        soundsSliderHandle.setInteractive({ draggable: true, useHandCursor: true });
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
                const existingHover = this.audioManager.getSound('menu_hover_current');
                if (existingHover && existingHover.isPlaying) {
                    existingHover.stop();
                }
                this.audioManager.playSound('menu_hover_current', false, null, 'menu_hover');
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
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setDepth(100)
            .setInteractive();
        const aboutWidth = 700;
        const aboutHeight = 580;
        const aboutBoxX = width / 2;
        const aboutBoxY = height / 2;
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
        const title = this.add.text(aboutBoxX, aboutBoxY - aboutHeight / 2 + 30, '🏃 ПРО ГРУ', {
            fontSize: '28px',
            fill: '#0057B7',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#FFD700',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(102);
        const contentBgWidth = aboutWidth - 80;
        const contentBgHeight = aboutHeight - 150;
        const contentBg = this.add.rectangle(
            aboutBoxX,
            aboutBoxY - 10,
            contentBgWidth,
            contentBgHeight,
            0x000000,
            0.3
        ).setDepth(101);
        const textHeight = contentBgHeight - 80;
        const contentHtml = `
            <div style="
                box-sizing: border-box;
                width: ${contentBgWidth}px;
                height: ${textHeight}px;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 15px;
                margin: 0;
                font-family: Arial, sans-serif;
                font-size: 13px;
                line-height: 1.5;
                color: #FFFFFF;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
                word-wrap: break-word;
                scrollbar-width: thin;
                scrollbar-color: #FFD700 rgba(255, 255, 255, 0.2);
            ">
                <p style="margin: 0 0 8px 0; color: #FFD700; font-size: 16px; font-weight: bold;">🎯 МЕТА</p>
                <p style="margin: 0 0 12px 0;">Втікайте від переслідувачів, збирайте гроші та обмінюйте їх на долари в обмінниках.<br><strong>Протримайтесь якомога довше та зберіть 20000$!</strong></p>
                <p style="margin: 12px 0 8px 0; color: #FFD700; font-size: 16px; font-weight: bold;">⌨️ УПРАВЛІННЯ</p>
                <p style="margin: 0 0 12px 0;">
                    • WASD / Стрілки — рух<br>
                    • Space — підслизнення під стрічками<br>
                    • ESC — пауза
                </p>
                <p style="margin: 12px 0 8px 0; color: #FFD700; font-size: 16px; font-weight: bold;">💰 ГРОШІ</p>
                <p style="margin: 0 0 12px 0;">
                    • Збирайте гроші (10₴, 20₴, 50₴, 100₴)<br>
                    • Обмінюйте в обмінниках (43₴ = 1$)<br>
                    • ⚠️ <strong>Необмінені гривні згорають</strong> після програшу!
                </p>
                <p style="margin: 12px 0 8px 0; color: #FFD700; font-size: 16px; font-weight: bold;">👹 ВОРОГИ</p>
                <p style="margin: 0 0 12px 0;">
                    • З документами — блокують шлях, повільно заповнюють шкалу<br>
                    • З дубинками — б'ють вас, швидко заповнюють шкалу<br>
                    • ☠️ <strong>Червона шкала = 100% → Програш</strong>
                </p>
                <p style="margin: 12px 0 8px 0; color: #FFD700; font-size: 16px; font-weight: bold;">🎁 БОНУСИ</p>
                <p style="margin: 0 0 12px 0;">
                    • 🛴 Скутер — +швидкість на 2 сек<br>
                    • ☁️ Хмарка — заморожує всіх ворогів на 1.5 сек<br>
                    • 🏪 Кіоск — відновлює стаміну
                </p>
                <p style="margin: 12px 0 8px 0; color: #FFD700; font-size: 16px; font-weight: bold;">💡 ПОРАДИ</p>
                <p style="margin: 0 0 12px 0;">
                    1. Слідкуйте за стаміною — не витрачайте всю!<br>
                    2. Обмінюйте гроші часто — не ризикуйте<br>
                    3. Використовуйте ривок для втечі<br>
                    4. Хмарка рятує в критичні моменти
                </p>
                <p style="text-align: center; margin: 15px 0 0 0; font-size: 16px; color: #FFD700;">
                    <strong>Удачі у втечі! 🏃💨</strong>
                </p>
            </div>
            <style>
                div::-webkit-scrollbar {
                    width: 8px;
                }
                div::-webkit-scrollbar-track {
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                }
                div::-webkit-scrollbar-thumb {
                    background: #FFD700;
                    border-radius: 4px;
                }
                div::-webkit-scrollbar-thumb:hover {
                    background: #FFA500;
                }
            </style>
        `;
        const contentBgTop = (aboutBoxY - 10) - (contentBgHeight / 2);
        const contentElement = this.add.dom(aboutBoxX, contentBgTop, 'div').createFromHTML(contentHtml);
        contentElement.setOrigin(0.5, 0);
        contentElement.setDepth(102);
        const closeButton = this.createMenuButton(
            aboutBoxX,
            aboutBoxY + aboutHeight / 2 - 35,
            200,
            50,
            'ЗАКРИТИ',
            () => {
                overlay.destroy();
                aboutShadow.destroy();
                aboutBox.destroy();
                contentBg.destroy();
                title.destroy();
                contentElement.destroy();
                closeButton.destroy();
                closeButton.shadow.destroy();
                closeButton.text.destroy();
            }
        );
        closeButton.setDepth(102);
        closeButton.shadow.setDepth(101);
        closeButton.text.setDepth(102);
        overlay.on('pointerdown', () => {
            overlay.destroy();
            aboutShadow.destroy();
            aboutBox.destroy();
            contentBg.destroy();
            title.destroy();
            contentElement.destroy();
            closeButton.destroy();
            closeButton.shadow.destroy();
            closeButton.text.destroy();
        });
    }
    showWelcomePopup() {
        const { width, height } = this.scale;
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setInteractive()
            .setDepth(100);
        const popupWidth = 620;
        const popupHeight = 600;
        const popupX = width / 2;
        const popupY = height / 2;
        const shadow = this.add.rectangle(popupX + 4, popupY + 4, popupWidth, popupHeight, 0x000000, 0.5);
        shadow.setDepth(101);
        const popup = this.add.rectangle(popupX, popupY, popupWidth, popupHeight, 0x808080, 0.95)
            .setStrokeStyle(3, 0x606060);
        popup.setDepth(102);
        const title = this.add.text(popupX, popupY - 270, '🎮 БЕТА ВЕРСІЯ', {
            fontSize: '30px',
            fill: '#0057B7',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#FFD700',
            strokeThickness: 4,
            resolution: 2
        }).setOrigin(0.5).setDepth(103);
        const versionText = this.add.text(popupX, popupY - 230, GAME_CONFIG.VERSION, {
            fontSize: '18px',
            fill: '#333333',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            resolution: 2
        }).setOrigin(0.5).setDepth(103);
        const messageText = this.add.text(popupX, popupY - 15,
            '🏃 Ласкаво просимо до бета-версії гри!\n\n⚠️ Це БЕТА! Тут можуть бути баги, глюки, та всілякі дивні штуки. Якщо щось працює не так - не панікуй, це нормально! 😅\n\n💡 Знайшли баг? Є крута ідея? Створюй таску на GitHub!\n\nТам можна поскаржитись, запропонувати фічу, або просто сказати "шо це було?" 🤔\n\n🙏 Дякуємо що тестуєте і допомагаєте зробити гру кращою!', {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            align: 'center',
            lineSpacing: 8,
            stroke: '#000000',
            strokeThickness: 3,
            resolution: 2,
            wordWrap: { width: 560 }
        }).setOrigin(0.5).setDepth(103);
        const closeButtonShadow = this.add.rectangle(popupX + 2, popupY + 207, 320, 50, 0x000000, 0.5);
        closeButtonShadow.setDepth(102);
        const closeButton = this.add.rectangle(popupX, popupY + 205, 320, 50, 0x606060, 0.95)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x404040);
        closeButton.setDepth(103);
        const closeText = this.add.text(popupX, popupY + 205, 'Зрозумів!', {
            fontSize: '20px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            resolution: 2
        }).setOrigin(0.5).setDepth(104);
        const githubButtonShadow = this.add.rectangle(popupX + 2, popupY + 262, 240, 40, 0x000000, 0.5);
        githubButtonShadow.setDepth(102);
        const githubButton = this.add.rectangle(popupX, popupY + 260, 240, 40, 0x606060, 0.95)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x404040);
        githubButton.setDepth(103);
        const githubText = this.add.text(popupX, popupY + 260, '🐛 GitHub Issues', {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            resolution: 2
        }).setOrigin(0.5).setDepth(104);
        closeButton.on('pointerover', () => {
            closeButton.setFillStyle(0x707070);
            if (this.audioManager) {
                this.audioManager.playSound('menu_hover', false, null, 'menu_hover', true);
            }
        });
        closeButton.on('pointerout', () => {
            closeButton.setFillStyle(0x606060);
        });
        githubButton.on('pointerover', () => {
            githubButton.setFillStyle(0x707070);
            if (this.audioManager) {
                this.audioManager.playSound('menu_hover', false, null, 'menu_hover', true);
            }
        });
        githubButton.on('pointerout', () => {
            githubButton.setFillStyle(0x606060);
        });
        githubButton.on('pointerdown', () => {
            if (this.audioManager) {
                this.audioManager.playSound('menu_choise', false);
            }
            window.open(GAME_CONFIG.GITHUB_ISSUES_LINK, '_blank');
        });
        const closePopup = () => {
            if (this.audioManager) {
                this.audioManager.playSound('menu_choise', false);
            }
            localStorage.setItem('welcomeShown', 'true');
            overlay.destroy();
            shadow.destroy();
            popup.destroy();
            title.destroy();
            versionText.destroy();
            messageText.destroy();
            githubButton.destroy();
            githubButtonShadow.destroy();
            githubText.destroy();
            closeButton.destroy();
            closeButtonShadow.destroy();
            closeText.destroy();
        };
        closeButton.on('pointerdown', closePopup);
        overlay.on('pointerdown', (pointer) => {
            if (pointer.y > popupY + 280 || pointer.y < popupY - 280 ||
                pointer.x < popupX - popupWidth / 2 || pointer.x > popupX + popupWidth / 2) {
                closePopup();
            }
        });
    }

    /**
     * Створює панель лідерборду зліва
     */
    createLeaderboard(x, y) {
        const panelWidth = 220;
        const panelHeight = 320;

        // Напівпрозорий фон
        const bg = this.add.rectangle(x + panelWidth / 2, y + panelHeight / 2, panelWidth, panelHeight, 0x000000, 0.6)
            .setStrokeStyle(2, 0xFFD700, 0.8)
            .setDepth(5);

        // Заголовок
        this.add.text(x + panelWidth / 2, y + 15, '🏆 ТОП-10', {
            fontSize: '18px',
            fill: '#FFD700',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5, 0).setDepth(6);

        // Контейнер для рядків лідерборду
        this.leaderboardTexts = [];

        // Текст завантаження
        this.leaderboardLoading = this.add.text(x + panelWidth / 2, y + panelHeight / 2, 'Завантаження...', {
            fontSize: '14px',
            fill: '#888888',
            fontFamily: 'Arial, sans-serif'
        }).setOrigin(0.5).setDepth(6);

        // Завантажуємо дані
        this.loadLeaderboard(x, y + 45, panelWidth);

        // WebSocket підписка на оновлення
        apiClient.onLeaderboardUpdate = (data) => {
            this.loadLeaderboard(x, y + 45, panelWidth);
        };
    }

    /**
     * Завантажує дані лідерборду з сервера
     */
    async loadLeaderboard(x, startY, panelWidth) {
        try {
            const leaderboard = await apiClient.getLeaderboard(10);

            // Ховаємо "Завантаження..."
            if (this.leaderboardLoading) {
                this.leaderboardLoading.setVisible(false);
            }

            // Очищуємо попередні тексти
            this.leaderboardTexts.forEach(t => t.destroy());
            this.leaderboardTexts = [];

            if (!leaderboard || leaderboard.length === 0) {
                const emptyText = this.add.text(x + panelWidth / 2, startY + 80, 'Поки нікого 🤷', {
                    fontSize: '14px',
                    fill: '#888888',
                    fontFamily: 'Arial, sans-serif'
                }).setOrigin(0.5).setDepth(6);
                this.leaderboardTexts.push(emptyText);
                return;
            }

            // Відображаємо записи
            const lineHeight = 25;
            leaderboard.forEach((entry, index) => {
                const yPos = startY + index * lineHeight;

                // Медалі для топ-3
                let medal = '';
                if (index === 0) medal = '🥇';
                else if (index === 1) medal = '🥈';
                else if (index === 2) medal = '🥉';
                else medal = `${index + 1}.`;

                // Форматуємо час
                const timeStr = this.formatTime(entry.survivalTime);

                // Обрізаємо username якщо довгий
                const maxNameLength = 10;
                const displayName = entry.username.length > maxNameLength
                    ? entry.username.slice(0, maxNameLength) + '…'
                    : entry.username;

                const rowText = this.add.text(x + 10, yPos, `${medal} ${displayName}`, {
                    fontSize: '13px',
                    fill: index < 3 ? '#FFD700' : '#FFFFFF',
                    fontFamily: 'Arial, sans-serif',
                    stroke: '#000000',
                    strokeThickness: 1
                }).setDepth(6);

                const timeText = this.add.text(x + panelWidth - 10, yPos, timeStr, {
                    fontSize: '13px',
                    fill: '#90EE90',
                    fontFamily: 'Arial, sans-serif',
                    stroke: '#000000',
                    strokeThickness: 1
                }).setOrigin(1, 0).setDepth(6);

                this.leaderboardTexts.push(rowText, timeText);
            });

        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            if (this.leaderboardLoading) {
                this.leaderboardLoading.setText('Помилка');
            }
        }
    }

    /**
     * Форматує секунди в читабельний час
     */
    formatTime(seconds) {
        if (!seconds) return '0с';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins > 0) {
            return `${mins}хв ${secs}с`;
        }
        return `${secs}с`;
    }
}
export default MenuScene;