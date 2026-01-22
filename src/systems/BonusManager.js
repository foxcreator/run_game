import { GAME_CONFIG } from '../config/gameConfig.js';

class BonusManager {
    constructor(scene, player, saveSystem) {
        this.scene = scene;
        this.player = player;
        this.saveSystem = saveSystem;

        this.activeBonuses = {
            MAGNET: { active: false, timer: 0, object: null },
            GAS: { active: false, timer: 0, clouds: [] },
            DEPUTY: { active: false, timer: 0 }, // Immunity
            COFFEE: { active: false, timer: 0 },
            SALO: { active: false, timer: 0, lures: [] },
            ARMOR: { active: false, hitsLeft: 0, object: null },
            MAGNATE: { active: false, timer: 0 },
            SPINNER: { cooldown: 0 } // Just cooldown tracking mostly, instant effect
        };

        this.bonusKeys = {};
        this.setupInput();
    }

    setupInput() {
        const bonusConfig = GAME_CONFIG.BONUSES;

        // Map keys
        this.scene.input.keyboard.on('keydown-ONE', () => this.activateBonus('SPINNER'));
        this.scene.input.keyboard.on('keydown-TWO', () => this.activateBonus('MAGNET'));
        this.scene.input.keyboard.on('keydown-THREE', () => this.activateBonus('GAS'));
        this.scene.input.keyboard.on('keydown-FOUR', () => this.activateBonus('DEPUTY'));
        this.scene.input.keyboard.on('keydown-FIVE', () => this.activateBonus('COFFEE'));
        this.scene.input.keyboard.on('keydown-SIX', () => this.activateBonus('SALO'));
        this.scene.input.keyboard.on('keydown-SEVEN', () => this.activateBonus('ARMOR'));
        this.scene.input.keyboard.on('keydown-EIGHT', () => this.activateBonus('MAGNATE'));
    }

    getBonusCount(type) {
        // We will implement this in SaveSystem, for now assuming method exists
        return this.saveSystem.getBonusCount(type);
    }

    setBonusCount(type, count) {
        this.saveSystem.setBonusCount(type, count);
    }

    purchaseBonus(type) {
        const config = GAME_CONFIG.BONUSES[type];
        if (!config) return false;

        const price = config.PRICE;
        const currentMoney = this.saveSystem.getBankedMoney();

        if (currentMoney >= price) {
            this.saveSystem.setBankedMoney(currentMoney - price);
            const currentCount = this.getBonusCount(type);
            this.setBonusCount(type, currentCount + 1);
            return true;
        }
        return false;
    }

    activateBonus(type) {
        // Check if paused
        if (this.scene.isPaused) return;

        const config = GAME_CONFIG.BONUSES[type];
        const count = this.getBonusCount(type);

        if (count <= 0) {
            this.scene.notificationManager.show(`Немає заряду "${config.NAME}"!`, 1);
            return;
        }

        // Check Cooldown (Local or Global logic? Assuming Global cooldown per bonus type isnt implemented in SaveSystem yet, so local tracking)
        // If we want cooldowns to persist, we'd need to save 'lastUsedTime'. For now, let's use runtime cooldown.
        // But wait, user might spam keys.
        // Let's implement cooldown check.
        // NOTE: For MVP, maybe cooldowns are just runtime.

        // Decrement count
        // Special handling: Armor might check if already active?
        if (type === 'ARMOR' && this.activeBonuses.ARMOR.active) {
            this.scene.notificationManager.show(`Броня ще активна!`, 1);
            return;
        }

        this.setBonusCount(type, count - 1);

        // Trigger Effect
        switch (type) {
            case 'SPINNER': this.activateSpinner(config); break;
            case 'MAGNET': this.activateMagnet(config); break;
            case 'GAS': this.activateGas(config); break;
            case 'DEPUTY': this.activateDeputy(config); break;
            case 'COFFEE': this.activateCoffee(config); break;
            case 'SALO': this.activateSalo(config); break;
            case 'ARMOR': this.activateArmor(config); break;
            case 'MAGNATE': this.activateMagnate(config); break;
        }

        // Notifications
        this.scene.notificationManager.show(`${config.NAME} активовано!`, 2);

        // Update HUD (emit event or direct call)
        if (this.scene.hud) {
            // HUD update logic will be handled in update() or event
        }
    }

    // --- Specific Activations ---

