/**
 * ApiClient - клієнт для роботи з бекенд API
 * Обробляє авторизацію, синхронізацію даних та WebSocket
 */
class ApiClient {
    constructor(baseUrl = '') {
        // Визначаємо URL API (в production буде той же домен)
        this.baseUrl = baseUrl || this.getApiUrl();
        this.token = localStorage.getItem('auth_token');
        this.username = localStorage.getItem('auth_username');
        this.socket = null;
        this.onLeaderboardUpdate = null;
        this.onPlayersOnline = null;
    }

    getApiUrl() {
        // В development використовуємо той же host
        // В production nginx проксує /api на Node.js
        return '';
    }

    // === Авторизація ===

    async login(username) {
        try {
            const response = await fetch(`${this.baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();

            this.token = data.token;
            this.username = data.player.username;

            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('auth_username', data.player.username);

            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    isLoggedIn() {
        return !!this.token;
    }

    getUsername() {
        return this.username;
    }

    logout() {
        this.token = null;
        this.username = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_username');
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // === API requests ===

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            // Token expired or invalid
            this.logout();
            throw new Error('Session expired');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Request failed: ${response.status}`);
        }

        return response.json();
    }

    // === Дані гравця ===

    async getPlayerData() {
        if (!this.isLoggedIn()) return null;
        return this.request('/api/player');
    }

    async syncPlayerData(data) {
        if (!this.isLoggedIn()) return null;
        return this.request('/api/player/sync', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async endGame(gameData) {
        if (!this.isLoggedIn()) return null;
        return this.request('/api/player/game-end', {
            method: 'POST',
            body: JSON.stringify(gameData)
        });
    }

    // === Лідерборд ===

    async getLeaderboard(limit = 100) {
        return this.request(`/api/leaderboard?limit=${limit}`);
    }

    async getMyRank() {
        if (!this.isLoggedIn()) return null;
        return this.request('/api/leaderboard/me');
    }

    // === WebSocket ===

    connectWebSocket() {
        // Динамічний імпорт Socket.IO
        if (typeof io === 'undefined') {
            // Завантажуємо Socket.IO з CDN якщо ще не завантажено
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.7.4/socket.io.min.js';
            script.onload = () => this.initSocket();
            document.head.appendChild(script);
        } else {
            this.initSocket();
        }
    }

    initSocket() {
        if (this.socket) return;

        const socketUrl = this.baseUrl || window.location.origin;
        this.socket = io(socketUrl, {
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {

        });

        this.socket.on('leaderboard:update', (data) => {

            if (this.onLeaderboardUpdate) {
                this.onLeaderboardUpdate(data);
            }
        });

        this.socket.on('leaderboard:initial', (data) => {

            if (this.onLeaderboardUpdate) {
                this.onLeaderboardUpdate(data);
            }
        });

        this.socket.on('players:online', (data) => {
            if (this.onPlayersOnline) {
                this.onPlayersOnline(data.count);
            }
        });

        this.socket.on('disconnect', () => {

        });
    }

    disconnectWebSocket() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

// Singleton instance
const apiClient = new ApiClient();

export default apiClient;
export { ApiClient };
