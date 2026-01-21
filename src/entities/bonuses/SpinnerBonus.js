import { GAME_CONFIG } from '../../config/gameConfig.js';

/**
 * SpinnerBonus
 * 
 * Активний бонус "Вертушка" (клавіша E).
 * Відкидає та заморожує всіх ворогів в радіусі на 4 секунди.
 */
export default class SpinnerBonus {
    constructor(scene, player, saveSystem) {
        this.scene = scene;
        this.player = player;
        this.saveSystem = saveSystem;
        
        this.config = GAME_CONFIG.SPINNER_BONUS;
        
        // Стан
        this.cooldownTimer = 0;
        this.isOnCooldown = false;
        
        // Завантажуємо кількість з SaveSystem
        this.usesLeft = this.saveSystem ? this.saveSystem.getSpinnerCount() : this.config.INITIAL_COUNT;
        
        // Клавіша
        this.key = this.scene.input.keyboard.addKey(this.config.KEY);
        
    }
    
    /**
     * Оновлення (кожен кадр)
     */
    update(delta) {
        // Оновлюємо cooldown
        if (this.isOnCooldown) {
            this.cooldownTimer -= delta;
            if (this.cooldownTimer <= 0) {
                this.cooldownTimer = 0;
                this.isOnCooldown = false;
            }
        }
        
        // Перевіряємо натискання клавіші
        if (Phaser.Input.Keyboard.JustDown(this.key)) {
            this.tryActivate();
        }
    }
    
    /**
     * Спроба активувати бонус
     */
    tryActivate() {
        // Перевірка cooldown
        if (this.isOnCooldown) {
            const secondsLeft = Math.ceil(this.cooldownTimer / 1000);
            const message = this.config.MESSAGES.COOLDOWN.replace('{seconds}', secondsLeft);
            
            if (this.scene.notificationManager) {
                this.scene.notificationManager.show(
                    message,
                    GAME_CONFIG.NOTIFICATIONS.PRIORITY.LOW,
                    2000
                );
            }
            return;
        }
        
        // Перевірка кількості використань
        if (this.usesLeft <= 0) {
            if (this.scene.notificationManager) {
                this.scene.notificationManager.show(
                    this.config.MESSAGES.NO_USES,
                    GAME_CONFIG.NOTIFICATIONS.PRIORITY.MEDIUM,
                    3000
                );
            }
            return;
        }
        
        // Перевіряємо чи є вороги поблизу
        const enemiesNearby = this.getEnemiesInRadius();
        if (enemiesNearby.length === 0) {
            if (this.scene.notificationManager) {
                this.scene.notificationManager.show(
                    this.config.MESSAGES.NO_ENEMIES,
                    GAME_CONFIG.NOTIFICATIONS.PRIORITY.LOW,
                    2000
                );
            }
            return;
        }
        
        // Активуємо бонус!
        this.activate(enemiesNearby);
    }
    
    /**
     * Активує бонус
     */
    activate(enemies) {
        
        // Зменшуємо кількість використань
        this.usesLeft--;
        
        // Зберігаємо в SaveSystem
        if (this.saveSystem) {
            this.saveSystem.setSpinnerCount(this.usesLeft);
        }
        
        // Запускаємо cooldown
        this.isOnCooldown = true;
        this.cooldownTimer = this.config.COOLDOWN;
        
        // Відкидаємо та заморожуємо ворогів
        this.pushAndFreezeEnemies(enemies);
        
        // Візуальний ефект
        this.playVisualEffect();
        
        // Звук (можна додати окремий)
        if (this.scene.audioManager) {
            this.scene.audioManager.playSound('pickup', false, 0.8);
        }
        
        // Повідомлення
        if (this.scene.notificationManager) {
            this.scene.notificationManager.show(
                this.config.MESSAGES.ACTIVATED,
                GAME_CONFIG.NOTIFICATIONS.PRIORITY.HIGH,
                2000
            );
        }
    }
    
