# Angaza — *Bright Minds. Brighter Futures.*

Bright, CBC-aligned learning for Kenyan children (PP1–Grade 6): printables, posters,
flashcards, **audio** sing-alongs, and hands-on **DIY kits**. Parents pay with **M-Pesa**
and receive the file on **WhatsApp**. Built to deploy on **Vercel**.

> **Why "Angaza"?** In Swahili, *angaza* means **to illuminate** or **shine light on
> something** — a fitting name for a platform that helps young minds light up with
> learning. The identity pairs a rising sun with an open book.

---

## What's inside

```
angaza/
├── public/                     # the storefront (static, served by Vercel)
│   ├── index.html              # homepage: hero, Popular, Categories, Shop, Free…
│   ├── admin.html              # owner dashboard (add/edit/delete + uploads)
│   ├── css/style.css           # the Angaza design system
│   ├── css/admin.css
│   ├── js/app.js               # cart, categories, featured, search, checkout
│   ├── js/admin.js
│   ├── assets/                 # logo.svg, hero.svg, uploads land here in dev
│   └── data/products.json      # seed catalogue
├── api/index.js                # Vercel serverless entry (runs the Express app)
├── server/
│   ├── app.js                  # all API routes (shared by Vercel + local)
│   └── server.js               # local dev server (node)
├── lib/
│   ├── store.js                # catalogue+orders: Vercel KV (prod) / JSON (dev)
│   ├── blob.js                 # files: Vercel Blob (prod) / local disk (dev)
│   ├── mpesa.js                # M-Pesa Daraja STK push
│   └── whatsapp.js             # WhatsApp delivery (Meta / Twilio / manual)
├── vercel.json
├── package.json
└── .env.example
```

The catalogue supports five formats — **PDF, image, audio, DIY (ZIP), and bundles** —
each with an optional cover image. Covers auto-generate from the category colour when
you don't upload one.

---

## Run locally (no accounts needed)

```bash
npm install
cp .env.example .env        # leave blank for safe dev mode
npm run dev                 # http://localhost:3000  ·  admin at /admin.html
```

In dev mode the catalogue reads/writes `public/data/products.json`, uploads save to
`public/assets/uploads/`, M-Pesa runs in **sandbox-log** (no charges), and WhatsApp
messages print to the console. Everything is testable without a single key.

---

## Deploy to Vercel (the real system) 🚀

**1. Push to GitHub.**
```bash
git init && git add . && git commit -m "Angaza launch" && git branch -M main
git remote add origin https://github.com/<you>/angaza.git && git push -u origin main
```

