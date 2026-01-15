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
        
        // Розміри авто
        const width = GAME_CONFIG.OBSTACLES.MOVING_BUS.WIDTH;
        const height = GAME_CONFIG.OBSTACLES.MOVING_BUS.HEIGHT;
        this.setDisplaySize(width, height);
        
        this.speed = GAME_CONFIG.OBSTACLES.MOVING_BUS.SPEED;
        this.collisionCooldown = 0;
        
        // AI параметри
        this.currentDirection = null;
        this.lastPosition = { x: x, y: y };
        this.stuckTimer = 0;
        this.stuckThreshold = 5;
        this.directionChangeCooldown = 0;
        
        // Ініціалізація позиції на дорозі
        if (!this.isOnRoad(x, y) || this.hasCollision(x, y)) {
            const roadPos = this.findNearestRoad(x, y);
            if (roadPos) {
                this.setPosition(roadPos.x, roadPos.y);
            }
        }
        
        // Визначаємо початковий напрямок руху - СПРОЩЕНА ВЕРСІЯ
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
        
        // СПРОЩЕНА ВЕРСІЯ - просто обираємо випадковий напрямок з доступних
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
        
        let angle = 0;
        switch (this.currentDirection) {
            case 'up':
                angle = -Math.PI / 2;
                break;
            case 'down':
                angle = Math.PI / 2;
                break;
            case 'left':
                angle = Math.PI;
                break;
            case 'right':
                angle = 0;
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
        
        // Завжди рухаємося в поточному напрямку
        // Якщо наступна позиція не на дорозі - обираємо новий напрямок наступного кадру
        const nextX = this.x + velX * (delta / 1000);
        const nextY = this.y + velY * (delta / 1000);
        
        if (this.isOnRoad(nextX, nextY) && !this.hasCollision(nextX, nextY)) {
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
    
    destroy() {
        if (this.body) {
            this.body.destroy();
        }
        super.destroy();
    }
}

export default Car;
