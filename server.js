// server.js – سرور مرکزی تریلینگ + پنل مدیریت

const express = require('express');
const path = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// اگر روی Render باشی، خودش این ENV رو ست می‌کنه
const PUBLIC_BASE =
  process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

// برای JSON در POST
app.use(express.json());

// CORS فقط برای farazgold (پنل خودش same-origin است و CORS نمی‌خواهد)
const allowedOrigins = [
  'https://farazgold.com',
  'https://demo.farazgold.com'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Vary', 'Origin');
  next();
});

// ---------- وضعیت در حافظه (در Render با ری‌استارت صفر می‌شود) ----------
const state = {
  globalEnabled: true,   // روشن/خاموش بودن کل سیستم
  defaultAllowed: true,  // کلاینت جدید خودکار مجاز؟ یا pending؟
  clients: {
    // clientId: {
    //   status: 'allowed' | 'blocked' | 'pending',
    //   allowed: true/false,
    //   note: '...',
    //   lastSeen: ISO,
    //   userAgent: '...'
    // }
  },
  activity: [
    // { time, type, clientId, note, detail, status }
  ]
};

function pushActivity(ev) {
  const entry = {
    time: new Date().toISOString(),
    ...ev
  };
  state.activity.push(entry);
  // فقط ۵۰۰ رویداد آخر
  if (state.activity.length > 500) {
    state.activity.shift();
  }
}

// ثبت/آپدیت یک کلاینت و برگرداندن آبجکتش
function touchClient(clientId, userAgent) {
  const nowIso = new Date().toISOString();
  if (!clientId) return null;

  let c = state.clients[clientId];

  if (!c) {
    const status = state.defaultAllowed ? 'allowed' : 'pending';
    c = {
      status,
      allowed: status === 'allowed',
      note: '',
      lastSeen: nowIso,
      userAgent: userAgent || ''
    };
    state.clients[clientId] = c;

    pushActivity({
      type: 'connected',
      clientId,
      note: c.note,
      detail: 'کلاینت جدید متصل شد',
      status: c.status
    });
  } else {
    c.lastSeen = nowIso;
    if (userAgent) c.userAgent = userAgent;
  }

  return c;
}

// ---------- API برای لودر کلاینت‌ها ----------

// بوت‌استرپ؛ Tampermonkey اولین بار این را صدا می‌زند
app.get('/api/trailing/bootstrap', (req, res) => {
  let clientId = req.query.clientId;
  const ua     = req.query.ua || '';

  if (!clientId) {
    clientId = 'anon-' + Math.random().toString(36).slice(2);
  }

  const client = touchClient(clientId, ua);

  const allowed =
    state.globalEnabled &&
    client &&
    client.status === 'allowed';

  if (!allowed) {
    // لودر با دیدن allowed:false دیگر اسکریپت را لود نمی‌کند
    return res.json({ allowed: false });
  }

  return res.json({
    allowed: true,
    scriptUrl: `${PUBLIC_BASE}/js/trailing-core-v3.js`
  });
});

// پینگ دوره‌ای برای بروزرسانی lastSeen و آنلاین بودن
app.post('/api/trailing/ping', (req, res) => {
  const { clientId, ua } = req.body || {};
  if (!clientId) {
    return res.status(400).json({ ok: false, error: 'no clientId' });
  }
  const client = touchClient(clientId, ua || '');
  if (!client) {
    return res.status(404).json({ ok: false, error: 'not found' });
  }
  return res.json({ ok: true });
});

// ---------- API برای پنل مدیریت ----------

// گرفتن کل وضعیت برای admin.html
app.get('/api/admin/clients', (req, res) => {
  res.json({
    globalEnabled: state.globalEnabled,
    defaultAllowed: state.defaultAllowed,
    clients: state.clients,
    activity: state.activity
  });
});

// تنظیم globalEnabled و defaultAllowed
app.post('/api/admin/global', (req, res) => {
  const { globalEnabled, defaultAllowed } = req.body || {};

  if (typeof globalEnabled === 'boolean') {
    state.globalEnabled = globalEnabled;
  }
  if (typeof defaultAllowed === 'boolean') {
    state.defaultAllowed = defaultAllowed;
  }

  pushActivity({
    type: 'status-change',
    clientId: null,
    detail: 'تنظیمات کلی سیستم تغییر کرد',
    status: `globalEnabled=${state.globalEnabled}, defaultAllowed=${state.defaultAllowed}`
  });

  res.json({ ok: true });
});

// تنظیم وضعیت یک کلاینت (مجاز/مسدود/درانتظار + note)
app.post('/api/admin/set-client', (req, res) => {
  const { clientId, status, allowed, note } = req.body || {};
  if (!clientId) {
    return res.status(400).json({ ok: false, error: 'no clientId' });
  }

  // اگر کلاینت تا حالا ثبت نشده، با touchClient بسازیم
  const client = touchClient(clientId, null);
  if (!client) {
    return res.status(404).json({ ok: false, error: 'client not found' });
  }

  if (status) {
    client.status = status;
  }
  if (typeof allowed === 'boolean') {
    client.allowed = allowed;
  }
  if (typeof note === 'string') {
    client.note = note;
  }

  pushActivity({
    type: 'status-change',
    clientId,
    note: client.note,
    detail: 'وضعیت کلاینت ویرایش شد',
    status: client.status
  });

  res.json({ ok: true });
});

// ---------- سرو کردن فایل‌ها ----------

// هسته تریلینگ
app.use('/js', express.static(path.join(__dirname, 'js')));

// پنل مدیریت (همین admin/index.html)
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ---------- استارت ----------
app.listen(PORT, () => {
  console.log(`Trailing server listening on port ${PORT}`);
  console.log(`PUBLIC_BASE = ${PUBLIC_BASE}`);
});
