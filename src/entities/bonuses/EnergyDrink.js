// EnergyDrink - енергетик (бонус 1)
// stamina += 35 (clamp до max)
import Bonus from '../Bonus.js';

class EnergyDrink extends Bonus {
    constructor(scene, x, y) {
        super(scene, x, y, 'ENERGY');
    }
    
    applyEffect(player, scene) {
        if (!player) return;
        
        // Додаємо стаміну
        const staminaGain = 35;
        player.stamina = Math.min(player.stamina + staminaGain, player.staminaMax);
        
        // Якщо був exhausted - скидаємо
        if (player.exhausted) {
            player.exhausted = false;
            player.exhaustedTimer = 0;
            player.speedMultiplier = 1.0;
        }
    }
}

export default EnergyDrink;
