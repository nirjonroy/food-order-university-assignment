// =========================
//  Data (Products)
// =========================
const PRODUCTS = [
  { id: "pizza-1", name: "Cheese Pizza", price: 8.99, img: "assets/images/pizza.jpg", desc: "Cheesy, crispy and delicious.", category: "Pizza", section: "pizzaSection" },
  { id: "pizza-2", name: "Pepperoni Pizza", price: 10.50, img: "assets/images/pizza2.jpg", desc: "Spicy pepperoni with melted cheese.", category: "Pizza", section: "pizzaSection" },

  { id: "burger-1", name: "Beef Burger", price: 6.50, img: "assets/images/burger.jpg", desc: "Juicy burger with fresh toppings.", category: "Burger", section: "burgerSection" },
  { id: "burger-2", name: "Chicken Burger", price: 5.75, img: "assets/images/burger2.jpg", desc: "Crispy chicken with soft bun.", category: "Burger", section: "burgerSection" },

  { id: "drink-1", name: "Cold Coffee", price: 3.20, img: "assets/images/drink1.jpg", desc: "Chilled coffee with ice.", category: "Drinks", section: "drinksSection" },

  { id: "dessert-1", name: "Chocolate Cake", price: 4.10, img: "assets/images/dessert1.jpg", desc: "Rich chocolate slice.", category: "Dessert", section: "dessertSection" },

  { id: "biriyani-1", name: "Chicken Biriyani", price: 9.25, img: "assets/images/biriyani.jpg", desc: "Aromatic rice with spicy chicken.", category: "Biriyani", section: "biriyaniSection" },
];

// =========================
//  Cart (localStorage)
// =========================
const CART_KEY = "cart";

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
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

function addToCart(prod) {
  const cart = getCart();
  const found = cart.find((x) => x.id === prod.id);

  if (found) found.qty += 1;
  else cart.push({ id: prod.id, name: prod.name, price: prod.price, img: prod.img, qty: 1 });

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
  const it = cart.find((x) => x.id === id);
  if (!it) return cart;

  it.qty = Math.max(1, qty);
  saveCart(cart);
  setCartCountBadge();
  return cart;
}

function clearCart() {
  saveCart([]);
  setCartCountBadge();
  return [];
}

function formatMoney(n) {
  return `$${Number(n).toFixed(2)}`;
}

// =========================
//  SweetAlert
// =========================
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

// =========================
//  Router (hash)
//  Routes:
//   #/home?q=...&cat=...
//   #/product/<id>
//   #/order
//   #/about
//   #/contact
// =========================
function parseRoute() {
  const hash = window.location.hash || "#/home";
  const [path, queryString] = hash.split("?");
  const parts = path.replace("#", "").split("/").filter(Boolean);

  const route = parts[0] || "home";
  const param = parts[1] || null;
  const params = new URLSearchParams(queryString || "");

  return { route, param, params };
}

function setHash(route, paramsObj = {}) {
  const params = new URLSearchParams();
  Object.entries(paramsObj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) params.set(k, v);
  });
  const qs = params.toString();
  window.location.hash = qs ? `#/${route}?${qs}` : `#/${route}`;
}

function setActiveNav(route) {
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.remove("active"));

  if (route === "order") document.querySelector('[data-nav="order"]')?.classList.add("active");
  else if (route === "about") document.querySelector('[data-nav="about"]')?.classList.add("active");
  else if (route === "contact") document.querySelector('[data-nav="contact"]')?.classList.add("active");
  else document.querySelector('[data-nav="home"]')?.classList.add("active");
}

