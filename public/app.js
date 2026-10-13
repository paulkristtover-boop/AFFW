/* ============================================
   AFFW Storefront — uses /api
   ============================================ */

(function () {
  'use strict';

  if (document.body && document.body.dataset.page === 'admin') return;

  const API = '/api';
  let products = [];
  let cart = JSON.parse(localStorage.getItem('affw_cart') || '[]');
  let currentFilter = 'all';
  let selectedSizes = {};

  const productGrid = document.getElementById('productGrid');
  const cartCountEl = document.getElementById('cartCount');
  const cartItemsEl = document.getElementById('cartItems');
  const emptyCartMsg = document.getElementById('emptyCartMsg');
  const cartSummary = document.getElementById('cartSummary');
  const cartSubtotalEl = document.getElementById('cartSubtotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const clearCartBtn = document.getElementById('clearCartBtn');
  const placeOrderBtn = document.getElementById('placeOrderBtn');
  const checkoutForm = document.getElementById('checkoutForm');
  const contactForm = document.getElementById('contactForm');
  const newsletterForm = document.getElementById('newsletterForm');
  const filterBtns = document.querySelectorAll('.btn-filter');
  const toastEl = document.getElementById('liveToast');
  const toast = toastEl ? new bootstrap.Toast(toastEl, { delay: 3200 }) : null;

  function formatPrice(naira) {
    return '₦' + Number(naira).toLocaleString('en-NG');
  }

  function showToast(title, message) {
    if (!toast) return;
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastBody').textContent = message;
    toast.show();
  }

  function saveCart() {
    localStorage.setItem('affw_cart', JSON.stringify(cart));
  }

  async function fetchProducts(filter) {
    try {
      const q = filter && filter !== 'all' ? '?category=' + encodeURIComponent(filter) : '';
      const res = await fetch(API + '/products' + q);
      if (!res.ok) throw new Error('Failed to load products');
      products = await res.json();
      return products;
    } catch (e) {
      console.error(e);
      showToast('Error', 'Could not load products. Is the server running?');
      products = [];
      return [];
    }
  }

  async function renderProducts(filter) {
    currentFilter = filter || 'all';
    await fetchProducts(currentFilter);
    if (!productGrid) return;

    if (!products.length) {
      productGrid.innerHTML = '<div class="col-12 text-center text-muted py-5">No products in this category.</div>';
      return;
    }

    productGrid.innerHTML = products.map(function (p) {
      const sizes = Array.isArray(p.sizes) ? p.sizes : [];
      const sizeOpts = sizes.map(function (s) {
        return '<option value="' + s + '">' + s + '</option>';
      }).join('');
      const outOfStock = p.stock != null && p.stock <= 0;
      return (
        '<div class="col-6 col-md-4 col-lg-3">' +
        '<div class="product-card">' +
        '<div class="product-img-wrap">' +
        (p.badge ? '<span class="product-badge ' + p.badge + '">' + (p.badge === 'new' ? 'New' : 'Sale') + '</span>' : '') +
        (outOfStock ? '<span class="product-badge sold-out">Sold out</span>' : '') +
        '<img src="' + p.image + '" alt="' + p.name + '" loading="lazy" onerror="this.src=\'https://via.placeholder.com/500?text=AFFW\'">' +
        '</div>' +
        '<div class="product-body">' +
        '<div class="product-category">' + p.category + '</div>' +
        '<h3 class="product-title">' + p.name + '</h3>' +
        '<div class="product-price">' +
        formatPrice(p.price) +
        (p.oldPrice ? '<span class="old">' + formatPrice(p.oldPrice) + '</span>' : '') +
        '</div>' +
        (sizes.length
          ? '<select class="form-select form-select-sm size-select mt-2" data-id="' + p.id + '"' + (outOfStock ? ' disabled' : '') + '>' +
            '<option value="">Size</option>' + sizeOpts + '</select>'
          : '') +
        '<button class="btn-add-cart" data-id="' + p.id + '"' + (outOfStock ? ' disabled' : '') + '>' +
        '<i class="bi bi-bag-plus me-1"></i> ' + (outOfStock ? 'Sold Out' : 'Add to Cart') +
        '</button>' +
        '</div></div></div>'
      );
    }).join('');

    productGrid.querySelectorAll('.size-select').forEach(function (sel) {
      sel.addEventListener('change', function () {
        selectedSizes[+sel.dataset.id] = sel.value;
      });
    });
    productGrid.querySelectorAll('.btn-add-cart').forEach(function (btn) {
      btn.addEventListener('click', function () {
        addToCart(+btn.dataset.id);
      });
    });
  }

  function addToCart(productId) {
    const product = products.find(function (p) { return p.id === productId; });
    if (!product || (product.stock != null && product.stock <= 0)) return;

    const size = selectedSizes[productId] || '';
    if (product.sizes && product.sizes.length && !size) {
      showToast('Select Size', 'Please choose a size before adding to cart.');
      return;
    }

    const existing = cart.find(function (item) {
      return item.id === productId && item.size === size;
    });
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: size || '—',
        qty: 1
      });
    }
    saveCart();
    updateCartUI();
    showToast('Added to Cart', product.name + (size ? ' (Size ' + size + ')' : '') + ' added.');
  }

  function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
    showToast('Removed', 'Item removed from cart.');
  }

  function updateQty(index, delta) {
    if (!cart[index]) return;
    cart[index].qty += delta;
    if (cart[index].qty < 1) {
      removeFromCart(index);
      return;
    }
    saveCart();
    updateCartUI();
  }

  function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
    showToast('Cart Cleared', 'All items removed.');
  }

  function getSubtotal() {
    return cart.reduce(function (sum, item) {
      return sum + item.price * item.qty;
    }, 0);
  }

  function updateCartUI() {
    if (!cartCountEl) return;
    const totalItems = cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
    cartCountEl.textContent = totalItems;
    cartCountEl.style.display = totalItems > 0 ? 'inline-block' : 'none';

    if (!cartItemsEl) return;

    if (cart.length === 0) {
      if (emptyCartMsg) emptyCartMsg.style.display = 'block';
      if (cartSummary) cartSummary.style.display = 'none';
      cartItemsEl.innerHTML = '<p class="text-muted text-center mt-5" id="emptyCartMsg">Your cart is empty.</p>';
      return;
    }

    if (emptyCartMsg) emptyCartMsg.style.display = 'none';
    if (cartSummary) cartSummary.style.display = 'block';

    cartItemsEl.innerHTML = cart.map(function (item, idx) {
      return (
        '<div class="cart-item">' +
        '<img src="' + item.image + '" alt="' + item.name + '" class="cart-item-img" onerror="this.src=\'https://via.placeholder.com/70\'">' +
        '<div class="cart-item-details">' +
        '<div class="cart-item-title">' + item.name + '</div>' +
        '<div class="cart-item-meta">Size: ' + item.size + ' · ' + formatPrice(item.price) + '</div>' +
        '<div class="d-flex align-items-center gap-2 mt-1">' +
        '<button class="cart-qty-btn" data-action="dec" data-idx="' + idx + '">−</button>' +
        '<span class="small fw-semibold">' + item.qty + '</span>' +
        '<button class="cart-qty-btn" data-action="inc" data-idx="' + idx + '">+</button>' +
        '</div>' +
        '<button class="cart-remove" data-idx="' + idx + '">Remove</button>' +
        '</div>' +
        '<div class="cart-item-price">' + formatPrice(item.price * item.qty) + '</div>' +
        '</div>'
      );
    }).join('');

    if (cartSubtotalEl) cartSubtotalEl.textContent = formatPrice(getSubtotal());

    cartItemsEl.querySelectorAll('.cart-qty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        updateQty(+btn.dataset.idx, btn.dataset.action === 'inc' ? 1 : -1);
      });
    });
    cartItemsEl.querySelectorAll('.cart-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        removeFromCart(+btn.dataset.idx);
      });
    });
  }

  function openCheckout() {
    if (cart.length === 0) return;
    new bootstrap.Modal(document.getElementById('checkoutModal')).show();
  }

  async function placeOrder() {
    if (!checkoutForm.checkValidity()) {
      checkoutForm.classList.add('was-validated');
      return;
    }

    const name = document.getElementById('checkoutName').value.trim();
    const email = document.getElementById('checkoutEmail').value.trim();
    const phone = document.getElementById('checkoutPhone').value.trim();
    const address = document.getElementById('checkoutAddress').value.trim();

    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Placing...';

    try {
      const res = await fetch(API + '/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: name, email: email, phone: phone, address: address },
          items: cart,
          total: getSubtotal()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order failed');

      cart = [];
      saveCart();
      updateCartUI();
      await renderProducts(currentFilter);

      const modal = bootstrap.Modal.getInstance(document.getElementById('checkoutModal'));
      if (modal) modal.hide();
      const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('cartOffcanvas'));
      if (offcanvas) offcanvas.hide();

      checkoutForm.reset();
      checkoutForm.classList.remove('was-validated');
      showToast('Order Placed!', 'Thank you ' + name + '! Order ' + data.id + ' received.');
    } catch (e) {
      showToast('Error', e.message || 'Could not place order');
    } finally {
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = 'Place Order';
    }
  }

  function handleContactSubmit(e) {
    e.preventDefault();
    if (!contactForm.checkValidity()) {
      contactForm.classList.add('was-validated');
      return;
    }
    showToast('Message Sent', 'Thank you! Austine will get back to you soon.');
    contactForm.reset();
    contactForm.classList.remove('was-validated');
  }

  function handleNewsletter(e) {
    e.preventDefault();
    showToast('Subscribed', 'You are now on the AFFW list. Welcome!');
    e.target.reset();
  }

  function handleScroll() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }

  if (filterBtns.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderProducts(btn.dataset.category);
      });
    });
  }
  if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckout);
  if (clearCartBtn) clearCartBtn.addEventListener('click', clearCart);
  if (placeOrderBtn) placeOrderBtn.addEventListener('click', placeOrder);
  if (contactForm) contactForm.addEventListener('submit', handleContactSubmit);
  if (newsletterForm) newsletterForm.addEventListener('submit', handleNewsletter);
  window.addEventListener('scroll', handleScroll);

  renderProducts('all');
  updateCartUI();
  handleScroll();
})();
