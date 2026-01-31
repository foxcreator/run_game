import apiClient from '../systems/ApiClient.js';
import SaveSystem from '../systems/SaveSystem.js';

/**
 * LoginScene - "Військовий облік" 🪖
 * Використовує HTML overlay для input (вирішує проблему масштабування)
 */
class LoginScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoginScene' });
        this.saveSystem = null;
        this.loginOverlay = null;
    }

    create() {
        const { width, height } = this.cameras.main;
        this.saveSystem = new SaveSystem();

        // Фон
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x2d2d2d, 0x2d2d2d, 0x1a1a1a, 0x1a1a1a, 1);
        bg.fillRect(0, 0, width, height);

        // Якщо вже залогінений — пропускаємо
        if (apiClient.isLoggedIn()) {
            this.goToMenu();
            return;
        }

        // Створюємо HTML overlay для форми логіну
        this.createLoginOverlay();

        // WebSocket
        apiClient.onPlayersOnline = (count) => {
            const onlineEl = document.getElementById('login-online-count');
            if (onlineEl) {
                onlineEl.textContent = `🟢 Ухилянтів онлайн: ${count}`;
            }
        };
        apiClient.connectWebSocket();
    }

    createLoginOverlay() {
        // Видаляємо попередній якщо є
        this.removeLoginOverlay();

        const overlay = document.createElement('div');
        overlay.id = 'login-overlay';
        overlay.innerHTML = `
            <style>
                #login-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    pointer-events: none;
                }
                #login-document {
                    width: 450px;
                    background: #f5e6c8;
                    border: 3px solid #8b7355;
                    border-radius: 4px;
                    box-shadow: 8px 8px 20px rgba(0,0,0,0.5);
                    padding: 30px 25px;
                    text-align: center;
                    position: relative;
                    pointer-events: auto;
                    font-family: Arial, sans-serif;
                }
                #login-stamp {
                    position: absolute;
                    top: 15px;
                    right: 20px;
                    color: #8B0000;
                    font-size: 14px;
                    font-weight: bold;
                    transform: rotate(-15deg);
                }
                #login-emblem {
                    font-size: 64px;
                    margin-bottom: 10px;
                }
                #login-title {
                    color: #2d2d2d;
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 15px;
                    line-height: 1.4;
                }
                #login-subtitle {
                    color: #4a4a4a;
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 20px;
                }
                #login-divider {
                    width: 90%;
                    height: 2px;
                    background: #8b7355;
                    margin: 0 auto 20px;
                }
                #login-label {
                    color: #2d2d2d;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: left;
                    margin-bottom: 8px;
                }
                #login-input {
                    width: 100%;
                    height: 50px;
                    font-size: 22px;
                    padding: 10px 15px;
                    border: 2px solid #8b7355;
                    background: white;
                    color: #2d2d2d;
                    text-align: center;
                    font-family: 'Courier New', monospace;
                    font-weight: bold;
                    border-radius: 4px;
                    outline: none;
                    box-sizing: border-box;
                }
                #login-input:focus {
                    border-color: #2e7d32;
                    box-shadow: 0 0 5px rgba(46, 125, 50, 0.3);
                }
                #login-hint {
                    color: #888;
                    font-size: 12px;
                    font-style: italic;
                    margin-top: 8px;
                    margin-bottom: 25px;
                }
                #login-button {
                    width: 280px;
                    height: 55px;
                    background: #2e7d32;
                    border: 2px solid #1b5e20;
                    border-radius: 4px;
                    color: white;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: Arial, sans-serif;
                }
                #login-button:hover {
                    background: #388e3c;
                    transform: scale(1.05);
                }
                #login-button:active {
                    transform: scale(0.98);
                }
                #login-seal {
                    position: absolute;
                    bottom: 60px;
                    right: 30px;
                    color: #8B0000;
                    font-size: 12px;
                    opacity: 0.6;
                }
                #login-warning {
                    color: #666;
                    font-size: 11px;
                    font-style: italic;
                    margin-top: 20px;
                    line-height: 1.5;
                }
                #login-error {
                    color: #8B0000;
                    font-size: 14px;
                    font-weight: bold;
                    margin-top: 15px;
                    min-height: 20px;
                }
                #login-online-count {
                    position: absolute;
                    bottom: -40px;
                    left: 50%;
                    transform: translateX(-50%);
                    color: #888;
                    font-size: 14px;
                }
            </style>
            <div id="login-document">
                <div id="login-stamp">🔴 ТАЄМНО</div>
                <div id="login-emblem">🪖</div>
                <div id="login-title">ТЕРИТОРІАЛЬНИЙ ЦЕНТР<br>КОМПЛЕКТУВАННЯ</div>
                <div id="login-subtitle">📋 РЕЄСТРАЦІЯ УХИЛЯНТА</div>
                <div id="login-divider"></div>
                <div id="login-label">Позивний:</div>
                <input type="text" id="login-input" placeholder="Введіть позивний..." maxlength="50" autocomplete="off">
                <div id="login-hint">(латиниця, кирилиця, цифри та _)</div>
                <button id="login-button">🏃 ТІКАТИ ВІД ОБЛІКУ</button>
                <div id="login-seal">📍<br>М.П.</div>
                <div id="login-error"></div>
                <div id="login-warning">⚠️ Увага! Ухиляння від обліку карається<br>збільшенням кількості ворогів...</div>
                <div id="login-online-count">🟢 Підключення...</div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.loginOverlay = overlay;

        // Event listeners
        const input = document.getElementById('login-input');
        const button = document.getElementById('login-button');

        if (input) {
            input.focus();
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }

        if (button) {
            button.addEventListener('click', () => {
                this.handleLogin();
            });
        }
    }

    async handleLogin() {
        const input = document.getElementById('login-input');
        const errorEl = document.getElementById('login-error');
        if (!input || !errorEl) return;

        const username = input.value.trim();

        if (!username) {
            this.showError('❌ Введіть позивний!');
            return;
        }

        if (username.length < 2) {
            this.showError('❌ Мінімум 2 символи');
            return;
        }

        if (username.length > 50) {
            this.showError('❌ Максимум 50 символів');
            return;
        }

        if (!/^[a-zA-Z0-9_\u0400-\u04FF]+$/.test(username)) {
            this.showError('❌ Тільки літери, цифри та _');
            return;
        }

        try {
            errorEl.style.color = '#666';
            errorEl.textContent = '⏳ Перевірка документів...';

            const result = await apiClient.login(username);

            if (result.success) {
                await this.saveSystem.syncFromServer();

                errorEl.style.color = '#2e7d32';
                errorEl.textContent = '✅ Дозвіл на втечу отримано!';

                this.time.delayedCall(500, () => {
                    this.goToMenu();
                });
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('❌ ' + (error.message || 'Помилка входу'));
        }
    }

    showError(message) {
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
            errorEl.style.color = '#8B0000';
            errorEl.textContent = message;
        }
    }

    removeLoginOverlay() {
        const existing = document.getElementById('login-overlay');
        if (existing) {
            existing.remove();
        }
        this.loginOverlay = null;
    }

    goToMenu() {
        this.removeLoginOverlay();
        this.scene.start('MenuScene');
    }

    shutdown() {
        this.removeLoginOverlay();
    }
}

export default LoginScene;
