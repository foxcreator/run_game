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
        
        // Завантажуємо текстуру обмінника
        this.load.image('exchange', './src/assets/textures/exchange.png');
        
        // Завантажуємо текстуру калюж
        this.load.image('lake', './src/assets/textures/lake.png');
        
        // Обробка помилок завантаження
        this.load.on('loaderror', (file) => {
            console.error('❌ Помилка завантаження файлу:', file.key, file.url);
        });
    }

    create() {
        // Переходимо до меню
        this.scene.start('MenuScene');
    }
}

export default BootScene;