// =========================
//  Views
// =========================
function productCard(p) {
  return `
    <div class="col-12 col-sm-6 col-lg-3 food-item" data-name="${escapeHtml(p.name)}">
      <div class="card h-100">
        <a href="#/product/${p.id}" class="text-decoration-none text-dark">
          <img src="${p.img}" class="card-img-top" alt="${escapeHtml(p.name)}">
        </a>

        <div class="card-body d-flex flex-column">
          <a href="#/product/${p.id}" class="text-decoration-none text-dark">
            <h5 class="card-title">${escapeHtml(p.name)}</h5>
            <p class="card-text small text-muted">${escapeHtml(p.desc)}</p>
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

function renderCategory(title, sectionId) {
  const items = PRODUCTS.filter((p) => p.section === sectionId).map(productCard).join("");
  return `
    <h2 class="mb-3" id="${sectionId}">${escapeHtml(title)}</h2>
    <div class="row g-4 mb-5">${items}</div>
  `;
}

function renderHome(params) {
  const q = (params.get("q") || "").trim();
  const cat = params.get("cat") || "";

  const app = document.getElementById("app");
  document.title = "FoodOrder SPA";

  app.innerHTML = `
    <!-- Hero Carousel -->
    <section class="container my-4">
      <div id="heroCarousel" class="carousel slide rounded overflow-hidden" data-bs-ride="carousel">
        <div class="carousel-indicators">
          <button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="0" class="active"></button>
          <button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="1"></button>
          <button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="2"></button>
        </div>

        <div class="carousel-inner">
          <div class="carousel-item active">
            <img src="assets/images/slider1.jpg" class="d-block w-100" alt="Hot Deals"
              style="height:320px; object-fit:cover;">
            <div class="carousel-caption d-none d-md-block">
              <h3 class="fw-bold">Hot Deals Today</h3>
              <p>Save up to 30% on selected items</p>
            </div>
          </div>

          <div class="carousel-item">
            <img src="assets/images/slider2.jpg" class="d-block w-100" alt="Free Delivery"
              style="height:320px; object-fit:cover;">
            <div class="carousel-caption d-none d-md-block">
              <h3 class="fw-bold">Free Delivery</h3>
              <p>On orders above $15</p>
            </div>
          </div>

          
        </div>

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
            placeholder="Search for food or restaurant" value="${escapeHtml(q)}" />
        </div>
      </div>

      <div class="d-flex flex-wrap gap-2 justify-content-center mt-3">
        <button class="btn btn-outline-danger category-btn" data-section="pizzaSection">Pizza</button>
        <button class="btn btn-outline-danger category-btn" data-section="burgerSection">Burger</button>
        <button class="btn btn-outline-danger category-btn" data-section="drinksSection">Drinks</button>
        <button class="btn btn-outline-danger category-btn" data-section="dessertSection">Dessert</button>
      </div>
    </section>

    <!-- No Results -->
    <section class="container">
      <div id="noResults" class="alert alert-warning d-none" role="alert">
        No results found. Try a different keyword.
      </div>
    </section>

    <!-- Menu -->
    <section id="menu" class="container my-5">
      ${renderCategory("Pizza", "pizzaSection")}
      ${renderCategory("Burger", "burgerSection")}
      ${renderCategory("Drinks", "drinksSection")}
      ${renderCategory("Dessert", "dessertSection")}
      ${renderCategory("Biriyani", "biriyaniSection")}
    </section>
  `;

  setupSearchFilter();
  setupCategoryScroll();

  // restore cat selection + scroll
  if (cat) {
    const btn = document.querySelector(`.category-btn[data-section="${cat}"]`);
    if (btn) setActiveCategoryButton(btn);
    document.getElementById(cat)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderProduct(productId) {
  const app = document.getElementById("app");
  const p = PRODUCTS.find((x) => x.id === productId);

  if (!p) {
    document.title = "Product Not Found";
    app.innerHTML = `
      <div class="container my-5">
        <div class="alert alert-danger">Product not found.</div>
        <a href="#/home" class="btn btn-danger">Back to Home</a>
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
          <img src="${p.img}" alt="${escapeHtml(p.name)}" class="img-fluid rounded border"
            style="width:100%; max-height:420px; object-fit:cover;">
        </div>

        <div class="col-12 col-md-6">
          <h1 class="mb-2">${escapeHtml(p.name)}</h1>
          <div class="text-muted mb-2">${escapeHtml(p.category)}</div>
          <div class="fs-3 fw-bold text-danger mb-3">${formatMoney(p.price)}</div>
          <p class="text-muted">${escapeHtml(p.desc)}</p>

          <div class="d-flex gap-2 mt-4">
            <button class="btn btn-outline-secondary add-cart" data-id="${p.id}">Add to Cart</button>
            <a class="btn btn-danger buy-now" href="#/order" data-id="${p.id}">Buy Now</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderOrder() {
  const app = document.getElementById("app");
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
              <p id="emptyMsg" class="text-muted mb-0 d-none">Your cart is empty. Add some food from Home.</p>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card">
            <div class="card-header fw-bold">Pricing</div>
            <div class="card-body">
              <div class="d-flex justify-content-between">
                <span>Subtotal</span><span id="subtotal">$0.00</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>Delivery</span><span id="delivery">$0.00</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>Tax</span><span id="tax">$0.00</span>
              </div>

              <hr>

              <div class="d-flex justify-content-between fw-bold fs-5">
                <span>Total</span><span id="total">$0.00</span>
              </div>

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

function renderAbout() {
  const app = document.getElementById("app");
  document.title = "About";

  app.innerHTML = `
    <div class="container my-5">
      <h1 class="mb-3">About FoodOrder</h1>
      <p class="text-muted">
        FoodOrder is a simple food ordering UI that helps users discover items, add to cart,
        and place an order quickly.
      </p>

      <div class="row g-4 mt-3">
        <div class="col-md-4">
          <div class="card h-100">
            <div class="card-body">
              <h5 class="card-title">Fast Ordering</h5>
              <p class="card-text text-muted">Add items to cart and adjust quantity easily.</p>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card h-100">
            <div class="card-body">
              <h5 class="card-title">Category Based</h5>
              <p class="card-text text-muted">Explore food by category with smooth navigation.</p>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card h-100">
            <div class="card-body">
              <h5 class="card-title">Clean UI</h5>
              <p class="card-text text-muted">Built using Bootstrap for a responsive design.</p>
            </div>
          </div>
        </div>
      </div>

      <a href="#/home" class="btn btn-danger mt-4">Back to Home</a>
    </div>
  `;
}

function renderContact() {
  const app = document.getElementById("app");
  document.title = "Contact";

  app.innerHTML = `
    <div class="container my-5" style="max-width: 720px;">
      <h1 class="mb-3">Contact Us</h1>
      <p class="text-muted">Send us a message and we’ll get back to you.</p>

      <div class="card">
        <div class="card-body">
          <form id="contactForm" class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Name</label>
              <input type="text" class="form-control" id="cName" required>
            </div>
            <div class="col-md-6">
              <label class="form-label">Email</label>
              <input type="email" class="form-control" id="cEmail" required>
            </div>
            <div class="col-12">
              <label class="form-label">Message</label>
              <textarea class="form-control" id="cMsg" rows="4" required></textarea>
            </div>

            <div class="col-12 d-flex gap-2">
              <button class="btn btn-danger" type="submit">Send Message</button>
              <a class="btn btn-outline-secondary" href="#/home">Back to Home</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById("contactForm").addEventListener("submit", (e) => {
    e.preventDefault();

    Swal.fire({
      icon: "success",
      title: "Message sent!",
      text: "Thanks — we’ll reply soon.",
      confirmButtonText: "OK",
    });

    e.target.reset();
  });
}

// =========================
//  Home helpers: Search + URL + No results
// =========================
function setupSearchFilter() {
  const input = document.getElementById("searchInput");
  if (!input) return;

  const items = Array.from(document.querySelectorAll(".food-item"));
  const noResults = document.getElementById("noResults");

  function apply() {
    const q = input.value.trim().toLowerCase();

    // persist q in URL
    const { params } = parseRoute();
    const newParams = new URLSearchParams(params.toString());
    if (!q) newParams.delete("q");
    else newParams.set("q", q);

    // keep cat if exists
    const cat = newParams.get("cat") || "";
    window.location.hash = `#/home?${newParams.toString()}`;

    let visible = 0;
    items.forEach((card) => {
      const name = (card.dataset.name || "").toLowerCase();
      const text = card.textContent.toLowerCase();
      const match = !q || name.includes(q) || text.includes(q);
      card.style.display = match ? "" : "none";
      if (match) visible += 1;
    });

    if (noResults) noResults.classList.toggle("d-none", visible !== 0);

    // keep active button as-is; no changes here
    if (cat) {
      // do nothing
    }
  }

  input.addEventListener("input", apply);
  apply(); // run once
}

// =========================
//  Home helpers: Category scroll + active + URL persist
// =========================
function setActiveCategoryButton(btn) {
  document.querySelectorAll(".category-btn").forEach((b) => {
    b.classList.remove("btn-danger");
    b.classList.add("btn-outline-danger");
  });

  if (btn) {
    btn.classList.remove("btn-outline-danger");
    btn.classList.add("btn-danger");
  }
}

function setupCategoryScroll() {
  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sectionId = btn.dataset.section;
      if (!sectionId) return;

      setActiveCategoryButton(btn);

      const { params } = parseRoute();
      const newParams = new URLSearchParams(params.toString());
      newParams.set("cat", sectionId);

      // keep q if exists
      window.location.hash = `#/home?${newParams.toString()}`;

      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// =========================
//  Order page logic
// =========================
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
      setHash("home");
    });
  });
}

