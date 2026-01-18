// BootScene - ініціалізаційна сцена
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Завантажуємо фонове зображення для меню
        this.load.image('menu_background', './src/assets/menu/background.png');
        // Завантажуємо фонове зображення для екрану закінчення гри
        this.load.image('gameover_background', './src/assets/menu/gameover_background.jpeg');
        
        // Завантажуємо текстуру кіоска
        // Спробуємо різні варіанти шляху
        this.load.image('kiosk', './src/assets/textures/kiosk.png');
        this.load.image('grass', './src/assets/textures/grass.png');
        
        // Завантажуємо текстури карти
        this.load.image('map', './src/assets/textures/map.jpeg');
        this.load.image('collision_map', './src/assets/textures/collision_map.jpeg');
        
        // Завантажуємо текстури авто з папки cars
        this.load.image('car_red', './src/assets/textures/cars/red_car.png');
        this.load.image('car_white', './src/assets/textures/cars/white_car.png');
        
        // Завантажуємо текстури гравця
        // Standing (статичні пози)
        this.load.image('standing_front', './src/assets/textures/player/standing_front.png');
        this.load.image('standing_rear', './src/assets/textures/player/standing_rear.png');
        this.load.image('standing_left', './src/assets/textures/player/standing_left.png');
        this.load.image('standing_right', './src/assets/textures/player/standing_right.png');
        
        // Running animations (біг по напрямках)
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
        
        // Спеціальні анімації
        this.load.image('sliding', './src/assets/textures/player/sliding.png');
        this.load.image('fall_1', './src/assets/textures/player/fall_1.png');
        this.load.image('fall_2', './src/assets/textures/player/fall_2.png');
        
        // Завантажуємо текстури монет різних номіналів
        this.load.image('coin_10', './src/assets/textures/pickups/10_uah.png');
        this.load.image('coin_20', './src/assets/textures/pickups/20_uah.png');
        this.load.image('coin_50', './src/assets/textures/pickups/50_uah.png');
        this.load.image('coin_100', './src/assets/textures/pickups/100_uah.png');
        
        // Завантажуємо текстуру скутера
        this.load.image('scooter', './src/assets/textures/pickups/scooter.png');
        
        // Завантажуємо текстуру обмінника
        this.load.image('exchange', './src/assets/textures/exchange.png');
        
        // Завантажуємо текстуру калюж
        this.load.image('lake', './src/assets/textures/lake.png');
        
        // Завантажуємо текстури для ворога BLOCKER (enemy-1)
        // Standing (статичні пози)
        this.load.image('blocker_standing_front', './src/assets/textures/enemy-1/standing_front.png');
        this.load.image('blocker_standing_rear', './src/assets/textures/enemy-1/standing_rear.png');
        this.load.image('blocker_standing_left', './src/assets/textures/enemy-1/standing_left.png');
        this.load.image('blocker_standing_right', './src/assets/textures/enemy-1/standing_right.png');
        
        // Running animations (біг по напрямках)
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
        
        // Спеціальна анімація падіння
        this.load.image('blocker_fall_1', './src/assets/textures/enemy-1/fall_1.png');
        
        // Завантажуємо текстури для ворога STICKER (enemy-2)
        // Standing (статичні пози)
        this.load.image('sticker_standing_front', './src/assets/textures/enemy-2/standing_front.png');
        this.load.image('sticker_standing_rear', './src/assets/textures/enemy-2/standing_rear.png');
        this.load.image('sticker_standing_left', './src/assets/textures/enemy-2/standing_left.png');
        this.load.image('sticker_standing_right', './src/assets/textures/enemy-2/standing_right.png');
        
        // Running animations (біг по напрямках)
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
        
        // Спеціальна анімація падіння
        this.load.image('sticker_fall_1', './src/assets/textures/enemy-2/fall_1.png');
        this.load.image('sticker_fall_2', './src/assets/textures/enemy-2/fall_2.png');
        
        // Завантажуємо музичні треки
        this.load.audio('back_1', './src/assets/music/back_1.mp3');
        this.load.audio('back_2', './src/assets/music/back_2.mp3');
        this.load.audio('back_3', './src/assets/music/back_3.mp3');
        this.load.audio('back_4', './src/assets/music/back_4.mp3');
        this.load.audio('back_5', './src/assets/music/back_5.mp3');
        this.load.audio('back_6', './src/assets/music/back_6.mp3');
        this.load.audio('back_7', './src/assets/music/back_7.mp3');
        this.load.audio('back_8', './src/assets/music/back_8.mp3');
        this.load.audio('gameover', './src/assets/music/gameover.mp3');
        
        // Завантажуємо звукові ефекти
        this.load.audio('running', './src/assets/sounds/running.mp3');
        this.load.audio('money', './src/assets/sounds/money.wav');
        this.load.audio('drink', './src/assets/sounds/Drink.wav');
        this.load.audio('exchange_sound', './src/assets/sounds/exchange.mp3'); // Змінено з 'exchange' на 'exchange_sound'
        this.load.audio('menu_hover', './src/assets/sounds/menu_hover.wav');
        this.load.audio('menu_choise', './src/assets/sounds/menu_choise.wav');
        this.load.audio('police_siren', './src/assets/sounds/stop_uhilant.mp3');
        
        // Завантажуємо звуки двигунів автомобілів
        this.load.audio('engine_01', './src/assets/sounds/engine-sounds/motorseamless01.wav');
        this.load.audio('engine_03', './src/assets/sounds/engine-sounds/motorseamless03.wav');
        this.load.audio('engine_05', './src/assets/sounds/engine-sounds/motorseamless05.wav');
        this.load.audio('engine_07', './src/assets/sounds/engine-sounds/motorseamless07.wav');
        this.load.audio('engine_09', './src/assets/sounds/engine-sounds/motorseamless09.wav');
        this.load.audio('engine_11', './src/assets/sounds/engine-sounds/motorseamless11.wav');
        this.load.audio('engine_13', './src/assets/sounds/engine-sounds/motorseamless13.wav');
        
        // Обробка помилок завантаження
        this.load.on('loaderror', (file) => {
        });
    }

    create() {
        // Переходимо до меню
        this.scene.start('MenuScene');
    }
}

export default BootScene;