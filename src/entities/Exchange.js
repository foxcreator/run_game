import { GAME_CONFIG } from '../config/gameConfig.js';
class Exchange extends Phaser.GameObjects.Image {
    constructor(scene, x, y) {
        const textureKey = 'exchange';
        super(scene, x, y, textureKey);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setOrigin(0.5);
        this.setDepth(2);
        const displayWidth = 80;
        const displayHeight = 80;
        this.setDisplaySize(displayWidth, displayHeight);
        if (this.body) {
            this.body.setImmovable(true);
            const collisionSize = Math.max(displayWidth, displayHeight) * 1.2;
            this.body.setSize(collisionSize, collisionSize);
            this.body.setOffset(-(collisionSize - displayWidth) / 2, -(collisionSize - displayHeight) / 2);
        }
        this.exchangeRate = GAME_CONFIG.EXCHANGES.EXCHANGE_RATE;
        this.freezeDuration = GAME_CONFIG.EXCHANGES.FREEZE_DURATION;
        this.cooldown = GAME_CONFIG.EXCHANGES.COOLDOWN;
        this.lastExchangeTime = 0;
        this.isExchanging = false;
        this.active = true;
    }
    exchange(player, scene) {
        if (!player || !scene) return false;
        const currentTime = scene.time.now;
        if (currentTime - this.lastExchangeTime < this.cooldown) {
            return false;
        }
        if (!scene.runMoney || scene.runMoney <= 0) {
            return false;
        }
        if (this.isExchanging || player.isFrozen) {
            return false;
        }
        const uahAmount = scene.runMoney;
        const usdAmountFloat = uahAmount / this.exchangeRate;
        const usdAmount = Math.floor(usdAmountFloat);
        if (usdAmount <= 0) {
            return false;
        }
        const uahToExchange = usdAmount * this.exchangeRate;
        const remainder = uahAmount - uahToExchange;
        this.isExchanging = true;
        this.lastExchangeTime = currentTime;
        player.freeze(this.freezeDuration, 'exchange_sound');
        if (scene.saveSystem) {
            scene.saveSystem.addBankedMoney(usdAmount);
            scene.bankedMoney = scene.saveSystem.getBankedMoney();
        }
        scene.runMoney = remainder;
        this.showExchangeMessage(scene, uahToExchange, usdAmount, remainder);
        scene.time.delayedCall(this.freezeDuration, () => {
            this.isExchanging = false;
        });
        return true;
    }
    showExchangeMessage(scene, uahExchanged, usdReceived, remainder) {
        const { width, height } = scene.cameras.main;
        const messageText = `Ви поміняли ${uahExchanged.toLocaleString()} грн\nНа ваш криптогаманець зараховано $${usdReceived.toLocaleString()}`;
        const fullMessage = remainder > 0
            ? `${messageText}\nЗалишок: ${remainder.toLocaleString()} грн`
            : messageText;
        const text = scene.add.text(width / 2, height * 0.3, fullMessage, {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(300).setScrollFactor(0);
        text.setAlpha(0);
        scene.tweens.add({
            targets: text,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
        scene.tweens.add({
            targets: text,
            alpha: 0,
            y: text.y - 50,
            duration: 500,
            delay: 4500,
            ease: 'Power2',
            onComplete: () => {
                text.destroy();
            }
        });
    }
}
export default Exchange;