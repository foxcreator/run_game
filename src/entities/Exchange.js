// Exchange - обмінник валют
import { GAME_CONFIG } from '../config/gameConfig.js';

class Exchange extends Phaser.GameObjects.Image {
    constructor(scene, x, y) {
        // Використовуємо текстуру обмінника
        const textureKey = 'exchange';
        
        // Використовуємо текстуру (якщо вона не завантажена, Phaser покаже помилку)
        super(scene, x, y, textureKey);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setOrigin(0.5);
        this.setDepth(2); // Обмінник поверх перешкод, але під гравцем
        
        // Встановлюємо розмір обмінника (можна налаштувати під розмір текстури)
        const displayWidth = 80; // Ширина відображення
        const displayHeight = 80; // Висота відображення
        this.setDisplaySize(displayWidth, displayHeight);
        
        // Налаштовуємо колізію (не можна проходити крізь обмінник)
        // Важливо: налаштовуємо body ПІСЛЯ physics.add.existing
        if (this.body) {
            this.body.setImmovable(true);
            // Збільшуємо розмір body для повної колізії (трохи більше ніж візуальний розмір)
            const collisionSize = Math.max(displayWidth, displayHeight) * 1.2; // +20% для повної колізії
            this.body.setSize(collisionSize, collisionSize);
            // Центруємо body відносно спрайта
            this.body.setOffset(-(collisionSize - displayWidth) / 2, -(collisionSize - displayHeight) / 2);
        }
        
        // Параметри обмінника
        this.exchangeRate = GAME_CONFIG.EXCHANGES.EXCHANGE_RATE;
        this.freezeDuration = GAME_CONFIG.EXCHANGES.FREEZE_DURATION;
        this.cooldown = GAME_CONFIG.EXCHANGES.COOLDOWN;
        this.lastExchangeTime = 0;
        this.isExchanging = false;
        
        // Флаг активності
        this.active = true;
    }
    
    /**
     * Обмінює гривні на долари
     * @param {Player} player - Гравець
     * @param {GameScene} scene - Сцена гри
     * @returns {boolean} true якщо обмін успішний
     */
    exchange(player, scene) {
        if (!player || !scene) return false;
        
        const currentTime = scene.time.now;
        
        // Перевіряємо cooldown
        if (currentTime - this.lastExchangeTime < this.cooldown) {
            return false;
        }
        
        // Перевіряємо чи є гривні для обміну
        if (!scene.runMoney || scene.runMoney <= 0) {
            return false;
        }
        
        // Перевіряємо чи не вже відбувається обмін
        if (this.isExchanging || player.isFrozen) {
            return false;
        }
        
        // Обчислюємо обмін ПЕРЕД заморозкою
        // Курс: 1 долар = 43 гривні
        // Обмінюємо тільки цілу частину, яка ділиться націло на курс
        const uahAmount = scene.runMoney;
        
        // Обчислюємо скільки доларів можна отримати (1 долар = 43 грн)
        const usdAmountFloat = uahAmount / this.exchangeRate;
        const usdAmount = Math.floor(usdAmountFloat); // Округлюємо вниз (без копійок)
        
        // Якщо немає що міняти (usdAmount = 0) - не фризимо
        if (usdAmount <= 0) {
            return false;
        }
        
        // Обчислюємо скільки гривень потрібно для цієї кількості доларів
        // Наприклад: 1 долар * 43 = 43 грн, 2 долари * 43 = 86 грн
        const uahToExchange = usdAmount * this.exchangeRate;
        
        // Залишок = те що не обміняли
        const remainder = uahAmount - uahToExchange;
        
        // Починаємо обмін (тільки якщо є що міняти)
        this.isExchanging = true;
        this.lastExchangeTime = currentTime;
        
        // Заморожуємо гравця
        player.freeze(this.freezeDuration);
        
        // Додаємо долари в банк
        if (scene.saveSystem) {
            scene.saveSystem.addBankedMoney(usdAmount);
            scene.bankedMoney = scene.saveSystem.getBankedMoney();
        }
        
        // Залишаємо залишок в runMoney
        scene.runMoney = remainder;
        
        // Показуємо повідомлення про обмін
        this.showExchangeMessage(scene, uahToExchange, usdAmount, remainder);
        
        // Завершуємо обмін після заморозки
        scene.time.delayedCall(this.freezeDuration, () => {
            this.isExchanging = false;
        });
        
        return true;
    }
    
    /**
     * Показує повідомлення про обмін на екрані
     * @param {GameScene} scene - Сцена гри
     * @param {number} uahExchanged - Скільки гривень обміняли
     * @param {number} usdReceived - Скільки доларів отримали
     * @param {number} remainder - Залишок гривень
     */
    showExchangeMessage(scene, uahExchanged, usdReceived, remainder) {
        const { width, height } = scene.cameras.main;
        
        // Створюємо текст повідомлення
        const messageText = `Ви поміняли ${uahExchanged.toLocaleString()} грн\nНа ваш криптокошелек зараховано $${usdReceived.toLocaleString()}`;
        
        // Якщо є залишок - додаємо інформацію про нього
        const fullMessage = remainder > 0 
            ? `${messageText}\nЗалишок: ${remainder.toLocaleString()} грн`
            : messageText;
        
        // Створюємо текст на екрані
        const text = scene.add.text(width / 2, height * 0.3, fullMessage, {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(300).setScrollFactor(0);
        
        // Анімація появи
        text.setAlpha(0);
        scene.tweens.add({
            targets: text,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
        
        // Анімація зникнення через 5 секунд (більше часу для читання)
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
