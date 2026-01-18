// Точка входу гри
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import ResultScene from './scenes/ResultScene.js';
import ShopScene from './scenes/ShopScene.js';

// Базові розміри гри (16:9 aspect ratio)
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    scale: {
        mode: Phaser.Scale.WIDTH_CONTROLS_HEIGHT, // Ширина контролює висоту - гра завжди на всю ширину
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        min: {
            width: GAME_WIDTH,
            height: GAME_HEIGHT
        },
        max: {
            width: GAME_WIDTH * 2,
            height: GAME_HEIGHT * 2
        }
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    dom: {
        createContainer: true
    },
    scene: [BootScene, MenuScene, GameScene, ResultScene, ShopScene]
};

const game = new Phaser.Game(config);

// Обробка зміни розміру вікна
window.addEventListener('resize', () => {
    game.scale.refresh();
});