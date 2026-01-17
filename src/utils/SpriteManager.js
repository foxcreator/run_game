// SpriteManager - централізоване управління спрайтами та візуалізацією
// Тут можна легко замінювати кольорові квадрати на зображення
//
// ІНСТРУКЦІЯ ПО ЗАМІНІ КОЛЬОРІВ НА ЗОБРАЖЕННЯ:
// 1. Завантажте зображення в BootScene.js → preload():
//    this.load.image('my-sprite', 'assets/path/to/image.png');
//
// 2. Змініть конфігурацію об'єкта:
//    type: 'color' → type: 'texture'
//    value: 0x808080 → value: 'my-sprite'
//
// 3. Детальні інструкції: див. SPRITE_MANAGER_GUIDE.md

class SpriteManager {
    constructor() {
        // ============================================
        // ТАЙЛИ КАРТИ (Tilemap)
        // ============================================
        this.TILE_SPRITES = {
            // За замовчуванням використовуються кольори
            // Для заміни на зображення: замініть на ключі текстур
            ROAD: {
                type: 'color', // 'color' або 'texture'
                value: 0x808080, // Колір (сірий) або ключ текстури
                width: 32,
                height: 32
            },
            SIDEWALK: {
                type: 'color',
                value: 0xffd700, // Колір (жовтий)
                width: 32,
                height: 32
            },
            YARD: {
                type: 'texture',
                value: 'grass',
                width: 32,
                height: 32
            },
            BUILDING: {
                type: 'color',
                value: 0x8b0000, // Колір (червоний)
                width: 32,
                height: 32
            },
            KIOSK: {
                type: 'texture',
                value: 'kiosk',
                width: 32,
                height: 32
            },
            FENCE: {
                type: 'color',
                value: 0x000000, // Колір (чорний)
                width: 32,
                height: 32
            }
        };

        // ============================================
        // ГРАВЕЦЬ (Player)
        // ============================================
        this.PLAYER_SPRITE = {
            type: 'color', // 'color' або 'texture'
            value: 0x3498db, // Колір (синій) або ключ текстури 'player'
            radius: 15,
            strokeColor: 0xffffff,
            strokeWidth: 2
        };

        // ============================================
        // ВОРОГИ (Chasers)
        // ============================================
        this.CHASER_SPRITES = {
            BLOCKER: {
                type: 'color',
                value: 0xe74c3c, // Колір (червоний)
                radius: 12,
                strokeColor: 0xffffff,
                strokeWidth: 2
            },
            STICKER: {
                type: 'color',
                value: 0x9b59b6, // Колір (фіолетовий)
                radius: 12,
                strokeColor: 0xffffff,
                strokeWidth: 2
            }
        };

        // ============================================
        // ПЕРЕШКОДИ (Obstacles)
        // ============================================
        this.OBSTACLE_SPRITES = {
            SOFT_CROWD: {
                type: 'color',
                value: 0xff6b6b, // Колір (червоний)
                width: 80,
                height: 40
            },
            PUDDLE_SLIP: {
                type: 'color',
                value: 0x4169e1, // Колір (блакитний)
                width: 50,
                height: 50,
                shape: 'circle' // 'rectangle' або 'circle'
            },
            TAPE_GATE: {
                type: 'color',
                value: 0xffa500, // Колір (помаранчевий)
                width: 60,
                height: 20
            },
            MOVING_BUS: {
                type: 'color',
                value: 0x8b4513, // Колір (коричневий)
                width: 60,
                height: 30
            },
            PAPER_STACK: {
                type: 'color',
                value: 0xf5f5f5, // Колір (світло-сірий)
                width: 30,
                height: 30
            }
        };

        // ============================================
        // ПІКАПИ (Pickups)
        // ============================================
        this.PICKUP_SPRITES = {
            COIN: {
                type: 'color',
                value: 0xffd700, // Колір (золотий) - базовий, для різних номіналів використовується color з конфігу
                width: 16,
                height: 16,
                shape: 'rectangle' // 'rectangle' або 'circle'
            },
            // Монети різних номіналів (використовують текстури)
            COIN_10: {
                type: 'texture',
                value: 'coin_10', // Текстура 10 грн
                width: 32,
                height: 32
            },
            COIN_20: {
                type: 'texture',
                value: 'coin_20', // Текстура 20 грн
                width: 40,
                height: 40
            },
            COIN_50: {
                type: 'texture',
                value: 'coin_50', // Текстура 50 грн
                width: 48,
                height: 48
            },
            COIN_100: {
                type: 'texture',
                value: 'coin_100', // Текстура 100 грн
                width: 56,
                height: 56
            },
            SCOOTER: {
                type: 'color',
                value: 0xff00ff, // Пурпурний (скутер)
                width: 20,
                height: 20,
                shape: 'rectangle'
            },
            SMOKE: {
                type: 'color',
                value: 0x808080, // Сірий (димова хмарка)
                width: 20,
                height: 20,
                shape: 'circle'
            }
        };
    }

    // ============================================
    // МЕТОДИ ДЛЯ СТВОРЕННЯ СПРАЙТІВ
    // ============================================

