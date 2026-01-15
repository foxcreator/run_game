// Coin - монета (пікап)
import spriteManager from '../utils/SpriteManager.js';

class Coin extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y) {
        const config = spriteManager.PICKUP_SPRITES.COIN;
        const size = config.width;
        const color = config.type === 'color' ? config.value : 0xffd700;
        
        super(scene, x, y, size, size, color);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setOrigin(0.5);
        this.setDepth(3); // Монети поверх перешкод, але під гравцем
        
        // Значення монети
        this.value = 1;
        
        // Анімація обертання (опційно)
        this.rotationSpeed = 0.02;
    }
    
    update(delta) {
        // Легке обертання для візуального ефекту
        this.rotation += this.rotationSpeed;
    }
    
    collect() {
        // Видаляємо монету при зборі
        if (this.body) {
            this.body.destroy();
        }
        this.destroy();
    }
}

export default Coin;
