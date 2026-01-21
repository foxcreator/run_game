import { GAME_CONFIG } from '../config/gameConfig.js';

/**
 * NotificationManager
 * 
 * Централізована система для відображення всіх повідомлень в грі.
 * Підтримує чергу повідомлень, пріоритети та автоматичне зникнення.
 */
export default class NotificationManager {
    constructor(scene) {
        this.scene = scene;
        this.queue = [];
        this.currentNotification = null;
        this.isShowing = false;
        
        // UI елементи
        this.container = null;
        this.background = null;
        this.text = null;
        
        this.createUI();
    }
    
    /**
     * Створює UI елементи для повідомлень
     */
    createUI() {
        const width = this.scene.cameras.main.width;
        const config = GAME_CONFIG.NOTIFICATIONS;
        
        // Контейнер для повідомлення (fixed to camera)
        this.container = this.scene.add.container(width / 2, config.Y_POSITION);
        this.container.setScrollFactor(0);
        this.container.setDepth(1000);
        this.container.setAlpha(0);
        
        // Фон повідомлення
        this.background = this.scene.add.rectangle(0, 0, 600, 80, 0x000000, 0.8);
        this.background.setStrokeStyle(3, 0xffd700);
        
        // Текст повідомлення
        this.text = this.scene.add.text(0, 0, '', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 550 }
        });
        this.text.setOrigin(0.5, 0.5);
        
        this.container.add([this.background, this.text]);
    }
    
    /**
     * Показує повідомлення
     * @param {string} message - Текст повідомлення
     * @param {number} priority - Пріоритет (1-4, де 4 - найвищий)
     * @param {number} duration - Тривалість показу (мс), якщо null - використовується з конфігу
     */
    show(message, priority = GAME_CONFIG.NOTIFICATIONS.PRIORITY.MEDIUM, duration = null) {
        // Додаємо повідомлення в чергу
        const notification = {
            message,
            priority,
            duration: duration || GAME_CONFIG.NOTIFICATIONS.DURATION,
            timestamp: Date.now()
        };
        
        this.queue.push(notification);
        
        // Сортуємо чергу за пріоритетом (вищий пріоритет - перший)
        this.queue.sort((a, b) => b.priority - a.priority);
        
        // Обмежуємо розмір черги
        if (this.queue.length > GAME_CONFIG.NOTIFICATIONS.MAX_QUEUE) {
            this.queue = this.queue.slice(0, GAME_CONFIG.NOTIFICATIONS.MAX_QUEUE);
        }
        
        // Якщо зараз нічого не показується, показуємо наступне
        if (!this.isShowing) {
            this.showNext();
        }
    }
    
    /**
     * Показує наступне повідомлення з черги
     */
    showNext() {
        if (this.queue.length === 0) {
            this.isShowing = false;
            return;
        }
        
        this.isShowing = true;
        this.currentNotification = this.queue.shift();
        
        // Оновлюємо текст
        this.text.setText(this.currentNotification.message);
        
        // Анімація появи
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: GAME_CONFIG.NOTIFICATIONS.FADE_DURATION,
            ease: 'Power2',
            onComplete: () => {
                // Таймер на приховування
                this.scene.time.delayedCall(this.currentNotification.duration, () => {
                    this.hide();
                });
            }
        });
    }
    
    /**
     * Ховає поточне повідомлення
     */
    hide() {
        if (!this.isShowing) return;
        
        // Анімація зникнення
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: GAME_CONFIG.NOTIFICATIONS.FADE_DURATION,
            ease: 'Power2',
            onComplete: () => {
                this.currentNotification = null;
                this.isShowing = false;
                
                // Показуємо наступне повідомлення
                if (this.queue.length > 0) {
                    this.scene.time.delayedCall(200, () => {
                        this.showNext();
                    });
                }
            }
        });
    }
    
    /**
     * Очищає чергу повідомлень
     */
    clearQueue() {
        this.queue = [];
    }
    
    /**
     * Негайно ховає повідомлення без анімації
     */
    forceHide() {
        this.container.setAlpha(0);
        this.isShowing = false;
        this.currentNotification = null;
    }
    
    /**
     * Оновлення позиції при зміні розміру екрана
     */
    updatePosition() {
        const width = this.scene.cameras.main.width;
        this.container.setPosition(width / 2, GAME_CONFIG.NOTIFICATIONS.Y_POSITION);
    }
    
    /**
     * Знищення менеджера
     */
    destroy() {
        if (this.container) {
            this.container.destroy();
        }
        this.queue = [];
        this.currentNotification = null;
        this.isShowing = false;
    }
}
