/* ============================================================
   M-Pesa Daraja (STK Push) helper
   Docs: https://developer.safaricom.co.ke
   Fill the values in .env to go live. Without them, the server
   runs in "sandbox log" mode so you can build and test the UI.
   ============================================================ */

const axios = require('axios');

const {
  MPESA_ENV = 'sandbox',              // 'sandbox' | 'production'
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_SHORTCODE,                    // Paybill / Till number
  MPESA_PASSKEY,
  MPESA_CALLBACK_URL,                 // public https URL, e.g. https://yourdomain/api/mpesa/callback
} = process.env;

const BASE = MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

const isConfigured = () =>
  Boolean(MPESA_CONSUMER_KEY && MPESA_CONSUMER_SECRET && MPESA_SHORTCODE && MPESA_PASSKEY);

// 2547XXXXXXXX format
function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return '254' + digits.slice(1);
  if (digits.startsWith('7') || digits.startsWith('1')) return '254' + digits;
  return digits;
}

async function getToken() {
  const auth = Buffer
    .from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`)
    .toString('base64');
  const { data } = await axios.get(
    `${BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return data.access_token;
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * Trigger an STK push. Returns { ok, mode, checkoutRequestId?, message }.
 */
async function stkPush({ phone, amount, reference = 'ANGAZA', description = 'Angaza learning activity' }) {
  const msisdn = normalizePhone(phone);

  if (!isConfigured()) {
    // Dev mode: no credentials yet — log and pretend success so the flow is testable.
    console.log(`\n[M-Pesa · sandbox-log] Would push KES ${amount} to ${msisdn} (ref ${reference})\n`);
    return { ok: true, mode: 'sandbox-log', message: 'STK push simulated (no Daraja credentials set).' };
  }

  const token = await getToken();
  const ts = timestamp();
  const password = Buffer
    .from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${ts}`)
    .toString('base64');

  const { data } = await axios.post(
    `${BASE}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: ts,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: msisdn,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: msisdn,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: reference.slice(0, 12),
      TransactionDesc: description.slice(0, 60),
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return {
    ok: data.ResponseCode === '0',
    mode: 'live',
    checkoutRequestId: data.CheckoutRequestID,
    message: data.ResponseDescription || data.CustomerMessage,
  };
}

module.exports = { stkPush, normalizePhone, isConfigured };
