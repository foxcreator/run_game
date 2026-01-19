class SpriteManager {
    constructor() {
        this.TILE_SPRITES = {
            ROAD: {
                type: 'color',
                value: 0x808080,
                width: 32,
                height: 32
            },
            SIDEWALK: {
                type: 'color',
                value: 0xffd700,
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
                value: 0x8b0000,
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
                value: 0x000000,
                width: 32,
                height: 32
            }
        };
        this.PLAYER_SPRITE = {
            type: 'color',
            value: 0x3498db,
            radius: 15,
            strokeColor: 0xffffff,
            strokeWidth: 2
        };
        this.CHASER_SPRITES = {
            BLOCKER: {
                type: 'color',
                value: 0xe74c3c,
                radius: 12,
                strokeColor: 0xffffff,
                strokeWidth: 2
            },
            STICKER: {
                type: 'color',
                value: 0x9b59b6,
                radius: 12,
                strokeColor: 0xffffff,
                strokeWidth: 2
            }
        };
        this.OBSTACLE_SPRITES = {
            SOFT_CROWD: {
                type: 'color',
                value: 0xff6b6b,
                width: 80,
                height: 40
            },
            PUDDLE_SLIP: {
                type: 'color',
                value: 0x4169e1,
                width: 50,
                height: 50,
                shape: 'circle'
            },
            TAPE_GATE: {
                type: 'color',
                value: 0xffa500,
                width: 60,
                height: 20
            },
            MOVING_BUS: {
                type: 'color',
                value: 0x8b4513,
                width: 60,
                height: 30
            },
            PAPER_STACK: {
                type: 'color',
                value: 0xf5f5f5,
                width: 30,
                height: 30
            }
        };
        this.PICKUP_SPRITES = {
            COIN: {
                type: 'color',
                value: 0xffd700,
                width: 16,
                height: 16,
                shape: 'rectangle'
            },
            COIN_10: {
                type: 'texture',
                value: 'coin_10',
                width: 32,
                height: 32
            },
            COIN_20: {
                type: 'texture',
                value: 'coin_20',
                width: 40,
                height: 40
            },
            COIN_50: {
                type: 'texture',
                value: 'coin_50',
                width: 48,
                height: 48
            },
            COIN_100: {
                type: 'texture',
                value: 'coin_100',
                width: 56,
                height: 56
            },
            SCOOTER: {
                type: 'color',
                value: 0xff00ff,
                width: 20,
                height: 20,
                shape: 'rectangle'
            },
            SMOKE: {
                type: 'color',
                value: 0x808080,
                width: 20,
                height: 20,
                shape: 'circle'
            }
        };
    }
    createTileSprite(scene, tileType, x, y) {
        const spriteConfig = this.TILE_SPRITES[tileType];
        if (!spriteConfig) {
            return null;
        }
        if (spriteConfig.type === 'texture') {
            return scene.add.image(x, y, spriteConfig.value);
        } else {
            return scene.add.rectangle(x, y, spriteConfig.width, spriteConfig.height, spriteConfig.value);
        }
    }
    createPlayerSprite(scene) {
        const config = this.PLAYER_SPRITE;
        if (config.type === 'texture') {
            return config.value;
        } else {
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
    createChaserSprite(scene, chaserType) {
        const config = chaserType === 'Blocker'
            ? this.CHASER_SPRITES.BLOCKER
            : this.CHASER_SPRITES.STICKER;
        const textureKey = `chaser-${chaserType}`;
        if (config.type === 'texture') {
            return config.value;
        } else {
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
    createObstacleSprite(scene, obstacleType, x, y) {
        const config = this.OBSTACLE_SPRITES[obstacleType];
        if (!config) {
            return null;
        }
        if (config.type === 'texture') {
            return scene.add.image(x, y, config.value);
        } else {
            if (config.shape === 'circle') {
                return scene.add.circle(x, y, config.width / 2, config.value);
            } else {
                return scene.add.rectangle(x, y, config.width, config.height, config.value);
            }
        }
    }
    createPickupSprite(scene, pickupType, x, y) {
        const config = this.PICKUP_SPRITES[pickupType];
        if (!config) {
            return null;
        }
        if (config.type === 'texture') {
            return scene.add.image(x, y, config.value);
        } else {
            if (config.shape === 'circle') {
                return scene.add.circle(x, y, config.width / 2, config.value);
            } else {
                return scene.add.rectangle(x, y, config.width, config.height, config.value);
            }
        }
    }
    getTileColor(tileType) {
        const config = this.TILE_SPRITES[tileType];
        if (config && config.type === 'color') {
            return config.value;
        }
        return 0x808080;
    }
}
const spriteManager = new SpriteManager();
export default spriteManager;