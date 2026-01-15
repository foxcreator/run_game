// TapeGate - стрічка/шлагбаум (перешкода типу 4)
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
        
        // Візуалізація - робимо прямокутник для стрічки
        this.setDisplaySize(width, height);
    }
    
    onPlayerCollision(player) {
        // Якщо гравець в slide - пропускаємо (не блокуємо)
        if (player && player.isSliding) {
            return; // Не блокуємо, гравець проходить
        }
        
        // Якщо гравець не в slide - блокуємо рух
        if (player && !player.isFrozen) {
            // Блокуємо рух гравця
            player.body.setVelocity(0, 0);
            
            // Відштовхуємо гравця від стрічки
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const pushDistance = 20; // Відстань відштовхування
                const pushX = (dx / distance) * pushDistance;
                const pushY = (dy / distance) * pushDistance;
                
                // Переміщуємо гравця
                player.setPosition(player.x + pushX, player.y + pushY);
            }
        }
    }
}

export default TapeGate;
