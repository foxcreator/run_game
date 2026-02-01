import { GAME_CONFIG } from '../config/gameConfig.js';
class Car extends Phaser.GameObjects.Image {
    constructor(scene, x, y, textureKey = null) {
        if (!textureKey) {
            const carTextures = GAME_CONFIG.OBSTACLES.MOVING_BUS.CAR_TEXTURES || [];
            const availableTextures = carTextures.filter(key => scene.textures.exists(key));
            if (availableTextures.length > 0) {
                textureKey = availableTextures[Math.floor(Math.random() * availableTextures.length)];
            }
        }
        if (textureKey && scene.textures.exists(textureKey)) {
            super(scene, x, y, textureKey);
        } else {
            const color = GAME_CONFIG.OBSTACLES.MOVING_BUS.COLOR;
            const width = GAME_CONFIG.OBSTACLES.MOVING_BUS.WIDTH;
            const height = GAME_CONFIG.OBSTACLES.MOVING_BUS.HEIGHT;
            const fallbackKey = 'car_fallback_' + width + '_' + height;
            if (!scene.textures.exists(fallbackKey)) {
                const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
                graphics.fillStyle(color, 1);
                graphics.fillRect(0, 0, width, height);
                graphics.generateTexture(fallbackKey, width, height);
                graphics.destroy();
            }
            super(scene, x, y, fallbackKey);
        }
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.type = 'Car';
        this.body.setImmovable(false);
        this.setOrigin(0.5);
        this.setDepth(0);
        const config = GAME_CONFIG.OBSTACLES.MOVING_BUS;
        let displayWidth = config.DISPLAY_WIDTH;
        let displayHeight = config.DISPLAY_HEIGHT;
        if (displayWidth === null || displayHeight === null) {
            if (textureKey && scene.textures.exists(textureKey)) {
                const texture = scene.textures.get(textureKey);
                displayWidth = displayWidth !== null ? displayWidth : texture.source[0].width;
                displayHeight = displayHeight !== null ? displayHeight : texture.source[0].height;
            } else {
                displayWidth = config.WIDTH;
                displayHeight = config.HEIGHT;
            }
        }
        this.setDisplaySize(displayWidth, displayHeight);
        this.speed = GAME_CONFIG.OBSTACLES.MOVING_BUS.SPEED;
        this.collisionCooldown = 0;
        this.currentDirection = null;
        this.lastPosition = { x: x, y: y };
        this.stuckTimer = 0;
        this.stuckThreshold = 5;
        this.directionChangeCooldown = 0;
        this.textureKey = textureKey;
        this.isAccident = false;
        this.accidentTimer = 0;
        this.accidentCooldown = 0;
        this.accidentDuration = 0;
        if (!this.isOnRoad(x, y) || this.hasCollision(x, y)) {
            const roadPos = this.findNearestRoad(x, y);
            if (roadPos) {
                this.setPosition(roadPos.x, roadPos.y);
            }
        }
        this.determineInitialDirection();
        if (!this.currentDirection) {
            const directions = ['up', 'down', 'left', 'right'];
            this.currentDirection = directions[Math.floor(Math.random() * directions.length)];
        }
        this.updateRotation();
        this.active = true;
        this.engineSound = null;
        this.engineSoundKey = null;
        this.audioManager = scene.audioManager || null;
        this.initEngineSound();
    }
    initEngineSound() {
        if (!this.audioManager || !this.textureKey) return;
        const config = GAME_CONFIG.OBSTACLES.MOVING_BUS;
        let engineSoundKey = config.CAR_ENGINE_SOUNDS[this.textureKey];
        if (!engineSoundKey || !this.scene.cache.audio.exists(engineSoundKey)) {
            const enginePool = config.ENGINE_SOUND_POOL || [];
            const availableEngines = enginePool.filter(key => this.scene.cache.audio.exists(key));
            if (availableEngines.length > 0) {
                engineSoundKey = availableEngines[Math.floor(Math.random() * availableEngines.length)];
            }
        }
        if (!engineSoundKey) return;
        this.engineSoundKey = `engine_car_${this.scene.sys.game.loop.frame}_${Math.random()}`;
        this.engineSound = this.scene.sound.add(engineSoundKey, {
            volume: 0,
            loop: true
        });
        if (this.engineSound) {
            this.engineSound.play();
        }
    }
    updateSounds() {
        if (!this.engineSound || !this.scene.player) return;

        // Mute if paused/game over
        if (this.scene.isPaused || !this.scene.player.active) {
            if (this.engineSound.volume > 0) {
                this.engineSound.setVolume(0);
            }
            return;
        }

        const playerX = this.scene.player.x;
        const playerY = this.scene.player.y;
        const distSq = (this.x - playerX) ** 2 + (this.y - playerY) ** 2;

        const config = GAME_CONFIG.AUDIO.CAR_ENGINE;
        const maxDistSq = config.MAX_DISTANCE * config.MAX_DISTANCE;

        if (distSq > maxDistSq) {
            if (this.engineSound.volume > 0) {
                this.engineSound.setVolume(0);
            }
            return;
        }

        const distance = Math.sqrt(distSq);
        const minDist = config.MIN_DISTANCE;
        const maxVol = config.MAX_VOLUME;
        const minVol = config.MIN_VOLUME;

        let targetVolume = 0;
        if (distance <= minDist) {
            targetVolume = maxVol;
        } else {
            const ratio = (distance - minDist) / (config.MAX_DISTANCE - minDist);
            targetVolume = maxVol - (maxVol - minVol) * ratio;
        }

        const globalVolume = this.audioManager.getSoundsVolume();
        // Adjust volume based on speed
        let playbackRate = config.IDLE_PLAYBACK_RATE;
        if (this.body && this.body.speed > config.SPEED_THRESHOLD) {
            const speedRatio = Math.min(this.body.speed / this.speed, 1);
            playbackRate = config.MOVING_PLAYBACK_RATE_MIN +
                (config.MOVING_PLAYBACK_RATE_MAX - config.MOVING_PLAYBACK_RATE_MIN) * speedRatio;
        }

        this.engineSound.setRate(playbackRate);
        this.engineSound.setVolume(targetVolume * globalVolume);
    }

