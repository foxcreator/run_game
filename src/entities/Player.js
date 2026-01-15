// Player entity - гравець з рухом, стаміною та dash
import { GAME_CONFIG } from '../config/gameConfig.js';
import spriteManager from '../utils/SpriteManager.js';

class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, null);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Фізика з обмеженням межами світу
        this.setCollideWorldBounds(true);
        this.setDrag(600); // Плавне гальмування
        
        // Параметри руху (згідно MVP)
        this.baseSpeed = GAME_CONFIG.PLAYER.BASE_SPEED;
        this.currentSpeed = this.baseSpeed;
        this.speedMultiplier = 1.0;
        
        // Стаміна (згідно MVP)
        this.staminaMax = GAME_CONFIG.PLAYER.STAMINA_MAX;
        this.stamina = this.staminaMax;
        this.staminaDrainPerSec = GAME_CONFIG.PLAYER.STAMINA_DRAIN_PER_SEC;
        this.staminaRegenPerSec = GAME_CONFIG.PLAYER.STAMINA_REGEN_PER_SEC;
        this.staminaRegenMultiplier = GAME_CONFIG.PLAYER.STAMINA_REGEN_MULTIPLIER;
        
        // Exhausted стан
        this.exhausted = false;
        this.exhaustedSlowDuration = GAME_CONFIG.PLAYER.EXHAUSTED_SLOW_DURATION;
        this.exhaustedSpeedMultiplier = GAME_CONFIG.PLAYER.EXHAUSTED_SPEED_MULTIPLIER;
        this.exhaustedTimer = 0;
        
        // Dash (згідно MVP)
        this.dashDuration = GAME_CONFIG.PLAYER.DASH_DURATION;
        this.dashSpeedMultiplier = GAME_CONFIG.PLAYER.DASH_SPEED_MULTIPLIER;
        this.dashCooldown = GAME_CONFIG.PLAYER.DASH_COOLDOWN;
        this.dashStaminaCost = GAME_CONFIG.PLAYER.DASH_STAMINA_COST;
        this.dashActive = false;
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        this.dashDirection = { x: 0, y: 0 };
        
        // Slide (під стрічку)
        this.slideDuration = GAME_CONFIG.PLAYER.SLIDE_DURATION;
        this.slideCooldown = GAME_CONFIG.PLAYER.SLIDE_COOLDOWN;
        this.slideSpeedMultiplier = GAME_CONFIG.PLAYER.SLIDE_SPEED_MULTIPLIER;
        this.slideActive = false;
        this.slideTimer = 0;
        this.slideCooldownTimer = 0;
        this.isSliding = false; // Флаг для TapeGate
        
        // Візуалізація
        this.createVisuals(scene);
        
        // Клавіатура
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.wasd = scene.input.keyboard.addKeys('W,S,A,D');
        this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.shiftKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        
        // Флаг для відстеження руху
        this.isMoving = false;
        
        // Стан заморозки (при зіткненні з кіоском)
        this.isFrozen = false;
        this.frozenTimer = 0;
        this.frozenDuration = GAME_CONFIG.KIOSKS.FREEZE_DURATION;
        this.frozenPosition = null; // Позиція при заморозці
        this.lastKioskCollisionTime = 0; // Час останнього зіткнення з кіоском
        this.kioskCooldown = GAME_CONFIG.KIOSKS.COOLDOWN;
        
        // Дебафи швидкості (для перешкод)
        this.speedDebuffs = []; // Масив активних дебафів { multiplier, duration }
        
        // Дебафи керованості (для калюж)
        this.controlDebuffs = []; // Масив активних дебафів { multiplier, duration }
    }
    
    createVisuals(scene) {
        // Створюємо спрайт гравця через SpriteManager
        const textureKey = spriteManager.createPlayerSprite(scene);
        this.setTexture(textureKey);
        
        const config = spriteManager.PLAYER_SPRITE;
        const size = config.radius * 2;
        this.setDisplaySize(size, size);
        this.setDepth(10); // Гравець завжди поверх тайлів карти
    }
    
    update(time, delta) {
        // Оновлення таймерів
        this.updateTimers(delta);
        
        // Обробка стаміни
        this.updateStamina(delta);
        
        // Обробка руху
        this.handleMovement(delta);
        
        // Оновлення візуалізації
        this.updateVisuals();
    }
    
    updateTimers(delta) {
        // Dash cooldown
        if (this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= delta;
        }
        
        // Dash активний
        if (this.dashActive) {
            this.dashTimer -= delta;
            if (this.dashTimer <= 0) {
                this.dashActive = false;
            }
        }
        
        // Slide cooldown
        if (this.slideCooldownTimer > 0) {
            this.slideCooldownTimer -= delta;
        }
        
        // Slide активний
        if (this.slideActive) {
            this.slideTimer -= delta;
            if (this.slideTimer <= 0) {
                this.slideActive = false;
                this.isSliding = false;
            } else {
                this.isSliding = true;
            }
        } else {
            this.isSliding = false;
        }
        
        // Exhausted стан
        if (this.exhausted) {
            this.exhaustedTimer -= delta;
            if (this.exhaustedTimer <= 0) {
                this.exhausted = false;
                this.speedMultiplier = 1.0; // Скидаємо множник швидкості
                this.stamina = 15; // Відновлюємо трохи стаміни
            }
        }
        
        // Frozen стан (при зіткненні з кіоском)
        if (this.isFrozen) {
            this.frozenTimer -= delta;
            if (this.frozenTimer <= 0) {
                this.isFrozen = false;
                this.frozenPosition = null; // Очищаємо позицію
                // Після заморозки потрібно відштовхнути гравця від кіоска
                // Це буде зроблено в GameScene.checkTilemapCollisions()
            }
        }
        
        // Оновлення дебафів швидкості
        this.updateSpeedDebuffs(delta);
        
        // Оновлення дебафів керованості
        this.updateControlDebuffs(delta);
    }
    
    updateSpeedDebuffs(delta) {
        // Оновлюємо всі активні дебафи
        for (let i = this.speedDebuffs.length - 1; i >= 0; i--) {
            const debuff = this.speedDebuffs[i];
            debuff.duration -= delta;
            
            if (debuff.duration <= 0) {
                // Дебаф закінчився - видаляємо
                this.speedDebuffs.splice(i, 1);
            }
        }
        
        // Обчислюємо загальний множник швидкості
        // Exhausted має пріоритет над дебафами
        if (this.exhausted) {
            // Exhausted встановлює свій множник, не змінюємо його
            return;
        }
        
        // Якщо є дебафи, застосовуємо найнижчий множник
        if (this.speedDebuffs.length > 0) {
            let minMultiplier = 1.0;
            for (const debuff of this.speedDebuffs) {
                minMultiplier = Math.min(minMultiplier, debuff.multiplier);
            }
            this.speedMultiplier = minMultiplier;
        } else {
            // Якщо немає дебафів - повертаємо до 1.0
            this.speedMultiplier = 1.0;
        }
    }
    
    updateControlDebuffs(delta) {
        // Оновлюємо всі активні дебафи керованості
        for (let i = this.controlDebuffs.length - 1; i >= 0; i--) {
            const debuff = this.controlDebuffs[i];
            debuff.duration -= delta;
            
            if (debuff.duration <= 0) {
                // Дебаф закінчився - видаляємо
                this.controlDebuffs.splice(i, 1);
            }
        }
    }
    
    getControlMultiplier() {
        // Обчислюємо загальний множник керованості
        if (this.controlDebuffs.length > 0) {
            let minMultiplier = 1.0;
            for (const debuff of this.controlDebuffs) {
                minMultiplier = Math.min(minMultiplier, debuff.multiplier);
            }
            return minMultiplier;
        }
        return 1.0;
    }
    
    updateStamina(delta) {
        // Якщо гравець заморожений - не оновлюємо стаміну (вона вже відновлена з кіоска)
        if (this.isFrozen) {
            return;
        }
        
        const dt = delta / 1000; // Перетворюємо в секунди
        
        if (this.isMoving && !this.exhausted) {
            // Витрата стаміни при русі
            this.stamina -= this.staminaDrainPerSec * dt;
            
            if (this.stamina <= 0) {
                this.stamina = 0;
                this.triggerExhausted();
            }
        } else {
            // Відновлення стаміни при стоянні/повільному русі
            let regenRate = this.staminaRegenPerSec;
            if (!this.isMoving) {
                regenRate *= this.staminaRegenMultiplier; // Швидше при стоянні
            }
            
            this.stamina += regenRate * dt;
            if (this.stamina > this.staminaMax) {
                this.stamina = this.staminaMax;
            }
        }
    }
    
    triggerExhausted() {
        if (this.exhausted) return; // Вже в exhausted
        
        this.exhausted = true;
        this.exhaustedTimer = this.exhaustedSlowDuration;
        this.speedMultiplier = this.exhaustedSpeedMultiplier;
        this.stamina = 0; // Встановлюємо в 0
    }
    
    handleMovement(delta) {
        // Якщо гравець заморожений, блокуємо рух
        if (this.isFrozen) {
            this.setVelocity(0, 0);
            this.isMoving = false;
            return;
        }
        
        // Визначаємо напрямок руху
        let moveX = 0;
        let moveY = 0;
        
        // WASD або стрілки
        if (this.wasd.A.isDown || this.cursors.left.isDown) {
            moveX = -1;
        } else if (this.wasd.D.isDown || this.cursors.right.isDown) {
            moveX = 1;
        }
        
        if (this.wasd.W.isDown || this.cursors.up.isDown) {
            moveY = -1;
        } else if (this.wasd.S.isDown || this.cursors.down.isDown) {
            moveY = 1;
        }
        
        // Нормалізація діагонального руху
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.707; // 1/sqrt(2)
            moveY *= 0.707;
        }
        
        // Перевірка чи гравець рухається
        this.isMoving = (moveX !== 0 || moveY !== 0);
        
        // Dash (SPACE)
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.canDash()) {
            this.performDash(moveX, moveY);
        }
        
        // Slide (SHIFT)
        if (Phaser.Input.Keyboard.JustDown(this.shiftKey) && this.canSlide()) {
            this.performSlide(moveX, moveY);
        }
        
        // Обчислення швидкості
        let currentSpeedMultiplier = this.speedMultiplier;
        if (this.dashActive) {
            currentSpeedMultiplier *= this.dashSpeedMultiplier;
        } else if (this.slideActive) {
            currentSpeedMultiplier *= this.slideSpeedMultiplier;
        }
        
        this.currentSpeed = this.baseSpeed * currentSpeedMultiplier;
        
        // Застосування множника керованості (для калюж)
        const controlMultiplier = this.getControlMultiplier();
        
        // Застосування швидкості
        if (this.dashActive) {
            // Під час dash рухаємося в заданому напрямку
            this.setVelocity(
                this.dashDirection.x * this.currentSpeed,
                this.dashDirection.y * this.currentSpeed
            );
        } else if (this.slideActive) {
            // Під час slide рухаємося в напрямку руху з множником керованості
            this.setVelocity(
                moveX * this.currentSpeed * controlMultiplier,
                moveY * this.currentSpeed * controlMultiplier
            );
        } else {
            // Звичайний рух з множником керованості
            this.setVelocity(
                moveX * this.currentSpeed * controlMultiplier,
                moveY * this.currentSpeed * controlMultiplier
            );
        }
    }
    
    freeze(duration = 2000) {
        // Заморожуємо гравця на вказаний час
        if (this.isFrozen) return; // Вже заморожений
        
        this.isFrozen = true;
        this.frozenTimer = duration;
        this.frozenPosition = { x: this.x, y: this.y }; // Зберігаємо позицію
        this.setVelocity(0, 0); // Зупиняємо рух
    }
    
    getFrozenPosition() {
        return this.frozenPosition;
    }
    
    canDash() {
        return !this.dashActive && 
               this.dashCooldownTimer <= 0 && 
               this.stamina >= this.dashStaminaCost &&
               !this.exhausted;
    }
    
    performDash(directionX, directionY) {
        // Якщо немає напрямку, не робимо dash
        if (directionX === 0 && directionY === 0) return;
        
        // Нормалізуємо напрямок
        const length = Math.sqrt(directionX * directionX + directionY * directionY);
        this.dashDirection.x = directionX / length;
        this.dashDirection.y = directionY / length;
        
        // Активація dash
        this.dashActive = true;
        this.dashTimer = this.dashDuration;
        this.dashCooldownTimer = this.dashCooldown;
        
        // Витрата стаміни
        this.stamina -= this.dashStaminaCost;
        if (this.stamina < 0) {
            this.stamina = 0;
        }
    }
    
    canSlide() {
        return !this.slideActive && 
               this.slideCooldownTimer <= 0 && 
               !this.isFrozen &&
               !this.exhausted;
    }
    
    performSlide(directionX, directionY) {
        // Якщо немає напрямку, не робимо slide
        if (directionX === 0 && directionY === 0) return;
        
        // Активація slide
        this.slideActive = true;
        this.slideTimer = this.slideDuration;
        this.slideCooldownTimer = this.slideCooldown;
        this.isSliding = true;
    }
    
    updateVisuals() {
        // Оновлюємо колір спрайта залежно від стану
        let tint = 0x3498db; // Синій за замовчуванням
        
        if (this.isFrozen) {
            tint = 0x9b59b6; // Фіолетовий коли заморожений
        } else if (this.exhausted) {
            tint = 0xe74c3c; // Червоний коли exhausted
        } else if (this.dashActive) {
            tint = 0xf39c12; // Помаранчевий під час dash
        } else if (this.slideActive) {
            tint = 0x2ecc71; // Зелений під час slide
        }
        
        this.setTint(tint);
    }
    
    // Геттери для HUD
    getStamina() {
        return this.stamina;
    }
    
    getStaminaMax() {
        return this.staminaMax;
    }
    
    getDashCooldown() {
        return this.dashCooldownTimer;
    }
    
    getDashCooldownMax() {
        return this.dashCooldown;
    }
    
    isDashOnCooldown() {
        return this.dashCooldownTimer > 0;
    }
    
    isExhausted() {
        return this.exhausted;
    }
    
    restoreStamina() {
        // Поповнюємо стаміну до максимуму (енергетик з кіоска)
        // Встановлюємо точно на максимум, незалежно від поточного значення
        this.stamina = this.staminaMax;
        
        // Також скидаємо exhausted стан, якщо він був активний
        if (this.exhausted) {
            this.exhausted = false;
            this.exhaustedTimer = 0;
            this.speedMultiplier = 1.0;
        }
    }
    
    applySpeedDebuff(multiplier, duration) {
        // Додаємо новий дебаф швидкості
        this.speedDebuffs.push({
            multiplier: multiplier,
            duration: duration
        });
    }
    
    applyControlDebuff(multiplier, duration) {
        // Додаємо новий дебаф керованості
        this.controlDebuffs.push({
            multiplier: multiplier,
            duration: duration
        });
    }
    
    destroy() {
        super.destroy();
    }
}

export default Player;