/* =========================================================
   TRUE SPA (HASH ROUTER) + OFFLINE SAFE DATA (NO fetch)
   Requires: assets/js/data.js defines:
     const RAW_MEAL_DATA = { meals: [ ... ] }
========================================================= */

// -------------------------
// App Data
// -------------------------
let PRODUCTS = [];
let PRODUCTS_MAP = {};

function loadProductsFromEmbeddedData() {
  if (typeof RAW_MEAL_DATA === "undefined" || !RAW_MEAL_DATA?.meals) {
    console.error("RAW_MEAL_DATA missing. Ensure assets/js/data.js loads before main.js");
    PRODUCTS = [];
    PRODUCTS_MAP = {};
    return;
  }

  const meals = RAW_MEAL_DATA.meals || [];

  PRODUCTS = meals.map((m) => ({
    id: m.idMeal,
    name: m.strMeal || "Unknown Meal",
    category: m.strCategory || "Other",
    image: m.strMealThumb || "",
    description: ((m.strInstructions || "Delicious meal.").replace(/\s+/g, " ").trim()).slice(0, 90) + "...",
    price: makePriceFromId(m.idMeal),
    raw: m,
  }));

  PRODUCTS_MAP = {};
  PRODUCTS.forEach((p) => (PRODUCTS_MAP[p.id] = p));
}

function makePriceFromId(idMeal) {
  const s = String(idMeal || "10");
  const last2 = Number(s.slice(-2)) || 10;
  const price = 5 + (last2 % 11) + (last2 % 10) * 0.1; // ~$5 - $16
  return Number(price.toFixed(2));
}

function formatMoney(n) {
  return `$${Number(n).toFixed(2)}`;
}

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// -------------------------
// Cart (localStorage)
// -------------------------
const CART_KEY = "cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function cartCount(cart) {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function setCartCountBadge() {
  const badge = document.getElementById("cartCount");
  if (!badge) return;
  badge.textContent = cartCount(getCart());
}

function addToCart(item) {
  const cart = getCart();
  const found = cart.find((x) => x.id === item.id);

  if (found) found.qty += 1;
  else cart.push({ ...item, qty: 1 });

  saveCart(cart);
  setCartCountBadge();
}

function removeFromCart(id) {
  const cart = getCart().filter((x) => x.id !== id);
  saveCart(cart);
  setCartCountBadge();
  return cart;
}

function updateQty(id, qty) {
  const cart = getCart();
  const found = cart.find((x) => x.id === id);
  if (!found) return cart;

  found.qty = Math.max(1, qty);
  saveCart(cart);
  setCartCountBadge();
  return cart;
}

function clearCart() {
  saveCart([]);
  setCartCountBadge();
  return [];
}

// -------------------------
// SweetAlert helpers
// -------------------------
function toastSuccess(title) {
  if (typeof Swal === "undefined") return;
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title,
    showConfirmButton: false,
    timer: 1200,
    timerProgressBar: true,
  });
}

function swalInfo(title, text = "") {
  if (typeof Swal === "undefined") return;
  Swal.fire({ icon: "info", title, text });
}

// =====================================================
// Router
// Routes:
//   #/home?q=...&cat=...&scroll=menu
//   #/product?id=53281
//   #/order
// =====================================================
function parseHash() {
  const hash = window.location.hash || "#/home";
  const cleaned = hash.startsWith("#") ? hash.slice(1) : hash;
  const [path, qs] = cleaned.split("?");
  const parts = path.split("/").filter(Boolean);
  const route = parts[0] || "home";
  const params = new URLSearchParams(qs || "");
  return { route, params };
}

function setActiveNav(route) {
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.remove("active"));
  if (route === "order") document.querySelector('[data-nav="order"]')?.classList.add("active");
  else document.querySelector('[data-nav="home"]')?.classList.add("active");
}

