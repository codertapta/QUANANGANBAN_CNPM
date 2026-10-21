const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
app.use(express.json({ limit: '8mb' }));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'foodguide',
  waitForConnections: true, connectionLimit: 15, charset: 'utf8mb4'
});

async function init() {
  // Render services start independently; allow MySQL extra time on its first boot.
  for (let i = 0; i < 120; i++) {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS restaurants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        desc_lang VARCHAR(5) NOT NULL DEFAULT 'vi',
        lat DOUBLE NOT NULL, lng DOUBLE NOT NULL,
        image MEDIUMTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_geo (lat, lng)
      ) CHARACTER SET utf8mb4`);
      console.log('DB ready'); return;
    } catch (e) { console.log('Waiting for DB...', e.code); await new Promise(r => setTimeout(r, 3000)); }
  }
  process.exit(1);
}

const LANGS = ['vi', 'en', 'zh', 'ja', 'ko'];
function validate(b) {
  const lat = Number(b.lat), lng = Number(b.lng);
  if (!b.name?.trim() || !b.address?.trim() || !b.description?.trim()) return 'Thiếu tên, địa chỉ hoặc mô tả';
  if (!b.image) return 'Thiếu ảnh quán';
  if (!LANGS.includes(b.desc_lang)) return 'Ngôn ngữ mô tả không hợp lệ';
  if (!(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180) || b.lat === '' || b.lng === '') return 'Tọa độ không hợp lệ';
  return null;
}
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'Lỗi máy chủ' }); });

// Lọc theo khoảng cách (mét) ngay tại backend (công thức Haversine trong SQL)
app.get('/restaurants/nearby', wrap(async (req, res) => {
  const lat = Number(req.query.lat), lng = Number(req.query.lng), radius = Number(req.query.radius);
  if (![lat, lng, radius].every(Number.isFinite) || radius <= 0) return res.status(400).json({ error: 'lat, lng, radius (mét) không hợp lệ' });
  const [rows] = await pool.query(
    `SELECT id,name,address,description,desc_lang,lat,lng,image,
      (6371000*ACOS(LEAST(1,COS(RADIANS(?))*COS(RADIANS(lat))*COS(RADIANS(lng)-RADIANS(?))+SIN(RADIANS(?))*SIN(RADIANS(lat))))) AS distance
     FROM restaurants HAVING distance <= ? ORDER BY distance`, [lat, lng, lat, radius]);
  res.json(rows.map(r => ({ ...r, distance: Math.round(r.distance) })));
}));

app.get('/restaurants', wrap(async (_q, res) => {
  const [rows] = await pool.query('SELECT * FROM restaurants ORDER BY id DESC');
  res.json(rows);
}));
app.get('/restaurants/:id', wrap(async (req, res) => {
  const [[r]] = await pool.query('SELECT * FROM restaurants WHERE id=?', [req.params.id]);
  r ? res.json(r) : res.status(404).json({ error: 'Không tìm thấy quán' });
}));
app.post('/restaurants', wrap(async (req, res) => {
  const err = validate(req.body); if (err) return res.status(400).json({ error: err });
  const b = req.body;
  const [r] = await pool.query('INSERT INTO restaurants (name,address,description,desc_lang,lat,lng,image) VALUES (?,?,?,?,?,?,?)',
    [b.name.trim(), b.address.trim(), b.description.trim(), b.desc_lang, b.lat, b.lng, b.image]);
  res.status(201).json({ id: r.insertId });
}));
app.put('/restaurants/:id', wrap(async (req, res) => {
  const err = validate(req.body); if (err) return res.status(400).json({ error: err });
  const b = req.body;
  const [r] = await pool.query('UPDATE restaurants SET name=?,address=?,description=?,desc_lang=?,lat=?,lng=?,image=? WHERE id=?',
    [b.name.trim(), b.address.trim(), b.description.trim(), b.desc_lang, b.lat, b.lng, b.image, req.params.id]);
  r.affectedRows ? res.json({ ok: true }) : res.status(404).json({ error: 'Không tìm thấy quán' });
}));
app.delete('/restaurants/:id', wrap(async (req, res) => {
  const [r] = await pool.query('DELETE FROM restaurants WHERE id=?', [req.params.id]);
  r.affectedRows ? res.json({ ok: true }) : res.status(404).json({ error: 'Không tìm thấy quán' });
}));

init().then(() => app.listen(3001, () => console.log('restaurant-service :3001')));
