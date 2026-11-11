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
const w = f => (q, s) => f(q, s).catch(e => { console.error(e); s.status(500).json({ error: 'server_error' }); });

// ---------- Dịch (MyMemory) ----------
function chunk(t) {
  const out = []; let cur = '';
  for (const s of t.split(/(?<=[.!?。\n])\s*/)) { if ((cur + s).length > 420) { if (cur) out.push(cur); cur = s; } else cur += (cur ? ' ' : '') + s; }
  if (cur) out.push(cur); return out;
}
async function mymemory(text, lang) {
  let res = '';
  for (const c of chunk(text)) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(c)}&langpair=vi|${MM[lang]}` + (process.env.MYMEMORY_EMAIL ? `&de=${process.env.MYMEMORY_EMAIL}` : '');
    const j = await (await fetch(url)).json();
    const t = j && j.responseData && j.responseData.translatedText;
    if (!t || +j.responseStatus !== 200 || /MYMEMORY WARNING|INVALID/i.test(t)) throw new Error('mymemory_failed');
    res += (res ? ' ' : '') + t;
  }
  return res;
}
const upsertTr = (id, lang, d, st) => pool.query(
  'INSERT INTO restaurant_translations (restaurant_id,lang,description,status) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE description=VALUES(description), status=VALUES(status)', [id, lang, d, st]);
// Dịch 1 lần khi Admin lưu; lỗi/hết hạn mức -> lưu bản tiếng Việt với status 'fallback' (dịch lại sau)
async function translateAll(id, desc) {
  await upsertTr(id, 'vi', desc || '', 'ok');
  const result = { vi: 'ok' };
  for (const l of Object.keys(MM)) {
    try { await upsertTr(id, l, desc ? await mymemory(desc, l) : '', 'ok'); result[l] = 'ok'; }
    catch (e) { await upsertTr(id, l, desc || '', 'fallback'); result[l] = 'fallback'; }
  }
  return result;
}

// ---------- Auth ----------
const adminOnly = (q, s, n) => { try { jwt.verify((q.headers.authorization || '').replace('Bearer ', ''), SECRET); n(); } catch { s.status(401).json({ error: 'unauthorized' }); } };
app.post('/auth/login', w(async (q, s) => {
  const [[u]] = await pool.query('SELECT * FROM admin_users WHERE username=?', [q.body.username || '']);
  if (!u || !(await bcrypt.compare(q.body.password || '', u.password_hash))) return s.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
  s.json({ token: jwt.sign({ uid: u.id, role: 'admin' }, SECRET, { expiresIn: '8h' }) });
}));

// ---------- Public ----------
const DIST = '(6371000*acos(LEAST(1,cos(radians(?))*cos(radians(r.lat))*cos(radians(r.lng)-radians(?))+sin(radians(?))*sin(radians(r.lat)))))';
app.get('/public/nearby', w(async (q, s) => {
  const lat = +q.query.lat, lng = +q.query.lng, radius = Math.min(Math.max(+q.query.radius || 1000, 50), 20000);
  const lang = ['vi', 'en', 'zh', 'ja', 'ko'].includes(q.query.lang) ? q.query.lang : 'vi';
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return s.status(400).json({ error: 'bad_coords' });
  const [rows] = await pool.query(
    `SELECT r.id,r.name,r.address,IF(r.image_url LIKE 'data:%',NULL,r.image_url) image_url,r.lat,r.lng,
       COALESCE(t.description,r.description) description, (t.status='ok' OR ?='vi') lang_ok, ${DIST} AS distance
     FROM restaurants r LEFT JOIN restaurant_translations t ON t.restaurant_id=r.id AND t.lang=?
     WHERE r.status='active' AND r.lat BETWEEN ? AND ? AND r.lng BETWEEN ? AND ?
     HAVING distance<=? ORDER BY distance`,
    [lang, lat, lng, lat, lang, lat - radius / 111000, lat + radius / 111000, lng - radius / (111000 * Math.max(0.01, Math.cos(lat * Math.PI / 180))), lng + radius / (111000 * Math.max(0.01, Math.cos(lat * Math.PI / 180))), radius]);
  s.json({ items: rows.map(r => ({ ...r, distance: Math.round(r.distance), lang_ok: !!r.lang_ok })) });
}));
app.get('/public/restaurants/:id', w(async (q, s) => {
  const lang = ['vi', 'en', 'zh', 'ja', 'ko'].includes(q.query.lang) ? q.query.lang : 'vi';
  const [[r]] = await pool.query(
    `SELECT r.id,r.name,r.address,r.image_url,COALESCE(t.description,r.description) description FROM restaurants r
     LEFT JOIN restaurant_translations t ON t.restaurant_id=r.id AND t.lang=? WHERE r.id=? AND r.status='active'`, [lang, q.params.id]);
  r ? s.json(r) : s.status(404).json({ error: 'not_found' });
}));

// ---------- Admin ----------
app.use('/admin', adminOnly);
const valid = b => b.name && isFinite(+b.lat) && isFinite(+b.lng) && Math.abs(+b.lat) <= 90 && Math.abs(+b.lng) <= 180;
app.get('/admin/restaurants', w(async (q, s) => {
  const [rows] = await pool.query(`SELECT r.id,r.name,r.address,r.image_url,r.description,r.lat,r.lng,r.status,
    (SELECT GROUP_CONCAT(lang,':',status) FROM restaurant_translations t WHERE t.restaurant_id=r.id) tr FROM restaurants r ORDER BY r.id DESC`);
  s.json(rows);
}));
app.post('/admin/restaurants', w(async (q, s) => {
  const b = q.body; if (!valid(b)) return s.status(400).json({ error: 'Thiếu tên hoặc tọa độ không hợp lệ' });
  const [r] = await pool.query('INSERT INTO restaurants (name,address,image_url,description,lat,lng,status) VALUES (?,?,?,?,?,?,?)',
    [b.name, b.address || '', b.image_url || null, b.description || '', +b.lat, +b.lng, b.status === 'hidden' ? 'hidden' : 'active']);
  s.json({ id: r.insertId, translations: await translateAll(r.insertId, b.description) });
}));
app.put('/admin/restaurants/:id', w(async (q, s) => {
  const b = q.body; if (!valid(b)) return s.status(400).json({ error: 'Thiếu tên hoặc tọa độ không hợp lệ' });
  const [[old]] = await pool.query('SELECT description FROM restaurants WHERE id=?', [q.params.id]);
  if (!old) return s.status(404).json({ error: 'not_found' });
  await pool.query('UPDATE restaurants SET name=?,address=?,image_url=COALESCE(?,image_url),description=?,lat=?,lng=?,status=? WHERE id=?',
    [b.name, b.address || '', b.image_url || null, b.description || '', +b.lat, +b.lng, b.status === 'hidden' ? 'hidden' : 'active', q.params.id]);
  // chỉ dịch lại khi mô tả thay đổi
  s.json({ ok: true, translations: old.description !== (b.description || '') ? await translateAll(+q.params.id, b.description) : null });
}));
app.patch('/admin/restaurants/:id/status', w(async (q, s) => {
  await pool.query('UPDATE restaurants SET status=? WHERE id=?', [q.body.status === 'hidden' ? 'hidden' : 'active', q.params.id]); s.json({ ok: true });
}));
app.post('/admin/restaurants/:id/retranslate', w(async (q, s) => {
  const [[r]] = await pool.query('SELECT description FROM restaurants WHERE id=?', [q.params.id]);
  r ? s.json({ translations: await translateAll(+q.params.id, r.description) }) : s.status(404).json({ error: 'not_found' });
}));
app.delete('/admin/restaurants/:id', w(async (q, s) => { await pool.query('DELETE FROM restaurants WHERE id=?', [q.params.id]); s.json({ ok: true }); }));