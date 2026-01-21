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
    getSpinnerCount() {
        const data = this.load();
        return data?.spinnerCount || 0;
    }
    setSpinnerCount(count) {
        const data = this.load() || {};
        data.spinnerCount = Math.max(0, count);
        this.save(data);
    }
    addSpinnerCount(amount) {
        const current = this.getSpinnerCount();
        this.setSpinnerCount(current + amount);
    }
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