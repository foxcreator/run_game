# 📚 Технічна Документація - Втеча від ТЦК

**Версія:** beta v0.2.1  
**Дата оновлення:** Січень 2026  
**Engine:** Phaser 3.80.1

---

## 📋 Зміст

1. [Огляд Проекту](#огляд-проекту)
2. [Архітектура Проекту](#архітектура-проекту)
3. [Структура Файлів](#структура-файлів)
4. [Системи](#системи)
5. [Сцени](#сцени)
6. [Ігрові Об'єкти (Entities)](#ігрові-обєкти-entities)
7. [Конфігурація Гри](#конфігурація-гри)
8. [UI Компоненти](#ui-компоненти)
9. [Аудіо Система](#аудіо-система)
10. [Збереження Даних](#збереження-даних)
11. [Технічні Деталі](#технічні-деталі)

---

## 🎮 Огляд Проекту

### Концепція Гри
"Втеча від ТЦК" - це 2D аркадна гра про втечу від переслідувачів на карті міста. Гравець повинен збирати гроші, обмінювати їх на долари та уникати захоплення.

### Технічний Стек
- **Engine:** Phaser 3 (Canvas/WebGL рендерінг)
- **Мова:** JavaScript (ES6 модулі)
- **Аудіо:** Web Audio API через Phaser Sound Manager
- **Збереження:** localStorage (браузерний)
- **Карта:** Tilemap система з collision detection через піксельні дані

### Основні Механіки
1. **Рух гравця** - WASD/Стрілки, dash (Shift), slide (Space)
2. **Система захоплення** - повільне наростання при наближенні ворогів
3. **Економіка** - збір грошей (гривні) → обмін на долари в обмінниках
4. **Переслідування** - AI ворогів з навігацією по карті
5. **Перешкоди** - машини, стрічки, калюжі
6. **Бонуси** - скутери (прискорення), хмарки (заморозка ворогів)

---

## 🏗️ Архітектура Проекту

### Патерни Проектування

#### 1. **Scene Pattern** (Phaser сцени)
Гра розділена на окремі сцени, кожна відповідає за свою частину:
- `BootScene` - завантаження ресурсів
- `MenuScene` - головне меню
- `GameScene` - основна геймплейна сцена
- `ResultScene` - екран результатів
- `ShopScene` - магазин покупок

#### 2. **Entity Component Pattern**
Ігрові об'єкти наслідуються від базових класів Phaser:
- `Player extends Phaser.Physics.Arcade.Sprite`
- `Chaser extends Phaser.Physics.Arcade.Sprite`
- `Bonus extends Phaser.GameObjects.Container`

#### 3. **System Pattern**
Окремі системи управляють специфічними аспектами гри:
- `AudioManager` - централізоване управління звуками
- `CaptureSystem` - логіка захоплення гравця
- `NavigationSystem` - навігація для AI
- `SaveSystem` - збереження прогресу
- `TilemapSystem` - робота з картою

#### 4. **Observer Pattern**
Phaser Events для комунікації між компонентами:
```javascript
this.events.on('capture-complete', () => {...});
this.scene.events.on('shutdown', () => {...});
```

---

## 📁 Структура Файлів

```
busification_run/
├── index.html                  # Точка входу, HTML контейнер
├── src/
│   ├── main.js                 # Ініціалізація Phaser гри
│   ├── config/
│   │   └── gameConfig.js       # Всі налаштування гри
│   ├── scenes/                 # Сцени гри
│   │   ├── BootScene.js        # Завантаження ресурсів
│   │   ├── MenuScene.js        # Головне меню
│   │   ├── GameScene.js        # Основна гра (2000+ рядків)
│   │   ├── ResultScene.js      # Екран програшу
│   │   └── ShopScene.js        # Магазин
│   ├── entities/               # Ігрові об'єкти
│   │   ├── Player.js           # Гравець
│   │   ├── Chaser.js           # Базовий клас ворога
│   │   ├── ChaserBlocker.js    # Ворог-блокувальник
│   │   ├── ChaserSticker.js    # Ворог-атакувальник
│   │   ├── Car.js              # Машина-перешкода
│   │   ├── Obstacle.js         # Базова перешкода
│   │   ├── TapeGate.js         # Стрічка-перешкода
│   │   ├── PuddleSlip.js       # Калюжа (слизька)
│   │   ├── Coin.js             # Монета (гривня)
│   │   ├── Bonus.js            # Базовий клас бонусу
│   │   ├── Exchange.js         # Обмінник валюти
│   │   ├── PaperStack.js       # Стопка паперів
│   │   └── bonuses/
│   │       ├── Scooter.js      # Бонус: скутер
│   │       └── SmokeCloud.js   # Бонус: димова хмарка
│   ├── systems/                # Системи
│   │   ├── AudioManager.js     # Управління аудіо
│   │   ├── CaptureSystem.js    # Система захоплення
│   │   ├── NavigationSystem.js # Навігація для AI
│   │   ├── PathfindingSystem.js # A* пошук шляху
│   │   ├── SaveSystem.js       # Збереження даних
│   │   └── TilemapSystem.js    # Робота з картою
│   ├── ui/                     # UI компоненти
│   │   ├── HUD.js              # Головний UI (гроші, стаміна, capture)
│   │   └── Minimap.js          # Мінікарта
│   ├── utils/                  # Утиліти
│   │   ├── ButtonHelper.js     # Створення кнопок
│   │   └── SpriteManager.js    # Управління спрайтами
│   └── assets/                 # Ресурси
│       ├── textures/           # Зображення
│       ├── sounds/             # Звукові ефекти
│       └── music/              # Музика
```

---

## 🔧 Системи

### 1. AudioManager (`src/systems/AudioManager.js`)

**Призначення:** Централізоване управління всіма звуками та музикою в грі.

**Основні можливості:**
- Фонова музика з crossfade переходами
- Управління sound effects
- Збереження налаштувань в localStorage
- Динамічна зміна гучності
- Пауза/відновлення всіх звуків

**Ключові методи:**
```javascript
init()                          // Ініціалізація, відновлення налаштувань
startMusic()                    // Старт фонової музики
stopMusic()                     // Зупинка музики
pauseMusic() / resumeMusic()    // Пауза/відновлення
playSound(key, loop, volume)    // Відтворення звуку
stopSound(key)                  // Зупинка звуку
setMusicVolume(volume)          // Зміна гучності музики
setSoundsVolume(volume)         // Зміна гучності звуків
setMusicEnabled(enabled)        // Увімкнення/вимкнення музики
setSoundsEnabled(enabled)       // Увімкнення/вимкнення звуків
```

**Структура даних:**
```javascript
{
    musicVolume: 0.5,           // 0-1
    musicEnabled: true,
    soundsVolume: 0.7,
    soundsEnabled: true,
    currentTrack: null,         // Phaser Sound об'єкт
    musicTracks: [...],         // Список треків
    sounds: {}                  // Об'єкт звуків {key: Sound}
}
```

**Особливості:**
- Музичні треки вибираються випадково з перемішаного списку
- Crossfade реалізований через tween для плавних переходів
- Всі налаштування зберігаються в `localStorage.audioSettings`
- Звуки можуть мати унікальні ключі для багаторазового відтворення

---

### 2. CaptureSystem (`src/systems/CaptureSystem.js`)

**Призначення:** Управління процесом захоплення гравця ворогами.

**Як працює:**
1. **Градуальне заповнення (Blocker):**
   - Ворог типу "Blocker" повільно заповнює шкалу поки поблизу
   - Швидкість залежить від відстані до гравця
   - Формула: `fillRate = (maxDist - actualDist) / maxDist * baseRate`

2. **Burst заповнення (Sticker):**
   - Ворог типу "Sticker" заповнює шкалу різко при ударі
   - Викликається через `addCaptureBurst(amount)`
   - Не заповнює поступово, тільки при контакті

3. **Спад (Decay):**
   - Коли ворогів немає поблизу, шкала повільно спадає
   - Швидкість спаду: `CAPTURE_DECAY_RATE` з конфігу

**Ключові методи:**
```javascript
update(delta, chasers, player)  // Оновлення кожен кадр
addCaptureBurst(amount)         // Додати burst (для Sticker)
getCapturePercentage()          // Отримати % (0-100)
reset()                         // Скинути до 0
```

**Структура даних:**
```javascript
{
    captureProgress: 0,         // 0-100
    maxCapture: 100,
    captureIncreaseRate: 0.5,   // За секунду при близькому Blocker
    captureDecayRate: 2,        // Спад за секунду
    maxCaptureDistance: 200     // Макс. дистанція для захоплення
}
```

---

### 3. NavigationSystem (`src/systems/NavigationSystem.js`)

**Призначення:** Навігація для AI ворогів по карті з уникненням перешкод.

**Як працює:**
1. Використовує `PathfindingSystem` для побудови шляху
2. Перевіряє walkability через `TilemapSystem`
3. Оновлює шлях кожні 500мс (не кожен кадр для оптимізації)
4. Рухає ворога по точках шляху

**Ключові методи:**
```javascript
setTarget(x, y)                 // Встановити ціль руху
update(delta)                   // Оновлення руху
getCurrentPath()                // Отримати поточний шлях
clearPath()                     // Очистити шлях
```

**Оптимізації:**
- Шлях перераховується не частіше ніж раз на 500мс
- Використовується просте згладжування шляху
- Проміжні точки пропускаються якщо є пряма лінія

---

### 4. TilemapSystem (`src/systems/TilemapSystem.js`)

**Призначення:** Робота з картою через аналіз collision map (JPEG з кольоровими зонами).

**Як працює:**
1. Завантажує `collision_map.jpeg` та `road_graph.jpeg`
2. Створює canvas для аналізу пікселів
3. Перевіряє колір пікселя на заданих координатах
4. Визначає тип тайлу за кольором

**Кольорова схема:**
```javascript
Walkable (зелений):  RGB(0, 255, 0)
Road (сірий):        RGB(128, 128, 128) 
Water (синій):       RGB(0-10, 0-10, 250-255)
Collision (чорний):  RGB(0, 0, 0)
```

**Ключові методи:**
```javascript
isWalkable(x, y)               // Чи можна ходити
isRoad(x, y)                   // Чи це дорога
isWater(x, y)                  // Чи це вода
getTileType(x, y)              // Отримати тип тайлу
getPixelColor(x, y)            // Отримати RGB колір
```

---

### 5. SaveSystem (`src/systems/SaveSystem.js`)

**Призначення:** Збереження прогресу гравця в localStorage.

**Що зберігається:**
```javascript
{
    bankedMoney: 0,            // Долари в банку
    totalMoneyCollected: 0,    // Всього зібрано за всі сесії
    totalPlayTime: 0,          // Загальний час гри (мс)
    gamesPlayed: 0,            // Кількість ігор
    bestSurvivalTime: 0,       // Найкращий час виживання
    lastPlayed: Date.now()     // Остання гра
}
```

**Ключові методи:**
```javascript
static save(data)              // Зберегти дані
static load()                  // Завантажити дані
static clear()                 // Очистити всі дані
static updateStats(newData)    // Оновити статистику
```

---

## 🎬 Сцени

### 1. BootScene (`src/scenes/BootScene.js`)

**Призначення:** Завантаження всіх ресурсів перед грою.

**Що завантажується:**

1. **Текстури:**
   - Карта (`map.jpeg`)
   - Collision map (`collision_map.jpeg`)
   - Road graph (`road_graph.jpeg`)
   - Текстури гравця, ворогів, машин
   - Текстури пікапів, бонусів, перешкод
   - Фони меню

2. **Аудіо:**
   - Музика (8 треків: back_1 - back_8)
   - Звуки руху (running, engine sounds)
   - Звуки дій (money, drink, exchange, pickup, fall)
   - Звуки меню (hover, choice)
   - Ambient sounds (birds, wind, river)

3. **Інше:**
   - Створення анімацій для всіх персонажів
   - Налаштування physics world bounds

**Після завантаження:** Автоматичний перехід до `MenuScene`

---

### 2. MenuScene (`src/scenes/MenuScene.js`)

**Призначення:** Головне меню гри

**Елементи UI:**
- Фонове зображення
- Центральне меню з кнопками:
  - ГРАТИ
  - НАЛАШТУВАННЯ (аудіо)
  - ПРО ГРУ (інформація)
  - ДОНАТ НА ЗСУ
- Версія гри (зверху зліва)
- Банер внизу з дисклеймером

**Особливості:**
- Ініціалізація `AudioManager`
- Обробка autoplay policy браузера
- Звуки hover/click для кнопок
- Меню налаштувань з слайдерами
- Меню "Про гру" з прокруткою

**Перехід до гри:** `this.scene.start('GameScene')`

---

### 3. GameScene (`src/scenes/GameScene.js`)

**Призначення:** Основна геймплейна сцена (найбільша, ~2500 рядків)

#### Ініціалізація (`create()`)

1. **Карта та світ:**
   ```javascript
   this.tilemap = new TilemapSystem(this);
   this.cameras.main.setBounds(0, 0, 4092, 4092);
   this.physics.world.setBounds(0, 0, 4092, 4092);
   ```

2. **Гравець:**
   ```javascript
   this.player = new Player(this, startX, startY);
   this.player.audioManager = this.audioManager;
   ```

3. **Системи:**
   ```javascript
   this.captureSystem = new CaptureSystem(this);
   this.navigationSystem = new NavigationSystem(this, this.tilemap);
   ```

4. **UI:**
   ```javascript
   this.hud = new HUD(this);
   this.minimap = new Minimap(this, mapImage);
   ```

5. **Spawn об'єктів:**
   - Кіоски (`spawnKiosks()`)
   - Обмінники (`spawnExchanges()`)
   - Вороги (`spawnChaser()`)
   - Машини (`spawnCar()`)
   - Перешкоди (`spawnObstacles()`)
   - Пікапи (`spawnPickups()`)

#### Основний цикл (`update(delta, time)`)

1. **Оновлення гравця:**
   ```javascript
   this.player.update(delta);
   ```

2. **Оновлення ворогів:**
   ```javascript
   this.chasers.forEach(chaser => {
       if (!chaser.isFrozen) {
           chaser.update(delta, time);
       }
   });
   ```

3. **Оновлення систем:**
   ```javascript
   this.captureSystem.update(delta, this.chasers, this.player);
   if (this.captureSystem.getCapturePercentage() >= 100) {
       this.handleGameOver();
   }
   ```

4. **Оновлення UI:**
   ```javascript
   this.hud.update();
   this.minimap.update();
   ```

5. **Підтримка spawn:**
   ```javascript
   this.maintainPickups();
   this.checkPoliceSiren(time);
   ```

#### Колізії

```javascript
// Гравець <-> Монети
this.physics.add.overlap(this.player, this.pickups, 
    this.handlePickupCollision, null, this);

// Гравець <-> Кіоски
this.physics.add.overlap(this.player, this.kiosks, 
    this.handleKioskCollision, null, this);

// Гравець <-> Обмінники
this.physics.add.overlap(this.player, this.exchanges, 
    this.handleExchangeCollision, null, this);

// Гравець <-> Машини (калбек у Car.js)
```

#### Ключові механіки

**Збір грошей:**
```javascript
handlePickupCollision(player, pickup) {
    if (pickup instanceof Coin) {
        this.currentMoney += pickup.value;
        this.audioManager.playSound('money');
        pickup.collect();
    }
}
```

**Обмін валюти:**
```javascript
handleExchangeCollision(player, exchange) {
    const uah = this.currentMoney;
    const rate = GAME_CONFIG.EXCHANGES.EXCHANGE_RATE;
    const usd = Math.floor(uah / rate);
    
    this.currentBankedMoney += usd;
    this.currentMoney = uah % rate; // Залишок
    
    player.freeze(duration, 'exchange_sound');
}
```

**Відновлення стаміни:**
```javascript
handleKioskCollision(player, kiosk) {
    player.stamina = player.maxStamina;
    player.freeze(duration, 'drink');
    this.showKioskMessage(); // "Енергію відновлено!"
}
```

#### Пауза

```javascript
pauseGame() {
    this.isPaused = true;
    this.physics.world.isPaused = true;
    this.audioManager.pauseMusic();
    // Зупинка всіх звуків
    // Показ меню паузи
}

resumeGame() {
    this.isPaused = false;
    this.physics.world.isPaused = false;
    this.audioManager.resumeMusic();
    // Відновлення звуків
}
```

#### Game Over

```javascript
handleGameOver() {
    const survivalTime = this.time.now - this.gameStartTime;
    
    // Зупинка всіх звуків
    this.player.stopRunningSound();
    this.chasers.forEach(c => c.stopRunningSound());
    this.audioManager.stopMusic();
    
    // Збереження прогресу
    SaveSystem.updateStats({
        bankedMoney: this.currentBankedMoney,
        moneyAddedThisGame: this.moneyAddedThisGame,
        timeSurvived: survivalTime
    });
    
    // Перехід до ResultScene
    this.scene.start('ResultScene', {
        currentBankedMoney: this.currentBankedMoney,
        moneyAddedThisGame: this.moneyAddedThisGame,
        timeSurvived: survivalTime
    });
}
```

---

### 4. ResultScene (`src/scenes/ResultScene.js`)

**Призначення:** Екран результатів після програшу

**Відображає:**
- Банк (збережені долари)
- Зароблено цієї гри
- Час виживання

**Кнопки:**
- МАГАЗИН (перехід до ShopScene)
- МЕНЮ (повернення до MenuScene)

**Особливості:**
- Відтворює музику `gameover.mp3` один раз
- Зупиняє музику при виході з сцени

---

### 5. ShopScene (`src/scenes/ShopScene.js`)

**Призначення:** Магазин покупок (поки порожній, для майбутніх апгрейдів)

**Структура:**
- Заголовок "МАГАЗИН"
- Центральне меню
- Повідомлення "Незабаром тут з'являться покупки!"
- Кнопка "НАЗАД"

---

## 👾 Ігрові Об'єкти (Entities)

### Player (`src/entities/Player.js`)

**Базовий клас:** `Phaser.Physics.Arcade.Sprite`

**Властивості:**
```javascript
{
    speed: 200,                 // Базова швидкість
    dashSpeed: 400,             // Швидкість dash
    stamina: 100,               // Поточна стаміна
    maxStamina: 100,
    staminaDrainRate: 20,       // Спад стаміни за секунду при dash
    staminaRegenRate: 10,       // Відновлення стаміни
    isFrozen: false,            // Заморожений?
    isFalling: false,           // Падає?
    isSliding: false,           // Ковзає під стрічкою?
    currentSpeed: 0,            // Поточна швидкість (для звуку)
    immunities: {},             // Імунітети до різних ефектів
    audioManager: null          // Посилання на AudioManager
}
```

**Стани руху:**
- `IDLE` - стоїть
- `WALK` - ходьба (WASD/Стрілки)
- `DASH` - ривок (Shift + напрямок)
- `SLIDE` - підслизнення (Space)
- `FROZEN` - заморожений (кіоск/обмінник)
- `FALLING` - падіння (збив автомобіль)

**Анімації:**
Для кожного напрямку (front, rear, left, right):
- `player_walk_front` (4 кадри)
- `player_walk_rear` (4 кадри)
- `player_walk_left` (4 кадри)
- `player_walk_right` (4 кадри)
- `player_fall` (2 кадри)
- `player_standing_front/rear/left/right`

**Ключові методи:**
```javascript
update(delta)                   // Головний цикл оновлення
handleMovement()                // Обробка руху
handleDash()                    // Обробка dash
updateStamina(delta)            // Оновлення стаміни
updateAnimation()               // Оновлення анімацій
updateSounds()                  // Оновлення звуків руху
freeze(duration, soundKey)      // Заморозити гравця
triggerFall()                   // Тригер падіння
applyImmunity(type, duration)   // Застосувати імунітет
```

**Звуки:**
- `running.mp3` - звук бігу (loop, динамічна швидкість playback)
- Громкість залежить від швидкості руху
- Playback rate: `0.8 + (speed / maxSpeed) * 0.4`

---

### Chaser (`src/entities/Chaser.js`)

**Базовий клас:** `Phaser.Physics.Arcade.Sprite`  
**Абстрактний клас** для ворогів

**Типи:**
- `Blocker` (`ChaserBlocker`) - блокує шлях, повільно заповнює capture
- `Sticker` (`ChaserSticker`) - б'є гравця, різко заповнює capture

**Властивості:**
```javascript
{
    speed: 120,                 // Швидкість руху
    state: 'IDLE',              // IDLE, CHASE, ATTACK
    target: null,               // Ціль переслідування (Player)
    isFrozen: false,            // Заморожений?
    frozenTimer: 0,
    navigationSystem: null,     // Система навігації
    soundId: 'running_chaser_X', // Унікальний ID для звуку
    soundPlaybackRate: 0.9-1.1, // Рандомна швидкість (десинхронізація)
    audioManager: null
}
```

**Стани AI:**
1. **IDLE** - стоїть на місці
2. **CHASE** - переслідує гравця
   - Викликає `navigationSystem.setTarget(player.x, player.y)`
   - Оновлює шлях кожні 500мс
3. **ATTACK** - атакує (для Sticker)

**Анімації:**
Аналогічно гравцю, але з префіксом `enemy1_` або `enemy2_`

**Ключові методи:**
```javascript
update(delta, time)             // Оновлення AI та руху
chase(target)                   // Почати переслідування
stopChasing()                   // Зупинити переслідування
setFrozen(duration)             // Заморозити ворога
updateSounds()                  // Оновлення звуку бігу
onHitPlayer()                   // Колбек при зіткненні з гравцем
```

**Звук:**
- `running.mp3` - loop з унікальним playback rate для десинхронізації
- Громкість залежить від відстані до гравця
- Формула: `maxVol * (1 - dist / maxDist)`

---

### ChaserBlocker (`src/entities/ChaserBlocker.js`)

**Наслідує:** `Chaser`

**Особливості:**
- Використовує текстури `enemy-1` (з документами)
- НЕ б'є гравця напряму
- Повільно заповнює capture bar при наближенні
- Блокує шлях своїм тілом

**Логіка захоплення:**
Обробляється в `CaptureSystem.update()`:
```javascript
const distance = Phaser.Math.Distance.Between(
    chaser.x, chaser.y, player.x, player.y
);

if (distance < maxDistance && chaser.type === 'Blocker') {
    const fillRate = captureIncreaseRate * 
        ((maxDistance - distance) / maxDistance);
    captureProgress += fillRate * delta / 1000;
}
```

---

### ChaserSticker (`src/entities/ChaserSticker.js`)

**Наслідує:** `Chaser`

**Особливості:**
- Використовує текстури `enemy-2` (з дубинками)
- Б'є гравця і відскакує
- Різко заповнює capture bar при ударі (+25%)
- НЕ заповнює capture поступово

**Логіка атаки:**
```javascript
onHitPlayer() {
    // Додати burst capture
    this.scene.captureSystem.addCaptureBurst(25);
    
    // Відскочити назад
    const angle = Phaser.Math.Angle.Between(
        this.target.x, this.target.y, this.x, this.y
    );
    this.setVelocity(
        Math.cos(angle) * 200,
        Math.sin(angle) * 200
    );
    
    // Заморозити на 1.5с
    this.setFrozen(1500);
    
    // Звук удару
    this.scene.audioManager.playSound('fall', false, 0.7);
}
```

**Виявлення зіткнення:**
В `GameScene.update()`:
```javascript
this.chasers.forEach(chaser => {
    if (chaser.type === 'Sticker') {
        const dist = Phaser.Math.Distance.Between(
            chaser.x, chaser.y, player.x, player.y
        );
        if (dist < 35 && !chaser.isFrozen) {
            chaser.onHitPlayer();
        }
    }
});
```

---

### Car (`src/entities/Car.js`)

**Базовий клас:** `Phaser.Physics.Arcade.Sprite`

**Призначення:** Машина-перешкода, їздить по дорогах

**Властивості:**
```javascript
{
    speed: 150-250,             // Рандомна швидкість
    carType: 'car_red' / 'car_white',
    engineSound: null,          // Phaser Sound
    engineSoundKey: 'engine_03' / 'engine_07',
    direction: 'horizontal' / 'vertical',
    bounds: {left, right, top, bottom}, // Межі руху
    crashed: false              // Чи була аварія
}
```

**Рух:**
- Рухається по горизонталі або вертикалі
- Розвертається при досягненні меж
- Швидкість постійна (без прискорення/гальмування)

**Звук двигуна:**
```javascript
updateEngineSound() {
    const distance = Phaser.Math.Distance.Between(
        this.x, this.y, player.x, player.y
    );
    
    // Громкість від відстані
    const volume = Phaser.Math.Clamp(
        maxVol * (1 - distance / maxDistance),
        0, maxVol
    );
    
    // Playback rate від швидкості
    const rate = this.body.speed < 20 
        ? idleRate 
        : Phaser.Math.FloatBetween(minRate, maxRate);
    
    this.engineSound.setVolume(volume);
    this.engineSound.setRate(rate);
}
```

**Колізії:**
- З гравцем: `player.triggerFall()` + звук `fall.ogg`
- З ворогом: `enemy.triggerFall()` + звук залежно від відстані
- З іншою машиною: обидві зупиняються (аварія)

**Аварія:**
```javascript
handleAccident(otherCar) {
    this.crashed = true;
    this.body.setVelocity(0);
    this.engineSound.stop();
    
    // Через 3с зникає
    this.scene.time.delayedCall(3000, () => {
        this.destroy();
    });
}
```

---

### Bonus (`src/entities/Bonus.js`)

**Базовий клас:** `Phaser.GameObjects.Container`

**Підтипи:**
- `Scooter` - прискорення на 2 секунди
- `SmokeCloud` - заморозка всіх ворогів на 1.5 секунди

**Властивості:**
```javascript
{
    bonusType: 'SCOOTER' / 'SMOKE_CLOUD',
    magnetRadius: 60,           // Радіус притягування
    magnetSpeed: 300,           // Швидкість притягування
    visual: Image/Rectangle     // Візуальний компонент
}
```

**Магнітний ефект:**
```javascript
update(player) {
    const distance = Phaser.Math.Distance.Between(
        this.x, this.y, player.x, player.y
    );
    
    if (distance < this.magnetRadius) {
        // Рух до гравця
        const angle = Phaser.Math.Angle.Between(
            this.x, this.y, player.x, player.y
        );
        this.x += Math.cos(angle) * this.magnetSpeed * delta / 1000;
        this.y += Math.sin(angle) * this.magnetSpeed * delta / 1000;
    }
}
```

**Підбір:**
```javascript
collect() {
    this.applyEffect(player, scene);
    this.scene.audioManager.playSound('pickup', false, 0.6);
    this.destroy();
}
```

---

### Scooter (`src/entities/bonuses/Scooter.js`)

**Ефект:**
```javascript
applyEffect(player, scene) {
    const duration = GAME_CONFIG.PICKUPS.SCOOTER.DURATION; // 2000мс
    const speedBoost = GAME_CONFIG.PICKUPS.SCOOTER.SPEED_BOOST; // +150
    
    player.speed += speedBoost;
    player.dashSpeed += speedBoost;
    
    scene.time.delayedCall(duration, () => {
        player.speed -= speedBoost;
        player.dashSpeed -= speedBoost;
    });
}
```

**Конфіг:**
```javascript
SCOOTER: {
    DURATION: 2000,
    SPEED_BOOST: 150,
    MIN_COUNT_ON_MAP: 1,
    MAX_COUNT_ON_MAP: 4,
    MIN_DISTANCE_BETWEEN: 1000,
    WIDTH: 80,
    HEIGHT: 100
}
```

---

### SmokeCloud (`src/entities/bonuses/SmokeCloud.js`)

**Ефект:**
```javascript
applyEffect(player, scene) {
    const duration = GAME_CONFIG.PICKUPS.SMOKE_CLOUD.DURATION; // 1500мс
    
    // Заморозити всіх ворогів
    scene.chasers.forEach(chaser => {
        if (!chaser.isFrozen) {
            chaser.setFrozen(duration);
        }
    });
    
    // Візуальний ефект (анімація зникнення)
    this.playDisappearAnimation();
}
```

**Респавн:**
- Затримка: 20 секунд після підбору
- Максимум на карті: 2-3 шт
- Мінімальна відстань між хмарками: 1500px

---

### Coin (`src/entities/Coin.js`)

**Базовий клас:** `Phaser.GameObjects.Rectangle`

**Номінали:**
- 10₴ (зелений)
- 20₴ (жовтий)
- 50₴ (помаранчевий)
- 100₴ (червоний)

**Spawn:**
- Випадкова позиція на walkable тайлах
- Підтримується постійна кількість на карті (20-30 шт)

**Магнітний ефект:** Так (радіус 60px)

---

### Exchange (`src/entities/Exchange.js`)

**Базовий клас:** `Phaser.GameObjects.Image`

**Призначення:** Обмінник валюти (гривні → долари)

**Курс обміну:** 43₴ = 1$ (з конфігу)

**Колізія з гравцем:**
```javascript
// В GameScene.handleExchangeCollision():
const uah = this.currentMoney;
const rate = GAME_CONFIG.EXCHANGES.EXCHANGE_RATE;
const usd = Math.floor(uah / rate);

if (usd > 0) {
    this.currentBankedMoney += usd;
    this.moneyAddedThisGame += usd;
    this.currentMoney = uah % rate; // Залишок
    
    player.freeze(duration, 'exchange_sound');
}
```

**Заморозка:** 2 секунди + звук `exchange.mp3` (loop)

**Кількість на карті:** 3 шт

---

## ⚙️ Конфігурація Гри

Весь файл: `src/config/gameConfig.js`

### Основні розділи:

```javascript
export const GAME_CONFIG = {
    VERSION: 'beta v0.2.1',
    
    KIOSKS: { /* Налаштування кіосків */ },
    EXCHANGES: { /* Налаштування обмінників */ },
    
    PLAYER: {
        SPEED: 200,
        DASH_SPEED: 400,
        STAMINA: 100,
        STAMINA_DRAIN_RATE: 20,
        STAMINA_REGEN_RATE: 10,
        DASH_COOLDOWN: 500,
        SLIDE_DURATION: 800,
        FALL_DURATION: 2000,
        COLLISION_DAMAGE: 0,
        SOUND_PLAYBACK_RATE_MIN: 0.8,
        SOUND_PLAYBACK_RATE_MAX: 1.2
    },
    
    CHASER: {
        SPAWN_COUNT: 6,          // 3 Blocker + 3 Sticker
        SPEED: 120,
        CHASE_RANGE: 600,
        ATTACK_RANGE: 35,        // Для Sticker
        SPAWN_INTERVAL: 10000,
        MAX_CHASERS: 15,
        FREEZE_DURATION: 1500,   // Від SmokeCloud
        SOUND_VOLUME_MAX: 0.5,
        SOUND_MAX_DISTANCE: 400,
        SOUND_PLAYBACK_RATE_MIN: 0.9,
        SOUND_PLAYBACK_RATE_MAX: 1.1
    },
    
    CAPTURE: {
        MAX_CAPTURE: 100,
        INCREASE_RATE: 0.5,      // За секунду (Blocker)
        DECAY_RATE: 2,           // Спад за секунду
        MAX_DISTANCE: 200,       // Макс. дистанція для Blocker
        STICKER_BURST: 25        // Burst для Sticker
    },
    
    PICKUPS: {
        COIN: {
            MIN_COUNT: 20,
            MAX_COUNT: 30,
            SPAWN_INTERVAL: 2000,
            VALUES: [10, 20, 50, 100]
        },
        SCOOTER: { /* ... */ },
        SMOKE_CLOUD: { /* ... */ }
    },
    
    OBSTACLES: {
        CARS: {
            COUNT: 8,
            MIN_SPEED: 150,
            MAX_SPEED: 250
        },
        TAPE_GATES: {
            COUNT: 12,
            HEIGHT: 40
        },
        PUDDLES: {
            COUNT: 15,
            SLIP_DURATION: 1000
        }
    },
    
    AUDIO: {
        MUSIC: {
            VOLUME: 0.5,
            ENABLED: true,
            CROSSFADE_DURATION: 2000
        },
        SOUNDS: {
            VOLUME: 0.7,
            ENABLED: true
        },
        POLICE_SIREN: {
            MIN_INTERVAL: 30000,
            MAX_INTERVAL: 60000,
            VOLUME: 0.6
        },
        CAR_ENGINE: { /* ... */ },
        AMBIENCE: { /* ... */ }
    }
};
```

---

## 🎨 UI Компоненти

### HUD (`src/ui/HUD.js`)

**Відображає:**
- Гроші (гривні) зверху ліворуч
- Банк (долари) зверху праворуч
- Стаміна (прогрес бар) знизу по центру
- Capture Bar (червона шкала) знизу посередині

**Оновлення:**
```javascript
update() {
    this.moneyText.setText(`💰 ${this.scene.currentMoney}₴`);
    this.bankText.setText(`🏦 ${this.scene.currentBankedMoney}$`);
    
    const staminaPercent = this.scene.player.stamina / maxStamina;
    this.staminaBar.width = maxWidth * staminaPercent;
    
    const capturePercent = this.scene.captureSystem.getCapturePercentage();
    this.captureBar.width = maxWidth * (capturePercent / 100);
}
```

---

### Minimap (`src/ui/Minimap.js`)

**Відображає:**
- Мінікарта (зверху праворуч)
- Позиція гравця (синя крапка)
- Позиції ворогів (червоні крапки)
- Позиції обмінників (жовті крапки)

**Масштаб:** Карта 4092×4092 → Мінікарта 200×200

---

## 🔊 Аудіо Система

### Музика

**Треки:**
1. `back_1.mp3` - `back_8.mp3` (8 треків)
2. `gameover.mp3` (тільки в ResultScene)

**Відтворення:**
- Випадковий порядок (shuffle)
- Crossfade між треками (2 секунди)
- Loop playlist

**Налаштування:**
- Гучність: 0-1 (слайдер в меню)
- Увімкнено/Вимкнено (checkbox)
- Зберігається в localStorage

---

### Звукові ефекти

**Категорії:**

1. **Рух:**
   - `running.mp3` - біг гравця/ворогів (loop)
   - `engine_01.wav` - `engine_13.wav` - двигуни машин (loop)

2. **Дії:**
   - `money.wav` - підбір грошей
   - `pickup.mp3` - підбір бонусів
   - `drink.wav` - відновлення стаміни (loop при фрізі)
   - `exchange.mp3` - обмін валюти (loop при фрізі)
   - `fall.ogg` - падіння від машини
   - `stop_uhilant.mp3` - сирена (рандомно)

3. **Меню:**
   - `menu_hover.wav` - наведення на кнопку
   - `menu_choise.wav` - клік по кнопці

4. **Ambient:**
   - `birds.wav` - пташки (loop)
   - `wind.wav` - вітер (loop)
   - `river.wav` - річка (loop, тільки біля води)

---

## 💾 Збереження Даних

**Локація:** `localStorage`

**Ключі:**
- `gameData` - прогрес гравця
- `audioSettings` - налаштування аудіо

**Структура gameData:**
```json
{
    "bankedMoney": 150,
    "totalMoneyCollected": 2500,
    "totalPlayTime": 1800000,
    "gamesPlayed": 12,
    "bestSurvivalTime": 180000,
    "lastPlayed": 1704067200000
}
```

**Структура audioSettings:**
```json
{
    "musicVolume": 0.5,
    "musicEnabled": true,
    "soundsVolume": 0.7,
    "soundsEnabled": true
}
```

---

## 🔧 Технічні Деталі

### Оптимізації

1. **Навігація AI:**
   - Перерахунок шляху не частіше 500мс
   - Простий pathfinding (без складного A*)

2. **Звуки:**
   - Громкість залежить від відстані (не грає якщо далеко)
   - Unique sound keys для багаторазового відтворення
   - Pause/resume замість stop/play

3. **Spawn:**
   - Lazy spawn (не все одразу)
   - Maintain counts (підтримка кількості)
   - Cleanup destroyed objects

4. **Collision Detection:**
   - Pixel-based для карти (тільки при запиті)
   - Physics overlap для об'єктів
   - Manual distance check для Sticker

### Відомі Обмеження

1. **Pathfinding:**
   - Простий алгоритм, може застрягати
   - Не враховує динамічні перешкоди

2. **Tilemap:**
   - Collision через pixel colors (не тайли)
   - Вимагає точну кольорову схему

3. **Multiplayer:**
   - Немає (single-player only)

4. **Mobile:**
   - Не підтримується (тільки desktop)
   - Екран з повідомленням для мобільних

---

## 📝 Висновок

Ця документація покриває всю архітектуру та функціонал гри "Втеча від ТЦК". 

**Для розробників:** Використовуйте це як референс для розуміння системи та додавання нових features.

**Для ШІ:** Вся структура проекту, логіка та зв'язки між компонентами описані детально для повного розуміння коду.

---

*Документація підтримується та оновлюється разом з кодовою базою.*
