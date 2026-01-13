// Player entity - гравець з рухом, стаміною та dash
class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, null);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Фізика з обмеженням межами світу
        this.setCollideWorldBounds(true);
        this.setDrag(600); // Плавне гальмування
        
        // Параметри руху (згідно MVP)
        this.baseSpeed = 220;
        this.currentSpeed = this.baseSpeed;
        this.speedMultiplier = 1.0;
        
        // Стаміна (згідно MVP)
        this.staminaMax = 100;
        this.stamina = this.staminaMax;
        this.staminaDrainPerSec = 6;
        this.staminaRegenPerSec = 4;
        this.staminaRegenMultiplier = 1.2; // Швидше реген при стоянні
        
        // Exhausted стан
        this.exhausted = false;
        this.exhaustedSlowDuration = 2000; // 2 сек
        this.exhaustedSpeedMultiplier = 0.75;
        this.exhaustedTimer = 0;
        
        // Dash (згідно MVP)
        this.dashDuration = 350; // 0.35 сек
        this.dashSpeedMultiplier = 1.7;
        this.dashCooldown = 4000; // 4 сек
        this.dashStaminaCost = 20;
        this.dashActive = false;
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        this.dashDirection = { x: 0, y: 0 };
        
        // Візуалізація
        this.createVisuals(scene);
        
        // Клавіатура
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.wasd = scene.input.keyboard.addKeys('W,S,A,D');
        this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Флаг для відстеження руху
        this.isMoving = false;
    }
    
    createVisuals(scene) {
        // Створюємо простий спрайт (коло) для гравця
        const radius = 15;
        const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0x3498db, 1);
        graphics.fillCircle(radius, radius, radius);
        graphics.lineStyle(2, 0xffffff, 1);
        graphics.strokeCircle(radius, radius, radius);
        graphics.generateTexture('player', radius * 2, radius * 2);
        graphics.destroy();
        
        // Встановлюємо текстуру
        this.setTexture('player');
        this.setDisplaySize(radius * 2, radius * 2);
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
        
        // Exhausted стан
        if (this.exhausted) {
            this.exhaustedTimer -= delta;
            if (this.exhaustedTimer <= 0) {
                this.exhausted = false;
                this.speedMultiplier = 1.0; // Скидаємо множник швидкості
                this.stamina = 15; // Відновлюємо трохи стаміни
            }
        }
    }
    
    updateStamina(delta) {
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
        
        // Обчислення швидкості
        let currentSpeedMultiplier = this.speedMultiplier;
        if (this.dashActive) {
            currentSpeedMultiplier *= this.dashSpeedMultiplier;
        }
        
        this.currentSpeed = this.baseSpeed * currentSpeedMultiplier;
        
        // Застосування швидкості
        if (this.dashActive) {
            // Під час dash рухаємося в заданому напрямку
            this.setVelocity(
                this.dashDirection.x * this.currentSpeed,
                this.dashDirection.y * this.currentSpeed
            );
        } else {
            // Звичайний рух
            this.setVelocity(
                moveX * this.currentSpeed,
                moveY * this.currentSpeed
            );
        }
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
    
    updateVisuals() {
        // Оновлюємо колір спрайта залежно від стану
        let tint = 0x3498db; // Синій за замовчуванням
        
        if (this.exhausted) {
            tint = 0xe74c3c; // Червоний коли exhausted
        } else if (this.dashActive) {
            tint = 0xf39c12; // Помаранчевий під час dash
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
    
    destroy() {
        super.destroy();
    }
}

export default Player;