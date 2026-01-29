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
// Theme (light/dark)
// -------------------------
const THEME_KEY = "theme";

function normalizeTheme(value) {
  return value === "dark" || value === "light" ? value : null;
}

function getStoredTheme() {
  try {
    return normalizeTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return null;
  }
}

function getPreferredTheme() {
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function updateThemeToggle(theme) {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  const isDark = theme === "dark";
  toggle.setAttribute("aria-pressed", isDark ? "true" : "false");

  const label = toggle.querySelector(".theme-label");
  if (label) {
    label.textContent = isDark ? "Light" : "Dark";
  } else {
    toggle.textContent = isDark ? "Light mode" : "Dark mode";
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-bs-theme", theme);
  updateThemeToggle(theme);
}

function initTheme() {
  const stored = getStoredTheme();
  const theme = stored || "dark";
  applyTheme(theme);

  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || theme;
      const next = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // ignore storage errors
      }
      applyTheme(next);
    });
  }

}

// -------------------------
// Animations
// -------------------------
let revealObserver = null;

function applyRevealDelays() {
  document.querySelectorAll("[data-reveal-delay]").forEach((el) => {
    const delay = Number.parseInt(el.dataset.revealDelay, 10);
    if (!Number.isNaN(delay)) {
      el.style.setProperty("--reveal-delay", `${delay}ms`);
    }
  });

  document.querySelectorAll("[data-reveal-stagger]").forEach((group) => {
    const items = group.querySelectorAll(".reveal");
    items.forEach((el, idx) => {
      const delay = Math.min(idx, 8) * 70;
      el.style.setProperty("--reveal-delay", `${delay}ms`);
    });
  });
}

function initAnimations() {
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("reveal-visible"));
    return;
  }

  applyRevealDelays();

  if (revealObserver) {
    revealObserver.disconnect();
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
}

function hidePageLoader() {
  const loader = document.getElementById("pageLoader");
  if (!loader) return;
  loader.classList.add("is-hidden");
  setTimeout(() => loader.remove(), 500);
}

// -------------------------
// Visitor tracking (JSONBin + IP lookup)
// -------------------------
const JSONBIN_ID = "697a6ed4d0ea881f408e5c42";
const JSONBIN_KEY = "$2a$10$nJdCbh/SlywIpznbkkGt0ORnvpt5113.fJDq5plotjSh6EHcmUnbS";

