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

const LANGS = ["vi", "en", "zh", "ja", "ko"];

// Ghi nhận người dùng bắt đầu truy cập
app.post(
  "/session",
  w(async (q, s) => {
    const { session_id, language, device_lang } = q.body;
    if (!session_id) return s.status(400).end();

    const m = /-([A-Za-z]{2})\b/.exec(device_lang || "");

    await pool.query(
      `INSERT INTO visitor_sessions (id,language,device_lang,country_guess) VALUES (?,?,?,?)
      ON DUPLICATE KEY UPDATE last_seen=NOW(), language=VALUES(language)`,
      [
        String(session_id).slice(0, 64),
        LANGS.includes(language) ? language : null,
        String(device_lang || "").slice(0, 20),
        m ? m[1].toUpperCase() : null,
      ],
    );

    s.json({ ok: true });
  }),
);

// Cập nhật trạng thái hoạt động
app.post(
  "/heartbeat",
  w(async (q, s) => {
    await pool.query("UPDATE visitor_sessions SET last_seen=NOW() WHERE id=?", [
      String(q.body.session_id || ""),
    ]);

    s.json({ ok: true });
  }),
);
