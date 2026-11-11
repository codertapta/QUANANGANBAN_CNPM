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