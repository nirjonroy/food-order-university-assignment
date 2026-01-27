// =========================
//  Cart Helpers (localStorage)
// =========================
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
  const cart = getCart();
  badge.textContent = cartCount(cart);
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
  return `$${n.toFixed(2)}`;
}

// =========================
//  SweetAlert Helpers
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
//  Click Events: Add to Cart, Buy Now, Category Scroll
// =========================
document.addEventListener("click", (e) => {
  // Add to Cart
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

  // Buy Now (also adds to cart)
  const buyBtn = e.target.closest(".buy-now");
  if (buyBtn) {
    const item = {
      id: buyBtn.dataset.id,
      name: buyBtn.dataset.name,
      price: Number(buyBtn.dataset.price),
      img: buyBtn.dataset.img,
    };
    addToCart(item);
    // Link will navigate to order.html naturally
    return;
  }

  // Category scroll
  const catBtn = e.target.closest(".category-btn");
  if (catBtn) {
    const target = catBtn.dataset.target;
    if (!target) return;

    const el = document.querySelector(target);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

// =========================
//  Search Filter (typing hides non-matching cards)
// =========================
function setupSearchFilter() {
  const input = document.getElementById("searchInput");
  if (!input) return; // not on index page

  const items = Array.from(document.querySelectorAll(".food-item"));

  function applyFilter() {
    const q = input.value.trim().toLowerCase();

    items.forEach((card) => {
      const name = (card.dataset.name || "").toLowerCase();
      const text = card.textContent.toLowerCase();
      const match = name.includes(q) || text.includes(q);
      card.style.display = match ? "" : "none";
    });
  }

  input.addEventListener("input", applyFilter);
}

// =========================
//  Order Page: Render cart list + totals
// =========================
function renderOrderPage() {
  const orderItemsDiv = document.getElementById("orderItems");
  if (!orderItemsDiv) return; // not on order.html

  const emptyMsg = document.getElementById("emptyMsg");
  const subtotalEl = document.getElementById("subtotal");
  const deliveryEl = document.getElementById("delivery");
  const taxEl = document.getElementById("tax");
  const totalEl = document.getElementById("total");

  const placeBtn = document.getElementById("placeOrderBtn");
  const clearBtn = document.getElementById("clearCartBtn");

  const deliveryFee = 2.0;
  const taxRate = 0; // optional

  function calcTotals(cart) {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const tax = subtotal * taxRate;
    const delivery = cart.length > 0 ? deliveryFee : 0;
    const total = subtotal + delivery + tax;

    subtotalEl.textContent = formatMoney(subtotal);
    deliveryEl.textContent = formatMoney(delivery);
    taxEl.textContent = formatMoney(tax);
    totalEl.textContent = formatMoney(total);
  }

  function render(cart) {
    setCartCountBadge();

    if (cart.length === 0) {
      orderItemsDiv.innerHTML = "";
      emptyMsg.classList.remove("d-none");
      calcTotals(cart);
      return;
    }

    emptyMsg.classList.add("d-none");

    orderItemsDiv.innerHTML = cart
      .map(
        (item) => `
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

          <button class="btn btn-outline-danger btn-sm remove-item" data-id="${item.id}">
            Remove
          </button>
        </div>
      `
      )
      .join("");

    calcTotals(cart);
  }

  // initial render
  render(getCart());

  // qty and remove (event delegation)
  orderItemsDiv.addEventListener("click", (e) => {
    const minus = e.target.closest(".qty-minus");
    const plus = e.target.closest(".qty-plus");
    const remove = e.target.closest(".remove-item");

    if (minus) {
      const id = minus.dataset.id;
      const cart = getCart();
      const item = cart.find((x) => x.id === id);
      if (!item) return;
      render(updateQty(id, item.qty - 1));
      return;
    }

    if (plus) {
      const id = plus.dataset.id;
      const cart = getCart();
      const item = cart.find((x) => x.id === id);
      if (!item) return;
      render(updateQty(id, item.qty + 1));
      return;
    }

    if (remove) {
      const id = remove.dataset.id;
      render(removeFromCart(id));
    }
  });

  // clear cart confirm
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

  // place order
  if (placeBtn) {
    placeBtn.addEventListener("click", () => {
      const cart = getCart();
      if (cart.length === 0) {
        swalInfo("Cart empty", "Please add items from Home.");
        return;
      }

      if (typeof Swal === "undefined") {
        alert("Order placed successfully!");
        clearCart();
        render(getCart());
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
  setupSearchFilter();
  renderOrderPage();
});
