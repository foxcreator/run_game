import { GAME_CONFIG } from '../config/gameConfig.js';
import spriteManager from '../utils/SpriteManager.js';
const CHASER_STATES = {
    IDLE: 'IDLE',
    CHASE: 'CHASE',
    ATTACK: 'ATTACK'
};
class Chaser extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type) {
        super(scene, x, y, null);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.type = type;
        this.active = true;
        this.setCollideWorldBounds(true);
        this.setDrag(GAME_CONFIG.CHASERS.COMMON.DRAG);
        this.createVisuals(scene);
        if (this.body) {
            let bodySize;
            if (this.type === 'Blocker') {
                bodySize = GAME_CONFIG.CHASERS.BLOCKER.BODY_SIZE || GAME_CONFIG.CHASERS.BLOCKER.DISPLAY_SIZE;
            } else if (this.type === 'Sticker') {
                bodySize = GAME_CONFIG.CHASERS.STICKER.BODY_SIZE || GAME_CONFIG.CHASERS.STICKER.DISPLAY_SIZE;
            } else {
                bodySize = 24;
            }
            this.body.setSize(bodySize, bodySize);
            this.setOrigin(0.5, 0.5);
        }
        this.speed = 200;
        this.target = null;
        this.navigationSystem = null;
        this.state = CHASER_STATES.IDLE;
        this.currentPath = null;
        this.pathIndex = 0;
        this.currentWaypoint = null;
        this.lastPathRecalculation = 0;
        this.pathRecalculationInterval = 400;
        this.lastPlayerTile = null;
        this.lastPosition = { x: this.x, y: this.y };
        this.stuckTimer = 0;
        this.stuckThreshold = 500;
        this.stuckDistanceThreshold = 8;
        this.isFrozen = false;
        this.frozenTimer = 0;
        this.speedDebuffs = [];
        this.lostLock = false;
        this.lostLockTimer = 0;
        this.lastKnownPlayerPos = null;
        this.separationForce = { x: 0, y: 0 };
        this.separationRadius = 40;
        this.separationStrength = 0.3;
        this.lastDirection = 'front';
        this.isMovingChaser = false;
        this.audioManager = null;
        this.soundId = `enemy_${Date.now()}_${Math.random()}`;
        this.soundPlaybackRate = 0.95 + Math.random() * 0.1;

