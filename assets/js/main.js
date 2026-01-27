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

  if (found) {
    found.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }

  saveCart(cart);
  setCartCountBadge();
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
//  Home Page: Add to Cart + Buy Now
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

    // Optional feedback (small, simple)
    addBtn.textContent = "Added!";
    setTimeout(() => (addBtn.textContent = "Add to Cart"), 700);
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
    // Let the link navigate to order.html naturally
  }
});

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

  const deliveryFee = 2.0;    // fixed delivery
  const taxRate = 0;          // optional (0 = no tax)

  function calcTotals(cart) {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const tax = subtotal * taxRate;
    const delivery = cart.length > 0 ? deliveryFee : 0; // no delivery if cart empty
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

  // Initial render
  render(getCart());

  // Qty +/-, Remove (event delegation)
  orderItemsDiv.addEventListener("click", (e) => {
    const minus = e.target.closest(".qty-minus");
    const plus = e.target.closest(".qty-plus");
    const remove = e.target.closest(".remove-item");

    if (minus) {
      const id = minus.dataset.id;
      const cart = getCart();
      const item = cart.find((x) => x.id === id);
      if (!item) return;
      const updated = updateQty(id, item.qty - 1);
      render(updated);
      return;
    }

    if (plus) {
      const id = plus.dataset.id;
      const cart = getCart();
      const item = cart.find((x) => x.id === id);
      if (!item) return;
      const updated = updateQty(id, item.qty + 1);
      render(updated);
      return;
    }

    if (remove) {
      const id = remove.dataset.id;
      const updated = removeFromCart(id);
      render(updated);
    }
  });

  // Clear cart
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const updated = clearCart();
      render(updated);
    });
  }

  // Place order
  if (placeBtn) {
    placeBtn.addEventListener("click", () => {
      const cart = getCart();
      if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
      }
      alert("Order placed successfully!");
      clearCart();
      render(getCart());
    });
  }
}

// =========================
//  Init
// =========================
document.addEventListener("DOMContentLoaded", () => {
  setCartCountBadge();
  renderOrderPage();
});