// =====================================================
// Views
// =====================================================
function renderHomeView(params) {
  const app = document.getElementById("app");
  if (!app) return;

  const q = params.get("q") || "";
  const cat = params.get("cat") || "";

  document.title = "FoodOrder";

  app.innerHTML = `
    <!-- Hero -->
    <section class="container my-4">
      <div id="heroCarousel" class="carousel slide rounded overflow-hidden" data-bs-ride="carousel">
        <div class="carousel-indicators" id="heroIndicators"></div>
        <div class="carousel-inner" id="heroCarouselInner"></div>

        <button class="carousel-control-prev" type="button" data-bs-target="#heroCarousel" data-bs-slide="prev">
          <span class="carousel-control-prev-icon"></span>
          <span class="visually-hidden">Previous</span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#heroCarousel" data-bs-slide="next">
          <span class="carousel-control-next-icon"></span>
          <span class="visually-hidden">Next</span>
        </button>
      </div>
    </section>

    <!-- Search + Categories -->
    <section class="container my-4">
      <div class="row g-3 align-items-center">
        <div class="col-12 col-md-8 mx-auto">
          <input id="searchInput" class="form-control form-control-lg" type="text"
            placeholder="Search for food..." value="${escapeHtml(q)}">
        </div>
      </div>

      <div id="categoryButtons" class="d-flex flex-wrap gap-2 justify-content-center mt-3"></div>
    </section>

    <!-- No results -->
    <section class="container">
      <div id="noResults" class="alert alert-warning d-none">No results found. Try a different keyword.</div>
    </section>

    <!-- Menu -->
    <section id="menu" class="container my-5">
      <div id="menuSections"></div>
    </section>
  `;

  // build page content
  renderHeroSlider();
  renderMenuSections(cat);
  setupSearchFilterWithURL();
  setupCategoryButtonsWithURL();

  // scroll helper (menu link)
  if (params.get("scroll") === "menu") {
    setTimeout(() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" }), 50);
  }
}

function renderProductView(params) {
  const app = document.getElementById("app");
  if (!app) return;

  const id = params.get("id");
  const p = PRODUCTS_MAP[id];

  if (!p) {
    document.title = "Product Not Found";
    app.innerHTML = `
      <div class="container my-5">
        <a href="#/home" class="text-decoration-none">&larr; Back to Home</a>
        <div class="alert alert-danger mt-3">Product not found.</div>
        <a href="#/home" class="btn btn-danger">Back</a>
      </div>
    `;
    return;
  }

  document.title = p.name;

  app.innerHTML = `
    <div class="container my-5">
      <a href="#/home" class="text-decoration-none">&larr; Back to Home</a>

      <div class="row g-4 align-items-center mt-2">
        <div class="col-12 col-md-6">
          <img src="${p.image}" alt="${escapeHtml(p.name)}"
            class="img-fluid rounded border"
            style="width:100%; max-height:420px; object-fit:cover;">
        </div>

        <div class="col-12 col-md-6">
          <h1 class="mb-2">${escapeHtml(p.name)}</h1>
          <div class="text-muted mb-2">${escapeHtml(p.category)}</div>
          <div class="fs-3 fw-bold text-danger mb-3">${formatMoney(p.price)}</div>
          <p class="text-muted">${escapeHtml(p.raw?.strInstructions || p.description)}</p>

          <div class="d-flex gap-2 mt-4">
            <button class="btn btn-outline-secondary add-cart" data-id="${p.id}">Add to Cart</button>
            <a class="btn btn-danger order-now" href="#/order" data-id="${p.id}">
  Order Now
</a>

          </div>
        </div>
      </div>
    </div>
  `;
}

function renderOrderView() {
  const app = document.getElementById("app");
  if (!app) return;

  document.title = "Order Details";

  app.innerHTML = `
    <main class="container my-5">
      <h1 class="mb-4">Order Details</h1>

      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card">
            <div class="card-header fw-bold">Order Summary</div>
            <div class="card-body">
              <div id="orderItems" class="d-flex flex-column gap-3"></div>
              <p id="emptyMsg" class="text-muted mb-0 d-none">Your cart is empty. Add items from Home.</p>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card">
            <div class="card-header fw-bold">Pricing</div>
            <div class="card-body">
              <div class="d-flex justify-content-between"><span>Subtotal</span><span id="subtotal">$0.00</span></div>
              <div class="d-flex justify-content-between"><span>Delivery</span><span id="delivery">$0.00</span></div>
              <div class="d-flex justify-content-between"><span>Tax</span><span id="tax">$0.00</span></div>

              <hr>

              <div class="d-flex justify-content-between fw-bold fs-5"><span>Total</span><span id="total">$0.00</span></div>

              <div class="d-grid gap-2 mt-3">
                <button class="btn btn-danger" id="placeOrderBtn">Place Order</button>
                <a class="btn btn-outline-secondary" href="#/home">Continue Shopping</a>
              </div>

              <button class="btn btn-outline-danger w-100 mt-3" id="clearCartBtn">Clear Cart</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  `;

  mountOrderLogic();
}

// =====================================================
// Home rendering helpers
// =====================================================
function renderHeroSlider() {
  const inner = document.getElementById("heroCarouselInner");
  const indicators = document.getElementById("heroIndicators");
  if (!inner || !indicators) return;

  const slides = PRODUCTS.slice(0, 3);
  if (!slides.length) return;

  indicators.innerHTML = slides
    .map((_, idx) =>
      `<button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="${idx}" class="${idx === 0 ? "active" : ""}"></button>`
    )
    .join("");

  inner.innerHTML = slides
    .map((p, idx) => `
      <div class="carousel-item ${idx === 0 ? "active" : ""}">
        <img src="${p.image}" class="d-block w-100" alt="${escapeHtml(p.name)}"
             style="height:320px; object-fit:cover;">
        <div class="carousel-caption d-none d-md-block">
          <h3 class="fw-bold">${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(p.category)} • ${formatMoney(p.price)}</p>
        </div>
      </div>
    `)
    .join("");
}

function renderMenuSections(activeCatId) {
  const sectionsWrap = document.getElementById("menuSections");
  if (!sectionsWrap) return;

  const categories = Array.from(new Set(PRODUCTS.map((p) => p.category))).sort();
  const topCategories = categories.slice(0, 8);

  sectionsWrap.innerHTML = topCategories
    .map((cat) => {
      const secId = `cat-${slugify(cat)}`;
      const items = PRODUCTS.filter((p) => p.category === cat);

      const cards = items.map(productCard).join("");
      return `
        <h2 class="mb-3" id="${secId}">${escapeHtml(cat)}</h2>
        <div class="row g-4 mb-5">${cards}</div>
      `;
    })
    .join("");

  // If URL contains cat, scroll to it
  if (activeCatId) {
    setTimeout(() => document.getElementById(activeCatId)?.scrollIntoView({ behavior: "smooth" }), 50);
  }
}

function productCard(p) {
  return `
    <div class="col-12 col-sm-6 col-lg-3 food-item" data-name="${escapeHtml(p.name)}">
      <div class="card h-100">
        <a href="#/product?id=${encodeURIComponent(p.id)}" class="text-decoration-none text-dark">
          <img src="${p.image}" class="card-img-top" alt="${escapeHtml(p.name)}">
        </a>

        <div class="card-body d-flex flex-column">
          <a href="#/product?id=${encodeURIComponent(p.id)}" class="text-decoration-none text-dark">
            <h5 class="card-title">${escapeHtml(p.name)}</h5>
            <p class="card-text small text-muted">${escapeHtml(p.description)}</p>
            <p class="fw-bold mb-3">${formatMoney(p.price)}</p>
          </a>

          <div class="mt-auto d-flex gap-2">
            <button class="btn btn-outline-secondary w-50 btn-sm add-cart" data-id="${p.id}">
              Add to Cart
            </button>

            <a class="btn btn-danger w-50 btn-sm buy-now" href="#/order" data-id="${p.id}">
              Buy Now
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function setupCategoryButtonsWithURL() {
  const wrap = document.getElementById("categoryButtons");
  if (!wrap) return;

  const { params } = parseHash();
  const currentCat = params.get("cat") || "";

  const categories = Array.from(new Set(PRODUCTS.map((p) => p.category))).sort();
  const topCategories = categories.slice(0, 8);

  wrap.innerHTML = `
    <button class="btn ${currentCat ? "btn-outline-danger" : "btn-danger"} category-btn" data-cat="">
      All
    </button>
    ${topCategories
      .map((c) => {
        const secId = `cat-${slugify(c)}`;
        const active = currentCat === secId;
        return `<button class="btn ${active ? "btn-danger" : "btn-outline-danger"} category-btn" data-cat="${secId}">${escapeHtml(c)}</button>`;
      })
      .join("")}
  `;

  wrap.querySelectorAll(".category-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { params } = parseHash();
      const q = params.get("q") || "";
      const cat = btn.dataset.cat || "";

      // update URL
      const newParams = new URLSearchParams();
      if (q) newParams.set("q", q);
      if (cat) newParams.set("cat", cat);

      window.location.hash = `#/home?${newParams.toString()}`;

      // scroll
      if (cat) {
        setTimeout(() => document.getElementById(cat)?.scrollIntoView({ behavior: "smooth" }), 50);
      } else {
        setTimeout(() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    });
  });
}

