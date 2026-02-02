const API_URL = '/api';
let adminPassword = '';

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const passwordInput = document.getElementById('admin-password');
const loginError = document.getElementById('login-error');

// Stats elements
const statPlayers = document.getElementById('stat-players');
const statGames = document.getElementById('stat-games');
const statPlaytime = document.getElementById('stat-playtime');
const statTopPlayer = document.getElementById('stat-top-player');

// Table elements
const playersTbody = document.getElementById('players-tbody');
const leaderboardTbody = document.getElementById('leaderboard-tbody');

// API Helper
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (adminPassword) {
        headers['Authorization'] = `Admin ${adminPassword}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

// Format time (seconds to human readable)
function formatTime(seconds) {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}г ${minutes}хв`;
    }
    if (minutes > 0) {
        return `${minutes}хв ${secs}с`;
    }
    return `${secs}с`;
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Load stats
async function loadStats() {
    try {
        const stats = await apiRequest('/leaderboard/stats');
        statPlayers.textContent = stats.playerCount || 0;
        statGames.textContent = stats.totalGames || 0;
        statPlaytime.textContent = formatTime(stats.totalPlaytime);
        statTopPlayer.textContent = stats.topPlayer
            ? `${stats.topPlayer.username} (${formatTime(stats.topPlayer.bestSurvivalTime)})`
            : '-';
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Load players
async function loadPlayers() {
    try {
        const data = await apiRequest('/leaderboard/admin/players?limit=50');
        playersTbody.innerHTML = data.players.map(player => `
            <tr>
                <td>${player.id}</td>
                <td>${player.username}</td>
                <td>$${player.data?.bankMoney || 0}</td>
                <td>${player.stats?.totalGames || 0}</td>
                <td>${formatTime(player.stats?.totalPlaytime)}</td>
                <td>${formatTime(player.stats?.bestSurvivalTime)}</td>
                <td>${formatDate(player.lastSeen)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load players:', error);
        playersTbody.innerHTML = '<tr><td colspan="7">Помилка завантаження</td></tr>';
    }
}

// Load leaderboard
async function loadLeaderboard() {
    try {
        const leaderboard = await apiRequest('/leaderboard?limit=10');
        leaderboardTbody.innerHTML = leaderboard.map(entry => `
            <tr>
                <td>${entry.rank}</td>
                <td>${entry.username}</td>
                <td>${formatTime(entry.survivalTime)}</td>
                <td>${entry.score}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        leaderboardTbody.innerHTML = '<tr><td colspan="4">Помилка завантаження</td></tr>';
    }
}

// Login
async function login() {
    const password = passwordInput.value.trim();
    if (!password) {
        loginError.textContent = 'Введіть пароль';
        return;
    }

    adminPassword = password;
    loginError.textContent = '';

    try {
        // Перевіряємо пароль, запитуючи захищений endpoint
        await apiRequest('/leaderboard/admin/players?limit=1');

        // Успішний логін
        localStorage.setItem('adminPassword', password);
        showDashboard();
    } catch (error) {
        loginError.textContent = 'Невірний пароль';
        adminPassword = '';
    }
}

// Show dashboard
function showDashboard() {
    loginScreen.classList.remove('active');
    dashboardScreen.classList.add('active');
    loadStats();
    loadPlayers();
    loadLeaderboard();

    // Auto-refresh every 30 seconds
    setInterval(() => {
        loadStats();
        loadLeaderboard();
    }, 30000);
}

// Logout
function logout() {
    localStorage.removeItem('adminPassword');
    adminPassword = '';
    dashboardScreen.classList.remove('active');
    loginScreen.classList.add('active');
    passwordInput.value = '';
}

// Event listeners
const forceUpdateBtn = document.getElementById('force-update-btn');

loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', logout);

if (forceUpdateBtn) {
    forceUpdateBtn.addEventListener('click', async () => {
        if (!confirm('Ви впевнені? Це перезавантажить гру у ВСІХ гравців зараз!')) return;

        try {
            const result = await apiRequest('/admin/force-reload', {
                method: 'POST'
            });
            alert('Успішно: ' + result.message);
        } catch (error) {
            alert('Помилка: ' + error.message);
        }
    });
}

logoutBtn.addEventListener('click', logout);
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
});

// Check saved password on load
const savedPassword = localStorage.getItem('adminPassword');
if (savedPassword) {
    adminPassword = savedPassword;
    // Verify it's still valid
    apiRequest('/leaderboard/admin/players?limit=1')
        .then(() => showDashboard())
        .catch(() => {
            localStorage.removeItem('adminPassword');
            adminPassword = '';
        });
}