    /**
     * Отримує всіх ворогів в радіусі
     */
    getEnemiesInRadius() {
        if (!this.scene.chasers || !this.player) return [];
        
        const enemiesInRadius = [];
        
        for (const enemy of this.scene.chasers) {
            if (!enemy || !enemy.active) continue;
            
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                enemy.x, enemy.y
            );
            
            if (distance <= this.config.RADIUS) {
                enemiesInRadius.push(enemy);
            }
        }
        
        return enemiesInRadius;
    }
    
    /**
     * Відкидає та заморожує ворогів
     */
    pushAndFreezeEnemies(enemies) {
        for (const enemy of enemies) {
            if (!enemy || !enemy.active || !enemy.body) continue;
            
            // Обчислюємо кут від гравця до ворога
            const angle = Phaser.Math.Angle.Between(
                this.player.x, this.player.y,
                enemy.x, enemy.y
            );
            
            // Відкидаємо ворога
            const velocityX = Math.cos(angle) * this.config.PUSH_FORCE;
            const velocityY = Math.sin(angle) * this.config.PUSH_FORCE;
            
            enemy.setVelocity(velocityX, velocityY);
            
            // Заморожуємо ворога
            enemy.setFrozen(this.config.FREEZE_DURATION);
            
            // Візуальний ефект на ворозі
            this.scene.tweens.add({
                targets: enemy,
                scaleX: 0.8,
                scaleY: 0.8,
                duration: 100,
                yoyo: true,
                ease: 'Power2'
            });
        }
    }
    
    /**
     * Відтворює візуальний ефект "вертушки"
     */
    playVisualEffect() {
        // Створюємо кільце що розширюється
        const ring = this.scene.add.circle(
            this.player.x,
            this.player.y,
            10,
            0xffd700,
            0
        );
        ring.setStrokeStyle(4, 0xffd700, 1);
        ring.setDepth(20);
        
        // Анімація розширення
        this.scene.tweens.add({
            targets: ring,
            radius: this.config.RADIUS,
            alpha: 0,
            duration: this.config.ANIMATION_DURATION,
            ease: 'Power2',
            onComplete: () => {
                ring.destroy();
            }
        });
        
        // Додаткові кільця для ефекту
        for (let i = 1; i <= 2; i++) {
            this.scene.time.delayedCall(i * 100, () => {
                const extraRing = this.scene.add.circle(
                    this.player.x,
                    this.player.y,
                    10,
                    0xffa500,
                    0
                );
                extraRing.setStrokeStyle(3, 0xffa500, 0.7);
                extraRing.setDepth(19);
                
                this.scene.tweens.add({
                    targets: extraRing,
                    radius: this.config.RADIUS * 0.8,
                    alpha: 0,
                    duration: this.config.ANIMATION_DURATION * 0.8,
                    ease: 'Power2',
                    onComplete: () => {
                        extraRing.destroy();
                    }
                });
            });
        }
    }
    
    /**
     * Чи на cooldown
     */
    isOnCooldownNow() {
        return this.isOnCooldown;
    }
    
    /**
     * Отримує залишок cooldown (секунди)
     */
    getCooldownRemaining() {
        return Math.ceil(this.cooldownTimer / 1000);
    }
    
    /**
     * Отримує залишок використань
     */
    getUsesLeft() {
        return this.usesLeft;
    }
    
    /**
     * Додає використання (покупка в магазині)
     */
    addUses(amount) {
        this.usesLeft += amount;
        
        // Зберігаємо в SaveSystem
        if (this.saveSystem) {
            this.saveSystem.setSpinnerCount(this.usesLeft);
        }
        
    }
    
    /**
     * Зупиняє бонус (пауза)
     */
    pause() {
        // Нічого особливого не треба
    }
    
    /**
     * Відновлює бонус
     */
    resume() {
        // Нічого особливого не треба
    }
    
    /**
     * Скидає бонус
     */
    reset() {
        this.cooldownTimer = 0;
        this.isOnCooldown = false;
        // Не скидаємо usesLeft - це купується в магазині
    }
    
    /**
     * Знищує бонус
     */
    destroy() {
        if (this.key) {
            this.key.destroy();
        }
    }
}
