/* ============================================
   Austine Fashion Footwears (AFFW)
   app.js — Shop, Cart, Orders & Interactions
   ============================================ */

(function () {
  'use strict';

  // ---------- Sample Product Data ----------
  const products = [
    {
      id: 1,
      name: 'Urban Runner',
      category: 'sneakers',
      price: 45000,
      oldPrice: 52000,
      image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&h=500&fit=crop',
      badge: 'sale',
      sizes: [40, 41, 42, 43, 44]
    },
    {
      id: 2,
      name: 'Classic Oxford',
      category: 'formal',
      price: 68000,
      oldPrice: null,
      image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=500&fit=crop',
      badge: 'new',
      sizes: [39, 40, 41, 42, 43]
    },
    {
      id: 3,
      name: 'Heritage Boot',
      category: 'boots',
      price: 85000,
      oldPrice: null,
      image: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=500&h=500&fit=crop',
      badge: null,
      sizes: [40, 41, 42, 43, 44, 45]
    },
    {
      id: 4,
      name: 'City Sneaker',
      category: 'sneakers',
      price: 38000,
      oldPrice: null,
      image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&h=500&fit=crop',
      badge: 'new',
      sizes: [39, 40, 41, 42, 43, 44]
    },
    {
      id: 5,
      name: 'Leather Loafer',
      category: 'formal',
      price: 55000,
      oldPrice: 62000,
      image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=500&h=500&fit=crop',
      badge: 'sale',
      sizes: [40, 41, 42, 43]
    },
    {
      id: 6,
      name: 'Trail Boot',
      category: 'boots',
      price: 72000,
      oldPrice: null,
      image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=500&h=500&fit=crop',
      badge: null,
      sizes: [41, 42, 43, 44, 45]
    },
    {
      id: 7,
      name: 'Summer Sandal',
      category: 'sandals',
      price: 28000,
      oldPrice: null,
      image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500&h=500&fit=crop',
      badge: 'new',
      sizes: [38, 39, 40, 41, 42, 43]
    },
    {
      id: 8,
      name: 'Minimal Slip-On',
      category: 'sneakers',
      price: 42000,
      oldPrice: null,
      image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&h=500&fit=crop',
      badge: null,
      sizes: [40, 41, 42, 43, 44]
    }
  ];

  // ---------- State ----------
  let cart = JSON.parse(localStorage.getItem('affw_cart')) || [];
  let currentFilter = 'all';

  // ---------- DOM References ----------
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
  const toast = new bootstrap.Toast(toastEl, { delay: 3000 });

  // ---------- Helpers ----------
  function formatPrice(naira) {
    return '₦' + naira.toLocaleString('en-NG');
  }

  function showToast(title, message) {
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastBody').textContent = message;
    toast.show();
  }

  function saveCart() {
    localStorage.setItem('affw_cart', JSON.stringify(cart));
  }

  // ---------- Render Products ----------
  function renderProducts(filter = 'all') {
    currentFilter = filter;
    const filtered = filter === 'all'
      ? products
      : products.filter(p => p.category === filter);

    if (filtered.length === 0) {
      productGrid.innerHTML = '<div class="col-12 text-center text-muted py-5">No products in this category.</div>';
      return;
    }

    productGrid.innerHTML = filtered.map(p => `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="product-card">
          <div class="product-img-wrap">
            ${p.badge ? `<span class="product-badge ${p.badge}">${p.badge === 'new' ? 'New' : 'Sale'}</span>` : ''}
            <img src="${p.image}" alt="${p.name}" loading="lazy">
          </div>
          <div class="product-body">
            <div class="product-category">${p.category}</div>
            <h3 class="product-title">${p.name}</h3>
            <div class="product-price">
              ${formatPrice(p.price)}
              ${p.oldPrice ? `<span class="old">${formatPrice(p.oldPrice)}</span>` : ''}
            </div>
            <button class="btn-add-cart" data-id="${p.id}">
              <i class="bi bi-bag-plus me-1"></i> Add to Cart
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Attach add-to-cart listeners
    productGrid.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', () => addToCart(+btn.dataset.id));
    });
  }

  // ---------- Cart Functions ----------
  function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        qty: 1
      });
    }
    saveCart();
    updateCartUI();
    showToast('Added to Cart', `${product.name} has been added to your cart.`);
  }

  function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
    showToast('Removed', 'Item removed from cart.');
  }

  function updateQty(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty < 1) {
      removeFromCart(productId);
      return;
    }
    saveCart();
    updateCartUI();
  }

  function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
    showToast('Cart Cleared', 'All items have been removed.');
  }

  function getSubtotal() {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    cartCountEl.textContent = totalItems;
    cartCountEl.style.display = totalItems > 0 ? 'inline-block' : 'none';

    if (cart.length === 0) {
      emptyCartMsg.style.display = 'block';
      cartSummary.style.display = 'none';
      cartItemsEl.innerHTML = '<p class="text-muted text-center mt-5" id="emptyCartMsg">Your cart is empty.</p>';
      return;
    }

    emptyCartMsg.style.display = 'none';
    cartSummary.style.display = 'block';

    cartItemsEl.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-details">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-meta">${formatPrice(item.price)} each</div>
          <div class="d-flex align-items-center gap-2 mt-1">
            <button class="cart-qty-btn" data-action="dec" data-id="${item.id}">−</button>
            <span class="small fw-semibold">${item.qty}</span>
            <button class="cart-qty-btn" data-action="inc" data-id="${item.id}">+</button>
          </div>
          <button class="cart-remove" data-id="${item.id}">Remove</button>
        </div>
        <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
      </div>
    `).join('');

    cartSubtotalEl.textContent = formatPrice(getSubtotal());

    // Re-attach listeners
    cartItemsEl.querySelectorAll('.cart-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = +btn.dataset.id;
        const delta = btn.dataset.action === 'inc' ? 1 : -1;
        updateQty(id, delta);
      });
    });
    cartItemsEl.querySelectorAll('.cart-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(+btn.dataset.id));
    });
  }

  // ---------- Checkout ----------
  function openCheckout() {
    if (cart.length === 0) return;
    const modal = new bootstrap.Modal(document.getElementById('checkoutModal'));
    modal.show();
  }

  function placeOrder() {
    if (!checkoutForm.checkValidity()) {
      checkoutForm.classList.add('was-validated');
      return;
    }

    const name = document.getElementById('checkoutName').value.trim();
    const orderId = 'AFFW-' + Math.floor(1000 + Math.random() * 9000);

    // Simulate order success
    cart = [];
    saveCart();
    updateCartUI();

    const modalEl = document.getElementById('checkoutModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    // Close cart offcanvas
    const offcanvasEl = document.getElementById('cartOffcanvas');
    const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
    if (offcanvas) offcanvas.hide();

    checkoutForm.reset();
    checkoutForm.classList.remove('was-validated');

    showToast('Order Placed!', `Thank you ${name}! Your order ${orderId} has been received. (Demo only)`);
  }

  // ---------- Forms ----------
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

  // ---------- Navbar scroll effect ----------
  function handleScroll() {
    const nav = document.getElementById('mainNav');
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  // ---------- Event Listeners ----------
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts(btn.dataset.category);
    });
  });

  checkoutBtn.addEventListener('click', openCheckout);
  clearCartBtn.addEventListener('click', clearCart);
  placeOrderBtn.addEventListener('click', placeOrder);
  contactForm.addEventListener('submit', handleContactSubmit);
  newsletterForm.addEventListener('submit', handleNewsletter);
  window.addEventListener('scroll', handleScroll);

  // ---------- Init ----------
  renderProducts('all');
  updateCartUI();
  handleScroll();

})();
