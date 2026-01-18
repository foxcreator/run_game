// SaveSystem - система збереження/завантаження даних (localStorage)
class SaveSystem {
    constructor() {
        this.STORAGE_KEY = 'busification_run_save';
    }
    
    /**
     * Зберігає дані в localStorage
     * @param {Object} data - дані для збереження
     */
    save(data) {
        try {
            const jsonData = JSON.stringify(data);
            localStorage.setItem(this.STORAGE_KEY, jsonData);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Завантажує дані з localStorage
     * @returns {Object|null} - завантажені дані або null
     */
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
    
    /**
     * Отримує bankedMoney (або 0 якщо немає)
     * @returns {number}
     */
    getBankedMoney() {
        const data = this.load();
        return data?.bankMoney || 0;
    }
    
    /**
     * Встановлює bankedMoney
     * @param {number} amount
     */
    setBankedMoney(amount) {
        const data = this.load() || {};
        data.bankMoney = Math.max(0, amount);
        this.save(data);
    }
    
    /**
     * Додає гроші до bankedMoney
     * @param {number} amount
     */
    addBankedMoney(amount) {
        const current = this.getBankedMoney();
        this.setBankedMoney(current + amount);
    }
    
    /**
     * Отримує bestScore (або 0 якщо немає)
     * @returns {number}
     */
    getBestScore() {
        const data = this.load();
        return data?.bestScore || 0;
    }
    
    /**
     * Встановлює bestScore (якщо новий більший)
     * @param {number} score
     */
    setBestScore(score) {
        const current = this.getBestScore();
        if (score > current) {
            const data = this.load() || {};
            data.bestScore = score;
            this.save(data);
        }
    }
    
    /**
     * Очищає всі збережені дані
     */
    clear() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (error) {
            return false;
        }
    }
}

export default SaveSystem;
