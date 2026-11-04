const express = require("express"),
  mysql = require("mysql2/promise");
const app = express();
app.use(express.json());
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "foodguide",
  charset: "utf8mb4",
  connectionLimit: 10,
  timezone: "+07:00",
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : undefined,
});
const RURL = process.env.RESTAURANT_URL || "http://localhost:3001";
const w = (f) => (q, s) =>
  f(q, s).catch((e) => {
    console.error(e);
    s.status(500).json({ error: "server_error" });
  });
