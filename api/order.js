const { put } = require('@vercel/blob');
const crypto = require('crypto');

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'الطريقة غير مسموحة' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};
  // honeypot: bots fill hidden field; pretend success
  if (body.website) return res.status(200).json({ ok: true });

  const name = clean(body.name, 100);
  const phone = clean(body.phone, 30);
  const description = clean(body.description, 1000);

  if (!name) return res.status(400).json({ error: 'الرجاء إدخال الاسم.' });
  if (!/^[+\d][\d\s\-()]{5,28}$/.test(phone)) return res.status(400).json({ error: 'الرجاء إدخال رقم هاتف صحيح.' });

  const createdAt = new Date().toISOString();
  const id = crypto.randomUUID();
  const order = { id, name, phone, description, createdAt, status: 'new' };
  // reverse-timestamp prefix so newest sorts first when listed alphabetically
  const key = `orders/${String(9999999999999 - Date.now()).padStart(13, '0')}-${id}.json`;

  try {
    await put(key, JSON.stringify(order), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('order save failed', e);
    return res.status(500).json({ error: 'تعذّر حفظ الطلب، حاول مرة أخرى.' });
  }
};

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
