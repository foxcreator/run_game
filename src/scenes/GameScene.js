// GameScene - основна сцена гри
import Player from '../entities/Player.js';
// v2.0 - оновлення для дебагу moneyText
import HUD from '../ui/HUD.js';
import Minimap from '../ui/Minimap.js';
import CaptureSystem from '../systems/CaptureSystem.js';
import TilemapSystem from '../systems/TilemapSystem.js';
import PathfindingSystem from '../systems/PathfindingSystem.js';
import SaveSystem from '../systems/SaveSystem.js';
import SoftCrowd from '../entities/SoftCrowd.js';
import PuddleSlip from '../entities/PuddleSlip.js';
import TapeGate from '../entities/TapeGate.js';
import Car from '../entities/Car.js';
import PaperStack from '../entities/PaperStack.js';
import ChaserBlocker from '../entities/ChaserBlocker.js';
import ChaserSticker from '../entities/ChaserSticker.js';
import Coin from '../entities/Coin.js';
// EnergyDrink не потрібен - енергетик вже реалізований в кіосках
// Scooter та Joke видалено - вони були незрозумілі гравцям
import SmokeCloud from '../entities/bonuses/SmokeCloud.js';
import Exchange from '../entities/Exchange.js';
import { GAME_CONFIG } from '../config/gameConfig.js';

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        // Лічильник для циклічного вибору текстур авто
        this.carTextureIndex = 0;
    }
    
    preload() {
        // Завантажуємо текстуру кіоска (якщо не завантажена в BootScene)
        if (!this.textures.exists('kiosk')) {
            this.load.image('kiosk', './src/assets/textures/kiosk.png');
        }
        
        // Завантажуємо текстури авто (якщо не завантажені в BootScene)
        if (!this.textures.exists('car_red')) {
            this.load.image('car_red', './src/assets/textures/cars/red_car.png');
        }
        if (!this.textures.exists('car_white')) {
            this.load.image('car_white', './src/assets/textures/cars/white_car.png');
        }
    }

    create() {
        // Розміри світу (1км x 1км = 4000x4000 пікселів, масштаб 1px = 0.25м)
        this.worldWidth = 4000;
        this.worldHeight = 4000;
        
        // Встановлюємо межі світу для фізики
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Створюємо tilemap систему
        try {
            this.tilemap = new TilemapSystem(this);
        } catch (error) {
            console.error('Помилка створення tilemap:', error);
            console.error('Stack trace:', error.stack);
            // Показуємо помилку на екрані з деталями
            const errorText = `Помилка завантаження карти:\n${error.message}`;
            this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 
                errorText, { fontSize: '20px', fill: '#ff0000', align: 'center' })
                .setOrigin(0.5);
            return;
        }
        
        // Створюємо систему обходу перешкод (pathfinding)
        this.pathfindingSystem = new PathfindingSystem(this.tilemap);

        // Знаходимо прохідний тайл для старту гравця (біля центру)
        const startPos = this.findWalkablePosition(this.worldWidth / 2, this.worldHeight / 2);
        this.player = new Player(this, startPos.x, startPos.y);
        
        // Ініціалізуємо час останнього зіткнення з кіоском
        this.player.lastKioskCollisionTime = 0;
        
        // Налаштовуємо камеру для слідкування за гравцем
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1); // Плавне слідкування
        this.cameras.main.setDeadzone(100, 100); // Мертва зона для плавнішого руху
        
        // Створюємо систему захоплення
        this.captureSystem = new CaptureSystem(this);
        
        // Створюємо HUD (залишаємо на фіксованій позиції екрану)
        // HUD створюється після tilemap, щоб бути поверх кіосків
        this.hud = new HUD(this);
        
        try {
            this.hud.create(this.player);
        } catch (error) {
            console.error('❌ GameScene.create() ПОМИЛКА при виклику hud.create():', error);
        }
        
        // ЯКЩО moneyText не створено - створюємо його вручну
        if (!this.hud.moneyText) {
            const barX = 50;
            const captureBarY = 50 + 40 + 40; // barY + dashBarY offset + captureBarY offset
            const moneyY = captureBarY + 40;
            
            const moneyText = this.add.text(barX, moneyY, 'Зароблено: $0 | Банк: $0', {
                fontSize: '18px',
                fill: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(202);
            
            // ВАЖЛИВО: присвоюємо moneyText до HUD
            this.hud.moneyText = moneyText;
            
            // ВАЖЛИВО: переконаємося, що this.scene встановлено в HUD
            if (!this.hud.scene) {
                this.hud.scene = this;
            }
        }
        
        this.hud.setCaptureSystem(this.captureSystem);
        
        // Створюємо міні-карту
        try {
            this.minimap = new Minimap(this, this.tilemap, this.player);
        } catch (error) {
            console.error('Помилка створення міні-карти:', error);
            this.minimap = null;
        }
        
        // Масив переслідувачів (ворогів)
        this.chasers = [];
        
        // Створюємо початкових ворогів
        this.spawnInitialChasers();
        
        // Масив перешкод
        this.obstacles = [];
        
        // Масив пікапів (монети та бонуси)
        this.pickups = [];
        
        // Масив обмінників
        this.exchanges = [];
        
        // Система збереження
        this.saveSystem = new SaveSystem();
        // Зберігаємо початковий баланс банку для обчислення прибутку за гру
        this.initialBankedMoney = this.saveSystem.getBankedMoney();
        this.bankedMoney = this.initialBankedMoney;
        
        // Створюємо обмінники на карті (постійне розміщення)
        this.spawnExchanges();
        
        // Додаємо обмінники до перешкод для колізій (після створення)
        for (const exchange of this.exchanges) {
            this.obstacles.push(exchange);
        }
        
        // Створюємо перешкоди на карті
        this.spawnObstacles();
        
        // Налаштовуємо колізії між гравцем та перешкодами (включає обмінники)
        this.setupObstacleCollisions();
        
        // Налаштовуємо колізії між автомобілями та ворогами
        this.setupCarCollisions();
        
        // Налаштовуємо колізії між гравцем та пікапами
        this.setupPickupCollisions();
        
        // Налаштовуємо колізії між гравцем та обмінниками
        this.setupExchangeCollisions();
        
        // Гроші за забіг
        this.runMoney = 0;
        
        // Лічильник загальної кількості створених монет (для визначення номіналу)
        this.totalCoinsSpawned = 0;
        
        // Таймер для процедурного спавну пікапів
        this.pickupSpawnTimer = 0;
        this.pickupSpawnInterval = 1000; // Перевірка кожну секунду
        
        // Спавн початкових пікапів (монети та бонуси)
        this.spawnPickups();
        
        // Налаштовуємо колізії між гравцем та ворогами
        this.setupChaserCollisions();
        
        // Таймер виживання
        this.timeSurvived = 0;
        this.score = 0;
        
        // Стан паузи
        this.isPaused = false;
        this.pauseMenu = null;
        
        // Налаштовуємо обробник ESC для паузи
        this.setupPauseControls();
    }
    
    setupPauseControls() {
        // Створюємо об'єкт для клавіші ESC
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        
        // Обробник натискання ESC
        this.escKey.on('down', () => {
            if (!this.isPaused && !this.captureSystem?.isMaxed()) {
                // Ставимо на паузу
                this.pauseGame();
            } else if (this.isPaused) {
                // Знімаємо з паузи
                this.resumeGame();
            }
        });
    }
    
    pauseGame() {
        if (this.isPaused) return;
        
        this.isPaused = true;
        this.physics.pause();
        
        // Створюємо меню паузи
        this.createPauseMenu();
    }
    
    resumeGame() {
        if (!this.isPaused) return;
        
        this.isPaused = false;
        this.physics.resume();
        
        // Видаляємо меню паузи та overlay
        if (this.pauseMenu) {
            // Видаляємо overlay якщо він є
            if (this.pauseMenu.overlay) {
                this.pauseMenu.overlay.destroy();
            }
            this.pauseMenu.destroy();
            this.pauseMenu = null;
        }
    }
    
    createPauseMenu() {
        if (this.pauseMenu) return; // Меню вже існує
        
        const { width, height } = this.cameras.main;
        
        // Напівпрозорий чорний фон (створюємо окремо, не в контейнері, щоб покривав весь екран)
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        overlay.setDepth(1000);
        overlay.setScrollFactor(0); // Не рухається з камерою
        
        // Створюємо контейнер для меню паузи
        this.pauseMenu = this.add.container(width / 2, height / 2);
        this.pauseMenu.setDepth(1001);
        this.pauseMenu.setScrollFactor(0); // Не рухається з камерою
        
        // Зберігаємо overlay в контейнері для подальшого видалення
        this.pauseMenu.overlay = overlay;
        
        // Заголовок "ПАУЗА"
        const title = this.add.text(0, -180, 'ПАУЗА', {
            fontSize: '72px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0);
        this.pauseMenu.add(title);
        
        // Блок меню
        const menuBoxWidth = 400;
        const menuBoxHeight = 280;
        const menuBox = this.add.rectangle(0, 0, menuBoxWidth, menuBoxHeight, 0x808080, 0.9);
        menuBox.setStrokeStyle(3, 0x606060);
        menuBox.setScrollFactor(0);
        this.pauseMenu.add(menuBox);
        
        // Кнопки
        const buttonWidth = 300;
        const buttonHeight = 60;
        const buttonSpacing = 70;
        const startY = -buttonSpacing;
        
        // Кнопка "ПРОДОВЖИТИ"
        const resumeButton = this.createPauseButton(0, startY, buttonWidth, buttonHeight, 'ПРОДОВЖИТИ', () => {
            this.resumeGame();
        });
        this.pauseMenu.add(resumeButton);
        
        // Кнопка "НАЛАШТУВАННЯ"
        const settingsButton = this.createPauseButton(0, startY + buttonSpacing, buttonWidth, buttonHeight, 'НАЛАШТУВАННЯ', () => {
            // Показуємо меню налаштувань
            this.createPauseSettingsMenu();
        });
        this.pauseMenu.add(settingsButton);
        
        // Кнопка "ЗБЕРЕГТИ І ВИЙТИ"
        const saveAndExitButton = this.createPauseButton(0, startY + buttonSpacing * 2, buttonWidth, buttonHeight, 'ЗБЕРЕГТИ І ВИЙТИ', () => {
            // Гроші вже зберігаються через SaveSystem автоматично
            // Просто виходимо в меню
            this.resumeGame(); // Знімаємо паузу перед виходом
            this.scene.start('MenuScene');
        });
        this.pauseMenu.add(saveAndExitButton);
    }
    
    createPauseButton(x, y, width, height, text, callback) {
        // Створюємо контейнер для кнопки (щоб всі елементи рухалися разом)
        const buttonContainer = this.add.container(x, y);
        buttonContainer.setScrollFactor(0);
        
        // Тінь
        const shadow = this.add.rectangle(2, 2, width, height, 0x000000, 0.5);
        shadow.setScrollFactor(0);
        buttonContainer.add(shadow);
        
        // Кнопка
        const button = this.add.rectangle(0, 0, width, height, 0x606060, 0.95)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x404040)
            .setScrollFactor(0);
        buttonContainer.add(button);
        
        // Текст
        const buttonText = this.add.text(0, 0, text, {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0);
        buttonContainer.add(buttonText);
        
        // Hover ефект
        button.on('pointerover', () => {
            button.setFillStyle(0x707070);
            buttonContainer.setScale(1.05);
        });
        
        button.on('pointerout', () => {
            button.setFillStyle(0x606060);
            buttonContainer.setScale(1);
        });
        
        button.on('pointerdown', () => {
            if (callback) callback();
        });
        
        // Зберігаємо посилання для можливого видалення
        buttonContainer.button = button;
        buttonContainer.shadow = shadow;
        buttonContainer.text = buttonText;
        
        return buttonContainer;
    }
    
    createPauseSettingsMenu() {
        const { width, height } = this.cameras.main;
        
        // Приховуємо меню паузи (але НЕ видаляємо overlay!)
        // Overlay створюється окремо, тому просто приховуємо контейнер меню
        if (this.pauseMenu) {
            this.pauseMenu.setVisible(false);
        }
        
        // Створюємо меню налаштувань (схоже на MenuScene)
        const settingsWidth = 550;
        const settingsHeight = 420;
        const settingsBoxX = width / 2;
        const settingsBoxY = height / 2;
        
        // Тінь
        const settingsShadow = this.add.rectangle(
            settingsBoxX + 4, 
            settingsBoxY + 4, 
            settingsWidth, 
            settingsHeight, 
            0x000000, 
            0.4
        ).setScrollFactor(0).setDepth(1002);
        
        // Блок налаштувань
        const settingsBox = this.add.rectangle(
            settingsBoxX, 
            settingsBoxY, 
            settingsWidth, 
            settingsHeight, 
            0x808080, 
            0.9
        ).setStrokeStyle(3, 0x606060).setScrollFactor(0).setDepth(1002);
        
        // Заголовок
        const title = this.add.text(settingsBoxX, settingsBoxY - 150, 'НАЛАШТУВАННЯ', {
            fontSize: '48px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1003);
        
        // Інформація про налаштування
        const infoText = this.add.text(settingsBoxX, settingsBoxY - 20, 'Налаштування в розробці\n\nТут будуть:\n• Гучність звуку\n• Гучність музики\n• Якість графіки\n• Управління', {
            fontSize: '22px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1003);
        
        // Кнопка "НАЗАД"
        const closeButton = this.createPauseButton(
            settingsBoxX,
            settingsBoxY + 150,
            300,
            60,
            'НАЗАД',
            () => {
                // Закриваємо меню налаштувань
                settingsShadow.destroy();
                settingsBox.destroy();
                title.destroy();
                infoText.destroy();
                if (closeButton) {
                    closeButton.destroy();
                }
                // Показуємо меню паузи знову (overlay залишається видимим)
                if (this.pauseMenu) {
                    this.pauseMenu.setVisible(true);
                }
            }
        );
        closeButton.setScrollFactor(0);
        closeButton.setDepth(1003);
    }
    
    spawnExchanges() {
        // Спавнимо обмінники на карті (постійне розміщення)
        const exchangeCount = GAME_CONFIG.EXCHANGES.COUNT;
        const safeRadius = 200; // Безпечний радіус навколо гравця
        
        let spawned = 0;
        let attempts = 0;
        const maxAttempts = exchangeCount * 50;
        
        while (spawned < exchangeCount && attempts < maxAttempts) {
            attempts++;
            
            // Генеруємо випадкову позицію по всій карті
            const x = Phaser.Math.Between(150, this.worldWidth - 150);
            const y = Phaser.Math.Between(150, this.worldHeight - 150);
            
            // Перевіряємо чи позиція не близько до гравця
            if (this.player) {
                const distToPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
                if (distToPlayer < safeRadius) {
                    continue;
                }
            }
            
            // Перевіряємо чи позиція прохідна
            if (!this.tilemap.isWalkable(x, y)) {
                continue;
            }
            
            // Перевіряємо ВСІ тайли, які покриває обмінник (не тільки кути!)
            // Обмінник має розмір 60x60 пікселів, тайл - 32x32, тому обмінник покриває ~2x2 тайли
            const exchangeWidth = 60;
            const exchangeHeight = 60;
            const halfWidth = exchangeWidth / 2;
            const halfHeight = exchangeHeight / 2;
            
            // Визначаємо діапазон тайлів, які покриває обмінник
            const minTileX = Math.floor((x - halfWidth) / this.tilemap.tileSize);
            const maxTileX = Math.floor((x + halfWidth) / this.tilemap.tileSize);
            const minTileY = Math.floor((y - halfHeight) / this.tilemap.tileSize);
            const maxTileY = Math.floor((y + halfHeight) / this.tilemap.tileSize);
            
            // Перевіряємо всі тайли в діапазоні
            let allTilesValid = true;
            for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
                for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
                    // Перевіряємо чи координати в межах карти
                    if (tileX < 0 || tileX >= this.tilemap.mapWidth || 
                        tileY < 0 || tileY >= this.tilemap.mapHeight) {
                        allTilesValid = false;
                        break;
                    }
                    
                    // Отримуємо тип тайла з tileTypeMap
                    let tileType = null;
                    if (this.tilemap.tileTypeMap && 
                        this.tilemap.tileTypeMap[tileY] && 
                        this.tilemap.tileTypeMap[tileY][tileX] !== undefined) {
                        tileType = this.tilemap.tileTypeMap[tileY][tileX];
                    } else {
                        allTilesValid = false;
                        break;
                    }
                    
                    // Дозволяємо тільки тротуари (SIDEWALK = 1, жовтий) та траву (YARD = 2, зелений)
                    // Виключаємо дороги (ROAD = 0, сірий), будівлі, кіоски та огорожі
                    if (tileType !== this.tilemap.TILE_TYPES.SIDEWALK && 
                        tileType !== this.tilemap.TILE_TYPES.YARD) {
                        allTilesValid = false;
                        break; // Якщо хоча б один тайл на дорозі - пропускаємо
                    }
                }
                if (!allTilesValid) break;
            }
            
            if (!allTilesValid) {
                continue; // Не спавнимо якщо хоча б один тайл на дорозі або будівлі
            }
            
            // Перевіряємо чи немає обмінників поруч
            let tooClose = false;
            for (const exchange of this.exchanges) {
                const distance = Phaser.Math.Distance.Between(x, y, exchange.x, exchange.y);
                const minDistance = 300; // Мінімальна відстань між обмінниками
                if (distance < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            
            if (tooClose) {
                continue;
            }
            
            // Перевіряємо чи немає перешкод поруч (включаючи кіоски)
            for (const obstacle of this.obstacles) {
                const distance = Phaser.Math.Distance.Between(x, y, obstacle.x, obstacle.y);
                if (distance < 100) {
                    tooClose = true;
                    break;
                }
            }
            
            // Перевіряємо чи немає кіосків поруч
            if (this.tilemap.activeKiosks) {
                for (const kiosk of this.tilemap.activeKiosks) {
                    const distance = Phaser.Math.Distance.Between(x, y, kiosk.worldX, kiosk.worldY);
                    if (distance < 100) {
                        tooClose = true;
                        break;
                    }
                }
            }
            
            // Перевіряємо чи немає пікапів поруч
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
            
            // Створюємо обмінник
            try {
                const exchange = new Exchange(this, x, y);
                this.exchanges.push(exchange);
                spawned++;
            } catch (error) {
                console.error('Помилка створення обмінника:', error);
            }
        }
    }
    
    spawnObstacles() {
        // Спавнимо різні типи перешкод на карті
        const obstacleCounts = {
            'SoftCrowd': 0,      // Черги людей видалено - червоні блоки не потрібні
            'PuddleSlip': 0,    // Калюжі генеруються окремо
            'TapeGate': 0,       // Стрічки/шлагбауми видалено - рожеві блоки не потрібні
            'Car': 0      // Автомобілі генеруються окремо
            // PaperStack видалено - білі блоки не потрібні
        };
        
        // Безпечний радіус навколо гравця
        const safeRadius = 90;
        
        // Спавнимо кожен тип перешкод
        for (const [type, count] of Object.entries(obstacleCounts)) {
            if (count === 0) continue; // Пропускаємо калюжі
            
            let spawned = 0;
            let attempts = 0;
            const maxAttempts = count * 20;
            
            while (spawned < count && attempts < maxAttempts) {
                attempts++;
                
                // Генеруємо випадкову позицію
                const x = Phaser.Math.Between(100, this.worldWidth - 100);
                const y = Phaser.Math.Between(100, this.worldHeight - 100);
                
                // Перевіряємо чи позиція не близько до гравця
                if (this.player) {
                    const distToPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
                    if (distToPlayer < safeRadius) {
                        continue;
                    }
                }
                
                // Перевіряємо чи позиція прохідна
                if (!this.tilemap.isWalkable(x, y)) {
                    continue;
                }
                
                // Перевіряємо чи немає перешкод поруч
                let tooClose = false;
                for (const obstacle of this.obstacles) {
                    const distance = Phaser.Math.Distance.Between(x, y, obstacle.x, obstacle.y);
                    const minDistance = 150; // Мінімальна відстань між перешкодами
                    if (distance < minDistance) {
                        tooClose = true;
                        break;
                    }
                }
                
                if (tooClose) {
                    continue;
                }
                
                // Створюємо перешкоду відповідного типу
                let obstacle;
                try {
                    switch (type) {
                        case 'SoftCrowd':
                            obstacle = new SoftCrowd(this, x, y);
                            break;
                        case 'TapeGate':
                            obstacle = new TapeGate(this, x, y);
                            break;
                        // PaperStack видалено - білі блоки не потрібні
                        default:
                            continue;
                    }
                    
                    if (obstacle) {
                        this.obstacles.push(obstacle);
                        spawned++;
                    }
                } catch (error) {
                    console.error(`Помилка створення перешкоди ${type}:`, error);
                }
            }
        }
        
        // Генеруємо калюжі окремо (тільки на дорогах/тротуарах)
        this.spawnPuddles();
        
        // Налаштовуємо таймер для оновлення калюж
        this.puddleUpdateTimer = 0;
        this.puddleUpdateInterval = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.RESPAWN_INTERVAL;
        
        // Генеруємо автомобілі окремо
        this.spawnCars();
        
        // Налаштовуємо таймер для спавну нових авто
        this.carSpawnTimer = 0;
        this.carSpawnInterval = 1000; // Інтервал спавну авто (1 секунда)
    }
    
    spawnPuddles() {
        // Видаляємо всі існуючі калюжі
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
        
        // Генеруємо нову кількість калюж
        const minCount = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.MIN_COUNT;
        const maxCount = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.MAX_COUNT;
        const targetCount = Phaser.Math.Between(minCount, maxCount);
        
        const sizeOptions = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.SIZE_OPTIONS;
        const tileSize = 32;
        
        let spawned = 0;
        let attempts = 0;
        const maxAttempts = targetCount * 50; // Більше спроб для доріг/тротуарів
        
        while (spawned < targetCount && attempts < maxAttempts) {
            attempts++;
            
            // Вибираємо випадковий розмір
            const sizeInTiles = Phaser.Math.RND.pick(sizeOptions);
            
            // Генеруємо випадкову позицію
            const x = Phaser.Math.Between(50, this.worldWidth - 50);
            const y = Phaser.Math.Between(50, this.worldHeight - 50);
            
            // Перевіряємо чи вся область (розмір калюжі) є дорогою або тротуаром
            if (!this.tilemap.isAreaRoadOrSidewalk(x, y, sizeInTiles)) {
                continue;
            }
            
            // Перевіряємо чи позиція не близько до гравця
            if (this.player) {
                const distToPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
                if (distToPlayer < 100) {
                    continue;
                }
            }
            
            // Перевіряємо чи немає інших перешкод поруч
            let tooClose = false;
            for (const obstacle of this.obstacles) {
                if (obstacle instanceof PuddleSlip) continue; // Ігноруємо інші калюжі
                const distance = Phaser.Math.Distance.Between(x, y, obstacle.x, obstacle.y);
                if (distance < 100) {
                    tooClose = true;
                    break;
                }
            }
            
            if (tooClose) {
                continue;
            }
            
            // Створюємо калюжу
            try {
                const puddle = new PuddleSlip(this, x, y, sizeInTiles);
                if (puddle) {
                    this.obstacles.push(puddle);
                    spawned++;
                }
            } catch (error) {
                console.error('Помилка створення калюжі:', error);
            }
        }
        
    }
    
    spawnCars() {
        // Перевіряємо чи текстури завантажені
        const carTextures = GAME_CONFIG.OBSTACLES.MOVING_BUS.CAR_TEXTURES || [];
        const availableTextures = carTextures.filter(key => this.textures.exists(key));
        
        if (availableTextures.length === 0) {
            console.error('❌ Немає доступних текстур авто! Перевірте чи текстури завантажені в BootScene.js');
            return;
        }
        
        // Видаляємо всі існуючі авто
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
        
        // Генеруємо початкову кількість авто
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
        
        // Шукаємо випадкову позицію на дорозі
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
            
            // Перевіряємо чи немає інших авто поруч
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
        
        // Отримуємо текстуру по черзі
        const carTextures = GAME_CONFIG.OBSTACLES.MOVING_BUS.CAR_TEXTURES || [];
        const availableTextures = carTextures.filter(key => this.textures.exists(key));
        
        if (availableTextures.length === 0) {
            return false;
        }
        
        // Обираємо текстуру по черзі (циклічно)
        const textureKey = availableTextures[this.carTextureIndex % availableTextures.length];
        this.carTextureIndex++;
        
        // Створюємо авто на дорозі
        try {
            const car = new Car(this, spawnX, spawnY, textureKey);
            if (car) {
                this.obstacles.push(car);
                return true;
            }
        } catch (error) {
            console.error('Помилка створення автомобіля:', error);
        }
        
        return false;
    }
    
    setupObstacleCollisions() {
        // Налаштовуємо колізії між гравцем та перешкодами
        this.physics.add.overlap(
            this.player,
            this.obstacles,
            this.handleObstacleCollision,
            null,
            this
        );
    }
    
    setupPickupCollisions() {
        // Налаштовуємо колізії між гравцем та пікапами (монетами)
        // Це буде викликатися при оновленні пікапів
    }
    
    setupExchangeCollisions() {
        // Налаштовуємо колізії між гравцем та обмінниками
        // Використовуємо collide (не overlap) щоб блокувати рух гравця
        if (this.exchanges && this.exchanges.length > 0) {
            this.physics.add.collider(
                this.player,
                this.exchanges,
                null, // Без callback - просто блокуємо рух
                null,
                this
            );
        }
    }
    
    handlePickupCollision(player, pickup) {
        if (!pickup || !pickup.active || pickup.collected) return;
        
        // Позначаємо як зібраний щоб не збирати двічі
        pickup.collected = true;
        
        // Якщо це монета
        if (pickup instanceof Coin && pickup.value !== undefined) {
            // Додаємо гроші
            this.runMoney += pickup.value;
            
            // Видаляємо монету
            pickup.collect();
            
            // Видаляємо з масиву
            const index = this.pickups.indexOf(pickup);
            if (index > -1) {
                this.pickups.splice(index, 1);
            }
        }
        // Якщо це бонус
        else if (pickup.applyEffect) {
            // Застосовуємо ефект бонусу
            pickup.applyEffect(player, this);
            
            // Видаляємо бонус
            pickup.collect();
            
            // Видаляємо з масиву
            const index = this.pickups.indexOf(pickup);
            if (index > -1) {
                this.pickups.splice(index, 1);
            }
        }
    }
    
    handleObstacleCollision(player, obstacle) {
        if (!obstacle.active) return;
        
        // Спеціальна обробка для автомобілів
        if (obstacle instanceof Car) {
            obstacle.onCollisionWithEntity(player);
            return;
        }
        
        // Викликаємо метод обробки колізії перешкоди
        if (obstacle.onPlayerCollision) {
            obstacle.onPlayerCollision(player);
        }
    }
    
    setupCarCollisions() {
        // Налаштовуємо колізії між автомобілями та ворогами
        // Цей метод буде викликатися в update() для перевірки колізій
    }
    
    handleCarChaserCollision(car, chaser) {
        if (!car.active || !chaser || !chaser.active) return;
        
        // Автомобіль відкидає ворога
        car.onCollisionWithEntity(chaser);
    }
    
    checkCarCollisions() {
        // Перевіряємо колізії між авто та гравцем/ворогами
        const cars = this.obstacles.filter(obs => obs instanceof Car && obs.active);
        
        if (cars.length === 0) return;
        
        const config = GAME_CONFIG.OBSTACLES.MOVING_BUS;
        const carCollisionRadius = config.COLLISION_RADIUS || 25;
        
        // Колізії між авто (ДТП)
        for (let i = 0; i < cars.length; i++) {
            const car1 = cars[i];
            if (!car1.active || car1.isAccident) continue;
            
            for (let j = i + 1; j < cars.length; j++) {
                const car2 = cars[j];
                if (!car2.active || car2.isAccident) continue;
                
                const distance = Phaser.Math.Distance.Between(car1.x, car1.y, car2.x, car2.y);
                const minDistance = carCollisionRadius * 2; // Радіус двох авто
                
                if (distance < minDistance) {
                    // ДТП!
                    car1.handleAccident(car2);
                }
            }
        }
        
        // Колізії з гравцем (вже обробляються через handleObstacleCollision)
        // Колізії з ворогами
        for (const car of cars) {
            if (!car.active || car.isAccident) continue; // Пропускаємо авто в ДТП
            
            // Перевіряємо колізію з гравцем
            if (this.player && this.player.active && !this.player.isFrozen) {
                const distance = Phaser.Math.Distance.Between(car.x, car.y, this.player.x, this.player.y);
                const minDistance = 40; // Радіус авто + радіус гравця
                if (distance < minDistance) {
                    car.onCollisionWithEntity(this.player);
                }
            }
            
            // Перевіряємо колізії з ворогами
            for (const chaser of this.chasers) {
                if (!chaser || !chaser.active || chaser.isFrozen) continue;
                
                const distance = Phaser.Math.Distance.Between(car.x, car.y, chaser.x, chaser.y);
                const minDistance = 40; // Радіус авто + радіус ворога
                if (distance < minDistance) {
                    car.onCollisionWithEntity(chaser);
                }
            }
        }
    }
    
    spawnInitialChasers() {
        // Спочатку спавнимо початкових ворогів
        const initialCount = GAME_CONFIG.CHASERS.SPAWN.INITIAL_COUNT;
        
        // Розподіляємо ворогів між типами (50% Blocker, 50% Sticker)
        const blockerCount = Math.floor(initialCount / 2);
        const stickerCount = initialCount - blockerCount;
        
        // Створюємо Blockers
        for (let i = 0; i < blockerCount; i++) {
            const chaser = this.spawnChaser('Blocker');
            if (!chaser) {
                console.warn(`Не вдалося заспавнити Blocker ${i + 1}`);
            }
        }
        
        // Створюємо Stickers
        for (let i = 0; i < stickerCount; i++) {
            const chaser = this.spawnChaser('Sticker');
            if (!chaser) {
                console.warn(`Не вдалося заспавнити Sticker ${i + 1}`);
            }
        }
    }
    
    spawnChaser(type) {
        // Знаходимо позицію для спавну (подалі від гравця)
        const spawnConfig = GAME_CONFIG.CHASERS.SPAWN;
        let attempts = 0;
        const maxAttempts = spawnConfig.MAX_SPAWN_ATTEMPTS;
        let spawnX, spawnY;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            // Генеруємо позицію на відстані від гравця
            const angle = Math.random() * Math.PI * 2;
            const distance = Phaser.Math.Between(
                spawnConfig.MIN_DISTANCE_FROM_PLAYER,
                spawnConfig.MAX_DISTANCE_FROM_PLAYER
            );
            spawnX = this.player.x + Math.cos(angle) * distance;
            spawnY = this.player.y + Math.sin(angle) * distance;
            
            // Перевіряємо межі світу
            if (spawnX < 50 || spawnX > this.worldWidth - 50 ||
                spawnY < 50 || spawnY > this.worldHeight - 50) {
                continue;
            }
            
            // Перевіряємо чи позиція прохідна
            if (!this.tilemap.isWalkable(spawnX, spawnY)) {
                continue;
            }
            
            // Перевіряємо чи немає інших ворогів поруч
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
            
            // Знайшли валідну позицію
            break;
        }
        
        if (attempts >= maxAttempts) {
            // Не знайшли позицію - використовуємо позицію гравця + відстань
            const angle = Math.random() * Math.PI * 2;
            const distance = (spawnConfig.MIN_DISTANCE_FROM_PLAYER + spawnConfig.MAX_DISTANCE_FROM_PLAYER) / 2;
            spawnX = this.player.x + Math.cos(angle) * distance;
            spawnY = this.player.y + Math.sin(angle) * distance;
            
            // Перевіряємо межі світу для fallback позиції
            spawnX = Phaser.Math.Clamp(spawnX, 50, this.worldWidth - 50);
            spawnY = Phaser.Math.Clamp(spawnY, 50, this.worldHeight - 50);
            
            // Якщо fallback позиція теж не прохідна, шукаємо найближчу прохідну
            if (!this.tilemap.isWalkable(spawnX, spawnY)) {
                const fallbackPos = this.findWalkablePosition(spawnX, spawnY);
                spawnX = fallbackPos.x;
                spawnY = fallbackPos.y;
            }
        }
        
        // Перевіряємо чи позиція все ще валідна перед створенням
        if (!this.tilemap.isWalkable(spawnX, spawnY)) {
            console.warn(`Не вдалося знайти валідну позицію для ${type} на (${spawnX}, ${spawnY})`);
            return null;
        }
        
        // Створюємо ворога
        let chaser;
        if (type === 'Blocker') {
            chaser = new ChaserBlocker(this, spawnX, spawnY);
        } else if (type === 'Sticker') {
            chaser = new ChaserSticker(this, spawnX, spawnY);
            chaser.setCaptureSystem(this.captureSystem);
        } else {
            return null;
        }
        
        chaser.setTarget(this.player);
        chaser.setPathfindingSystem(this.pathfindingSystem);
        this.chasers.push(chaser);
        
        return chaser;
    }
    
    setupChaserCollisions() {
        // Налаштовуємо колізії між гравцем та ворогами
        this.physics.add.overlap(
            this.player,
            this.chasers,
            this.handleChaserCollision,
            null,
            this
        );
    }
    
    handleChaserCollision(player, chaser) {
        if (!chaser.active) return;
        
        // Обробка колізії з Sticker (удар)
        if (chaser.type === 'Sticker' && chaser.onHitPlayer) {
            chaser.onHitPlayer();
        }
        
        // Blocker просто блокує шлях (фізична колізія)
    }
    
    findWalkablePosition(centerX, centerY) {
        // Шукаємо прохідний тайл біля центру
        const searchRadius = 50; // Радіус пошуку в тайлах
        const tile = this.tilemap.worldToTile(centerX, centerY);
        
        // Спочатку перевіряємо центр
        if (this.tilemap.isWalkable(centerX, centerY)) {
            return { x: centerX, y: centerY };
        }
        
        // Якщо центр не прохідний, шукаємо по спіралі
        for (let radius = 1; radius <= searchRadius; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Перевіряємо тільки периметр поточного радіусу
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    
                    const checkTile = { x: tile.x + dx, y: tile.y + dy };
                    const worldPos = this.tilemap.tileToWorld(checkTile.x, checkTile.y);
                    
                    if (this.tilemap.isWalkable(worldPos.x, worldPos.y)) {
                        return worldPos;
                    }
                }
            }
        }
        
        // Якщо не знайшли, повертаємо центр
        return { x: centerX, y: centerY };
    }
    
    update(time, delta) {
        // Якщо гра на паузі - не оновлюємо нічого
        if (this.isPaused) {
            return;
        }
        
        // Оновлення гравця
        if (this.player) {
            this.player.update(time, delta);
            
            // Перевірка колізій гравця з тайлами
            this.checkTilemapCollisions();
        }
        
        // Оновлення системи захоплення
        if (this.captureSystem && this.player) {
            this.captureSystem.update(delta, this.player, this.chasers);
            
            // Перевірка програшу (capture досяг 100)
            if (this.captureSystem.isMaxed()) {
                this.handleGameOver();
            }
        }
        
        // Оновлення таймера виживання
        this.timeSurvived += delta / 1000; // в секундах
        
        // Оновлення перешкод
        for (const obstacle of this.obstacles) {
            if (obstacle.active && obstacle.update) {
                obstacle.update(delta);
            }
        }
        
        // Оновлення пікапів (монет) з магнітним ефектом
        for (const pickup of this.pickups) {
            if (pickup.active && pickup.update) {
                pickup.update(delta, this.player);
            }
        }
        
        // Процедурний спавн пікапів (підтримка кількості)
        this.pickupSpawnTimer += delta;
        if (this.pickupSpawnTimer >= this.pickupSpawnInterval) {
            this.pickupSpawnTimer = 0;
            this.maintainPickups();
        }
        
        // Cleanup пікапів позаду гравця
        this.cleanupPickups();
        
        // Перевірка колізій з пікапами (використовуємо відстань для надійності)
        if (this.pickups.length > 0 && this.player) {
            const pickupRadius = 40; // Радіус збору (більший ніж hitbox)
            
            for (let i = this.pickups.length - 1; i >= 0; i--) {
                const pickup = this.pickups[i];
                if (!pickup || !pickup.active || pickup.collected) continue;
                
                // Перевіряємо відстань до гравця
                const dx = this.player.x - pickup.x;
                const dy = this.player.y - pickup.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Якщо гравець достатньо близько - збираємо пікап
                if (distance < pickupRadius) {
                    this.handlePickupCollision(this.player, pickup);
                }
            }
        }
        
        // Перевірка колізій з обмінниками
        // Збільшуємо радіус для зручності підходу з будь-якої сторони
        if (this.exchanges.length > 0 && this.player && !this.player.isFrozen) {
            const exchangeRadius = 70; // Збільшений радіус взаємодії (було 50)
            
            for (const exchange of this.exchanges) {
                if (!exchange || !exchange.active) continue;
                
                // Перевіряємо відстань до гравця (з усіх сторін)
                const dx = this.player.x - exchange.x;
                const dy = this.player.y - exchange.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Якщо гравець достатньо близько - обмінюємо гроші
                if (distance < exchangeRadius) {
                    exchange.exchange(this.player, this);
                }
            }
        }
        
        // Оновлення ворогів
        for (const chaser of this.chasers) {
            if (chaser && chaser.active) {
                chaser.update(delta);
                // Перевіряємо колізії ворогів з тайлами карти
                this.checkChaserTilemapCollisions(chaser);
                this.checkChaserChaserCollisions(chaser);
            }
        }
        
        // Оновлення HUD
        if (this.hud) {
            this.hud.update();
            // Переконаємося, що HUD завжди поверх всього
            this.children.bringToTop(this.hud.staminaBarBg);
            this.children.bringToTop(this.hud.staminaBar);
            this.children.bringToTop(this.hud.staminaText);
            this.children.bringToTop(this.hud.dashCooldownBg);
            this.children.bringToTop(this.hud.dashCooldownBar);
            this.children.bringToTop(this.hud.dashText);
            this.children.bringToTop(this.hud.captureBarBg);
            this.children.bringToTop(this.hud.captureBar);
            this.children.bringToTop(this.hud.captureText);
            if (this.hud.moneyText) {
                this.children.bringToTop(this.hud.moneyText);
            }
            if (this.hud.bonusIconsContainer) {
                this.children.bringToTop(this.hud.bonusIconsContainer);
            }
        }
        
        // Оновлення міні-карти
        if (this.minimap) {
            this.minimap.update();
        }
        
        
        // Оновлення видимості тайлів (culling для оптимізації)
        if (this.tilemap && this.tilemap.updateVisibility) {
            this.tilemap.updateVisibility(time);
        }
        
        // Оновлення калюж кожні 30 секунд
        if (this.puddleUpdateTimer !== undefined) {
            this.puddleUpdateTimer += delta;
            if (this.puddleUpdateTimer >= this.puddleUpdateInterval) {
                this.puddleUpdateTimer = 0;
                this.spawnPuddles();
            }
        }
        
        // Оновлення автомобілів та спавн нових
        if (this.carSpawnTimer !== undefined) {
            this.carSpawnTimer += delta;
            
            // Перевіряємо кількість активних авто (тільки ті що дійсно існують та рухаються)
            const activeCars = this.obstacles.filter(obs => {
                if (!(obs instanceof Car)) return false;
                if (!obs.active) return false;
                // Перевіряємо чи авто дійсно існує та має body
                if (!obs.body || !obs.scene) return false;
                return true;
            });
            
            const minCars = GAME_CONFIG.OBSTACLES.MOVING_BUS.MIN_COUNT;
            const maxCars = GAME_CONFIG.OBSTACLES.MOVING_BUS.MAX_COUNT;
            
            // Якщо менше мінімуму - спавнимо одразу (але не більше 1 за кадр)
            if (activeCars.length < minCars && this.carSpawnTimer >= 100) {
                this.spawnSingleCar();
                this.carSpawnTimer = 0;
            }
            // Якщо менше максимуму та пройшов інтервал - спавнимо нове авто
            else if (activeCars.length < maxCars && this.carSpawnTimer >= this.carSpawnInterval) {
                this.carSpawnTimer = 0;
                this.spawnSingleCar();
            }
        }
        
        // Перевіряємо колізії авто з гравцем та ворогами
        this.checkCarCollisions();
    }
    
    checkChaserTilemapCollisions(chaser) {
        if (!this.tilemap || !chaser) return;
        
        const chaserX = chaser.x;
        const chaserY = chaser.y;
        const chaserRadius = GAME_CONFIG.CHASERS.COMMON.COLLISION_RADIUS;
        
        // Перевіряємо колізії ворога з тайлами
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
            // Блокуємо рух ворога в напрямку колізії
            const currentVelocityX = chaser.body.velocity.x;
            const currentVelocityY = chaser.body.velocity.y;
            
            // Перевіряємо горизонтальний рух
            if (currentVelocityX !== 0) {
                const checkX = chaserX + (currentVelocityX > 0 ? chaserRadius : -chaserRadius);
                if (this.tilemap.hasCollision(checkX, chaserY)) {
                    chaser.body.setVelocityX(0);
                }
            }
            
            // Перевіряємо вертикальний рух
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
        
        // Якщо гравець заморожений, утримуємо його на місці
        if (this.player.isFrozen) {
            // Під час заморозки утримуємо гравця на місці (вже відштовхнутому від кіоска)
            const frozenPos = this.player.getFrozenPosition();
            if (frozenPos) {
                this.player.setPosition(frozenPos.x, frozenPos.y);
            }
            this.player.body.setVelocity(0, 0);
            return; // Не перевіряємо інші колізії під час заморозки
        }
        
        // Перевіряємо чи гравець не в колізійному тайлі
        const playerX = this.player.x;
        const playerY = this.player.y;
        const playerRadius = 15; // Радіус гравця
        
        // Перевірка кількох точок навколо гравця для кращої колізії
        const checkPoints = [
            { x: playerX, y: playerY }, // Центр
            { x: playerX + playerRadius, y: playerY }, // Право
            { x: playerX - playerRadius, y: playerY }, // Ліво
            { x: playerX, y: playerY + playerRadius }, // Низ
            { x: playerX, y: playerY - playerRadius }, // Верх
        ];
        
        let hasCollision = false;
        let isKioskCollision = false;
        let collidedKiosk = null;
        
        // Спочатку перевіряємо колізії з кіосками (перевіряємо відстань до всіх кіосків)
        if (this.tilemap.activeKiosks && this.tilemap.activeKiosks.length > 0) {
            const kioskRadius = 20; // Радіус кіоска для колізії
            const playerRadius = 15; // Радіус гравця
            
            for (const kiosk of this.tilemap.activeKiosks) {
                if (!kiosk.sprite || !kiosk.sprite.active) continue;
                
                // Перевіряємо відстань від гравця до кіоска
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
        
        // Якщо немає колізії з кіоском, перевіряємо інші колізії
        if (!isKioskCollision) {
            for (const point of checkPoints) {
                // Перевіряємо інші колізії (будівлі, вода)
                if (this.tilemap.hasCollision(point.x, point.y)) {
                    hasCollision = true;
                    break;
                }
            }
        }
        
        if (isKioskCollision && collidedKiosk) {
            // Використовуємо знайдений кіоск
            const kiosk = collidedKiosk;
            
            if (kiosk) {
                // Перевіряємо чи не було нещодавнього зіткнення з кіоском
                const currentTime = this.time.now;
                const timeSinceLastCollision = currentTime - this.player.lastKioskCollisionTime;
                
                // Якщо зіткнення з кіоском і минуло достатньо часу - заморожуємо
                if (timeSinceLastCollision >= GAME_CONFIG.KIOSKS.COOLDOWN) {
                    // Зберігаємо поточну позицію гравця (не відштовхуємо)
                    const currentPlayerX = this.player.x;
                    const currentPlayerY = this.player.y;
                    
                    // Поповнюємо стаміну до максимуму (купляємо енергетик)
                    this.player.restoreStamina();
                    
                    // Заморожуємо гравця на місці
                    this.player.freeze(GAME_CONFIG.KIOSKS.FREEZE_DURATION);
                    this.player.lastKioskCollisionTime = currentTime;
                    
                    // Блокуємо рух та залишаємо гравця на місці
                    this.player.body.setVelocity(0, 0);
                    this.player.setPosition(currentPlayerX, currentPlayerY);
                    
                    // Оновлюємо заморожену позицію
                    if (this.player.isFrozen) {
                        this.player.frozenPosition = { x: currentPlayerX, y: currentPlayerY };
                    }
                    
                    // Плануємо зникнення кіоска (трохи раніше закінчення заморозки)
                    const disappearDelay = GAME_CONFIG.KIOSKS.FREEZE_DURATION - GAME_CONFIG.KIOSKS.DISAPPEAR_BEFORE_FREEZE_END;
                    const respawnDelay = GAME_CONFIG.KIOSKS.RESPAWN_DELAY;
                    
                    // Зникає кіоск
                    this.time.delayedCall(disappearDelay, () => {
                        this.removeKiosk(kiosk.tileX, kiosk.tileY);
                    });
                    
                    // Респавн кіоска через 20 секунд
                    this.time.delayedCall(disappearDelay + respawnDelay, () => {
                        this.tilemap.spawnKioskAtRandomPosition();
                        // Оновлюємо міні-карту
                        if (this.minimap) {
                            this.minimap.refresh();
                        }
                    });
                } else {
                    // Якщо нещодавно було зіткнення, просто блокуємо рух без заморозки
                    this.player.body.setVelocity(0, 0);
                }
            }
        } else if (hasCollision) {
            // Для інших колізій (будівлі, огорожі) - блокуємо тільки напрямок, який веде в будівлю
            this.blockMovementIntoBuilding(playerX, playerY);
        }
    }
    
    blockMovementIntoBuilding(playerX, playerY) {
        // Блокуємо тільки той напрямок руху, який веде в будівлю
        const velocityX = this.player.body.velocity.x;
        const velocityY = this.player.body.velocity.y;
        const playerRadius = 15;
        
        let blockedX = velocityX;
        let blockedY = velocityY;
        
        // Перевіряємо колізію в напрямку руху
        if (velocityX > 0) {
            // Рух вправо - перевіряємо праву сторону
            if (this.tilemap.hasCollision(playerX + playerRadius, playerY)) {
                blockedX = 0;
            }
        } else if (velocityX < 0) {
            // Рух вліво - перевіряємо ліву сторону
            if (this.tilemap.hasCollision(playerX - playerRadius, playerY)) {
                blockedX = 0;
            }
        }
        
        if (velocityY > 0) {
            // Рух вниз - перевіряємо нижню сторону
            if (this.tilemap.hasCollision(playerX, playerY + playerRadius)) {
                blockedY = 0;
            }
        } else if (velocityY < 0) {
            // Рух вгору - перевіряємо верхню сторону
            if (this.tilemap.hasCollision(playerX, playerY - playerRadius)) {
                blockedY = 0;
            }
        }
        
        // Встановлюємо velocity тільки для дозволених напрямків
        this.player.body.setVelocity(blockedX, blockedY);
    }
    
    removeKiosk(tileX, tileY) {
        // Видаляємо кіоск
        this.tilemap.removeKiosk(tileX, tileY);
    }
    
    pushPlayerAwayFromKiosk() {
        // Відштовхуємо гравця від кіоска
        const playerX = this.player.x;
        const playerY = this.player.y;
        
        // Знаходимо найближчий кіоск
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
        
        // Обчислюємо напрямок від кіоска до гравця
        const dx = playerX - nearestKiosk.worldX;
        const dy = playerY - nearestKiosk.worldY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;
        
        // Нормалізуємо напрямок
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // Відштовхуємо гравця на відстань 40 пікселів від кіоска
        const pushDistance = 40;
        const newX = nearestKiosk.worldX + dirX * (pushDistance + 20); // 20 - радіус кіоска
        const newY = nearestKiosk.worldY + dirY * (pushDistance + 20);
        
        // Перевіряємо чи нова позиція прохідна
        if (this.tilemap.isWalkable(newX, newY)) {
            this.player.setPosition(newX, newY);
            // Оновлюємо заморожену позицію
            if (this.player.isFrozen) {
                this.player.frozenPosition = { x: newX, y: newY };
            }
        } else {
            // Якщо напрямок не прохідний, шукаємо альтернативну позицію
            const tile = this.tilemap.worldToTile(playerX, playerY);
            const directions = [
                { x: 0, y: -1 }, { x: 0, y: 1 },  // Верх, низ
                { x: -1, y: 0 }, { x: 1, y: 0 }, // Ліво, право
                { x: -1, y: -1 }, { x: 1, y: -1 }, // Діагоналі
                { x: -1, y: 1 }, { x: 1, y: 1 }
            ];
            
            for (let radius = 1; radius <= 3; radius++) {
                for (const dir of directions) {
                    const checkTile = { 
                        x: tile.x + dir.x * radius, 
                        y: tile.y + dir.y * radius 
                    };
                    const worldPos = this.tilemap.tileToWorld(checkTile.x, checkTile.y);
                    
                    // Перевіряємо чи це не кіоск і не інша колізія
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
                        // Переміщуємо гравця на прохідну позицію
                        this.player.setPosition(worldPos.x, worldPos.y);
                        // Оновлюємо заморожену позицію
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
        
        // Спавн монет (до максимуму з конфігу)
        const coinCount = config.COINS.MAX_COUNT_ON_MAP;
        for (let i = 0; i < coinCount; i++) {
            this.spawnCoin();
        }
        
        // Спавн бонусів (до максимуму з конфігу)
        const bonusCount = config.BONUSES.MAX_COUNT_ON_MAP;
        for (let i = 0; i < bonusCount; i++) {
            // Шанс спавну бонусу
            if (Math.random() < config.BONUSES.SPAWN_CHANCE) {
                this.spawnBonus();
            }
        }
    }
    
    spawnCoin() {
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            // Генеруємо випадкову позицію по всій карті (не тільки навколо гравця)
            const x = Phaser.Math.Between(100, this.worldWidth - 100);
            const y = Phaser.Math.Between(100, this.worldHeight - 100);
            
            // Перевіряємо чи позиція прохідна
            if (!this.tilemap.isWalkable(x, y)) {
                continue;
            }
            
            // Перевіряємо чи тайл НЕ є будівлею (пікапи не можуть бути в будівлях)
            const tileType = this.tilemap.getTileType(x, y);
            if (tileType === this.tilemap.TILE_TYPES.BUILDING) {
                continue; // Не спавнимо в будівлях
            }
            
            // Перевіряємо чи не дуже близько до інших пікапів (щоб не спавнити дуже близько)
            let tooClose = false;
            for (const pickup of this.pickups) {
                if (pickup && pickup.active) {
                    const distance = Phaser.Math.Distance.Between(x, y, pickup.x, pickup.y);
                    if (distance < 50) { // Мінімальна відстань між пікапами
                        tooClose = true;
                        break;
                    }
                }
            }
            
            // Перевіряємо чи не дуже близько до обмінників
            for (const exchange of this.exchanges) {
                if (exchange && exchange.active) {
                    const distance = Phaser.Math.Distance.Between(x, y, exchange.x, exchange.y);
                    if (distance < 80) {
                        tooClose = true;
                        break;
                    }
                }
            }
            
            // Перевіряємо чи не дуже близько до кіосків
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
            
            // Визначаємо номінал монети згідно співвідношення
            const denomination = this.selectCoinDenomination();
            
            // Створюємо монету з визначеним номіналом
            const coin = new Coin(this, x, y, denomination);
            this.pickups.push(coin);
            
            // Збільшуємо лічильник загальної кількості монет
            this.totalCoinsSpawned++;
            return;
        }
    }
    
    /**
     * Визначає номінал монети згідно співвідношення "один на N"
     * @returns {Object} Об'єкт з value, color та texture
     */
    selectCoinDenomination() {
        const denominations = GAME_CONFIG.PICKUPS.COINS.DENOMINATIONS;
        
        // Знаходимо базовий номінал (10 грн)
        const baseDenomination = denominations.find(d => d.value === 10);
        
        // Перевіряємо чи потрібно замінити на більший номінал
        // Перевіряємо від найбільшого до найменшого (100 -> 50 -> 20)
        const higherDenominations = denominations
            .filter(d => d.value > 10)
            .sort((a, b) => b.value - a.value); // Від більшого до меншого
        
        for (const denom of higherDenominations) {
            // Якщо загальна кількість монет ділиться націло на ratio - спавнимо цей номінал
            if (this.totalCoinsSpawned > 0 && this.totalCoinsSpawned % denom.ratio === 0) {
                return denom;
            }
        }
        
        // Інакше повертаємо базовий номінал (10 грн)
        return baseDenomination;
    }
    
    spawnBonus() {
        let attempts = 0;
        const maxAttempts = 50;
        
        // Зони спавну згідно MVP 8.2
        const safeRadius = 90; // Не спавнити ближче
        const spawnRingMin = 220; // Мінімальна відстань від гравця
        const spawnRingMax = 520; // Максимальна відстань від гравця
        
        while (attempts < maxAttempts) {
            attempts++;
            
            // Генеруємо випадкову позицію в кільці навколо гравця
            const angle = Math.random() * Math.PI * 2;
            const distance = Phaser.Math.Between(spawnRingMin, spawnRingMax);
            
            const x = this.player.x + Math.cos(angle) * distance;
            const y = this.player.y + Math.sin(angle) * distance;
            
            // Перевіряємо чи в межах світу
            if (x < 50 || x > this.worldWidth - 50 || y < 50 || y > this.worldHeight - 50) {
                continue;
            }
            
            // Перевіряємо чи позиція прохідна
            if (!this.tilemap.isWalkable(x, y)) {
                continue;
            }
            
            // Перевіряємо чи тайл НЕ є будівлею (бонуси не можуть бути в будівлях)
            const tileType = this.tilemap.getTileType(x, y);
            if (tileType === this.tilemap.TILE_TYPES.BUILDING) {
                continue; // Не спавнимо в будівлях
            }
            
            // Перевіряємо чи не дуже близько до гравця (додаткова перевірка)
            const distanceToPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
            if (distanceToPlayer < safeRadius) {
                continue;
            }
            
            // Вибираємо випадковий бонус (Scooter та Joke видалено, залишається тільки SmokeCloud)
            const bonusTypes = [SmokeCloud];
            const BonusClass = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
            
            // Створюємо бонус
            const bonus = new BonusClass(this, x, y);
            this.pickups.push(bonus);
            return;
        }
    }
    
    /**
     * Підтримує кількість пікапів на карті (процедурний спавн)
     * Монети та бонуси спавняться по всій карті до максимуму
     */
    maintainPickups() {
        if (!this.player || !this.tilemap) return;
        
        const config = GAME_CONFIG.PICKUPS;
        
        // Підраховуємо активні монети та бонуси
        const activeCoins = this.pickups.filter(p => p instanceof Coin && p.active);
        const activeBonuses = this.pickups.filter(p => 
            !(p instanceof Coin) && p.active && p.applyEffect
        );
        
        // Підтримуємо монети (максимум з конфігу)
        const maxCoins = config.COINS.MAX_COUNT_ON_MAP;
        
        if (activeCoins.length < maxCoins) {
            // Доспавнюємо монети до максимуму
            const needed = maxCoins - activeCoins.length;
            for (let i = 0; i < needed; i++) {
                this.spawnCoin();
            }
        }
        
        // Підтримуємо бонуси (максимум з конфігу)
        const maxBonuses = config.BONUSES.MAX_COUNT_ON_MAP;
        
        if (activeBonuses.length < maxBonuses) {
            // Доспавнюємо бонуси до максимуму
            const needed = maxBonuses - activeBonuses.length;
            for (let i = 0; i < needed; i++) {
                // Шанс спавну бонусу
                if (Math.random() < config.BONUSES.SPAWN_CHANCE) {
                    this.spawnBonus();
                }
            }
        }
    }
    
    /**
     * Видаляє пікапи які далеко позаду гравця (cleanup для оптимізації)
     */
    cleanupPickups() {
        if (!this.player) return;
        
        const cleanupDistance = 800; // Відстань позаду гравця для видалення
        const playerX = this.player.x;
        const playerY = this.player.y;
        
        // Визначаємо напрямок руху гравця (приблизно)
        const velocityX = this.player.body ? this.player.body.velocity.x : 0;
        const velocityY = this.player.body ? this.player.body.velocity.y : 0;
        
        // Якщо гравець не рухається - не видаляємо
        if (Math.abs(velocityX) < 10 && Math.abs(velocityY) < 10) {
            return;
        }
        
        // Нормалізуємо напрямок руху
        const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        if (speed < 10) return;
        
        const dirX = velocityX / speed;
        const dirY = velocityY / speed;
        
        // Видаляємо пікапи позаду гравця
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const pickup = this.pickups[i];
            if (!pickup || !pickup.active) {
                this.pickups.splice(i, 1);
                continue;
            }
            
            // Вектор від гравця до пікапа
            const dx = pickup.x - playerX;
            const dy = pickup.y - playerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Якщо пікап далеко
            if (distance > cleanupDistance) {
                // Перевіряємо чи він позаду гравця (скалярний добуток < 0)
                const dotProduct = dx * dirX + dy * dirY;
                
                if (dotProduct < 0) {
                    // Пікап позаду - видаляємо
                    if (pickup.body) {
                        pickup.body.destroy();
                    }
                    pickup.destroy();
                    this.pickups.splice(i, 1);
                }
            }
        }
    }
    
    handleGameOver() {
        // runMoney НЕ додається в банк (гроші згорають)
        // Обміняні гроші вже додані через обмінники
        
        // Отримуємо поточний баланс банку та обчислюємо скільки додали за гру
        const currentBankedMoney = this.saveSystem.getBankedMoney();
        const moneyAddedThisGame = currentBankedMoney - (this.initialBankedMoney || 0);
        
        // Перехід до ResultScene з даними
        this.scene.start('ResultScene', {
            currentBankedMoney: currentBankedMoney,
            moneyAddedThisGame: moneyAddedThisGame,
            timeSurvived: this.timeSurvived
        });
    }
}

export default GameScene;