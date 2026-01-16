// Joke - жарт (бонус 3)
// capture -= 30, всі вороги speed *= 0.7 на 1.0 sec
import Bonus from '../Bonus.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';

class Joke extends Bonus {
    constructor(scene, x, y) {
        super(scene, x, y, 'JOKE');
    }
    
    applyEffect(player, scene) {
        if (!player || !scene) return;
        
        // Зменшуємо capture на 30
        if (scene.captureSystem) {
            scene.captureSystem.addCapture(-30);
        }
        
        // Застосовуємо дебаф до всіх ворогів
        const duration = 1000; // 1.0 секунда
        const speedMultiplier = 0.7; // 70% швидкості
        
        if (scene.chasers && Array.isArray(scene.chasers)) {
            for (const chaser of scene.chasers) {
                if (chaser && chaser.active && typeof chaser.applySpeedDebuff === 'function') {
                    chaser.applySpeedDebuff(speedMultiplier, duration);
                }
            }
        }
    }
}

export default Joke;