**2. Import the repo at [vercel.com/new](https://vercel.com/new).** No build settings
needed — the storefront is static and `api/` runs automatically.

**3. Turn on storage (two clicks each, free tier).** In your Vercel project →
**Storage**:
- Create a **Blob** store → this auto-adds `BLOB_READ_WRITE_TOKEN`. *(stores your PDFs,
  images, audio, and DIY kits)*
- Create a **KV** store → this auto-adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
  *(stores your catalogue and orders)*

That's what makes the admin panel persist on Vercel. Without them, Vercel's filesystem
is read-only and uploads/edits wouldn't stick.

**4. Add your other env vars** (Project → Settings → Environment Variables):
```
ADMIN_KEY=<a long random string>
# WhatsApp (start with manual, upgrade later):
WHATSAPP_PROVIDER=            # blank = log; or "meta" / "twilio"
# M-Pesa Daraja (add when you have them):
MPESA_ENV=production
MPESA_CONSUMER_KEY=…  MPESA_CONSUMER_SECRET=…
MPESA_SHORTCODE=…     MPESA_PASSKEY=…
MPESA_CALLBACK_URL=https://<your-vercel-domain>/api/mpesa/callback
```

**5. Redeploy.** Visit `https://<your-domain>/` for the shop and
`https://<your-domain>/admin.html` to load content. Point `angaza.co.ke` at Vercel when ready.

> **Earning on day one, even before Daraja:** leave M-Pesa keys blank and checkout falls
> back to a pre-filled **WhatsApp order** — the parent sends it, pays to your M-Pesa,
> and you reply with the file. Add Daraja later to automate the prompt.

---

## Payments

Open **`public/config.js`** and set your details — this is the only file you edit for payments:

```js
window.ANGAZA_CONFIG = {
  pay: {
    mode: 'manual',                 // start here (personal M-Pesa)
    mpesaName: 'Jane Mwangi',       // shown to parents on the Send Money screen
    mpesaNumber: '0712 345 678',    // your personal M-Pesa number
  },
  whatsapp: '254712345678',         // your WhatsApp (country code, no +)
};
```

**`manual` mode (personal number — your launch setting):** at checkout the parent sees
"Send Money to `0712 345 678` (Jane Mwangi)", pastes their M-Pesa confirmation code, and
taps confirm. That opens WhatsApp to you pre-filled with their order **and the code**, so
you verify the payment and send the file. It's also logged to your orders list. Zero fees,
works the day you deploy.

**`stk` mode (later):** once you register a **Paybill or Till** and get Daraja keys, set
`mode: 'stk'` and add the `MPESA_*` env vars — checkout then sends an automatic M-Pesa
prompt and no code-pasting is needed. *(STK Push is not possible on a personal number,
which is why manual mode is the right start.)*

Optionally set `OWNER_PHONE` in your env so new-order alerts are pushed to your WhatsApp
automatically (needs a WhatsApp provider configured; otherwise the parent's WhatsApp
message is your notification).

---



Open **`/admin.html`**, sign in with your `ADMIN_KEY`. No code, no JSON:
- live counts (activities, paid, free, orders);
- **add** an activity — title, description, level, **category**, price, optional "was"
  price, a **Featured** toggle (shows in *Popular right now*), and **upload the file**
  (PDF / image / audio / ZIP) plus an optional cover image;
- **edit** (replace the file or keep it) and **delete**;
- search your catalogue.

The key lives only in your browser session; the page is `noindex`. Set a long random
`ADMIN_KEY` and keep the site on HTTPS (Vercel does this automatically).

---

## Previews & watermarks

Every product takes your own **cover image** (uploaded in the admin panel), and for
image/poster/flashcard items the artwork becomes the card. Parents tap a cover to open a
**preview lightbox** with an automatic diagonal **"Angaza · Sample"** watermark — you upload
clean art, the shop protects it at view time, and the clean file is only ever sent after
payment. Add a small "angaza.co.ke" to the corner of your art so shared printouts advertise
you too.

---

## Categories

Workbooks · Worksheets · Colouring · Stories · Flashcards · Posters · **Audio lessons**
· **DIY kits**. They appear as a *Shop by category* grid on the homepage and as filters
in the shop. Add a new category by editing the `TYPES` list in `public/js/app.js` and
`public/js/admin.js`.

---

## A realistic 3-day launch plan

**Day 1 — content.** Make 12–20 activities in Canva; export PDFs (and a couple of audio
tracks / a DIY kit). Deploy the repo to Vercel, enable Blob + KV, set `ADMIN_KEY`.

**Day 2 — load & price.** Use `/admin.html` to upload everything, set prices, mark 4–6
as Featured, and publish 3 free samples. Apply for M-Pesa Daraja (Paybill/Till) — it
can take a couple of days, so start now; run WhatsApp checkout meanwhile.

**Day 3 — soft launch.** Share the link with 20–30 parents on WhatsApp, gather feedback,
fix copy, and go public. Add Daraja keys the moment they arrive to automate payments.

Angaza — Bright Minds. Brighter Futures.

---

## Order fulfilment & delivery

Parents receive the **actual file** — not a link:
- **Automated (WhatsApp Business API):** on a confirmed payment, the server sends each
  purchased item as a WhatsApp **document attachment** (`lib/whatsapp.js → sendDocument`),
  so the parent gets a real PDF/image/audio/ZIP file to open and keep.
- **Manual (personal M-Pesa, your launch mode):** open **Admin → Orders**, tap **Get files**
  to download the actual file(s) for that order, confirm the M-Pesa code, forward the file
  on WhatsApp (there's a one-tap WhatsApp button), then **Mark delivered**.

The admin dashboard also shows **revenue, orders, to-fulfil count, and best sellers**.

---

## Where this can grow (honest roadmap)

This build is a lean, production-ready **store** that earns today on Vercel. The larger
"Angaza SaaS" vision (Supabase accounts, Postgres schema, analytics suite, school
subscriptions, an AI tutor) is a sensible **phase 2** — but it's a different, much larger
project, and rebuilding now would delay revenue with no near-term payoff. Recommended order:

1. **Launch & earn** with this store (manual M-Pesa + WhatsApp).
2. **Automate payments** — Daraja STK Push (flip `config.js` to `stk`) once you have a Till/Paybill.
3. **Customer accounts & order history** — add Supabase Auth + Postgres, migrating the
   current KV catalogue/orders into tables (`products`, `orders`, `order_items`, `customers`).
4. **Analytics & marketing** — dashboards, coupons, email receipts.
5. **Schools & subscriptions**, then an **AI assistant** — only once the catalogue and
   customer base justify the platform investment.

Keeping this store live as the storefront while phase-2 is built means you never stop selling.

---

*Developed by SA Technologies — building intelligent digital platforms.*
