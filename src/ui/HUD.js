// HUD - інтерфейс користувача
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
    }
    
    create(player) {
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
            .setScrollFactor(0); // Не слідує за камерою
        
        // Бар стаміни
        this.staminaBar = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x3498db, 1)
            .setOrigin(0, 0.5)
            .setScrollFactor(0);
        
        // Текст стаміни
        this.staminaText = this.scene.add.text(barX + barWidth + 20, barY, '100/100', {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0, 0.5)
        .setScrollFactor(0);
        
        // Dash cooldown бар
        const dashBarY = barY + 40;
        const dashBarWidth = 150;
        const dashBarHeight = 15;
        
        // Фон dash cooldown
        this.dashCooldownBg = this.scene.add.rectangle(barX, dashBarY, dashBarWidth, dashBarHeight, 0x2c3e50, 0.8)
            .setOrigin(0, 0.5)
            .setStrokeStyle(2, 0xffffff, 0.5)
            .setScrollFactor(0);
        
        // Dash cooldown бар
        this.dashCooldownBar = this.scene.add.rectangle(barX, dashBarY, dashBarWidth, dashBarHeight, 0xf39c12, 1)
            .setOrigin(0, 0.5)
            .setScrollFactor(0);
        
        // Текст dash
        this.dashText = this.scene.add.text(barX, dashBarY - 25, 'DASH', {
            fontSize: '14px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(0, 0.5)
        .setScrollFactor(0);
    }
    
    update() {
        if (!this.player) return;
        
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
    }
    
    destroy() {
        if (this.staminaBar) this.staminaBar.destroy();
        if (this.staminaBarBg) this.staminaBarBg.destroy();
        if (this.staminaText) this.staminaText.destroy();
        if (this.dashCooldownBar) this.dashCooldownBar.destroy();
        if (this.dashCooldownBg) this.dashCooldownBg.destroy();
        if (this.dashText) this.dashText.destroy();
    }
}

export default HUD;