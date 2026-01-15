# SpriteManager - Інструкція по заміні кольорів на зображення

## Огляд

`SpriteManager` - це централізована система управління всіма спрайтами та візуалізацією в грі. Вона дозволяє легко замінювати кольорові квадрати (заглушки MVP) на реальні зображення без зміни логіки гри.

## Розташування

Файл: `src/utils/SpriteManager.js`

## Як працює

Зараз всі об'єкти використовують кольори (тип `'color'`). Для заміни на зображення потрібно:

1. Завантажити зображення в Phaser (через `preload()` в `BootScene`)
2. Змінити конфігурацію в `SpriteManager` з `type: 'color'` на `type: 'texture'`
3. Вказати ключ текстури замість кольору

## Структура конфігурації

Кожен об'єкт має конфігурацію з полями:
- `type`: `'color'` (кольоровий квадрат) або `'texture'` (зображення)
- `value`: колір (hex) або ключ текстури (string)
- Розміри та інші параметри

## Приклади заміни

### 1. Заміна тайлів карти

**Поточна конфігурація (кольори):**
```javascript
ROAD: {
    type: 'color',
    value: 0x808080, // Сірий колір
    width: 32,
    height: 32
}
```

**Після заміни на зображення:**
```javascript
ROAD: {
    type: 'texture',
    value: 'road-tile', // Ключ текстури (завантажено в preload)
    width: 32,
    height: 32
}
```

**Кроки:**
1. Додайте в `BootScene.js` → `preload()`:
```javascript
this.load.image('road-tile', 'assets/tiles/road.png');
```

2. Змініть в `SpriteManager.js`:
```javascript
ROAD: {
    type: 'texture',
    value: 'road-tile',
    width: 32,
    height: 32
}
```

### 2. Заміна гравця

**Поточна конфігурація:**
```javascript
PLAYER_SPRITE: {
    type: 'color',
    value: 0x3498db, // Синій колір
    radius: 15,
    strokeColor: 0xffffff,
    strokeWidth: 2
}
```

**Після заміни:**
```javascript
PLAYER_SPRITE: {
    type: 'texture',
    value: 'player-sprite', // Ключ текстури
    radius: 15,
    strokeColor: 0xffffff,
    strokeWidth: 2
}
```

**Кроки:**
1. В `BootScene.js`:
```javascript
this.load.image('player-sprite', 'assets/player/player.png');
// Або спрайт-лист:
this.load.spritesheet('player-sprite', 'assets/player/player-sheet.png', {
    frameWidth: 32,
    frameHeight: 32
});
```

2. В `SpriteManager.js` змініть `type` та `value`.

### 3. Заміна ворогів

**Blocker:**
```javascript
BLOCKER: {
    type: 'texture',
    value: 'chaser-blocker-sprite',
    radius: 12,
    strokeColor: 0xffffff,
    strokeWidth: 2
}
```

**Sticker:**
```javascript
STICKER: {
    type: 'texture',
    value: 'chaser-sticker-sprite',
    radius: 12,
    strokeColor: 0xffffff,
    strokeWidth: 2
}
```

### 4. Заміна перешкод

**Приклад для калюжі (PuddleSlip):**
```javascript
PUDDLE_SLIP: {
    type: 'texture',
    value: 'puddle-sprite',
    width: 50,
    height: 50,
    shape: 'circle'
}
```

**Приклад для маршрутки (MovingBus):**
```javascript
MOVING_BUS: {
    type: 'texture',
    value: 'bus-sprite',
    width: 60,
    height: 30
}
```

### 5. Заміна монет

```javascript
COIN: {
    type: 'texture',
    value: 'coin-sprite',
    width: 16,
    height: 16,
    shape: 'rectangle'
}
```

## Структура папок для зображень (рекомендована)

```
assets/
├── tiles/
│   ├── road.png
│   ├── sidewalk.png
│   ├── yard.png
│   ├── building.png
│   ├── kiosk.png
│   └── fence.png
├── player/
│   └── player.png
├── enemies/
│   ├── blocker.png
│   └── sticker.png
├── obstacles/
│   ├── soft-crowd.png
│   ├── puddle.png
│   ├── tape-gate.png
│   ├── bus.png
│   └── paper-stack.png
└── pickups/
    └── coin.png
```

## Приклад повного завантаження в BootScene

```javascript
// BootScene.js
preload() {
    // Тайли карти
    this.load.image('road-tile', 'assets/tiles/road.png');
    this.load.image('sidewalk-tile', 'assets/tiles/sidewalk.png');
    this.load.image('yard-tile', 'assets/tiles/yard.png');
    this.load.image('building-tile', 'assets/tiles/building.png');
    this.load.image('kiosk-tile', 'assets/tiles/kiosk.png');
    this.load.image('fence-tile', 'assets/tiles/fence.png');
    
    // Гравець
    this.load.image('player-sprite', 'assets/player/player.png');
    
    // Вороги
    this.load.image('chaser-blocker-sprite', 'assets/enemies/blocker.png');
    this.load.image('chaser-sticker-sprite', 'assets/enemies/sticker.png');
    
    // Перешкоди
    this.load.image('soft-crowd-sprite', 'assets/obstacles/soft-crowd.png');
    this.load.image('puddle-sprite', 'assets/obstacles/puddle.png');
    this.load.image('tape-gate-sprite', 'assets/obstacles/tape-gate.png');
    this.load.image('bus-sprite', 'assets/obstacles/bus.png');
    this.load.image('paper-stack-sprite', 'assets/obstacles/paper-stack.png');
    
    // Пікапи
    this.load.image('coin-sprite', 'assets/pickups/coin.png');
}
```

## Важливі примітки

1. **Розміри**: Переконайтеся, що розміри зображень відповідають вказаним в конфігурації (або налаштуйте розміри під ваші зображення).

2. **Формати**: Phaser підтримує PNG, JPG, GIF. Рекомендується PNG з прозорістю.

3. **Оптимізація**: Використовуйте спрайт-листи для анімацій та оптимізації завантаження.

4. **Тестування**: Після заміни перевірте, що всі об'єкти відображаються правильно та не виходять за межі.

5. **Зворотна сумісність**: Можна залишити частину об'єктів з кольорами, а частину замінити на текстури - система підтримує обидва варіанти одночасно.

## Додаткові можливості

### Анімації

Для об'єктів з анімаціями (наприклад, гравець) використовуйте спрайт-листи:

```javascript
// BootScene.js
this.load.spritesheet('player-sprite', 'assets/player/player-sheet.png', {
    frameWidth: 32,
    frameHeight: 32
});

// Створення анімації
this.anims.create({
    key: 'player-walk',
    frames: this.anims.generateFrameNumbers('player-sprite', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1
});
```

### Множинні варіанти

Можна додати кілька варіантів одного об'єкта:

```javascript
BUILDING: {
    type: 'texture',
    value: ['building-1', 'building-2', 'building-3'], // Масив текстур
    width: 32,
    height: 32
}
```

(Потрібно буде оновити метод `createTileSprite` для підтримки масивів)

## Підтримка

Якщо виникли питання або проблеми з заміною спрайтів, перевірте:
1. Чи правильно завантажені текстури (перевірте консоль браузера)
2. Чи правильно вказані ключі текстур в `SpriteManager`
3. Чи відповідають розміри зображень вказаним параметрам
