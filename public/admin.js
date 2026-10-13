/* ============================================
   AFFW Admin CMS — uses /api + Bearer token
   ============================================ */

(function () {
  'use strict';

  const API = '/api';
  const TOKEN_KEY = 'affw_admin_token';

  const loginScreen = document.getElementById('loginScreen');
  const adminApp = document.getElementById('adminApp');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const adminSidebar = document.getElementById('adminSidebar');
  const sectionTitle = document.getElementById('sectionTitle');
  const navLinks = document.querySelectorAll('.admin-nav');

  let currentOrderId = null;
  let productModal, orderModal, adminToast;

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  function setToken(t) {
    sessionStorage.setItem(TOKEN_KEY, t);
  }

  function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
  }

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + getToken()
    };
  }

  async function api(path, options) {
    options = options || {};
    const headers = options.auth
      ? authHeaders()
      : { 'Content-Type': 'application/json' };
    const res = await fetch(API + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await res.json().catch(function () { return {}; });
    if (res.status === 401) {
      clearToken();
      showLogin();
      throw new Error(data.error || 'Unauthorized');
    }
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function formatPrice(naira) {
    return '₦' + Number(naira).toLocaleString('en-NG');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return (
        d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ' ' +
        d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return iso;
    }
  }

  function statusBadge(status) {
    const map = {
      pending: 'warning',
      processing: 'info',
      shipped: 'primary',
      delivered: 'success',
      cancelled: 'secondary'
    };
    return '<span class="badge bg-' + (map[status] || 'secondary') + '">' + status + '</span>';
  }

  function toast(title, msg) {
    document.getElementById('adminToastTitle').textContent = title;
    document.getElementById('adminToastBody').textContent = msg;
    adminToast.show();
  }

  function showLogin() {
    loginScreen.classList.remove('d-none');
    adminApp.classList.add('d-none');
  }

  function showApp() {
    loginScreen.classList.add('d-none');
    adminApp.classList.remove('d-none');
    showSection('dashboard');
  }

  function showSection(name) {
    document.querySelectorAll('.admin-section').forEach(function (s) {
      s.classList.add('d-none');
    });
    const el = document.getElementById('sec-' + name);
    if (el) el.classList.remove('d-none');
    navLinks.forEach(function (a) {
      a.classList.toggle('active', a.dataset.section === name);
    });
    const titles = {
      dashboard: 'Dashboard',
      products: 'Products',
      orders: 'Orders',
      settings: 'Settings'
    };
    sectionTitle.textContent = titles[name] || name;
    if (name === 'dashboard') renderDashboard();
    if (name === 'products') renderProductsTable();
    if (name === 'orders') renderOrdersTable();
  }

  async function renderDashboard() {
    try {
      const stats = await api('/stats', { auth: true });
      document.getElementById('statProducts').textContent = stats.products;
      document.getElementById('statOrders').textContent = stats.orders;
      document.getElementById('statPending').textContent = stats.pending;
      document.getElementById('statRevenue').textContent = formatPrice(stats.revenue);

      const orders = await api('/orders', { auth: true });
      const recent = orders.slice(0, 5);
      const tbody = document.getElementById('dashOrdersBody');
      if (!recent.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No orders yet</td></tr>';
        return;
      }
      tbody.innerHTML = recent.map(function (o) {
        return (
          '<tr>' +
          '<td><code>' + o.id + '</code></td>' +
          '<td>' + (o.customer && o.customer.name ? o.customer.name : '—') + '</td>' +
          '<td>' + formatPrice(o.total) + '</td>' +
          '<td>' + statusBadge(o.status) + '</td>' +
          '<td class="small text-muted">' + formatDate(o.date) + '</td>' +
          '</tr>'
        );
      }).join('');
    } catch (e) {
      toast('Error', e.message);
    }
  }

  async function renderProductsTable() {
    try {
      const products = await api('/products');
      const tbody = document.getElementById('productsTableBody');
      if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No products. Add one.</td></tr>';
        return;
      }
      tbody.innerHTML = products.map(function (p) {
        return (
          '<tr>' +
          '<td><img src="' + p.image + '" class="admin-thumb" alt="" onerror="this.src=\'https://via.placeholder.com/48\'"></td>' +
          '<td><strong>' + p.name + '</strong></td>' +
          '<td><span class="text-capitalize">' + p.category + '</span></td>' +
          '<td>' + formatPrice(p.price) + '</td>' +
          '<td>' + (p.stock != null ? p.stock : '—') + '</td>' +
          '<td>' + (p.badge ? '<span class="badge bg-dark">' + p.badge + '</span>' : '—') + '</td>' +
          '<td>' +
          '<button class="btn btn-sm btn-outline-primary me-1 btn-edit-product" data-id="' + p.id + '"><i class="bi bi-pencil"></i></button>' +
          '<button class="btn btn-sm btn-outline-danger btn-del-product" data-id="' + p.id + '"><i class="bi bi-trash"></i></button>' +
          '</td>' +
          '</tr>'
        );
      }).join('');

      tbody.querySelectorAll('.btn-edit-product').forEach(function (btn) {
        btn.addEventListener('click', function () { openProductModal(+btn.dataset.id, products); });
      });
      tbody.querySelectorAll('.btn-del-product').forEach(function (btn) {
        btn.addEventListener('click', function () { deleteProduct(+btn.dataset.id); });
      });
    } catch (e) {
      toast('Error', e.message);
    }
  }

  function openProductModal(id, productsList) {
    const form = document.getElementById('productForm');
    form.classList.remove('was-validated');
    document.getElementById('productId').value = '';
    document.getElementById('productModalTitle').textContent = id ? 'Edit Product' : 'Add Product';

    if (id && productsList) {
      const p = productsList.find(function (x) { return x.id === id; });
      if (!p) return;
      document.getElementById('productId').value = p.id;
      document.getElementById('pName').value = p.name;
      document.getElementById('pCategory').value = p.category;
      document.getElementById('pPrice').value = p.price;
      document.getElementById('pOldPrice').value = p.oldPrice || '';
      document.getElementById('pStock').value = p.stock != null ? p.stock : 0;
      document.getElementById('pBadge').value = p.badge || '';
      document.getElementById('pSizes').value = Array.isArray(p.sizes) ? p.sizes.join(', ') : '';
      document.getElementById('pImage').value = p.image;
      document.getElementById('pDesc').value = p.description || '';
    } else {
      form.reset();
      document.getElementById('pStock').value = 10;
    }
    productModal.show();
  }

  async function saveProduct() {
    const form = document.getElementById('productForm');
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const idVal = document.getElementById('productId').value;
    const sizesRaw = document.getElementById('pSizes').value.trim();
    const sizes = sizesRaw
      ? sizesRaw.split(/[, ]+/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
          const n = parseInt(s, 10);
          return isNaN(n) ? s : n;
        })
      : [];

    const oldPriceVal = document.getElementById('pOldPrice').value;
    const body = {
      name: document.getElementById('pName').value.trim(),
      category: document.getElementById('pCategory').value,
      price: +document.getElementById('pPrice').value,
      oldPrice: oldPriceVal ? +oldPriceVal : null,
      stock: +document.getElementById('pStock').value,
      badge: document.getElementById('pBadge').value || null,
      sizes: sizes,
      image: document.getElementById('pImage').value.trim(),
      description: document.getElementById('pDesc').value.trim()
    };

    try {
      if (idVal) {
        await api('/products/' + idVal, { method: 'PUT', body: body, auth: true });
      } else {
        await api('/products', { method: 'POST', body: body, auth: true });
      }
      productModal.hide();
      renderProductsTable();
      toast('Saved', body.name + ' has been saved.');
    } catch (e) {
      toast('Error', e.message);
    }
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    try {
      await api('/products/' + id, { method: 'DELETE', auth: true });
      renderProductsTable();
      toast('Deleted', 'Product removed.');
    } catch (e) {
      toast('Error', e.message);
    }
  }

  async function renderOrdersTable() {
    try {
      const filter = document.getElementById('orderStatusFilter').value;
      const q = filter !== 'all' ? '?status=' + encodeURIComponent(filter) : '';
      const orders = await api('/orders' + q, { auth: true });
      const tbody = document.getElementById('ordersTableBody');
      if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No orders found</td></tr>';
        return;
      }
      tbody.innerHTML = orders.map(function (o) {
        const itemCount = (o.items || []).reduce(function (s, i) { return s + (i.qty || 0); }, 0);
        return (
          '<tr>' +
          '<td><code>' + o.id + '</code></td>' +
          '<td><div>' + (o.customer && o.customer.name ? o.customer.name : '—') + '</div>' +
          '<div class="small text-muted">' + (o.customer && o.customer.phone ? o.customer.phone : '') + '</div></td>' +
          '<td>' + itemCount + ' item(s)</td>' +
          '<td>' + formatPrice(o.total) + '</td>' +
          '<td>' + statusBadge(o.status) + '</td>' +
          '<td class="small">' + formatDate(o.date) + '</td>' +
          '<td><button class="btn btn-sm btn-outline-primary btn-view-order" data-id="' + o.id + '">View</button></td>' +
          '</tr>'
        );
      }).join('');

      tbody.querySelectorAll('.btn-view-order').forEach(function (btn) {
        btn.addEventListener('click', function () { openOrderModal(btn.dataset.id); });
      });
    } catch (e) {
      toast('Error', e.message);
    }
  }

  async function openOrderModal(orderId) {
    try {
      const order = await api('/orders/' + orderId, { auth: true });
      currentOrderId = orderId;
      document.getElementById('orderModalTitle').textContent = 'Order ' + order.id;
      document.getElementById('orderStatusSelect').value = order.status || 'pending';

      const itemsHtml = (order.items || []).map(function (i) {
        return (
          '<div class="d-flex justify-content-between small border-bottom py-2">' +
          '<span>' + i.name + ' · Size ' + (i.size || '—') + ' × ' + i.qty + '</span>' +
          '<span>' + formatPrice(i.price * i.qty) + '</span>' +
          '</div>'
        );
      }).join('');

      const c = order.customer || {};
      document.getElementById('orderModalBody').innerHTML =
        '<p class="mb-1"><strong>Customer</strong></p>' +
        '<p class="small text-muted mb-3">' +
        (c.name || '—') + '<br>' + (c.email || '') + '<br>' + (c.phone || '') + '<br>' + (c.address || '') +
        '</p>' +
        '<p class="mb-1"><strong>Items</strong></p>' +
        itemsHtml +
        '<div class="d-flex justify-content-between mt-3 fw-semibold">' +
        '<span>Total</span><span>' + formatPrice(order.total) + '</span></div>' +
        '<p class="small text-muted mt-2 mb-0">Placed: ' + formatDate(order.date) + '</p>';

      orderModal.show();
    } catch (e) {
      toast('Error', e.message);
    }
  }

  async function updateOrderStatus() {
    if (!currentOrderId) return;
    const status = document.getElementById('orderStatusSelect').value;
    try {
      await api('/orders/' + currentOrderId + '/status', {
        method: 'PATCH',
        body: { status: status },
        auth: true
      });
      orderModal.hide();
      renderOrdersTable();
      toast('Updated', 'Order ' + currentOrderId + ' → ' + status);
    } catch (e) {
      toast('Error', e.message);
    }
  }

  async function resetProducts() {
    if (!confirm('Reset all products to default catalog?')) return;
    try {
      await api('/products/reset', { method: 'POST', auth: true });
      renderProductsTable();
      toast('Reset', 'Products restored to defaults.');
    } catch (e) {
      toast('Error', e.message);
    }
  }

  async function clearOrders() {
    if (!confirm('Delete ALL orders? This cannot be undone.')) return;
    try {
      await api('/orders', { method: 'DELETE', auth: true });
      renderOrdersTable();
      toast('Cleared', 'All orders removed.');
    } catch (e) {
      toast('Error', e.message);
    }
  }

  // Auth
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { username: username, password: password }
      });
      setToken(data.token);
      loginError.classList.add('d-none');
      showApp();
    } catch (err) {
      loginError.classList.remove('d-none');
    }
  });

  logoutBtn.addEventListener('click', async function () {
    try {
      await api('/auth/logout', { method: 'POST', auth: true });
    } catch (_) {}
    clearToken();
    showLogin();
  });

  navLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      showSection(a.dataset.section);
      if (window.innerWidth < 992) adminSidebar.classList.remove('open');
    });
  });

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function () {
      adminSidebar.classList.toggle('open');
    });
  }

  document.getElementById('btnAddProduct').addEventListener('click', function () {
    openProductModal(null);
  });
  document.getElementById('btnSaveProduct').addEventListener('click', saveProduct);
  document.getElementById('orderStatusFilter').addEventListener('change', renderOrdersTable);
  document.getElementById('btnUpdateOrderStatus').addEventListener('click', updateOrderStatus);
  document.getElementById('btnResetProducts').addEventListener('click', resetProducts);
  document.getElementById('btnClearOrders').addEventListener('click', clearOrders);

  productModal = new bootstrap.Modal(document.getElementById('productModal'));
  orderModal = new bootstrap.Modal(document.getElementById('orderModal'));
  adminToast = new bootstrap.Toast(document.getElementById('adminToast'), { delay: 2800 });

  // Boot: verify token if present
  (async function () {
    if (!getToken()) {
      showLogin();
      return;
    }
    try {
      await api('/auth/me', { auth: true });
      showApp();
    } catch {
      clearToken();
      showLogin();
    }
  })();
})();
