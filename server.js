/**
 * AFFW — Austine Fashion Footwears
 * Zero-dependency Node.js HTTP server (API + static)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const store = require('./data/store');
const { issueToken, revokeToken, tokens } = require('./middleware/auth');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function send(res, status, body, headers) {
  headers = headers || {};
  const isObj = typeof body === 'object' && body !== null && !Buffer.isBuffer(body);
  const payload = isObj ? JSON.stringify(body) : (body || '');
  res.writeHead(status, Object.assign({
    'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  }, headers));
  res.end(payload);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, function (err, data) {
    if (err) return send(res, 404, { error: 'Not found' });
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function getToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function requireAuth(req, res) {
  const token = getToken(req);
  if (!token || !tokens.has(token)) {
    send(res, 401, { error: 'Unauthorized. Please log in.' });
    return false;
  }
  return true;
}

async function handleApi(req, res, pathname, query) {
  const method = req.method;
  if (method === 'OPTIONS') return send(res, 204, '');

  try {
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await readBody(req);
      const token = issueToken(body.username, body.password);
      if (!token) return send(res, 401, { error: 'Invalid username or password' });
      return send(res, 200, { token: token, user: body.username });
    }
    if (pathname === '/api/auth/logout' && method === 'POST') {
      if (!requireAuth(req, res)) return;
      revokeToken(getToken(req));
      return send(res, 200, { ok: true });
    }
    if (pathname === '/api/auth/me' && method === 'GET') {
      if (!requireAuth(req, res)) return;
      return send(res, 200, { ok: true, user: 'admin' });
    }

    if (pathname === '/api/products' && method === 'GET') {
      let products = store.getProducts();
      if (query.category && query.category !== 'all') {
        products = products.filter(function (p) { return p.category === query.category; });
      }
      return send(res, 200, products);
    }
    if (pathname === '/api/products/reset' && method === 'POST') {
      if (!requireAuth(req, res)) return;
      return send(res, 200, store.resetProducts());
    }
    if (pathname.indexOf('/api/products/') === 0 && method === 'GET') {
      const id = pathname.split('/').pop();
      const product = store.getProductById(id);
      if (!product) return send(res, 404, { error: 'Product not found' });
      return send(res, 200, product);
    }
    if (pathname === '/api/products' && method === 'POST') {
      if (!requireAuth(req, res)) return;
      const body = await readBody(req);
      if (!body.name || !body.category || body.price == null || !body.image) {
        return send(res, 400, { error: 'name, category, price, and image are required' });
      }
      return send(res, 201, store.createProduct(body));
    }
    if (pathname.indexOf('/api/products/') === 0 && method === 'PUT') {
      if (!requireAuth(req, res)) return;
      const id = pathname.split('/').pop();
      const body = await readBody(req);
      const product = store.updateProduct(id, body);
      if (!product) return send(res, 404, { error: 'Product not found' });
      return send(res, 200, product);
    }
    if (pathname.indexOf('/api/products/') === 0 && method === 'DELETE') {
      if (!requireAuth(req, res)) return;
      const id = pathname.split('/').pop();
      if (!store.deleteProduct(id)) return send(res, 404, { error: 'Product not found' });
      return send(res, 200, { ok: true });
    }

    if (pathname === '/api/orders' && method === 'GET') {
      if (!requireAuth(req, res)) return;
      let orders = store.getOrders();
      if (query.status && query.status !== 'all') {
        orders = orders.filter(function (o) { return o.status === query.status; });
      }
      return send(res, 200, orders);
    }
    if (pathname === '/api/orders' && method === 'POST') {
      const body = await readBody(req);
      const customer = body.customer, items = body.items, total = body.total;
      if (!customer || !customer.name || !customer.email || !items || !items.length) {
        return send(res, 400, { error: 'customer and items are required' });
      }
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const p = store.getProductById(item.id);
        if (!p) return send(res, 400, { error: 'Product ' + item.id + ' not found' });
        if (p.stock != null && p.stock < (item.qty || 1)) {
          return send(res, 400, { error: 'Insufficient stock for ' + p.name });
        }
      }
      const order = store.createOrder({
        customer: customer,
        items: items,
        total: total != null ? total : items.reduce(function (s, it) { return s + it.price * it.qty; }, 0),
        status: 'pending'
      });
      return send(res, 201, order);
    }
    if (pathname === '/api/orders' && method === 'DELETE') {
      if (!requireAuth(req, res)) return;
      store.clearOrders();
      return send(res, 200, { ok: true });
    }
    if (/^\/api\/orders\/[^/]+\/status$/.test(pathname) && method === 'PATCH') {
      if (!requireAuth(req, res)) return;
      const id = pathname.split('/')[3];
      const body = await readBody(req);
      const allowed = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (allowed.indexOf(body.status) === -1) return send(res, 400, { error: 'Invalid status' });
      const order = store.updateOrderStatus(id, body.status);
      if (!order) return send(res, 404, { error: 'Order not found' });
      return send(res, 200, order);
    }
    if (pathname.indexOf('/api/orders/') === 0 && method === 'GET') {
      if (!requireAuth(req, res)) return;
      const id = pathname.split('/').pop();
      const order = store.getOrderById(id);
      if (!order) return send(res, 404, { error: 'Order not found' });
      return send(res, 200, order);
    }

    if (pathname === '/api/stats' && method === 'GET') {
      if (!requireAuth(req, res)) return;
      const products = store.getProducts();
      const orders = store.getOrders();
      const pending = orders.filter(function (o) { return o.status === 'pending'; }).length;
      const revenue = orders.filter(function (o) { return o.status !== 'cancelled'; })
        .reduce(function (s, o) { return s + (o.total || 0); }, 0);
      return send(res, 200, { products: products.length, orders: orders.length, pending: pending, revenue: revenue });
    }

    send(res, 404, { error: 'API route not found' });
  } catch (err) {
    console.error(err);
    send(res, 500, { error: err.message || 'Internal server error' });
  }
}

const server = http.createServer(function (req, res) {
  const base = 'http://' + (req.headers.host || 'localhost');
  const u = new URL(req.url, base);
  let pathname = decodeURIComponent(u.pathname);
  const query = Object.fromEntries(u.searchParams);

  if (pathname.indexOf('/api') === 0) {
    return handleApi(req, res, pathname, query);
  }

  if (pathname === '/' || pathname === '') pathname = '/index.html';
  if (pathname === '/admin') pathname = '/admin.html';

  const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC, safe);

  if (filePath.indexOf(PUBLIC) !== 0) return send(res, 403, { error: 'Forbidden' });

  fs.stat(filePath, function (err, st) {
    if (!err && st.isFile()) return sendFile(res, filePath);
    sendFile(res, path.join(PUBLIC, 'index.html'));
  });
});

server.listen(PORT, function () {
  console.log('');
  console.log('  AFFW — Austine Fashion Footwears (Node.js)');
  console.log('  ------------------------------------------');
  console.log('  Store:  http://localhost:' + PORT);
  console.log('  Admin:  http://localhost:' + PORT + '/admin.html');
  console.log('  API:    http://localhost:' + PORT + '/api');
  console.log('  Login:  admin / affw2026');
  console.log('');
});
