class HUD {
    constructor(scene) {
        this.scene = scene;
        this.player = null;
        this.staminaBar = null;
        this.staminaBarBg = null;
        this.staminaText = null;
        this.dashCooldownBar = null;
        this.dashCooldownBg = null;
        this.captureBar = null;
        this.captureBarBg = null;
        this.captureText = null;
        this.moneyText = null;
        this.moneyTextBg = null;
        this.bonusIcons = [];
        this.multiplierText = null;
        this.multiplierBg = null;
        this.multiplierLabel = null;

        // Таймер виживання
        this.survivalTimerBg = null;
        this.survivalTimerText = null;
        this.survivalElapsedTime = 0;  // Час виживання в мілісекундах (НЕ рахується на паузі)
    }

    createBonusPanel(width, height) {
        // Container for bonuses at bottom center
        this.bonusIconsContainer = this.scene.add.container(width / 2, height - 50).setScrollFactor(0).setDepth(200);
        this.bonusSlots = {};

        const keys = ['COFFEE', 'GAS', 'SALO', 'MAGNET', 'SPINNER', 'ARMOR', 'DEPUTY', 'MAGNATE']; // Ordered roughly by price/utility or just arbitrary 8
        // Or better: match the shop sort or just consistant ID based.
        // Let's stick to the previous list + Magnate.
        // Old list: ['SPINNER', 'MAGNET', 'GAS', 'DEPUTY', 'COFFEE', 'SALO', 'ARMOR']
        // New list sorted by price (asc) from config manual check:
        // COFFEE (100), GAS (200), SALO (250), MAGNET (300), SPINNER (450), ARMOR (500), DEPUTY (800), MAGNATE (1000)

        const sortedKeys = ['SPINNER', 'MAGNET', 'GAS', 'DEPUTY', 'COFFEE', 'SALO', 'ARMOR', 'MAGNATE'];

        const slotSize = 50;
        const spacing = 10;
        // Centering: total width = N * size + (N-1) * spacing
        const totalWidth = sortedKeys.length * slotSize + (sortedKeys.length - 1) * spacing;
        const startX = -totalWidth / 2 + slotSize / 2;

        sortedKeys.forEach((key, index) => {
            const x = startX + index * (slotSize + spacing);

            // Slot BG
            const bg = this.scene.add.rectangle(x, 0, slotSize, slotSize, 0x000000, 0.5);
            bg.setStrokeStyle(1, 0x888888);
            this.bonusIconsContainer.add(bg);

            // Icon Mapping
            const iconMap = {
                SPINNER: 'bonus_spinner',
                MAGNET: 'bonus_officnik',
                GAS: 'bonus_teren',
                DEPUTY: 'bonus_deputy',
                COFFEE: 'bonus_coffee',
                SALO: 'bonus_salo',
                ARMOR: 'bonus_armor',
                MAGNATE: 'bonus_magnate'
            };

            const iconKey = iconMap[key] || 'bonus_base';
            // Check texture existence to avoid white box
            if (this.scene.textures.exists(iconKey)) {
                const icon = this.scene.add.image(x, 0, iconKey);
                icon.setDisplaySize(32, 32);
                this.bonusIconsContainer.add(icon);
            } else {
                // Text fallback?
                this.scene.add.text(x, 0, key[0], { fontSize: '20px' }).setOrigin(0.5);
            }

            // Key Number (1-8)
            const keyText = this.scene.add.text(x - 20, -20, `${index + 1}`, {
                fontSize: '10px',
                fill: '#ffff00',
                fontFamily: 'Arial',
                stroke: '#000',
                strokeThickness: 2
            });
            this.bonusIconsContainer.add(keyText);

            // Count
            const countText = this.scene.add.text(x + 10, 10, '0', {
                fontSize: '12px',
                fill: '#ffffff',
                stroke: '#000',
                strokeThickness: 2
            });
            this.bonusIconsContainer.add(countText);

            // Cooldown Overlay (optional)
            const cdOverlay = this.scene.add.rectangle(x, 0, slotSize, slotSize, 0x000000, 0.7);
            cdOverlay.setVisible(false);
            this.bonusIconsContainer.add(cdOverlay);

            this.bonusSlots[key] = { bg, countText, cdOverlay };
        });
    }

