// Конфігурація гри
export const GAME_CONFIG = {
    // Кіоски
    KIOSKS: {
        COUNT: 5,                    // Кількість кіосків на карті
        FREEZE_DURATION: 2000,       // Тривалість заморозки при зіткненні (мс)
        RESPAWN_DELAY: 20000,        // Затримка перед респавном (мс)
        DISAPPEAR_BEFORE_FREEZE_END: 100, // На скільки раніше зникає кіоск (мс)
        COOLDOWN: 3000               // Затримка перед повторною заморозкою (мс)
    },
    
    // Гравець
    PLAYER: {
        BASE_SPEED: 220,
        STAMINA_MAX: 100,
        STAMINA_DRAIN_PER_SEC: 6,
        STAMINA_REGEN_PER_SEC: 4,
        STAMINA_REGEN_MULTIPLIER: 1.2,
        EXHAUSTED_SLOW_DURATION: 2000,
        EXHAUSTED_SPEED_MULTIPLIER: 0.75,
        DASH_DURATION: 350,
        DASH_SPEED_MULTIPLIER: 1.7,
        DASH_COOLDOWN: 4000,
        DASH_STAMINA_COST: 20
    },
    
    // Світ
    WORLD: {
        WIDTH: 4000,
        HEIGHT: 4000,
        TILE_SIZE: 32
    }
};
