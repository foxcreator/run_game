// Car - автомобіль (перешкода типу 5)
// Рух тільки по сірих дорогах на колізійній карті
import Obstacle from './Obstacle.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import spriteManager from '../utils/SpriteManager.js';

class Car extends Obstacle {
    constructor(scene, x, y) {
        const spriteConfig = spriteManager.OBSTACLE_SPRITES.MOVING_BUS;
        const width = spriteConfig.width;
        const height = spriteConfig.height;
        const color = spriteConfig.type === 'color' ? spriteConfig.value : GAME_CONFIG.OBSTACLES.MOVING_BUS.COLOR;
        
        super(scene, x, y, width, height, color, 'Car');
        
        if (this.body) {
            this.body.setImmovable(false);
        }
        
        this.speed = GAME_CONFIG.OBSTACLES.MOVING_BUS.SPEED;
        this.collisionCooldown = 0;
        
        // Поточний напрямок руху (в градусах)
        this.angle = Math.random() * 360;
        
        // Візуалізація
        this.setDisplaySize(width, height);
        this.setPosition(x, y);
        this.updateRotation();
        
        // Перевіряємо чи на дорозі, якщо ні - знаходимо найближчу
        if (!this.isOnRoad()) {
            const roadPos = this.findNearestRoad();
            if (roadPos) {
                this.setPosition(roadPos.x, roadPos.y);
            }
        }
    }
    
    /**
     * Перевіряє чи авто на дорозі (сірий тайл, тільки дорога, без тротуарів)
     */
    isOnRoad() {
        if (!this.scene || !this.scene.tilemap) return false;
        return this.scene.tilemap.isRoad(this.x, this.y);
    }
    
    /**
     * Знаходить найближчу дорогу (тільки сіру, без тротуарів)
     */
    findNearestRoad(searchRadius = 100) {
        if (!this.scene || !this.scene.tilemap) return null;
        
        const tileSize = this.scene.tilemap.tileSize || 32;
        
        // Шукаємо по спіралі
        for (let radius = 1; radius <= searchRadius; radius++) {
            for (let angle = 0; angle < 360; angle += 15) {
                const rad = Phaser.Math.DegToRad(angle);
                const checkX = this.x + Math.cos(rad) * radius * tileSize;
                const checkY = this.y + Math.sin(rad) * radius * tileSize;
                
                if (this.scene.tilemap.isRoad(checkX, checkY)) {
                    return { x: checkX, y: checkY };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Оновлює обертання спрайта
     */
    updateRotation() {
        this.setRotation(Phaser.Math.DegToRad(this.angle));
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
        // Оновлюємо cooldown колізій
        if (this.collisionCooldown > 0) {
            this.collisionCooldown -= delta;
            if (this.collisionCooldown < 0) {
                this.collisionCooldown = 0;
            }
        }
        
        if (!this.scene || !this.scene.tilemap) return;
        
        // Знищуємо авто, якщо воно далеко за межами карти
        if (this.x < -500 || this.x > this.scene.worldWidth + 500 ||
            this.y < -500 || this.y > this.scene.worldHeight + 500) {
            this.destroy();
            return;
        }
        
        // Перевіряємо чи на дорозі
        if (!this.isOnRoad()) {
            // Якщо не на дорозі - шукаємо найближчу дорогу
            const roadPos = this.findNearestRoad(50);
            if (roadPos) {
                this.setPosition(roadPos.x, roadPos.y);
            } else {
                // Якщо не знайшли дорогу - зупиняємося
                this.setVelocity(0, 0);
                return;
            }
        }
        
        // Рухаємося в поточному напрямку
        const rad = Phaser.Math.DegToRad(this.angle);
        const velocityX = Math.cos(rad) * this.speed;
        const velocityY = Math.sin(rad) * this.speed;
        
        // Перевіряємо чи наступна позиція на дорозі
        const nextX = this.x + velocityX * (delta / 1000);
        const nextY = this.y + velocityY * (delta / 1000);
        
        if (this.scene.tilemap.isRoad(nextX, nextY)) {
            // Рухаємося
            this.setVelocity(velocityX, velocityY);
        } else {
            // Якщо не на дорозі - змінюємо напрямок
            // Шукаємо напрямок до найближчої дороги
            const roadPos = this.findNearestRoad(20);
            if (roadPos) {
                const dx = roadPos.x - this.x;
                const dy = roadPos.y - this.y;
                this.angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
                this.updateRotation();
            } else {
                // Якщо не знайшли дорогу - випадковий поворот
                this.angle += Phaser.Math.Between(-45, 45);
                this.updateRotation();
            }
        }
    }
}

export default Car;