function setupSearchFilterWithURL() {
  const input = document.getElementById("searchInput");
  if (!input) return;

  const items = Array.from(document.querySelectorAll(".food-item"));
  const noResults = document.getElementById("noResults");

  function apply() {
    const query = input.value.trim().toLowerCase();

    // persist q in hash
    const { params } = parseHash();
    const cat = params.get("cat") || "";

    const newParams = new URLSearchParams();
    if (query) newParams.set("q", query);
    if (cat) newParams.set("cat", cat);

    window.location.hash = `#/home?${newParams.toString()}`;

    let visible = 0;
    items.forEach((card) => {
      const name = (card.dataset.name || "").toLowerCase();
      const text = card.textContent.toLowerCase();
      const match = !query || name.includes(query) || text.includes(query);
      card.style.display = match ? "" : "none";
      if (match) visible += 1;
    });

    noResults?.classList.toggle("d-none", visible !== 0);
  }

  input.addEventListener("input", apply);

  // Run once (so "No results" works on reload)
  apply();
}

// =====================================================
// Order logic (mount after order view renders)
// =====================================================
function mountOrderLogic() {
  const orderItemsDiv = document.getElementById("orderItems");
  const emptyMsg = document.getElementById("emptyMsg");
  const subtotalEl = document.getElementById("subtotal");
  const deliveryEl = document.getElementById("delivery");
  const taxEl = document.getElementById("tax");
  const totalEl = document.getElementById("total");
  const placeBtn = document.getElementById("placeOrderBtn");
  const clearBtn = document.getElementById("clearCartBtn");

  const deliveryFee = 2.0;
  const taxRate = 0;

  function calc(cart) {
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const tax = subtotal * taxRate;
    const delivery = cart.length ? deliveryFee : 0;
    const total = subtotal + tax + delivery;

    subtotalEl.textContent = formatMoney(subtotal);
    taxEl.textContent = formatMoney(tax);
    deliveryEl.textContent = formatMoney(delivery);
    totalEl.textContent = formatMoney(total);
  }

  function render() {
    const cart = getCart();
    setCartCountBadge();

    if (!cart.length) {
      orderItemsDiv.innerHTML = "";
      emptyMsg.classList.remove("d-none");
      calc(cart);
      return;
    }

    emptyMsg.classList.add("d-none");

    orderItemsDiv.innerHTML = cart
      .map(
        (item) => `
        <div class="border rounded p-3 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div class="d-flex align-items-center gap-3">
            <img src="${item.img}" alt="${escapeHtml(item.name)}"
              style="width:80px;height:80px;object-fit:cover" class="rounded">
            <div>
              <h6 class="mb-1">${escapeHtml(item.name)}</h6>
              <div class="text-muted small">Price: ${formatMoney(item.price)}</div>
              <div class="small fw-semibold mt-1">Item Total: ${formatMoney(item.price * item.qty)}</div>
            </div>
          </div>

          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-outline-secondary btn-sm qty-minus" data-id="${item.id}">−</button>
            <span class="fw-bold px-2" style="min-width: 28px; text-align:center;">${item.qty}</span>
            <button class="btn btn-outline-secondary btn-sm qty-plus" data-id="${item.id}">+</button>
          </div>

          <button class="btn btn-outline-danger btn-sm remove-item" data-id="${item.id}">Remove</button>
        </div>
      `
      )
      .join("");

    calc(cart);
  }

  render();

  orderItemsDiv.addEventListener("click", (e) => {
    const minus = e.target.closest(".qty-minus");
    const plus = e.target.closest(".qty-plus");
    const remove = e.target.closest(".remove-item");

    if (minus) {
      const id = minus.dataset.id;
      const cart = getCart();
      const it = cart.find((x) => x.id === id);
      if (!it) return;
      updateQty(id, it.qty - 1);
      render();
    }

    if (plus) {
      const id = plus.dataset.id;
      const cart = getCart();
      const it = cart.find((x) => x.id === id);
      if (!it) return;
      updateQty(id, it.qty + 1);
      render();
    }

    if (remove) {
      removeFromCart(remove.dataset.id);
      render();
    }
  });

  clearBtn?.addEventListener("click", () => {
    Swal.fire({
      icon: "warning",
      title: "Clear cart?",
      text: "This will remove all items.",
      showCancelButton: true,
      confirmButtonText: "Yes, clear",
      cancelButtonText: "Cancel",
    }).then((res) => {
      if (res.isConfirmed) {
        clearCart();
        toastSuccess("Cart cleared");
        render();
      }
    });
  });

  placeBtn?.addEventListener("click", () => {
    const cart = getCart();
    if (!cart.length) {
      swalInfo("Cart empty", "Please add items from Home.");
      return;
    }

    Swal.fire({
      icon: "success",
      title: "Order placed!",
      text: "Thanks for ordering. Your food will be delivered soon.",
      confirmButtonText: "OK",
    }).then(() => {
      clearCart();
      render();
      window.location.hash = "#/home";
    });
  });
}

