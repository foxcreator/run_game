import { GAME_CONFIG } from '../config/gameConfig.js';
class CaptureSystem {
    constructor(scene) {
        this.scene = scene;
        this.capture = 0;
        this.maxCapture = GAME_CONFIG.CAPTURE.MAX;
        this.closeDistance = GAME_CONFIG.CAPTURE.CLOSE_DISTANCE;
        this.veryCloseDistance = GAME_CONFIG.CAPTURE.VERY_CLOSE_DISTANCE;
        this.safeDistance = GAME_CONFIG.CAPTURE.SAFE_DISTANCE;
        this.growthRateClose = GAME_CONFIG.CAPTURE.GROWTH_RATE_CLOSE;
        this.growthRateVeryClose = GAME_CONFIG.CAPTURE.GROWTH_RATE_VERY_CLOSE;
        this.decayRate = GAME_CONFIG.CAPTURE.DECAY_RATE;
    }
    update(delta, player, chasers = []) {
        const dt = delta / 1000;
        let minDistance = Infinity;
        if (chasers.length > 0) {
            for (const chaser of chasers) {
                if (chaser && chaser.active && chaser.type === 'Blocker') {
                    const distance = Phaser.Math.Distance.Between(
                        player.x, player.y,
                        chaser.x, chaser.y
                    );
                    minDistance = Math.min(minDistance, distance);
                }
            }
        }
        if (chasers.length === 0 || minDistance === Infinity) {
            this.capture -= this.decayRate * dt;
        } else {
            if (minDistance < this.veryCloseDistance) {
                this.capture += this.growthRateVeryClose * dt;
            } else if (minDistance < this.closeDistance) {
                this.capture += this.growthRateClose * dt;
            } else if (minDistance > this.safeDistance) {
                this.capture -= this.decayRate * dt;
            }
        }
        this.capture = Phaser.Math.Clamp(this.capture, 0, this.maxCapture);
        return this.capture;
    }
    addCapture(value) {
        this.capture += value;
        this.capture = Phaser.Math.Clamp(this.capture, 0, this.maxCapture);
    }
    subtractCapture(value) {
        this.capture -= value;
        this.capture = Phaser.Math.Clamp(this.capture, 0, this.maxCapture);
    }
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