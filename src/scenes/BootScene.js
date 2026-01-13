// BootScene - ініціалізаційна сцена
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Тут буде завантаження ресурсів пізніше
        // Поки що просто переходимо до меню
    }

    create() {
        // Переходимо до меню
        this.scene.start('MenuScene');
    }
}

export default BootScene;