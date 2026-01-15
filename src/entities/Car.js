// Car - автомобіль (перешкода типу 5)
// Рух по дорогах з AI як в GTA 1/2
import { GAME_CONFIG } from '../config/gameConfig.js';

class Car extends Phaser.GameObjects.Image {
    constructor(scene, x, y, textureKey = null) {
        // Якщо текстура не передана, обираємо випадково (fallback)
        if (!textureKey) {
            const carTextures = GAME_CONFIG.OBSTACLES.MOVING_BUS.CAR_TEXTURES || [];
            const availableTextures = carTextures.filter(key => scene.textures.exists(key));
            
            if (availableTextures.length > 0) {
                textureKey = availableTextures[Math.floor(Math.random() * availableTextures.length)];
            }
        }
        
        // Створюємо Image з вибраною текстурою або fallback
        if (textureKey && scene.textures.exists(textureKey)) {
            super(scene, x, y, textureKey);
        } else {
            // Fallback: створюємо тимчасову текстуру з кольору
            const color = GAME_CONFIG.OBSTACLES.MOVING_BUS.COLOR;
            const width = GAME_CONFIG.OBSTACLES.MOVING_BUS.WIDTH;
            const height = GAME_CONFIG.OBSTACLES.MOVING_BUS.HEIGHT;
            const fallbackKey = 'car_fallback_' + width + '_' + height;
            
            // Створюємо текстуру тільки якщо її ще немає
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
        
        // Розміри авто (використовуємо з конфігу або оригінальні розміри текстури)
        const config = GAME_CONFIG.OBSTACLES.MOVING_BUS;
        let displayWidth = config.DISPLAY_WIDTH;
        let displayHeight = config.DISPLAY_HEIGHT;
        
        // Якщо розміри не вказані в конфігу, використовуємо оригінальні розміри текстури
        if (displayWidth === null || displayHeight === null) {
            if (textureKey && scene.textures.exists(textureKey)) {
                const texture = scene.textures.get(textureKey);
                displayWidth = displayWidth !== null ? displayWidth : texture.source[0].width;
                displayHeight = displayHeight !== null ? displayHeight : texture.source[0].height;
            } else {
                // Fallback: використовуємо розміри з конфігу
                displayWidth = config.WIDTH;
                displayHeight = config.HEIGHT;
            }
        }
        
        this.setDisplaySize(displayWidth, displayHeight);
        
        this.speed = GAME_CONFIG.OBSTACLES.MOVING_BUS.SPEED;
        this.collisionCooldown = 0;
        
        // AI параметри
        this.currentDirection = null;
        this.lastPosition = { x: x, y: y };
        this.stuckTimer = 0;
        this.stuckThreshold = 5;
        this.directionChangeCooldown = 0;
        this.textureKey = textureKey; // Зберігаємо ключ текстури для визначення offset
        
        // ДТП параметри
        this.isAccident = false; // Чи авто в стані ДТП
        this.accidentTimer = 0; // Таймер ДТП
        this.accidentCooldown = 0; // Cooldown після ДТП
        this.accidentDuration = 0; // Тривалість поточного ДТП
        
        // Ініціалізація позиції на дорозі
        if (!this.isOnRoad(x, y) || this.hasCollision(x, y)) {
            const roadPos = this.findNearestRoad(x, y);
            if (roadPos) {
                this.setPosition(roadPos.x, roadPos.y);
            }
        }
        
        // Визначаємо початковий напрямок руху
        this.determineInitialDirection();
        
        // Якщо не вдалося визначити напрямок - встановлюємо випадковий
        if (!this.currentDirection) {
            const directions = ['up', 'down', 'left', 'right'];
            this.currentDirection = directions[Math.floor(Math.random() * directions.length)];
        }
        
        this.updateRotation();
        this.active = true;
    }
    
    isOnRoad(x, y) {
        if (!this.scene || !this.scene.tilemap) return false;
        return this.scene.tilemap.isRoad(x, y);
    }
    
    hasCollision(x, y) {
        if (!this.scene || !this.scene.tilemap) return false;
        return this.scene.tilemap.hasCollision(x, y);
    }
    
    /**
     * Перевіряє чи є колізія з іншими авто в заданій позиції
     * @param {number} x - координата X
     * @param {number} y - координата Y
     * @returns {boolean} - true якщо є колізія з іншим авто
     */
    hasCarCollision(x, y) {
        if (!this.scene || !this.scene.obstacles) return false;
        if (this.isAccident || this.accidentCooldown > 0) return false; // Пропускаємо перевірку під час ДТП
        
        const config = GAME_CONFIG.OBSTACLES.MOVING_BUS;
        const minDistance = config.MIN_DISTANCE_BETWEEN_CARS || 60; // Мінімальна відстань між авто
        
        // Перевіряємо колізії з усіма іншими авто
        for (const obstacle of this.scene.obstacles) {
            if (!(obstacle instanceof Car)) continue;
            if (obstacle === this) continue; // Пропускаємо себе
            if (!obstacle.active) continue;
            if (obstacle.isAccident) continue; // Пропускаємо авто в ДТП
            
            const distance = Phaser.Math.Distance.Between(x, y, obstacle.x, obstacle.y);
            
            if (distance < minDistance) {
                return true; // Є колізія (занадто близько)
            }
        }
        
        return false; // Колізій немає
    }
    
    /**
     * Знаходить правий край дороги в поточному напрямку руху
     * "Правий край" - це найбільший X при русі вгору/вниз, або найбільший Y при русі вліво/вправо
     * Шукаємо в обидва боки від поточної позиції, щоб знайти правий край
     * @returns {{x: number, y: number}|null} - позиція правого краю дороги або null
     */
    findRightEdgeOfRoad() {
        if (!this.scene || !this.scene.tilemap || !this.currentDirection) {
            return null;
        }
        
        const searchRadius = 200; // Радіус пошуку (пікселі)
        const step = 16; // Крок перевірки (пікселі)
        
        let rightEdgeX = this.x;
        let rightEdgeY = this.y;
        let foundRightEdge = false;
        
        // Визначаємо напрямок пошуку правого краю залежно від напрямку руху
        // Уявімо, що ми дивимося в напрямку руху:
        // - При русі вгору/вниз: правий край = більший X (праворуч)
        // - При русі вліво: правий край = менший Y (якщо дивимося вліво, праворуч = менший Y)
        // - При русі вправо: правий край = більший Y (якщо дивимося вправо, праворуч = більший Y)
        switch (this.currentDirection) {
            case 'up':
            case 'down':
                // Рух вгору/вниз - правий край = максимальний X (праворуч)
                // Шукаємо вправо (більший X) та вліво (менший X), щоб знайти правий край
                let maxX = this.x;
                let minX = this.x;
                
                // Шукаємо вправо
                for (let offset = 0; offset <= searchRadius; offset += step) {
                    const checkX = this.x + offset;
                    if (this.isOnRoad(checkX, this.y) && !this.hasCollision(checkX, this.y)) {
                        maxX = checkX;
                        foundRightEdge = true;
                    } else {
                        break;
                    }
                }
                
                // Шукаємо вліво
                for (let offset = 0; offset <= searchRadius; offset += step) {
                    const checkX = this.x - offset;
                    if (this.isOnRoad(checkX, this.y) && !this.hasCollision(checkX, this.y)) {
                        minX = checkX;
                    } else {
                        break;
                    }
                }
                
                // Правий край = максимальний X
                rightEdgeX = maxX;
                return foundRightEdge ? { x: rightEdgeX, y: this.y } : null;
                
            case 'left':
                // Рух вліво - дивимося вліво, правий край = менший Y (праворуч від нас)
                // Шукаємо вгору (менший Y) та вниз (більший Y), щоб знайти правий край
                let minY = this.y;
                let maxY = this.y;
                
                // Шукаємо вгору (менший Y = правий край)
                for (let offset = 0; offset <= searchRadius; offset += step) {
                    const checkY = this.y - offset;
                    if (this.isOnRoad(this.x, checkY) && !this.hasCollision(this.x, checkY)) {
                        minY = checkY;
                        foundRightEdge = true;
                    } else {
                        break;
                    }
                }
                
                // Шукаємо вниз
                for (let offset = 0; offset <= searchRadius; offset += step) {
                    const checkY = this.y + offset;
                    if (this.isOnRoad(this.x, checkY) && !this.hasCollision(this.x, checkY)) {
                        maxY = checkY;
                    } else {
                        break;
                    }
                }
                
                // Правий край = мінімальний Y
                rightEdgeY = minY;
                return foundRightEdge ? { x: this.x, y: rightEdgeY } : null;
                
            case 'right':
                // Рух вправо - дивимося вправо, правий край = більший Y (праворуч від нас)
                // Шукаємо вниз (більший Y) та вгору (менший Y), щоб знайти правий край
                let maxYRight = this.y;
                let minYRight = this.y;
                
                // Шукаємо вниз (більший Y = правий край)
                for (let offset = 0; offset <= searchRadius; offset += step) {
                    const checkY = this.y + offset;
                    if (this.isOnRoad(this.x, checkY) && !this.hasCollision(this.x, checkY)) {
                        maxYRight = checkY;
                        foundRightEdge = true;
                    } else {
                        break;
                    }
                }
                
                // Шукаємо вгору
                for (let offset = 0; offset <= searchRadius; offset += step) {
                    const checkY = this.y - offset;
                    if (this.isOnRoad(this.x, checkY) && !this.hasCollision(this.x, checkY)) {
                        minYRight = checkY;
                    } else {
                        break;
                    }
                }
                
                // Правий край = максимальний Y
                rightEdgeY = maxYRight;
                return foundRightEdge ? { x: this.x, y: rightEdgeY } : null;
        }
        
        return null;
    }
    
    /**
     * Обчислює корекцію швидкості для тримання правої сторони дороги
     * Авто тримаються на певній відстані від правого краю (не впритик)
     * @returns {{x: number, y: number}} - корекція швидкості
     */
    getKeepRightCorrection() {
        if (!this.scene || !this.scene.tilemap || !this.currentDirection) {
            return { x: 0, y: 0 };
        }
        
        const config = GAME_CONFIG.OBSTACLES.MOVING_BUS;
        const keepRightStrength = config.KEEP_RIGHT_STRENGTH || 0.15;
        const keepRightDistance = config.KEEP_RIGHT_DISTANCE || 64; // Відстань від правого краю
        
        if (keepRightStrength === 0) {
            return { x: 0, y: 0 };
        }
        
        // Знаходимо правий край дороги
        const rightEdge = this.findRightEdgeOfRoad();
        if (!rightEdge) {
            return { x: 0, y: 0 }; // Не знайдено край дороги
        }
        
        // Обчислюємо відстань до правого краю
        const distanceToRightEdge = Phaser.Math.Distance.Between(
            this.x, this.y,
            rightEdge.x, rightEdge.y
        );
        
        // Якщо ми вже на правильній відстані (з невеликою толерантністю) - не корегуємо
        const tolerance = 10; // Толерантність (пікселі)
        if (Math.abs(distanceToRightEdge - keepRightDistance) < tolerance) {
            return { x: 0, y: 0 };
        }
        
        // Обчислюємо напрямок до ідеальної позиції (на keepRightDistance від правого краю)
        // Ідеальна позиція = правий край мінус keepRightDistance (тобто лівіше від правого краю)
        let targetX = this.x;
        let targetY = this.y;
        
        switch (this.currentDirection) {
            case 'up':
            case 'down':
                // Рух вгору/вниз - правий край має більший X
                // Ідеальна позиція = rightEdgeX - keepRightDistance (лівіше від правого краю)
                targetX = rightEdge.x - keepRightDistance;
                targetY = this.y;
                break;
            case 'left':
                // Рух вліво - правий край має менший Y (якщо дивитися вліво, праворуч = менший Y)
                // Ідеальна позиція = rightEdgeY + keepRightDistance (більший Y, тобто лівіше від правого краю)
                targetX = this.x;
                targetY = rightEdge.y + keepRightDistance;
                break;
            case 'right':
                // Рух вправо - правий край має більший Y (якщо дивитися вправо, праворуч = більший Y)
                // Ідеальна позиція = rightEdgeY - keepRightDistance (менший Y, тобто лівіше від правого краю)
                targetX = this.x;
                targetY = rightEdge.y - keepRightDistance;
                break;
        }
        
        // Обчислюємо вектор до ідеальної позиції
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < tolerance) {
            return { x: 0, y: 0 }; // Вже на ідеальній позиції
        }
        
        // Нормалізуємо вектор і застосовуємо силу корекції
        const normalizedX = dx / distance;
        const normalizedY = dy / distance;
        const correctionSpeed = this.speed * keepRightStrength;
        
        const correctionX = normalizedX * correctionSpeed;
        const correctionY = normalizedY * correctionSpeed;
        
        // Перевіряємо чи корекція не виведе нас з дороги
        const checkX = this.x + correctionX * 0.1;
        const checkY = this.y + correctionY * 0.1;
        
        if (this.isOnRoad(checkX, checkY) && !this.hasCollision(checkX, checkY)) {
            return { x: correctionX, y: correctionY };
        }
        
        // Якщо корекція виведе з дороги - не застосовуємо її
        return { x: 0, y: 0 };
    }
    
