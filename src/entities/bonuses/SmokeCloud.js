import Bonus from '../Bonus.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';
class SmokeCloud extends Bonus {
    constructor(scene, x, y) {
        super(scene, x, y, 'SMOKE_CLOUD');
    }
    applyEffect(player, scene) {
        if (!player || !scene) return;
        const duration = 1500;
        if (scene.chasers && Array.isArray(scene.chasers)) {
            for (const chaser of scene.chasers) {
                if (chaser && chaser.active && typeof chaser.setFrozen === 'function') {
                    chaser.setFrozen(duration);
                }
            }
        }
        this.createSmokeEffect(player, scene, duration);
    }
    createSmokeEffect(player, scene, duration) {
        const smokeCloud = scene.add.circle(player.x, player.y, 30, 0x808080, 0.5);
        smokeCloud.setDepth(player.depth - 1);
        scene.tweens.add({
            targets: smokeCloud,
            radius: 60,
            alpha: 0,
            duration: duration,
            ease: 'Power2',
            onComplete: () => {
                smokeCloud.destroy();
            }
        });
        const updateInterval = scene.time.addEvent({
            delay: 50,
            callback: () => {
                if (smokeCloud && smokeCloud.active && player && player.active) {
                    smokeCloud.setPosition(player.x, player.y);
                }
            },
            repeat: Math.floor(duration / 50)
        });
    }
}
export default SmokeCloud;