import { GAME_CONFIG } from '../config/gameConfig.js';
import spriteManager from '../utils/SpriteManager.js';
class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, null);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.type = 'Player';
        this.setCollideWorldBounds(true);
        this.setDrag(600);
        this.baseSpeed = GAME_CONFIG.PLAYER.BASE_SPEED;
        this.currentSpeed = this.baseSpeed;
        this.speedMultiplier = 1.0;
        this.staminaMax = GAME_CONFIG.PLAYER.STAMINA_MAX;
        this.stamina = this.staminaMax;
        this.staminaDrainPerSec = GAME_CONFIG.PLAYER.STAMINA_DRAIN_PER_SEC;
        this.staminaRegenPerSec = GAME_CONFIG.PLAYER.STAMINA_REGEN_PER_SEC;
        this.staminaRegenMultiplier = GAME_CONFIG.PLAYER.STAMINA_REGEN_MULTIPLIER;
        this.exhausted = false;
        this.exhaustedSlowDuration = GAME_CONFIG.PLAYER.EXHAUSTED_SLOW_DURATION;
        this.exhaustedSpeedMultiplier = GAME_CONFIG.PLAYER.EXHAUSTED_SPEED_MULTIPLIER;
        this.exhaustedTimer = 0;
        this.dashDuration = GAME_CONFIG.PLAYER.DASH_DURATION;
        this.dashSpeedMultiplier = GAME_CONFIG.PLAYER.DASH_SPEED_MULTIPLIER;
        this.dashCooldown = GAME_CONFIG.PLAYER.DASH_COOLDOWN;
        this.dashStaminaCost = GAME_CONFIG.PLAYER.DASH_STAMINA_COST;
        this.dashActive = false;
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        this.dashDirection = { x: 0, y: 0 };
        this.slideDuration = GAME_CONFIG.PLAYER.SLIDE_DURATION;
        this.slideCooldown = GAME_CONFIG.PLAYER.SLIDE_COOLDOWN;
        this.slideSpeedMultiplier = GAME_CONFIG.PLAYER.SLIDE_SPEED_MULTIPLIER;
        this.slideActive = false;
        this.slideTimer = 0;
        this.slideCooldownTimer = 0;
        this.isSliding = false;
        this.createVisuals(scene);
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.wasd = scene.input.keyboard.addKeys('W,S,A,D');
        this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.shiftKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.isMoving = false;
        this.isFrozen = false;
        this.frozenTimer = 0;
        this.frozenDuration = GAME_CONFIG.KIOSKS.FREEZE_DURATION;
        this.frozenPosition = null;
        this.lastKioskCollisionTime = 0;
        this.kioskCooldown = GAME_CONFIG.KIOSKS.COOLDOWN;
        this.speedDebuffs = [];
        this.speedBuffs = [];
        this.controlDebuffs = [];
        this.lastDirection = 'front';
        this.isFalling = false;
        this.fallTimer = 0;
        this.fallDuration = 1000;
        this.audioManager = null;
        this.currentFreezeSound = null;
    }
    createVisuals(scene) {
        this.setTexture('standing_front');
        const config = spriteManager.PLAYER_SPRITE;
        const size = config.radius * 2;
        this.setDisplaySize(size, size);
        this.setDepth(10);
        this.createAnimations(scene);
    }
    isOnPuddle() {
        return this.controlDebuffs.length > 0;
    }
    createAnimations(scene) {
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
    }
    setAudioManager(audioManager) {
        this.audioManager = audioManager;
    }
    update(time, delta) {
        this.updateTimers(delta);
        this.updateStamina(delta);
        this.handleMovement(delta);
        this.updateSounds();
        this.updateVisuals();
    }
    updateSounds() {
        if (!this.audioManager) {
            return;
        }
        const shouldPlayRunning = this.isMoving &&
                                  !this.isFalling &&
                                  !this.isFrozen &&
                                  !this.isSliding;
        const isRunningPlaying = this.audioManager.isSoundPlaying('running');
        if (shouldPlayRunning && !isRunningPlaying) {
            this.audioManager.playSound('running', true);
        } else if (!shouldPlayRunning && isRunningPlaying) {
            this.audioManager.stopSound('running');
        }
        if (isRunningPlaying) {
            const runningSound = this.audioManager.getSound('running');
            if (runningSound) {
                const speedRatio = this.currentSpeed / this.baseSpeed;
                const rate = Phaser.Math.Clamp(speedRatio, 0.7, 1.5);
                runningSound.setRate(rate);
            }
        }
    }
    updateTimers(delta) {
        if (this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= delta;
        }
        if (this.dashActive) {
            this.dashTimer -= delta;
            if (this.dashTimer <= 0) {
                this.dashActive = false;
            }
        }
        if (this.slideCooldownTimer > 0) {
            this.slideCooldownTimer -= delta;
        }
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
        if (this.exhausted) {
            this.exhaustedTimer -= delta;
            if (this.exhaustedTimer <= 0) {
                this.exhausted = false;
                this.speedMultiplier = 1.0;
                this.stamina = 15;
            }
        }
        if (this.isFrozen) {
            this.frozenTimer -= delta;
            if (this.frozenTimer <= 0) {
                this.isFrozen = false;
                this.frozenPosition = null;
                if (this.currentFreezeSound && this.audioManager) {
                    this.audioManager.stopSound(this.currentFreezeSound);
                    this.currentFreezeSound = null;
                }
            }
        }
        if (this.isFalling) {
            this.fallTimer -= delta;
            if (this.fallTimer <= 0) {
                this.isFalling = false;
                this.fallTimer = 0;
            }
        }
        this.updateSpeedDebuffs(delta);
        this.updateControlDebuffs(delta);
        this.updateSpeedBuffs(delta);
    }
    updateSpeedDebuffs(delta) {
        for (let i = this.speedDebuffs.length - 1; i >= 0; i--) {
            const debuff = this.speedDebuffs[i];
            debuff.duration -= delta;
            if (debuff.duration <= 0) {
                this.speedDebuffs.splice(i, 1);
            }
        }
    }
    updateSpeedBuffs(delta) {
        for (let i = this.speedBuffs.length - 1; i >= 0; i--) {
            const buff = this.speedBuffs[i];
            buff.duration -= delta;
            if (buff.duration <= 0) {
                this.speedBuffs.splice(i, 1);
            }
        }
    }
    calculateSpeedMultiplier() {
        if (this.exhausted) {
            return this.exhaustedSpeedMultiplier;
        }
        let baseMultiplier = 1.0;
        if (this.speedDebuffs.length > 0) {
            let minDebuff = 1.0;
            for (const debuff of this.speedDebuffs) {
                minDebuff = Math.min(minDebuff, debuff.multiplier);
            }
            baseMultiplier *= minDebuff;
        }
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
        for (let i = this.controlDebuffs.length - 1; i >= 0; i--) {
            const debuff = this.controlDebuffs[i];
            debuff.duration -= delta;
            if (debuff.duration <= 0) {
                this.controlDebuffs.splice(i, 1);
            }
        }
    }
    getControlMultiplier() {
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
        if (this.isFrozen) {
            return;
        }
        const dt = delta / 1000;
        if (this.isMoving && !this.exhausted) {
            this.stamina -= this.staminaDrainPerSec * dt;
            if (this.stamina <= 0) {
                this.stamina = 0;
                this.triggerExhausted();
            }
        } else {
            let regenRate = this.staminaRegenPerSec;
            if (!this.isMoving) {
                regenRate *= this.staminaRegenMultiplier;
            }
            this.stamina += regenRate * dt;
            if (this.stamina > this.staminaMax) {
                this.stamina = this.staminaMax;
            }
        }
    }
    triggerExhausted() {
        if (this.exhausted) return;
        this.exhausted = true;
        this.exhaustedTimer = this.exhaustedSlowDuration;
        this.speedMultiplier = this.exhaustedSpeedMultiplier;
        this.stamina = 0;
    }
    handleMovement(delta) {
        if (this.isFrozen) {
            this.setVelocity(0, 0);
            this.isMoving = false;
            return;
        }
        let moveX = 0;
        let moveY = 0;
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
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.707;
            moveY *= 0.707;
        }
        if (moveX !== 0 || moveY !== 0) {
            if (moveY < 0) {
                this.lastDirection = 'rear';
            } else if (moveY > 0) {
                this.lastDirection = 'front';
            } else if (moveX < 0) {
                this.lastDirection = 'left';
            } else if (moveX > 0) {
                this.lastDirection = 'right';
            }
        }
        this.isMoving = (moveX !== 0 || moveY !== 0);
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.canDash()) {
            this.performDash(moveX, moveY);
        }
        if (Phaser.Input.Keyboard.JustDown(this.shiftKey) && this.canSlide()) {
            this.performSlide(moveX, moveY);
        }
        this.speedMultiplier = this.calculateSpeedMultiplier();
        let currentSpeedMultiplier = this.speedMultiplier;
        if (this.dashActive) {
            currentSpeedMultiplier *= this.dashSpeedMultiplier;
        } else if (this.slideActive) {
            currentSpeedMultiplier *= this.slideSpeedMultiplier;
        }
        this.currentSpeed = this.baseSpeed * currentSpeedMultiplier;
        const controlMultiplier = this.getControlMultiplier();
        if (this.dashActive) {
            this.setVelocity(
                this.dashDirection.x * this.currentSpeed,
                this.dashDirection.y * this.currentSpeed
            );
        } else if (this.slideActive) {
            this.setVelocity(
                moveX * this.currentSpeed * controlMultiplier,
                moveY * this.currentSpeed * controlMultiplier
            );
        } else {
            this.setVelocity(
                moveX * this.currentSpeed * controlMultiplier,
                moveY * this.currentSpeed * controlMultiplier
            );
        }
    }
    freeze(duration = 2000, freezeSound = null) {
        if (this.isFrozen) return;
        this.isFrozen = true;
        this.frozenTimer = duration;
        this.frozenPosition = { x: this.x, y: this.y };
        this.setVelocity(0, 0);
        if (freezeSound && this.audioManager) {
            this.audioManager.playSound(freezeSound, true);
            this.currentFreezeSound = freezeSound;
        } else {
            this.currentFreezeSound = null;
        }
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
        if (directionX === 0 && directionY === 0) return;
        const length = Math.sqrt(directionX * directionX + directionY * directionY);
        this.dashDirection.x = directionX / length;
        this.dashDirection.y = directionY / length;
        this.dashActive = true;
        this.dashTimer = this.dashDuration;
        this.dashCooldownTimer = this.dashCooldown;
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
        if (directionX === 0 && directionY === 0) return;
        this.slideActive = true;
        this.slideTimer = this.slideDuration;
        this.slideCooldownTimer = this.slideCooldown;
        this.isSliding = true;
    }
    updateVisuals() {
        if (this.isFalling) {
            this.anims.stop();
            const fallFirstFrameDuration = 200;
            const timeSinceFall = this.fallDuration - this.fallTimer;
            if (timeSinceFall < fallFirstFrameDuration) {
                if (this.texture.key !== 'fall_1') {
                    this.setTexture('fall_1');
                }
            } else {
                if (this.texture.key !== 'fall_2') {
                    this.setTexture('fall_2');
                }
            }
            return;
        }
        if (this.isOnPuddle() && this.isMoving) {
            if (this.texture.key !== 'sliding') {
                this.setTexture('sliding');
                this.anims.stop();
            }
            return;
        }
        if (this.isSliding || this.slideActive) {
            if (this.texture.key !== 'sliding') {
                this.setTexture('sliding');
                this.anims.stop();
            }
            return;
        }
        if (this.isMoving && !this.isFrozen) {
            const animKey = `run_${this.lastDirection}`;
            if (!this.anims.isPlaying || this.anims.currentAnim.key !== animKey) {
                this.anims.play(animKey, true);
            }
        } else {
            const standingKey = `standing_${this.lastDirection}`;
            if (this.texture.key !== standingKey) {
                this.setTexture(standingKey);
                this.anims.stop();
            }
        }
        let tint = 0xffffff;
        if (this.isFrozen) {
            tint = 0x9b59b6;
        } else if (this.exhausted) {
            tint = 0xe74c3c;
        } else if (this.dashActive) {
            tint = 0xf39c12;
        }
        this.setTint(tint);
    }
    triggerFall() {
        if (this.isFalling) return;
        this.isFalling = true;
        this.fallTimer = this.fallDuration;
        this.setVelocity(0, 0);
        if (this.currentFreezeSound && this.audioManager) {
            this.audioManager.stopSound(this.currentFreezeSound);
            this.currentFreezeSound = null;
        }
    }
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
        this.stamina = this.staminaMax;
        if (this.exhausted) {
            this.exhausted = false;
            this.exhaustedTimer = 0;
            this.speedMultiplier = 1.0;
        }
    }
    applySpeedDebuff(multiplier, duration) {
        this.speedDebuffs.push({
            multiplier: multiplier,
            duration: duration
        });
    }
    applyControlDebuff(multiplier, duration) {
        this.controlDebuffs.push({
            multiplier: multiplier,
            duration: duration
        });
    }
    addSpeedBuff(multiplier, duration) {
        this.speedBuffs.push({
            multiplier: multiplier,
            duration: duration
        });
    }
    destroy() {
        super.destroy();
    }
}
export default Player;