    reset(x, y, textureKey = null) {
        this.setActive(true);
        this.setVisible(true);
        this.setPosition(x, y);
        this.body.reset(x, y);
        this.body.setImmovable(false);
        this.setDepth(0); // Reset depth just in case

        // Texture logic
        if (!textureKey) {
            const carTextures = GAME_CONFIG.OBSTACLES.MOVING_BUS.CAR_TEXTURES || [];
            const availableTextures = carTextures.filter(key => this.scene.textures.exists(key));
            if (availableTextures.length > 0) {
                textureKey = availableTextures[Math.floor(Math.random() * availableTextures.length)];
            }
        }

        if (textureKey && this.scene.textures.exists(textureKey)) {
            this.setTexture(textureKey);
        } else {
            // Fallback logic handled in constructor usually, but for reset we assume basic texture exists or we stick to current
        }
        this.textureKey = textureKey;

        // Reset properties
        this.collisionCooldown = 0;
        this.currentDirection = null;
        this.lastPosition = { x: x, y: y };
        this.stuckTimer = 0;
        this.directionChangeCooldown = 0;
        this.isAccident = false;
        this.accidentTimer = 0;
        this.accidentCooldown = 0;
        this.accidentDuration = 0;

        // Rotation
        this.determineInitialDirection();
        if (!this.currentDirection) {
            const directions = ['up', 'down', 'left', 'right'];
            this.currentDirection = directions[Math.floor(Math.random() * directions.length)];
        }
        this.updateRotation();

        // Audio
        if (this.engineSound) {
            this.engineSound.stop();
            this.engineSound.destroy();
            this.engineSound = null;
        }
        this.initEngineSound();
    }

    deactivate() {
        this.setActive(false);
        this.setVisible(false);
        if (this.body) {
            this.body.stop();
        }
        if (this.engineSound) {
            this.engineSound.stop();
        }
    }

