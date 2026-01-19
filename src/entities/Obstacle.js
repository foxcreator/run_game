import { GAME_CONFIG } from '../config/gameConfig.js';
class Obstacle extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y, width, height, color, type) {
        super(scene, x, y, width, height, color, 1.0);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.type = type;
        this.body.setImmovable(true);
        this.setOrigin(0.5);
        this.setDepth(0);
        this.active = true;
    }
    onPlayerCollision(player) {
    }
    update(delta) {
    }
    destroy() {
        if (this.body) {
            this.body.destroy();
        }
        super.destroy();
    }
}
export default Obstacle;