// CaptureSystem - система захоплення (0-100)
import { GAME_CONFIG } from '../config/gameConfig.js';

class CaptureSystem {
    constructor(scene) {
        this.scene = scene;
        this.capture = 0; // 0-100
        this.maxCapture = GAME_CONFIG.CAPTURE.MAX;
        
        // Параметри зростання/спаду (з конфігу)
        this.closeDistance = GAME_CONFIG.CAPTURE.CLOSE_DISTANCE;
        this.veryCloseDistance = GAME_CONFIG.CAPTURE.VERY_CLOSE_DISTANCE;
        this.safeDistance = GAME_CONFIG.CAPTURE.SAFE_DISTANCE;
        
        this.growthRateClose = GAME_CONFIG.CAPTURE.GROWTH_RATE_CLOSE;
        this.growthRateVeryClose = GAME_CONFIG.CAPTURE.GROWTH_RATE_VERY_CLOSE;
        this.decayRate = GAME_CONFIG.CAPTURE.DECAY_RATE;
    }
    
    update(delta, player, chasers = []) {
        const dt = delta / 1000; // Перетворюємо в секунди
        
        // Знаходимо мінімальну відстань до переслідувачів
        // ВАЖЛИВО: Sticker не заповнює capture поступово, тільки Blocker!
        let minDistance = Infinity;
        
        if (chasers.length > 0) {
            for (const chaser of chasers) {
                // Фільтруємо тільки Blocker для поступового заповнення
                if (chaser && chaser.active && chaser.type === 'Blocker') {
                    const distance = Phaser.Math.Distance.Between(
                        player.x, player.y,
                        chaser.x, chaser.y
                    );
                    minDistance = Math.min(minDistance, distance);
                }
            }
        }
        
        // Якщо немає переслідувачів, capture спадає
        if (chasers.length === 0 || minDistance === Infinity) {
            this.capture -= this.decayRate * dt;
        } else {
            // Формула зростання/спаду (згідно MVP)
            if (minDistance < this.veryCloseDistance) {
                // Дуже близько - швидке зростання
                this.capture += this.growthRateVeryClose * dt;
            } else if (minDistance < this.closeDistance) {
                // Близько - зростання
                this.capture += this.growthRateClose * dt;
            } else if (minDistance > this.safeDistance) {
                // Далеко - спадає
                this.capture -= this.decayRate * dt;
            }
            // Якщо між closeDistance і safeDistance - не змінюється
        }
        
        // Clamp 0..100
        this.capture = Phaser.Math.Clamp(this.capture, 0, this.maxCapture);
        
        return this.capture;
    }
    
    // Миттєві зміни (для бонусів/ударів)
    addCapture(value) {
        this.capture += value;
        this.capture = Phaser.Math.Clamp(this.capture, 0, this.maxCapture);
    }
    
    subtractCapture(value) {
        this.capture -= value;
        this.capture = Phaser.Math.Clamp(this.capture, 0, this.maxCapture);
    }
    
    // Геттери
    getCapture() {
        return this.capture;
    }
    
    getMaxCapture() {
        return this.maxCapture;
    }
    
    getCapturePercent() {
        return this.capture / this.maxCapture;
    }
    
    isMaxed() {
        return this.capture >= this.maxCapture;
    }
    
    reset() {
        this.capture = 0;
    }
}

export default CaptureSystem;