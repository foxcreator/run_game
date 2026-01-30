import spriteManager from '../utils/SpriteManager.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
class Coin extends Phaser.GameObjects.Image {
    constructor(scene, x, y, denomination = null) {
        if (!denomination) {
            const denominations = GAME_CONFIG.PICKUPS.COINS.DENOMINATIONS;
            denomination = denominations.find(d => d.value === 10) || denominations[0];
        }
        const textureKey = denomination.texture || 'coin_10';
        const finalTextureKey = scene.textures.exists(textureKey) ? textureKey : 'coin_10';
        super(scene, x, y, finalTextureKey);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setOrigin(0.5);
        this.setDepth(3);
        const baseSize = 32;
        const sizeMultiplier = Math.sqrt(denomination.value / 10);
        const displaySize = Math.max(baseSize, Math.min(baseSize * sizeMultiplier, 64));
        this.setDisplaySize(displaySize, displaySize);
        if (this.body) {
            this.body.setSize(displaySize * 1.5, displaySize * 1.5);
        }
        this.value = denomination.value;
        this.denomination = denomination;
        this.rotationSpeed = 0.02 + Math.min(this.value / 1000, 0.03); // Cap at 0.05
        this.magnetRadius = 60;
        this.magnetSpeed = 300;
        this.collected = false;
        this.floatAmplitude = 3 + Math.min(this.value / 100, 5); // Cap at 8
        this.floatSpeed = 2 + Math.min(this.value / 200, 3); // Cap at 5
        this.floatTime = Math.random() * Math.PI * 2;
        this.startY = y;
    }
    update(delta, player) {
        if (!this.active || this.collected) return;
        this.rotation += this.rotationSpeed;
        this.floatTime += (this.floatSpeed * delta) / 1000;
        const floatOffset = Math.sin(this.floatTime) * this.floatAmplitude;
        this.y = this.startY + floatOffset;
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
                this.startY = this.y;
                if (this.body) {
                    this.body.x = this.x;
                    this.body.y = this.y;
                }
            }
        } else {
            if (this.body) {
                this.body.x = this.x;
                this.body.y = this.y;
            }
        }
    }
    collect() {
        if (this.body) {
            this.body.destroy();
        }
        this.destroy();
    }
}
export default Coin;