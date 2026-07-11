/* ============================================================
   ANGAZA — edit these, then redeploy. This is the only file you
   normally need to touch to change payment details.
   ============================================================ */
window.ANGAZA_CONFIG = {
  pay: {
    // 'manual' = personal M-Pesa (Send Money + you confirm on WhatsApp).
    // 'stk'    = automated STK push (needs a registered Paybill/Till + Daraja keys).
    mode: 'manual',

    // Shown to parents on the "Send Money" screen (used in 'manual' mode):
    mpesaName: 'Angazakids',       // the name that appears when they Send Money
    mpesaNumber: '0748 519 923',   // your personal M-Pesa number
  },

  // Your WhatsApp number, with country code, no "+" (e.g. 254712345678):
  whatsapp: '254748519923',

  currency: 'KES',
};
