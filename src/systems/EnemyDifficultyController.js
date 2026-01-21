import { GAME_CONFIG } from '../config/gameConfig.js';

/**
 * EnemyDifficultyController
 * 
 * Контролює зростання складності гри через періодичне додавання нових ворогів.
 * Кожні 2-3 хвилини спавниться +2 нових ворога з повідомленням гравцю.
 */
export default class EnemyDifficultyController {
    constructor(scene, notificationManager) {
        this.scene = scene;
        this.notificationManager = notificationManager;
        
        // Конфіг
        this.config = GAME_CONFIG.DIFFICULTY;
        
        // Стан
        this.enemyCount = 0;
        this.waveNumber = 0;
        this.lastReinforcementTime = 0;
        this.isActive = true;
        
        // Таймер
        this.reinforcementTimer = null;
        
        this.init();
    }
    
    /**
     * Ініціалізація контролера
     */
    init() {
        // Встановлюємо початкову кількість ворогів
        this.enemyCount = GAME_CONFIG.CHASERS.SPAWN.INITIAL_COUNT;
        this.lastReinforcementTime = this.scene.time.now;
        
        // Запускаємо таймер підкріплень
        this.scheduleNextReinforcement();
    }
    
    /**
     * Планує наступне підкріплення
     */
    scheduleNextReinforcement() {
        if (!this.isActive) {
            return;
        }
        
        // Очищаємо попередній таймер
        if (this.reinforcementTimer) {
            this.reinforcementTimer.remove();
        }
        
        // Створюємо новий таймер
        this.reinforcementTimer = this.scene.time.delayedCall(
            this.config.REINFORCEMENT_INTERVAL,
            () => {
                this.spawnReinforcement();
            }
        );
        
        const nextTime = (this.config.REINFORCEMENT_INTERVAL / 1000).toFixed(1);
    }
    
    /**
     * Спавнить підкріплення ворогів
     */
    spawnReinforcement() {
        // Перевіряємо чи не досягли ми максимуму
        if (this.enemyCount >= this.config.MAX_ENEMIES) {
            this.scheduleNextReinforcement();
            return;
        }
        
        this.waveNumber++;
        
        // Кількість ворогів для спавну (обмежена максимумом)
        const enemiesToSpawn = Math.min(
            this.config.ENEMIES_PER_WAVE,
            this.config.MAX_ENEMIES - this.enemyCount
        );
        
        // Викликаємо подію для GameScene
        this.scene.events.emit('spawn-reinforcement', {
            count: enemiesToSpawn,
            wave: this.waveNumber
        });
        
        // Оновлюємо лічильник
        this.enemyCount += enemiesToSpawn;
        this.lastReinforcementTime = this.scene.time.now;
        
        // Показуємо повідомлення
        const message = this.getRandomMessage();
        this.notificationManager.show(
            message,
            GAME_CONFIG.NOTIFICATIONS.PRIORITY.HIGH
        );
        
        
        // Плануємо наступне підкріплення
        this.scheduleNextReinforcement();
    }
    
    /**
     * Отримує випадкове повідомлення про підкріплення
     */
    getRandomMessage() {
        const messages = this.config.MESSAGES;
        const index = Math.floor(Math.random() * messages.length);
        return messages[index];
    }
    
    /**
     * Зменшує лічильник ворогів (коли ворог знищений)
     */
    decrementEnemyCount() {
        if (this.enemyCount > 0) {
            this.enemyCount--;
        }
    }
    
    /**
     * Збільшує лічильник ворогів (коли ворог спавниться вручну)
     */
    incrementEnemyCount() {
        this.enemyCount++;
    }
    
    /**
     * Встановлює початкову кількість ворогів
     */
    setInitialEnemyCount(count) {
        this.enemyCount = count;
    }
    
    /**
     * Отримує поточну кількість ворогів
     */
    getEnemyCount() {
        return this.enemyCount;
    }
    
    /**
     * Отримує номер поточної хвилі
     */
    getWaveNumber() {
        return this.waveNumber;
    }
    
    /**
     * Отримує час до наступного підкріплення (мс)
     */
    getTimeUntilNextReinforcement() {
        if (!this.reinforcementTimer) return 0;
        
        const elapsed = this.scene.time.now - this.lastReinforcementTime;
        const remaining = this.config.REINFORCEMENT_INTERVAL - elapsed;
        return Math.max(0, remaining);
    }
    
    /**
     * Зупиняє контролер
     */
    pause() {
        this.isActive = false;
        if (this.reinforcementTimer) {
            this.reinforcementTimer.paused = true;
        }
    }
    
    /**
     * Відновлює контролер
     */
    resume() {
        this.isActive = true;
        if (this.reinforcementTimer) {
            this.reinforcementTimer.paused = false;
        }
    }
    
    /**
     * Скидає контролер
     */
    reset() {
        if (this.reinforcementTimer) {
            this.reinforcementTimer.remove();
            this.reinforcementTimer = null;
        }
        
        this.enemyCount = 0;
        this.waveNumber = 0;
        this.lastReinforcementTime = 0;
        this.isActive = true;
    }
    
    /**
     * Знищує контролер
     */
    destroy() {
        if (this.reinforcementTimer) {
            this.reinforcementTimer.remove();
            this.reinforcementTimer = null;
        }
        
        this.isActive = false;
    }
}
