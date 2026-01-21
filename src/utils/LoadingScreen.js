import { GAME_CONFIG } from '../config/gameConfig.js';

/**
 * LoadingScreen - Універсальний екран завантаження з порадами
 * Використовується в BootScene та GameScene
 */
class LoadingScreen {
    constructor(scene) {
        this.scene = scene;
        this.elements = [];
        this.currentTip = null;
        this.tipTimer = null;
        this.minLoadingTime = 3000; // Мінімум 3 секунди
        this.startTime = Date.now();
        this.isComplete = false;
    }
    
    /**
     * Створює екран завантаження
     */
    create() {
        console.log('[LoadingScreen] Створення екрану завантаження');
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        console.log(`[LoadingScreen] Розміри: ${width}x${height}`);
        
        // Фон
        const bg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        bg.setDepth(10000);
        this.elements.push(bg);
        
        // Заголовок
        const titleText = this.scene.add.text(width / 2, height / 2 - 150, 'BUSIFICATION', {
            fontSize: '64px',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            fill: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6
        });
        titleText.setOrigin(0.5, 0.5);
        titleText.setDepth(10001);
        this.elements.push(titleText);
        
        // Підзаголовок
        const subtitleText = this.scene.add.text(width / 2, height / 2 - 100, 'Завантаження...', {
            fontSize: '24px',
            fontFamily: 'Arial, sans-serif',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3
        });
        subtitleText.setOrigin(0.5, 0.5);
        subtitleText.setDepth(10001);
        this.elements.push(subtitleText);
        
        // Прогрес бар - фон
        const barWidth = 600;
        const barHeight = 40;
        const barX = width / 2;
        const barY = height / 2;
        
        const progressBg = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x000000, 0.8);
        progressBg.setStrokeStyle(4, 0xFFD700);
        progressBg.setDepth(10001);
        this.elements.push(progressBg);
        
        // Прогрес бар - заповнення
        this.progressBar = this.scene.add.graphics();
        this.progressBar.setDepth(10002);
        this.progressBarConfig = {
            x: barX - barWidth / 2,
            y: barY - barHeight / 2,
            width: barWidth,
            height: barHeight
        };
        this.elements.push(this.progressBar);
        
        // Текст прогресу
        this.progressText = this.scene.add.text(barX, barY, '0%', {
            fontSize: '28px',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        });
        this.progressText.setOrigin(0.5, 0.5);
        this.progressText.setDepth(10003);
        this.elements.push(this.progressText);
        
        // Поради - фон
        const tipBg = this.scene.add.rectangle(width / 2, height / 2 + 120, barWidth + 40, 100, 0x000000, 0.7);
        tipBg.setStrokeStyle(3, 0x4A90E2);
        tipBg.setDepth(10001);
        this.elements.push(tipBg);
        
        // Поради - текст
        this.tipText = this.scene.add.text(width / 2, height / 2 + 120, '', {
            fontSize: '20px',
            fontFamily: 'Arial, sans-serif',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center',
            wordWrap: { width: barWidth - 40 }
        });
        this.tipText.setOrigin(0.5, 0.5);
        this.tipText.setDepth(10002);
        this.elements.push(this.tipText);
        
        // Показуємо першу пораду
        this.showRandomTip();
        console.log('[LoadingScreen] Перша порада показана');
        
        // Таймер для зміни порад кожні 5 секунд
        this.tipTimer = this.scene.time.addEvent({
            delay: 5000,
            callback: () => this.showRandomTip(),
            loop: true
        });
        
        console.log('[LoadingScreen] Екран завантаження створено, елементів:', this.elements.length);
    }
    
    /**
     * Показує випадкову пораду
     */
    showRandomTip() {
        const tips = GAME_CONFIG.LOADING_TIPS;
        
        if (!tips || tips.length === 0) {
            console.error('[LoadingScreen] LOADING_TIPS порожній або відсутній!');
            return;
        }
        
        let newTip = tips[Math.floor(Math.random() * tips.length)];
        
        // Переконуємося що нова порада відрізняється від попередньої
        if (tips.length > 1) {
            while (newTip === this.currentTip) {
                newTip = tips[Math.floor(Math.random() * tips.length)];
            }
        }
        
        this.currentTip = newTip;
        
        if (this.tipText) {
            this.tipText.setText(newTip);
            console.log('[LoadingScreen] Порада встановлена:', newTip.substring(0, 50) + '...');
        } else {
            console.error('[LoadingScreen] tipText не існує!');
        }
    }
    
    /**
     * Оновлює прогрес завантаження
     * @param {number} value - Значення від 0 до 1
     */
    updateProgress(value) {
        if (!this.progressBar || !this.progressText) return;
        
        // Малюємо прогрес бар
        this.progressBar.clear();
        this.progressBar.fillStyle(0xFFD700, 1);
        this.progressBar.fillRect(
            this.progressBarConfig.x,
            this.progressBarConfig.y,
            this.progressBarConfig.width * value,
            this.progressBarConfig.height
        );
        
        // Оновлюємо текст
        this.progressText.setText(`${Math.floor(value * 100)}%`);
    }
    
    /**
     * Перевіряє чи можна завершити завантаження
     * @param {number} actualProgress - Реальний прогрес (0-1)
     * @returns {boolean} - true якщо можна завершити
     */
    canComplete(actualProgress) {
        const elapsed = Date.now() - this.startTime;
        
        // Якщо пройшло менше мінімального часу - показуємо штучний прогрес
        if (elapsed < this.minLoadingTime) {
            const artificialProgress = elapsed / this.minLoadingTime;
            const displayProgress = Math.min(actualProgress, artificialProgress);
            this.updateProgress(displayProgress);
            console.log(`[LoadingScreen] Чекаємо... Час: ${elapsed}ms / ${this.minLoadingTime}ms, Прогрес: ${Math.round(displayProgress * 100)}%`);
            return false;
        }
        
        // Якщо пройшов мінімальний час і все завантажено
        if (actualProgress >= 1) {
            this.updateProgress(1);
            console.log('[LoadingScreen] Завантаження завершено!');
            return true;
        }
        
        // Інакше показуємо реальний прогрес
        this.updateProgress(actualProgress);
        console.log(`[LoadingScreen] Завантаження... Прогрес: ${Math.round(actualProgress * 100)}%`);
        return false;
    }
    
    /**
     * Оновлення екрану завантаження (викликається кожен кадр)
     * Phaser автоматично керує таймером для порад, тому тут нічого не робимо
     */
    update() {
        // Таймер для порад працює автоматично через this.scene.time.addEvent
        // Тому тут нічого не потрібно робити
    }
    
    /**
     * Знищує екран завантаження
     */
    destroy() {
        // Зупиняємо таймер
        if (this.tipTimer) {
            this.tipTimer.remove();
            this.tipTimer = null;
        }
        
        // Знищуємо всі елементи
        this.elements.forEach(element => {
            if (element && element.destroy) {
                element.destroy();
            }
        });
        
        this.elements = [];
        this.progressBar = null;
        this.progressText = null;
        this.tipText = null;
    }
}

export default LoadingScreen;