    isOnRoad(x, y) {
        if (!this.scene || !this.scene.tilemap) return false;
        return this.scene.tilemap.isRoad(x, y);
    }
    hasCollision(x, y) {
        if (!this.scene || !this.scene.tilemap) return false;
        return this.scene.tilemap.hasCollision(x, y);
    }
    hasCarCollision(x, y) {
        if (!this.scene || !this.scene.obstacles) return false;
        if (this.isAccident || this.accidentCooldown > 0) return false;
        const config = GAME_CONFIG.OBSTACLES.MOVING_BUS;
        const minDistance = config.MIN_DISTANCE_BETWEEN_CARS || 60;
        for (const obstacle of this.scene.obstacles) {
            if (!(obstacle instanceof Car)) continue;
            if (obstacle === this) continue;
            if (!obstacle.active) continue;
            if (obstacle.isAccident) continue;
            const distance = Phaser.Math.Distance.Between(x, y, obstacle.x, obstacle.y);
            if (distance < minDistance) {
                return true;
            }
        }
        return false;
    }
    findRightEdgeOfRoad() {
        if (!this.scene || !this.scene.tilemap || !this.currentDirection) {
            return null;
        }
        const searchRadius = 200;
        const step = 16;
        let rightEdgeX = this.x;
        let rightEdgeY = this.y;
        let foundRightEdge = false;
        switch (this.currentDirection) {
            case 'up':
            case 'down':
                let maxX = this.x;
                let minX = this.x;
                for (let offset = 0; offset <= searchRadius; offset += step) {
                    const checkX = this.x + offset;
                    if (this.isOnRoad(checkX, this.y) && !this.hasCollision(checkX, this.y)) {
                        maxX = checkX;
                        foundRightEdge = true;
                    } else {
                        break;
                    }
                }
                for (let offset = 0; offset <= searchRadius; offset += step) {
                    const checkX = this.x - offset;
                    if (this.isOnRoad(checkX, this.y) && !this.hasCollision(checkX, this.y)) {
                        minX = checkX;
                    } else {
                        break;
                    }
                }
                rightEdgeX = maxX;
                return foundRightEdge ? { x: rightEdgeX, y: this.y } : null;
            case 'left':
                let minY = this.y;
                let maxY = this.y;
                for (let offset = 0; offset <= searchRadius; offset += step) {
                    const checkY = this.y - offset;
                    if (this.isOnRoad(this.x, checkY) && !this.hasCollision(this.x, checkY)) {
                        minY = checkY;
                        foundRightEdge = true;
                    } else {
                        break;
                    }
                }
                for (let offset = 0; offset <= searchRadius; offset += step) {
                    const checkY = this.y + offset;
                    if (this.isOnRoad(this.x, checkY) && !this.hasCollision(this.x, checkY)) {
                        maxY = checkY;
                    } else {
                        break;
                    }
                }
                rightEdgeY = minY;
                return foundRightEdge ? { x: this.x, y: rightEdgeY } : null;
            case 'right':
                let maxYRight = this.y;
                let minYRight = this.y;
                for (let offset = 0; offset <= searchRadius; offset += step) {
                    const checkY = this.y + offset;
                    if (this.isOnRoad(this.x, checkY) && !this.hasCollision(this.x, checkY)) {
                        maxYRight = checkY;
                        foundRightEdge = true;
                    } else {
                        break;
                    }
                }
                for (let offset = 0; offset <= searchRadius; offset += step) {
                    const checkY = this.y - offset;
                    if (this.isOnRoad(this.x, checkY) && !this.hasCollision(this.x, checkY)) {
                        minYRight = checkY;
                    } else {
                        break;
                    }
                }
                rightEdgeY = maxYRight;
                return foundRightEdge ? { x: this.x, y: rightEdgeY } : null;
        }
        return null;
    }
    getKeepRightCorrection() {
        if (!this.scene || !this.scene.tilemap || !this.currentDirection) {
            return { x: 0, y: 0 };
        }
        const config = GAME_CONFIG.OBSTACLES.MOVING_BUS;
        const keepRightStrength = config.KEEP_RIGHT_STRENGTH || 0.15;
        const keepRightDistance = config.KEEP_RIGHT_DISTANCE || 64;
        if (keepRightStrength === 0) {
            return { x: 0, y: 0 };
        }
        const rightEdge = this.findRightEdgeOfRoad();
        if (!rightEdge) {
            return { x: 0, y: 0 };
        }
        const distanceToRightEdge = Phaser.Math.Distance.Between(
            this.x, this.y,
            rightEdge.x, rightEdge.y
        );
        const tolerance = 10;
        if (Math.abs(distanceToRightEdge - keepRightDistance) < tolerance) {
            return { x: 0, y: 0 };
        }
        let targetX = this.x;
        let targetY = this.y;
        switch (this.currentDirection) {
            case 'up':
            case 'down':
                targetX = rightEdge.x - keepRightDistance;
                targetY = this.y;
                break;
            case 'left':
                targetX = this.x;
                targetY = rightEdge.y + keepRightDistance;
                break;
            case 'right':
                targetX = this.x;
                targetY = rightEdge.y - keepRightDistance;
                break;
        }
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < tolerance) {
            return { x: 0, y: 0 };
        }
        const normalizedX = dx / distance;
        const normalizedY = dy / distance;
        const correctionSpeed = this.speed * keepRightStrength;
        const correctionX = normalizedX * correctionSpeed;
        const correctionY = normalizedY * correctionSpeed;
        const checkX = this.x + correctionX * 0.1;
        const checkY = this.y + correctionY * 0.1;
        if (this.isOnRoad(checkX, checkY) && !this.hasCollision(checkX, checkY)) {
            return { x: correctionX, y: correctionY };
        }
        return { x: 0, y: 0 };
    }
    getCarAhead() {
        if (!this.scene || !this.scene.obstacles || !this.currentDirection) return null;
        if (this.isAccident || this.accidentCooldown > 0) return null;
        const config = GAME_CONFIG.OBSTACLES.MOVING_BUS;
        const minDistance = config.MIN_DISTANCE_BETWEEN_CARS || 60;
        let checkX = this.x;
        let checkY = this.y;
        const checkDistance = minDistance + 20;
        switch (this.currentDirection) {
            case 'up':
                checkY -= checkDistance;
                break;
            case 'down':
                checkY += checkDistance;
                break;
            case 'left':
                checkX -= checkDistance;
                break;
            case 'right':
                checkX += checkDistance;
                break;
            default:
                return null;
        }
        let closestCar = null;
        let closestDistance = Infinity;
        for (const obstacle of this.scene.obstacles) {
            if (!(obstacle instanceof Car)) continue;
            if (obstacle === this) continue;
            if (!obstacle.active) continue;
            if (obstacle.isAccident) continue;
            const dx = obstacle.x - this.x;
            const dy = obstacle.y - this.y;
            const distance = Phaser.Math.Distance.Between(this.x, this.y, obstacle.x, obstacle.y);
            let isAhead = false;
            switch (this.currentDirection) {
                case 'up':
                    isAhead = dy < 0 && Math.abs(dx) < minDistance / 2;
                    break;
                case 'down':
                    isAhead = dy > 0 && Math.abs(dx) < minDistance / 2;
                    break;
                case 'left':
                    isAhead = dx < 0 && Math.abs(dy) < minDistance / 2;
                    break;
                case 'right':
                    isAhead = dx > 0 && Math.abs(dy) < minDistance / 2;
                    break;
            }
            if (isAhead && distance < minDistance && distance < closestDistance) {
                closestCar = obstacle;
                closestDistance = distance;
            }
        }
        return closestCar;
    }
    findNearestRoad(centerX, centerY) {
        if (!this.scene || !this.scene.tilemap) return null;
        const searchRadius = 30;
        const tile = this.scene.tilemap.worldToTile(centerX, centerY);
        for (let radius = 0; radius <= searchRadius; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (radius > 0 && Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    const checkTile = { x: tile.x + dx, y: tile.y + dy };
                    const worldPos = this.scene.tilemap.tileToWorld(checkTile.x, checkTile.y);
                    if (this.isOnRoad(worldPos.x, worldPos.y) && !this.hasCollision(worldPos.x, worldPos.y)) {
                        return worldPos;
                    }
                }
            }
        }
        return null;
    }
    determineInitialDirection() {
        if (!this.scene || !this.scene.tilemap) {
            const directions = ['up', 'down', 'left', 'right'];
            this.currentDirection = directions[Math.floor(Math.random() * directions.length)];
            return;
        }
        const availableDirs = this.getAvailableDirections();
        if (availableDirs.length > 0) {
            this.currentDirection = availableDirs[Math.floor(Math.random() * availableDirs.length)];
        } else {
            const directions = ['up', 'down', 'left', 'right'];
            this.currentDirection = directions[Math.floor(Math.random() * directions.length)];
        }
    }
    getAvailableDirections() {
        if (!this.scene || !this.scene.tilemap) return [];
        const directions = [];
        const checkDistance = 32;
        const checks = [
            { dir: 'up', x: this.x, y: this.y - checkDistance },
            { dir: 'down', x: this.x, y: this.y + checkDistance },
            { dir: 'left', x: this.x - checkDistance, y: this.y },
            { dir: 'right', x: this.x + checkDistance, y: this.y }
        ];
        for (const check of checks) {
            if (this.isOnRoad(check.x, check.y) && !this.hasCollision(check.x, check.y)) {
                directions.push(check.dir);
            }
        }
        return directions;
    }
    hasRoadInDirection(direction) {
        if (!this.scene || !this.scene.tilemap) return false;
        const checkDistance = 32;
        let checkX = this.x;
        let checkY = this.y;
        switch (direction) {
            case 'up':
                checkY -= checkDistance;
                break;
            case 'down':
                checkY += checkDistance;
                break;
            case 'left':
                checkX -= checkDistance;
                break;
            case 'right':
                checkX += checkDistance;
                break;
        }
        return this.isOnRoad(checkX, checkY) && !this.hasCollision(checkX, checkY);
    }
    updateRotation() {
        if (!this.currentDirection) return;
        const rotationOffsets = GAME_CONFIG.OBSTACLES.MOVING_BUS.CAR_ROTATION_OFFSETS || {};
        const textureOffset = rotationOffsets[this.textureKey] || 0;
        let angle = 0;
        switch (this.currentDirection) {
            case 'up':
                angle = -Math.PI / 2 + textureOffset;
                break;
            case 'down':
                angle = Math.PI / 2 + textureOffset;
                break;
            case 'left':
                angle = Math.PI + textureOffset;
                break;
            case 'right':
                angle = 0 + textureOffset;
                break;
        }
        this.setRotation(angle);
    }
    setVelocity(x, y) {
        if (this.body) {
            this.body.setVelocity(x, y);
        }
    }
    onCollisionWithEntity(entity) {
        if (!entity || !entity.active) return;
        if (this.collisionCooldown > 0) return;

        // Player checks
        if (entity.type === 'Player' && this.scene.bonusManager) {
            if (this.scene.bonusManager.isImmune()) return;
            if (this.scene.bonusManager.checkArmorHit()) {
                this.collisionCooldown = 500;
                // Maybe just a small push?
                const dx = entity.x - this.x;
                const dy = entity.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 0) {
                    entity.x += (dx / distance) * 20;
                    entity.y += (dy / distance) * 20;
                }
                return;
            }
        }

        this.collisionCooldown = 500;
        const dx = entity.x - this.x;
        const dy = entity.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) return;
        const dirX = dx / distance;
        const dirY = dy / distance;
        const pushDistance = Phaser.Math.Between(
            GAME_CONFIG.OBSTACLES.MOVING_BUS.PUSH_DISTANCE_MIN,
            GAME_CONFIG.OBSTACLES.MOVING_BUS.PUSH_DISTANCE_MAX
        );
        const newX = entity.x + dirX * pushDistance;
        const newY = entity.y + dirY * pushDistance;
        if (this.scene.tilemap && this.scene.tilemap.isWalkable(newX, newY)) {
            entity.setPosition(newX, newY);
        } else {
            const tile = this.scene.tilemap.worldToTile(newX, newY);
            const directions = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
            for (const dir of directions) {
                const checkTile = { x: tile.x + dir.x, y: tile.y + dir.y };
                const worldPos = this.scene.tilemap.tileToWorld(checkTile.x, checkTile.y);
                if (this.scene.tilemap.isWalkable(worldPos.x, worldPos.y)) {
                    entity.setPosition(worldPos.x, worldPos.y);
                    break;
                }
            }
        }
        const freezeDuration = Phaser.Math.Between(
            GAME_CONFIG.OBSTACLES.MOVING_BUS.FREEZE_DURATION_MIN,
            GAME_CONFIG.OBSTACLES.MOVING_BUS.FREEZE_DURATION_MAX
        );
        if (this.scene.sound && this.scene.cache.audio.exists('fall')) {
            const fallConfig = GAME_CONFIG.AUDIO.FALL_SOUND;
            if (entity.type === 'Player') {
                if (entity.triggerFall) {
                    entity.triggerFall();
                }
                this.scene.sound.play('fall', {
                    volume: fallConfig.PLAYER_VOLUME
                });
            }
            else if (entity.type && (entity.type === 'Blocker' || entity.type === 'Sticker') && this.scene.player) {
                // Викликаємо triggerFall для ворога (Hospital Mechanic)
                if (entity.triggerFall) {
                    entity.triggerFall();
                }

                const distanceToPlayer = Phaser.Math.Distance.Between(
                    entity.x, entity.y,
                    this.scene.player.x, this.scene.player.y
                );
                let volume = 0;
                if (distanceToPlayer < fallConfig.ENEMY_MIN_DISTANCE) {
                    volume = fallConfig.ENEMY_MAX_VOLUME;
                } else if (distanceToPlayer < fallConfig.ENEMY_MAX_DISTANCE) {
                    const ratio = (fallConfig.ENEMY_MAX_DISTANCE - distanceToPlayer) /
                        (fallConfig.ENEMY_MAX_DISTANCE - fallConfig.ENEMY_MIN_DISTANCE);
                    volume = fallConfig.ENEMY_MAX_VOLUME * ratio;
                }
                if (volume > 0) {
                    this.scene.sound.play('fall', { volume });
                }
            }
        }
        if (entity.freeze) { entity.freeze(freezeDuration); }
        else if (entity.setFrozen) { entity.setFrozen(freezeDuration); }
        if (entity.body) { entity.body.setVelocity(0, 0); }
    }
    update(delta) {
        this.updateSounds();
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= delta;
            if (this.collisionCooldown < 0) {
                this.collisionCooldown = 0;
            }
        }
        if (this.directionChangeCooldown > 0) {
            this.directionChangeCooldown -= delta;
            if (this.directionChangeCooldown < 0) {
                this.directionChangeCooldown = 0;
            }
        }
        if (this.isAccident) {
            this.accidentTimer += delta;
            if (this.accidentTimer >= this.accidentDuration) {
                this.isAccident = false;
                this.accidentTimer = 0;
                this.accidentCooldown = GAME_CONFIG.OBSTACLES.MOVING_BUS.ACCIDENT_COOLDOWN;
                this.chooseDifferentDirection();
            } else {
                this.setVelocity(0, 0);
                return;
            }
        }
        if (this.accidentCooldown > 0) {
            this.accidentCooldown -= delta;
            if (this.accidentCooldown < 0) {
                this.accidentCooldown = 0;
            }
        }
        if (!this.scene || !this.scene.tilemap) {
            return;
        }
        if (!this.currentDirection) {
            this.determineInitialDirection();
            if (!this.currentDirection) {
                const directions = ['up', 'down', 'left', 'right'];
                this.currentDirection = directions[Math.floor(Math.random() * directions.length)];
            }
        }
        if (!this.isOnRoad(this.x, this.y) || this.hasCollision(this.x, this.y)) {
            const roadPos = this.findNearestRoad(this.x, this.y);
            if (roadPos) {
                this.setPosition(roadPos.x, roadPos.y);
                this.determineInitialDirection();
            }
        }
        const distanceMoved = Phaser.Math.Distance.Between(
            this.x, this.y,
            this.lastPosition.x, this.lastPosition.y
        );
        if (distanceMoved < this.stuckThreshold) {
            this.stuckTimer += delta;
            if (this.stuckTimer > 1000) {
                const availableDirs = this.getAvailableDirections();
                if (availableDirs.length > 0) {
                    this.currentDirection = availableDirs[Math.floor(Math.random() * availableDirs.length)];
                    this.stuckTimer = 0;
                }
            }
        } else {
            this.stuckTimer = 0;
        }
        this.lastPosition.x = this.x;
        this.lastPosition.y = this.y;
        if (this.x < -500 || this.x > this.scene.worldWidth + 500 ||
            this.y < -500 || this.y > this.scene.worldHeight + 500) {
            this.destroy();
            return;
        }
        if (!this.hasRoadInDirection(this.currentDirection)) {
            const availableDirs = this.getAvailableDirections();
            if (availableDirs.length > 0) {
                const oppositeDir = this.getOppositeDirection(this.currentDirection);
                const validDirs = availableDirs.filter(dir => dir !== oppositeDir);
                if (validDirs.length > 0) {
                    this.currentDirection = validDirs[Math.floor(Math.random() * validDirs.length)];
                } else {
                    this.currentDirection = availableDirs[Math.floor(Math.random() * availableDirs.length)];
                }
            } else {
                this.setVelocity(0, 0);
                return;
            }
        }
        const carAhead = this.getCarAhead();
        if (carAhead) {
            this.setVelocity(0, 0);
            return;
        }
        let velX = 0;
        let velY = 0;
        switch (this.currentDirection) {
            case 'up':
                velY = -this.speed;
                break;
            case 'down':
                velY = this.speed;
                break;
            case 'left':
                velX = -this.speed;
                break;
            case 'right':
                velX = this.speed;
                break;
            default:
                const directions = ['up', 'down', 'left', 'right'];
                this.currentDirection = directions[Math.floor(Math.random() * directions.length)];
                return;
        }
        const keepRightCorrection = this.getKeepRightCorrection();
        velX += keepRightCorrection.x;
        velY += keepRightCorrection.y;
        const nextX = this.x + velX * (delta / 1000);
        const nextY = this.y + velY * (delta / 1000);
        if (this.isOnRoad(nextX, nextY) && !this.hasCollision(nextX, nextY) && !this.hasCarCollision(nextX, nextY)) {
            this.setVelocity(velX, velY);
            this.updateRotation();
        } else {
            const availableDirs = this.getAvailableDirections();
            if (availableDirs.length > 0) {
                const oppositeDir = this.getOppositeDirection(this.currentDirection);
                const validDirs = availableDirs.filter(dir => dir !== oppositeDir);
                if (validDirs.length > 0) {
                    this.currentDirection = validDirs[Math.floor(Math.random() * validDirs.length)];
                } else {
                    this.currentDirection = availableDirs[Math.floor(Math.random() * availableDirs.length)];
                }
                let newVelX = 0;
                let newVelY = 0;
                switch (this.currentDirection) {
                    case 'up':
                        newVelY = -this.speed;
                        break;
                    case 'down':
                        newVelY = this.speed;
                        break;
                    case 'left':
                        newVelX = -this.speed;
                        break;
                    case 'right':
                        newVelX = this.speed;
                        break;
                }
                this.setVelocity(newVelX, newVelY);
                this.updateRotation();
            } else {
                this.setVelocity(0, 0);
            }
        }
    }
    getOppositeDirection(direction) {
        switch (direction) {
            case 'up':
                return 'down';
            case 'down':
                return 'up';
            case 'left':
                return 'right';
            case 'right':
                return 'left';
        }
        return null;
    }
    handleAccident(otherCar) {
        if (!otherCar || !otherCar.active) return;
        if (this.isAccident || this.accidentCooldown > 0) return;
        if (otherCar.isAccident || otherCar.accidentCooldown > 0) return;
        const config = GAME_CONFIG.OBSTACLES.MOVING_BUS;
        const duration = Phaser.Math.Between(
            config.ACCIDENT_DURATION_MIN,
            config.ACCIDENT_DURATION_MAX
        );
        this.isAccident = true;
        this.accidentTimer = 0;
        this.accidentDuration = duration;
        this.setVelocity(0, 0);
        otherCar.isAccident = true;
        otherCar.accidentTimer = 0;
        otherCar.accidentDuration = duration;
        otherCar.setVelocity(0, 0);
    }
    chooseDifferentDirection() {
        const availableDirs = this.getAvailableDirections();
        if (availableDirs.length === 0) {
            const directions = ['up', 'down', 'left', 'right'];
            this.currentDirection = directions[Math.floor(Math.random() * directions.length)];
            return;
        }
        const oppositeDir = this.getOppositeDirection(this.currentDirection);
        const validDirs = availableDirs.filter(dir =>
            dir !== this.currentDirection && dir !== oppositeDir
        );
        if (validDirs.length > 0) {
            this.currentDirection = validDirs[Math.floor(Math.random() * validDirs.length)];
        } else {
            this.currentDirection = availableDirs[Math.floor(Math.random() * availableDirs.length)];
        }
        this.updateRotation();
    }
    destroy() {
        if (this.engineSound) {
            this.engineSound.stop();
            this.engineSound.destroy();
            this.engineSound = null;
        }
        if (this.body) {
            this.body.destroy();
        }
        super.destroy();
    }
}
export default Car;