async function fetchJsonBinRecord() {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}/latest`, {
    headers: {
      "X-ACCESS-KEY": JSONBIN_KEY,
    },
  });
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return data?.record || {};
}

async function updateJsonBinRecord(record) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-ACCESS-KEY": JSONBIN_KEY,
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function getIpLocation() {
  const res = await fetch("https://ipapi.co/json/");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function logVisit() {
  if (sessionStorage.getItem("visitLogged")) return;
  sessionStorage.setItem("visitLogged", "true");

  try {
    const geo = await getIpLocation();
    const record = await fetchJsonBinRecord();
    const visits = Array.isArray(record.visits) ? record.visits : [];

    const visit = {
      ip: geo?.ip || "",
      city: geo?.city || "",
      region: geo?.region || "",
      country: geo?.country_name || "",
      latitude: geo?.latitude || "",
      longitude: geo?.longitude || "",
      timezone: geo?.timezone || "",
      time: new Date().toISOString(),
    };

    visits.push(visit);
    const trimmed = visits.slice(-200);
    await updateJsonBinRecord({ visits: trimmed });
  } catch {
    // ignore logging errors
  }
}

async function loadVisitorInsights() {
  const panel = document.getElementById("visitorPanel");
  if (!panel) return;

  try {
    const record = await fetchJsonBinRecord();
    const visits = Array.isArray(record.visits) ? record.visits : [];

    if (!visits.length) {
      panel.innerHTML = `<div class="visitor-empty">No visits recorded yet.</div>`;
      return;
    }

    const recent = visits.slice(-6).reverse();

    panel.innerHTML = `
      <div class="visitor-list">
        ${recent
          .map((v) => {
            const location = [v.city, v.region].filter(Boolean).join(", ") || "Unknown";
            const country = v.country || "Unknown";
            return `
          <div class="visitor-item">
            <div class="visitor-meta">
              <span class="visitor-title">${escapeHtml(location)}</span>
              <span class="visitor-sub">${escapeHtml(country)} • ${escapeHtml(v.ip || "")}</span>
            </div>
            <span class="visitor-time">${new Date(v.time).toLocaleString()}</span>
          </div>
        `;
          })
          .join("")}
      </div>
    `;
  } catch {
    panel.innerHTML = `<div class="visitor-empty">Unable to load visitor data.</div>`;
  }
}

// -------------------------
// Quantity picker (cards + product view)
// -------------------------
function getQtyFromPicker(picker) {
  if (!picker) return 1;
  const valueEl = picker.querySelector("[data-qty-value]") || picker.querySelector(".qty-value");
  const raw = picker.dataset.qty || valueEl?.textContent || "1";
  const qty = Number.parseInt(raw, 10);
  return Number.isNaN(qty) || qty < 1 ? 1 : qty;
}

function setQtyForPicker(picker, qty) {
  if (!picker) return;
  const valueEl = picker.querySelector("[data-qty-value]") || picker.querySelector(".qty-value");
  picker.dataset.qty = String(qty);
  if (valueEl) valueEl.textContent = String(qty);
}

function adjustPickerQty(picker, delta) {
  const current = getQtyFromPicker(picker);
  const next = Math.min(99, Math.max(1, current + delta));
  setQtyForPicker(picker, next);
}

function findQtyPicker(fromEl) {
  if (!fromEl) return null;
  return (
    fromEl.closest(".product-info")?.querySelector(".qty-picker") ||
    fromEl.closest(".product-hero")?.querySelector(".qty-picker") ||
    fromEl.closest(".card")?.querySelector(".qty-picker") ||
    fromEl.closest(".food-item")?.querySelector(".qty-picker")
  );
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

function addToCart(item, qty = 1) {
  const cart = getCart();
  const found = cart.find((x) => x.id === item.id);
  const amount = Math.max(1, Number(qty) || 1);

  if (found) found.qty += amount;
  else cart.push({ ...item, qty: amount });

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

function setActiveNav(route, params) {
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.remove("active"));

  if (route === "order") {
    document.querySelector('[data-nav="order"]')?.classList.add("active");
    return;
  }

  if (route === "about") {
    document.querySelector('[data-nav="about"]')?.classList.add("active");
    return;
  }

  if (route === "contact") {
    document.querySelector('[data-nav="contact"]')?.classList.add("active");
    return;
  }

  if (route === "book") {
    document.querySelector('[data-nav="book"]')?.classList.add("active");
    return;
  }

  if (route === "home" && params?.get("scroll") === "menu") {
    document.querySelector('[data-nav="menu"]')?.classList.add("active");
    return;
  }

  document.querySelector('[data-nav="home"]')?.classList.add("active");
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
    <section class="container my-4 hero-section reveal">
      <div class="hero-card">
        <div class="hero-header">
          <div>
            <span class="hero-kicker">Freshly prepared • Fast delivery</span>
            <h1 class="hero-title">Order your favorites, faster.</h1>
            <p class="hero-subtitle">Curated meals from the best kitchens around you.</p>
          </div>
          <div class="hero-cta">
            <a class="btn btn-danger btn-sm" href="#/home?scroll=menu">Explore menu</a>
            <a class="btn btn-outline-danger btn-sm" href="#/order">View cart</a>
          </div>
        </div>

        <div id="heroCarousel" class="carousel slide hero-carousel" data-bs-ride="carousel">
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
      </div>
    </section>

    <!-- Search + Categories -->
    <section class="container my-4 reveal">
      <div class="row g-3 align-items-center">
        <div class="col-12 col-md-8 mx-auto">
          <div class="search-shell">
            <div class="search-field">
              <span class="search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7"></circle>
                  <path d="M21 21l-4.3-4.3"></path>
                </svg>
              </span>
              <input id="searchInput" class="form-control form-control-lg search-input" type="text"
                placeholder="Search for food..." value="${escapeHtml(q)}" autocomplete="off">
            </div>
            <div id="searchSuggestions" class="search-suggestions d-none" role="listbox" aria-label="Search suggestions"></div>
          </div>
        </div>
      </div>

      <div id="categoryButtons" class="d-flex flex-wrap gap-2 justify-content-center mt-3"></div>
    </section>

    <!-- No results -->
    <section class="container reveal">
      <div id="noResults" class="alert alert-warning d-none">No results found. Try a different keyword.</div>
    </section>

    <!-- Menu -->
    <section id="menu" class="container my-5">
      <div id="menuSections" data-reveal-stagger="true"></div>
    </section>

    <!-- Why Choose Us -->
    <section class="container my-5">
      <div class="section-head reveal">
        <span class="section-kicker">Why Choose Us</span>
        <h2>Delicious food, delivered the smart way.</h2>
        <p class="text-muted">We focus on quality, speed, and a seamless experience from menu to doorstep.</p>
      </div>
      <div class="row g-4 mt-2" data-reveal-stagger="true">
        <div class="col-md-4">
          <div class="info-card reveal">
            <h5>Fresh ingredients</h5>
            <p class="text-muted">Handpicked kitchens and chefs use fresh, high-quality ingredients every day.</p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="info-card reveal">
            <h5>Fast delivery</h5>
            <p class="text-muted">Smart routing gets your order to you quickly, hot, and on time.</p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="info-card reveal">
            <h5>Trusted service</h5>
            <p class="text-muted">Transparent pricing and responsive support make every order worry-free.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Customer Reviews -->
    <section class="container my-5">
      <div class="section-head reveal">
        <span class="section-kicker">Customer Reviews</span>
        <h2>Loved by food lovers across the city.</h2>
        <p class="text-muted">Real feedback from customers who order from FoodOrder every week.</p>
      </div>
      <div class="row g-4 mt-2" data-reveal-stagger="true">
        <div class="col-md-4">
          <div class="review-card reveal">
            <div class="review-top">
              <div>
                <h6 class="mb-1">Nusrat Jahan</h6>
                <span class="text-muted">Dhanmondi</span>
              </div>
              <div class="review-stars">★★★★★</div>
            </div>
            <p class="text-muted">“The food always arrives hot and perfectly packed. The menu variety is amazing.”</p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="review-card reveal">
            <div class="review-top">
              <div>
                <h6 class="mb-1">Arif Ahmed</h6>
                <span class="text-muted">Gulshan</span>
              </div>
              <div class="review-stars">★★★★★</div>
            </div>
            <p class="text-muted">“Fast delivery and friendly support. FoodOrder is my go-to for dinner.”</p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="review-card reveal">
            <div class="review-top">
              <div>
                <h6 class="mb-1">Sadia Rahman</h6>
                <span class="text-muted">Banani</span>
              </div>
              <div class="review-stars">★★★★☆</div>
            </div>
            <p class="text-muted">“Great taste and consistent quality. The order flow is smooth and easy.”</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Visitor Insights -->
    <section class="container my-5">
      <div class="section-head reveal">
        <span class="section-kicker">Visitor Insights</span>
        <h2>Where visitors are coming from.</h2>
        <p class="text-muted">Recent visits captured by IP-based location lookup.</p>
      </div>
      <div id="visitorPanel" class="visitor-panel reveal">
        <div class="visitor-empty">Loading visitor data...</div>
      </div>
    </section>
  `;

  // build page content
  renderHeroSlider();
  renderMenuSections(cat);
  setupSearchFilterWithURL();
  setupCategoryButtonsWithURL();
  loadVisitorInsights();

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
    <div class="container my-5 product-page">
      <a href="#/home" class="text-decoration-none product-back reveal">
        <span class="product-back-icon">&larr;</span> Back to Home
      </a>

      <div class="row g-4 align-items-center mt-3 product-hero">
        <div class="col-12 col-lg-6">
          <div class="product-media reveal">
            <img src="${p.image}" alt="${escapeHtml(p.name)}" class="img-fluid product-image">
          </div>
        </div>

        <div class="col-12 col-lg-6">
          <div class="product-info reveal" data-reveal-delay="120">
            <span class="product-meta">${escapeHtml(p.category)}</span>
            <h1 class="product-title">${escapeHtml(p.name)}</h1>
            <div class="product-price-row">
              <div class="product-price">${formatMoney(p.price)}</div>
              <div class="product-actions inline-actions">
                <div class="qty-picker" data-qty="1">
                  <button class="qty-btn qty-minus" type="button" aria-label="Decrease quantity">−</button>
                  <span class="qty-value" data-qty-value>1</span>
                  <button class="qty-btn qty-plus" type="button" aria-label="Increase quantity">+</button>
                </div>
                <div class="product-buttons">
                  <button class="btn btn-outline-secondary add-cart" data-id="${p.id}">Add to Cart</button>
                  <a class="btn btn-danger order-now" href="#/order" data-id="${p.id}">Order Now</a>
                </div>
              </div>
            </div>
            <p class="product-desc">${escapeHtml(p.raw?.strInstructions || p.description)}</p>
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
    <main class="container my-5 order-page">
      <div class="order-title reveal">
        <h1>Order Details</h1>
        <p class="text-muted">Review your items and confirm your delivery.</p>
      </div>

      <div class="row g-4 align-items-start">
        <div class="col-lg-8">
          <div class="card order-card reveal">
            <div class="card-header fw-bold">Order Summary</div>
            <div class="card-body">
              <div id="orderItems" class="d-flex flex-column gap-3"></div>
              <p id="emptyMsg" class="text-muted mb-0 d-none">Your cart is empty. Add items from Home.</p>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card order-card pricing-card reveal" data-reveal-delay="120">
            <div class="card-header fw-bold">Pricing</div>
            <div class="card-body">
              <div class="d-flex justify-content-between price-row"><span>Subtotal</span><span id="subtotal">$0.00</span></div>
              <div class="d-flex justify-content-between price-row"><span>Delivery</span><span id="delivery">$0.00</span></div>
              <div class="d-flex justify-content-between price-row"><span>Tax</span><span id="tax">$0.00</span></div>

              <hr>

              <div class="d-flex justify-content-between fw-bold fs-5 total-row"><span>Total</span><span id="total">$0.00</span></div>

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