        // Hospital Mechanic - лічильник ударів машин
        this.timesHitByCar = 0;
        this.isHospitalized = false;
        this.carHitCooldown = 0;  // Cooldown між ударами машин (щоб не рахувати один удар багато разів)
    }
    setNavigationSystem(navigationSystem) {
        this.navigationSystem = navigationSystem;
    }
    setPathfindingSystem(pathfindingSystem) {
    }
    createVisuals(scene) {
        if (this.type === 'Blocker') {
            if (scene.textures.exists('blocker_standing_front')) {
                this.setTexture('blocker_standing_front');
                const size = GAME_CONFIG.CHASERS.BLOCKER.DISPLAY_SIZE;
                this.setDisplaySize(size, size);
                this.setDepth(GAME_CONFIG.CHASERS.COMMON.DEPTH);
                this.createAnimations(scene);
            } else {
                const textureKey = spriteManager.createChaserSprite(scene, this.type);
                this.setTexture(textureKey);
                const config = spriteManager.CHASER_SPRITES.BLOCKER;
                const size = config.radius * 2;
                this.setDisplaySize(size, size);
                this.setDepth(GAME_CONFIG.CHASERS.COMMON.DEPTH);
            }
        } else if (this.type === 'Sticker') {
            if (scene.textures.exists('sticker_standing_front')) {
                this.setTexture('sticker_standing_front');
                const size = GAME_CONFIG.CHASERS.STICKER.DISPLAY_SIZE;
                this.setDisplaySize(size, size);
                this.setDepth(GAME_CONFIG.CHASERS.COMMON.DEPTH);
                this.createAnimations(scene);
            } else {
                const textureKey = spriteManager.createChaserSprite(scene, this.type);
                this.setTexture(textureKey);
                const config = spriteManager.CHASER_SPRITES.STICKER;
                const size = config.radius * 2;
                this.setDisplaySize(size, size);
                this.setDepth(GAME_CONFIG.CHASERS.COMMON.DEPTH);
            }
        } else {
            const textureKey = spriteManager.createChaserSprite(scene, this.type);
            this.setTexture(textureKey);
            const config = spriteManager.CHASER_SPRITES.STICKER;
            const size = config.radius * 2;
            this.setDisplaySize(size, size);
            this.setDepth(GAME_CONFIG.CHASERS.COMMON.DEPTH);
        }
    }
    createAnimations(scene) {
        if (this.type === 'Blocker') {
            if (scene.anims.exists('blocker_run_front')) return;
            scene.anims.create({
                key: 'blocker_run_front',
                frames: [
                    { key: 'blocker_front_1' },
                    { key: 'blocker_front_2' },
                    { key: 'blocker_front_3' },
                    { key: 'blocker_front_4' }
                ],
                frameRate: 10,
                repeat: -1
            });
            scene.anims.create({
                key: 'blocker_run_rear',
                frames: [
                    { key: 'blocker_rear_1' },
                    { key: 'blocker_rear_2' },
                    { key: 'blocker_rear_3' },
                    { key: 'blocker_rear_4' }
                ],
                frameRate: 10,
                repeat: -1
            });
            scene.anims.create({
                key: 'blocker_run_left',
                frames: [
                    { key: 'blocker_left_1' },
                    { key: 'blocker_left_2' },
                    { key: 'blocker_left_3' },
                    { key: 'blocker_left_4' }
                ],
                frameRate: 10,
                repeat: -1
            });
            scene.anims.create({
                key: 'blocker_run_right',
                frames: [
                    { key: 'blocker_right_1' },
                    { key: 'blocker_right_2' },
                    { key: 'blocker_right_3' },
                    { key: 'blocker_right_4' }
                ],
                frameRate: 10,
                repeat: -1
            });
        } else if (this.type === 'Sticker') {
            if (scene.anims.exists('sticker_run_front')) return;
            scene.anims.create({
                key: 'sticker_run_front',
                frames: [
                    { key: 'sticker_front_1' },
                    { key: 'sticker_front_2' },
                    { key: 'sticker_front_3' },
                    { key: 'sticker_front_4' }
                ],
                frameRate: 10,
                repeat: -1
            });
            scene.anims.create({
                key: 'sticker_run_rear',
                frames: [
                    { key: 'sticker_rear_1' },
                    { key: 'sticker_rear_2' },
                    { key: 'sticker_rear_3' },
                    { key: 'sticker_rear_4' }
                ],
                frameRate: 10,
                repeat: -1
            });
            scene.anims.create({
                key: 'sticker_run_left',
                frames: [
                    { key: 'sticker_left_1' },
                    { key: 'sticker_left_2' },
                    { key: 'sticker_left_3' },
                    { key: 'sticker_left_4' }
                ],
                frameRate: 10,
                repeat: -1
            });
            scene.anims.create({
                key: 'sticker_run_right',
                frames: [
                    { key: 'sticker_right_1' },
                    { key: 'sticker_right_2' },
                    { key: 'sticker_right_3' },
                    { key: 'sticker_right_4' }
                ],
                frameRate: 10,
                repeat: -1
            });
        }
    }
    setTarget(player) {
        this.target = player;
    }
    setFrozen(duration) {
        this.isFrozen = true;
        this.frozenTimer = duration;
        if (this.body) {
            this.body.setVelocity(0, 0);
        }
    }

    /**
     * Викликається коли ворога збила машина (Hospital Mechanic)
     */
    triggerFall() {
        if (this.isHospitalized) return;

        // Перевіряємо cooldown щоб не рахувати один удар багато разів
        if (this.carHitCooldown > 0) {
            return;
        }

        this.timesHitByCar++;
        this.carHitCooldown = GAME_CONFIG.HOSPITAL.HIT_COOLDOWN;


        // Перевіряємо чи досягли ліміту
        if (this.timesHitByCar >= GAME_CONFIG.HOSPITAL.HITS_TO_HOSPITALIZE) {
            this.hospitalize();
        }
    }

    /**
     * Госпіталізує ворога (видаляє з гри)
     */
    hospitalize() {
        if (this.isHospitalized) return;

        this.isHospitalized = true;


        // Викликаємо подію для GameScene
        this.scene.events.emit('enemy-hospitalized', this);

        // Зупиняємо звуки
        if (this.audioManager && this.soundId) {
            this.audioManager.stopSound(this.soundId);
        }

        // Анімація зникнення (fade out)
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
    setLureTarget(x, y, duration) {
        this.lureTarget = { x, y };
        this.lureTimer = duration;
        this.isLured = true;
    }

    playFallAnimation() {
        if (this.isHospitalized) return;
        // Simple tween for falling/spinning
        this.scene.tweens.add({
            targets: this,
            angle: 360,
            scale: 0.8,
            duration: 500,
            yoyo: true,
            onComplete: () => {
                this.angle = 0;
                this.scale = 1; // Reset or keep? Resetting for now.
                if (this.type === 'Blocker') this.setDisplaySize(GAME_CONFIG.CHASERS.BLOCKER.DISPLAY_SIZE, GAME_CONFIG.CHASERS.BLOCKER.DISPLAY_SIZE);
                else if (this.type === 'Sticker') this.setDisplaySize(GAME_CONFIG.CHASERS.STICKER.DISPLAY_SIZE, GAME_CONFIG.CHASERS.STICKER.DISPLAY_SIZE);
            }
        });
    }

    playCoughAnimation() {
        // Just a shake or tint for now
        this.scene.tweens.add({
            targets: this,
            x: '+=5',
            duration: 50,
            yoyo: true,
            repeat: 5
        });
    }

    playEatAnimation() {
        // Stop moving and "eat"
        if (this.body) this.body.setVelocity(0, 0);
    }

    update(delta, time = 0) {
        if (!this.active) return;

        // Hospital mechanic
        if (this.carHitCooldown > 0) {
            this.carHitCooldown -= delta;
            if (this.carHitCooldown < 0) this.carHitCooldown = 0;
        }

        if (this.isFrozen) {
            this.frozenTimer -= delta;
            if (this.frozenTimer <= 0) {
                this.isFrozen = false;
                this.frozenTimer = 0;
            } else {
                if (this.body) this.body.setVelocity(0, 0);
                return;
            }
        }

        // Lure Update
        if (this.isLured) {
            this.lureTimer -= delta;
            if (this.lureTimer <= 0) {
                this.isLured = false;
                this.lureTarget = null;
            } else {
                // Move towards lure
                if (this.lureTarget) {
                    const dx = this.lureTarget.x - this.x;
                    const dy = this.lureTarget.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > 20) {
                        const speed = this.speed * this.getSpeedMultiplier();
                        this.scene.physics.moveTo(this, this.lureTarget.x, this.lureTarget.y, speed);
                    } else {
                        // Eating
                        if (this.body) this.body.setVelocity(0, 0);
                    }
                    this.updateVisuals();
                    return; // Skip normal movement
                }
            }
        }

        // Immunity check logic
        // We need to know if player is immune. Chaser doesn't know about BonusManager directly.
        // But we can check a flag on player if we want, or GameScene can skip update? 
        // Better: Chaser checks target. But if "Deputy" is active, player is ignored.
        // We can check `this.scene.bonusManager.isImmune()` if available.
        if (this.scene.bonusManager && this.scene.bonusManager.isImmune()) {
            // Idle behavior
            if (this.body) this.body.setVelocity(0, 0);
            this.updateVisuals();
            return;
        }

        this.updateSpeedDebuffs(delta);
        this.updateLostLock(delta);
        if (!this.target) return;
        this.updateState(delta, time);
        this.moveTowardsTarget(delta, time);
        this.updateVisuals();
    }
    updateState(delta, time) {
        if (!this.target) {
            this.state = CHASER_STATES.IDLE;
            return;
        }
        const distanceToTarget = Phaser.Math.Distance.Between(
            this.x, this.y,
            this.target.x, this.target.y
        );
        const attackDistance = 50;
        const detectDistance = 1000;
        switch (this.state) {
            case CHASER_STATES.IDLE:
                if (distanceToTarget <= detectDistance) {
                    this.state = CHASER_STATES.CHASE;
                }
                break;
            case CHASER_STATES.CHASE:
                if (distanceToTarget <= attackDistance) {
                    this.state = CHASER_STATES.ATTACK;
                } else if (distanceToTarget > detectDistance * 1.5) {
                    this.state = CHASER_STATES.IDLE;
                }
                break;
            case CHASER_STATES.ATTACK:
                if (distanceToTarget > attackDistance * 1.5) {
                    this.state = CHASER_STATES.CHASE;
                }
                break;
        }
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
    updateLostLock(delta) {
        if (this.lostLockTimer > 0) {
            this.lostLockTimer -= delta;
            if (this.lostLockTimer <= 0) {
                this.lostLock = false;
                this.lostLockTimer = 0;
                this.lastKnownPlayerPos = null;
            }
        }
    }
    applySpeedDebuff(multiplier, duration) {
        this.speedDebuffs.push({
            multiplier: multiplier,
            duration: duration
        });
    }
    loseLock(playerX, playerY, duration) {
        this.lostLock = true;
        this.lostLockTimer = duration;
        this.lastKnownPlayerPos = { x: playerX, y: playerY };
    }
    getSpeedMultiplier() {
        if (this.speedDebuffs.length === 0) {
            return 1.0;
        }
        let minMultiplier = 1.0;
        for (const debuff of this.speedDebuffs) {
            minMultiplier = Math.min(minMultiplier, debuff.multiplier);
        }
        return minMultiplier;
    }
    applySlowdown(multiplier, duration) {
        // Check if we already have a slowdown of this strength
        const existing = this.speedDebuffs.find(d => Math.abs(d.multiplier - multiplier) < 0.01);
        if (existing) {
            if (existing.duration < duration) {
                existing.duration = duration;
            }
        } else {
            this.speedDebuffs.push({
                multiplier: multiplier,
                duration: duration
            });
        }
    }

    checkDirectPathToTarget() {
        if (!this.target || !this.navigationSystem) {
            return false;
        }
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 16) {
            return true;
        }
        const stepSize = 16;
        const steps = Math.ceil(distance / stepSize);
        const numChecks = Math.max(5, Math.min(steps, 20));
        for (let i = 1; i <= numChecks; i++) {
            const t = i / numChecks;
            const checkX = this.x + dx * t;
            const checkY = this.y + dy * t;
            const tile = this.navigationSystem.worldToTile(checkX, checkY);
            const checkTiles = [
                { x: tile.x, y: tile.y },
                { x: tile.x + 1, y: tile.y },
                { x: tile.x - 1, y: tile.y },
                { x: tile.x, y: tile.y + 1 },
                { x: tile.x, y: tile.y - 1 }
            ];
            let hasObstacle = false;
            for (const checkTile of checkTiles) {
                if (!this.navigationSystem.isWalkable(checkTile.x, checkTile.y)) {
                    hasObstacle = true;
                    break;
                }
            }
            if (hasObstacle) {
                return false;
            }
        }
        return true;
    }
    updateAntiStuck(delta) {
        if (!this.body) return;
        const distanceMoved = Phaser.Math.Distance.Between(
            this.lastPosition.x, this.lastPosition.y,
            this.x, this.y
        );
        const velocity = Math.sqrt(
            this.body.velocity.x * this.body.velocity.x +
            this.body.velocity.y * this.body.velocity.y
        );
        const isMoving = velocity > 10;
        const hasMoved = distanceMoved >= this.stuckDistanceThreshold;
        if (isMoving && !hasMoved) {
            this.stuckTimer += delta;
            if (this.stuckTimer >= this.stuckThreshold) {
                this.invalidatePath();
                this.stuckTimer = 0;
                if (this.body) {
                    this.body.setVelocity(0, 0);
                }
            }
        } else {
            this.stuckTimer = 0;
        }
        this.lastPosition.x = this.x;
        this.lastPosition.y = this.y;
    }
    invalidatePath() {
        this.currentPath = null;
        this.pathIndex = 0;
        this.currentWaypoint = null;
    }
    shouldRecalculatePath(time) {
        if (!this.target || !this.navigationSystem) {
            return false;
        }
        const currentPlayerTile = this.navigationSystem.worldToTile(
            this.target.x,
            this.target.y
        );
        if (!this.lastPlayerTile ||
            currentPlayerTile.x !== this.lastPlayerTile.x ||
            currentPlayerTile.y !== this.lastPlayerTile.y) {
            this.lastPlayerTile = currentPlayerTile;
            return true;
        }
        if (time - this.lastPathRecalculation >= this.pathRecalculationInterval) {
            return true;
        }
        if (!this.currentPath || this.currentPath.length === 0) {
            return true;
        }
        return false;
    }
    calculatePath(time) {
        if (!this.target || !this.navigationSystem) {
            this.currentPath = null;
            return;
        }
        const fromTile = this.navigationSystem.worldToTile(this.x, this.y);
        const toTile = this.navigationSystem.worldToTile(this.target.x, this.target.y);
        const path = this.navigationSystem.findPath(
            fromTile.x, fromTile.y,
            toTile.x, toTile.y
        );
        if (path && path.length > 0) {
            this.currentPath = path;
            this.pathIndex = 0;
            this.updateCurrentWaypoint();
            this.lastPathRecalculation = time;
        } else {
            this.currentPath = null;
            this.pathIndex = 0;
            this.currentWaypoint = null;
        }
    }
    updateCurrentWaypoint() {
        if (!this.currentPath || this.currentPath.length === 0) {
            this.currentWaypoint = null;
            return;
        }
        while (this.pathIndex < this.currentPath.length) {
            const waypointTile = this.currentPath[this.pathIndex];
            const waypointWorld = this.navigationSystem.tileToWorld(
                waypointTile.x,
                waypointTile.y
            );
            const distanceToWaypoint = Phaser.Math.Distance.Between(
                this.x, this.y,
                waypointWorld.x, waypointWorld.y
            );
            if (distanceToWaypoint < this.navigationSystem.tileSize / 2) {
                this.pathIndex++;
            } else {
                this.currentWaypoint = waypointWorld;
                break;
            }
        }
        if (this.pathIndex >= this.currentPath.length) {
            this.currentWaypoint = null;
        }
    }
    calculateSeparationForce(otherChasers) {
        this.separationForce.x = 0;
        this.separationForce.y = 0;
        if (!otherChasers || otherChasers.length === 0) {
            return;
        }
        let separationCount = 0;
        for (const other of otherChasers) {
            if (!other || !other.active || other === this) {
                continue;
            }
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0 && distance < this.separationRadius) {
                const normalizedX = dx / distance;
                const normalizedY = dy / distance;
                const strength = this.separationStrength * (1 - distance / this.separationRadius);
                this.separationForce.x += normalizedX * strength;
                this.separationForce.y += normalizedY * strength;
                separationCount++;
            }
        }
        if (separationCount > 0) {
            const separationMag = Math.sqrt(
                this.separationForce.x * this.separationForce.x +
                this.separationForce.y * this.separationForce.y
            );
            if (separationMag > 0) {
                this.separationForce.x = (this.separationForce.x / separationMag) * this.separationStrength;
                this.separationForce.y = (this.separationForce.y / separationMag) * this.separationStrength;
            }
        }
    }
    moveToWaypoint(delta) {
        if (!this.currentWaypoint) {
            if (this.body) {
                this.body.setVelocity(0, 0);
            }
            return;
        }
        const dx = this.currentWaypoint.x - this.x;
        const dy = this.currentWaypoint.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
            const speedMultiplier = this.getSpeedMultiplier();
            let velocityX = (dx / distance) * this.speed * speedMultiplier;
            let velocityY = (dy / distance) * this.speed * speedMultiplier;
            velocityX += velocityX * this.separationForce.x;
            velocityY += velocityY * this.separationForce.y;
            this.setVelocity(velocityX, velocityY);
        } else {
            if (this.body) {
                this.body.setVelocity(0, 0);
            }
        }
    }
    moveTowardsTarget(delta, time = 0) {
        if (this.lostLock && this.lastKnownPlayerPos) {
            const dx = this.lastKnownPlayerPos.x - this.x;
            const dy = this.lastKnownPlayerPos.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
                const speedMultiplier = this.getSpeedMultiplier();
                const velocityX = (dx / distance) * this.speed * speedMultiplier;
                const velocityY = (dy / distance) * this.speed * speedMultiplier;
                this.setVelocity(velocityX, velocityY);
            }
            return;
        }
        this.updateAntiStuck(delta);
        if (this.state === CHASER_STATES.IDLE) {
            if (this.body) {
                this.body.setVelocity(0, 0);
            }
            return;
        }
        if (this.state === CHASER_STATES.ATTACK) {
            const hasDirectPath = this.checkDirectPathToTarget();
            if (hasDirectPath) {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 0) {
                    const speedMultiplier = this.getSpeedMultiplier();
                    let velocityX = (dx / distance) * this.speed * speedMultiplier;
                    let velocityY = (dy / distance) * this.speed * speedMultiplier;
                    velocityX += velocityX * this.separationForce.x;
                    velocityY += velocityY * this.separationForce.y;
                    this.setVelocity(velocityX, velocityY);
                }
            } else {
                if (!this.currentPath || this.shouldRecalculatePath(time)) {
                    this.calculatePath(time);
                }
                if (!this.currentPath || this.currentPath.length === 0) {
                    this.calculatePath(time);
                }
                this.updateCurrentWaypoint();
                if (this.currentWaypoint) {
                    this.moveToWaypoint(delta);
                } else {
                    if (this.body) {
                        this.body.setVelocity(0, 0);
                    }
                }
            }
            return;
        }
        if (this.state === CHASER_STATES.CHASE) {
            if (this.shouldRecalculatePath(time)) {
                this.calculatePath(time);
            }
            if (!this.currentPath || this.currentPath.length === 0) {
                this.calculatePath(time);
            }
            this.updateCurrentWaypoint();
            if (this.currentWaypoint) {
                this.moveToWaypoint(delta);
            } else {
                const hasDirectPath = this.checkDirectPathToTarget();
                if (hasDirectPath) {
                    const dx = this.target.x - this.x;
                    const dy = this.target.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > 0) {
                        const speedMultiplier = this.getSpeedMultiplier();
                        let velocityX = (dx / distance) * this.speed * speedMultiplier;
                        let velocityY = (dy / distance) * this.speed * speedMultiplier;
                        velocityX += velocityX * this.separationForce.x;
                        velocityY += velocityY * this.separationForce.y;
                        this.setVelocity(velocityX, velocityY);
                    }
                } else {
                    if (this.body) {
                        this.body.setVelocity(0, 0);
                    }
                }
            }
        }
        this.updateSounds();
        this.updateVisuals();
    }
    updateSounds() {
        if (!this.audioManager || !this.target) return;
        const currentSpeed = this.body ? Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2) : 0;
        const shouldPlayRunning = currentSpeed > 10 && !this.isFrozen;
        const isRunningPlaying = this.audioManager.isSoundPlaying(this.soundId);
        if (shouldPlayRunning && !isRunningPlaying) {
            const sound = this.audioManager.playSound(this.soundId, true, null, 'running');
            if (sound) {
                sound.setRate(this.soundPlaybackRate);
            }
        } else if (!shouldPlayRunning && isRunningPlaying) {
            this.audioManager.stopSound(this.soundId);
        }
        if (isRunningPlaying) {
            const runningSound = this.audioManager.getSound(this.soundId);
            if (runningSound && this.target) {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const config = GAME_CONFIG.AUDIO.ENEMY_SOUNDS;
                const maxDist = config.MAX_DISTANCE;
                const minDist = config.MIN_DISTANCE;
                const maxVol = config.MAX_VOLUME;
                const minVol = config.MIN_VOLUME;
                let volume;
                if (distance <= minDist) {
                    volume = maxVol;
                } else if (distance >= maxDist) {
                    volume = minVol;
                } else {
                    const ratio = (distance - minDist) / (maxDist - minDist);
                    volume = maxVol - (maxVol - minVol) * ratio;
                }
                const globalVolume = this.audioManager.getSoundsVolume();
                runningSound.setVolume(volume * globalVolume);
            }
        }
    }
    updateVisuals() {
        if (this.type !== 'Blocker' && this.type !== 'Sticker') return;
        const prefix = this.type.toLowerCase();
        if (this.body) {
            const velocity = Math.sqrt(
                this.body.velocity.x * this.body.velocity.x +
                this.body.velocity.y * this.body.velocity.y
            );
            this.isMovingChaser = velocity > 10;
            if (this.isMovingChaser) {
                const velX = this.body.velocity.x;
                const velY = this.body.velocity.y;
                if (Math.abs(velX) > Math.abs(velY)) {
                    this.lastDirection = velX > 0 ? 'right' : 'left';
                } else {
                    this.lastDirection = velY > 0 ? 'front' : 'rear';
                }
            }
        }
        if (this.isMovingChaser && !this.isFrozen) {
            const animKey = `${prefix}_run_${this.lastDirection}`;
            if (!this.anims.isPlaying || this.anims.currentAnim.key !== animKey) {
                this.anims.play(animKey, true);
            }
        } else {
            const standingKey = `${prefix}_standing_${this.lastDirection}`;
            if (this.texture.key !== standingKey) {
                this.setTexture(standingKey);
                this.anims.stop();
            }
        }
        let tint = 0xffffff;
        if (this.isFrozen) {
            tint = 0x9b59b6;
        } else if (this.lostLock) {
            tint = 0x95a5a6;
        }
        this.setTint(tint);
    }
    destroy() {
        if (this.audioManager && this.soundId) {
            this.audioManager.stopSound(this.soundId);
        }
        if (this.body) {
            this.body.destroy();
        }
        super.destroy();
    }
}
export default Chaser;