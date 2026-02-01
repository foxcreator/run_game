import Player from '../entities/Player.js';
import HUD from '../ui/HUD.js';
import Minimap from '../ui/Minimap.js';
import CaptureSystem from '../systems/CaptureSystem.js';
import TilemapSystem from '../systems/TilemapSystem.js';
import PathfindingSystem from '../systems/PathfindingSystem.js';
import NavigationSystem from '../systems/NavigationSystem.js';
import SaveSystem from '../systems/SaveSystem.js';
import AudioManager from '../systems/AudioManager.js';
import NotificationManager from '../systems/NotificationManager.js';
import EnemyDifficultyController from '../systems/EnemyDifficultyController.js';
import MoneyDropController from '../systems/MoneyDropController.js';
import MoneyMultiplierController from '../systems/MoneyMultiplierController.js';
import PuddleSlip from '../entities/PuddleSlip.js';
import TapeGate from '../entities/TapeGate.js';
import Car from '../entities/Car.js';
import PaperStack from '../entities/PaperStack.js';
import ChaserBlocker from '../entities/ChaserBlocker.js';
import ChaserSticker from '../entities/ChaserSticker.js';
import Coin from '../entities/Coin.js';
import SmokeCloud from '../entities/bonuses/SmokeCloud.js';
import Scooter from '../entities/bonuses/Scooter.js';
import BonusManager from '../systems/BonusManager.js';
import Exchange from '../entities/Exchange.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import LoadingScreen from '../utils/LoadingScreen.js';

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.carTextureIndex = 0;
        this.loadingScreen = null;
        this.actualProgress = 0;
        this.isLoadingComplete = false;
        this.loadingStartTime = 0;
    }

    init() {
        this.loadingStartTime = Date.now();
        this.actualProgress = 0;
    }

    preload() {
        // У GameScene більше немає preload() для асетів, всі вони завантажені в BootScene.
    }

    create() {
        // 1. Створюємо екран завантаження ВІДРАЗУ
        this.loadingScreen = new LoadingScreen(this);
        this.loadingScreen.create();
        this.loadingScreen.updateProgress(0); // 0%

        // 2. Блокуємо оновлення (update) поки не завантажиться
        this.isGameReady = false;

        // 3. Запускаємо асинхронну ініціалізацію через малу затримку, щоб браузер встиг намалювати лоадер
        this.time.delayedCall(50, () => {
            this.startAsyncInitialization();
        });

        // Initialize kiosk message text holder
        this.kioskMessageText = null;
    }

    async startAsyncInitialization() {
        try {
            // КРОК 1: Ініціалізація фізики та меж світу (швидко)
            this.initWorldBounds();
            this.saveSystem = new SaveSystem();
            this.initialBankedMoney = this.saveSystem.getBankedMoney();
            this.bankedMoney = this.initialBankedMoney;
            this.loadingScreen.updateProgress(0.1);
            await this.yieldControl();

            // КРОК 2: Генерація мапи (найважче!)
            this.tilemap = new TilemapSystem(this);
            this.loadingScreen.updateProgress(0.3);
            await this.yieldControl();

            // КРОК 3: Спавн гравця (потрібен для мінімапи)
            this.spawnPlayer();
            this.setupCameraFollow();
            this.loadingScreen.updateProgress(0.4);
            await this.yieldControl();

            // КРОК 4: Міні-мапа та камери
            try {
                this.minimap = new Minimap(this, this.tilemap, this.player);
            } catch (error) {
                console.warn('Minimap init failed:', error);
                this.minimap = null;
            }
            this.initCameras();
            this.loadingScreen.updateProgress(0.5);
            await this.yieldControl();

            // КРОК 5: Системи
            this.navigationSystem = new NavigationSystem(this.tilemap);
            this.captureSystem = new CaptureSystem(this);
            this.pathfindingSystem = new PathfindingSystem(this.tilemap);

            this.audioManager = new AudioManager(this);
            if (this.audioManager.init()) {
                this.audioManager.setMusicVolume(0.5);
                this.audioManager.startMusic();
            }
            if (this.player) this.player.audioManager = this.audioManager;

            // Нові системи прогресії
            this.notificationManager = new NotificationManager(this);
            this.enemyDifficultyController = new EnemyDifficultyController(this, this.notificationManager);
            this.moneyDropController = new MoneyDropController(this, this.notificationManager);
            this.moneyMultiplierController = new MoneyMultiplierController(this, this.notificationManager);
            this.moneyMultiplier = 1;

            this.loadingScreen.updateProgress(0.7);
            await this.yieldControl();

            // КРОК 6: Вороги та перешкоди
            this.chasers = [];
            this.obstacles = [];
            // Initialize Car Pool
            this.carPool = this.add.group({
                classType: Car,
                maxSize: 60,
                runChildUpdate: false // We update manually in update loop via obstacles array
            });
            this.pickups = [];
            this.exchanges = [];

            this.spawnInitialChasers();
            // Синхронізуємо лічильник ворогів
            if (this.enemyDifficultyController) {
                const actualCount = this.chasers.filter(c => c && c.active).length;
                this.enemyDifficultyController.setInitialEnemyCount(actualCount);
            }

            this.spawnExchanges();
            for (const exchange of this.exchanges) {
                this.obstacles.push(exchange);
            }
            this.spawnObstacles();
            this.spawnPickups();

            this.loadingScreen.updateProgress(0.9);
            await this.yieldControl();

            // КРОК 7: UI та коллайдери

            this.hud = new HUD(this);
            try {
                this.hud.create(this.player);
            } catch (error) {
                console.warn('HUD create error', error);
            }

            // Fallback for money init
            if (!this.hud.moneyText) {
                const barX = 50;
                const captureBarY = 50 + 40 + 40;
                const moneyY = captureBarY + 40;
                this.hud.moneyText = this.add.text(barX, moneyY, 'Зароблено: $0 | Банк: $0', {
                    fontSize: '18px', fill: '#ffffff', fontFamily: 'Arial, sans-serif',
                    stroke: '#000000', strokeThickness: 2
                }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(202);
                if (!this.hud.scene) this.hud.scene = this;
            }
            this.hud.setCaptureSystem(this.captureSystem);

            this.setupObstacleCollisions();
            this.setupCarCollisions();
            this.setupPickupCollisions();
            this.setupExchangeCollisions();

            this.setupInput();
            this.setupPauseControls();
            this.setupProgressionEvents();

            // Init variables
            const sirenConfig = GAME_CONFIG.AUDIO.POLICE_SIREN;
            this.nextSirenTime = this.time.now + Phaser.Math.Between(sirenConfig.MIN_INTERVAL, sirenConfig.MAX_INTERVAL);
            this.initAmbienceSounds();
            this.runMoney = 0;
            this.totalCoinsSpawned = 0;
            this.pickupSpawnTimer = 0;
            this.pickupSpawnInterval = 1000;
            this.lastSmokeCloudPickupTime = 0;
            this.lastScooterPickupTime = 0;
            this.timeSurvived = 0;
            this.score = 0;
            this.survivalBonus = 0;
            this.nextBonusTime = GAME_CONFIG.SURVIVAL_BONUS.INTERVAL / 1000;
            this.lastBonusBankAmount = 0;
            this.isPaused = false;
            this.pauseMenu = null;
            this.autoPausedByBlur = false;

            // BONUS MANAGER
            this.bonusManager = new BonusManager(this, this.player, this.saveSystem);

            this.pathRecalculationQueue = [];
            this.maxPathRecalculationsPerTick = 3;

            this.events.once('shutdown', this.shutdown, this);

            this.loadingScreen.updateProgress(1.0);

            // Мінімальний час показу екрану завантаження - 4 секунди
            // Прогрес бар залишається видимим на 100% поки не мине час
            const MIN_LOADING_TIME = 4000;
            const elapsedTime = Date.now() - this.loadingStartTime;
            const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

            // Чекаємо залишок часу (прогрес бар на 100% видимий), потім гра ОДРАЗУ стартує
            if (remainingTime > 0) {
                this.time.delayedCall(remainingTime, () => {
                    this.finalizeLoading();
                });
            } else {
                this.finalizeLoading();
            }

        } catch (error) {
            console.error('[GameScene] Critical Initialization Error:', error);
            const errorText = `Помилка ініціалізації:\n${error.message}`;
            this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2,
                errorText, { fontSize: '20px', fill: '#ff0000', align: 'center' })
                .setOrigin(0.5);
        }
    }

    yieldControl() {
        return new Promise(resolve => this.time.delayedCall(1, resolve));
    }

    initWorldBounds() {
        this.worldWidth = 4000;
        this.worldHeight = 4000;
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    }

    finalizeLoading() {
        if (this.loadingScreen) {
            this.loadingScreen.destroy();
            this.loadingScreen = null;
        }

        // Без fadeIn - одразу готові до гри
        this.isGameReady = true;
        this.isPaused = false;
    }

    // Зберігаємо старі допоміжні методи, але видаляємо initCameras і spawnPlayer, якщо вони вже є далі
    // (Але в оригіналі їх не було видно в snippet, тому я сподіваюсь що вони є або я їх додам якщо треба)

    initCameras() {
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.setDeadzone(100, 100);
    }

    spawnPlayer() {
        const startPos = this.findWalkablePosition(this.worldWidth / 2, this.worldHeight / 2);
        this.player = new Player(this, startPos.x, startPos.y);
        this.player.lastKioskCollisionTime = 0;
    }

    setupCameraFollow() {
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    }



    setupInput() {
        // Теж саме
    }

    // Нові системи прогресії

    setupPauseControls() {
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.inSettingsMenu = false;
        this.escKey.on('down', () => {
            if (this.inSettingsMenu) {
                this.closeSettingsMenu();
            } else if (!this.isPaused && !this.captureSystem?.isMaxed()) {
                this.pauseGame();
            } else if (this.isPaused) {
                this.resumeGame();
            }
        });
        this.game.events.on('blur', this.handleWindowBlur, this);
        this.game.events.on('focus', this.handleWindowFocus, this);
        this.game.events.on('hidden', this.handleWindowBlur, this);
        this.game.events.on('visible', this.handleWindowFocus, this);
    }

    /**
     * Налаштовує події для систем прогресії
     */
    setupProgressionEvents() {
        // Подія підкріплення ворогів
        this.events.on('spawn-reinforcement', this.onSpawnReinforcement, this);

        // Подія госпіталізації ворога
        this.events.on('enemy-hospitalized', this.onEnemyHospitalized, this);

        // Подія активації множника грошей
        this.events.on('money-multiplier-activated', this.onMoneyMultiplierActivated, this);

        // Подія деактивації множника грошей
        this.events.on('money-multiplier-deactivated', this.onMoneyMultiplierDeactivated, this);

        // Listen for resume event (e.g. returning from Shop)
        this.events.on('resume', () => {
            if (this.pauseMenu) {
                this.pauseMenu.setVisible(true);
            }
        });
    }

    onSpawnReinforcement(data) {
        // Створюємо ворогів по черзі: 1 Blocker, 1 Sticker, 1 Blocker, 1 Sticker...
        const types = ['Blocker', 'Sticker'];
        for (let i = 0; i < data.count; i++) {
            const type = types[i % types.length];  // Чергуємо типи
            const chaser = this.spawnChaser(type);
            if (chaser) {
                // Success spawn logic if needed
            }
        }
    }

    onEnemyHospitalized(enemy) {
        // Показуємо повідомлення
        const messages = GAME_CONFIG.HOSPITAL.MESSAGES;
        const message = messages[Math.floor(Math.random() * messages.length)];
        this.notificationManager.show(
            message,
            GAME_CONFIG.NOTIFICATIONS.PRIORITY.MEDIUM
        );

        // Зменшуємо лічильник ворогів
        if (this.enemyDifficultyController) {
            this.enemyDifficultyController.decrementEnemyCount();
        }

        // Видаляємо ворога зі списку
        const index = this.chasers.indexOf(enemy);
        if (index > -1) {
            this.chasers.splice(index, 1);
        }
    }

    onMoneyMultiplierActivated(multiplier) {
        this.moneyMultiplier = multiplier;
    }

    onMoneyMultiplierDeactivated() {
        this.moneyMultiplier = 1;
    }
    handleWindowBlur() {
        if (!this.isPaused && !this.captureSystem?.isMaxed()) {
            this.pauseGame();
            this.autoPausedByBlur = true;
        }
    }
    handleWindowFocus() {
        if (this.autoPausedByBlur) {
            this.autoPausedByBlur = false;
        }
    }
    pauseGame() {
        if (this.isPaused) return;
        this.isPaused = true;
        this.physics.pause();
        if (this.audioManager) {
            this.audioManager.pauseMusic();
            this.audioManager.pauseSounds();
        }

        // Зупиняємо нові системи прогресії
        if (this.enemyDifficultyController) {
            this.enemyDifficultyController.pause();
        }
        if (this.moneyDropController) {
            this.moneyDropController.pause();
        }
        if (this.moneyMultiplierController) {
            this.moneyMultiplierController.pause();
        }
        if (this.moneyMultiplierController) {
            this.moneyMultiplierController.pause();
        }
        // BonusManager handles pause via update loop check automatically, 
        // or we can add explicit pause if needed later.

        this.createPauseMenu();
    }
    resumeGame() {
        if (!this.isPaused) return;
        this.isPaused = false;
        this.physics.resume();
        if (this.audioManager) {
            this.audioManager.resumeMusic();
            this.audioManager.resumeSounds();
        }

        // Відновлюємо нові системи прогресії
        if (this.enemyDifficultyController) {
            this.enemyDifficultyController.resume();
        }
        if (this.moneyDropController) {
            this.moneyDropController.resume();
        }
        if (this.moneyMultiplierController) {
            this.moneyMultiplierController.resume();
        }
        if (this.moneyMultiplierController) {
            this.moneyMultiplierController.resume();
        }
        // BonusManager resume logic not strictly needed if valid update loop check exists.

        if (this.pauseMenu) {
            if (this.pauseMenu.overlay) {
                this.pauseMenu.overlay.destroy();
            }
            this.pauseMenu.destroy();
            this.pauseMenu = null;
        }
    }
    createPauseMenu() {
        if (this.pauseMenu) return;
        const { width, height } = this.cameras.main;
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        overlay.setDepth(1000);
        overlay.setScrollFactor(0);
        this.pauseMenu = this.add.container(width / 2, height / 2);
        this.pauseMenu.setDepth(1001);
        this.pauseMenu.setScrollFactor(0);
        this.pauseMenu.overlay = overlay;
        const title = this.add.text(0, -180, 'ПАУЗА', {
            fontSize: '72px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0);
        this.pauseMenu.add(title);
        const menuBoxWidth = 420;
        const menuBoxHeight = 380;
        const menuBox = this.add.rectangle(0, 0, menuBoxWidth, menuBoxHeight, 0x808080, 0.9);
        menuBox.setStrokeStyle(3, 0x606060);
        menuBox.setScrollFactor(0);
        this.pauseMenu.add(menuBox);
        const buttonWidth = 300;
        const buttonHeight = 60;
        const buttonSpacing = 70;
        const startY = -buttonSpacing * 1.5;
        const resumeButton = this.createPauseButton(0, startY, buttonWidth, buttonHeight, 'ПРОДОВЖИТИ', () => {
            this.resumeGame();
        });
        this.pauseMenu.add(resumeButton);

        const shopButton = this.createPauseButton(0, startY + buttonSpacing, buttonWidth, buttonHeight, 'МАГАЗИН', () => {
            this.scene.pause(); // Pause GameScene update loop explicitly (though launch might do it depending on config, explicit is safer)
            this.scene.launch('ShopScene', { returnScene: 'GameScene', isOverlay: true });
            // We don't destroy pause menu, we keep it for when we return
            if (this.pauseMenu) {
                this.pauseMenu.setVisible(false); // Optionally hide it so it doesn't bleed through transparency
            }
        });
        this.pauseMenu.add(shopButton);

        const settingsButton = this.createPauseButton(0, startY + buttonSpacing * 2, buttonWidth, buttonHeight, 'НАЛАШТУВАННЯ', () => {
            this.createPauseSettingsMenu();
        });
        this.pauseMenu.add(settingsButton);

        const saveAndExitButton = this.createPauseButton(0, startY + buttonSpacing * 3, buttonWidth, buttonHeight, 'ЗБЕРЕГТИ І ВИЙТИ', () => {
            if (this.audioManager) {
                this.audioManager.stopMusic();
            }
            this.resumeGame();
            this.scene.start('MenuScene');
        });
        this.pauseMenu.add(saveAndExitButton);
    }
    createPauseButton(x, y, width, height, text, callback) {
        const buttonContainer = this.add.container(x, y);
        buttonContainer.setScrollFactor(0);
        const shadow = this.add.rectangle(2, 2, width, height, 0x000000, 0.5);
        shadow.setScrollFactor(0);
        buttonContainer.add(shadow);
        const button = this.add.rectangle(0, 0, width, height, 0x606060, 0.95)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x404040)
            .setScrollFactor(0);
        buttonContainer.add(button);
        const buttonText = this.add.text(0, 0, text, {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0);
        buttonContainer.add(buttonText);
        button.on('pointerover', () => {
            if (this.audioManager) {
                const existingHover = this.audioManager.getSound('menu_hover_current');
                if (existingHover && existingHover.isPlaying) {
                    existingHover.stop();
                }
                this.audioManager.playSound('menu_hover_current', false, null, 'menu_hover');
            }
            button.setFillStyle(0x707070);
            buttonContainer.setScale(1.05);
        });
        button.on('pointerout', () => {
            button.setFillStyle(0x606060);
            buttonContainer.setScale(1);
        });
        button.on('pointerdown', () => {
            if (this.audioManager) {
                this.audioManager.playSound('menu_choise', false);
            }
            if (callback) callback();
        });
        buttonContainer.button = button;
        buttonContainer.shadow = shadow;
        buttonContainer.text = buttonText;
        return buttonContainer;
    }
    createPauseSettingsMenu() {
        const { width, height } = this.cameras.main;
        this.inSettingsMenu = true;
        if (this.pauseMenu) {
            this.pauseMenu.setVisible(false);
        }
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
            0.4
        ).setScrollFactor(0).setDepth(1002);
        const settingsBox = this.add.rectangle(
            settingsBoxX,
            settingsBoxY,
            settingsWidth,
            settingsHeight,
            0x808080,
            0.9
        ).setStrokeStyle(3, 0x606060).setScrollFactor(0).setDepth(1002);
        const title = this.add.text(settingsBoxX, settingsBoxY - 150, 'НАЛАШТУВАННЯ', {
            fontSize: '48px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1003);
        const musicLabelY = settingsBoxY - 100;
        const musicLabel = this.add.text(settingsBoxX - 200, musicLabelY, 'МУЗИКА', {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1003);
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
        ).setScrollFactor(0).setDepth(1003);
        const currentVolume = this.audioManager ? this.audioManager.getMusicVolume() : 0.5;
        const musicSliderFill = this.add.rectangle(
            sliderStartX,
            sliderY,
            sliderWidth * currentVolume,
            sliderHeight,
            0x00ff00
        ).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1004);
        const musicSliderHandle = this.add.circle(
            sliderStartX + sliderWidth * currentVolume,
            sliderY,
            15,
            0xffffff
        ).setScrollFactor(0).setDepth(1005);
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
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1003);
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
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1003)
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
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1003);
        const soundsSliderY = soundsLabelY + 50;
        const soundsSliderBg = this.add.rectangle(
            sliderStartX + sliderWidth / 2,
            soundsSliderY,
            sliderWidth,
            sliderHeight,
            0x333333
        ).setScrollFactor(0).setDepth(1003);
        const currentSoundsVolume = this.audioManager ? this.audioManager.getSoundsVolume() : 0.7;
        const soundsSliderFill = this.add.rectangle(
            sliderStartX,
            soundsSliderY,
            sliderWidth * currentSoundsVolume,
            sliderHeight,
            0x00ff00
        ).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1004);
        const soundsSliderHandle = this.add.circle(
            sliderStartX + sliderWidth * currentSoundsVolume,
            soundsSliderY,
            15,
            0xffffff
        ).setScrollFactor(0).setDepth(1005);
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
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1003);
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
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1003)
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
        const closeButton = this.createPauseButton(
            settingsBoxX,
            settingsBoxY + 180,
            300,
            60,
            'НАЗАД',
            () => {
                this.closeSettingsMenu();
            }
        );
        closeButton.setScrollFactor(0);
        closeButton.setDepth(1003);
        this.settingsMenuElements = {
            shadow: settingsShadow,
            box: settingsBox,
            title: title,
            musicLabel: musicLabel,
            musicSliderBg: musicSliderBg,
            musicSliderFill: musicSliderFill,
            musicSliderHandle: musicSliderHandle,
            musicVolumeText: musicVolumeText,
            musicToggleIcon: musicToggleIcon,
            soundsLabel: soundsLabel,
            soundsSliderBg: soundsSliderBg,
            soundsSliderFill: soundsSliderFill,
            soundsSliderHandle: soundsSliderHandle,
            soundsVolumeText: soundsVolumeText,
            soundsToggleIcon: soundsToggleIcon,
            closeButton: closeButton
        };
    }
    closeSettingsMenu() {
        if (this.settingsMenuElements) {
            Object.values(this.settingsMenuElements).forEach(element => {
                if (element && element.destroy) {
                    element.destroy();
                }
            });
            this.settingsMenuElements = null;
        }
        if (this.pauseMenu) {
            this.pauseMenu.setVisible(true);
        }
        this.inSettingsMenu = false;
    }
    spawnExchanges() {
        const exchangeCount = GAME_CONFIG.EXCHANGES.COUNT;
        const safeRadius = 200;
        let spawned = 0;
        let attempts = 0;
        const maxAttempts = exchangeCount * 50;
        while (spawned < exchangeCount && attempts < maxAttempts) {
            attempts++;
            const x = Phaser.Math.Between(150, this.worldWidth - 150);
            const y = Phaser.Math.Between(150, this.worldHeight - 150);
            if (this.player) {
                const distToPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
                if (distToPlayer < safeRadius) {
                    continue;
                }
            }
            if (!this.tilemap.isWalkable(x, y)) {
                continue;
            }
            const exchangeWidth = 60;
            const exchangeHeight = 60;
            const halfWidth = exchangeWidth / 2;
            const halfHeight = exchangeHeight / 2;
            const minTileX = Math.floor((x - halfWidth) / this.tilemap.tileSize);
            const maxTileX = Math.floor((x + halfWidth) / this.tilemap.tileSize);
            const minTileY = Math.floor((y - halfHeight) / this.tilemap.tileSize);
            const maxTileY = Math.floor((y + halfHeight) / this.tilemap.tileSize);
            let allTilesValid = true;
            for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
                for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
                    if (tileX < 0 || tileX >= this.tilemap.mapWidth ||
                        tileY < 0 || tileY >= this.tilemap.mapHeight) {
                        allTilesValid = false;
                        break;
                    }
                    let tileType = null;
                    if (this.tilemap.tileTypeMap &&
                        this.tilemap.tileTypeMap[tileY] &&
                        this.tilemap.tileTypeMap[tileY][tileX] !== undefined) {
                        tileType = this.tilemap.tileTypeMap[tileY][tileX];
                    } else {
                        allTilesValid = false;
                        break;
                    }
                    if (tileType !== this.tilemap.TILE_TYPES.SIDEWALK &&
                        tileType !== this.tilemap.TILE_TYPES.YARD) {
                        allTilesValid = false;
                        break;
                    }
                }
                if (!allTilesValid) break;
            }
            if (!allTilesValid) {
                continue;
            }
            let tooClose = false;
            for (const exchange of this.exchanges) {
                const distance = Phaser.Math.Distance.Between(x, y, exchange.x, exchange.y);
                const minDistance = 300;
                if (distance < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) {
                continue;
            }
            for (const obstacle of this.obstacles) {
                const distance = Phaser.Math.Distance.Between(x, y, obstacle.x, obstacle.y);
                if (distance < 100) {
                    tooClose = true;
                    break;
                }
            }
            if (this.tilemap.activeKiosks) {
                for (const kiosk of this.tilemap.activeKiosks) {
                    const distance = Phaser.Math.Distance.Between(x, y, kiosk.worldX, kiosk.worldY);
                    if (distance < 100) {
                        tooClose = true;
                        break;
                    }
                }
            }
            for (const pickup of this.pickups) {
                if (pickup && pickup.active) {
                    const distance = Phaser.Math.Distance.Between(x, y, pickup.x, pickup.y);
                    if (distance < 80) {
                        tooClose = true;
                        break;
                    }
                }
            }
            if (tooClose) {
                continue;
            }
            try {
                const exchange = new Exchange(this, x, y);
                this.exchanges.push(exchange);
                spawned++;
            } catch (error) {
            }
        }
    }
    spawnObstacles() {
        const obstacleCounts = {
            'PuddleSlip': 0,
            'TapeGate': 0,
            'Car': 0
        };
        const safeRadius = 90;
        for (const [type, count] of Object.entries(obstacleCounts)) {
            if (count === 0) continue;
            let spawned = 0;
            let attempts = 0;
            const maxAttempts = count * 20;
            while (spawned < count && attempts < maxAttempts) {
                attempts++;
                const x = Phaser.Math.Between(100, this.worldWidth - 100);
                const y = Phaser.Math.Between(100, this.worldHeight - 100);
                if (this.player) {
                    const distToPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
                    if (distToPlayer < safeRadius) {
                        continue;
                    }
                }
                if (!this.tilemap.isWalkable(x, y)) {
                    continue;
                }
                let tooClose = false;
                for (const obstacle of this.obstacles) {
                    const distance = Phaser.Math.Distance.Between(x, y, obstacle.x, obstacle.y);
                    const minDistance = 150;
                    if (distance < minDistance) {
                        tooClose = true;
                        break;
                    }
                }
                if (tooClose) {
                    continue;
                }
                let obstacle;
                try {
                    switch (type) {
                        case 'TapeGate':
                            obstacle = new TapeGate(this, x, y);
                            break;
                        default:
                            continue;
                    }
                    if (obstacle) {
                        this.obstacles.push(obstacle);
                        spawned++;
                    }
                } catch (error) {
                }
            }
        }
        this.spawnPuddles();
        this.puddleUpdateTimer = 0;
        this.puddleUpdateInterval = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.RESPAWN_INTERVAL;
        this.spawnCars();
        this.carSpawnTimer = 0;
        this.carSpawnInterval = 1000;
    }
    spawnPuddles() {
        const puddlesToRemove = this.obstacles.filter(obs => obs instanceof PuddleSlip);
        for (const puddle of puddlesToRemove) {
            if (puddle.active) {
                puddle.destroy();
            }
            const index = this.obstacles.indexOf(puddle);
            if (index > -1) {
                this.obstacles.splice(index, 1);
            }
        }
        const minCount = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.MIN_COUNT;
        const maxCount = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.MAX_COUNT;
        const targetCount = Phaser.Math.Between(minCount, maxCount);
        const sizeOptions = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.SIZE_OPTIONS;
        const tileSize = 32;
        let spawned = 0;
        let attempts = 0;
        const maxAttempts = targetCount * 50;
        while (spawned < targetCount && attempts < maxAttempts) {
            attempts++;
            const sizeInTiles = Phaser.Math.RND.pick(sizeOptions);
            const x = Phaser.Math.Between(50, this.worldWidth - 50);
            const y = Phaser.Math.Between(50, this.worldHeight - 50);
            if (!this.tilemap.isAreaRoadOrSidewalk(x, y, sizeInTiles)) {
                continue;
            }
            if (this.player) {
                const distToPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
                if (distToPlayer < 100) {
                    continue;
                }
            }
            let tooClose = false;
            for (const obstacle of this.obstacles) {
                if (obstacle instanceof PuddleSlip) continue;
                const distance = Phaser.Math.Distance.Between(x, y, obstacle.x, obstacle.y);
                if (distance < 100) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) {
                continue;
            }
            try {
                const puddle = new PuddleSlip(this, x, y, sizeInTiles);
                if (puddle) {
                    this.obstacles.push(puddle);
                    spawned++;
                }
            } catch (error) {
            }
        }
    }
    spawnCars() {
        const carTextures = GAME_CONFIG.OBSTACLES.MOVING_BUS.CAR_TEXTURES || [];
        const availableTextures = carTextures.filter(key => this.textures.exists(key));
        if (availableTextures.length === 0) {
            return;
        }
        const carsToRemove = this.obstacles.filter(obs => obs instanceof Car);
        for (const car of carsToRemove) {
            if (car.active) {
                car.destroy();
            }
            const index = this.obstacles.indexOf(car);
            if (index > -1) {
                this.obstacles.splice(index, 1);
            }
        }
        const minCount = GAME_CONFIG.OBSTACLES.MOVING_BUS.MIN_COUNT;
        const maxCount = GAME_CONFIG.OBSTACLES.MOVING_BUS.MAX_COUNT;
        const targetCount = Phaser.Math.Between(minCount, maxCount);
        for (let i = 0; i < targetCount; i++) {
            this.spawnSingleCar();
        }
    }
    spawnSingleCar() {
        if (!this.tilemap) {
            return false;
        }
        let attempts = 0;
        const maxAttempts = 200;
        let spawnX, spawnY;
        let foundRoad = false;
        const config = GAME_CONFIG.OBSTACLES.MOVING_BUS;
        const minDistanceFromOtherCars = config.MIN_DISTANCE_BETWEEN_CARS || 60;
        while (attempts < maxAttempts && !foundRoad) {
            attempts++;
            spawnX = Phaser.Math.Between(50, this.worldWidth - 50);
            spawnY = Phaser.Math.Between(50, this.worldHeight - 50);
            if (!this.tilemap.isRoad(spawnX, spawnY) || this.tilemap.hasCollision(spawnX, spawnY)) {
                continue;
            }
            let tooCloseToOtherCar = false;
            const existingCars = this.obstacles.filter(obs => obs instanceof Car && obs.active);
            for (const car of existingCars) {
                const distance = Phaser.Math.Distance.Between(spawnX, spawnY, car.x, car.y);
                if (distance < minDistanceFromOtherCars) {
                    tooCloseToOtherCar = true;
                    break;
                }
            }
            if (!tooCloseToOtherCar) {
                foundRoad = true;
            }
        }
        if (!foundRoad) {
            return false;
        }
        const carTextures = GAME_CONFIG.OBSTACLES.MOVING_BUS.CAR_TEXTURES || [];
        const availableTextures = carTextures.filter(key => this.textures.exists(key));
        if (availableTextures.length === 0) {
            return false;
        }
        const textureKey = availableTextures[this.carTextureIndex % availableTextures.length];
        this.carTextureIndex++;
        try {
            // Use Object Pool
            const car = this.carPool.get(spawnX, spawnY, textureKey);
            if (car) {
                // If it's a reused car, we need to reset it. 
                // If it's new, the constructor ran, but we can call reset to be safe and uniform.
                // However, constructor might have different arguments than get(). 
                // Group.get() passes (x, y, key, frame, visible) to create/constructor if not found.
                // Our Car constructor is (scene, x, y, textureKey).
                // Wait, Group.get(x, y) might not pass textureKey to constructor correctly if strict.
                // But we can just call reset() immediately after.

                car.reset(spawnX, spawnY, textureKey);

                // Ensure it's in the obstacles array for collision/update logic
                if (!this.obstacles.includes(car)) {
                    this.obstacles.push(car);
                }
                return true;
            }
        } catch (error) {
        }
        return false;
    }
    setupObstacleCollisions() {
        this.physics.add.overlap(
            this.player,
            this.obstacles,
            this.handleObstacleCollision,
            null,
            this
        );
    }
    setupPickupCollisions() {
    }
    setupExchangeCollisions() {
        if (this.exchanges && this.exchanges.length > 0) {
            this.physics.add.collider(
                this.player,
                this.exchanges,
                null,
                null,
                this
            );
        }
    }
    getRiskMultiplier() {
        const capturePercent = this.captureSystem.getCapturePercent() * 100;
        for (const threshold of GAME_CONFIG.RISK_MULTIPLIER.THRESHOLDS) {
            if (capturePercent >= threshold.capture) {
                return threshold.multiplier;
            }
        }
        return GAME_CONFIG.RISK_MULTIPLIER.DEFAULT;
    }
    handlePickupCollision(player, pickup) {
        if (!pickup || !pickup.active || pickup.collected) return;
        pickup.collected = true;
        if (pickup instanceof Coin && pickup.value !== undefined) {
            // Застосовуємо множники: ризик + money multiplier
            const riskMultiplier = this.getRiskMultiplier();
            const totalMultiplier = riskMultiplier * this.moneyMultiplier;
            const earnedMoney = pickup.value * totalMultiplier;
            this.runMoney += earnedMoney;

            // Показуємо повідомлення про множник якщо він активний
            if (this.moneyMultiplier > 1) {
            }

            if (this.audioManager) {
                this.audioManager.playSound('money_pickup', false, null, 'money');
            }
            pickup.collect();
            const index = this.pickups.indexOf(pickup);
            if (index > -1) {
                this.pickups.splice(index, 1);
            }
        }
        else if (pickup.applyEffect) {
            if (this.audioManager) {
                this.audioManager.playSound('pickup_bonus', false, 0.6, 'pickup');
            }
            pickup.applyEffect(player, this);
            if (pickup.bonusType === 'SMOKE_CLOUD') {
                this.lastSmokeCloudPickupTime = this.time.now;
            } else if (pickup.bonusType === 'SCOOTER') {
                this.lastScooterPickupTime = this.time.now;
            }
            pickup.collect();
            const index = this.pickups.indexOf(pickup);
            if (index > -1) {
                this.pickups.splice(index, 1);
            }
        }
    }
    handleObstacleCollision(player, obstacle) {
        if (!obstacle.active) return;
        if (obstacle instanceof Car) {
            obstacle.onCollisionWithEntity(player);
            return;
        }
        if (obstacle.onPlayerCollision) {
            obstacle.onPlayerCollision(player);
        }
    }
    setupCarCollisions() {
    }
    handleCarChaserCollision(car, chaser) {
        if (!car.active || !chaser || !chaser.active) return;
        car.onCollisionWithEntity(chaser);
    }
    checkCarCollisions() {
        const cars = this.obstacles.filter(obs => obs instanceof Car && obs.active);
        if (cars.length === 0) return;
        const config = GAME_CONFIG.OBSTACLES.MOVING_BUS;
        const carCollisionRadius = config.COLLISION_RADIUS || 25;
        for (let i = 0; i < cars.length; i++) {
            const car1 = cars[i];
            if (!car1.active || car1.isAccident) continue;
            for (let j = i + 1; j < cars.length; j++) {
                const car2 = cars[j];
                if (!car2.active || car2.isAccident) continue;
                const distance = Phaser.Math.Distance.Between(car1.x, car1.y, car2.x, car2.y);
                const minDistance = carCollisionRadius * 2;
                if (distance < minDistance) {
                    car1.handleAccident(car2);
                }
            }
        }
        for (const car of cars) {
            if (!car.active || car.isAccident) continue;
            if (this.player && this.player.active && !this.player.isFrozen) {
                const distance = Phaser.Math.Distance.Between(car.x, car.y, this.player.x, this.player.y);
                const minDistance = 40;
                if (distance < minDistance) {
                    car.onCollisionWithEntity(this.player);
                }
            }
            for (const chaser of this.chasers) {
                if (!chaser || !chaser.active || chaser.isFrozen) continue;
                const distance = Phaser.Math.Distance.Between(car.x, car.y, chaser.x, chaser.y);
                const minDistance = 40;
                if (distance < minDistance) {
                    car.onCollisionWithEntity(chaser);
                }
            }
        }
    }

    logDiagnostics(time) {
        if (this.debugLogTimer === undefined) this.debugLogTimer = 0;
        if (time > this.debugLogTimer) {

            this.debugLogTimer = time + 5000; // Log every 5 seconds
        }
    }
    spawnInitialChasers() {
        const initialCount = GAME_CONFIG.CHASERS.SPAWN.INITIAL_COUNT;
        const blockerCount = Math.floor(initialCount / 2);
        const stickerCount = initialCount - blockerCount;


        let successCount = 0;
        for (let i = 0; i < blockerCount; i++) {
            const chaser = this.spawnChaser('Blocker');
            if (chaser) successCount++;
        }
        for (let i = 0; i < stickerCount; i++) {
            const chaser = this.spawnChaser('Sticker');
            if (chaser) successCount++;
        }

    }
    spawnChaser(type) {
        const spawnConfig = GAME_CONFIG.CHASERS.SPAWN;
        let attempts = 0;
        const maxAttempts = spawnConfig.MAX_SPAWN_ATTEMPTS;
        let spawnX, spawnY;
        while (attempts < maxAttempts) {
            attempts++;
            const angle = Math.random() * Math.PI * 2;
            const distance = Phaser.Math.Between(
                spawnConfig.MIN_DISTANCE_FROM_PLAYER,
                spawnConfig.MAX_DISTANCE_FROM_PLAYER
            );
            spawnX = this.player.x + Math.cos(angle) * distance;
            spawnY = this.player.y + Math.sin(angle) * distance;
            if (spawnX < 50 || spawnX > this.worldWidth - 50 ||
                spawnY < 50 || spawnY > this.worldHeight - 50) {
                continue;
            }
            if (!this.tilemap.isWalkable(spawnX, spawnY)) {
                continue;
            }
            // Перевіряємо чи не будівля
            const tileType = this.tilemap.getTileType(spawnX, spawnY);
            if (tileType === this.tilemap.TILE_TYPES.BUILDING) {
                continue;
            }
            let tooClose = false;
            for (const chaser of this.chasers) {
                if (chaser && chaser.active) {
                    const dist = Phaser.Math.Distance.Between(spawnX, spawnY, chaser.x, chaser.y);
                    if (dist < spawnConfig.MIN_DISTANCE_BETWEEN) {
                        tooClose = true;
                        break;
                    }
                }
            }
            if (tooClose) {
                continue;
            }
            break;
        }
        if (attempts >= maxAttempts) {
            const angle = Math.random() * Math.PI * 2;
            const distance = (spawnConfig.MIN_DISTANCE_FROM_PLAYER + spawnConfig.MAX_DISTANCE_FROM_PLAYER) / 2;
            spawnX = this.player.x + Math.cos(angle) * distance;
            spawnY = this.player.y + Math.sin(angle) * distance;
            spawnX = Phaser.Math.Clamp(spawnX, 50, this.worldWidth - 50);
            spawnY = Phaser.Math.Clamp(spawnY, 50, this.worldHeight - 50);
            if (!this.tilemap.isWalkable(spawnX, spawnY)) {
                const fallbackPos = this.findWalkablePosition(spawnX, spawnY);
                spawnX = fallbackPos.x;
                spawnY = fallbackPos.y;
            }
        }

        // Фінальна перевірка
        if (!this.tilemap.isWalkable(spawnX, spawnY)) {
            return null;
        }

        // Перевіряємо чи не будівля
        const finalTileType = this.tilemap.getTileType(spawnX, spawnY);
        if (finalTileType === this.tilemap.TILE_TYPES.BUILDING) {
            return null;
        }
        let chaser;
        if (type === 'Blocker') {
            chaser = new ChaserBlocker(this, spawnX, spawnY);
        } else if (type === 'Sticker') {
            chaser = new ChaserSticker(this, spawnX, spawnY);
            chaser.setCaptureSystem(this.captureSystem);
        } else {
            return null;
        }

        // Налаштовуємо ворога
        chaser.setTarget(this.player);
        chaser.setPathfindingSystem(this.pathfindingSystem);

        if (chaser.setNavigationSystem && this.navigationSystem) {
            chaser.setNavigationSystem(this.navigationSystem);
        } else {
        }

        if (this.audioManager) {
            chaser.audioManager = this.audioManager;
        }

        this.chasers.push(chaser);
        return chaser;
    }
    findWalkablePosition(centerX, centerY) {
        const searchRadius = 50;
        const tile = this.tilemap.worldToTile(centerX, centerY);

        // Перевіряємо центральну позицію
        if (this.tilemap.isWalkable(centerX, centerY)) {
            const tileType = this.tilemap.getTileType(centerX, centerY);
            if (tileType !== this.tilemap.TILE_TYPES.BUILDING) {
                return { x: centerX, y: centerY };
            }
        }

        // Шукаємо навколо
        for (let radius = 1; radius <= searchRadius; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    const checkTile = { x: tile.x + dx, y: tile.y + dy };
                    const worldPos = this.tilemap.tileToWorld(checkTile.x, checkTile.y);

                    if (this.tilemap.isWalkable(worldPos.x, worldPos.y)) {
                        const tileType = this.tilemap.getTileType(worldPos.x, worldPos.y);
                        if (tileType !== this.tilemap.TILE_TYPES.BUILDING) {
                            return worldPos;
                        }
                    }
                }
            }
        }

        return { x: centerX, y: centerY };
    }
    update(time, delta) {
        // Оновлюємо екран завантаження якщо він є, і БЛОКУЄМО інше
        if (this.loadingScreen) {
            this.loadingScreen.update();
            return;
        }

        // Якщо гра ще не готова (наприклад, між destroy лоадера і isGameReady=true), теж виходимо
        if (!this.isGameReady) return;

        // Перевіряємо чи можна завершити завантаження (мінімум 3 секунди)
        // Цей блок ми видаляємо, бо логіка завершення тепер у startAsyncInitialization -> finalizeLoading

        if (this.isPaused) {
            return;
        }
        if (this.player) {
            this.player.update(time, delta);
            this.checkTilemapCollisions();
        }
        if (this.captureSystem && this.player) {
            this.captureSystem.update(delta, this.player, this.chasers);
            if (this.captureSystem.isMaxed()) {
                this.handleGameOver();
            }
        }

        // Оновлюємо нові системи прогресії
        if (this.bonusManager) {
            this.bonusManager.update(delta, time);
        }
        if (this.moneyMultiplierController) {
            this.moneyMultiplierController.update(delta);
        }

        this.checkPoliceSiren(time);
        this.updateRiverSound();
        this.timeSurvived += delta / 1000;
        if (this.timeSurvived >= this.nextBonusTime) {
            const earnedSinceLastBonus = this.currentBankedMoney - this.lastBonusBankAmount;
            const bonusAmount = Math.floor(earnedSinceLastBonus * GAME_CONFIG.SURVIVAL_BONUS.PERCENTAGE);
            if (bonusAmount > 0) {
                this.survivalBonus += bonusAmount;
                this.currentBankedMoney += bonusAmount;
            }
            this.lastBonusBankAmount = this.currentBankedMoney;
            this.nextBonusTime += GAME_CONFIG.SURVIVAL_BONUS.INTERVAL / 1000;
        }
        for (const obstacle of this.obstacles) {
            if (obstacle.active && obstacle.update) {
                obstacle.update(delta);
            }
        }
        for (const pickup of this.pickups) {
            if (pickup.active && pickup.update) {
                pickup.update(delta, this.player);
            }
        }
        this.pickupSpawnTimer += delta;
        if (this.pickupSpawnTimer >= this.pickupSpawnInterval) {
            this.pickupSpawnTimer = 0;
            this.maintainPickups();
        }
        this.cleanupPickups(time);
        if (this.pickups.length > 0 && this.player) {
            const pickupRadius = 40;
            for (let i = this.pickups.length - 1; i >= 0; i--) {
                const pickup = this.pickups[i];
                if (!pickup || !pickup.active || pickup.collected) continue;
                const dx = this.player.x - pickup.x;
                const dy = this.player.y - pickup.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < pickupRadius) {
                    this.handlePickupCollision(this.player, pickup);
                }
            }
        }
        if (this.exchanges.length > 0 && this.player && !this.player.isFrozen) {
            const exchangeRadius = 70;
            for (const exchange of this.exchanges) {
                if (!exchange || !exchange.active) continue;
                const dx = this.player.x - exchange.x;
                const dy = this.player.y - exchange.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < exchangeRadius) {
                    exchange.exchange(this.player, this);
                }
            }
        }
        this.pathRecalculationQueue.length = 0;
        for (const chaser of this.chasers) {
            if (chaser && chaser.active && typeof chaser.shouldRecalculatePath === 'function') {
                if (chaser.shouldRecalculatePath(time)) {
                    this.pathRecalculationQueue.push(chaser);
                }
            }
        }
        const recalculationsThisTick = Math.min(
            this.pathRecalculationQueue.length,
            this.maxPathRecalculationsPerTick
        );
        this.pathRecalculationQueue.sort(() => Math.random() - 0.5);
        for (let i = 0; i < recalculationsThisTick; i++) {
            const chaser = this.pathRecalculationQueue[i];
            if (chaser && chaser.active && typeof chaser.calculatePath === 'function') {
                chaser.calculatePath(time);
            }
        }
        for (const chaser of this.chasers) {
            if (chaser && chaser.active) {
                if (typeof chaser.calculateSeparationForce === 'function') {
                    chaser.calculateSeparationForce(this.chasers);
                }
                if (typeof chaser.update === 'function') {
                    chaser.update(delta, time);
                }
                this.checkChaserTilemapCollisions(chaser);
                this.checkChaserChaserCollisions(chaser);
                if (chaser.type === 'Sticker' && this.player && this.player.active && !this.player.isFalling) {
                    const distance = Phaser.Math.Distance.Between(
                        this.player.x, this.player.y,
                        chaser.x, chaser.y
                    );
                    const hitDistance = 35;
                    if (distance < hitDistance && chaser.onHitPlayer) {
                        chaser.onHitPlayer();
                    }
                }
            }
        }
        if (this.hud) {
            this.hud.update(delta);
            // Optimization: Depths are already set high, no need to bringToTop every frame
        }
        if (this.minimap) {
            this.minimap.update();
        }
        if (this.tilemap && this.tilemap.updateVisibility) {
            this.tilemap.updateVisibility(time);
        }
        if (this.puddleUpdateTimer !== undefined) {
            this.puddleUpdateTimer += delta;
            if (this.puddleUpdateTimer >= this.puddleUpdateInterval) {
                this.puddleUpdateTimer = 0;
                this.spawnPuddles();
            }
        }
        if (this.carSpawnTimer !== undefined) {
            this.carSpawnTimer += delta;

            let activeCarCount = 0;
            // Optimization: Iterate manually to avoid creating a new array every frame
            for (let i = 0; i < this.obstacles.length; i++) {
                const obs = this.obstacles[i];
                if (obs instanceof Car && obs.active && obs.body && obs.scene) {
                    activeCarCount++;
                }
            }

            const minCars = GAME_CONFIG.OBSTACLES.MOVING_BUS.MIN_COUNT;
            const maxCars = GAME_CONFIG.OBSTACLES.MOVING_BUS.MAX_COUNT;
            if (activeCarCount < minCars && this.carSpawnTimer >= 100) {
                this.spawnSingleCar();
                this.carSpawnTimer = 0;
            }
            else if (activeCarCount < maxCars && this.carSpawnTimer >= this.carSpawnInterval) {
                this.carSpawnTimer = 0;
                this.spawnSingleCar();
            }
        }
        this.checkCarCollisions();
        this.cleanupEntities();
        this.updateRiverSound(time);
        this.logDiagnostics(time);
    }
    cleanupEntities() {
        // Cleanup Obstacles (Cars) - Swap and Pop for O(1) removal
        if (this.obstacles) {
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                const obstacle = this.obstacles[i];
                // Check if object is destroyed or invalid
                if (!obstacle || !obstacle.active || !obstacle.scene) {

                    // Specific cleanup for Car (Pooling)
                    if (obstacle instanceof Car) {
                        obstacle.deactivate();
                        this.carPool.killAndHide(obstacle);
                    } else {
                        // Regular destroy for non-pooled objects
                        if (obstacle && typeof obstacle.destroy === 'function') {
                            obstacle.destroy();
                        }
                    }

                    const lastIndex = this.obstacles.length - 1;
                    if (i !== lastIndex) {
                        this.obstacles[i] = this.obstacles[lastIndex];
                    }
                    this.obstacles.pop();
                }
            }
        }
    }

    checkChaserTilemapCollisions(chaser) {
        if (!this.tilemap || !chaser) return;
        const chaserX = chaser.x;
        const chaserY = chaser.y;
        const chaserRadius = GAME_CONFIG.CHASERS.COMMON.COLLISION_RADIUS;
        const checkPoints = [
            { x: chaserX, y: chaserY },
            { x: chaserX + chaserRadius, y: chaserY },
            { x: chaserX - chaserRadius, y: chaserY },
            { x: chaserX, y: chaserY + chaserRadius },
            { x: chaserX, y: chaserY - chaserRadius },
        ];
        let hasCollision = false;
        for (const point of checkPoints) {
            if (this.tilemap.hasCollision(point.x, point.y)) {
                hasCollision = true;
                break;
            }
        }
        if (hasCollision) {
            const currentVelocityX = chaser.body.velocity.x;
            const currentVelocityY = chaser.body.velocity.y;
            if (currentVelocityX !== 0) {
                const checkX = chaserX + (currentVelocityX > 0 ? chaserRadius : -chaserRadius);
                if (this.tilemap.hasCollision(checkX, chaserY)) {
                    chaser.body.setVelocityX(0);
                }
            }
            if (currentVelocityY !== 0) {
                const checkY = chaserY + (currentVelocityY > 0 ? chaserRadius : -chaserRadius);
                if (this.tilemap.hasCollision(chaserX, checkY)) {
                    chaser.body.setVelocityY(0);
                }
            }
        }
    }
    checkChaserChaserCollisions(chaser) {
        if (!chaser || !chaser.active) return;
        const minDistance = GAME_CONFIG.CHASERS.COMMON.MIN_DISTANCE_BETWEEN;
        const chaserRadius = GAME_CONFIG.CHASERS.COMMON.COLLISION_RADIUS;
        const chaserX = chaser.x;
        const chaserY = chaser.y;
        const currentVelX = chaser.body.velocity.x;
        const currentVelY = chaser.body.velocity.y;
        for (const other of this.chasers) {
            if (!other || !other.active || other === chaser) continue;
            const dx = chaserX - other.x;
            const dy = chaserY - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0 && distance < minDistance) {
                if (currentVelX !== 0) {
                    const nextX = chaserX + (currentVelX > 0 ? chaserRadius : -chaserRadius);
                    const distToOther = Math.sqrt((nextX - other.x) * (nextX - other.x) + (chaserY - other.y) * (chaserY - other.y));
                    if (distToOther < minDistance) {
                        chaser.body.setVelocityX(0);
                    }
                }
                if (currentVelY !== 0) {
                    const nextY = chaserY + (currentVelY > 0 ? chaserRadius : -chaserRadius);
                    const distToOther = Math.sqrt((chaserX - other.x) * (chaserX - other.x) + (nextY - other.y) * (nextY - other.y));
                    if (distToOther < minDistance) {
                        chaser.body.setVelocityY(0);
                    }
                }
            }
        }
    }
    checkTilemapCollisions() {
        if (!this.tilemap || !this.player) return;
        if (this.player.isFrozen) {
            const frozenPos = this.player.getFrozenPosition();
            if (frozenPos) {
                this.player.setPosition(frozenPos.x, frozenPos.y);
            }
            this.player.body.setVelocity(0, 0);
            return;
        }
        const playerX = this.player.x;
        const playerY = this.player.y;
        const playerRadius = 15;
        const checkPoints = [
            { x: playerX, y: playerY },
            { x: playerX + playerRadius, y: playerY },
            { x: playerX - playerRadius, y: playerY },
            { x: playerX, y: playerY + playerRadius },
            { x: playerX, y: playerY - playerRadius },
        ];
        let hasCollision = false;
        let isKioskCollision = false;
        let collidedKiosk = null;
        if (this.tilemap.activeKiosks && this.tilemap.activeKiosks.length > 0) {
            const kioskRadius = 20;
            const playerRadius = 15;
            for (const kiosk of this.tilemap.activeKiosks) {
                if (!kiosk.sprite || !kiosk.sprite.active) continue;
                const distance = Phaser.Math.Distance.Between(playerX, playerY, kiosk.worldX, kiosk.worldY);
                const minDistance = kioskRadius + playerRadius;
                if (distance < minDistance) {
                    isKioskCollision = true;
                    hasCollision = true;
                    collidedKiosk = kiosk;
                    break;
                }
            }
        }
        if (!isKioskCollision) {
            for (const point of checkPoints) {
                if (this.tilemap.hasCollision(point.x, point.y)) {
                    hasCollision = true;
                    break;
                }
            }
        }
        if (isKioskCollision && collidedKiosk) {
            const kiosk = collidedKiosk;
            if (kiosk) {
                const currentTime = this.time.now;
                const timeSinceLastCollision = currentTime - this.player.lastKioskCollisionTime;
                if (timeSinceLastCollision >= GAME_CONFIG.KIOSKS.COOLDOWN) {
                    const currentPlayerX = this.player.x;
                    const currentPlayerY = this.player.y;
                    this.player.restoreStamina();
                    this.player.freeze(GAME_CONFIG.KIOSKS.FREEZE_DURATION, 'drink');
                    this.player.lastKioskCollisionTime = currentTime;
                    this.player.body.setVelocity(0, 0);
                    this.player.setPosition(currentPlayerX, currentPlayerY);
                    if (this.player.isFrozen) {
                        this.player.frozenPosition = { x: currentPlayerX, y: currentPlayerY };
                    }
                    this.showKioskMessage('Енергію відновлено, біжимо далі!', currentPlayerX, currentPlayerY);
                    const disappearDelay = GAME_CONFIG.KIOSKS.FREEZE_DURATION - GAME_CONFIG.KIOSKS.DISAPPEAR_BEFORE_FREEZE_END;
                    const respawnDelay = GAME_CONFIG.KIOSKS.RESPAWN_DELAY;
                    this.time.delayedCall(disappearDelay, () => {
                        this.removeKiosk(kiosk.tileX, kiosk.tileY);
                    });
                    this.time.delayedCall(disappearDelay + respawnDelay, () => {
                        this.tilemap.spawnKioskAtRandomPosition();
                        if (this.minimap) {
                            this.minimap.refresh();
                        }
                    });
                } else {
                    this.player.body.setVelocity(0, 0);
                }
            }
        } else if (hasCollision) {
            this.blockMovementIntoBuilding(playerX, playerY);
        }
    }
    blockMovementIntoBuilding(playerX, playerY) {
        const velocityX = this.player.body.velocity.x;
        const velocityY = this.player.body.velocity.y;
        const playerRadius = 15;
        let blockedX = velocityX;
        let blockedY = velocityY;
        if (velocityX > 0) {
            if (this.tilemap.hasCollision(playerX + playerRadius, playerY)) {
                blockedX = 0;
            }
        } else if (velocityX < 0) {
            if (this.tilemap.hasCollision(playerX - playerRadius, playerY)) {
                blockedX = 0;
            }
        }
        if (velocityY > 0) {
            if (this.tilemap.hasCollision(playerX, playerY + playerRadius)) {
                blockedY = 0;
            }
        } else if (velocityY < 0) {
            if (this.tilemap.hasCollision(playerX, playerY - playerRadius)) {
                blockedY = 0;
            }
        }
        this.player.body.setVelocity(blockedX, blockedY);
    }
    removeKiosk(tileX, tileY) {
        this.tilemap.removeKiosk(tileX, tileY);
    }
    showKioskMessage(text, x, y) {
        // Create text object only if it doesn't exist
        if (!this.kioskMessageText) {
            this.kioskMessageText = this.add.text(0, 0, '', {
                fontSize: '20px',
                fill: '#00FF00',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }).setOrigin(0.5).setDepth(1000).setAlpha(0);
        }

        // Reuse the text object
        this.kioskMessageText.setText(text);
        this.kioskMessageText.setPosition(x, y - 60);
        this.kioskMessageText.setAlpha(0);
        this.kioskMessageText.setVisible(true);

        // Stop any existing tweens on this object
        this.tweens.killTweensOf(this.kioskMessageText);

        this.tweens.add({
            targets: this.kioskMessageText,
            alpha: 1,
            y: y - 80,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.time.delayedCall(2000, () => {
                    this.tweens.add({
                        targets: this.kioskMessageText,
                        alpha: 0,
                        y: y - 100,
                        duration: 500,
                        ease: 'Power2',
                        onComplete: () => {
                            if (this.kioskMessageText) {
                                this.kioskMessageText.setVisible(false);
                            }
                        }
                    });
                });
            }
        });
    }
    pushPlayerAwayFromKiosk() {
        const playerX = this.player.x;
        const playerY = this.player.y;
        let nearestKiosk = null;
        let minDistance = Infinity;
        if (this.tilemap.activeKiosks && this.tilemap.activeKiosks.length > 0) {
            for (const kiosk of this.tilemap.activeKiosks) {
                if (!kiosk.sprite || !kiosk.sprite.active) continue;
                const distance = Phaser.Math.Distance.Between(playerX, playerY, kiosk.worldX, kiosk.worldY);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestKiosk = kiosk;
                }
            }
        }
        if (!nearestKiosk) return;
        const dx = playerX - nearestKiosk.worldX;
        const dy = playerY - nearestKiosk.worldY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) return;
        const dirX = dx / distance;
        const dirY = dy / distance;
        const pushDistance = 40;
        const newX = nearestKiosk.worldX + dirX * (pushDistance + 20);
        const newY = nearestKiosk.worldY + dirY * (pushDistance + 20);
        if (this.tilemap.isWalkable(newX, newY)) {
            this.player.setPosition(newX, newY);
            if (this.player.isFrozen) {
                this.player.frozenPosition = { x: newX, y: newY };
            }
        } else {
            const tile = this.tilemap.worldToTile(playerX, playerY);
            const directions = [
                { x: 0, y: -1 }, { x: 0, y: 1 },
                { x: -1, y: 0 }, { x: 1, y: 0 },
                { x: -1, y: -1 }, { x: 1, y: -1 },
                { x: -1, y: 1 }, { x: 1, y: 1 }
            ];
            for (let radius = 1; radius <= 3; radius++) {
                for (const dir of directions) {
                    const checkTile = {
                        x: tile.x + dir.x * radius,
                        y: tile.y + dir.y * radius
                    };
                    const worldPos = this.tilemap.tileToWorld(checkTile.x, checkTile.y);
                    let isKiosk = false;
                    if (this.tilemap.activeKiosks) {
                        for (const kiosk of this.tilemap.activeKiosks) {
                            if (kiosk.tileX === checkTile.x && kiosk.tileY === checkTile.y) {
                                isKiosk = true;
                                break;
                            }
                        }
                    }
                    if (isKiosk) continue;
                    if (!this.tilemap.hasCollision(worldPos.x, worldPos.y)) {
                        this.player.setPosition(worldPos.x, worldPos.y);
                        if (this.player.isFrozen) {
                            this.player.frozenPosition = { x: worldPos.x, y: worldPos.y };
                        }
                        return;
                    }
                }
            }
        }
    }
    spawnPickups() {
        const config = GAME_CONFIG.PICKUPS;
        const coinCount = config.COINS.MAX_COUNT_ON_MAP;
        for (let i = 0; i < coinCount; i++) {
            this.spawnCoin();
        }
        const scooterCount = config.SCOOTER.MAX_COUNT_ON_MAP;
        for (let i = 0; i < scooterCount; i++) {
            this.spawnScooter();
        }
        const smokeCount = config.SMOKE_CLOUD.MAX_COUNT_ON_MAP;
        for (let i = 0; i < smokeCount; i++) {
            this.spawnSmokeCloud();
        }
    }
    spawnCoin() {
        let attempts = 0;
        const maxAttempts = 100;
        while (attempts < maxAttempts) {
            attempts++;
            const x = Phaser.Math.Between(100, this.worldWidth - 100);
            const y = Phaser.Math.Between(100, this.worldHeight - 100);
            if (!this.tilemap.isWalkable(x, y)) {
                continue;
            }
            const tileType = this.tilemap.getTileType(x, y);
            if (tileType === this.tilemap.TILE_TYPES.BUILDING) {
                continue;
            }
            let tooClose = false;
            for (const pickup of this.pickups) {
                if (pickup && pickup.active) {
                    const distance = Phaser.Math.Distance.Between(x, y, pickup.x, pickup.y);
                    if (distance < 50) {
                        tooClose = true;
                        break;
                    }
                }
            }
            for (const exchange of this.exchanges) {
                if (exchange && exchange.active) {
                    const distance = Phaser.Math.Distance.Between(x, y, exchange.x, exchange.y);
                    if (distance < 80) {
                        tooClose = true;
                        break;
                    }
                }
            }
            if (this.tilemap.activeKiosks) {
                for (const kiosk of this.tilemap.activeKiosks) {
                    const distance = Phaser.Math.Distance.Between(x, y, kiosk.worldX, kiosk.worldY);
                    if (distance < 80) {
                        tooClose = true;
                        break;
                    }
                }
            }
            if (tooClose) {
                continue;
            }
            const denomination = this.selectCoinDenomination();
            const coin = new Coin(this, x, y, denomination);
            this.pickups.push(coin);
            this.totalCoinsSpawned++;
            return;
        }
    }
    selectCoinDenomination() {
        // Використовуємо MoneyDropController для вибору номіналу
        if (this.moneyDropController) {
            const value = this.moneyDropController.generateCoinValue();
            const config = this.moneyDropController.getCoinConfig(value);
            return config;
        }

        // Fallback на стару логіку якщо контролер не ініціалізовано
        const denominations = GAME_CONFIG.PICKUPS.COINS.DENOMINATIONS;
        const baseDenomination = denominations.find(d => d.value === 10);
        const higherDenominations = denominations
            .filter(d => d.value > 10)
            .sort((a, b) => b.value - a.value);
        for (const denom of higherDenominations) {
            if (this.totalCoinsSpawned > 0 && this.totalCoinsSpawned % denom.ratio === 0) {
                return denom;
            }
        }
        return baseDenomination;
    }
    spawnScooter() {
        let attempts = 0;
        const maxAttempts = 100;
        const config = GAME_CONFIG.PICKUPS.SCOOTER;
        while (attempts < maxAttempts) {
            attempts++;
            const x = Phaser.Math.Between(100, this.worldWidth - 100);
            const y = Phaser.Math.Between(100, this.worldHeight - 100);
            if (!this.tilemap.isWalkable(x, y)) {
                continue;
            }
            const tileType = this.tilemap.getTileType(x, y);
            if (tileType === this.tilemap.TILE_TYPES.BUILDING) {
                continue;
            }
            let tooClose = false;
            for (const pickup of this.pickups) {
                if (pickup && pickup.active) {
                    const distance = Phaser.Math.Distance.Between(x, y, pickup.x, pickup.y);
                    const minDistance = (pickup.bonusType === 'SCOOTER' || pickup.bonusType === 'SMOKE_CLOUD')
                        ? config.MIN_DISTANCE_BETWEEN
                        : 50;
                    if (distance < minDistance) {
                        tooClose = true;
                        break;
                    }
                }
            }
            for (const exchange of this.exchanges) {
                if (exchange && exchange.active) {
                    const distance = Phaser.Math.Distance.Between(x, y, exchange.x, exchange.y);
                    if (distance < 100) {
                        tooClose = true;
                        break;
                    }
                }
            }
            if (this.tilemap.activeKiosks) {
                for (const kiosk of this.tilemap.activeKiosks) {
                    const distance = Phaser.Math.Distance.Between(x, y, kiosk.worldX, kiosk.worldY);
                    if (distance < 100) {
                        tooClose = true;
                        break;
                    }
                }
            }
            if (tooClose) {
                continue;
            }
            const scooter = new Scooter(this, x, y);
            this.pickups.push(scooter);
            return;
        }
    }
    spawnSmokeCloud() {
        let attempts = 0;
        const maxAttempts = 100;
        const config = GAME_CONFIG.PICKUPS.SMOKE_CLOUD;
        while (attempts < maxAttempts) {
            attempts++;
            const x = Phaser.Math.Between(100, this.worldWidth - 100);
            const y = Phaser.Math.Between(100, this.worldHeight - 100);
            if (!this.tilemap.isWalkable(x, y)) {
                continue;
            }
            const tileType = this.tilemap.getTileType(x, y);
            if (tileType === this.tilemap.TILE_TYPES.BUILDING) {
                continue;
            }
            let tooClose = false;
            for (const pickup of this.pickups) {
                if (pickup && pickup.active) {
                    const distance = Phaser.Math.Distance.Between(x, y, pickup.x, pickup.y);
                    const minDistance = (pickup.bonusType === 'SCOOTER' || pickup.bonusType === 'SMOKE_CLOUD')
                        ? config.MIN_DISTANCE_BETWEEN
                        : 50;
                    if (distance < minDistance) {
                        tooClose = true;
                        break;
                    }
                }
            }
            for (const exchange of this.exchanges) {
                if (exchange && exchange.active) {
                    const distance = Phaser.Math.Distance.Between(x, y, exchange.x, exchange.y);
                    if (distance < 100) {
                        tooClose = true;
                        break;
                    }
                }
            }
            if (this.tilemap.activeKiosks) {
                for (const kiosk of this.tilemap.activeKiosks) {
                    const distance = Phaser.Math.Distance.Between(x, y, kiosk.worldX, kiosk.worldY);
                    if (distance < 100) {
                        tooClose = true;
                        break;
                    }
                }
            }
            if (tooClose) {
                continue;
            }
            const smoke = new SmokeCloud(this, x, y);
            this.pickups.push(smoke);
            return;
        }
    }
    maintainPickups() {
        if (!this.player || !this.tilemap) return;
        const config = GAME_CONFIG.PICKUPS;
        const activeCoins = this.pickups.filter(p => p instanceof Coin && p.active);
        const activeScooters = this.pickups.filter(p => p.active && p.bonusType === 'SCOOTER');
        const activeSmokeClouds = this.pickups.filter(p => p.active && p.bonusType === 'SMOKE_CLOUD');
        const maxCoins = config.COINS.MAX_COUNT_ON_MAP;
        if (activeCoins.length < maxCoins) {
            const needed = maxCoins - activeCoins.length;
            for (let i = 0; i < needed; i++) {
                this.spawnCoin();
            }
        }
        const maxScooters = config.SCOOTER.MAX_COUNT_ON_MAP;
        if (activeScooters.length < maxScooters) {
            const needed = maxScooters - activeScooters.length;
            for (let i = 0; i < needed; i++) {
                this.spawnScooter();
            }
        }
        const maxSmokeClouds = config.SMOKE_CLOUD.MAX_COUNT_ON_MAP;
        if (activeSmokeClouds.length < maxSmokeClouds) {
            const timeSinceLastPickup = this.time.now - this.lastSmokeCloudPickupTime;
            const respawnDelay = config.SMOKE_CLOUD.RESPAWN_DELAY;
            if (timeSinceLastPickup >= respawnDelay || this.lastSmokeCloudPickupTime === 0) {
                this.spawnSmokeCloud();
                this.lastSmokeCloudPickupTime = this.time.now;
            }
        }
    }
    checkPoliceSiren(time) {
        if (!this.player || !this.audioManager) return;
        if (time < this.nextSirenTime) return;
        const sirenConfig = GAME_CONFIG.AUDIO.POLICE_SIREN;
        let enemiesNearby = 0;
        for (const chaser of this.chasers) {
            if (!chaser || !chaser.active) continue;
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                chaser.x, chaser.y
            );
            if (distance < sirenConfig.ENEMY_CHECK_RADIUS) {
                enemiesNearby++;
            }
        }
        if (enemiesNearby >= sirenConfig.MIN_ENEMIES_NEARBY) {
            this.audioManager.playSound('police_siren', false, sirenConfig.VOLUME);
            const nextInterval = Phaser.Math.Between(sirenConfig.MIN_INTERVAL, sirenConfig.MAX_INTERVAL);
            this.nextSirenTime = time + nextInterval;
        } else {
            this.nextSirenTime = time + 10000;
        }
    }
    initAmbienceSounds() {
        if (!this.sound) return;
        const ambienceConfig = GAME_CONFIG.AUDIO.AMBIENCE;
        if (this.cache.audio.exists('ambience_birds')) {
            this.ambienceBirds = this.sound.add('ambience_birds', {
                volume: ambienceConfig.BIRDS_VOLUME,
                loop: true
            });
            this.ambienceBirds.play();
        }
        if (this.cache.audio.exists('ambience_wind')) {
            this.ambienceWind = this.sound.add('ambience_wind', {
                volume: ambienceConfig.WIND_VOLUME,
                loop: true
            });
            this.ambienceWind.play();
        }
        if (this.cache.audio.exists('ambience_river')) {
            this.ambienceRiver = this.sound.add('ambience_river', {
                volume: 0,
                loop: true
            });
            this.ambienceRiver.play();
        }
    }
    stopAmbienceSounds() {
        if (this.ambienceBirds) {
            this.ambienceBirds.stop();
        }
        if (this.ambienceWind) {
            this.ambienceWind.stop();
        }
        if (this.ambienceRiver) {
            this.ambienceRiver.stop();
        }
    }
    updateRiverSound(time) {
        if (!this.ambienceRiver || !this.player || !this.tilemap) return;

        // OPTIMIZATION: Throttling - run only every 500ms
        if (time && time - (this.lastRiverSoundUpdate || 0) < 500) {
            return;
        }
        this.lastRiverSoundUpdate = time;

        const ambienceConfig = GAME_CONFIG.AUDIO.AMBIENCE;
        const collisionMapX = Math.floor(this.player.x);
        const collisionMapY = Math.floor(this.player.y);
        const searchRadius = ambienceConfig.RIVER_MAX_DISTANCE;
        let closestWaterDistance = Infinity;

        // Optimization: Increase step size to 32 (every 2nd tile) instead of 16 for performance
        // Water bodies are usually large, so checking every tile is unnecessary
        const stepSize = 32;

        for (let dx = -searchRadius; dx <= searchRadius; dx += stepSize) {
            for (let dy = -searchRadius; dy <= searchRadius; dy += stepSize) {
                const checkX = collisionMapX + dx;
                const checkY = collisionMapY + dy;

                // Use the potentially optimized isWater check
                if (this.tilemap.isWater && this.tilemap.isWater(checkX, checkY)) {
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < closestWaterDistance) {
                        closestWaterDistance = distance;
                    }
                }
            }
        }
        let volume = 0;
        if (closestWaterDistance < ambienceConfig.RIVER_MIN_DISTANCE) {
            volume = ambienceConfig.RIVER_MAX_VOLUME;
        } else if (closestWaterDistance < ambienceConfig.RIVER_MAX_DISTANCE) {
            const ratio = (ambienceConfig.RIVER_MAX_DISTANCE - closestWaterDistance) /
                (ambienceConfig.RIVER_MAX_DISTANCE - ambienceConfig.RIVER_MIN_DISTANCE);
            volume = ambienceConfig.RIVER_MAX_VOLUME * ratio;
        }
        this.ambienceRiver.setVolume(volume);
    }
    cleanupPickups(time) {
        if (!this.player) return;

        // OPTIMIZATION: Throttling - run only every 1000ms (1 second)
        // Cleanup is not time-critical
        if (time && time - (this.lastPickupCleanup || 0) < 1000) {
            return;
        }
        this.lastPickupCleanup = time;

        const cleanupDistance = 800;
        const playerX = this.player.x;
        const playerY = this.player.y;
        const velocityX = this.player.body ? this.player.body.velocity.x : 0;
        const velocityY = this.player.body ? this.player.body.velocity.y : 0;
        if (Math.abs(velocityX) < 10 && Math.abs(velocityY) < 10) {
            return;
        }
        const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        if (speed < 10) return;
        const dirX = velocityX / speed;
        const dirY = velocityY / speed;
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const pickup = this.pickups[i];
            if (!pickup || !pickup.active) {
                this.pickups.splice(i, 1);
                continue;
            }
            const dx = pickup.x - playerX;
            const dy = pickup.y - playerY;

            // Optimization: Simple Box Check first to avoid Math.sqrt
            if (Math.abs(dx) > cleanupDistance || Math.abs(dy) > cleanupDistance) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > cleanupDistance) {
                    const dotProduct = dx * dirX + dy * dirY;
                    if (dotProduct < 0) {
                        if (pickup.body) {
                            pickup.body.destroy();
                        }
                        pickup.destroy();
                        this.pickups.splice(i, 1);
                    }
                }
            }
        }
    }
    handleGameOver() {
        if (this.player && this.player.audioManager) {
            const runningSound = this.player.audioManager.getSound('running');
            if (runningSound) {
                runningSound.stop();
            }
        }
        if (this.audioManager) {
            this.audioManager.stopMusic();
            for (const soundKey in this.audioManager.sounds) {
                const sound = this.audioManager.sounds[soundKey];
                if (sound && sound.isPlaying) {
                    sound.stop();
                }
            }
        }
        this.stopAmbienceSounds();
        if (this.obstacles) {
            for (const obstacle of this.obstacles) {
                if (obstacle && obstacle.engineSound) {
                    obstacle.engineSound.stop();
                }
            }
        }
        if (this.chasers) {
            for (const chaser of this.chasers) {
                if (chaser && chaser.audioManager) {
                    const chaserSound = chaser.audioManager.getSound(chaser.soundId);
                    if (chaserSound) {
                        chaserSound.stop();
                    }
                }
            }
        }
        const currentBankedMoney = this.saveSystem.getBankedMoney();
        const moneyAddedThisGame = currentBankedMoney - (this.initialBankedMoney || 0);

        // Відправляємо результат гри на сервер
        this.saveSystem.reportGameEnd(
            moneyAddedThisGame,            // score
            Math.floor(this.timeSurvived), // survivalTime в секундах
            moneyAddedThisGame             // moneyEarned
        );

        const resultData = {
            currentBankedMoney: currentBankedMoney,
            moneyAddedThisGame: moneyAddedThisGame,
            timeSurvived: this.timeSurvived,
            survivalBonus: this.survivalBonus
        };
        this.scene.stop('GameScene');
        this.scene.start('ResultScene', resultData);
    }
    shutdown() {
        // Stop all timers
        this.time.removeAllEvents();

        if (this.game && this.game.events) {
            this.game.events.off('blur', this.handleWindowBlur, this);
            this.game.events.off('focus', this.handleWindowFocus, this);
            this.game.events.off('hidden', this.handleWindowBlur, this);
            this.game.events.off('visible', this.handleWindowFocus, this);
        }

        // Clean up progression events
        this.events.off('spawn-reinforcement', this.onSpawnReinforcement, this);
        this.events.off('enemy-hospitalized', this.onEnemyHospitalized, this);
        this.events.off('money-multiplier-activated', this.onMoneyMultiplierActivated, this);
        this.events.off('money-multiplier-deactivated', this.onMoneyMultiplierDeactivated, this);

        this.events.off('shutdown', this.shutdown, this);

        // Destoy Kiosk Text
        if (this.kioskMessageText) {
            this.kioskMessageText.destroy();
            this.kioskMessageText = null;
        }

        // Знищуємо нові системи прогресії
        if (this.notificationManager) {
            this.notificationManager.destroy();
        }
        if (this.enemyDifficultyController) {
            this.enemyDifficultyController.destroy();
        }
        if (this.moneyDropController) {
            this.moneyDropController.destroy();
        }
        if (this.moneyMultiplierController) {
            this.moneyMultiplierController.destroy();
        }
        if (this.bonusManager && typeof this.bonusManager.destroy === 'function') {
            this.bonusManager.destroy();
        }
        if (this.spinnerBonus) {
            this.spinnerBonus.destroy();
        }

        // Clean up entities manually if needed to be sure
        if (this.chasers) {
            this.chasers.forEach(chaser => chaser.destroy());
            this.chasers = [];
        }
        if (this.pickups) {
            this.pickups.forEach(pickup => pickup.destroy());
            this.pickups = [];
        }
        if (this.obstacles) {
            this.obstacles.forEach(obstacle => obstacle.destroy());
            this.obstacles = [];
        }
    }
}
export default GameScene;