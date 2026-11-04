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

const TYPES = [
  "detect",
  "start",
  "complete",
  "dismiss",
  "pause",
  "detail",
  "visit_estimated",
  "listen_time",
];

app.post(
  "/event",
  w(async (q, s) => {
    const b = q.body;

    if (!b.session_id || !TYPES.includes(b.type))
      return s.status(400).json({ error: "bad_event" });

    await pool.query(
      "INSERT INTO visit_events (session_id,restaurant_id,event_type,lang,value) VALUES (?,?,?,?,?)",
      [
        String(b.session_id).slice(0, 64),
        b.restaurant_id || null,
        b.type,
        LANGS.includes(b.lang) ? b.lang : null,
        b.value == null ? null : +b.value,
      ],
    );

    await pool.query("UPDATE visitor_sessions SET last_seen=NOW() WHERE id=?", [
      String(b.session_id),
    ]);

    s.json({ ok: true });
  }),
);

app.get(
  "/dashboard",
  w(async (q, s) => {
    const [[ses]] = await pool.query(
      "SELECT COUNT(*) total, COALESCE(SUM(last_seen>=NOW()-INTERVAL 45 SECOND),0) active FROM visitor_sessions",
    );

    const [ev] = await pool.query(
      "SELECT event_type t, COUNT(*) c, COALESCE(SUM(value),0) v FROM visit_events GROUP BY event_type",
    );

    const [byR] = await pool.query(`
      SELECT restaurant_id id,
      SUM(event_type='detect') detect,
      SUM(event_type='start') start,
      SUM(event_type='complete') complete,
      SUM(event_type='dismiss') dismiss,
      SUM(event_type='detail') detail,
      SUM(event_type='visit_estimated') visit,
      COALESCE(SUM(CASE WHEN event_type='listen_time' THEN value END),0) listen
      FROM visit_events
      WHERE restaurant_id IS NOT NULL
      GROUP BY restaurant_id
    `);

    const [byH] = await pool.query(`
      SELECT HOUR(created_at) h,
      COUNT(DISTINCT session_id) sessions,
      SUM(event_type='detect') detect,
      SUM(event_type='start') start
      FROM visit_events
      GROUP BY h
      ORDER BY h
    `);

    const [byL] = await pool.query(`
      SELECT lang,
      COUNT(DISTINCT session_id) sessions,
      SUM(event_type='start') start,
      SUM(event_type='complete') complete
      FROM visit_events
      WHERE lang IS NOT NULL
      GROUP BY lang
    `);

    const [byC] = await pool.query(
      'SELECT COALESCE(country_guess,"?") country, COUNT(*) sessions FROM visitor_sessions GROUP BY country ORDER BY sessions DESC LIMIT 10',
    );

    let names = {};

    try {
      (await (await fetch(RURL + "/internal/names")).json()).forEach(
        (r) => (names[r.id] = r.name),
      );
    } catch {}

    const E = {};

    ev.forEach((e) => (E[e.t] = { count: +e.c, value: +e.v }));

    s.json({
      sessions: { total: +ses.total, active: +ses.active },
      events: E,

      by_restaurant: byR.map((r) => ({
        id: r.id,
        name: names[r.id] || "(đã xóa) #" + r.id,
        ...Object.fromEntries(
          Object.entries(r)
            .filter(([k]) => k !== "id")
            .map(([k, v]) => [k, +v]),
        ),
      })),

      by_hour: byH.map((r) => ({
        h: r.h,
        sessions: +r.sessions,
        detect: +r.detect,
        start: +r.start,
      })),

      by_lang: byL.map((r) => ({
        lang: r.lang,
        sessions: +r.sessions,
        start: +r.start,
        complete: +r.complete,
      })),

      by_country: byC.map((r) => ({
        country: r.country,
        sessions: +r.sessions,
      })),
    });
  }),
);

app.get("/health", (q, s) => s.json({ ok: 1 }));

(async () => {
  for (let i = 0; i < 30; i++) {
    try {
      await pool.query("SELECT 1");
      break;
    } catch {
      console.log("Đợi MySQL...");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  app.listen(process.env.PORT || 3002, () =>
    console.log("analytics-service :3002"),
  );
})();
