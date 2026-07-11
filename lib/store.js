/* ============================================================
   Catalogue + orders store.
   - On Vercel with KV enabled  -> Vercel KV (persistent).
   - Locally / no KV            -> JSON files (dev-friendly).
   The same handler code works in both places.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const useKV = Boolean(process.env.KV_REST_API_URL);
let kv;
if (useKV) kv = require('@vercel/kv').kv;

const SEED = path.join(__dirname, '../public/data/products.json');
const LOCAL_ORDERS = path.join(__dirname, '../data/orders.json');

function readSeed() {
  try { return JSON.parse(fs.readFileSync(SEED, 'utf8')); } catch { return []; }
}

async function getProducts() {
  if (useKV) {
    let list = await kv.get('products');
    if (!list) { list = readSeed(); await kv.set('products', list); }   // seed once
    return list;
  }
  return readSeed();
}

async function setProducts(list) {
  if (useKV) return kv.set('products', list);
  fs.writeFileSync(SEED, JSON.stringify(list, null, 2));
}

async function getOrders() {
  if (useKV) return (await kv.get('orders')) || [];
  try { return JSON.parse(fs.readFileSync(LOCAL_ORDERS, 'utf8')); } catch { return []; }
}

async function addOrder(order) {
  const list = await getOrders();
  list.push(order);
  if (useKV) await kv.set('orders', list);
  else {
    fs.mkdirSync(path.dirname(LOCAL_ORDERS), { recursive: true });
    fs.writeFileSync(LOCAL_ORDERS, JSON.stringify(list, null, 2));
  }
  return order;
}

async function setOrders(list) {
  if (useKV) return kv.set('orders', list);
  fs.mkdirSync(path.dirname(LOCAL_ORDERS), { recursive: true });
  fs.writeFileSync(LOCAL_ORDERS, JSON.stringify(list, null, 2));
}

async function updateOrder(id, patch) {
  const list = await getOrders();
  const i = list.findIndex(o => o.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...patch };
  await setOrders(list);
  return list[i];
}

module.exports = { getProducts, setProducts, getOrders, addOrder, setOrders, updateOrder, useKV };
