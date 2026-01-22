import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import ResultScene from './scenes/ResultScene.js';
import ShopScene from './scenes/ShopScene.js';
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    scale: {
        mode: Phaser.Scale.WIDTH_CONTROLS_HEIGHT,
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
    audio: {
        disableWebAudio: false,
        noAudio: false,
        context: false // Не створювати контекст одразу
    },
    scene: [BootScene, MenuScene, GameScene, ResultScene, ShopScene]
};
const game = new Phaser.Game(config);
window.addEventListener('resize', () => {
    game.scale.refresh();
});