class SaveSystem {
    constructor() {
        this.STORAGE_KEY = 'busification_run_save';
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
}
export default SaveSystem;