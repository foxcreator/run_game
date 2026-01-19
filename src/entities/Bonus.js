import spriteManager from '../utils/SpriteManager.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
class Bonus extends Phaser.GameObjects.Container {
    constructor(scene, x, y, bonusType) {
        super(scene, x, y);
        const config = spriteManager.PICKUP_SPRITES[bonusType] || {
            type: 'color',
            value: 0x00ff00,
            width: 20,
            height: 20
        };
        this.bonusType = bonusType;
        scene.add.existing(this);
        this.setDepth(3);
        let visual;
        if (bonusType === 'SCOOTER' && scene.textures.exists('scooter')) {
            const width = GAME_CONFIG.PICKUPS.SCOOTER.WIDTH;
            const height = GAME_CONFIG.PICKUPS.SCOOTER.HEIGHT;
            visual = scene.add.image(0, 0, 'scooter');
            visual.setDisplaySize(width, height);
            visual.setOrigin(0.5);
        }
        else if (bonusType === 'SMOKE_CLOUD' && scene.textures.exists('cloud')) {
            const width = GAME_CONFIG.PICKUPS.SMOKE_CLOUD.WIDTH;
            const height = GAME_CONFIG.PICKUPS.SMOKE_CLOUD.HEIGHT;
            visual = scene.add.image(0, 0, 'cloud');
            visual.setDisplaySize(width, height);
            visual.setOrigin(0.5);
        }
        else {
            const size = config.width || 20;
            const color = config.type === 'color' ? config.value : 0x00ff00;
            visual = scene.add.rectangle(0, 0, size, size, color);
            visual.setOrigin(0.5);
        }
        this.add(visual);
        this.visual = visual;
        this.rotationSpeed = 0.03;
        this.magnetRadius = 60;
        this.magnetSpeed = 300;
        this.collected = false;
    }
    update(delta, player) {
        if (!this.active || this.collected) return;
        if (this.visual) {
            this.visual.rotation += this.rotationSpeed;
        }
        if (player && player.active) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < this.magnetRadius && distance > 0) {
                const speed = this.magnetSpeed * (delta / 1000);
                const moveX = (dx / distance) * speed;
                const moveY = (dy / distance) * speed;
                this.x += moveX;
                this.y += moveY;
            }
        }
    }
    collect() {
        this.destroy();
    }
    applyEffect(player, scene) {
    }
}
export default Bonus;