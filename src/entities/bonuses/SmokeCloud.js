// SmokeCloud - димова хмарка (бонус 4)
// вороги "втрачають лок" на 1.2 sec (рухаються до останньої відомої позиції)
import Bonus from '../Bonus.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';

class SmokeCloud extends Bonus {
    constructor(scene, x, y) {
        super(scene, x, y, 'SMOKE');
    }
    
    applyEffect(player, scene) {
        if (!player || !scene) return;
        
        const duration = 1200; // 1.2 секунди
        
        // Застосовуємо "втрату лока" до всіх ворогів
        if (scene.chasers && Array.isArray(scene.chasers)) {
            for (const chaser of scene.chasers) {
                if (chaser && chaser.active && typeof chaser.loseLock === 'function') {
                    // Зберігаємо поточну позицію гравця як "останню відому"
                    chaser.loseLock(player.x, player.y, duration);
                }
            }
        }
    }
}

export default SmokeCloud;
