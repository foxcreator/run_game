// PaperStack - пачка паперів (перешкода типу 6)
import Obstacle from './Obstacle.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import Coin from './Coin.js';
import spriteManager from '../utils/SpriteManager.js';

class PaperStack extends Obstacle {
    constructor(scene, x, y) {
        const spriteConfig = spriteManager.OBSTACLE_SPRITES.PAPER_STACK;
        const width = spriteConfig.width;
        const height = spriteConfig.height;
        const color = spriteConfig.type === 'color' ? spriteConfig.value : GAME_CONFIG.OBSTACLES.PAPER_STACK.COLOR;
        
        super(scene, x, y, width, height, color, 'PaperStack');
        
        // Параметри
        this.staggerDuration = GAME_CONFIG.OBSTACLES.PAPER_STACK.STAGGER_DURATION;
        this.staggerSpeedMultiplier = GAME_CONFIG.OBSTACLES.PAPER_STACK.STAGGER_SPEED_MULTIPLIER;
        this.coinsMin = GAME_CONFIG.OBSTACLES.PAPER_STACK.COINS_MIN;
        this.coinsMax = GAME_CONFIG.OBSTACLES.PAPER_STACK.COINS_MAX;
        this.coinSpawnRadius = GAME_CONFIG.OBSTACLES.PAPER_STACK.COIN_SPAWN_RADIUS;
        this.cooldownTime = GAME_CONFIG.OBSTACLES.PAPER_STACK.COOLDOWN;
        
        // Таймер для відстеження колізій
        this.collisionCooldown = 0;
        
        // Посилання на сцену для спавну монет
        this.scene = scene;
        
        // Візуалізація
        this.setDisplaySize(width, height);
    }
    
    onPlayerCollision(player) {
        // Перевіряємо cooldown
        if (this.collisionCooldown > 0) {
            return;
        }
        
        if (player && !player.isFrozen) {
            // Застосовуємо стагер (мікро-сповільнення)
            player.applySpeedDebuff(this.staggerSpeedMultiplier, this.staggerDuration);
            
            // Спавнимо монети
            this.spawnCoins();
            
            // Встановлюємо cooldown
            this.collisionCooldown = this.cooldownTime;
        }
    }
    
    spawnCoins() {
        // Визначаємо кількість монет
        const coinCount = Phaser.Math.Between(this.coinsMin, this.coinsMax);
        
        // Спавнимо монети навколо пачки паперів
        for (let i = 0; i < coinCount; i++) {
            // Випадковий кут
            const angle = (Math.PI * 2 * i) / coinCount + Math.random() * 0.5;
            
            // Випадкова відстань від центру
            const distance = Phaser.Math.Between(this.coinSpawnRadius * 0.5, this.coinSpawnRadius);
            
            // Позиція монети
            const coinX = this.x + Math.cos(angle) * distance;
            const coinY = this.y + Math.sin(angle) * distance;
            
            // Перевіряємо чи позиція прохідна (якщо є tilemap)
            if (this.scene.tilemap) {
                if (!this.scene.tilemap.isWalkable(coinX, coinY)) {
                    // Якщо не прохідна - намагаємося знайти найближчу прохідну
                    if (this.scene.findWalkablePosition) {
                        const walkablePos = this.scene.findWalkablePosition(coinX, coinY);
                        if (walkablePos) {
                            const coin = new Coin(this.scene, walkablePos.x, walkablePos.y);
                            // Додаємо монету до масиву пікапів (якщо він існує)
                            if (!this.scene.pickups) {
                                this.scene.pickups = [];
                            }
                            this.scene.pickups.push(coin);
                        }
                    }
                    continue;
                }
            }
            
            // Створюємо монету
            const coin = new Coin(this.scene, coinX, coinY);
            
            // Додаємо монету до масиву пікапів (якщо він існує)
            if (!this.scene.pickups) {
                this.scene.pickups = [];
            }
            this.scene.pickups.push(coin);
        }
    }
    
    update(delta) {
        // Оновлюємо cooldown
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= delta;
            if (this.collisionCooldown < 0) {
                this.collisionCooldown = 0;
            }
        }
    }
}

export default PaperStack;