    activateSpinner(config) {
        // Push enemies and freeze
        const radius = config.RADIUS;
        const force = config.PUSH_FORCE;
        const duration = config.DURATION;

        const enemies = this.scene.chasers;
        let hitCount = 0;

        enemies.forEach(enemy => {
            if (!enemy.active) return;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
            if (dist <= radius) {
                // Determine push angle
                const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
                const velX = Math.cos(angle) * force;
                const velY = Math.sin(angle) * force;

                // Apply velocity manually or via body
                if (enemy.body) {
                    enemy.body.setVelocity(velX, velY);
                }

                // Freeze
                if (enemy.setFrozen) {
                    enemy.setFrozen(duration);
                }

                // Trigger fall animation
                if (enemy.playFallAnimation) { // Need to implement this in Chaser
                    enemy.playFallAnimation();
                } else {
                    // Fallback if method not exists yet
                    // Just spin or something?
                    enemy.setTint(0x0000ff);
                }

                hitCount++;
            }
        });

        // Visual Effect?
        // Maybe a spinner sprite spinning around player for a second
        const spinnerSprite = this.scene.add.sprite(this.player.x, this.player.y, 'bonus_spinner');
        spinnerSprite.setDepth(100);
        this.scene.tweens.add({
            targets: spinnerSprite,
            angle: 360 * 3,
            scale: { from: 0.5, to: 2 },
            alpha: { from: 1, to: 0 },
            duration: 500,
            onComplete: () => spinnerSprite.destroy()
        });
    }

    activateMagnet(config) {
        this.activeBonuses.MAGNET.active = true;
        this.activeBonuses.MAGNET.timer = config.DURATION;
        // Maybe add visual effect to player
    }

    activateGas(config) {
        // Create cloud behind player
        const cloud = this.scene.add.sprite(this.player.x, this.player.y, 'effect_gas_cloud');
        this.scene.physics.add.existing(cloud);
        cloud.setDepth(5);

        this.activeBonuses.GAS.clouds.push({
            sprite: cloud,
            timer: config.CLOUD_DURATION
        });

        // Gas Logic is handled in update loop (collision check)
    }

    activateDeputy(config) {
        this.activeBonuses.DEPUTY.active = true;
        this.activeBonuses.DEPUTY.timer = config.DURATION;
        this.player.setAlpha(0.5); // Ghostly
        // Logic in Chaser to ignore player
    }

    activateCoffee(config) {
        this.activeBonuses.COFFEE.active = true;
        this.activeBonuses.COFFEE.timer = config.DURATION;

        // Instant Refill
        if (this.player.stamina !== undefined) {
            this.player.stamina = GAME_CONFIG.PLAYER.STAMINA_MAX;
        }
        // Speed boost? Or just infinite stamina?
        // Infinite stamina handles itself if we preventing drain in player.
    }

    activateSalo(config) {
        // Throw salo
        const lure = this.scene.add.sprite(this.player.x, this.player.y, 'bonus_salo');
        this.scene.physics.add.existing(lure);
        lure.setDepth(5);

        this.activeBonuses.SALO.lures.push({
            sprite: lure,
            timer: config.LURE_DURATION
        });

        // Alert enemies to go to this position
        // Logic in Chaser
    }

    activateArmor(config) {
        this.activeBonuses.ARMOR.active = true;
        this.activeBonuses.ARMOR.timer = config.DURATION;
        this.activeBonuses.ARMOR.hitsLeft = config.HITS;

        // Visual
        const shield = this.scene.add.sprite(this.player.x, this.player.y, 'effect_shield');
        shield.setDepth(this.player.depth + 1);
        shield.setAlpha(0.6);
        this.activeBonuses.ARMOR.object = shield;
    }

    activateMagnate(config) {
        this.activeBonuses.MAGNATE.active = true;
        this.activeBonuses.MAGNATE.timer = config.DURATION;

        // Apply multiplier if not already higher
        if (this.scene.moneyMultiplier < config.MULTIPLIER) {
            this.scene.moneyMultiplier = config.MULTIPLIER;
        }

        // Visual?
        this.scene.notificationManager.show('💸 БІЗНЕС ЧАС! x2 БАБЛО!', 3);
        if (this.scene.sound) this.scene.sound.play('bonus_powerup');
    }

    // --- Update Loop ---

    update(delta, time) {
        // Magnet
        if (this.activeBonuses.MAGNET.active) {
            this.activeBonuses.MAGNET.timer -= delta;
            if (this.activeBonuses.MAGNET.timer <= 0) {
                this.activeBonuses.MAGNET.active = false;
            } else {
                // Pull coins
                const radius = GAME_CONFIG.BONUSES.MAGNET.RADIUS;
                const speed = GAME_CONFIG.BONUSES.MAGNET.SPEED;

                // We need access to coins. Assuming GameScene has 'pickups' or 'coins' group/array
                // Checking this.scene.pickups
                if (this.scene.pickups) {
                    this.scene.pickups.forEach(pickup => {
                        if (pickup.active && (pickup.texture.key.includes('coin'))) { // Heuristic check
                            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, pickup.x, pickup.y);
                            if (dist <= radius) {
                                this.scene.physics.moveToObject(pickup, this.player, speed);
                            }
                        }
                    });
                }
            }
        }

