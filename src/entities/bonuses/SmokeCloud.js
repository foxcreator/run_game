// SmokeCloud - димова хмарка (бонус)
// Заморожує всіх ворогів на 1.5 секунди + візуальна хмарка за гравцем
import Bonus from '../Bonus.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';

class SmokeCloud extends Bonus {
    constructor(scene, x, y) {
        super(scene, x, y, 'SMOKE');
    }
    
    applyEffect(player, scene) {
        if (!player || !scene) return;
        
        const duration = 1500; // 1.5 секунди
        
        // Заморожуємо всіх ворогів
        if (scene.chasers && Array.isArray(scene.chasers)) {
            for (const chaser of scene.chasers) {
                if (chaser && chaser.active && typeof chaser.setFrozen === 'function') {
                    chaser.setFrozen(duration);
                }
            }
        }
        
        // Створюємо візуальну хмарку за гравцем
        this.createSmokeEffect(player, scene, duration);
    }
    
    createSmokeEffect(player, scene, duration) {
        // Створюємо напівпрозорий круг за гравцем
        const smokeCloud = scene.add.circle(player.x, player.y, 30, 0x808080, 0.5);
        smokeCloud.setDepth(player.depth - 1); // За гравцем
        
        // Анімація розширення хмарки
        scene.tweens.add({
            targets: smokeCloud,
            radius: 60, // Розширюється
            alpha: 0, // Зникає
            duration: duration,
            ease: 'Power2',
            onComplete: () => {
                smokeCloud.destroy(); // Видаляємо після анімації
            }
        });
        
        // Хмарка слідує за гравцем
        const updateInterval = scene.time.addEvent({
            delay: 50, // Оновлення кожні 50мс
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
