const { list, get } = require('@vercel/blob');
const crypto = require('crypto');

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function sha(s) {
  return crypto.createHash('sha256').update(String(s)).digest();
}

function authorized(req) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return false;
  const h = req.headers.authorization || '';
  if (!h.startsWith('Basic ')) return false;
  const decoded = Buffer.from(h.slice(6), 'base64').toString('utf8');
  const i = decoded.indexOf(':');
  if (i < 0) return false;
  const u = decoded.slice(0, i);
  const p = decoded.slice(i + 1);
  // compare hashes so lengths are equal and timing doesn't leak
  const okU = crypto.timingSafeEqual(sha(u), sha(user));
  const okP = crypto.timingSafeEqual(sha(p), sha(pass));
  return okU && okP;
}

async function readOrders() {
  const orders = [];
  let cursor;
  do {
    const page = await list({ prefix: 'orders/', limit: 1000, cursor });
    const items = await Promise.all(
      page.blobs.map(async (b) => {
        try {
          const r = await get(b.pathname, { access: 'private', useCache: false });
          if (!r) return null;
          const text = await new Response(r.stream).text();
          return JSON.parse(text);
        } catch (e) {
          console.error('read failed', b.pathname, e);
          return null;
        }
      })
    );
    orders.push(...items.filter(Boolean));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return orders;
}

function fmt(iso) {
  try {
    return new Date(iso).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jerusalem' });
  } catch {
    return iso;
  }
}

function page(orders, error) {
  const rows = orders
    .map(
      (o, i) => `<tr>
<td>${orders.length - i}</td>
<td><b>${esc(o.name)}</b></td>
<td dir="ltr" style="text-align:right"><a href="tel:${esc(o.phone)}">${esc(o.phone)}</a> · <a href="https://wa.me/${esc(String(o.phone).replace(/\D/g, ''))}" target="_blank" rel="noopener noreferrer">واتساب</a></td>
<td class="d">${o.description ? esc(o.description) : '<span class="m">—</span>'}</td>
<td>${esc(fmt(o.createdAt))}</td>
</tr>`
    )
    .join('');
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>الطلبات - لوحة وكيلك</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;font-family:'Tajawal',sans-serif;background:#F7F8F4;color:#121A2E}
header{background:#121A2E;color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
header b{font-size:22px}main{max-width:1100px;margin:28px auto;padding:0 16px}
h1{font-size:28px;margin:0 0 6px}.sub{color:#4A5468;margin:0 0 20px}
.box{background:#fff;border:1px solid #E6E9F0;border-radius:18px;overflow-x:auto}
table{width:100%;border-collapse:collapse;min-width:720px}th,td{padding:14px 16px;text-align:right;border-bottom:1px solid #F0F2F6;vertical-align:top}
th{background:#F3F5F9;font-size:14px;color:#4A5468}tr:last-child td{border-bottom:0}
.d{white-space:pre-wrap;max-width:360px;line-height:1.7}.m{color:#9AA3B5}
a{color:#0B6E4B;font-weight:700}.empty{padding:48px;text-align:center;color:#4A5468}.err{background:#FDECEA;color:#B42318;padding:14px 18px;border-radius:12px;margin-bottom:16px}
</style></head><body>
<header><b>وكيلك — لوحة الإدارة</b><span>الطلبات</span></header>
<main><h1>الطلبات</h1><p class="sub">إجمالي الطلبات: ${orders.length}</p>
${error ? `<div class="err">${esc(error)}</div>` : ''}
<div class="box">${
    orders.length
      ? `<table><thead><tr><th>#</th><th>الاسم</th><th>الهاتف</th><th>الوصف</th><th>التاريخ</th></tr></thead><tbody>${rows}</tbody></table>`
      : '<div class="empty">لا توجد طلبات بعد.</div>'
  }</div></main></body></html>`;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!authorized(req)) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Wakeel Admin", charset="UTF-8"');
    return res.status(401).send('يلزم تسجيل الدخول');
  }
  let orders = [];
  let error;
  try {
    orders = await readOrders();
  } catch (e) {
    console.error(e);
    error = 'تعذّر تحميل الطلبات.';
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(page(orders, error));
};
