// Obstacle - базовий клас для перешкод
import { GAME_CONFIG } from '../config/gameConfig.js';

class Obstacle extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y, width, height, color, type) {
        super(scene, x, y, width, height, color, 1.0);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.type = type; // Тип перешкоди
        this.body.setImmovable(true);
        this.setOrigin(0.5);
        this.setDepth(0); // Перешкоди під гравцем та HUD
        
        // Флаг активності
        this.active = true;
    }
    
    // Метод для обробки колізії з гравцем (перевизначається в підкласах)
    onPlayerCollision(player) {
        // Базова реалізація - нічого не робить
    }
    
    // Оновлення перешкоди (перевизначається в підкласах)
    update(delta) {
        // Базова реалізація - нічого не робить
    }
    
    destroy() {
        if (this.body) {
            this.body.destroy();
        }
        super.destroy();
    }
}

export default Obstacle;
