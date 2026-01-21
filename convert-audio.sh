#!/bin/bash

# Скрипт для конвертації WAV файлів в MP3
# Використовує ffmpeg для конвертації з оптимальними налаштуваннями

echo "🔊 Конвертація аудіо файлів WAV → MP3"
echo "======================================"

# Перевіряємо чи встановлений ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg не знайдено!"
    echo ""
    echo "Встановіть ffmpeg:"
    echo "  macOS: brew install ffmpeg"
    echo "  Ubuntu/Debian: sudo apt install ffmpeg"
    echo "  Windows: https://ffmpeg.org/download.html"
    exit 1
fi

# Функція конвертації
convert_file() {
    input_file="$1"
    output_file="${input_file%.wav}.mp3"
    
    if [ -f "$output_file" ]; then
        echo "⏭️  Пропускаємо (вже існує): $(basename "$output_file")"
        return
    fi
    
    echo "🔄 Конвертуємо: $(basename "$input_file")"
    ffmpeg -i "$input_file" -codec:a libmp3lame -qscale:a 2 "$output_file" -y > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        old_size=$(du -h "$input_file" | cut -f1)
        new_size=$(du -h "$output_file" | cut -f1)
        echo "✅ Готово: $old_size → $new_size"
    else
        echo "❌ Помилка при конвертації: $(basename "$input_file")"
    fi
}

# Конвертуємо menu sounds
echo ""
echo "📁 Menu sounds..."
for file in src/assets/sounds/menu_*.wav; do
    if [ -f "$file" ]; then
        convert_file "$file"
    fi
done

# Конвертуємо engine sounds
echo ""
echo "📁 Engine sounds..."
for file in src/assets/sounds/engine-sounds/*.wav; do
    if [ -f "$file" ]; then
        convert_file "$file"
    fi
done

# Конвертуємо інші sounds
echo ""
echo "📁 Other sounds..."
for file in src/assets/sounds/*.wav; do
    if [ -f "$file" ]; then
        convert_file "$file"
    fi
done

# Ambient sounds (якщо хочеш їх конвертувати)
echo ""
echo "📁 Ambient sounds (великі файли, займе час)..."
read -p "Конвертувати ambient sounds? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    for file in src/assets/sounds/ambience/*.wav; do
        if [ -f "$file" ]; then
            echo "🔄 Конвертуємо: $(basename "$file") (це може зайняти кілька хвилин...)"
            convert_file "$file"
        fi
    done
else
    echo "⏭️  Ambient sounds пропущено"
fi

echo ""
echo "✅ Конвертація завершена!"
echo ""
echo "📝 Наступні кроки:"
echo "1. Оновіть шляхи до файлів у коді (.wav → .mp3)"
echo "2. Видаліть старі WAV файли (опціонально)"
echo "3. Перезавантажте гру"
