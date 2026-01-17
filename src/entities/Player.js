// Player entity - гравець з рухом, стаміною та dash
import { GAME_CONFIG } from '../config/gameConfig.js';
import spriteManager from '../utils/SpriteManager.js';

class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, null);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Тип сутності для ідентифікації
        this.type = 'Player';
        
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
        
        // Бафи швидкості (для бонусів)
        this.speedBuffs = []; // Масив активних бафів { multiplier, duration }
        
        // Дебафи керованості (для калюж)
        this.controlDebuffs = []; // Масив активних дебафів { multiplier, duration }
        
        // Імунітет до SoftCrowd (для скутера)
        this.immunityToSoftCrowd = false;
        this.immunityToSoftCrowdTimer = 0;
        
        // Анімації та напрямок
        this.lastDirection = 'front'; // Останній напрямок руху (front, rear, left, right)
        this.isFalling = false; // Стан падіння (коли авто збиває)
        this.fallTimer = 0; // Таймер падіння
        this.fallDuration = 1000; // Тривалість анімації падіння (мс)
        
        // Audio manager для звукових ефектів
        this.audioManager = null;
    }
    
    createVisuals(scene) {
        // Створюємо спрайт гравця з початковою текстурою
        this.setTexture('standing_front');
        
        // Встановлюємо розмір (використовуємо розмір з конфігу або за замовчуванням)
        const config = spriteManager.PLAYER_SPRITE;
        const size = config.radius * 2;
        this.setDisplaySize(size, size);
        this.setDepth(10); // Гравець завжди поверх тайлів карти
        
        // Створюємо анімації
        this.createAnimations(scene);
    }
    
    /**
     * Перевіряє чи гравець на калюжі (має controlDebuff від калюжі)
     * @returns {boolean}
     */
    isOnPuddle() {
        // Якщо є controlDebuff - гравець на калюжі
        return this.controlDebuffs.length > 0;
    }
    
    createAnimations(scene) {
        // Анімація бігу вниз (front)
        scene.anims.create({
            key: 'run_front',
            frames: [
                { key: 'front_1' },
                { key: 'front_2' },
                { key: 'front_3' },
                { key: 'front_4' }
            ],
            frameRate: 10,
            repeat: -1
        });
        
        // Анімація бігу вгору (rear)
        scene.anims.create({
            key: 'run_rear',
            frames: [
                { key: 'rear_1' },
                { key: 'rear_2' },
                { key: 'rear_3' },
                { key: 'rear_4' }
            ],
            frameRate: 10,
            repeat: -1
        });
        
        // Анімація бігу вліво (left)
        scene.anims.create({
            key: 'run_left',
            frames: [
                { key: 'left_1' },
                { key: 'left_2' },
                { key: 'left_3' },
                { key: 'left_4' }
            ],
            frameRate: 10,
            repeat: -1
        });
        
        // Анімація бігу вправо (right)
        scene.anims.create({
            key: 'run_right',
            frames: [
                { key: 'right_1' },
                { key: 'right_2' },
                { key: 'right_3' },
                { key: 'right_4' }
            ],
            frameRate: 10,
            repeat: -1
        });
        
        // Анімація падіння (fall) - не використовуємо, керуємо вручну в updateVisuals
        // fall_1 показується 200мс, fall_2 - решту часу (fallDuration - 200мс)
    }
    
    setAudioManager(audioManager) {
        this.audioManager = audioManager;
    }
    
    update(time, delta) {
        // ТЕСТ: перевірка чи код виконується
        if (Math.random() < 0.01) { // Лог раз на 100 фреймів щоб не спамити
            console.log('✅ Player.update() працює! isMoving:', this.isMoving, 'audioManager:', !!this.audioManager);
        }
        
        // Оновлення таймерів
        this.updateTimers(delta);
        
        // Обробка стаміни
        this.updateStamina(delta);
        
        // Обробка руху
        this.handleMovement(delta);
        
        // Оновлення звуків
        this.updateSounds();
        
        // Оновлення візуалізації
        this.updateVisuals();
    }
    
    updateSounds() {
        if (!this.audioManager) {
            console.warn('⚠️ Player: audioManager не встановлено');
            return;
        }
        
        // Звук бігу відтворюється тільки коли гравець рухається
        // і не падає, не заморожений і не на ковзанні
        const shouldPlayRunning = this.isMoving && 
                                  !this.isFalling && 
                                  !this.isFrozen && 
                                  !this.isSliding;
        
        const isRunningPlaying = this.audioManager.isSoundPlaying('running');
        
        console.log(`🏃 Player sounds: isMoving=${this.isMoving}, shouldPlay=${shouldPlayRunning}, isPlaying=${isRunningPlaying}`);
        
        if (shouldPlayRunning && !isRunningPlaying) {
            // Починаємо відтворювати звук бігу (loop)
            console.log('▶️ Запускаю звук бігу');
            this.audioManager.playSound('running', true);
        } else if (!shouldPlayRunning && isRunningPlaying) {
            // Зупиняємо звук бігу
            console.log('⏹️ Зупиняю звук бігу');
            this.audioManager.stopSound('running');
        }
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
        
        // Fall стан (при зіткненні з авто)
        if (this.isFalling) {
            this.fallTimer -= delta;
            if (this.fallTimer <= 0) {
                this.isFalling = false;
                this.fallTimer = 0;
            }
        }
        
        // Оновлення дебафів швидкості
        this.updateSpeedDebuffs(delta);
        
        // Оновлення дебафів керованості
        this.updateControlDebuffs(delta);
        
        // Оновлення бафів швидкості
        this.updateSpeedBuffs(delta);
        
        // Оновлення імунітетів
        this.updateImmunities(delta);
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
    }
    
    updateSpeedBuffs(delta) {
        // Оновлюємо всі активні бафи
        for (let i = this.speedBuffs.length - 1; i >= 0; i--) {
            const buff = this.speedBuffs[i];
            buff.duration -= delta;
            
            if (buff.duration <= 0) {
                // Баф закінчився - видаляємо
                this.speedBuffs.splice(i, 1);
            }
        }
    }
    
    updateImmunities(delta) {
        // Оновлюємо таймер імунітету до SoftCrowd
        if (this.immunityToSoftCrowdTimer > 0) {
            this.immunityToSoftCrowdTimer -= delta;
            if (this.immunityToSoftCrowdTimer <= 0) {
                this.immunityToSoftCrowd = false;
                this.immunityToSoftCrowdTimer = 0;
            }
        }
    }
    
    /**
     * Обчислює загальний множник швидкості з урахуванням дебафів та бафів
     */
    calculateSpeedMultiplier() {
        // Exhausted має пріоритет над усім
        if (this.exhausted) {
            return this.exhaustedSpeedMultiplier;
        }
        
        let baseMultiplier = 1.0;
        
        // Застосовуємо дебафи (найнижчий множник)
        if (this.speedDebuffs.length > 0) {
            let minDebuff = 1.0;
            for (const debuff of this.speedDebuffs) {
                minDebuff = Math.min(minDebuff, debuff.multiplier);
            }
            baseMultiplier *= minDebuff;
        }
        
        // Застосовуємо бафи (додаємо до базового)
        if (this.speedBuffs.length > 0) {
            let totalBuff = 0;
            for (const buff of this.speedBuffs) {
                totalBuff += buff.multiplier;
            }
            baseMultiplier += totalBuff;
        }
        
        return baseMultiplier;
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
        
        // Оновлюємо останній напрямок руху
        if (moveX !== 0 || moveY !== 0) {
            // Визначаємо пріоритетний напрямок (вертикальний має пріоритет над горизонтальним)
            if (moveY < 0) {
                this.lastDirection = 'rear'; // Вгору
            } else if (moveY > 0) {
                this.lastDirection = 'front'; // Вниз
            } else if (moveX < 0) {
                this.lastDirection = 'left'; // Вліво
            } else if (moveX > 0) {
                this.lastDirection = 'right'; // Вправо
            }
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
        // Спочатку обчислюємо базовий множник з дебафів/бафів
        this.speedMultiplier = this.calculateSpeedMultiplier();
        
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
        // Пріоритет анімацій: fall > sliding (на калюжах) > slide (SHIFT) > frozen > рух > стояння
        
        // Анімація падіння (коли авто збиває)
        if (this.isFalling) {
            // Зупиняємо всі інші анімації
            this.anims.stop();
            
            // fall_1 показується перші 200мс, fall_2 - решту часу
            const fallFirstFrameDuration = 200; // Тривалість першого кадру (мс)
            const timeSinceFall = this.fallDuration - this.fallTimer;
            
            if (timeSinceFall < fallFirstFrameDuration) {
                // Показуємо перший кадр
                if (this.texture.key !== 'fall_1') {
                    this.setTexture('fall_1');
                }
            } else {
                // Показуємо другий кадр до кінця заморозки
                if (this.texture.key !== 'fall_2') {
                    this.setTexture('fall_2');
                }
            }
            
            return; // Не показуємо інші анімації під час падіння
        }
        
        // Анімація ковзання на калюжах (коли є controlDebuff від калюжі)
        if (this.isOnPuddle() && this.isMoving) {
            if (this.texture.key !== 'sliding') {
                this.setTexture('sliding');
                this.anims.stop(); // Зупиняємо будь-які інші анімації
            }
            return;
        }
        
        // Анімація slide (SHIFT ability)
        if (this.isSliding || this.slideActive) {
            if (this.texture.key !== 'sliding') {
                this.setTexture('sliding');
                this.anims.stop(); // Зупиняємо будь-які інші анімації
            }
            return;
        }
        
        // Якщо гравець рухається - показуємо анімацію бігу
        if (this.isMoving && !this.isFrozen) {
            const animKey = `run_${this.lastDirection}`;
            if (!this.anims.isPlaying || this.anims.currentAnim.key !== animKey) {
                this.anims.play(animKey, true);
            }
        } else {
            // Якщо гравець стоїть - показуємо статичну позу
            const standingKey = `standing_${this.lastDirection}`;
            if (this.texture.key !== standingKey) {
                this.setTexture(standingKey);
                this.anims.stop(); // Зупиняємо анімацію бігу
            }
        }
        
        // Оновлюємо колір спрайта залежно від стану (тільки tint, не анімація)
        let tint = 0xffffff; // Білий (без зміни кольору) за замовчуванням
        
        if (this.isFrozen) {
            tint = 0x9b59b6; // Фіолетовий коли заморожений
        } else if (this.exhausted) {
            tint = 0xe74c3c; // Червоний коли exhausted
        } else if (this.dashActive) {
            tint = 0xf39c12; // Помаранчевий під час dash
        }
        
        this.setTint(tint);
    }
    
    /**
     * Запускає анімацію падіння (коли авто збиває гравця)
     */
    triggerFall() {
        if (this.isFalling) return; // Вже падає
        
        this.isFalling = true;
        this.fallTimer = this.fallDuration;
        this.setVelocity(0, 0); // Зупиняємо рух під час падіння
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
    
    /**
     * Додає баф швидкості (для бонусів)
     * @param {number} multiplier - Додатковий множник швидкості (додається до базового)
     * @param {number} duration - Тривалість бафу (мс)
     */
    addSpeedBuff(multiplier, duration) {
        this.speedBuffs.push({
            multiplier: multiplier,
            duration: duration
        });
    }
    
    /**
     * Додає імунітет до SoftCrowd
     * @param {number} duration - Тривалість імунітету (мс)
     */
    addImmunityToSoftCrowd(duration) {
        this.immunityToSoftCrowd = true;
        this.immunityToSoftCrowdTimer = duration;
    }
    
    /**
     * Перевіряє чи гравець має імунітет до SoftCrowd
     * @returns {boolean}
     */
    hasImmunityToSoftCrowd() {
        return this.immunityToSoftCrowd && this.immunityToSoftCrowdTimer > 0;
    }
    
    destroy() {
        super.destroy();
    }
}

export default Player;