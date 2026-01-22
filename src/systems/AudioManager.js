class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.musicTracks = ['back_1', 'back_2', 'back_3', 'back_4', 'back_5', 'back_6', 'back_7', 'back_8', 'back_9'];
        this.currentTrack = null;
        this.nextTrack = null;
        this.currentTrackKey = null;
        this.playedTracks = [];
        this.currentPlaylist = [];
        this.musicVolume = this.loadSetting('musicVolume', 0.5);
        this.musicEnabled = this.loadSetting('musicEnabled', true);
        this.soundsVolume = this.loadSetting('soundsVolume', 0.7);
        this.soundsEnabled = this.loadSetting('soundsEnabled', true);
        this.sounds = {};
        this.crossfadeDuration = 2000;
        this.isCrossfading = false;
        this.isPaused = false;
        this.isInitialized = false;
    }
    init() {
        if (this.isInitialized) return true;

        const existingTracks = [];
        for (const trackKey of this.musicTracks) {
            if (this.scene.cache.audio.exists(trackKey)) {
                existingTracks.push(trackKey);
            } else {
                console.warn(`AudioManager: Music track '${trackKey}' not found in cache. Skipping.`);
            }
        }

        if (existingTracks.length === 0) {
            console.error('AudioManager: No music tracks found!');
            return false;
        }

        this.musicTracks = existingTracks;
        this.isInitialized = true;
        return true;
    }
    startMusic() {
        if (!this.isInitialized) {
            return;
        }
        if (!this.musicEnabled) {
            return;
        }
        this.createNewPlaylist();
        const randomIndex = Math.floor(Math.random() * this.currentPlaylist.length);
        const firstTrack = this.currentPlaylist[randomIndex];
        this.playTrack(firstTrack);
    }
    createNewPlaylist() {
        this.currentPlaylist = [...this.musicTracks];
        for (let i = this.currentPlaylist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.currentPlaylist[i], this.currentPlaylist[j]] =
                [this.currentPlaylist[j], this.currentPlaylist[i]];
        }
    }
    playTrack(trackKey) {
        if (!this.isInitialized || !this.musicEnabled) return;
        if (this.currentTrack && !this.isCrossfading) {
            this.currentTrack.stop();
        }
        const track = this.scene.sound.add(trackKey, {
            volume: this.musicVolume,
            loop: false
        });
        track.once('complete', () => {
            this.playNextTrack();
        });
        this.currentTrack = track;
        this.currentTrackKey = trackKey;
        this.currentTrack.play();
        if (!this.playedTracks.includes(trackKey)) {
            this.playedTracks.push(trackKey);
        }
    }
    playNextTrack() {
        if (!this.isInitialized || !this.musicEnabled) return;
        const currentIndex = this.currentPlaylist.indexOf(this.currentTrackKey);
        let nextTrackKey;
        if (currentIndex === -1 || currentIndex === this.currentPlaylist.length - 1) {
            this.createNewPlaylist();
            nextTrackKey = this.currentPlaylist[0];
        } else {
            nextTrackKey = this.currentPlaylist[currentIndex + 1];
        }
        this.crossfadeToTrack(nextTrackKey);
    }
    crossfadeToTrack(nextTrackKey) {
        if (!this.isInitialized || this.isCrossfading) return;
        this.isCrossfading = true;
        const oldTrack = this.currentTrack;
        const oldVolume = oldTrack ? oldTrack.volume : 0;
        this.nextTrack = this.scene.sound.add(nextTrackKey, {
            volume: 0,
            loop: false
        });
        this.nextTrack.once('complete', () => {
            this.playNextTrack();
        });
        this.nextTrack.play();
        const startTime = Date.now();
        const fadeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.crossfadeDuration, 1.0);
            if (oldTrack && oldTrack.isPlaying) {
                oldTrack.setVolume(oldVolume * (1 - progress));
            }
            if (this.nextTrack && this.nextTrack.isPlaying) {
                this.nextTrack.setVolume(this.musicVolume * progress);
            }
            if (progress >= 1.0) {
                clearInterval(fadeInterval);
                if (oldTrack) {
                    oldTrack.stop();
                    oldTrack.destroy();
                }
                this.currentTrack = this.nextTrack;
                this.currentTrackKey = nextTrackKey;
                this.nextTrack = null;
                this.isCrossfading = false;
            }
        }, 50);
    }
    pauseMusic() {
        if (this.currentTrack && this.currentTrack.isPlaying) {
            this.currentTrack.pause();
            this.isPaused = true;
        }
        if (this.nextTrack && this.nextTrack.isPlaying) {
            this.nextTrack.pause();
        }
    }
    resumeMusic() {
        if (this.currentTrack && this.isPaused) {
            this.currentTrack.resume();
            this.isPaused = false;
        }
        if (this.nextTrack && this.nextTrack.isPaused) {
            this.nextTrack.resume();
        }
    }
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
    }
    setMusicVolume(volume) {
        this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
        if (this.currentTrack) {
            this.currentTrack.setVolume(this.musicVolume);
        }
        if (this.nextTrack) {
            const currentNextVolume = this.nextTrack.volume;
            const progress = currentNextVolume / (this.musicVolume || 0.5);
            this.nextTrack.setVolume(this.musicVolume * progress);
        }
        this.saveSetting('musicVolume', this.musicVolume);
    }
    setMusicEnabled(enabled) {
        this.musicEnabled = enabled;
        this.saveSetting('musicEnabled', enabled);
        if (!enabled) {
            this.stopMusic();
        } else {
            if (this.scene && this.scene.scene.key === 'GameScene') {
                this.startMusic();
            } else {
            }
        }
    }
    getMusicVolume() {
        return this.musicVolume;
    }
    isMusicEnabled() {
        return this.musicEnabled;
    }
    playSound(soundKey, loop = false, volume = null, sourceKey = null) {
        if (!this.isInitialized || !this.soundsEnabled) return null;
        const audioFile = sourceKey || soundKey;
        if (!this.scene.cache.audio.exists(audioFile)) {
            return null;
        }

        const finalVolume = volume !== null ? volume : this.soundsVolume;

        // OPTIMIZATION: Fire-and-forget for non-looping sounds (One Shots)
        if (!loop) {
            this.scene.sound.play(audioFile, {
                volume: finalVolume,
                loop: false
            });
            return null; // We don't control one-shots after playing
        }

        // For looping sounds (Background noise, engines, running) - allow only one instance
        if (this.sounds[soundKey] && this.sounds[soundKey].isPlaying) {
            return this.sounds[soundKey];
        }

        if (this.sounds[soundKey]) {
            this.sounds[soundKey].destroy();
        }

        const sound = this.scene.sound.add(audioFile, {
            volume: finalVolume,
            loop: true
        });
        sound.play();
        this.sounds[soundKey] = sound;
        return sound;
    }
    stopSound(soundKey) {
        if (this.sounds[soundKey]) {
            this.sounds[soundKey].stop();
            this.sounds[soundKey].destroy();
            delete this.sounds[soundKey];
        }
    }
    pauseSounds() {
        for (const soundKey in this.sounds) {
            if (this.sounds[soundKey] && this.sounds[soundKey].isPlaying) {
                this.sounds[soundKey].pause();
            }
        }
    }
    resumeSounds() {
        for (const soundKey in this.sounds) {
            if (this.sounds[soundKey] && this.sounds[soundKey].isPaused) {
                this.sounds[soundKey].resume();
            }
        }
    }
    stopAllSounds() {
        for (const soundKey in this.sounds) {
            this.stopSound(soundKey);
        }
    }
    setSoundsVolume(volume) {
        this.soundsVolume = Phaser.Math.Clamp(volume, 0, 1);
        for (const soundKey in this.sounds) {
            if (this.sounds[soundKey]) {
                this.sounds[soundKey].setVolume(this.soundsVolume);
            }
        }
        this.saveSetting('soundsVolume', this.soundsVolume);
    }
    setSoundsEnabled(enabled) {
        this.soundsEnabled = enabled;
        this.saveSetting('soundsEnabled', enabled);
        if (!enabled) {
            this.stopAllSounds();
        } else {
        }
    }
    getSoundsVolume() {
        return this.soundsVolume;
    }
    isSoundsEnabled() {
        return this.soundsEnabled;
    }
    isSoundPlaying(soundKey) {
        return this.sounds[soundKey] && this.sounds[soundKey].isPlaying;
    }
    getSound(soundKey) {
        return this.sounds[soundKey] || null;
    }
    loadSetting(key, defaultValue) {
        try {
            const value = localStorage.getItem(`audio_${key}`);
            return value !== null ? JSON.parse(value) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }
    saveSetting(key, value) {
        try {
            localStorage.setItem(`audio_${key}`, JSON.stringify(value));
        } catch (e) {
        }
    }
    destroy() {
        this.stopMusic();
        this.stopAllSounds();
        this.isInitialized = false;
    }
}
export default AudioManager;