import { GAME_CONFIG } from '../config/gameConfig.js';

/**
 * MoneyDropController
 * 
 * Контролює прогресію економіки через зміну шансів випадіння купюр.
 * Кожні 2-3 хвилини збільшує шанси великих купюр, додає нові номінали.
 */
export default class MoneyDropController {
    constructor(scene, notificationManager) {
        this.scene = scene;
        this.notificationManager = notificationManager;
        
        // Конфіг
        this.config = GAME_CONFIG.MONEY_PROGRESSION;
        
        // Вагова таблиця для номіналів
        this.weights = { ...this.config.INITIAL_WEIGHTS };
        
        // Доступні номінали (спочатку тільки базові)
        this.availableDenominations = [10, 20, 50, 100];
        
        // Чи розблоковано нові номінали
        this.newDenominationsUnlocked = false;
        
        // Таймер
        this.scalingTimer = null;
        this.lastScalingTime = 0;
        
        this.init();
    }
    
    /**
     * Ініціалізація контролера
     */
    init() {
        this.lastScalingTime = this.scene.time.now;
        this.scheduleNextScaling();
        
    }
    
    /**
     * Планує наступне масштабування
     */
    scheduleNextScaling() {
        if (this.scalingTimer) {
            this.scalingTimer.remove();
        }
        
        this.scalingTimer = this.scene.time.delayedCall(
            this.config.SCALING_INTERVAL,
            () => {
                this.scaleWeights();
            }
        );
    }
    
    /**
     * Збільшує ваги для великих купюр
     */
    scaleWeights() {
        let hasChanged = false;
        let allMaxed = true;
        
        // Збільшуємо ваги для всіх номіналів крім 10 грн
        for (const denomination of this.availableDenominations) {
            if (denomination === 10) continue; // 10 грн - базовий, не змінюється
            
            if (this.weights[denomination] < this.config.MAX_WEIGHT) {
                this.weights[denomination] += this.config.WEIGHT_INCREMENT;
                hasChanged = true;
                allMaxed = false;
                
            }
        }
        
        if (hasChanged) {
            // Показуємо повідомлення
            const message = this.getRandomMessage(this.config.MESSAGES.WEIGHT_INCREASE);
            this.notificationManager.show(
                message,
                GAME_CONFIG.NOTIFICATIONS.PRIORITY.MEDIUM
            );
        }
        
        // Якщо всі номінали досягли максимуму - розблоковуємо нові
        if (allMaxed && !this.newDenominationsUnlocked) {
            this.unlockNewDenominations();
        }
        
        this.lastScalingTime = this.scene.time.now;
        this.scheduleNextScaling();
    }
    
    /**
     * Розблоковує нові номінали (200, 500 грн)
     */
    unlockNewDenominations() {
        if (this.newDenominationsUnlocked) return;
        
        this.newDenominationsUnlocked = true;
        
        // Додаємо нові номінали
        for (const denom of this.config.NEW_DENOMINATIONS) {
            this.availableDenominations.push(denom.value);
            this.weights[denom.value] = denom.initialWeight;
        }
        
        
        // Показуємо повідомлення
        const messages = this.config.MESSAGES.NEW_DENOMINATION;
        const message = this.getRandomMessage(messages).replace('{value}', '200 та 500');
        
        this.notificationManager.show(
            message,
            GAME_CONFIG.NOTIFICATIONS.PRIORITY.HIGH
        );
    }
    
    /**
     * Генерує випадковий номінал на основі вагової таблиці
     */
    generateCoinValue() {
        // Обчислюємо загальну вагу
        let totalWeight = 0;
        for (const denomination of this.availableDenominations) {
            totalWeight += this.weights[denomination];
        }
        
        // Випадкове число в діапазоні [0, totalWeight)
        let random = Math.random() * totalWeight;
        
        // Вибираємо номінал на основі ваги
        for (const denomination of this.availableDenominations) {
            random -= this.weights[denomination];
            if (random <= 0) {
                return denomination;
            }
        }
        
        // Fallback (не повинно статися)
        return 10;
    }
    
    /**
     * Отримує конфігурацію монети за номіналом
     */
    getCoinConfig(value) {
        // Шукаємо в базових номіналах
        const baseDenom = GAME_CONFIG.PICKUPS.COINS.DENOMINATIONS.find(d => d.value === value);
        if (baseDenom) {
            return baseDenom;
        }
        
        // Шукаємо в нових номіналах
        const newDenom = this.config.NEW_DENOMINATIONS.find(d => d.value === value);
        if (newDenom) {
            return newDenom;
        }
        
        // Fallback
        return GAME_CONFIG.PICKUPS.COINS.DENOMINATIONS[0];
    }
    
    /**
     * Отримує поточні ваги
     */
    getWeights() {
        return { ...this.weights };
    }
    
    /**
     * Отримує доступні номінали
     */
    getAvailableDenominations() {
        return [...this.availableDenominations];
    }
    
    /**
     * Чи розблоковано нові номінали
     */
    areNewDenominationsUnlocked() {
        return this.newDenominationsUnlocked;
    }
    
    /**
     * Отримує випадкове повідомлення зі списку
     */
    getRandomMessage(messages) {
        const index = Math.floor(Math.random() * messages.length);
        return messages[index];
    }
    
    /**
     * Зупиняє контролер
     */
    pause() {
        if (this.scalingTimer) {
            this.scalingTimer.paused = true;
        }
    }
    
    /**
     * Відновлює контролер
     */
    resume() {
        if (this.scalingTimer) {
            this.scalingTimer.paused = false;
        }
    }
    
    /**
     * Скидає контролер
     */
    reset() {
        if (this.scalingTimer) {
            this.scalingTimer.remove();
            this.scalingTimer = null;
        }
        
        this.weights = { ...this.config.INITIAL_WEIGHTS };
        this.availableDenominations = [10, 20, 50, 100];
        this.newDenominationsUnlocked = false;
        this.lastScalingTime = 0;
    }
    
    /**
     * Знищує контролер
     */
    destroy() {
        if (this.scalingTimer) {
            this.scalingTimer.remove();
            this.scalingTimer = null;
        }
    }
}
