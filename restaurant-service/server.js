const express = require('express'), mysql = require('mysql2/promise'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const app = express(); app.use(express.json({ limit: '6mb' }));
const SECRET = process.env.JWT_SECRET || 'dev-secret';
const MM = { en: 'en', zh: 'zh-CN', ja: 'ja', ko: 'ko' }; // MyMemory language codes (nguồn: tiếng Việt)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'foodguide', charset: 'utf8mb4', connectionLimit: 10, timezone: '+07:00',
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : undefined
});