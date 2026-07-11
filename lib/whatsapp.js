/* ============================================================
   WhatsApp delivery helper
   Pick ONE provider by filling its keys in .env.
   With no keys set, messages are logged so you can deliver
   manually from your own WhatsApp during the MVP phase.
   ============================================================ */

const axios = require('axios');

const {
  WHATSAPP_PROVIDER,           // 'meta' | 'twilio' | '' (log only)
  // Meta Cloud API
  META_PHONE_ID,
  META_TOKEN,
  // Twilio
  TWILIO_SID,
  TWILIO_AUTH,
  TWILIO_FROM,                 // e.g. whatsapp:+14155238886
} = process.env;

function to254(phone) {
  const d = String(phone).replace(/\D/g, '');
  if (d.startsWith('254')) return d;
  if (d.startsWith('0')) return '254' + d.slice(1);
  return d;
}

async function sendWhatsApp({ phone, message }) {
  const msisdn = to254(phone);

  try {
    if (WHATSAPP_PROVIDER === 'meta' && META_PHONE_ID && META_TOKEN) {
      await axios.post(
        `https://graph.facebook.com/v20.0/${META_PHONE_ID}/messages`,
        { messaging_product: 'whatsapp', to: msisdn, type: 'text', text: { body: message } },
        { headers: { Authorization: `Bearer ${META_TOKEN}` } }
      );
      return { ok: true, provider: 'meta' };
    }

    if (WHATSAPP_PROVIDER === 'twilio' && TWILIO_SID && TWILIO_AUTH) {
      const params = new URLSearchParams({ To: `whatsapp:+${msisdn}`, From: TWILIO_FROM, Body: message });
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
        params,
        { auth: { username: TWILIO_SID, password: TWILIO_AUTH } }
      );
      return { ok: true, provider: 'twilio' };
    }
  } catch (e) {
    console.error('WhatsApp send failed:', e.response?.data || e.message);
  }

  console.log(`\n────── WhatsApp (manual) ──────\nTo: +${msisdn}\n${message}\n───────────────────────────────\n`);
  return { ok: true, provider: 'log' };
}

// Send an actual file (PDF/image/audio/zip) as a WhatsApp DOCUMENT — the parent
// receives a downloadable file attachment, not a link.
async function sendDocument({ phone, fileUrl, filename, caption }) {
  const msisdn = to254(phone);
  try {
    if (WHATSAPP_PROVIDER === 'meta' && META_PHONE_ID && META_TOKEN) {
      await axios.post(
        `https://graph.facebook.com/v20.0/${META_PHONE_ID}/messages`,
        { messaging_product: 'whatsapp', to: msisdn, type: 'document',
          document: { link: fileUrl, filename: filename || 'Angaza.pdf', caption: caption || '' } },
        { headers: { Authorization: `Bearer ${META_TOKEN}` } }
      );
      return { ok: true, provider: 'meta' };
    }
    if (WHATSAPP_PROVIDER === 'twilio' && TWILIO_SID && TWILIO_AUTH) {
      const params = new URLSearchParams({ To: `whatsapp:+${msisdn}`, From: TWILIO_FROM, MediaUrl: fileUrl });
      if (caption) params.append('Body', caption);
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
        params,
        { auth: { username: TWILIO_SID, password: TWILIO_AUTH } }
      );
      return { ok: true, provider: 'twilio' };
    }
  } catch (e) {
    console.error('WhatsApp document send failed:', e.response?.data || e.message);
  }
  console.log(`\n────── WhatsApp FILE (manual) ──────\nTo: +${msisdn}\nFile: ${filename} → ${fileUrl}\n────────────────────────────────────\n`);
  return { ok: true, provider: 'log' };
}

module.exports = { sendWhatsApp, sendDocument, to254 };
