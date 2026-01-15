// BootScene - ініціалізаційна сцена
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
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