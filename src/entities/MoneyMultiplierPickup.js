import { GAME_CONFIG } from '../config/gameConfig.js';

/**
 * MoneyMultiplierPickup
 * 
 * Спеціальний пікап що дає x5 множник до всіх грошей на 30 секунд.
 * З'являється кожні 5 хвилин, існує 30 секунд.
 */
export default class MoneyMultiplierPickup extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.config = GAME_CONFIG.MONEY_MULTIPLIER;
        this.scene = scene;

        // Стан
        this.isActive = true;
        this.lifetime = this.config.LIFETIME;

        // Магнітний ефект
        this.magnetRadius = 80;
        this.magnetSpeed = 350;

        this.createVisuals();
        this.startPulseAnimation();
        this.setDepth(10);

        // Таймер зникнення
        this.lifetimeTimer = scene.time.delayedCall(this.lifetime, () => {
            this.expire();
        });
    }

    /**
     * Створює візуальні елементи
     */
    createVisuals() {
        // Зовнішнє кільце (пульсує)
        this.outerCircle = this.scene.add.circle(0, 0, this.config.WIDTH / 2, this.config.COLOR, 0.3);
        this.outerCircle.setStrokeStyle(3, this.config.COLOR, 1);

        // Внутрішнє кільце
        this.innerCircle = this.scene.add.circle(0, 0, this.config.WIDTH / 3, this.config.COLOR, 0.6);

        // Символ "x5"
        this.text = this.scene.add.text(0, 0, 'x5', {
            fontFamily: 'Arial',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        });
        this.text.setOrigin(0.5, 0.5);

        // Іконка монети (маленька)
        this.coinIcon = this.scene.add.circle(0, -15, 8, 0xffd700);

        this.add([this.outerCircle, this.innerCircle, this.coinIcon, this.text]);

        // Налаштування фізичного тіла
        if (this.body) {
            this.body.setCircle(this.config.WIDTH / 2);
        }
    }

    /**
     * Запускає анімацію пульсації
     */
    startPulseAnimation() {
        // Пульсація зовнішнього кільця
        this.scene.tweens.add({
            targets: this.outerCircle,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Обертання іконки монети
        this.scene.tweens.add({
            targets: this.coinIcon,
            y: -20,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Мерехтіння тексту
        this.scene.tweens.add({
            targets: this.text,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Оновлення (магнітний ефект)
     */
    update(delta, player) {
        if (!this.isActive || !player) return;

        const distance = Phaser.Math.Distance.Between(
            this.x, this.y,
            player.x, player.y
        );

        // Магнітний ефект
        if (distance < this.magnetRadius) {
            const angle = Phaser.Math.Angle.Between(
                this.x, this.y,
                player.x, player.y
            );

            const moveSpeed = this.magnetSpeed * (delta / 1000);
            this.x += Math.cos(angle) * moveSpeed;
            this.y += Math.sin(angle) * moveSpeed;
        }

        // Перевірка збору
        if (distance < 30) {
            this.collect(player);
        }
    }

    /**
     * Збір пікапа гравцем
     */
    collect(player) {
        if (!this.isActive) return;

        this.isActive = false;


        // Видаляємо таймер
        if (this.lifetimeTimer) {
            this.lifetimeTimer.remove();
        }

        // Викликаємо подію для GameScene
        this.scene.events.emit('money-multiplier-collected', {
            multiplier: this.config.MULTIPLIER,
            duration: this.config.DURATION
        });

        // Звук
        if (this.scene.audioManager) {
            this.scene.audioManager.playSound('pickup', false, 0.8);
        }

        // Показуємо повідомлення
        if (this.scene.notificationManager) {
            this.scene.notificationManager.show(
                this.config.MESSAGES.COLLECTED,
                GAME_CONFIG.NOTIFICATIONS.PRIORITY.HIGH,
                5000
            );
        }

        // Анімація підбору
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.destroy();
            }
        });
    }

    /**
     * Закінчується час життя пікапа
     */
    expire() {
        if (!this.isActive) return;

        this.isActive = false;


        // Викликаємо подію для GameScene
        this.scene.events.emit('money-multiplier-expired');

        // Показуємо повідомлення
        if (this.scene.notificationManager) {
            this.scene.notificationManager.show(
                this.config.MESSAGES.EXPIRED,
                GAME_CONFIG.NOTIFICATIONS.PRIORITY.MEDIUM
            );
        }

        // Анімація зникнення
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                this.destroy();
            }
        });
    }

    /**
     * Отримує позицію для мінімапи
     */
    getMinimapPosition() {
        return { x: this.x, y: this.y };
    }

    /**
     * Знищення пікапа
     */
    destroy() {
        if (this.lifetimeTimer) {
            this.lifetimeTimer.remove();
        }

        // Зупиняємо всі tweens (тільки якщо сцена ще існує)
        if (this.scene && this.scene.tweens) {
            this.scene.tweens.killTweensOf(this);
            if (this.outerCircle) this.scene.tweens.killTweensOf(this.outerCircle);
            if (this.coinIcon) this.scene.tweens.killTweensOf(this.coinIcon);
            if (this.text) this.scene.tweens.killTweensOf(this.text);
        }

        super.destroy();
    }
}
