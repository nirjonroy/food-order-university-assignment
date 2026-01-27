// =========================
//  Cart (localStorage)
// =========================
const CART_KEY = "cart";
const PRODUCTS_KEY = "products_seeded_v1"; // just to seed once

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

function addToCart(item) {
  const cart = getCart();
  const found = cart.find((x) => x.id === item.id);
  if (found) found.qty += 1;
  else cart.push({ ...item, qty: 1 });
  saveCart(cart);
  setCartCountBadge();
  return cart;
}

function removeFromCart(id) {
  const cart = getCart().filter((x) => x.id !== id);
  saveCart(cart);
  setCartCountBadge();
  return cart;
}

function updateQty(id, newQty) {
  const cart = getCart();
  const found = cart.find((x) => x.id === id);
  if (!found) return cart;
  found.qty = Math.max(1, newQty);
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
//  URL helpers (persist q)
// =========================
function getUrlParams() {
  const url = new URL(window.location.href);
  return url.searchParams;
}

function setUrlParam(key, value) {
  const url = new URL(window.location.href);
  if (!value) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  history.replaceState({}, "", url.toString());
}

// =========================
//  Product Data (seed from cards on first load)
// =========================
function seedProductsFromHomePage() {
  // Only seed if we're on index and not seeded before
  const items = document.querySelectorAll(".add-cart[data-id]");
  if (!items.length) return;

  if (localStorage.getItem(PRODUCTS_KEY) === "1") return;

  const map = {};
  items.forEach((btn) => {
    const id = btn.dataset.id;
    map[id] = {
      id,
      name: btn.dataset.name,
      price: Number(btn.dataset.price),
      img: btn.dataset.img,
      desc: btn.dataset.desc || "",
      category: btn.dataset.category || "",
    };
  });

  localStorage.setItem("products", JSON.stringify(map));
  localStorage.setItem(PRODUCTS_KEY, "1");
}

function getProductsMap() {
  try { return JSON.parse(localStorage.getItem("products")) || {}; }
  catch { return {}; }
}

// =========================
//  Active category button UI
// =========================
function setActiveCategoryButton(btn) {
  const all = document.querySelectorAll(".category-btn");
  all.forEach((b) => {
    b.classList.remove("btn-danger");
    b.classList.add("btn-outline-danger");
  });

  if (btn) {
    btn.classList.remove("btn-outline-danger");
    btn.classList.add("btn-danger");
  }
}

// =========================
//  Search filter (typing hides non-matching cards)
//  + No results message
//  + Persist query in URL (?q=...)
// =========================
function setupSearchFilter() {
  const input = document.getElementById("searchInput");
  if (!input) return; // not on index.html

  const noResults = document.getElementById("noResults");
  const items = Array.from(document.querySelectorAll(".food-item"));

  // Restore q from URL
  const qFromUrl = getUrlParams().get("q") || "";
  input.value = qFromUrl;

  function applyFilter() {
    const q = input.value.trim().toLowerCase();
    setUrlParam("q", q); // persist in URL

    let visibleCount = 0;

    items.forEach((card) => {
      const name = (card.dataset.name || "").toLowerCase();
      const text = card.textContent.toLowerCase();
      const match = !q || name.includes(q) || text.includes(q);
      card.style.display = match ? "" : "none";
      if (match) visibleCount += 1;
    });

    if (noResults) {
      noResults.classList.toggle("d-none", visibleCount !== 0);
    }
  }

  input.addEventListener("input", applyFilter);
  applyFilter(); // run once on load
}

// =========================
//  Category scroll + active button
// =========================
function setupCategoryScroll() {
  const btns = document.querySelectorAll(".category-btn");
  if (!btns.length) return;

  // Optional: restore category selection from URL (?cat=#pizzaSection)
  const cat = getUrlParams().get("cat");
  if (cat) {
    const targetBtn = Array.from(btns).find((b) => b.dataset.target === cat);
    if (targetBtn) {
      setActiveCategoryButton(targetBtn);
      const el = document.querySelector(cat);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveCategoryButton(btn);

      const target = btn.dataset.target;
      if (!target) return;

      setUrlParam("cat", target); // persist selected category
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// =========================
//  Click: Add to cart / Buy now (home + product page)
// =========================
document.addEventListener("click", (e) => {
  const addBtn = e.target.closest(".add-cart");
  if (addBtn) {
    const item = {
      id: addBtn.dataset.id,
      name: addBtn.dataset.name,
      price: Number(addBtn.dataset.price),
      img: addBtn.dataset.img,
    };
    addToCart(item);
    toastSuccess("Added to cart");
    return;
  }

  const buyBtn = e.target.closest(".buy-now");
  if (buyBtn) {
    const item = {
      id: buyBtn.dataset.id,
      name: buyBtn.dataset.name,
      price: Number(buyBtn.dataset.price),
      img: buyBtn.dataset.img,
    };
    addToCart(item);
    // let link navigate to order.html
  }
});

// =========================
//  Product page render (product.html?id=...)
// =========================
function renderProductPage() {
  const wrap = document.getElementById("productWrap");
  if (!wrap) return; // not product.html

  const id = getUrlParams().get("id");
  if (!id) {
    wrap.innerHTML = `<div class="col-12"><div class="alert alert-danger">No product id found.</div></div>`;
    return;
  }

  const map = getProductsMap();
  const p = map[id];

  if (!p) {
    wrap.innerHTML = `<div class="col-12"><div class="alert alert-danger">Product not found. Go back to Home and open again.</div></div>`;
    return;
  }

  document.title = p.name;

  wrap.innerHTML = `
    <div class="col-12 col-md-6">
      <img src="${p.img}" alt="${p.name}" class="img-fluid rounded border" style="width:100%; max-height:420px; object-fit:cover;">
    </div>

    <div class="col-12 col-md-6">
      <h1 class="mb-2">${p.name}</h1>
      <div class="text-muted mb-2">${p.category || ""}</div>
      <div class="fs-3 fw-bold text-danger mb-3">${formatMoney(p.price)}</div>
      <p class="text-muted">${p.desc || "Tasty and fresh, prepared for you."}</p>

      <div class="d-flex gap-2 mt-4">
        <button class="btn btn-outline-secondary add-cart"
          data-id="${p.id}"
          data-name="${p.name}"
          data-price="${p.price}"
          data-img="${p.img}"
        >Add to Cart</button>

        <a class="btn btn-danger buy-now"
          href="order.html"
          data-id="${p.id}"
          data-name="${p.name}"
          data-price="${p.price}"
          data-img="${p.img}"
        >Buy Now</a>
      </div>
    </div>
  `;
}

// =========================
//  Order page render (multi-item)
// =========================
function renderOrderPage() {
  const orderItemsDiv = document.getElementById("orderItems");
  if (!orderItemsDiv) return;

  const emptyMsg = document.getElementById("emptyMsg");
  const subtotalEl = document.getElementById("subtotal");
  const deliveryEl = document.getElementById("delivery");
  const taxEl = document.getElementById("tax");
  const totalEl = document.getElementById("total");

  const placeBtn = document.getElementById("placeOrderBtn");
  const clearBtn = document.getElementById("clearCartBtn");

  const deliveryFee = 2.0;
  const taxRate = 0;

  function calcTotals(cart) {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const tax = subtotal * taxRate;
    const delivery = cart.length ? deliveryFee : 0;
    const total = subtotal + delivery + tax;

    subtotalEl.textContent = formatMoney(subtotal);
    deliveryEl.textContent = formatMoney(delivery);
    taxEl.textContent = formatMoney(tax);
    totalEl.textContent = formatMoney(total);
  }

  function render(cart) {
    setCartCountBadge();

    if (!cart.length) {
      orderItemsDiv.innerHTML = "";
      emptyMsg.classList.remove("d-none");
      calcTotals(cart);
      return;
    }

    emptyMsg.classList.add("d-none");

    orderItemsDiv.innerHTML = cart.map((item) => `
      <div class="border rounded p-3 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
        <div class="d-flex align-items-center gap-3">
          <img src="${item.img}" alt="${item.name}" style="width:80px;height:80px;object-fit:cover" class="rounded">
          <div>
            <h6 class="mb-1">${item.name}</h6>
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
    `).join("");

    calcTotals(cart);
  }

  render(getCart());

  orderItemsDiv.addEventListener("click", (e) => {
    const minus = e.target.closest(".qty-minus");
    const plus = e.target.closest(".qty-plus");
    const remove = e.target.closest(".remove-item");

    if (minus) {
      const id = minus.dataset.id;
      const cart = getCart();
      const it = cart.find(x => x.id === id);
      if (!it) return;
      render(updateQty(id, it.qty - 1));
      return;
    }

    if (plus) {
      const id = plus.dataset.id;
      const cart = getCart();
      const it = cart.find(x => x.id === id);
      if (!it) return;
      render(updateQty(id, it.qty + 1));
      return;
    }

    if (remove) {
      render(removeFromCart(remove.dataset.id));
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (typeof Swal === "undefined") {
        render(clearCart());
        return;
      }
      Swal.fire({
        icon: "warning",
        title: "Clear cart?",
        text: "This will remove all items.",
        showCancelButton: true,
        confirmButtonText: "Yes, clear",
        cancelButtonText: "Cancel",
      }).then((res) => {
        if (res.isConfirmed) {
          render(clearCart());
          toastSuccess("Cart cleared");
        }
      });
    });
  }

  if (placeBtn) {
    placeBtn.addEventListener("click", () => {
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
        render(getCart());
      });
    });
  }
}

// =========================
//  Init
// =========================
document.addEventListener("DOMContentLoaded", () => {
  setCartCountBadge();

  // index.html only
  seedProductsFromHomePage();
  setupSearchFilter();
  setupCategoryScroll();

  // product.html only
  renderProductPage();

  // order.html only
  renderOrderPage();
});
