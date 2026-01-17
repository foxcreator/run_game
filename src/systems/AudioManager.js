// AudioManager - система керування музикою та звуковими ефектами
class AudioManager {
    constructor(scene) {
        this.scene = scene;
        
        // Список доступних музичних треків
        this.musicTracks = ['back_1', 'back_2', 'back_3', 'back_4', 'back_5'];
        
        // Поточний та наступний трек (для crossfade)
        this.currentTrack = null;
        this.nextTrack = null;
        this.currentTrackKey = null;
        
        // Індекс треків для циклічного відтворення
        this.playedTracks = []; // Відстежуємо що вже грало
        this.currentPlaylist = []; // Поточний плейлист
        
        // Налаштування музики
        this.musicVolume = this.loadSetting('musicVolume', 0.5); // 0.0 - 1.0
        this.musicEnabled = this.loadSetting('musicEnabled', true);
        
        // Налаштування звуків
        this.soundsVolume = this.loadSetting('soundsVolume', 0.7); // 0.0 - 1.0
        this.soundsEnabled = this.loadSetting('soundsEnabled', true);
        
        // Звукові ефекти (loop sounds)
        this.sounds = {}; // { soundKey: soundObject }
        
        // Crossfade параметри
        this.crossfadeDuration = 2000; // 2 секунди
        this.isCrossfading = false;
        
        // Стан
        this.isPaused = false;
        this.isInitialized = false;
    }
    
    /**
     * Ініціалізація музичної системи
     */
    init() {
        if (this.isInitialized) return;
        
        // Перевіряємо чи всі треки завантажені
        for (const trackKey of this.musicTracks) {
            if (!this.scene.cache.audio.exists(trackKey)) {
                console.warn(`⚠️ AudioManager: трек "${trackKey}" не завантажений`);
                return false;
            }
        }
        
        this.isInitialized = true;
        console.log('✅ AudioManager ініціалізовано');
        return true;
    }
    
    /**
     * Запускає відтворення музики (рандомний початковий трек)
     */
    startMusic() {
        if (!this.isInitialized) {
            console.warn('⚠️ AudioManager не ініціалізовано');
            return;
        }
        
        if (!this.musicEnabled) {
            console.log('🔇 Музика вимкнена');
            return;
        }
        
        // Створюємо новий плейлист (перемішані треки)
        this.createNewPlaylist();
        
        // Вибираємо рандомний перший трек
        const randomIndex = Math.floor(Math.random() * this.currentPlaylist.length);
        const firstTrack = this.currentPlaylist[randomIndex];
        
        this.playTrack(firstTrack);
    }
    
    /**
     * Створює новий перемішаний плейлист
     */
    createNewPlaylist() {
        // Копіюємо всі треки
        this.currentPlaylist = [...this.musicTracks];
        
        // Перемішуємо (Fisher-Yates shuffle)
        for (let i = this.currentPlaylist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.currentPlaylist[i], this.currentPlaylist[j]] = 
                [this.currentPlaylist[j], this.currentPlaylist[i]];
        }
        
