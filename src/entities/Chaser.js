// Chaser - базовий клас для переслідувачів (ворогів)
// Використовує NavigationSystem з waypoint-рухом та FSM
import { GAME_CONFIG } from '../config/gameConfig.js';
import spriteManager from '../utils/SpriteManager.js';

// FSM стани
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
        
        this.type = type; // 'Blocker' або 'Sticker'
        this.active = true;
        
        // Фізика
        this.setCollideWorldBounds(true);
        this.setDrag(GAME_CONFIG.CHASERS.COMMON.DRAG);
        
        // Візуалізація
        this.createVisuals(scene);
        
        // Налаштовуємо body розмір ПІСЛЯ createVisuals
        if (this.body) {
            let bodySize;
            if (this.type === 'Blocker') {
                bodySize = GAME_CONFIG.CHASERS.BLOCKER.BODY_SIZE || GAME_CONFIG.CHASERS.BLOCKER.DISPLAY_SIZE;
            } else if (this.type === 'Sticker') {
                bodySize = GAME_CONFIG.CHASERS.STICKER.BODY_SIZE || GAME_CONFIG.CHASERS.STICKER.DISPLAY_SIZE;
            } else {
                bodySize = 24; // Fallback
            }
            this.body.setSize(bodySize, bodySize);
            this.setOrigin(0.5, 0.5); // Центруємо
        }
        
        // Параметри руху (будуть встановлені в підкласах)
        this.speed = 200;
        this.target = null; // Ціль (гравець)
        this.navigationSystem = null; // Система навігації (єдиний grid)
        
        // FSM стан
        this.state = CHASER_STATES.IDLE;
        
        // Waypoint-рух
        this.currentPath = null; // Масив waypoints (тайли) [{x, y}, ...]
        this.pathIndex = 0; // Індекс поточного waypoint
        this.currentWaypoint = null; // Поточний waypoint (світові координати)
        
        // Перерахунок шляху
        this.lastPathRecalculation = 0; // Час останнього перерахунку
        this.pathRecalculationInterval = 400; // Мінімальний інтервал перерахунку (мс)
        this.lastPlayerTile = null; // Останній тайл гравця (для виявлення зміни)
        
        // Anti-stuck система
        this.lastPosition = { x: this.x, y: this.y };
        this.stuckTimer = 0; // Таймер застрягання
        this.stuckThreshold = 500; // Час в мс для виявлення застрягання (зменшено з 1000 для швидшої реакції)
        this.stuckDistanceThreshold = 8; // Мінімальна відстань для вважання рухом (збільшено для кращої чутливості)
        
        // Стан заморозки (для колізій з авто)
        this.isFrozen = false;
        this.frozenTimer = 0;
        
        // Дебафи швидкості (для бонусів)
        this.speedDebuffs = []; // Масив активних дебафів { multiplier, duration }
        
        // Втрата лока (для димової хмарки)
        this.lostLock = false; // Чи втратив лок
        this.lostLockTimer = 0; // Таймер втрати лока
        this.lastKnownPlayerPos = null; // Остання відома позиція гравця (для втрати лока)
        
        // Separation (щоб вороги не злипалися)
        this.separationForce = { x: 0, y: 0 };
        this.separationRadius = 40; // Радіус для separation
        this.separationStrength = 0.3; // Сила відштовхування
        
        // Напрямок руху для анімацій
        this.lastDirection = 'front'; // front, rear, left, right
        this.isMovingChaser = false; // Чи рухається ворог (для анімацій)
    }
    
    setNavigationSystem(navigationSystem) {
        this.navigationSystem = navigationSystem;
    }
    
    // Для сумісності зі старим кодом
    setPathfindingSystem(pathfindingSystem) {
        // Ігноруємо старий PathfindingSystem
        // Використовуємо тільки NavigationSystem
        console.warn('Chaser.setPathfindingSystem() застарілий, використовуйте setNavigationSystem()');
    }
    
    createVisuals(scene) {
        console.log('🔍 Chaser.createVisuals викликано для типу:', this.type);
        
        // Для Blocker використовуємо текстури з анімаціями
        if (this.type === 'Blocker') {
            // Перевіряємо чи текстура завантажена
            if (scene.textures.exists('blocker_standing_front')) {
                console.log('✅ Blocker: використовую текстури');
                this.setTexture('blocker_standing_front');
                const size = GAME_CONFIG.CHASERS.BLOCKER.DISPLAY_SIZE;
                this.setDisplaySize(size, size);
                this.setDepth(GAME_CONFIG.CHASERS.COMMON.DEPTH);
                
                // Створюємо анімації для Blocker
                this.createAnimations(scene);
                
                // Налаштовуємо body для колізій ПІСЛЯ того як спрайт створено
                // Body налаштовується в конструкторі через physics.add.existing
            } else {
                console.warn('⚠️ Текстури Blocker не завантажені, використовую fallback');
                console.log('Доступні текстури:', Object.keys(scene.textures.list).filter(k => k.includes('blocker')));
                // Fallback: використовуємо старий спосіб
                const textureKey = spriteManager.createChaserSprite(scene, this.type);
                this.setTexture(textureKey);
                const config = spriteManager.CHASER_SPRITES.BLOCKER;
                const size = config.radius * 2;
                this.setDisplaySize(size, size);
                this.setDepth(GAME_CONFIG.CHASERS.COMMON.DEPTH);
            }
        } else if (this.type === 'Sticker') {
            // Для Sticker використовуємо текстури з анімаціями
            if (scene.textures.exists('sticker_standing_front')) {
                console.log('✅ Sticker: використовую текстури');
                this.setTexture('sticker_standing_front');
                const size = GAME_CONFIG.CHASERS.STICKER.DISPLAY_SIZE;
                this.setDisplaySize(size, size);
                this.setDepth(GAME_CONFIG.CHASERS.COMMON.DEPTH);
                
                // Створюємо анімації для Sticker
                this.createAnimations(scene);
            } else {
                console.warn('⚠️ Текстури Sticker не завантажені, використовую fallback');
                console.log('Доступні текстури:', Object.keys(scene.textures.list).filter(k => k.includes('sticker')));
                // Fallback: використовуємо старий спосіб
                const textureKey = spriteManager.createChaserSprite(scene, this.type);
                this.setTexture(textureKey);
                const config = spriteManager.CHASER_SPRITES.STICKER;
                const size = config.radius * 2;
                this.setDisplaySize(size, size);
                this.setDepth(GAME_CONFIG.CHASERS.COMMON.DEPTH);
            }
        } else {
            // Fallback для інших типів
            const textureKey = spriteManager.createChaserSprite(scene, this.type);
            this.setTexture(textureKey);
            
            const config = spriteManager.CHASER_SPRITES.STICKER;
            const size = config.radius * 2;
            this.setDisplaySize(size, size);
            this.setDepth(GAME_CONFIG.CHASERS.COMMON.DEPTH);
        }
    }
    
    /**
     * Створює анімації для Blocker або Sticker (аналогічно до Player)
     */
    createAnimations(scene) {
        if (this.type === 'Blocker') {
            // Перевіряємо чи анімації вже створені (щоб не створювати повторно)
            if (scene.anims.exists('blocker_run_front')) return;
            
            // Анімація бігу вниз (front)
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
            
            // Анімація бігу вгору (rear)
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
            
            // Анімація бігу вліво (left)
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
            
            // Анімація бігу вправо (right)
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
            // Перевіряємо чи анімації вже створені (щоб не створювати повторно)
            if (scene.anims.exists('sticker_run_front')) return;
            
            // Анімація бігу вниз (front)
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
            
            // Анімація бігу вгору (rear)
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
            
            // Анімація бігу вліво (left)
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
            
            // Анімація бігу вправо (right)
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
        // Заморожуємо ворога на певний час
        this.isFrozen = true;
        this.frozenTimer = duration;
        if (this.body) {
            this.body.setVelocity(0, 0);
        }
    }
    
    update(delta, time = 0) {
        if (!this.active) return;
        
        // Оновлюємо таймер заморозки
        if (this.isFrozen) {
            this.frozenTimer -= delta;
            if (this.frozenTimer <= 0) {
                this.isFrozen = false;
                this.frozenTimer = 0;
            } else {
                // Під час заморозки не рухаємося
                if (this.body) {
                    this.body.setVelocity(0, 0);
                }
                return;
            }
        }
        
        // Оновлюємо дебафи швидкості
        this.updateSpeedDebuffs(delta);
        
        // Оновлюємо втрату лока
        this.updateLostLock(delta);
        
        if (!this.target) return;
        
        // Оновлюємо FSM
        this.updateState(delta, time);
        
        // Базова логіка руху (перевизначається в підкласах)
        this.moveTowardsTarget(delta, time);
        
        // Оновлюємо візуалізацію (анімації)
        this.updateVisuals();
    }
    
    /**
     * Оновлює FSM стан ворога
     */
    updateState(delta, time) {
        if (!this.target) {
            this.state = CHASER_STATES.IDLE;
            return;
        }
        
        const distanceToTarget = Phaser.Math.Distance.Between(
            this.x, this.y, 
            this.target.x, this.target.y
        );
        
        // Перехід між станами
        const attackDistance = 50; // Дистанція для атаки (зменшено, щоб не переходили в ATTACK коли є перешкоди)
        const detectDistance = 1000; // Дистанція виявлення гравця
        
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
    
    updateLostLock(delta) {
        // Оновлюємо таймер втрати лока
        if (this.lostLockTimer > 0) {
            this.lostLockTimer -= delta;
            if (this.lostLockTimer <= 0) {
                this.lostLock = false;
                this.lostLockTimer = 0;
                this.lastKnownPlayerPos = null;
            }
        }
    }
    
    /**
     * Застосовує дебаф швидкості (для бонусу Жарт)
     * @param {number} multiplier - Множник швидкості (0.7 = 70%)
     * @param {number} duration - Тривалість дебафу (мс)
     */
    applySpeedDebuff(multiplier, duration) {
        this.speedDebuffs.push({
            multiplier: multiplier,
            duration: duration
        });
    }
    
    /**
     * Втрачає лок на гравця (для бонусу Димова хмарка)
     * @param {number} playerX - X позиція гравця
     * @param {number} playerY - Y позиція гравця
     * @param {number} duration - Тривалість втрати лока (мс)
     */
    loseLock(playerX, playerY, duration) {
        this.lostLock = true;
        this.lostLockTimer = duration;
        this.lastKnownPlayerPos = { x: playerX, y: playerY };
    }
    
    /**
     * Отримує поточний множник швидкості з урахуванням дебафів
     * @returns {number}
     */
    getSpeedMultiplier() {
        if (this.speedDebuffs.length === 0) {
            return 1.0;
        }
        
        // Застосовуємо найнижчий множник
        let minMultiplier = 1.0;
        for (const debuff of this.speedDebuffs) {
            minMultiplier = Math.min(minMultiplier, debuff.multiplier);
        }
        return minMultiplier;
    }
    
    /**
     * Перевіряє чи є прямий шлях до цілі без перешкод
     * @returns {boolean}
     */
    checkDirectPathToTarget() {
        if (!this.target || !this.navigationSystem) {
            return false; // Немає системи - використовуємо pathfinding
        }
        
        // Перевіряємо чи є перешкоди на прямому шляху
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 16) {
            // Дуже близько (менше тайла) - вважаємо що шлях прямий
            return true;
        }
        
        // Використовуємо більше точок для перевірки (кожні ~16 пікселів)
        const stepSize = 16; // Перевіряємо кожні 16 пікселів (половина тайла)
        const steps = Math.ceil(distance / stepSize);
        
        // Перевіряємо кілька точок на шляху (мінімум 5, максимум 20)
        const numChecks = Math.max(5, Math.min(steps, 20));
        
        for (let i = 1; i <= numChecks; i++) {
            const t = i / numChecks;
            const checkX = this.x + dx * t;
            const checkY = this.y + dy * t;
            
            // Перевіряємо чи точка прохідна через NavigationSystem
            const tile = this.navigationSystem.worldToTile(checkX, checkY);
            
            // Перевіряємо також сусідні тайли для надійності
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
                return false; // Знайдено перешкоду
            }
        }
        
        return true; // Прямий шлях без перешкод
    }
    
    /**
     * Оновлює anti-stuck систему
     */
    updateAntiStuck(delta) {
        if (!this.body) return;
        
        const distanceMoved = Phaser.Math.Distance.Between(
            this.lastPosition.x, this.lastPosition.y,
            this.x, this.y
        );
        
        // Перевіряємо чи ворог намагається рухатися, але не рухається
        const velocity = Math.sqrt(
            this.body.velocity.x * this.body.velocity.x + 
            this.body.velocity.y * this.body.velocity.y
        );
        
        const isMoving = velocity > 10; // Має швидкість
        const hasMoved = distanceMoved >= this.stuckDistanceThreshold; // Реально рухається
        
        // Якщо намагається рухатися, але не рухається - це застрягання
        if (isMoving && !hasMoved) {
            this.stuckTimer += delta;
            
            if (this.stuckTimer >= this.stuckThreshold) {
                // Ворог застряг - інвалідовуємо шлях і перераховуємо
                this.invalidatePath();
                this.stuckTimer = 0;
                
                // Скидаємо velocity щоб не бути в нескінченному циклі
                if (this.body) {
                    this.body.setVelocity(0, 0);
                }
            }
        } else {
            // Ворог рухається - скидаємо таймер
            this.stuckTimer = 0;
        }
        
        // Зберігаємо поточну позицію
        this.lastPosition.x = this.x;
        this.lastPosition.y = this.y;
    }
    
    /**
     * Інвалідовує поточний шлях (для перерахунку)
     */
    invalidatePath() {
        this.currentPath = null;
        this.pathIndex = 0;
        this.currentWaypoint = null;
    }
    
    /**
     * Перевіряє чи потрібен перерахунок шляху
     * @param {number} time - Поточний час в мс
     * @returns {boolean}
     */
    shouldRecalculatePath(time) {
        if (!this.target || !this.navigationSystem) {
            return false;
        }
        
        // Перерахунок якщо гравець змінив tile
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
        
        // Перерахунок якщо минуло >= 400ms з останнього
        if (time - this.lastPathRecalculation >= this.pathRecalculationInterval) {
            return true;
        }
        
        // Перерахунок якщо немає шляху
        if (!this.currentPath || this.currentPath.length === 0) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Обчислює шлях до гравця
     * @param {number} time - Поточний час в мс
     */
    calculatePath(time) {
        if (!this.target || !this.navigationSystem) {
            this.currentPath = null;
            return;
        }
        
        const fromTile = this.navigationSystem.worldToTile(this.x, this.y);
        const toTile = this.navigationSystem.worldToTile(this.target.x, this.target.y);
        
        // Знаходимо шлях через A*
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
            // Шлях не знайдено - інвалідовуємо
            this.currentPath = null;
            this.pathIndex = 0;
            this.currentWaypoint = null;
        }
    }
    
    /**
     * Оновлює поточний waypoint з path
     */
    updateCurrentWaypoint() {
        if (!this.currentPath || this.currentPath.length === 0) {
            this.currentWaypoint = null;
            return;
        }
        
        // Переходимо до наступного waypoint якщо досягли поточного
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
            
            // Якщо досягли waypoint (радіус досягнення = половина тайла)
            if (distanceToWaypoint < this.navigationSystem.tileSize / 2) {
                this.pathIndex++;
            } else {
                this.currentWaypoint = waypointWorld;
                break;
            }
        }
        
        // Якщо досягли кінця шляху
        if (this.pathIndex >= this.currentPath.length) {
            this.currentWaypoint = null;
        }
    }
    
    /**
     * Обчислює separation force від інших ворогів
     * @param {Array<Chaser>} otherChasers - Масив інших ворогів
     */
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
            
            // Якщо інший ворог близько
            if (distance > 0 && distance < this.separationRadius) {
                // Нормалізуємо напрямок
                const normalizedX = dx / distance;
                const normalizedY = dy / distance;
                
                // Сила обернено пропорційна відстані
                const strength = this.separationStrength * (1 - distance / this.separationRadius);
                
                this.separationForce.x += normalizedX * strength;
                this.separationForce.y += normalizedY * strength;
                separationCount++;
            }
        }
        
        // Нормалізуємо separation force
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
    
    /**
     * Рухається до поточного waypoint
     * @param {number} delta - Час з останнього оновлення (мс)
     */
    moveToWaypoint(delta) {
        if (!this.currentWaypoint) {
            // Немає waypoint - не рухаємося
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
            
            // Додаємо separation force (щоб не злипалися)
            // Separation force додається як процент від швидкості
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
        // Якщо втратив лок - рухаємося до останньої відомої позиції
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
        
        // Оновлюємо anti-stuck
        this.updateAntiStuck(delta);
        
        // IDLE стан - не рухаємося
        if (this.state === CHASER_STATES.IDLE) {
            if (this.body) {
                this.body.setVelocity(0, 0);
            }
            return;
        }
        
        // ATTACK стан - спочатку перевіряємо чи є прямий шлях, якщо ні - використовуємо pathfinding
        if (this.state === CHASER_STATES.ATTACK) {
            // ЗАВЖДИ перевіряємо чи є прямий шлях до гравця без перешкод
            const hasDirectPath = this.checkDirectPathToTarget();
            
            if (hasDirectPath) {
                // Прямий рух до гравця (для атаки) - тільки якщо немає перешкод
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    const speedMultiplier = this.getSpeedMultiplier();
                    let velocityX = (dx / distance) * this.speed * speedMultiplier;
                    let velocityY = (dy / distance) * this.speed * speedMultiplier;
                    
                    // Додаємо separation force
                    velocityX += velocityX * this.separationForce.x;
                    velocityY += velocityY * this.separationForce.y;
                    
                    this.setVelocity(velocityX, velocityY);
                }
            } else {
                // Немає прямого шляху - ОБОВ'ЯЗКОВО використовуємо pathfinding
                // Інвалідовуємо поточний шлях і перераховуємо
                if (!this.currentPath || this.shouldRecalculatePath(time)) {
                    this.calculatePath(time);
                }
                
                // Якщо немає шляху - спробуємо ще раз
                if (!this.currentPath || this.currentPath.length === 0) {
                    this.calculatePath(time);
                }
                
                this.updateCurrentWaypoint();
                
                // Рухаємося до waypoint
                if (this.currentWaypoint) {
                    this.moveToWaypoint(delta);
                } else {
                    // Якщо все ще немає waypoint - зупиняємося і чекаємо
                    if (this.body) {
                        this.body.setVelocity(0, 0);
                    }
                }
            }
            return;
        }
        
        // CHASE стан - waypoint-рух через NavigationSystem
        if (this.state === CHASER_STATES.CHASE) {
            // Перевіряємо чи потрібен перерахунок шляху
            if (this.shouldRecalculatePath(time)) {
                this.calculatePath(time);
            }
            
            // Якщо немає шляху - спробуємо знайти новий
            if (!this.currentPath || this.currentPath.length === 0) {
                this.calculatePath(time);
            }
            
            // Оновлюємо поточний waypoint
            this.updateCurrentWaypoint();
            
            // Якщо є waypoint - рухаємося до нього
            if (this.currentWaypoint) {
                this.moveToWaypoint(delta);
            } else {
                // Немає waypoint - спробуємо прямий рух (якщо немає перешкод)
                const hasDirectPath = this.checkDirectPathToTarget();
                if (hasDirectPath) {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const speedMultiplier = this.getSpeedMultiplier();
                        let velocityX = (dx / distance) * this.speed * speedMultiplier;
                        let velocityY = (dy / distance) * this.speed * speedMultiplier;
                        
                        // Додаємо separation force
                        velocityX += velocityX * this.separationForce.x;
                        velocityY += velocityY * this.separationForce.y;
                        
            this.setVelocity(velocityX, velocityY);
                    }
                } else {
                    // Немає прямого шляху і немає waypoint - зупиняємося і чекаємо перерахунку
                    if (this.body) {
                        this.body.setVelocity(0, 0);
                    }
                }
            }
        }
    }
    
    /**
     * Оновлює візуалізацію (анімації) залежно від стану руху
     */
    updateVisuals() {
        // Тільки для Blocker та Sticker з текстурами
        if (this.type !== 'Blocker' && this.type !== 'Sticker') return;
        
        const prefix = this.type.toLowerCase(); // 'blocker' або 'sticker'
        
        // Визначаємо чи ворог рухається
        if (this.body) {
            const velocity = Math.sqrt(
                this.body.velocity.x * this.body.velocity.x + 
                this.body.velocity.y * this.body.velocity.y
            );
            this.isMovingChaser = velocity > 10; // Поріг руху
            
            // Визначаємо напрямок руху
            if (this.isMovingChaser) {
                const velX = this.body.velocity.x;
                const velY = this.body.velocity.y;
                
                // Визначаємо основний напрямок
                if (Math.abs(velX) > Math.abs(velY)) {
                    // Горизонтальний рух
                    this.lastDirection = velX > 0 ? 'right' : 'left';
                } else {
                    // Вертикальний рух
                    this.lastDirection = velY > 0 ? 'front' : 'rear';
                }
            }
        }
        
        // Якщо ворог рухається - показуємо анімацію бігу
        if (this.isMovingChaser && !this.isFrozen) {
            const animKey = `${prefix}_run_${this.lastDirection}`;
            if (!this.anims.isPlaying || this.anims.currentAnim.key !== animKey) {
                this.anims.play(animKey, true);
            }
        } else {
            // Якщо ворог стоїть - показуємо статичну позу
            const standingKey = `${prefix}_standing_${this.lastDirection}`;
            if (this.texture.key !== standingKey) {
                this.setTexture(standingKey);
                this.anims.stop(); // Зупиняємо анімацію бігу
            }
        }
        
        // Оновлюємо колір спрайта залежно від стану
        let tint = 0xffffff; // Білий (без зміни кольору) за замовчуванням
        
        if (this.isFrozen) {
            tint = 0x9b59b6; // Фіолетовий коли заморожений
        } else if (this.lostLock) {
            tint = 0x95a5a6; // Сірий коли втратив лок
        }
        
        this.setTint(tint);
    }
    
    destroy() {
        if (this.body) {
            this.body.destroy();
        }
        super.destroy();
    }
}

export default Chaser;
