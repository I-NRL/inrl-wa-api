const toBool = (x) => x == 'true'
const { existsSync } = require('fs')
const { Sequelize } = require('sequelize');
if (existsSync('config.env')) require('dotenv').config({ path: './config.env' })
process.env.NODE_OPTIONS = '--max_old_space_size=2560'//2.5
const DB_URL =  process.env.DATABASE_URL || '';

module.exports = {
    SESSION_ID: process.env.SESSION_ID || 'inrl~1bde79396fbc3055d32fb8699a52762006be::10', //your ssid to run bot
    PORT: process.env.PORT || 3000,
    BASE_URL : "https://thoughtful-alvera-igpvdr-2dc99e5b.koyeb.app/",
    PROVIDER_URL: "https://indirect-rosamund-inrl-bot-3c87e07a.koyeb.app",
    AUTH: {
        token: "K2E0s2Actc8oEW9wDaRpEW9yuW8oDc80D18pDM9SKM9wO01eJUy6Q2ylNOQercM2EYD",
    },
    PREFIX: '.',
    SUDO: '',
    DATABASE: DB_URL ? new Sequelize(DB_URL,{dialect:'postgres',ssl:true,protocol: 'postgres', dialectOptions: {native: true,ssl:{require: true,rejectUnauthorized: false}}, logging: false}) : new Sequelize({dialect:'sqlite',storage:'./database.db',logging:false}) 
};
