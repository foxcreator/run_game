# Busification Run - MVP

Браузерна гра-переслідування (top-down endless chase).

## Запуск

Для запуску гри потрібен локальний сервер (ES6 модулі не працюють з file:// протоколом).

### Docker (рекомендовано):

```bash
# Побудова та запуск
docker-compose up --build

# Або в фоновому режимі
docker-compose up -d --build

# Зупинка
docker-compose down
```

Гра буде доступна за адресою: `http://localhost:8080`

### Альтернативні способи:

#### Python:
```bash
python3 -m http.server 8000
```
Потім відкрийте: `http://localhost:8000`

#### Node.js:
```bash
npx http-server
```

## Структура проєкту

- `/index.html` - головна сторінка
- `/src/main.js` - точка входу гри
- `/src/scenes/` - сцени гри (Menu, Game, Result, Shop)
- `/src/systems/` - системи (будуть додані)
- `/src/entities/` - сутності гри (будуть додані)
- `/src/ui/` - UI компоненти (будуть додані)

## Технології

- Phaser 3 (через CDN)
- Vanilla JavaScript (ES6 модулі)

## Поточний стан

✅ Задача 1: Skeleton + сцени (Menu/Game/Result/Shop) - виконано
- Всі сцени створені
- Переходи між сценами працюють
- Acceptance criteria виконані