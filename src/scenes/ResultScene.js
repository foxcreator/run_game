// ResultScene - сцена після програшу
class ResultScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ResultScene' });
    }

    init(data) {
        // Дані з GameScene
        this.currentBankedMoney = data.currentBankedMoney || 0;
        this.moneyAddedThisGame = data.moneyAddedThisGame || 0;
        this.timeSurvived = data.timeSurvived || 0;
        
        // Музика Game Over
        this.gameoverMusic = null;
    }

    create() {
        const { width, height } = this.cameras.main;
        
        // Відтворюємо музику Game Over (один раз, не loop)
        if (this.sound.get('gameover')) {
            this.gameoverMusic = this.sound.get('gameover');
        } else {
            this.gameoverMusic = this.sound.add('gameover', { 
                volume: 0.5, 
                loop: false 
            });
        }
        this.gameoverMusic.play();
        
        // Додаємо обробник події shutdown для зупинки музики
        this.events.once('shutdown', this.shutdown, this);

        // Фонове зображення для екрану закінчення гри
        const background = this.add.image(width / 2, height / 2, 'gameover_background');
        const scaleX = width / background.width;
        const scaleY = height / background.height;
        const scale = Math.max(scaleX, scaleY);
        background.setScale(scale);

        // Центральне меню з результатами - сірий прямокутник (нижче, як у MenuScene)
        const menuBoxWidth = 550;
        const menuBoxHeight = 380;
        const menuBoxX = width / 2;
        const menuBoxY = height * 0.65; // 65% від верху (як у MenuScene)
        
        // Тінь меню
        const menuShadow = this.add.rectangle(
            menuBoxX + 4, 
            menuBoxY + 4, 
            menuBoxWidth, 
            menuBoxHeight, 
            0x000000, 
            0.4
        ).setDepth(2);
        
        // Основний блок меню
        const menuBox = this.add.rectangle(
            menuBoxX, 
            menuBoxY, 
            menuBoxWidth, 
            menuBoxHeight, 
            0x808080, // Сірий колір
            0.9
        ).setStrokeStyle(3, 0x606060).setDepth(2); // Темно-сірий контур

        // Результати (всередині меню)
        const resultsY = menuBoxY - 80;
        const lineSpacing = 60;

        // Форматуємо час виживання (X хв Y сек або Y сек)
        let timeFormatted = '';
        const totalSeconds = Math.floor(this.timeSurvived);
        if (totalSeconds >= 60) {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            timeFormatted = `${minutes} хв ${seconds} сек`;
        } else {
            timeFormatted = `${totalSeconds} сек`;
        }

        // Гроші - поточний баланс в банку
        const moneyText = this.add.text(
            menuBoxX, 
            resultsY, 
            `БАНК: $${this.currentBankedMoney.toLocaleString()}`,
            {
                fontSize: '28px',
                fill: '#FFD700', // Жовтий колір для грошей
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(3);

        // Додано в банк за гру
        const moneyAddedText = this.add.text(
            menuBoxX, 
            resultsY + lineSpacing, 
            `+ $${this.moneyAddedThisGame.toLocaleString()}`,
            {
                fontSize: '24px',
                fill: '#90EE90', // Світло-зелений колір для доданих грошей
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(3);

        // Час виживання
        const timeText = this.add.text(
            menuBoxX, 
            resultsY + lineSpacing * 2, 
            `ЧАС ВИЖИВАННЯ: ${timeFormatted}`,
            {
                fontSize: '28px',
                fill: '#FFFFFF',
                fontFamily: 'Arial, sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(3);

        // Кнопки (всередині меню)
        const buttonWidth = 240;
        const buttonHeight = 60;
        const buttonY = menuBoxY + 130;

        // Кнопка "МАГАЗИН"
        const shopButton = this.createMenuButton(
            menuBoxX - 140,
            buttonY,
            buttonWidth,
            buttonHeight,
            'МАГАЗИН',
            () => {
                this.stopGameoverMusic();
                this.scene.start('ShopScene');
            }
        );

        // Кнопка "МЕНЮ"
        const menuButton = this.createMenuButton(
            menuBoxX + 140,
            buttonY,
            buttonWidth,
            buttonHeight,
            'МЕНЮ',
            () => {
                this.stopGameoverMusic();
                this.scene.start('MenuScene');
            }
        );

        // Встановлюємо правильний порядок відображення
        background.setDepth(0);
        menuShadow.setDepth(2);
        menuBox.setDepth(2);
        shopButton.setDepth(3);
        menuButton.setDepth(3);
    }

    createMenuButton(x, y, width, height, text, callback) {
        // Тінь кнопки
        const shadow = this.add.rectangle(x + 2, y + 2, width, height, 0x000000, 0.5).setDepth(3);
        
        // Основний блок кнопки
        const button = this.add.rectangle(x, y, width, height, 0x606060, 0.95)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x404040)
            .setDepth(4);

        // Текст кнопки
        const buttonText = this.add.text(x, y, text, {
            fontSize: '24px',
            fill: '#FFFFFF',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(5);

        // Hover ефект
        button.on('pointerover', () => {
            // Відтворюємо звук наведення
            this.sound.play('menu_hover');
            
            button.setFillStyle(0x707070);
            button.setScale(1.02);
            shadow.setScale(1.02);
            buttonText.setScale(1.02);
            this.tweens.add({
                targets: [button, shadow, buttonText],
                scaleX: 1.02,
                scaleY: 1.02,
                duration: 100,
                ease: 'Power2'
            });
        });

        button.on('pointerout', () => {
            button.setFillStyle(0x606060);
            button.setScale(1);
            shadow.setScale(1);
            buttonText.setScale(1);
            this.tweens.add({
                targets: [button, shadow, buttonText],
                scaleX: 1,
                scaleY: 1,
                duration: 100,
                ease: 'Power2'
            });
        });

        button.on('pointerdown', () => {
            // Відтворюємо звук кліку
            this.sound.play('menu_choise');
            
            button.setScale(0.98);
            shadow.setScale(0.98);
            buttonText.setScale(0.98);
            this.tweens.add({
                targets: [button, shadow, buttonText],
                scaleX: 0.98,
                scaleY: 0.98,
                duration: 50,
                ease: 'Power2',
                onComplete: () => {
                    button.setScale(1);
                    shadow.setScale(1);
                    buttonText.setScale(1);
                    if (callback) callback();
                }
            });
        });

        button.shadow = shadow;
        button.text = buttonText;

        return button;
    }
    
    stopGameoverMusic() {
        if (this.gameoverMusic) {
            this.gameoverMusic.stop();
        }
    }
    
    shutdown() {
        // Зупиняємо музику при виході з сцени
        this.stopGameoverMusic();
    }
}

export default ResultScene;