    /**
     * Перевіряє чи є авто попереду на мінімальній відстані
     * @returns {Car|null} - авто попереду або null
     */
    getCarAhead() {
        if (!this.scene || !this.scene.obstacles || !this.currentDirection) return null;
        if (this.isAccident || this.accidentCooldown > 0) return null; // Пропускаємо перевірку під час ДТП
        
        const config = GAME_CONFIG.OBSTACLES.MOVING_BUS;
        const minDistance = config.MIN_DISTANCE_BETWEEN_CARS || 60;
        
        // Визначаємо напрямок перевірки залежно від поточного напрямку руху
        let checkX = this.x;
        let checkY = this.y;
        const checkDistance = minDistance + 20; // Перевіряємо трохи далі для плавності
        
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
        
        // Перевіряємо всі авто
        let closestCar = null;
        let closestDistance = Infinity;
        
        for (const obstacle of this.scene.obstacles) {
            if (!(obstacle instanceof Car)) continue;
            if (obstacle === this) continue; // Пропускаємо себе
            if (!obstacle.active) continue;
            if (obstacle.isAccident) continue; // Пропускаємо авто в ДТП
            
            // Перевіряємо чи авто в напрямку руху
            const dx = obstacle.x - this.x;
            const dy = obstacle.y - this.y;
            const distance = Phaser.Math.Distance.Between(this.x, this.y, obstacle.x, obstacle.y);
            
            // Перевіряємо чи авто попереду (в напрямку руху)
            let isAhead = false;
            switch (this.currentDirection) {
                case 'up':
                    isAhead = dy < 0 && Math.abs(dx) < minDistance / 2; // Вище і не далеко вбік
                    break;
                case 'down':
                    isAhead = dy > 0 && Math.abs(dx) < minDistance / 2; // Нижче і не далеко вбік
                    break;
                case 'left':
                    isAhead = dx < 0 && Math.abs(dy) < minDistance / 2; // Лівіше і не далеко вбік
                    break;
                case 'right':
                    isAhead = dx > 0 && Math.abs(dy) < minDistance / 2; // Правіше і не далеко вбік
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
        
        // Обираємо випадковий напрямок з доступних
        const availableDirs = this.getAvailableDirections();
        if (availableDirs.length > 0) {
            this.currentDirection = availableDirs[Math.floor(Math.random() * availableDirs.length)];
        } else {
            // Якщо немає доступних - обираємо випадково
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
        
        // Отримуємо базовий offset для поточної текстури
        const rotationOffsets = GAME_CONFIG.OBSTACLES.MOVING_BUS.CAR_ROTATION_OFFSETS || {};
        const textureOffset = rotationOffsets[this.textureKey] || 0;
        
        let angle = 0;
        switch (this.currentDirection) {
            case 'up':
                // Рух вгору: -90° + offset
                angle = -Math.PI / 2 + textureOffset;
                break;
            case 'down':
                // Рух вниз: 90° + offset
                angle = Math.PI / 2 + textureOffset;
                break;
            case 'left':
                // Рух вліво: 180° + offset
                angle = Math.PI + textureOffset;
                break;
            case 'right':
                // Рух вправо: 0° + offset
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

        // Якщо це гравець - запускаємо анімацію падіння
        if (entity.type === 'Player' && entity.triggerFall) {
            entity.triggerFall();
        }

        if (entity.freeze) { entity.freeze(freezeDuration); }
        else if (entity.setFrozen) { entity.setFrozen(freezeDuration); }

        if (entity.body) { entity.body.setVelocity(0, 0); }
    }

    update(delta) {
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
        
        // Оновлення ДТП таймера
        if (this.isAccident) {
            this.accidentTimer += delta;
            if (this.accidentTimer >= this.accidentDuration) {
                // ДТП закінчилось - рухаємося в різних напрямках
                this.isAccident = false;
                this.accidentTimer = 0;
                this.accidentCooldown = GAME_CONFIG.OBSTACLES.MOVING_BUS.ACCIDENT_COOLDOWN;
                // Визначаємо новий напрямок (відмінний від поточного)
                this.chooseDifferentDirection();
            } else {
                // Під час ДТП - зупиняємося
                this.setVelocity(0, 0);
                return;
            }
        }
        
        // Оновлення cooldown після ДТП
        if (this.accidentCooldown > 0) {
            this.accidentCooldown -= delta;
            if (this.accidentCooldown < 0) {
                this.accidentCooldown = 0;
            }
        }
        
        if (!this.scene || !this.scene.tilemap) {
            return;
        }
        
        // Перевіряємо чи є напрямок
        if (!this.currentDirection) {
            this.determineInitialDirection();
            if (!this.currentDirection) {
                const directions = ['up', 'down', 'left', 'right'];
                this.currentDirection = directions[Math.floor(Math.random() * directions.length)];
            }
        }
        
        // Перевірка чи авто на дорозі
        if (!this.isOnRoad(this.x, this.y) || this.hasCollision(this.x, this.y)) {
            const roadPos = this.findNearestRoad(this.x, this.y);
            if (roadPos) {
                this.setPosition(roadPos.x, roadPos.y);
                this.determineInitialDirection();
            }
        }
        
        // Виявлення застрявання
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
        
        // Знищуємо авто за межами карти
        if (this.x < -500 || this.x > this.scene.worldWidth + 500 ||
            this.y < -500 || this.y > this.scene.worldHeight + 500) {
            this.destroy();
            return;
        }
        
        // Перевірка чи попереду дорога
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
        
        // Перевіряємо чи є авто попереду на мінімальній відстані
        const carAhead = this.getCarAhead();
        if (carAhead) {
            // Авто попереду - зупиняємося
            this.setVelocity(0, 0);
            return;
        }
        
        // Рухаємося в поточному напрямку
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
                // Якщо напрямок не встановлений - встановлюємо випадковий
                const directions = ['up', 'down', 'left', 'right'];
                this.currentDirection = directions[Math.floor(Math.random() * directions.length)];
                return;
        }
        
        // Корекція для тримання правої сторони дороги
        const keepRightCorrection = this.getKeepRightCorrection();
        velX += keepRightCorrection.x;
        velY += keepRightCorrection.y;
        
        // Завжди рухаємося в поточному напрямку
        // Якщо наступна позиція не на дорозі - обираємо новий напрямок наступного кадру
        const nextX = this.x + velX * (delta / 1000);
        const nextY = this.y + velY * (delta / 1000);
        
        // Перевіряємо колізії з іншими авто перед рухом
        if (this.isOnRoad(nextX, nextY) && !this.hasCollision(nextX, nextY) && !this.hasCarCollision(nextX, nextY)) {
            // Рухаємося
            this.setVelocity(velX, velY);
            this.updateRotation();
        } else {
            // Наступна позиція не на дорозі - обираємо новий напрямок
            const availableDirs = this.getAvailableDirections();
            if (availableDirs.length > 0) {
                const oppositeDir = this.getOppositeDirection(this.currentDirection);
                const validDirs = availableDirs.filter(dir => dir !== oppositeDir);
                
                if (validDirs.length > 0) {
                    this.currentDirection = validDirs[Math.floor(Math.random() * validDirs.length)];
                } else {
                    this.currentDirection = availableDirs[Math.floor(Math.random() * availableDirs.length)];
                }
                // Встановлюємо velocity для нового напрямку
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
                // Якщо немає доступних напрямків - зупиняємося
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
    
    /**
     * Обробка ДТП з іншим авто
     * @param {Car} otherCar - інше авто з яким сталося ДТП
     */
    handleAccident(otherCar) {
        if (!otherCar || !otherCar.active) return;
        if (this.isAccident || this.accidentCooldown > 0) return; // Вже в ДТП або нещодавно було
        if (otherCar.isAccident || otherCar.accidentCooldown > 0) return; // Інше авто вже в ДТП
        
        // Встановлюємо ДТП для обох авто
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
    
    /**
     * Обирає новий напрямок після ДТП (відмінний від поточного)
     */
    chooseDifferentDirection() {
        const availableDirs = this.getAvailableDirections();
        if (availableDirs.length === 0) {
            // Якщо немає доступних напрямків - обираємо випадковий
            const directions = ['up', 'down', 'left', 'right'];
            this.currentDirection = directions[Math.floor(Math.random() * directions.length)];
            return;
        }
        
        // Фільтруємо напрямки, виключаючи поточний та протилежний
        const oppositeDir = this.getOppositeDirection(this.currentDirection);
        const validDirs = availableDirs.filter(dir => 
            dir !== this.currentDirection && dir !== oppositeDir
        );
        
        if (validDirs.length > 0) {
            this.currentDirection = validDirs[Math.floor(Math.random() * validDirs.length)];
        } else {
            // Якщо немає інших напрямків - обираємо з доступних
            this.currentDirection = availableDirs[Math.floor(Math.random() * availableDirs.length)];
        }
        
        this.updateRotation();
    }
    
    destroy() {
        if (this.body) {
            this.body.destroy();
        }
        super.destroy();
    }
}

export default Car;
