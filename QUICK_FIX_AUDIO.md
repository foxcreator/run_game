# 🔊 ШВИДКЕ ВИПРАВЛЕННЯ ЗАТРИМКИ ЗВУКІВ

## Проблема
Звуки в форматі WAV мають затримку ~1 секунду через декодування браузером.

## ⚡ ШВИДКЕ РІШЕННЯ (без ffmpeg)

### Варіант 1: Використати онлайн конвертер

1. Відкрий: https://online-audio-converter.com/
2. Завантаж файли:
   - `src/assets/sounds/money.wav`
   - `src/assets/sounds/Drink.wav`
   - `src/assets/sounds/menu_hover.wav`
   - `src/assets/sounds/menu_choise.wav`

3. Вибери формат: **MP3**
4. Якість: **128 kbps** (достатньо для ігрових звуків)
5. Завантаж та заміни файли:
   ```bash
   # Перейменуй старі (backup)
   mv src/assets/sounds/money.wav src/assets/sounds/money.wav.bak
   mv src/assets/sounds/Drink.wav src/assets/sounds/Drink.wav.bak
   
   # Помісти нові MP3 файли
   # money.mp3 → src/assets/sounds/
   # Drink.mp3 → src/assets/sounds/
   ```

6. Оновлюй код в `BootScene.js`:
   ```javascript
   // Було:
   this.load.audio('money', './src/assets/sounds/money.wav');
   this.load.audio('drink', './src/assets/sounds/Drink.wav');
   
   // Стало:
   this.load.audio('money', './src/assets/sounds/money.mp3');
   this.load.audio('drink', './src/assets/sounds/Drink.mp3');
   ```

### Варіант 2: Використати інші звуки

Можеш використати звуки з freesound.org (вже в MP3):
- Coin pickup: https://freesound.org/people/MATRIXXX_/sounds/402766/
- Item pickup: https://freesound.org/people/JustInvoke/sounds/446111/

---

## 🎯 Очікуваний результат

| Формат | Розмір | Затримка |
|--------|--------|----------|
| WAV | 38-130KB | ~1000мс ❌ |
| MP3 (128kbps) | ~5-15KB | ~10-30мс ✅ |
| OGG | ~5-15KB | ~10-30мс ✅ |

---

## 📝 Інструкція після конвертації

1. Заміни WAV на MP3
2. Оновлюй шляхи в `BootScene.js`
3. Видали `.wav.bak` файли
4. Перезавантаж гру з очищенням кешу (Cmd+Shift+R)

**Результат: звуки будуть миттєвими! 🚀**
