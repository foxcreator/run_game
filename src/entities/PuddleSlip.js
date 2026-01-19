import Obstacle from './Obstacle.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import spriteManager from '../utils/SpriteManager.js';
class PuddleSlip extends Obstacle {
    constructor(scene, x, y, sizeInTiles = 1) {
        const tileSize = 32;
        const width = sizeInTiles * tileSize;
        const height = sizeInTiles * tileSize;
        const spriteConfig = spriteManager.OBSTACLE_SPRITES.PUDDLE_SLIP;
        const color = spriteConfig.type === 'color' ? spriteConfig.value : GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.COLOR;
        super(scene, x, y, width, height, color, 'PuddleSlip');
        this.sizeInTiles = sizeInTiles;
        const textureKey = 'lake';
        this.visualSprite = null;
        if (scene.textures.exists(textureKey)) {
            this.visualSprite = scene.add.image(x, y, textureKey);
            this.visualSprite.setOrigin(0.5);
            this.visualSprite.setDepth(this.depth);
            this.visualSprite.setDisplaySize(width, height);
            this.visualSprite.setScrollFactor(this.scrollFactorX, this.scrollFactorY);
            this.setVisible(false);
            this.setAlpha(0);
        } else {
            this.visualSprite = null;
        }
        this.debuffDuration = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.DEBUFF_DURATION;
        this.controlMultiplier = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.CONTROL_MULTIPLIER;
        this.collisionCooldown = 0;
        this.cooldownTime = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.COOLDOWN;
    }
    onPlayerCollision(player) {
        if (this.collisionCooldown > 0) {
            return;
        }
        if (player && !player.isFrozen) {
            player.applyControlDebuff(this.controlMultiplier, this.debuffDuration);
            this.collisionCooldown = this.cooldownTime;
        }
    }
    update(delta) {
        if (this.visualSprite && this.visualSprite.active) {
            this.visualSprite.x = this.x;
            this.visualSprite.y = this.y;
            this.visualSprite.setDepth(this.depth);
            this.visualSprite.setVisible(true);
            this.visualSprite.setAlpha(1);
        }
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= delta;
            if (this.collisionCooldown < 0) {
                this.collisionCooldown = 0;
            }
        }
    }
    destroy() {
        if (this.visualSprite) {
            this.visualSprite.destroy();
            this.visualSprite = null;
        }
        super.destroy();
    }
}
export default PuddleSlip;