    updateBonusPanel() {
        if (!this.scene.bonusManager || !this.bonusSlots) return;

        Object.keys(this.bonusSlots).forEach(key => {
            const count = this.scene.bonusManager.getBonusCount(key);
            const slot = this.bonusSlots[key];

            if (slot) {
                slot.countText.setText(`${count}`);
                // Highlight active or usable
                const canUse = count > 0 && !this.scene.bonusManager.isCooldownActive(key);

                if (count === 0) {
                    slot.bg.setAlpha(0.3);
                    slot.bg.setStrokeStyle(1, 0x888888);
                } else if (this.scene.bonusManager.isEffectActive(key)) {
                    slot.bg.setAlpha(1);
                    slot.bg.setStrokeStyle(2, 0x00ff00); // Active effect green
                } else if (!canUse) {
                    slot.bg.setAlpha(0.5);
                    slot.bg.setStrokeStyle(1, 0xff0000); // Cooldown red
                } else {
                    slot.bg.setAlpha(0.8);
                    slot.bg.setStrokeStyle(1, 0xffd700); // Ready gold
                }
            }
        });
    }

    create(player) {
        try {
            if (!this.scene) return;
            this.player = player;
            const { width, height } = this.scene.cameras.main;

            // --- LEFT TOP BARS ---
            const barX = 50;
            const barY = 50;
            const barWidth = 300;
            const barHeight = 25;

            // 1. Stamina
            this.staminaBarBg = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x2c3e50, 0.8)
                .setOrigin(0, 0.5).setScrollFactor(0).setDepth(200);
            this.staminaBar = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x3498db, 1)
                .setOrigin(0, 0.5).setScrollFactor(0).setDepth(201);
            this.staminaText = this.scene.add.text(barX + barWidth + 20, barY, '100/100', {
                fontSize: '18px', fill: '#ffffff', stroke: '#000', strokeThickness: 2
            }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(202);

            // 2. Dash
            const dashBarY = barY + 40;
            const dashBarWidth = 150;
            const dashBarHeight = 15;
            this.dashCooldownBg = this.scene.add.rectangle(barX, dashBarY, dashBarWidth, dashBarHeight, 0x2c3e50, 0.8)
                .setOrigin(0, 0.5).setScrollFactor(0).setDepth(200);
            this.dashCooldownBar = this.scene.add.rectangle(barX, dashBarY, dashBarWidth, dashBarHeight, 0xf39c12, 1)
                .setOrigin(0, 0.5).setScrollFactor(0).setDepth(201);
            this.dashText = this.scene.add.text(barX, dashBarY - 25, 'РИВОК', {
                fontSize: '14px', fill: '#ffffff', stroke: '#000', strokeThickness: 1
            }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(202);

            // 3. Capture
            const captureBarY = dashBarY + 40;
            this.captureBarBg = this.scene.add.rectangle(barX, captureBarY, barWidth, barHeight, 0x2c3e50, 0.8)
                .setOrigin(0, 0.5).setScrollFactor(0).setDepth(200);
            this.captureBar = this.scene.add.rectangle(barX, captureBarY, 0, barHeight, 0xe74c3c, 1)
                .setOrigin(0, 0.5).setScrollFactor(0).setDepth(201);
            this.captureText = this.scene.add.text(barX + barWidth + 20, captureBarY, 'ЗАХОПЛЕННЯ 0%', {
                fontSize: '18px', fill: '#ffffff', stroke: '#000', strokeThickness: 2
            }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(202);

            // 4. Money
            const moneyY = captureBarY + 40;
            this.moneyText = this.scene.add.text(barX, moneyY, 'Зароблено: $0 | Банк: $0', {
                fontSize: '18px', fill: '#ffffff', stroke: '#000', strokeThickness: 2
            }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(202);

            // 5. Multiplier & Spinner Text
            const moneyMultiplierY = moneyY + 35;
            this.moneyMultiplierText = this.scene.add.text(barX, moneyMultiplierY, '', {
                fontSize: '24px', fill: '#playlist', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
            }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(202).setVisible(false);

            const spinnerY = moneyMultiplierY + 35;
            this.spinnerCooldownText = this.scene.add.text(barX, spinnerY, '', {
                fontSize: '16px', fill: '#ffffff', stroke: '#000', strokeThickness: 2
            }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(202).setVisible(false);

            // --- BONUS PANEL ---
            this.createBonusPanel(width, height);

            // --- RIGHT TOP ALERTS ---
            // Survival Timer
            const rightX = width - 20;
            const survivalTimerY = 15;
            this.survivalTimerBg = this.scene.add.rectangle(rightX, survivalTimerY, 180, 60, 0x000000, 0.7)
                .setOrigin(1, 0).setScrollFactor(0).setDepth(200);

            this.survivalTimerText = this.scene.add.text(rightX - 90, survivalTimerY + 30, '⏱️ 00:00', {
                fontSize: '32px', fill: '#00FF00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
            }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(201);

            this.survivalElapsedTime = 0;

            // Risk Multiplier
            const multiplierY = 85;
            this.multiplierBg = this.scene.add.rectangle(rightX, multiplierY, 180, 70, 0x000000, 0.7)
                .setOrigin(1, 0).setScrollFactor(0).setDepth(200);
            this.multiplierLabel = this.scene.add.text(rightX - 10, multiplierY + 15, '⚡ РИЗИК:', {
                fontSize: '16px', fill: '#FFFFFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
            }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(201);
            this.multiplierText = this.scene.add.text(rightX - 10, multiplierY + 45, 'x1', {
                fontSize: '36px', fill: '#FFFFFF', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
            }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(201);

        } catch (error) {
            console.error('HUD Create Error:', error);
        }
    }
    setCaptureSystem(captureSystem) {
        this.captureSystem = captureSystem;
    }

    updateSurvivalTimer(delta) {
        if (!this.survivalTimerText || !this.scene) return;

        // Додаємо дельту тільки якщо гра НЕ на паузі
        if (!this.scene.isPaused) {
            this.survivalElapsedTime += delta;
        }

        const totalSeconds = Math.floor(this.survivalElapsedTime / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        const timeString = `⏱️ ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        this.survivalTimerText.setText(timeString);

        // Зміна кольору залежно від часу
        if (totalSeconds < 60) {
            this.survivalTimerText.setFill('#00FF00'); // Зелений (0-1 хв)
        } else if (totalSeconds < 300) {
            this.survivalTimerText.setFill('#FFFF00'); // Жовтий (1-5 хв)
        } else if (totalSeconds < 600) {
            this.survivalTimerText.setFill('#FFA500'); // Помаранчевий (5-10 хв)
        } else {
            this.survivalTimerText.setFill('#FF0000'); // Червоний (10+ хв)
        }
    }

    update(delta = 16) {
        if (!this.player) {
            return;
        }

        // Оновлюємо таймер виживання (передаємо delta)
        this.updateSurvivalTimer(delta);
        if (this.moneyText) {
            if (!this.scene) {
                return;
            }
            const runMoney = typeof this.scene.runMoney === 'number' ? this.scene.runMoney : 0;
            const bankedMoney = typeof this.scene.bankedMoney === 'number' ? this.scene.bankedMoney : 0;
            const moneyString = `Зароблено: ${runMoney.toLocaleString()} грн | Банк: $${bankedMoney.toLocaleString()}`;
            this.moneyText.setText(moneyString);
        } else {
            if (!this.moneyTextWarningShown) {
                this.moneyTextWarningShown = true;
            }
        }
        // Оновлюємо множник грошей (Money Multiplier)
        if (this.moneyMultiplierText && this.scene.moneyMultiplier) {
            if (this.scene.moneyMultiplier > 1) {
                this.moneyMultiplierText.setVisible(true);
                this.moneyMultiplierText.setText(`💰 x${this.scene.moneyMultiplier} МНОЖНИК АКТИВНИЙ!`);

                // Пульсація тексту
                const scale = 1 + Math.sin(Date.now() / 200) * 0.1;
                this.moneyMultiplierText.setScale(scale);
            } else {
                this.moneyMultiplierText.setVisible(false);
            }
        }

        // Оновлюємо cooldown вертушки (Spinner Bonus)
        if (this.spinnerCooldownText && this.scene.spinnerBonus) {
            const usesLeft = this.scene.spinnerBonus.getUsesLeft();

            if (usesLeft <= 0) {
                this.spinnerCooldownText.setVisible(true);
                this.spinnerCooldownText.setText(`🌀 Вертушка: НЕМАЄ (купи в магазині)`);
                this.spinnerCooldownText.setFill('#ff0000');
            } else if (this.scene.spinnerBonus.isOnCooldownNow()) {
                const seconds = this.scene.spinnerBonus.getCooldownRemaining();
                this.spinnerCooldownText.setVisible(true);
                this.spinnerCooldownText.setText(`🌀 Вертушка: ${seconds}с (x${usesLeft})`);
                this.spinnerCooldownText.setFill('#ffffff');
            } else {
                this.spinnerCooldownText.setVisible(true);
                this.spinnerCooldownText.setText(`🌀 Вертушка: ГОТОВА (E) x${usesLeft}`);
                this.spinnerCooldownText.setFill('#00ff00');
            }
        }

        if (this.multiplierText && this.scene.getRiskMultiplier) {
            const multiplier = this.scene.getRiskMultiplier();
            this.multiplierText.setText(`x${multiplier}`);
            if (multiplier === 5) {
                this.multiplierText.setFill('#FF0000');
                this.multiplierText.setScale(1.2);
            } else if (multiplier === 3) {
                this.multiplierText.setFill('#FF6600');
                this.multiplierText.setScale(1.1);
            } else if (multiplier === 2) {
                this.multiplierText.setFill('#FFD700');
                this.multiplierText.setScale(1.05);
            } else {
                this.multiplierText.setFill('#FFFFFF');
                this.multiplierText.setScale(1);
            }
        }
        const stamina = this.player.getStamina();
        const staminaMax = this.player.getStaminaMax();
        const staminaPercent = Math.max(0, Math.min(1, stamina / staminaMax));
        const barWidth = 300;
        this.staminaBar.width = barWidth * staminaPercent;
        if (staminaPercent > 0.5) {
            this.staminaBar.setFillStyle(0x3498db);
        } else if (staminaPercent > 0.2) {
            this.staminaBar.setFillStyle(0xf39c12);
        } else {
            this.staminaBar.setFillStyle(0xe74c3c);
        }
        this.staminaText.setText(`${Math.floor(stamina)}/${staminaMax}`);
        const dashCooldown = this.player.getDashCooldown();
        const dashCooldownMax = this.player.getDashCooldownMax();
        const dashPercent = dashCooldown > 0 ? 1 - (dashCooldown / dashCooldownMax) : 1;
        const dashBarWidth = 150;
        this.dashCooldownBar.width = dashBarWidth * dashPercent;
        if (dashPercent >= 1) {
            this.dashCooldownBar.setFillStyle(0x2ecc71);
        } else {
            this.dashCooldownBar.setFillStyle(0x95a5a6);
        }
        if (this.captureSystem) {
            const capture = this.captureSystem.getCapture();
            const captureMax = this.captureSystem.getMaxCapture();
            const capturePercent = this.captureSystem.getCapturePercent();
            const captureBarWidth = 300;
            this.captureBar.width = captureBarWidth * capturePercent;
            if (capturePercent < 0.3) {
                this.captureBar.setFillStyle(0x2ecc71);
            } else if (capturePercent < 0.6) {
                this.captureBar.setFillStyle(0xf39c12);
            } else {
                this.captureBar.setFillStyle(0xe74c3c);
            }
            this.captureText.setText(`CAPTURE ${Math.floor(capture)}/${captureMax}`);
        }
        this.updateBonusPanel();
    }
    updateBonusIcons() {
        if (!this.player || !this.bonusIconsContainer) return;
        this.bonusIconsContainer.removeAll(true);
        let iconX = 0;
        const iconSize = 20;
        const iconSpacing = 25;
        if (this.player.speedBuffs && Array.isArray(this.player.speedBuffs) && this.player.speedBuffs.length > 0) {
            const icon = this.scene.add.rectangle(iconX, 0, iconSize, iconSize, 0x0000ff, 1)
                .setOrigin(0, 0.5);
            this.bonusIconsContainer.add(icon);
            iconX += iconSpacing;
        }
    }
    destroy() {
        if (this.staminaBar) this.staminaBar.destroy();
        if (this.staminaBarBg) this.staminaBarBg.destroy();
        if (this.staminaText) this.staminaText.destroy();
        if (this.dashCooldownBar) this.dashCooldownBar.destroy();
        if (this.dashCooldownBg) this.dashCooldownBg.destroy();
        if (this.dashText) this.dashText.destroy();
        if (this.captureBar) this.captureBar.destroy();
        if (this.captureBarBg) this.captureBarBg.destroy();
        if (this.captureText) this.captureText.destroy();
        if (this.moneyText) this.moneyText.destroy();
        if (this.bonusIconsContainer) this.bonusIconsContainer.destroy();
        if (this.multiplierText) this.multiplierText.destroy();
        if (this.multiplierBg) this.multiplierBg.destroy();
        if (this.multiplierLabel) this.multiplierLabel.destroy();
        if (this.survivalTimerBg) this.survivalTimerBg.destroy();
        if (this.survivalTimerText) this.survivalTimerText.destroy();
    }
}
export default HUD;