// =========================
//  Global click handler: Add/Buy (works in all views)
// =========================
document.addEventListener("click", (e) => {
  const addBtn = e.target.closest(".add-cart");
  if (addBtn) {
    const id = addBtn.dataset.id;
    const p = PRODUCTS.find((x) => x.id === id);
    if (p) {
      addToCart(p);
      toastSuccess("Added to cart");
    }
    return;
  }

  const buyBtn = e.target.closest(".buy-now");
  if (buyBtn) {
    const id = buyBtn.dataset.id;
    const p = PRODUCTS.find((x) => x.id === id);
    if (p) addToCart(p);
    // Link navigates to order view
  }
});

// =========================
//  Render App
// =========================
function renderApp() {
  const { route, param, params } = parseRoute();
  setActiveNav(route);
  setCartCountBadge();

  if (route === "product") {
    renderProduct(param);
    return;
  }

  if (route === "order") {
    renderOrder();
    return;
  }

  if (route === "about") {
    renderAbout();
    return;
  }

  if (route === "contact") {
    renderContact();
    return;
  }

  // default home
  renderHome(params);
}

// =========================
//  Utils
// =========================
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Init
window.addEventListener("hashchange", renderApp);
document.addEventListener("DOMContentLoaded", () => {
  if (!window.location.hash) window.location.hash = "#/home";
  renderApp();
});
