/**
 * Simple JSON file store for products & orders
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = __dirname;
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: 'Urban Runner',
    category: 'sneakers',
    price: 45000,
    oldPrice: 52000,
    image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&h=500&fit=crop',
    badge: 'sale',
    sizes: [40, 41, 42, 43, 44],
    stock: 25,
    description: 'Lightweight performance sneakers with premium materials.'
  },
  {
    id: 2,
    name: 'Classic Oxford',
    category: 'formal',
    price: 68000,
    oldPrice: null,
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=500&fit=crop',
    badge: 'new',
    sizes: [39, 40, 41, 42, 43],
    stock: 18,
    description: 'Hand-finished leather oxfords for formal occasions.'
  },
  {
    id: 3,
    name: 'Heritage Boot',
    category: 'boots',
    price: 85000,
    oldPrice: null,
    image: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=500&h=500&fit=crop',
    badge: null,
    sizes: [40, 41, 42, 43, 44, 45],
    stock: 12,
    description: 'Durable, weather-ready boots inspired by classic workwear.'
  },
  {
    id: 4,
    name: 'City Sneaker',
    category: 'sneakers',
    price: 38000,
    oldPrice: null,
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&h=500&fit=crop',
    badge: 'new',
    sizes: [39, 40, 41, 42, 43, 44],
    stock: 30,
    description: 'Everyday urban sneakers with cushioned sole.'
  },
  {
    id: 5,
    name: 'Leather Loafer',
    category: 'formal',
    price: 55000,
    oldPrice: 62000,
    image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=500&h=500&fit=crop',
    badge: 'sale',
    sizes: [40, 41, 42, 43],
    stock: 15,
    description: 'Slip-on leather loafers for smart-casual looks.'
  },
  {
    id: 6,
    name: 'Trail Boot',
    category: 'boots',
    price: 72000,
    oldPrice: null,
    image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=500&h=500&fit=crop',
    badge: null,
    sizes: [41, 42, 43, 44, 45],
    stock: 10,
    description: 'Rugged trail boots built for comfort and grip.'
  },
  {
    id: 7,
    name: 'Summer Sandal',
    category: 'sandals',
    price: 28000,
    oldPrice: null,
    image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500&h=500&fit=crop',
    badge: 'new',
    sizes: [38, 39, 40, 41, 42, 43],
    stock: 40,
    description: 'Breathable summer sandals with soft straps.'
  },
  {
    id: 8,
    name: 'Minimal Slip-On',
    category: 'sneakers',
    price: 42000,
    oldPrice: null,
    image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&h=500&fit=crop',
    badge: null,
    sizes: [40, 41, 42, 43, 44],
    stock: 22,
    description: 'Clean minimal slip-ons for effortless style.'
  }
];

function ensureFile(file, defaultData) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultData, null, 2), 'utf8');
  }
}

function readJSON(file, fallback) {
  try {
    ensureFile(file, fallback);
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return Array.isArray(fallback) ? [...fallback] : { ...fallback };
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// Products
function getProducts() {
  return readJSON(PRODUCTS_FILE, DEFAULT_PRODUCTS);
}

function saveProducts(list) {
  writeJSON(PRODUCTS_FILE, list);
}

function getProductById(id) {
  return getProducts().find((p) => p.id === Number(id));
}

function nextProductId() {
  const list = getProducts();
  if (!list.length) return 1;
  return Math.max(...list.map((p) => p.id || 0)) + 1;
}

function createProduct(data) {
  const list = getProducts();
  const product = {
    id: nextProductId(),
    name: data.name,
    category: data.category,
    price: Number(data.price),
    oldPrice: data.oldPrice != null && data.oldPrice !== '' ? Number(data.oldPrice) : null,
    image: data.image,
    badge: data.badge || null,
    sizes: Array.isArray(data.sizes) ? data.sizes : [],
    stock: data.stock != null ? Number(data.stock) : 0,
    description: data.description || ''
  };
  list.push(product);
  saveProducts(list);
  return product;
}

function updateProduct(id, data) {
  const list = getProducts();
  const idx = list.findIndex((p) => p.id === Number(id));
  if (idx === -1) return null;
  list[idx] = {
    ...list[idx],
    name: data.name ?? list[idx].name,
    category: data.category ?? list[idx].category,
    price: data.price != null ? Number(data.price) : list[idx].price,
    oldPrice:
      data.oldPrice !== undefined
        ? data.oldPrice != null && data.oldPrice !== ''
          ? Number(data.oldPrice)
          : null
        : list[idx].oldPrice,
    image: data.image ?? list[idx].image,
    badge: data.badge !== undefined ? data.badge || null : list[idx].badge,
    sizes: data.sizes !== undefined ? data.sizes : list[idx].sizes,
    stock: data.stock != null ? Number(data.stock) : list[idx].stock,
    description: data.description !== undefined ? data.description : list[idx].description
  };
  saveProducts(list);
  return list[idx];
}

function deleteProduct(id) {
  const list = getProducts();
  const next = list.filter((p) => p.id !== Number(id));
  if (next.length === list.length) return false;
  saveProducts(next);
  return true;
}

function resetProducts() {
  saveProducts(JSON.parse(JSON.stringify(DEFAULT_PRODUCTS)));
  return getProducts();
}

// Orders
function getOrders() {
  return readJSON(ORDERS_FILE, []);
}

function saveOrders(list) {
  writeJSON(ORDERS_FILE, list);
}

function getOrderById(id) {
  return getOrders().find((o) => o.id === id);
}

function createOrder(orderData) {
  const orders = getOrders();
  const order = {
    id: orderData.id || 'AFFW-' + Date.now().toString().slice(-6),
    date: orderData.date || new Date().toISOString(),
    customer: orderData.customer,
    items: orderData.items,
    total: Number(orderData.total),
    status: orderData.status || 'pending'
  };
  orders.unshift(order);
  saveOrders(orders);

  // Reduce stock
  const products = getProducts();
  order.items.forEach((item) => {
    const p = products.find((x) => x.id === item.id);
    if (p && p.stock != null) {
      p.stock = Math.max(0, p.stock - (item.qty || 1));
    }
  });
  saveProducts(products);

  return order;
}

function updateOrderStatus(id, status) {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  orders[idx].status = status;
  saveOrders(orders);
  return orders[idx];
}

function clearOrders() {
  saveOrders([]);
}

// Ensure seed on load
ensureFile(PRODUCTS_FILE, DEFAULT_PRODUCTS);
ensureFile(ORDERS_FILE, []);

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  resetProducts,
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  clearOrders
};