        // Gas Clouds
        if (this.activeBonuses.GAS.clouds.length > 0) {
            for (let i = this.activeBonuses.GAS.clouds.length - 1; i >= 0; i--) {
                const cloudData = this.activeBonuses.GAS.clouds[i];
                cloudData.timer -= delta;

                // Collision check logic
                const radius = GAME_CONFIG.BONUSES.GAS.RADIUS;
                this.scene.chasers.forEach(enemy => {
                    if (enemy.active && !enemy.isFrozen) {
                        const dist = Phaser.Math.Distance.Between(cloudData.sprite.x, cloudData.sprite.y, enemy.x, enemy.y);
                        if (dist <= radius) {
                            if (enemy.applySlowdown) {
                                enemy.applySlowdown(GAME_CONFIG.BONUSES.GAS.SLOWDOWN_FACTOR, 1000); // Apply for 1 sec constantly refreshing
                            }
                            if (enemy.playCoughAnimation && !enemy.anims.isPlaying) {
                                enemy.playCoughAnimation();
                            }
                        }
                    }
                });

                if (cloudData.timer <= 0) {
                    cloudData.sprite.destroy();
                    this.activeBonuses.GAS.clouds.splice(i, 1);
                }
            }
        }

        // Deputy (Immunity)
        if (this.activeBonuses.DEPUTY.active) {
            this.activeBonuses.DEPUTY.timer -= delta;
            if (this.activeBonuses.DEPUTY.timer <= 0) {
                this.activeBonuses.DEPUTY.active = false;
                this.player.setAlpha(1);
            }
        }

        // Coffee
        if (this.activeBonuses.COFFEE.active) {
            this.activeBonuses.COFFEE.timer -= delta;
            if (this.activeBonuses.COFFEE.timer > 0) {
                this.player.stamina = GAME_CONFIG.PLAYER.STAMINA_MAX;
            } else {
                this.activeBonuses.COFFEE.active = false;
            }
        }

        // Salo Lures
        if (this.activeBonuses.SALO.lures.length > 0) {
            for (let i = this.activeBonuses.SALO.lures.length - 1; i >= 0; i--) {
                const lureData = this.activeBonuses.SALO.lures[i];
                lureData.timer -= delta;

                // Distance check for enemies to lure them
                const radius = GAME_CONFIG.BONUSES.SALO.RADIUS;
                this.scene.chasers.forEach(enemy => {
                    if (enemy.active && !enemy.isFrozen) {
                        const dist = Phaser.Math.Distance.Between(lureData.sprite.x, lureData.sprite.y, enemy.x, enemy.y);
                        if (dist <= radius) {
                            if (enemy.setLureTarget) {
                                enemy.setLureTarget(lureData.sprite.x, lureData.sprite.y, 1000);
                            }
                        }
                    }
                });

                if (lureData.timer <= 0) {
                    lureData.sprite.destroy();
                    this.activeBonuses.SALO.lures.splice(i, 1);
                }
            }
        }

        if (this.activeBonuses.ARMOR.timer <= 0) {
            this.deactivateArmor();
        }

        // Magnate
        if (this.activeBonuses.MAGNATE.active) {
            this.activeBonuses.MAGNATE.timer -= delta;

            // Ensure multiplier stays at least 2 if not overridden by higher (x5)
            // Assuming x5 controller might overwrite it, or we overwrite it.
            // Safe logic: maximize
            if (this.scene.moneyMultiplier < 2) {
                this.scene.moneyMultiplier = 2;
            }

            if (this.activeBonuses.MAGNATE.timer <= 0) {
                this.activeBonuses.MAGNATE.active = false;
                // Reset to 1 ONLY if we are the ones keeping it at 2
                // If it's > 2, leave it (x5 pickup). 
                // If it's 2, reset to 1.
                if (this.scene.moneyMultiplier === 2) {
                    this.scene.moneyMultiplier = 1;
                }
                this.scene.notificationManager.show('📉 Бізнес час закінчився...', 2);
            }
        }
    }

    deactivateArmor() {
        this.activeBonuses.ARMOR.active = false;
        if (this.activeBonuses.ARMOR.object) {
            this.activeBonuses.ARMOR.object.destroy();
            this.activeBonuses.ARMOR.object = null;
        }
    }

    // API for collisions
    checkArmorHit() {
        // Returns true if armor absorbed the hit
        if (this.activeBonuses.ARMOR.active && this.activeBonuses.ARMOR.hitsLeft > 0) {
            this.activeBonuses.ARMOR.hitsLeft--;
            this.scene.sound.play('bonus_shield_activate'); // Clang sound maybe
            if (this.activeBonuses.ARMOR.hitsLeft <= 0) {
                this.deactivateArmor();
            }
            return true;
        }
        return false;
    }

    isImmune() {
        return this.activeBonuses.DEPUTY.active;
    }

    isInfiniteStamina() {
        return this.activeBonuses.COFFEE.active;
    }
}

export default BonusManager;
