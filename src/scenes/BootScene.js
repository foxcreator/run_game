import LoadingScreen from '../utils/LoadingScreen.js';

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // HTML лоадер (спінер) вже показується в index.html
        // Він буде прихований у create(), коли завантаження завершиться.

        // ТІЛЬКИ НЕОБХІДНЕ ДЛЯ МЕНЮ - швидке завантаження!
        this.load.image('menu_background', './src/assets/menu/background.png');
        this.load.image('gameover_background', './src/assets/menu/gameover_background.jpeg');
        this.load.image('kiosk', './src/assets/textures/kiosk.png');
        this.load.image('grass', './src/assets/textures/grass.png');
        this.load.image('map', './src/assets/textures/map.jpeg');
        this.load.image('collision_map', './src/assets/textures/collision_map.jpeg');
        this.load.image('car_red', './src/assets/textures/cars/red_car.png');
        this.load.image('car_white', './src/assets/textures/cars/white_car.png');
        this.load.image('standing_front', './src/assets/textures/player/standing_front.png');
        this.load.image('standing_rear', './src/assets/textures/player/standing_rear.png');
        this.load.image('standing_left', './src/assets/textures/player/standing_left.png');
        this.load.image('standing_right', './src/assets/textures/player/standing_right.png');
        this.load.image('front_1', './src/assets/textures/player/front_1.png');
        this.load.image('front_2', './src/assets/textures/player/front_2.png');
        this.load.image('front_3', './src/assets/textures/player/front_3.png');
        this.load.image('front_4', './src/assets/textures/player/front_4.png');
        this.load.image('rear_1', './src/assets/textures/player/rear_1.png');
        this.load.image('rear_2', './src/assets/textures/player/rear_2.png');
        this.load.image('rear_3', './src/assets/textures/player/rear_3.png');
        this.load.image('rear_4', './src/assets/textures/player/rear_4.png');
        this.load.image('left_1', './src/assets/textures/player/left_1.png');
        this.load.image('left_2', './src/assets/textures/player/left_2.png');
        this.load.image('left_3', './src/assets/textures/player/left_3.png');
        this.load.image('left_4', './src/assets/textures/player/left_4.png');
        this.load.image('right_1', './src/assets/textures/player/right_1.png');
        this.load.image('right_2', './src/assets/textures/player/right_2.png');
        this.load.image('right_3', './src/assets/textures/player/right_3.png');
        this.load.image('right_4', './src/assets/textures/player/right_4.png');
        this.load.image('sliding', './src/assets/textures/player/sliding.png');
        this.load.image('fall_1', './src/assets/textures/player/fall_1.png');
        this.load.image('fall_2', './src/assets/textures/player/fall_2.png');
        this.load.image('coin_10', './src/assets/textures/pickups/10_uah.png');
        this.load.image('coin_20', './src/assets/textures/pickups/20_uah.png');
        this.load.image('coin_50', './src/assets/textures/pickups/50_uah.png');
        this.load.image('coin_100', './src/assets/textures/pickups/100_uah.png');
        this.load.image('scooter', './src/assets/textures/pickups/scooter.png');
        this.load.image('cloud', './src/assets/textures/pickups/cloud.png');
        this.load.image('exchange', './src/assets/textures/exchange.png');
        this.load.image('lake', './src/assets/textures/lake.png');
        this.load.image('blocker_standing_front', './src/assets/textures/enemy-1/standing_front.png');
        this.load.image('blocker_standing_rear', './src/assets/textures/enemy-1/standing_rear.png');
        this.load.image('blocker_standing_left', './src/assets/textures/enemy-1/standing_left.png');
        this.load.image('blocker_standing_right', './src/assets/textures/enemy-1/standing_right.png');
        this.load.image('blocker_front_1', './src/assets/textures/enemy-1/front_1.png');
        this.load.image('blocker_front_2', './src/assets/textures/enemy-1/front_2.png');
        this.load.image('blocker_front_3', './src/assets/textures/enemy-1/front_3.png');
        this.load.image('blocker_front_4', './src/assets/textures/enemy-1/front_4.png');
        this.load.image('blocker_rear_1', './src/assets/textures/enemy-1/rear_1.png');
        this.load.image('blocker_rear_2', './src/assets/textures/enemy-1/rear_2.png');
        this.load.image('blocker_rear_3', './src/assets/textures/enemy-1/rear_3.png');
        this.load.image('blocker_rear_4', './src/assets/textures/enemy-1/rear_4.png');
        this.load.image('blocker_left_1', './src/assets/textures/enemy-1/left_1.png');
        this.load.image('blocker_left_2', './src/assets/textures/enemy-1/left_2.png');
        this.load.image('blocker_left_3', './src/assets/textures/enemy-1/left_3.png');
        this.load.image('blocker_left_4', './src/assets/textures/enemy-1/left_4.png');
        this.load.image('blocker_right_1', './src/assets/textures/enemy-1/right_1.png');
        this.load.image('blocker_right_2', './src/assets/textures/enemy-1/right_2.png');
        this.load.image('blocker_right_3', './src/assets/textures/enemy-1/right_3.png');
        this.load.image('blocker_right_4', './src/assets/textures/enemy-1/right_4.png');
        this.load.image('blocker_fall_1', './src/assets/textures/enemy-1/fall_1.png');
        this.load.image('sticker_standing_front', './src/assets/textures/enemy-2/standing_front.png');
        this.load.image('sticker_standing_rear', './src/assets/textures/enemy-2/standing_rear.png');
        this.load.image('sticker_standing_left', './src/assets/textures/enemy-2/standing_left.png');
        this.load.image('sticker_standing_right', './src/assets/textures/enemy-2/standing_right.png');
        this.load.image('sticker_front_1', './src/assets/textures/enemy-2/front_1.png');
        this.load.image('sticker_front_2', './src/assets/textures/enemy-2/front_2.png');
        this.load.image('sticker_front_3', './src/assets/textures/enemy-2/front_3.png');
        this.load.image('sticker_front_4', './src/assets/textures/enemy-2/front_4.png');
        this.load.image('sticker_rear_1', './src/assets/textures/enemy-2/rear_1.png');
        this.load.image('sticker_rear_2', './src/assets/textures/enemy-2/rear_2.png');
        this.load.image('sticker_rear_3', './src/assets/textures/enemy-2/rear_3.png');
        this.load.image('sticker_rear_4', './src/assets/textures/enemy-2/rear_4.png');
        this.load.image('sticker_left_1', './src/assets/textures/enemy-2/left_1.png');
        this.load.image('sticker_left_2', './src/assets/textures/enemy-2/left_2.png');
        this.load.image('sticker_left_3', './src/assets/textures/enemy-2/left_3.png');
        this.load.image('sticker_left_4', './src/assets/textures/enemy-2/left_4.png');
        this.load.image('sticker_right_1', './src/assets/textures/enemy-2/right_1.png');
        this.load.image('sticker_right_2', './src/assets/textures/enemy-2/right_2.png');
        this.load.image('sticker_right_3', './src/assets/textures/enemy-2/right_3.png');
        this.load.image('sticker_right_4', './src/assets/textures/enemy-2/right_4.png');
        this.load.image('sticker_fall_1', './src/assets/textures/enemy-2/fall_1.png');
        this.load.image('sticker_fall_2', './src/assets/textures/enemy-2/fall_2.png');

        // ТІЛЬКИ 1 музичний трек для меню (економимо ~20MB!)
        // ✅ ВСЕІ МУЗИКА
        this.load.audio('back_1', './src/assets/music/back_1.mp3');
        this.load.audio('back_2', './src/assets/music/back_2.mp3');
        this.load.audio('back_3', './src/assets/music/back_3.mp3');
        this.load.audio('back_4', './src/assets/music/back_4.mp3');
        this.load.audio('back_5', './src/assets/music/back_5.mp3');
        this.load.audio('back_6', './src/assets/music/back_6.mp3');
        this.load.audio('back_7', './src/assets/music/back_7.mp3');
        this.load.audio('back_8', './src/assets/music/back_8.mp3');
        this.load.audio('gameover', './src/assets/music/gameover.mp3');

        // ✅ ВСІ ЗВУКИ (як було раніше!)
        this.load.audio('running', './src/assets/sounds/running.mp3');
        this.load.audio('money', './src/assets/sounds/money.wav');
        this.load.audio('pickup', './src/assets/sounds/pickup.mp3');
        this.load.audio('drink', './src/assets/sounds/Drink.wav');
        this.load.audio('exchange_sound', './src/assets/sounds/exchange.mp3');
        this.load.audio('menu_hover', './src/assets/sounds/menu_hover.wav');
        this.load.audio('menu_choise', './src/assets/sounds/menu_choise.wav');
        this.load.audio('police_siren', './src/assets/sounds/stop_uhilant.mp3');
        this.load.audio('fall', './src/assets/sounds/fall.ogg');

        // ✅ ENGINE SOUNDS
        this.load.audio('engine_01', './src/assets/sounds/engine-sounds/motorseamless01.wav');
        this.load.audio('engine_03', './src/assets/sounds/engine-sounds/motorseamless03.wav');
        this.load.audio('engine_05', './src/assets/sounds/engine-sounds/motorseamless05.wav');
        this.load.audio('engine_07', './src/assets/sounds/engine-sounds/motorseamless07.wav');
        this.load.audio('engine_09', './src/assets/sounds/engine-sounds/motorseamless09.wav');
        this.load.audio('engine_11', './src/assets/sounds/engine-sounds/motorseamless11.wav');
        this.load.audio('engine_13', './src/assets/sounds/engine-sounds/motorseamless13.wav');

        // ⚠️ AMBIENT SOUNDS (247MB!) - повільне завантаження!
        this.load.audio('ambience_river', './src/assets/sounds/ambience/river.wav');

        // ✅ BONUS ICONS
        this.load.image('bonus_spinner', './src/assets/bonuses/bonus_spinner.png');
        this.load.image('bonus_officnik', './src/assets/bonuses/bonus_officnik.png');
        this.load.image('bonus_teren', './src/assets/bonuses/bonus_teren.png');
        this.load.image('bonus_deputy', './src/assets/bonuses/bonus_deputy.png');
        this.load.image('bonus_coffee', './src/assets/bonuses/bonus_coffee.png');
        this.load.image('bonus_salo', './src/assets/bonuses/bonus_salo.png');
        this.load.image('bonus_armor', './src/assets/bonuses/bonus_armor.png');
        this.load.image('bonus_magnate', './src/assets/bonuses/bonus_magnate.png');
        this.load.image('bonus_base', './src/assets/bonuses/bonus_coffee.png'); // Fallback

        // ✅ NEW MENU BG
        this.load.image('menu_city', './src/assets/menu/menu_city.png');

        this.load.on('loaderror', (file) => {
        });
    }

    create() {
        // Приховуємо HTML лоадер, коли завантаження завершено
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'none';
        }

        this.scene.start('MenuScene');
    }

    update() {
        // Логіка переходу тепер у create()
    }
}
export default BootScene;