// HUD - інтерфейс користувача
// Версія без логів - очищено всі console.log
class HUD {
    constructor(scene) {
        this.scene = scene;
        this.player = null;
        
        // Елементи HUD
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
        this.bonusIcons = []; // Масив іконок активних бонусів
    }
    
    create(player) {
        try {
            if (!this.scene) {
                console.error('❌ HUD.create() this.scene не існує!');
                return;
            }
            
            this.player = player;
            const { width, height } = this.scene.cameras.main;
            
            // HUD має бути на фіксованій позиції екрану (не слідує за камерою)
            // Бар стаміни
            const barX = 50;
            const barY = 50;
            const barWidth = 300;
            const barHeight = 25;
            
            // Фон бару стаміни (фіксована позиція на екрані)
            this.staminaBarBg = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x2c3e50, 0.8)
                .setOrigin(0, 0.5)
                .setStrokeStyle(2, 0xffffff, 0.5)
                .setScrollFactor(0) // Не слідує за камерою
                .setDepth(200); // HUD поверх всього
            
            // Бар стаміни
            this.staminaBar = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x3498db, 1)
                .setOrigin(0, 0.5)
                .setScrollFactor(0)
                .setDepth(201);
            
            // Текст стаміни
            this.staminaText = this.scene.add.text(barX + barWidth + 20, barY, '100/100', {
                fontSize: '18px',
                fill: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(202);
            
            // Dash cooldown бар
            const dashBarY = barY + 40;
            const dashBarWidth = 150;
            const dashBarHeight = 15;
            
            // Фон dash cooldown
            this.dashCooldownBg = this.scene.add.rectangle(barX, dashBarY, dashBarWidth, dashBarHeight, 0x2c3e50, 0.8)
                .setOrigin(0, 0.5)
                .setStrokeStyle(2, 0xffffff, 0.5)
                .setScrollFactor(0)
                .setDepth(200);
            
            // Dash cooldown бар
            this.dashCooldownBar = this.scene.add.rectangle(barX, dashBarY, dashBarWidth, dashBarHeight, 0xf39c12, 1)
                .setOrigin(0, 0.5)
                .setScrollFactor(0)
                .setDepth(201);
            
            // Текст dash
            this.dashText = this.scene.add.text(barX, dashBarY - 25, 'DASH', {
                fontSize: '14px',
                fill: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(202);
            
            // Capture bar
            const captureBarY = dashBarY + 40;
            const captureBarWidth = 300;
            const captureBarHeight = 25;
            
            // Фон capture bar
            this.captureBarBg = this.scene.add.rectangle(barX, captureBarY, captureBarWidth, captureBarHeight, 0x2c3e50, 0.8)
                .setOrigin(0, 0.5)
                .setStrokeStyle(2, 0xffffff, 0.5)
                .setScrollFactor(0)
                .setDepth(200);
            
            // Capture bar
            this.captureBar = this.scene.add.rectangle(barX, captureBarY, captureBarWidth, captureBarHeight, 0xe74c3c, 1)
                .setOrigin(0, 0.5)
                .setScrollFactor(0)
                .setDepth(201);
            
            // Текст capture
            this.captureText = this.scene.add.text(barX + captureBarWidth + 20, captureBarY, 'CAPTURE 0/100', {
                fontSize: '18px',
                fill: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(202);
            
            // Гроші (під capture, точно так само як captureText)
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
            
            // Іконки бонусів (під грошима)
            this.bonusIconsContainer = this.scene.add.container(barX, moneyY + 30)
                .setScrollFactor(0)
                .setDepth(202);
        } catch (error) {
            console.error('❌❌❌ HUD.create() КРИТИЧНА ПОМИЛКА:', error);
            console.error('❌❌❌ HUD.create() Stack:', error.stack);
        }
    }
    
    setCaptureSystem(captureSystem) {
        this.captureSystem = captureSystem;
    }
    
    update() {
        if (!this.player) {
            return;
        }
        
        // Оновлення грошей - ВИКОНУЄТЬСЯ ЗАВЖДИ НА ПОЧАТКУ
        if (this.moneyText) {
            if (!this.scene) {
                console.error('❌ HUD.update() this.scene не існує!');
                return;
            }
            
            const runMoney = typeof this.scene.runMoney === 'number' ? this.scene.runMoney : 0;
            const bankedMoney = typeof this.scene.bankedMoney === 'number' ? this.scene.bankedMoney : 0;
            // runMoney в гривнях, bankedMoney в доларах
            const moneyString = `Зароблено: ${runMoney.toLocaleString()} грн | Банк: $${bankedMoney.toLocaleString()}`;
            
            // Оновлюємо текст завжди
            this.moneyText.setText(moneyString);
        } else {
            if (!this.moneyTextWarningShown) {
                console.warn('⚠️ HUD.update() moneyText не існує!');
                this.moneyTextWarningShown = true;
            }
        }
        
        // Оновлення бару стаміни
        const stamina = this.player.getStamina();
        const staminaMax = this.player.getStaminaMax();
        const staminaPercent = Math.max(0, Math.min(1, stamina / staminaMax));
        
        // Ширина бару
        const barWidth = 300;
        this.staminaBar.width = barWidth * staminaPercent;
        
        // Колір бару залежить від стаміни
        if (staminaPercent > 0.5) {
            this.staminaBar.setFillStyle(0x3498db); // Синій
        } else if (staminaPercent > 0.2) {
            this.staminaBar.setFillStyle(0xf39c12); // Помаранчевий
        } else {
            this.staminaBar.setFillStyle(0xe74c3c); // Червоний
        }
        
        // Текст стаміни
        this.staminaText.setText(`${Math.floor(stamina)}/${staminaMax}`);
        
        // Dash cooldown
        const dashCooldown = this.player.getDashCooldown();
        const dashCooldownMax = this.player.getDashCooldownMax();
        const dashPercent = dashCooldown > 0 ? 1 - (dashCooldown / dashCooldownMax) : 1;
        
        const dashBarWidth = 150;
        this.dashCooldownBar.width = dashBarWidth * dashPercent;
        
        if (dashPercent >= 1) {
            this.dashCooldownBar.setFillStyle(0x2ecc71); // Зелений - готовий
        } else {
            this.dashCooldownBar.setFillStyle(0x95a5a6); // Сірий - на cooldown
        }
        
        // Оновлення capture bar
        if (this.captureSystem) {
            const capture = this.captureSystem.getCapture();
            const captureMax = this.captureSystem.getMaxCapture();
            const capturePercent = this.captureSystem.getCapturePercent();
            
            // Ширина бару
            const captureBarWidth = 300;
            this.captureBar.width = captureBarWidth * capturePercent;
            
            // Колір бару залежить від capture
            if (capturePercent < 0.3) {
                this.captureBar.setFillStyle(0x2ecc71); // Зелений - безпечно
            } else if (capturePercent < 0.6) {
                this.captureBar.setFillStyle(0xf39c12); // Помаранчевий - увага
            } else {
                this.captureBar.setFillStyle(0xe74c3c); // Червоний - небезпечно
            }
            
            // Текст capture
            this.captureText.setText(`CAPTURE ${Math.floor(capture)}/${captureMax}`);
        }
        
        // Оновлення іконок бонусів
        this.updateBonusIcons();
    }
    
    updateBonusIcons() {
        if (!this.player || !this.bonusIconsContainer) return;
        
        // Очищаємо старі іконки
        this.bonusIconsContainer.removeAll(true);
        
        let iconX = 0;
        const iconSize = 20;
        const iconSpacing = 25;
        
        // Іконка Скутера (якщо є активні speedBuffs)
        if (this.player.speedBuffs && Array.isArray(this.player.speedBuffs) && this.player.speedBuffs.length > 0) {
            const icon = this.scene.add.rectangle(iconX, 0, iconSize, iconSize, 0x0000ff, 1) // Синій для скутера
                .setOrigin(0, 0.5);
            this.bonusIconsContainer.add(icon);
            iconX += iconSpacing;
        }
        
        // Іконка імунітету до SoftCrowd
        if (this.player.hasImmunityToSoftCrowd && typeof this.player.hasImmunityToSoftCrowd === 'function' && this.player.hasImmunityToSoftCrowd()) {
            const icon = this.scene.add.rectangle(iconX, 0, iconSize, iconSize, 0x00ff00, 1) // Зелений для імунітету
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
    }
}

export default HUD;