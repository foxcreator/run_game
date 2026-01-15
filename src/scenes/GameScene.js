// GameScene - основна сцена гри
import Player from '../entities/Player.js';
import HUD from '../ui/HUD.js';
import Minimap from '../ui/Minimap.js';
import CaptureSystem from '../systems/CaptureSystem.js';
import TilemapSystem from '../systems/TilemapSystem.js';
import PathfindingSystem from '../systems/PathfindingSystem.js';
import SoftCrowd from '../entities/SoftCrowd.js';
import PuddleSlip from '../entities/PuddleSlip.js';
import TapeGate from '../entities/TapeGate.js';
import Car from '../entities/Car.js';
import PaperStack from '../entities/PaperStack.js';
import ChaserBlocker from '../entities/ChaserBlocker.js';
import ChaserSticker from '../entities/ChaserSticker.js';
import { GAME_CONFIG } from '../config/gameConfig.js';

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }
    
    preload() {
        // Завантажуємо текстуру кіоска (якщо не завантажена в BootScene)
        if (!this.textures.exists('kiosk')) {
            this.load.image('kiosk', './src/assets/textures/kiosk.png');
        }
    }

    create() {
        // Розміри світу (1км x 1км = 4000x4000 пікселів, масштаб 1px = 0.25м)
        this.worldWidth = 4000;
        this.worldHeight = 4000;
        
        // Встановлюємо межі світу для фізики
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Створюємо tilemap систему
        try {
            this.tilemap = new TilemapSystem(this);
        } catch (error) {
            console.error('Помилка створення tilemap:', error);
            console.error('Stack trace:', error.stack);
            // Показуємо помилку на екрані з деталями
            const errorText = `Помилка завантаження карти:\n${error.message}`;
            this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 
                errorText, { fontSize: '20px', fill: '#ff0000', align: 'center' })
                .setOrigin(0.5);
            return;
        }
        
        // Створюємо систему обходу перешкод (pathfinding)
        this.pathfindingSystem = new PathfindingSystem(this.tilemap);
        

        // Знаходимо прохідний тайл для старту гравця (біля центру)
        const startPos = this.findWalkablePosition(this.worldWidth / 2, this.worldHeight / 2);
        this.player = new Player(this, startPos.x, startPos.y);
        
        // Ініціалізуємо час останнього зіткнення з кіоском
        this.player.lastKioskCollisionTime = 0;
        
        // Налаштовуємо камеру для слідкування за гравцем
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1); // Плавне слідкування
        this.cameras.main.setDeadzone(100, 100); // Мертва зона для плавнішого руху
        
        // Створюємо систему захоплення
        this.captureSystem = new CaptureSystem(this);
        
        // Створюємо HUD (залишаємо на фіксованій позиції екрану)
        // HUD створюється після tilemap, щоб бути поверх кіосків
        this.hud = new HUD(this);
        this.hud.create(this.player);
        this.hud.setCaptureSystem(this.captureSystem);
        
        // Створюємо міні-карту
        try {
            this.minimap = new Minimap(this, this.tilemap, this.player);
        } catch (error) {
            console.error('Помилка створення міні-карти:', error);
            this.minimap = null;
        }
        
        // Масив переслідувачів (ворогів)
        this.chasers = [];
        
        // Створюємо початкових ворогів
        this.spawnInitialChasers();
        
        // Масив перешкод
        this.obstacles = [];
        
        // Масив пікапів (монети)
        this.pickups = [];
        
        // Створюємо перешкоди на карті
        this.spawnObstacles();
        
        // Налаштовуємо колізії між гравцем та перешкодами
        this.setupObstacleCollisions();
        
        // Налаштовуємо колізії між автомобілями та ворогами
        this.setupCarCollisions();
        
        // Налаштовуємо колізії між гравцем та пікапами
        this.setupPickupCollisions();
        
        // Гроші за забіг
        this.runMoney = 0;
        
        // Налаштовуємо колізії між гравцем та ворогами
        this.setupChaserCollisions();
        
        // Таймер виживання
        this.timeSurvived = 0;
        this.score = 0;
    }
    
    spawnObstacles() {
        // Спавнимо різні типи перешкод на карті
        const obstacleCounts = {
            'SoftCrowd': 8,      // Черги людей
            'PuddleSlip': 0,    // Калюжі генеруються окремо
            'TapeGate': 6,       // Стрічки/шлагбауми
            'Car': 0,      // Автомобілі генеруються окремо
            'PaperStack': 5      // Пачки паперів
        };
        
        // Безпечний радіус навколо гравця
        const safeRadius = 90;
        
        // Спавнимо кожен тип перешкод
        for (const [type, count] of Object.entries(obstacleCounts)) {
            if (count === 0) continue; // Пропускаємо калюжі
            
            let spawned = 0;
            let attempts = 0;
            const maxAttempts = count * 20;
            
            while (spawned < count && attempts < maxAttempts) {
                attempts++;
                
                // Генеруємо випадкову позицію
                const x = Phaser.Math.Between(100, this.worldWidth - 100);
                const y = Phaser.Math.Between(100, this.worldHeight - 100);
                
                // Перевіряємо чи позиція не близько до гравця
                if (this.player) {
                    const distToPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
                    if (distToPlayer < safeRadius) {
                        continue;
                    }
                }
                
                // Перевіряємо чи позиція прохідна
                if (!this.tilemap.isWalkable(x, y)) {
                    continue;
                }
                
                // Перевіряємо чи немає перешкод поруч
                let tooClose = false;
                for (const obstacle of this.obstacles) {
                    const distance = Phaser.Math.Distance.Between(x, y, obstacle.x, obstacle.y);
                    const minDistance = 150; // Мінімальна відстань між перешкодами
                    if (distance < minDistance) {
                        tooClose = true;
                        break;
                    }
                }
                
                if (tooClose) {
                    continue;
                }
                
                // Створюємо перешкоду відповідного типу
                let obstacle;
                try {
                    switch (type) {
                        case 'SoftCrowd':
                            obstacle = new SoftCrowd(this, x, y);
                            break;
                        case 'TapeGate':
                            obstacle = new TapeGate(this, x, y);
                            break;
                        // Car генерується окремо
                        case 'PaperStack':
                            obstacle = new PaperStack(this, x, y);
                            break;
                        default:
                            continue;
                    }
                    
                    if (obstacle) {
                        this.obstacles.push(obstacle);
                        spawned++;
                    }
                } catch (error) {
                    console.error(`Помилка створення перешкоди ${type}:`, error);
                }
            }
        }
        
        // Генеруємо калюжі окремо (тільки на дорогах/тротуарах)
        this.spawnPuddles();
        
        // Налаштовуємо таймер для оновлення калюж
        this.puddleUpdateTimer = 0;
        this.puddleUpdateInterval = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.RESPAWN_INTERVAL;
        
        // Генеруємо автомобілі окремо
        this.spawnCars();
        
        // Налаштовуємо таймер для спавну нових авто
        this.carSpawnTimer = 0;
        this.carSpawnInterval = GAME_CONFIG.OBSTACLES.MOVING_BUS.SPAWN_INTERVAL;
    }
    
    spawnPuddles() {
        // Видаляємо всі існуючі калюжі
        const puddlesToRemove = this.obstacles.filter(obs => obs instanceof PuddleSlip);
        for (const puddle of puddlesToRemove) {
            if (puddle.active) {
                puddle.destroy();
            }
            const index = this.obstacles.indexOf(puddle);
            if (index > -1) {
                this.obstacles.splice(index, 1);
            }
        }
        
        // Генеруємо нову кількість калюж
        const minCount = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.MIN_COUNT;
        const maxCount = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.MAX_COUNT;
        const targetCount = Phaser.Math.Between(minCount, maxCount);
        
        const sizeOptions = GAME_CONFIG.OBSTACLES.PUDDLE_SLIP.SIZE_OPTIONS;
        const tileSize = 32;
        
        let spawned = 0;
        let attempts = 0;
        const maxAttempts = targetCount * 50; // Більше спроб для доріг/тротуарів
        
        while (spawned < targetCount && attempts < maxAttempts) {
            attempts++;
            
            // Вибираємо випадковий розмір
            const sizeInTiles = Phaser.Math.RND.pick(sizeOptions);
            
            // Генеруємо випадкову позицію
            const x = Phaser.Math.Between(50, this.worldWidth - 50);
            const y = Phaser.Math.Between(50, this.worldHeight - 50);
            
            // Перевіряємо чи вся область (розмір калюжі) є дорогою або тротуаром
            if (!this.tilemap.isAreaRoadOrSidewalk(x, y, sizeInTiles)) {
                continue;
            }
            
            // Перевіряємо чи позиція не близько до гравця
            if (this.player) {
                const distToPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
                if (distToPlayer < 100) {
                    continue;
                }
            }
            
            // Перевіряємо чи немає інших перешкод поруч
            let tooClose = false;
            for (const obstacle of this.obstacles) {
                if (obstacle instanceof PuddleSlip) continue; // Ігноруємо інші калюжі
                const distance = Phaser.Math.Distance.Between(x, y, obstacle.x, obstacle.y);
                if (distance < 100) {
                    tooClose = true;
                    break;
                }
            }
            
            if (tooClose) {
                continue;
            }
            
            // Створюємо калюжу
            try {
                const puddle = new PuddleSlip(this, x, y, sizeInTiles);
                if (puddle) {
                    this.obstacles.push(puddle);
                    spawned++;
                }
            } catch (error) {
                console.error('Помилка створення калюжі:', error);
            }
        }
        
    }
    
    spawnCars() {
        // Видаляємо всі існуючі авто
        const carsToRemove = this.obstacles.filter(obs => obs instanceof Car);
        for (const car of carsToRemove) {
            if (car.active) {
                car.destroy();
            }
            const index = this.obstacles.indexOf(car);
            if (index > -1) {
                this.obstacles.splice(index, 1);
            }
        }
        
        // Генеруємо початкову кількість авто
        const minCount = GAME_CONFIG.OBSTACLES.MOVING_BUS.MIN_COUNT;
        const maxCount = GAME_CONFIG.OBSTACLES.MOVING_BUS.MAX_COUNT;
        const targetCount = Phaser.Math.Between(minCount, maxCount);
        
        for (let i = 0; i < targetCount; i++) {
            this.spawnSingleCar();
        }
        
    }
    
    spawnSingleCar() {
        // Генеруємо випадкову позицію на карті
        let spawnX = Phaser.Math.Between(100, this.worldWidth - 100);
        let spawnY = Phaser.Math.Between(100, this.worldHeight - 100);
        
        // Шукаємо позицію на дорозі (сірий тайл, тільки дорога)
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (this.tilemap.isRoad(spawnX, spawnY)) {
                break;
            }
            
            // Генеруємо нову позицію
            spawnX = Phaser.Math.Between(100, this.worldWidth - 100);
            spawnY = Phaser.Math.Between(100, this.worldHeight - 100);
            attempts++;
        }
        
        // Якщо не знайшли дорогу - використовуємо поточну позицію
        // (Car сам знайде найближчу дорогу)
        
        // Створюємо авто
        try {
            const car = new Car(this, spawnX, spawnY);
            if (car) {
                this.obstacles.push(car);
            }
        } catch (error) {
            console.error('Помилка створення автомобіля:', error);
        }
    }
    
    setupObstacleCollisions() {
        // Налаштовуємо колізії між гравцем та перешкодами
        this.physics.add.overlap(
            this.player,
            this.obstacles,
            this.handleObstacleCollision,
            null,
            this
        );
    }
    
    setupPickupCollisions() {
        // Налаштовуємо колізії між гравцем та пікапами (монетами)
        // Це буде викликатися при оновленні пікапів
    }
    
    handlePickupCollision(player, pickup) {
        if (!pickup.active) return;
        
        // Якщо це монета (перевіряємо через type або метод)
        if (pickup.value !== undefined && pickup.collect) {
            // Додаємо гроші
            this.runMoney += pickup.value;
            
            // Видаляємо монету
            pickup.collect();
            
            // Видаляємо з масиву
            const index = this.pickups.indexOf(pickup);
            if (index > -1) {
                this.pickups.splice(index, 1);
            }
        }
    }
    
    handleObstacleCollision(player, obstacle) {
        if (!obstacle.active) return;
        
        // Спеціальна обробка для автомобілів
        if (obstacle instanceof Car) {
            obstacle.onCollisionWithEntity(player);
            return;
        }
        
        // Викликаємо метод обробки колізії перешкоди
        if (obstacle.onPlayerCollision) {
            obstacle.onPlayerCollision(player);
        }
    }
    
    setupCarCollisions() {
        // Налаштовуємо колізії між автомобілями та ворогами
        // Цей метод буде викликатися в update() для перевірки колізій
    }
    
    handleCarChaserCollision(car, chaser) {
        if (!car.active || !chaser || !chaser.active) return;
        
        // Автомобіль відкидає ворога
        car.onCollisionWithEntity(chaser);
    }
    
    checkCarCollisions() {
        // Перевіряємо колізії між авто та гравцем/ворогами
        const cars = this.obstacles.filter(obs => obs instanceof Car && obs.active);
        
        if (cars.length === 0) return;
        
        // Колізії з гравцем (вже обробляються через handleObstacleCollision)
        // Колізії з ворогами
        for (const car of cars) {
            if (!car.active) continue;
            
            // Перевіряємо колізію з гравцем
            if (this.player && this.player.active && !this.player.isFrozen) {
                const distance = Phaser.Math.Distance.Between(car.x, car.y, this.player.x, this.player.y);
                const minDistance = 40; // Радіус авто + радіус гравця
                if (distance < minDistance) {
                    car.onCollisionWithEntity(this.player);
                }
            }
            
            // Перевіряємо колізії з ворогами
            for (const chaser of this.chasers) {
                if (!chaser || !chaser.active || chaser.isFrozen) continue;
                
                const distance = Phaser.Math.Distance.Between(car.x, car.y, chaser.x, chaser.y);
                const minDistance = 40; // Радіус авто + радіус ворога
                if (distance < minDistance) {
                    car.onCollisionWithEntity(chaser);
                }
            }
        }
    }
    
    spawnInitialChasers() {
        // Спочатку спавнимо початкових ворогів
        const initialCount = GAME_CONFIG.CHASERS.SPAWN.INITIAL_COUNT;
        
        // Розподіляємо ворогів між типами (50% Blocker, 50% Sticker)
        const blockerCount = Math.floor(initialCount / 2);
        const stickerCount = initialCount - blockerCount;
        
        // Створюємо Blockers
        for (let i = 0; i < blockerCount; i++) {
            const chaser = this.spawnChaser('Blocker');
            if (!chaser) {
                console.warn(`Не вдалося заспавнити Blocker ${i + 1}`);
            }
        }
        
        // Створюємо Stickers
        for (let i = 0; i < stickerCount; i++) {
            const chaser = this.spawnChaser('Sticker');
            if (!chaser) {
                console.warn(`Не вдалося заспавнити Sticker ${i + 1}`);
            }
        }
    }
    
    spawnChaser(type) {
        // Знаходимо позицію для спавну (подалі від гравця)
        const spawnConfig = GAME_CONFIG.CHASERS.SPAWN;
        let attempts = 0;
        const maxAttempts = spawnConfig.MAX_SPAWN_ATTEMPTS;
        let spawnX, spawnY;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            // Генеруємо позицію на відстані від гравця
            const angle = Math.random() * Math.PI * 2;
            const distance = Phaser.Math.Between(
                spawnConfig.MIN_DISTANCE_FROM_PLAYER,
                spawnConfig.MAX_DISTANCE_FROM_PLAYER
            );
            spawnX = this.player.x + Math.cos(angle) * distance;
            spawnY = this.player.y + Math.sin(angle) * distance;
            
            // Перевіряємо межі світу
            if (spawnX < 50 || spawnX > this.worldWidth - 50 ||
                spawnY < 50 || spawnY > this.worldHeight - 50) {
                continue;
            }
            
            // Перевіряємо чи позиція прохідна
            if (!this.tilemap.isWalkable(spawnX, spawnY)) {
                continue;
            }
            
            // Перевіряємо чи немає інших ворогів поруч
            let tooClose = false;
            for (const chaser of this.chasers) {
                if (chaser && chaser.active) {
                    const dist = Phaser.Math.Distance.Between(spawnX, spawnY, chaser.x, chaser.y);
                    if (dist < spawnConfig.MIN_DISTANCE_BETWEEN) {
                        tooClose = true;
                        break;
                    }
                }
            }
            
            if (tooClose) {
                continue;
            }
            
            // Знайшли валідну позицію
            break;
        }
        
        if (attempts >= maxAttempts) {
            // Не знайшли позицію - використовуємо позицію гравця + відстань
            const angle = Math.random() * Math.PI * 2;
            const distance = (spawnConfig.MIN_DISTANCE_FROM_PLAYER + spawnConfig.MAX_DISTANCE_FROM_PLAYER) / 2;
            spawnX = this.player.x + Math.cos(angle) * distance;
            spawnY = this.player.y + Math.sin(angle) * distance;
            
            // Перевіряємо межі світу для fallback позиції
            spawnX = Phaser.Math.Clamp(spawnX, 50, this.worldWidth - 50);
            spawnY = Phaser.Math.Clamp(spawnY, 50, this.worldHeight - 50);
            
            // Якщо fallback позиція теж не прохідна, шукаємо найближчу прохідну
            if (!this.tilemap.isWalkable(spawnX, spawnY)) {
                const fallbackPos = this.findWalkablePosition(spawnX, spawnY);
                spawnX = fallbackPos.x;
                spawnY = fallbackPos.y;
            }
        }
        
        // Перевіряємо чи позиція все ще валідна перед створенням
        if (!this.tilemap.isWalkable(spawnX, spawnY)) {
            console.warn(`Не вдалося знайти валідну позицію для ${type} на (${spawnX}, ${spawnY})`);
            return null;
        }
        
        // Створюємо ворога
        let chaser;
        if (type === 'Blocker') {
            chaser = new ChaserBlocker(this, spawnX, spawnY);
        } else if (type === 'Sticker') {
            chaser = new ChaserSticker(this, spawnX, spawnY);
            chaser.setCaptureSystem(this.captureSystem);
        } else {
            return null;
        }
        
        chaser.setTarget(this.player);
        chaser.setPathfindingSystem(this.pathfindingSystem);
        this.chasers.push(chaser);
        
        return chaser;
    }
    
    setupChaserCollisions() {
        // Налаштовуємо колізії між гравцем та ворогами
        this.physics.add.overlap(
            this.player,
            this.chasers,
            this.handleChaserCollision,
            null,
            this
        );
    }
    
    handleChaserCollision(player, chaser) {
        if (!chaser.active) return;
        
        // Обробка колізії з Sticker (удар)
        if (chaser.type === 'Sticker' && chaser.onHitPlayer) {
            chaser.onHitPlayer();
        }
        
        // Blocker просто блокує шлях (фізична колізія)
    }
    
    findWalkablePosition(centerX, centerY) {
        // Шукаємо прохідний тайл біля центру
        const searchRadius = 50; // Радіус пошуку в тайлах
        const tile = this.tilemap.worldToTile(centerX, centerY);
        
        // Спочатку перевіряємо центр
        if (this.tilemap.isWalkable(centerX, centerY)) {
            return { x: centerX, y: centerY };
        }
        
        // Якщо центр не прохідний, шукаємо по спіралі
        for (let radius = 1; radius <= searchRadius; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Перевіряємо тільки периметр поточного радіусу
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    
                    const checkTile = { x: tile.x + dx, y: tile.y + dy };
                    const worldPos = this.tilemap.tileToWorld(checkTile.x, checkTile.y);
                    
                    if (this.tilemap.isWalkable(worldPos.x, worldPos.y)) {
                        return worldPos;
                    }
                }
            }
        }
        
        // Якщо не знайшли, повертаємо центр
        return { x: centerX, y: centerY };
    }
    
    update(time, delta) {
        // Оновлення гравця
        if (this.player) {
            this.player.update(time, delta);
            
            // Перевірка колізій гравця з тайлами
            this.checkTilemapCollisions();
        }
        
        // Оновлення системи захоплення
        if (this.captureSystem && this.player) {
            this.captureSystem.update(delta, this.player, this.chasers);
            
            // Перевірка програшу (capture досяг 100)
            if (this.captureSystem.isMaxed()) {
                this.handleGameOver();
            }
        }
        
        // Оновлення таймера виживання
        this.timeSurvived += delta / 1000; // в секундах
        
        // Оновлення перешкод
        for (const obstacle of this.obstacles) {
            if (obstacle.active && obstacle.update) {
                obstacle.update(delta);
            }
        }
        
        // Оновлення пікапів (монет)
        for (const pickup of this.pickups) {
            if (pickup.active && pickup.update) {
                pickup.update(delta);
            }
        }
        
        // Перевірка колізій з пікапами
        if (this.pickups.length > 0) {
            this.physics.overlap(
                this.player,
                this.pickups,
                this.handlePickupCollision,
                null,
                this
            );
        }
        
        // Оновлення ворогів
        for (const chaser of this.chasers) {
            if (chaser && chaser.active) {
                chaser.update(delta);
                // Перевіряємо колізії ворогів з тайлами карти
                this.checkChaserTilemapCollisions(chaser);
                this.checkChaserChaserCollisions(chaser);
            }
        }
        
        // Оновлення HUD
        if (this.hud) {
            this.hud.update();
            // Переконаємося, що HUD завжди поверх всього
            this.children.bringToTop(this.hud.staminaBarBg);
            this.children.bringToTop(this.hud.staminaBar);
            this.children.bringToTop(this.hud.staminaText);
            this.children.bringToTop(this.hud.dashCooldownBg);
            this.children.bringToTop(this.hud.dashCooldownBar);
            this.children.bringToTop(this.hud.dashText);
            this.children.bringToTop(this.hud.captureBarBg);
            this.children.bringToTop(this.hud.captureBar);
            this.children.bringToTop(this.hud.captureText);
        }
        
        // Оновлення міні-карти
        if (this.minimap) {
            this.minimap.update();
        }
        
        // Оновлення видимості тайлів (culling для оптимізації)
        if (this.tilemap && this.tilemap.updateVisibility) {
            this.tilemap.updateVisibility(time);
        }
        
        // Оновлення калюж кожні 30 секунд
        if (this.puddleUpdateTimer !== undefined) {
            this.puddleUpdateTimer += delta;
            if (this.puddleUpdateTimer >= this.puddleUpdateInterval) {
                this.puddleUpdateTimer = 0;
                this.spawnPuddles();
            }
        }
        
        // Оновлення автомобілів та спавн нових
        if (this.carSpawnTimer !== undefined) {
            this.carSpawnTimer += delta;
            
            // Перевіряємо кількість активних авто
            const activeCars = this.obstacles.filter(obs => obs instanceof Car && obs.active);
            const minCars = GAME_CONFIG.OBSTACLES.MOVING_BUS.MIN_COUNT;
            const maxCars = GAME_CONFIG.OBSTACLES.MOVING_BUS.MAX_COUNT;
            
            // Якщо менше мінімуму - спавнимо одразу
            if (activeCars.length < minCars) {
                // Спавнимо кілька авто одразу, щоб досягти мінімуму
                const carsToSpawn = minCars - activeCars.length;
                for (let i = 0; i < carsToSpawn; i++) {
                    this.spawnSingleCar();
                }
                this.carSpawnTimer = 0;
            }
            // Якщо менше максимуму та пройшов інтервал - спавнимо нове авто
            else if (activeCars.length < maxCars && this.carSpawnTimer >= this.carSpawnInterval) {
                this.carSpawnTimer = 0;
                this.spawnSingleCar();
            }
        }
        
        // Перевіряємо колізії авто з гравцем та ворогами
        this.checkCarCollisions();
    }
    
    checkChaserTilemapCollisions(chaser) {
        if (!this.tilemap || !chaser) return;
        
        const chaserX = chaser.x;
        const chaserY = chaser.y;
        const chaserRadius = GAME_CONFIG.CHASERS.COMMON.COLLISION_RADIUS;
        
        // Перевіряємо колізії ворога з тайлами
        const checkPoints = [
            { x: chaserX, y: chaserY },
            { x: chaserX + chaserRadius, y: chaserY },
            { x: chaserX - chaserRadius, y: chaserY },
            { x: chaserX, y: chaserY + chaserRadius },
            { x: chaserX, y: chaserY - chaserRadius },
        ];
        
        let hasCollision = false;
        for (const point of checkPoints) {
            if (this.tilemap.hasCollision(point.x, point.y)) {
                hasCollision = true;
                break;
            }
        }
        
        if (hasCollision) {
            // Блокуємо рух ворога в напрямку колізії
            const currentVelocityX = chaser.body.velocity.x;
            const currentVelocityY = chaser.body.velocity.y;
            
            // Перевіряємо горизонтальний рух
            if (currentVelocityX !== 0) {
                const checkX = chaserX + (currentVelocityX > 0 ? chaserRadius : -chaserRadius);
                if (this.tilemap.hasCollision(checkX, chaserY)) {
                    chaser.body.setVelocityX(0);
                }
            }
            
            // Перевіряємо вертикальний рух
            if (currentVelocityY !== 0) {
                const checkY = chaserY + (currentVelocityY > 0 ? chaserRadius : -chaserRadius);
                if (this.tilemap.hasCollision(chaserX, checkY)) {
                    chaser.body.setVelocityY(0);
                }
            }
        }
    }
    
    checkChaserChaserCollisions(chaser) {
        if (!chaser || !chaser.active) return;
        const minDistance = GAME_CONFIG.CHASERS.COMMON.MIN_DISTANCE_BETWEEN;
        const chaserRadius = GAME_CONFIG.CHASERS.COMMON.COLLISION_RADIUS;
        const chaserX = chaser.x;
        const chaserY = chaser.y;
        const currentVelX = chaser.body.velocity.x;
        const currentVelY = chaser.body.velocity.y;
        for (const other of this.chasers) {
            if (!other || !other.active || other === chaser) continue;
            const dx = chaserX - other.x;
            const dy = chaserY - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0 && distance < minDistance) {
                if (currentVelX !== 0) {
                    const nextX = chaserX + (currentVelX > 0 ? chaserRadius : -chaserRadius);
                    const distToOther = Math.sqrt((nextX - other.x) * (nextX - other.x) + (chaserY - other.y) * (chaserY - other.y));
                    if (distToOther < minDistance) {
                        chaser.body.setVelocityX(0);
                    }
                }
                if (currentVelY !== 0) {
                    const nextY = chaserY + (currentVelY > 0 ? chaserRadius : -chaserRadius);
                    const distToOther = Math.sqrt((chaserX - other.x) * (chaserX - other.x) + (nextY - other.y) * (nextY - other.y));
                    if (distToOther < minDistance) {
                        chaser.body.setVelocityY(0);
                    }
                }
            }
        }
    }
    
    checkTilemapCollisions() {
        if (!this.tilemap || !this.player) return;
        
        // Якщо гравець заморожений, утримуємо його на місці
        if (this.player.isFrozen) {
            // Під час заморозки утримуємо гравця на місці (вже відштовхнутому від кіоска)
            const frozenPos = this.player.getFrozenPosition();
            if (frozenPos) {
                this.player.setPosition(frozenPos.x, frozenPos.y);
            }
            this.player.body.setVelocity(0, 0);
            return; // Не перевіряємо інші колізії під час заморозки
        }
        
        // Перевіряємо чи гравець не в колізійному тайлі
        const playerX = this.player.x;
        const playerY = this.player.y;
        const playerRadius = 15; // Радіус гравця
        
        // Перевірка кількох точок навколо гравця для кращої колізії
        const checkPoints = [
            { x: playerX, y: playerY }, // Центр
            { x: playerX + playerRadius, y: playerY }, // Право
            { x: playerX - playerRadius, y: playerY }, // Ліво
            { x: playerX, y: playerY + playerRadius }, // Низ
            { x: playerX, y: playerY - playerRadius }, // Верх
        ];
        
        let hasCollision = false;
        let isKioskCollision = false;
        let collidedKiosk = null;
        
        // Спочатку перевіряємо колізії з кіосками (перевіряємо відстань до всіх кіосків)
        if (this.tilemap.activeKiosks && this.tilemap.activeKiosks.length > 0) {
            const kioskRadius = 20; // Радіус кіоска для колізії
            const playerRadius = 15; // Радіус гравця
            
            for (const kiosk of this.tilemap.activeKiosks) {
                if (!kiosk.sprite || !kiosk.sprite.active) continue;
                
                // Перевіряємо відстань від гравця до кіоска
                const distance = Phaser.Math.Distance.Between(playerX, playerY, kiosk.worldX, kiosk.worldY);
                const minDistance = kioskRadius + playerRadius;
                
                if (distance < minDistance) {
                    isKioskCollision = true;
                    hasCollision = true;
                    collidedKiosk = kiosk;
                    break;
                }
            }
        }
        
        // Якщо немає колізії з кіоском, перевіряємо інші колізії
        if (!isKioskCollision) {
            for (const point of checkPoints) {
                // Перевіряємо інші колізії (будівлі, вода)
                if (this.tilemap.hasCollision(point.x, point.y)) {
                    hasCollision = true;
                    break;
                }
            }
        }
        
        if (isKioskCollision && collidedKiosk) {
            // Використовуємо знайдений кіоск
            const kiosk = collidedKiosk;
            
            if (kiosk) {
                // Перевіряємо чи не було нещодавнього зіткнення з кіоском
                const currentTime = this.time.now;
                const timeSinceLastCollision = currentTime - this.player.lastKioskCollisionTime;
                
                // Якщо зіткнення з кіоском і минуло достатньо часу - заморожуємо
                if (timeSinceLastCollision >= GAME_CONFIG.KIOSKS.COOLDOWN) {
                    // Зберігаємо поточну позицію гравця (не відштовхуємо)
                    const currentPlayerX = this.player.x;
                    const currentPlayerY = this.player.y;
                    
                    // Поповнюємо стаміну до максимуму (купляємо енергетик)
                    this.player.restoreStamina();
                    
                    // Заморожуємо гравця на місці
                    this.player.freeze(GAME_CONFIG.KIOSKS.FREEZE_DURATION);
                    this.player.lastKioskCollisionTime = currentTime;
                    
                    // Блокуємо рух та залишаємо гравця на місці
                    this.player.body.setVelocity(0, 0);
                    this.player.setPosition(currentPlayerX, currentPlayerY);
                    
                    // Оновлюємо заморожену позицію
                    if (this.player.isFrozen) {
                        this.player.frozenPosition = { x: currentPlayerX, y: currentPlayerY };
                    }
                    
                    // Плануємо зникнення кіоска (трохи раніше закінчення заморозки)
                    const disappearDelay = GAME_CONFIG.KIOSKS.FREEZE_DURATION - GAME_CONFIG.KIOSKS.DISAPPEAR_BEFORE_FREEZE_END;
                    const respawnDelay = GAME_CONFIG.KIOSKS.RESPAWN_DELAY;
                    
                    // Зникає кіоск
                    this.time.delayedCall(disappearDelay, () => {
                        this.removeKiosk(kiosk.tileX, kiosk.tileY);
                    });
                    
                    // Респавн кіоска через 20 секунд
                    this.time.delayedCall(disappearDelay + respawnDelay, () => {
                        this.tilemap.spawnKioskAtRandomPosition();
                        // Оновлюємо міні-карту
                        if (this.minimap) {
                            this.minimap.refresh();
                        }
                    });
                } else {
                    // Якщо нещодавно було зіткнення, просто блокуємо рух без заморозки
                    this.player.body.setVelocity(0, 0);
                }
            }
        } else if (hasCollision) {
            // Для інших колізій (будівлі, огорожі) - блокуємо тільки напрямок, який веде в будівлю
            this.blockMovementIntoBuilding(playerX, playerY);
        }
    }
    
    blockMovementIntoBuilding(playerX, playerY) {
        // Блокуємо тільки той напрямок руху, який веде в будівлю
        const velocityX = this.player.body.velocity.x;
        const velocityY = this.player.body.velocity.y;
        const playerRadius = 15;
        
        let blockedX = velocityX;
        let blockedY = velocityY;
        
        // Перевіряємо колізію в напрямку руху
        if (velocityX > 0) {
            // Рух вправо - перевіряємо праву сторону
            if (this.tilemap.hasCollision(playerX + playerRadius, playerY)) {
                blockedX = 0;
            }
        } else if (velocityX < 0) {
            // Рух вліво - перевіряємо ліву сторону
            if (this.tilemap.hasCollision(playerX - playerRadius, playerY)) {
                blockedX = 0;
            }
        }
        
        if (velocityY > 0) {
            // Рух вниз - перевіряємо нижню сторону
            if (this.tilemap.hasCollision(playerX, playerY + playerRadius)) {
                blockedY = 0;
            }
        } else if (velocityY < 0) {
            // Рух вгору - перевіряємо верхню сторону
            if (this.tilemap.hasCollision(playerX, playerY - playerRadius)) {
                blockedY = 0;
            }
        }
        
        // Встановлюємо velocity тільки для дозволених напрямків
        this.player.body.setVelocity(blockedX, blockedY);
    }
    
    removeKiosk(tileX, tileY) {
        // Видаляємо кіоск
        this.tilemap.removeKiosk(tileX, tileY);
    }
    
    pushPlayerAwayFromKiosk() {
        // Відштовхуємо гравця від кіоска
        const playerX = this.player.x;
        const playerY = this.player.y;
        
        // Знаходимо найближчий кіоск
        let nearestKiosk = null;
        let minDistance = Infinity;
        
        if (this.tilemap.activeKiosks && this.tilemap.activeKiosks.length > 0) {
            for (const kiosk of this.tilemap.activeKiosks) {
                if (!kiosk.sprite || !kiosk.sprite.active) continue;
                
                const distance = Phaser.Math.Distance.Between(playerX, playerY, kiosk.worldX, kiosk.worldY);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestKiosk = kiosk;
                }
            }
        }
        
        if (!nearestKiosk) return;
        
        // Обчислюємо напрямок від кіоска до гравця
        const dx = playerX - nearestKiosk.worldX;
        const dy = playerY - nearestKiosk.worldY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;
        
        // Нормалізуємо напрямок
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // Відштовхуємо гравця на відстань 40 пікселів від кіоска
        const pushDistance = 40;
        const newX = nearestKiosk.worldX + dirX * (pushDistance + 20); // 20 - радіус кіоска
        const newY = nearestKiosk.worldY + dirY * (pushDistance + 20);
        
        // Перевіряємо чи нова позиція прохідна
        if (this.tilemap.isWalkable(newX, newY)) {
            this.player.setPosition(newX, newY);
            // Оновлюємо заморожену позицію
            if (this.player.isFrozen) {
                this.player.frozenPosition = { x: newX, y: newY };
            }
        } else {
            // Якщо напрямок не прохідний, шукаємо альтернативну позицію
            const tile = this.tilemap.worldToTile(playerX, playerY);
            const directions = [
                { x: 0, y: -1 }, { x: 0, y: 1 },  // Верх, низ
                { x: -1, y: 0 }, { x: 1, y: 0 }, // Ліво, право
                { x: -1, y: -1 }, { x: 1, y: -1 }, // Діагоналі
                { x: -1, y: 1 }, { x: 1, y: 1 }
            ];
            
            for (let radius = 1; radius <= 3; radius++) {
                for (const dir of directions) {
                    const checkTile = { 
                        x: tile.x + dir.x * radius, 
                        y: tile.y + dir.y * radius 
                    };
                    const worldPos = this.tilemap.tileToWorld(checkTile.x, checkTile.y);
                    
                    // Перевіряємо чи це не кіоск і не інша колізія
                    let isKiosk = false;
                    if (this.tilemap.activeKiosks) {
                        for (const kiosk of this.tilemap.activeKiosks) {
                            if (kiosk.tileX === checkTile.x && kiosk.tileY === checkTile.y) {
                                isKiosk = true;
                                break;
                            }
                        }
                    }
                    if (isKiosk) continue;
                    
                    if (!this.tilemap.hasCollision(worldPos.x, worldPos.y)) {
                        // Переміщуємо гравця на прохідну позицію
                        this.player.setPosition(worldPos.x, worldPos.y);
                        // Оновлюємо заморожену позицію
                        if (this.player.isFrozen) {
                            this.player.frozenPosition = { x: worldPos.x, y: worldPos.y };
                        }
                        return;
                    }
                }
            }
        }
    }
    
    handleGameOver() {
        // Перехід до ResultScene з даними
        this.scene.start('ResultScene', {
            score: this.score,
            moneyEarned: this.runMoney || 0,
            timeSurvived: this.timeSurvived
        });
    }
}

export default GameScene;