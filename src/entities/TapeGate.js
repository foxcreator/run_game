import Obstacle from './Obstacle.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import spriteManager from '../utils/SpriteManager.js';
class TapeGate extends Obstacle {
    constructor(scene, x, y) {
        const spriteConfig = spriteManager.OBSTACLE_SPRITES.TAPE_GATE;
        const width = spriteConfig.width;
        const height = spriteConfig.height;
        const color = spriteConfig.type === 'color' ? spriteConfig.value : GAME_CONFIG.OBSTACLES.TAPE_GATE.COLOR;
        super(scene, x, y, width, height, color, 'TapeGate');
        this.setDisplaySize(width, height);
    }
    onPlayerCollision(player) {
        if (player && player.isSliding) {
            return;
        }
        if (player && !player.isFrozen) {
            player.body.setVelocity(0, 0);
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
                const pushDistance = 20;
                const pushX = (dx / distance) * pushDistance;
                const pushY = (dy / distance) * pushDistance;
                player.setPosition(player.x + pushX, player.y + pushY);
            }
        }
    }
}
export default TapeGate;