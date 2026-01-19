export function createStyledButton(scene, x, y, width, height, text, color, hoverColor, callback) {
    const shadow = scene.add.rectangle(x + 4, y + 4, width, height, 0x000000, 0.3);
    const button = scene.add.rectangle(x, y, width, height, color)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0xffffff, 0.3);
    const buttonText = scene.add.text(x, y, text, {
        fontSize: `${Math.floor(height * 0.4)}px`,
        fill: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
    }).setOrigin(0.5);
    button.on('pointerover', () => {
        button.setFillStyle(hoverColor);
        button.setScale(1.05);
        shadow.setScale(1.05);
        scene.tweens.add({
            targets: button,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 100,
            ease: 'Power2'
        });
    });
    button.on('pointerout', () => {
        button.setFillStyle(color);
        button.setScale(1);
        shadow.setScale(1);
        scene.tweens.add({
            targets: button,
            scaleX: 1,
            scaleY: 1,
            duration: 100,
            ease: 'Power2'
        });
    });
    button.on('pointerdown', () => {
        button.setScale(0.95);
        scene.tweens.add({
            targets: button,
            scaleX: 0.95,
            scaleY: 0.95,
            duration: 50,
            ease: 'Power2',
            onComplete: () => {
                button.setScale(1);
                if (callback) callback();
            }
        });
    });
    button.shadow = shadow;
    button.text = buttonText;
    return button;
}
export function createTitleText(scene, x, y, text, size = 64) {
    return scene.add.text(x, y, text, {
        fontSize: `${size}px`,
        fill: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: {
            offsetX: 4,
            offsetY: 4,
            color: '#000000',
            blur: 8,
            fill: true
        }
    }).setOrigin(0.5);
}
export function createSubtitleText(scene, x, y, text, size = 28) {
    return scene.add.text(x, y, text, {
        fontSize: `${size}px`,
        fill: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        stroke: '#000000',
        strokeThickness: 2,
        shadow: {
            offsetX: 2,
            offsetY: 2,
            color: '#000000',
            blur: 4,
            fill: true
        }
    }).setOrigin(0.5);
}