    /**
     * Створює спрайт тайла карти
     * @param {Phaser.Scene} scene - Сцена Phaser
     * @param {string} tileType - Тип тайла (ROAD, SIDEWALK, etc.)
     * @param {number} x - Позиція X
     * @param {number} y - Позиція Y
     * @returns {Phaser.GameObjects.GameObject} Створений об'єкт
     */
    createTileSprite(scene, tileType, x, y) {
        const spriteConfig = this.TILE_SPRITES[tileType];
        if (!spriteConfig) {
            console.warn(`Не знайдено конфігурацію для тайла: ${tileType}`);
            return null;
        }

        if (spriteConfig.type === 'texture') {
            // Використовуємо текстуру
            return scene.add.image(x, y, spriteConfig.value);
        } else {
            // Використовуємо колір
            return scene.add.rectangle(x, y, spriteConfig.width, spriteConfig.height, spriteConfig.value);
        }
    }

    /**
     * Створює спрайт гравця
     * @param {Phaser.Scene} scene - Сцена Phaser
     * @returns {string} Ключ текстури для використання
     */
    createPlayerSprite(scene) {
        const config = this.PLAYER_SPRITE;
        
        if (config.type === 'texture') {
            // Якщо текстура вже завантажена, просто повертаємо ключ
            return config.value;
        } else {
            // Створюємо текстуру з кольору
            const radius = config.radius;
            const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(config.value, 1);
            graphics.fillCircle(radius, radius, radius);
            graphics.lineStyle(config.strokeWidth, config.strokeColor, 1);
            graphics.strokeCircle(radius, radius, radius);
            graphics.generateTexture('player', radius * 2, radius * 2);
            graphics.destroy();
            return 'player';
        }
    }

    /**
     * Створює спрайт ворога
     * @param {Phaser.Scene} scene - Сцена Phaser
     * @param {string} chaserType - Тип ворога ('Blocker' або 'Sticker')
     * @returns {string} Ключ текстури для використання
     */
    createChaserSprite(scene, chaserType) {
        const config = chaserType === 'Blocker' 
            ? this.CHASER_SPRITES.BLOCKER 
            : this.CHASER_SPRITES.STICKER;
        
        const textureKey = `chaser-${chaserType}`;
        
        if (config.type === 'texture') {
            // Якщо текстура вже завантажена, просто повертаємо ключ
            return config.value;
        } else {
            // Створюємо текстуру з кольору
            const radius = config.radius;
            const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(config.value, 1);
            graphics.fillCircle(radius, radius, radius);
            graphics.lineStyle(config.strokeWidth, config.strokeColor, 1);
            graphics.strokeCircle(radius, radius, radius);
            graphics.generateTexture(textureKey, radius * 2, radius * 2);
            graphics.destroy();
            return textureKey;
        }
    }

    /**
     * Створює спрайт перешкоди
     * @param {Phaser.Scene} scene - Сцена Phaser
     * @param {string} obstacleType - Тип перешкоди
     * @param {number} x - Позиція X
     * @param {number} y - Позиція Y
     * @returns {Phaser.GameObjects.GameObject} Створений об'єкт
     */
    createObstacleSprite(scene, obstacleType, x, y) {
        const config = this.OBSTACLE_SPRITES[obstacleType];
        if (!config) {
            console.warn(`Не знайдено конфігурацію для перешкоди: ${obstacleType}`);
            return null;
        }

        if (config.type === 'texture') {
            // Використовуємо текстуру
            return scene.add.image(x, y, config.value);
        } else {
            // Використовуємо колір
            if (config.shape === 'circle') {
                return scene.add.circle(x, y, config.width / 2, config.value);
            } else {
                return scene.add.rectangle(x, y, config.width, config.height, config.value);
            }
        }
    }

    /**
     * Створює спрайт пікапа
     * @param {Phaser.Scene} scene - Сцена Phaser
     * @param {string} pickupType - Тип пікапа
     * @param {number} x - Позиція X
     * @param {number} y - Позиція Y
     * @returns {Phaser.GameObjects.GameObject} Створений об'єкт
     */
    createPickupSprite(scene, pickupType, x, y) {
        const config = this.PICKUP_SPRITES[pickupType];
        if (!config) {
            console.warn(`Не знайдено конфігурацію для пікапа: ${pickupType}`);
            return null;
        }

        if (config.type === 'texture') {
            // Використовуємо текстуру
            return scene.add.image(x, y, config.value);
        } else {
            // Використовуємо колір
            if (config.shape === 'circle') {
                return scene.add.circle(x, y, config.width / 2, config.value);
            } else {
                return scene.add.rectangle(x, y, config.width, config.height, config.value);
            }
        }
    }

    /**
     * Отримує колір тайла (для сумісності зі старим кодом)
     * @param {string} tileType - Тип тайла
     * @returns {number} Колір у форматі hex
     */
    getTileColor(tileType) {
        const config = this.TILE_SPRITES[tileType];
        if (config && config.type === 'color') {
            return config.value;
        }
        return 0x808080; // За замовчуванням сірий
    }
}

// Експортуємо singleton екземпляр
const spriteManager = new SpriteManager();
export default spriteManager;
