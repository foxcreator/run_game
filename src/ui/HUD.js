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
    }
    create(player) {
        try {
            if (!this.scene) {
                return;
            }
            this.player = player;
            const { width, height } = this.scene.cameras.main;
            const barX = 50;
            const barY = 50;
            const barWidth = 300;
            const barHeight = 25;
            this.staminaBarBg = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x2c3e50, 0.8)
                .setOrigin(0, 0.5)
                .setStrokeStyle(2, 0xffffff, 0.5)
                .setScrollFactor(0)
                .setDepth(200);
            this.staminaBar = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x3498db, 1)
                .setOrigin(0, 0.5)
                .setScrollFactor(0)
                .setDepth(201);
            this.staminaText = this.scene.add.text(barX + barWidth + 20, barY, '100/100', {
                fontSize: '18px',
                fill: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(202);
            const dashBarY = barY + 40;
            const dashBarWidth = 150;
            const dashBarHeight = 15;
            this.dashCooldownBg = this.scene.add.rectangle(barX, dashBarY, dashBarWidth, dashBarHeight, 0x2c3e50, 0.8)
                .setOrigin(0, 0.5)
                .setStrokeStyle(2, 0xffffff, 0.5)
                .setScrollFactor(0)
                .setDepth(200);
            this.dashCooldownBar = this.scene.add.rectangle(barX, dashBarY, dashBarWidth, dashBarHeight, 0xf39c12, 1)
                .setOrigin(0, 0.5)
                .setScrollFactor(0)
                .setDepth(201);
            this.dashText = this.scene.add.text(barX, dashBarY - 25, 'DASH', {
                fontSize: '14px',
                fill: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(202);
            const captureBarY = dashBarY + 40;
            const captureBarWidth = 300;
            const captureBarHeight = 25;
            this.captureBarBg = this.scene.add.rectangle(barX, captureBarY, captureBarWidth, captureBarHeight, 0x2c3e50, 0.8)
                .setOrigin(0, 0.5)
                .setStrokeStyle(2, 0xffffff, 0.5)
                .setScrollFactor(0)
                .setDepth(200);
            this.captureBar = this.scene.add.rectangle(barX, captureBarY, captureBarWidth, captureBarHeight, 0xe74c3c, 1)
                .setOrigin(0, 0.5)
                .setScrollFactor(0)
                .setDepth(201);
            this.captureText = this.scene.add.text(barX + captureBarWidth + 20, captureBarY, 'CAPTURE 0/100', {
                fontSize: '18px',
                fill: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(202);
            const moneyY = captureBarY + 40;
            this.moneyText = this.scene.add.text(barX, moneyY, 'Зароблено: $0 | Банк: $0', {
                fontSize: '18px',
                fill: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(202);
            this.bonusIconsContainer = this.scene.add.container(barX, moneyY + 30)
                .setScrollFactor(0)
                .setDepth(202);
            const multiplierX = width - 20;
            const multiplierY = 30;
            this.multiplierBg = this.scene.add.rectangle(
                multiplierX, multiplierY, 180, 70, 0x000000, 0.7
            )
            .setOrigin(1, 0)
            .setScrollFactor(0)
            .setDepth(200);
            this.multiplierLabel = this.scene.add.text(
                multiplierX - 10, multiplierY + 15, '⚡ РИЗИК:', {
                    fontSize: '16px',
                    fill: '#FFFFFF',
                    fontFamily: 'Arial, sans-serif',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 2
                }
            )
            .setOrigin(1, 0.5)
            .setScrollFactor(0)
            .setDepth(201);
            this.multiplierText = this.scene.add.text(
                multiplierX - 10, multiplierY + 45, 'x1', {
                    fontSize: '36px',
                    fill: '#FFFFFF',
                    fontFamily: 'Arial, sans-serif',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 3
                }
            )
            .setOrigin(1, 0.5)
            .setScrollFactor(0)
            .setDepth(201);
        } catch (error) {
        }
    }
    setCaptureSystem(captureSystem) {
        this.captureSystem = captureSystem;
    }
    update() {
        if (!this.player) {
            return;
        }
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
        this.updateBonusIcons();
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
    }
}
export default HUD;