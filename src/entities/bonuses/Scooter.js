// Scooter - скутер (бонус)
// speedMultiplier += 0.5 на 2.0 sec
import Bonus from '../Bonus.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';

class Scooter extends Bonus {
    constructor(scene, x, y) {
        super(scene, x, y, 'SCOOTER');
    }
    
    applyEffect(player, scene) {
        if (!player) return;
        
        const duration = 2000; // 2.0 секунди
        
        // Додаємо баф швидкості
        player.addSpeedBuff(0.5, duration);
    }
}

export default Scooter;
