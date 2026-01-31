export const config = {
    port: process.env.PORT || 3000,
    databaseUrl: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/game',
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    nodeEnv: process.env.NODE_ENV || 'development'
};
