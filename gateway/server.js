const express = require('express'), path = require('path'), jwt = require('jsonwebtoken');
const app = express(); app.use(express.json({ limit: '6mb' }));
const R = process.env.RESTAURANT_URL || 'http://localhost:3001', A = process.env.ANALYTICS_URL || 'http://localhost:3002', SECRET = process.env.JWT_SECRET || 'dev-secret';
const fwd = base => fn => async (req, res) => {
  try {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const r = await fetch(base + fn(req) + qs, { method: req.method, headers: { 'content-type': 'application/json', authorization: req.headers.authorization || '' },
      body: ['GET', 'DELETE', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {}) });
    res.status(r.status).type('json').send(await r.text());
  } catch (e) { res.status(502).json({ error: 'service_unavailable' }); }
};
const toR = fwd(R), toA = fwd(A);
const auth = (req, res, next) => { try { jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET); next(); } catch { res.status(401).json({ error: 'unauthorized' }); } };

app.get('/health', (q, s) => s.json({ ok: 1 }));
// Admin
app.post('/api/admin/login', toR(() => '/auth/login'));
app.use('/api/admin', auth);
app.all('/api/admin/restaurants', toR(() => '/admin/restaurants'));
app.all('/api/admin/restaurants/:id', toR(q => '/admin/restaurants/' + q.params.id));
app.all('/api/admin/restaurants/:id/:act', toR(q => `/admin/restaurants/${q.params.id}/${q.params.act}`));
app.get('/api/admin/dashboard', toA(() => '/dashboard'));
// Khách
app.get('/api/public/nearby', toR(() => '/public/nearby'));
app.get('/api/public/restaurants/:id', toR(q => '/public/restaurants/' + q.params.id));
app.post('/api/public/session', toA(() => '/session'));
app.post('/api/public/heartbeat', toA(() => '/heartbeat'));
app.post('/api/public/event', toA(() => '/event'));
// Frontend
app.get('/admin', (q, s) => s.sendFile(path.join(__dirname, 'public/admin.html')));
app.use(express.static(path.join(__dirname, 'public')));
app.listen(process.env.PORT || 3000, () => console.log('gateway :3000  ->  http://localhost:3000  |  http://localhost:3000/admin'));