// =====================================================
// Global click handler: Add / Buy
// =====================================================
document.addEventListener("click", (e) => {
  const addBtn = e.target.closest(".add-cart");
  // Order Now (product page)
const orderNowBtn = e.target.closest(".order-now");
if (orderNowBtn) {
  const id = orderNowBtn.dataset.id;
  const p = PRODUCTS_MAP[id];
  if (!p) return;

  addToCart({
    id: p.id,
    name: p.name,
    price: p.price,
    img: p.image,
  });

  // navigation already happens via href="#/order"
  return;
}


  if (addBtn) {
    const id = addBtn.dataset.id;
    const p = PRODUCTS_MAP[id];
    if (!p) return;

    addToCart({ id: p.id, name: p.name, price: p.price, img: p.image });
    toastSuccess("Added to cart");
    return;
  }

  const buyBtn = e.target.closest(".buy-now");
  if (buyBtn) {
    const id = buyBtn.dataset.id;
    const p = PRODUCTS_MAP[id];
    if (!p) return;

    addToCart({ id: p.id, name: p.name, price: p.price, img: p.image });
    // navigation happens via link (#/order)
  }
});

// =====================================================
// Render App
// =====================================================
function renderApp() {
  setCartCountBadge();

  const { route, params } = parseHash();
  setActiveNav(route);

  if (route === "order") {
    renderOrderView();
    return;
  }

  if (route === "product") {
    renderProductView(params);
    return;
  }

  // default
  renderHomeView(params);
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  loadProductsFromEmbeddedData();

  if (!window.location.hash) {
    window.location.hash = "#/home";
  }

  renderApp();
  window.addEventListener("hashchange", renderApp);
});