function renderAboutView() {
  const app = document.getElementById("app");
  if (!app) return;

  document.title = "About Us";

  app.innerHTML = `
    <section class="container my-5 page-layout">
      <div class="page-hero reveal">
        <div>
          <span class="page-kicker">About FoodOrder</span>
          <h1>Crafted meals, delivered with care.</h1>
          <p class="text-muted">We partner with trusted kitchens to bring you a curated menu, fast delivery, and a delightful ordering experience.</p>
        </div>
        <div class="page-hero-card">
          <div>
            <span class="stat-label">Meals served</span>
            <span class="stat-value">12K+</span>
          </div>
          <div>
            <span class="stat-label">Avg delivery</span>
            <span class="stat-value">32 min</span>
          </div>
          <div>
            <span class="stat-label">Top rated</span>
            <span class="stat-value">4.8/5</span>
          </div>
        </div>
      </div>

      <div class="row g-4 mt-4">
        <div class="col-lg-4">
          <div class="info-card reveal">
            <h5>Our mission</h5>
            <p class="text-muted">Make ordering food feel effortless, premium, and reliable in every neighborhood we serve.</p>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="info-card reveal" data-reveal-delay="80">
            <h5>Fresh partners</h5>
            <p class="text-muted">We work only with kitchens that meet our quality and hygiene benchmarks.</p>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="info-card reveal" data-reveal-delay="140">
            <h5>Real-time care</h5>
            <p class="text-muted">From order to doorstep, we track every delivery for a smooth experience.</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderContactView() {
  const app = document.getElementById("app");
  if (!app) return;

  document.title = "Contact Us";

  app.innerHTML = `
    <section class="container my-5 page-layout">
      <div class="page-hero reveal">
        <div>
          <span class="page-kicker">Contact</span>
          <h1>We’re here to help.</h1>
          <p class="text-muted">Questions, feedback, or partnership ideas? Send us a message and we’ll get back quickly.</p>
        </div>
        <div class="page-hero-card">
          <div>
            <span class="stat-label">Support</span>
            <span class="stat-value">24/7</span>
          </div>
          <div>
            <span class="stat-label">Email</span>
            <span class="stat-value">roynirjon18@gmail.com</span>
          </div>
        </div>
      </div>

      <div class="row g-4 mt-4">
        <div class="col-lg-5">
          <div class="info-card reveal">
            <h5>Contact details</h5>
            <ul class="info-list">
              <li><span>Phone</span><strong>+880 1774-865115</strong></li>
              <li><span>Email</span><strong>roynirjon18@gmail.com</strong></li>
              <li><span>Address</span><strong>Dhanmondi 6A, Dhaka</strong></li>
              <li><span>Hours</span><strong>10:00 AM - 11:00 PM</strong></li>
            </ul>
            <div class="social-links mt-3">
              <a class="social-link" href="https://www.facebook.com/EngineerNirjonRoy" target="_blank" rel="noopener">Facebook</a>
              <a class="social-link" href="https://www.linkedin.com/in/softdev-nirjon-roy/" target="_blank" rel="noopener">LinkedIn</a>
              <a class="social-link" href="https://www.instagram.com/engineer_nirjon/" target="_blank" rel="noopener">Instagram</a>
            </div>
          </div>
        </div>
        <div class="col-lg-7">
          <div class="info-card reveal" data-reveal-delay="120">
            <h5>Send a message</h5>
            <form class="contact-form js-form" data-form="contact">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Full name</label>
                  <input class="form-control" type="text" placeholder="Your name">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Email</label>
                  <input class="form-control" type="email" placeholder="you@email.com">
                </div>
                <div class="col-12">
                  <label class="form-label">Message</label>
                  <textarea class="form-control" rows="4" placeholder="Write your message..."></textarea>
                </div>
                <div class="col-12">
                  <button type="submit" class="btn btn-danger">Send message</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `;

  setupFormAlerts();
}

function renderBookView() {
  const app = document.getElementById("app");
  if (!app) return;

  document.title = "Book a Table";

  app.innerHTML = `
    <section class="container my-5 page-layout">
      <div class="page-hero reveal">
        <div>
          <span class="page-kicker">Book a table</span>
          <h1>Reserve your seat in minutes.</h1>
          <p class="text-muted">Perfect for celebrations, group dinners, or a quick catch-up. Pick a time and we’ll confirm.</p>
        </div>
        <div class="page-hero-card">
          <div>
            <span class="stat-label">Reservations</span>
            <span class="stat-value">Instant</span>
          </div>
          <div>
            <span class="stat-label">Tables</span>
            <span class="stat-value">2-12</span>
          </div>
        </div>
      </div>

      <div class="row g-4 mt-4">
        <div class="col-lg-7">
          <div class="info-card reveal">
            <h5>Reservation details</h5>
            <form class="book-form js-form" data-form="book">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Full name</label>
                  <input class="form-control" type="text" placeholder="Your name">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Phone</label>
                  <input class="form-control" type="tel" placeholder="+880 1XXX-XXXXXX">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Date</label>
                  <input class="form-control" type="date">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Time</label>
                  <input class="form-control" type="time">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Guests</label>
                  <select class="form-select">
                    <option>2 guests</option>
                    <option>4 guests</option>
                    <option>6 guests</option>
                    <option>8 guests</option>
                    <option>10 guests</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Occasion</label>
                  <select class="form-select">
                    <option>Casual</option>
                    <option>Birthday</option>
                    <option>Anniversary</option>
                    <option>Business</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label">Notes</label>
                  <textarea class="form-control" rows="3" placeholder="Any requests or notes..."></textarea>
                </div>
                <div class="col-12">
                  <button type="submit" class="btn btn-danger">Confirm booking</button>
                </div>
              </div>
            </form>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="info-card reveal" data-reveal-delay="120">
            <h5>Need help?</h5>
            <p class="text-muted">For large group bookings or special events, contact our hospitality team.</p>
            <ul class="info-list">
              <li><span>Hotline</span><strong>+880 1774-865115</strong></li>
              <li><span>Email</span><strong>roynirjon18@gmail.com</strong></li>
              <li><span>Location</span><strong>Dhanmondi 6A, Dhaka</strong></li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  `;

  setupFormAlerts();
}

function setupFormAlerts() {
  const forms = document.querySelectorAll(".js-form");
  if (!forms.length) return;

  forms.forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const kind = form.dataset.form || "contact";
      const title = kind === "book" ? "Booking submitted!" : "Message sent!";
      const text =
        kind === "book"
          ? "Thanks for your reservation. We will confirm the table shortly."
          : "Thanks for reaching out. We will get back to you soon.";

      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "success",
          title,
          text,
          confirmButtonText: "OK",
        });
      } else {
        alert(`${title}\n${text}`);
      }

      form.reset();
    });
  });
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
      `<button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="${idx}" class="${idx === 0 ? "active" : ""}" aria-label="Slide ${idx + 1}"></button>`
    )
    .join("");

  inner.innerHTML = slides
    .map((p, idx) => `
      <div class="carousel-item ${idx === 0 ? "active" : ""}">
        <div class="hero-media">
          <img src="${p.image}" class="d-block w-100 hero-image" alt="${escapeHtml(p.name)}">
          <div class="hero-gradient"></div>
        </div>
        <div class="carousel-caption hero-caption d-none d-md-block text-start">
          <span class="hero-tag">Chef's pick</span>
          <h3 class="fw-bold mb-2">${escapeHtml(p.name)}</h3>
          <p class="hero-meta mb-3">${escapeHtml(p.category)} • ${formatMoney(p.price)}</p>
          <a class="btn btn-light btn-sm hero-cta-btn" href="#/product?id=${encodeURIComponent(p.id)}">View details</a>
        </div>
      </div>
    `)
    .join("");
}

function renderMenuSections(activeCatId) {
  const sectionsWrap = document.getElementById("menuSections");
  if (!sectionsWrap) return;

  const categoryCounts = PRODUCTS.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const categories = Object.keys(categoryCounts).sort((a, b) => {
    const diff = categoryCounts[b] - categoryCounts[a];
    if (diff !== 0) return diff;
    return a.localeCompare(b);
  });
  const topCategories = categories.slice(0, 8);

  sectionsWrap.innerHTML = topCategories
    .map((cat) => {
      const secId = `cat-${slugify(cat)}`;
      const items = PRODUCTS.filter((p) => p.category === cat);

      const cards = items.map(productCard).join("");
      return `
        <h2 class="mb-3 reveal" id="${secId}">${escapeHtml(cat)}</h2>
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
    <div class="col-12 col-sm-6 col-lg-3 food-item reveal" data-name="${escapeHtml(p.name)}">
      <div class="card h-100">
        <a href="#/product?id=${encodeURIComponent(p.id)}" class="text-decoration-none text-dark">
          <img src="${p.image}" class="card-img-top" alt="${escapeHtml(p.name)}">
        </a>

        <div class="card-body d-flex flex-column">
          <a href="#/product?id=${encodeURIComponent(p.id)}" class="text-decoration-none text-dark">
            <h5 class="card-title">${escapeHtml(p.name)}</h5>
            <p class="card-text small text-muted">${escapeHtml(p.description)}</p>
          </a>

          <div class="card-meta-row">
            <span class="card-price">${formatMoney(p.price)}</span>
            <div class="qty-picker" data-qty="1">
              <button class="qty-btn qty-minus" type="button" aria-label="Decrease quantity">−</button>
              <span class="qty-value" data-qty-value>1</span>
              <button class="qty-btn qty-plus" type="button" aria-label="Increase quantity">+</button>
            </div>
          </div>

          <div class="mt-auto card-actions">
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
  const suggestions = document.getElementById("searchSuggestions");

  function updateSuggestions(query) {
    if (!suggestions) return;
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      suggestions.innerHTML = "";
      suggestions.classList.add("d-none");
      return;
    }

    const matches = PRODUCTS.filter((p) => p.name.toLowerCase().includes(trimmed)).slice(0, 6);

    if (!matches.length) {
      suggestions.innerHTML = `<div class="suggestion-empty">No matches found</div>`;
      suggestions.classList.remove("d-none");
      return;
    }

    suggestions.innerHTML = matches
      .map(
        (p) => `
        <button type="button" class="suggestion-item" data-id="${p.id}">
          <img src="${p.image}" alt="" class="suggestion-thumb">
          <span class="suggestion-meta">
            <span class="suggestion-title">${escapeHtml(p.name)}</span>
            <span class="suggestion-sub">${escapeHtml(p.category)} • ${formatMoney(p.price)}</span>
          </span>
        </button>
      `
      )
      .join("");
    suggestions.classList.remove("d-none");
  }

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
    updateSuggestions(query);
  }

  input.addEventListener("input", apply);
  input.addEventListener("focus", () => updateSuggestions(input.value));
  input.addEventListener("blur", () => {
    if (!suggestions) return;
    setTimeout(() => suggestions.classList.add("d-none"), 150);
  });

  suggestions?.addEventListener("click", (e) => {
    const item = e.target.closest(".suggestion-item");
    if (!item) return;
    const p = PRODUCTS_MAP[item.dataset.id];
    if (!p) return;
    input.value = p.name;
    apply();
    input.focus();
    suggestions.classList.add("d-none");
  });

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
        <div class="order-item">
          <div class="order-item-main">
            <img src="${item.img}" alt="${escapeHtml(item.name)}" class="order-item-img">
            <div>
              <h6 class="mb-1">${escapeHtml(item.name)}</h6>
              <div class="text-muted small">Price: ${formatMoney(item.price)}</div>
              <div class="small fw-semibold mt-1">Item Total: ${formatMoney(item.price * item.qty)}</div>
            </div>
          </div>

          <div class="order-item-actions">
            <div class="qty-stepper">
              <button class="btn btn-outline-secondary btn-sm qty-minus" data-id="${item.id}">−</button>
              <span>${item.qty}</span>
              <button class="btn btn-outline-secondary btn-sm qty-plus" data-id="${item.id}">+</button>
            </div>

            <button class="btn btn-outline-danger btn-sm remove-item" data-id="${item.id}">Remove</button>
          </div>
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
  const qtyMinus = e.target.closest(".qty-picker .qty-minus");
  const qtyPlus = e.target.closest(".qty-picker .qty-plus");
  if (qtyMinus || qtyPlus) {
    const picker = (qtyMinus || qtyPlus).closest(".qty-picker");
    adjustPickerQty(picker, qtyPlus ? 1 : -1);
    return;
  }

  const addBtn = e.target.closest(".add-cart");
  // Order Now (product page)
  const orderNowBtn = e.target.closest(".order-now");
  if (orderNowBtn) {
    const id = orderNowBtn.dataset.id;
    const p = PRODUCTS_MAP[id];
    if (!p) return;
    const qty = getQtyFromPicker(findQtyPicker(orderNowBtn));

    addToCart(
      {
        id: p.id,
        name: p.name,
        price: p.price,
        img: p.image,
      },
      qty
    );

    // navigation already happens via href="#/order"
    return;
  }


  if (addBtn) {
    const id = addBtn.dataset.id;
    const p = PRODUCTS_MAP[id];
    if (!p) return;

    const qty = getQtyFromPicker(findQtyPicker(addBtn));
    addToCart({ id: p.id, name: p.name, price: p.price, img: p.image }, qty);
    toastSuccess(qty > 1 ? `Added ${qty} items` : "Added to cart");
    return;
  }

  const buyBtn = e.target.closest(".buy-now");
  if (buyBtn) {
    const id = buyBtn.dataset.id;
    const p = PRODUCTS_MAP[id];
    if (!p) return;

    const qty = getQtyFromPicker(findQtyPicker(buyBtn));
    addToCart({ id: p.id, name: p.name, price: p.price, img: p.image }, qty);
    // navigation happens via link (#/order)
  }
});

// =====================================================
// Render App
// =====================================================
function renderApp() {
  setCartCountBadge();

  const { route, params } = parseHash();
  setActiveNav(route, params);

  if (route === "order") {
    renderOrderView();
    initAnimations();
    return;
  }

  if (route === "product") {
    renderProductView(params);
    initAnimations();
    return;
  }

  if (route === "about") {
    renderAboutView();
    initAnimations();
    return;
  }

  if (route === "contact") {
    renderContactView();
    initAnimations();
    return;
  }

  if (route === "book") {
    renderBookView();
    initAnimations();
    return;
  }

  // default
  renderHomeView(params);
  initAnimations();
}

// Init
initTheme();

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("page-ready");
  loadProductsFromEmbeddedData();
  logVisit();

  if (!window.location.hash) {
    window.location.hash = "#/home";
  }

  renderApp();
  window.addEventListener("hashchange", renderApp);
});

window.addEventListener("load", () => {
  hidePageLoader();
});
