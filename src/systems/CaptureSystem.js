// CaptureSystem - система захоплення (0-100)
class CaptureSystem {
    constructor(scene) {
        this.scene = scene;
        this.capture = 0; // 0-100
        this.maxCapture = 100;
        
        // Параметри зростання/спаду (згідно MVP)
        this.closeDistance = 60; // < 60px - швидке зростання
        this.veryCloseDistance = 35; // < 35px - дуже швидке зростання
        this.safeDistance = 120; // > 120px - спадає
        
        this.growthRateClose = 18; // per second
        this.growthRateVeryClose = 35; // per second
        this.decayRate = 22; // per second
    }
    
    update(delta, player, chasers = []) {
        const dt = delta / 1000; // Перетворюємо в секунди
        
        // Знаходимо мінімальну відстань до переслідувачів
        let minDistance = Infinity;
        
        if (chasers.length > 0) {
            for (const chaser of chasers) {
                if (chaser && chaser.active) {
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