        console.log('🎵 Новий плейлист:', this.currentPlaylist);
    }
    
    /**
     * Відтворює конкретний трек
     */
    playTrack(trackKey) {
        if (!this.isInitialized || !this.musicEnabled) return;
        
        console.log(`🎵 Відтворення треку: ${trackKey}`);
        
        // Зупиняємо поточний трек якщо він грає (для першого запуску)
        if (this.currentTrack && !this.isCrossfading) {
            this.currentTrack.stop();
        }
        
        // Створюємо новий трек
        const track = this.scene.sound.add(trackKey, {
            volume: this.musicVolume,
            loop: false // Не loop, бо ми керуємо плейлистом вручну
        });
        
        // Коли трек закінчується - переходимо до наступного
        track.once('complete', () => {
            this.playNextTrack();
        });
        
        this.currentTrack = track;
        this.currentTrackKey = trackKey;
        this.currentTrack.play();
        
        // Додаємо до історії
        if (!this.playedTracks.includes(trackKey)) {
            this.playedTracks.push(trackKey);
        }
    }
    
    /**
     * Відтворює наступний трек з плейлиста (з crossfade)
     */
    playNextTrack() {
        if (!this.isInitialized || !this.musicEnabled) return;
        
        // Знаходимо індекс поточного треку
        const currentIndex = this.currentPlaylist.indexOf(this.currentTrackKey);
        
        // Визначаємо наступний трек
        let nextTrackKey;
        if (currentIndex === -1 || currentIndex === this.currentPlaylist.length - 1) {
            // Поточний трек останній або не знайдений - створюємо новий плейлист
            this.createNewPlaylist();
            nextTrackKey = this.currentPlaylist[0];
        } else {
            // Беремо наступний з плейлиста
            nextTrackKey = this.currentPlaylist[currentIndex + 1];
        }
        
        console.log(`🎵 Перемикання: ${this.currentTrackKey} → ${nextTrackKey}`);
        
        // Запускаємо crossfade
        this.crossfadeToTrack(nextTrackKey);
    }
    
    /**
     * Плавний перехід між треками (crossfade)
     */
    crossfadeToTrack(nextTrackKey) {
        if (!this.isInitialized || this.isCrossfading) return;
        
        this.isCrossfading = true;
        
        const oldTrack = this.currentTrack;
        const oldVolume = oldTrack ? oldTrack.volume : 0;
        
        // Створюємо наступний трек
        this.nextTrack = this.scene.sound.add(nextTrackKey, {
            volume: 0, // Починаємо з нуля
            loop: false
        });
        
        // Коли наступний трек закінчується - переходимо далі
        this.nextTrack.once('complete', () => {
            this.playNextTrack();
        });
        
        this.nextTrack.play();
        
        // Crossfade анімація
        const startTime = Date.now();
        const fadeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.crossfadeDuration, 1.0);
            
            // Плавне зменшення гучності старого треку
            if (oldTrack && oldTrack.isPlaying) {
                oldTrack.setVolume(oldVolume * (1 - progress));
            }
            
            // Плавне збільшення гучності нового треку
            if (this.nextTrack && this.nextTrack.isPlaying) {
                this.nextTrack.setVolume(this.musicVolume * progress);
            }
            
            // Завершення crossfade
            if (progress >= 1.0) {
                clearInterval(fadeInterval);
                
                // Зупиняємо старий трек
                if (oldTrack) {
                    oldTrack.stop();
                    oldTrack.destroy();
                }
                
                // Новий трек стає поточним
                this.currentTrack = this.nextTrack;
                this.currentTrackKey = nextTrackKey;
                this.nextTrack = null;
                this.isCrossfading = false;
                
                console.log('✅ Crossfade завершено');
            }
        }, 50); // Оновлення кожні 50ms
    }
    
    /**
     * Пауза музики
     */
    pauseMusic() {
        if (this.currentTrack && this.currentTrack.isPlaying) {
            this.currentTrack.pause();
            this.isPaused = true;
            console.log('⏸️ Музика на паузі');
        }
        
        if (this.nextTrack && this.nextTrack.isPlaying) {
            this.nextTrack.pause();
        }
    }
    
    /**
     * Відновлення музики
     */
    resumeMusic() {
        if (this.currentTrack && this.isPaused) {
            this.currentTrack.resume();
            this.isPaused = false;
            console.log('▶️ Музика відновлена');
        }
        
        if (this.nextTrack && this.nextTrack.isPaused) {
            this.nextTrack.resume();
        }
    }
    
    /**
     * Зупинка музики
     */
    stopMusic() {
        if (this.currentTrack) {
            this.currentTrack.stop();
            this.currentTrack.destroy();
            this.currentTrack = null;
            this.currentTrackKey = null;
        }
        
        if (this.nextTrack) {
            this.nextTrack.stop();
            this.nextTrack.destroy();
            this.nextTrack = null;
        }
        
        this.isPaused = false;
        this.isCrossfading = false;
        console.log('⏹️ Музика зупинена');
    }
    
    /**
     * Встановлення гучності музики (0.0 - 1.0)
     */
    setMusicVolume(volume) {
        this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
        
        if (this.currentTrack) {
            this.currentTrack.setVolume(this.musicVolume);
        }
        
        if (this.nextTrack) {
            // При crossfade зберігаємо пропорцію
            const currentNextVolume = this.nextTrack.volume;
            const progress = currentNextVolume / (this.musicVolume || 0.5);
            this.nextTrack.setVolume(this.musicVolume * progress);
        }
        
        this.saveSetting('musicVolume', this.musicVolume);
        console.log(`🔊 Гучність музики: ${Math.round(this.musicVolume * 100)}%`);
    }
    
    /**
     * Увімкнути/вимкнути музику
     */
    setMusicEnabled(enabled) {
        this.musicEnabled = enabled;
        this.saveSetting('musicEnabled', enabled);
        
        if (!enabled) {
            this.stopMusic();
            console.log('🔇 Музика вимкнена');
        } else {
            this.startMusic();
            console.log('🔊 Музика увімкнена');
        }
    }
    
    /**
     * Отримати поточну гучність
     */
    getMusicVolume() {
        return this.musicVolume;
    }
    
    /**
     * Перевірити чи музика увімкнена
     */
    isMusicEnabled() {
        return this.musicEnabled;
    }
    
    // ========== ЗВУКОВІ ЕФЕКТИ ==========
    
    /**
     * Відтворити звуковий ефект
     * @param {string} soundKey - ключ звуку (наприклад 'running')
     * @param {boolean} loop - чи звук повинен повторюватись
     * @param {number} volume - гучність (0.0 - 1.0), якщо null - використовується soundsVolume
     */
    playSound(soundKey, loop = false, volume = null) {
        if (!this.isInitialized || !this.soundsEnabled) return null;
        
        // Перевіряємо чи звук вже грає
        if (this.sounds[soundKey] && this.sounds[soundKey].isPlaying) {
            return this.sounds[soundKey];
        }
        
        // Перевіряємо чи звук завантажений
        if (!this.scene.cache.audio.exists(soundKey)) {
            console.warn(`⚠️ AudioManager: звук "${soundKey}" не завантажений`);
            return null;
        }
        
        // Якщо звук вже існує але не грає - видаляємо старий
        if (this.sounds[soundKey]) {
            this.sounds[soundKey].destroy();
        }
        
        // Створюємо новий звук
        const finalVolume = volume !== null ? volume : this.soundsVolume;
        const sound = this.scene.sound.add(soundKey, {
            volume: finalVolume,
            loop: loop
        });
        
        sound.play();
        this.sounds[soundKey] = sound;
        
        console.log(`🔊 Звук "${soundKey}" відтворюється (loop: ${loop})`);
        return sound;
    }
    
    /**
     * Зупинити звуковий ефект
     * @param {string} soundKey - ключ звуку
     */
    stopSound(soundKey) {
        if (this.sounds[soundKey]) {
            this.sounds[soundKey].stop();
            this.sounds[soundKey].destroy();
            delete this.sounds[soundKey];
            console.log(`⏹️ Звук "${soundKey}" зупинено`);
        }
    }
    
    /**
     * Пауза всіх звуків
     */
    pauseSounds() {
        for (const soundKey in this.sounds) {
            if (this.sounds[soundKey] && this.sounds[soundKey].isPlaying) {
                this.sounds[soundKey].pause();
            }
        }
        console.log('⏸️ Звуки на паузі');
    }
    
    /**
     * Відновлення всіх звуків
     */
    resumeSounds() {
        for (const soundKey in this.sounds) {
            if (this.sounds[soundKey] && this.sounds[soundKey].isPaused) {
                this.sounds[soundKey].resume();
            }
        }
        console.log('▶️ Звуки відновлені');
    }
    
    /**
     * Зупинити всі звуки
     */
    stopAllSounds() {
        for (const soundKey in this.sounds) {
            this.stopSound(soundKey);
        }
    }
    
    /**
     * Встановлення гучності звуків (0.0 - 1.0)
     */
    setSoundsVolume(volume) {
        this.soundsVolume = Phaser.Math.Clamp(volume, 0, 1);
        
        // Оновлюємо гучність всіх активних звуків
        for (const soundKey in this.sounds) {
            if (this.sounds[soundKey]) {
                this.sounds[soundKey].setVolume(this.soundsVolume);
            }
        }
        
        this.saveSetting('soundsVolume', this.soundsVolume);
        console.log(`🔊 Гучність звуків: ${Math.round(this.soundsVolume * 100)}%`);
    }
    
    /**
     * Увімкнути/вимкнути звуки
     */
    setSoundsEnabled(enabled) {
        this.soundsEnabled = enabled;
        this.saveSetting('soundsEnabled', enabled);
        
        if (!enabled) {
            this.stopAllSounds();
            console.log('🔇 Звуки вимкнені');
        } else {
            console.log('🔊 Звуки увімкнені');
        }
    }
    
    /**
     * Отримати поточну гучність звуків
     */
    getSoundsVolume() {
        return this.soundsVolume;
    }
    
    /**
     * Перевірити чи звуки увімкнені
     */
    isSoundsEnabled() {
        return this.soundsEnabled;
    }
    
    /**
     * Перевірити чи конкретний звук зараз грає
     */
    isSoundPlaying(soundKey) {
        return this.sounds[soundKey] && this.sounds[soundKey].isPlaying;
    }
    
    // ========== UTILITY ==========
    
    /**
     * Завантажити налаштування з localStorage
     */
    loadSetting(key, defaultValue) {
        try {
            const value = localStorage.getItem(`audio_${key}`);
            return value !== null ? JSON.parse(value) : defaultValue;
        } catch (e) {
            console.warn(`⚠️ Помилка завантаження налаштування ${key}:`, e);
            return defaultValue;
        }
    }
    
    /**
     * Зберегти налаштування в localStorage
     */
    saveSetting(key, value) {
        try {
            localStorage.setItem(`audio_${key}`, JSON.stringify(value));
        } catch (e) {
            console.warn(`⚠️ Помилка збереження налаштування ${key}:`, e);
        }
    }
    
    /**
     * Очищення ресурсів
     */
    destroy() {
        this.stopMusic();
        this.stopAllSounds();
        this.isInitialized = false;
    }
}

export default AudioManager;
