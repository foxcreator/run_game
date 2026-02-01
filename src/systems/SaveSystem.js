import apiClient from './ApiClient.js';

class SaveSystem {
    constructor() {
        this.STORAGE_KEY = 'busification_run_save';
        this.syncPending = false;
        this.lastSyncTime = 0;
        this.SYNC_INTERVAL = 30000; // 30 секунд між синхронізаціями
    }

    save(data) {
        try {
            const jsonData = JSON.stringify(data);
            localStorage.setItem(this.STORAGE_KEY, jsonData);
            return true;
        } catch (error) {
            return false;
        }
    }

    load() {
        try {
            const jsonData = localStorage.getItem(this.STORAGE_KEY);
            if (!jsonData) {
                return null;
            }
            return JSON.parse(jsonData);
        } catch (error) {
            return null;
        }
    }

    getBankedMoney() {
        const data = this.load();
        return data?.bankMoney || 0;
    }

    setBankedMoney(amount) {
        const data = this.load() || {};
        data.bankMoney = Math.max(0, amount);
        this.save(data);
        this.scheduleSyncToServer();
    }

    addBankedMoney(amount) {
        const current = this.getBankedMoney();
        this.setBankedMoney(current + amount);
    }

    getBestScore() {
        const data = this.load();
        return data?.bestScore || 0;
    }

    setBestScore(score) {
        const current = this.getBestScore();
        if (score > current) {
            const data = this.load() || {};
            data.bestScore = score;
            this.save(data);
        }
    }

    // Generic Bonus Methods
    getBonusCount(type) {
        const data = this.load();
        const bonuses = data?.bonuses || {};
        return bonuses[type] || 0;
    }

    setBonusCount(type, count) {
        const data = this.load() || {};
        if (!data.bonuses) data.bonuses = {};
        data.bonuses[type] = Math.max(0, count);
        this.save(data);
        this.scheduleSyncToServer();
    }

    addBonusCount(type, amount) {
        const current = this.getBonusCount(type);
        this.setBonusCount(type, current + amount);
    }

    // Deprecated specific Spinner methods (map to generic)
    getSpinnerCount() { return this.getBonusCount('SPINNER'); }
    setSpinnerCount(count) { this.setBonusCount('SPINNER', count); }
    addSpinnerCount(amount) { this.addBonusCount('SPINNER', amount); }

    clear() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (error) {
            return false;
        }
    }

    // === Server Sync Methods ===

    /**
     * Планує синхронізацію з сервером (з дебаунсингом)
     */
    scheduleSyncToServer() {
        if (!apiClient.isLoggedIn()) return;

        if (this.syncPending) return;

        const now = Date.now();
        if (now - this.lastSyncTime < this.SYNC_INTERVAL) {
            // Якщо недавно синхронізували, плануємо на пізніше
            this.syncPending = true;
            setTimeout(() => {
                this.syncPending = false;
                this.syncToServer();
            }, this.SYNC_INTERVAL);
            return;
        }

        this.syncToServer();
    }

    /**
     * Синхронізує локальні дані з сервером
     */
    async syncToServer() {
        if (!apiClient.isLoggedIn()) return;

        try {
            const localData = this.load() || {};
            await apiClient.syncPlayerData({
                bankMoney: localData.bankMoney || 0,
                bonuses: localData.bonuses || {}
            });
            this.lastSyncTime = Date.now();

        } catch (error) {
            console.error('Failed to sync to server:', error);
        }
    }

    /**
     * Синхронізує дані з сервера (при логіні)
     */
    async syncFromServer() {
        if (!apiClient.isLoggedIn()) return false;

        try {
            const serverData = await apiClient.getPlayerData();
            if (serverData) {
                const localData = this.load() || {};

                // Сервер — джерело правди для банку та бонусів
                localData.bankMoney = serverData.bankMoney;
                localData.bonuses = serverData.bonuses;

                // Зберігаємо найкращий час локально та на сервері
                if (serverData.stats?.bestSurvivalTime > (localData.bestScore || 0)) {
                    localData.bestScore = serverData.stats.bestSurvivalTime;
                }

                this.save(localData);

                return true;
            }
        } catch (error) {
            console.error('Failed to sync from server:', error);
        }
        return false;
    }

    /**
     * Відправляє результат гри на сервер
     */
    async reportGameEnd(score, survivalTime, moneyEarned) {
        if (!apiClient.isLoggedIn()) return;

        try {
            await apiClient.endGame({
                score,
                survivalTime,
                moneyEarned
            });
            this.lastSyncTime = Date.now();

        } catch (error) {
            console.error('Failed to report game end:', error);
        }
    }
}

export default SaveSystem;