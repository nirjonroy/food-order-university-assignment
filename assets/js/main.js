// =========================
//  Buy Now -> localStorage
// =========================
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".buy-now");
  if (!btn) return;

  const item = {
    name: btn.dataset.name,
    price: Number(btn.dataset.price),
    img: btn.dataset.img,
    qty: 1,
  };

  localStorage.setItem("selectedItem", JSON.stringify(item));
});

// =========================
//  Order Page Render
// =========================
function formatMoney(n) {
  return `$${n.toFixed(2)}`;
}

function renderOrderPage() {
  const orderItemsDiv = document.getElementById("orderItems");
  if (!orderItemsDiv) return; // Not on order.html

  const emptyMsg = document.getElementById("emptyMsg");
  const subtotalEl = document.getElementById("subtotal");
  const deliveryEl = document.getElementById("delivery");
  const taxEl = document.getElementById("tax");
  const totalEl = document.getElementById("total");

  const deliveryFee = 2.0; 
  const taxRate = 0; 

  let item = localStorage.getItem("selectedItem");
  item = item ? JSON.parse(item) : null;

  if (!item) {
    orderItemsDiv.innerHTML = "";
    emptyMsg.classList.remove("d-none");

    subtotalEl.textContent = formatMoney(0);
    deliveryEl.textContent = formatMoney(deliveryFee);
    taxEl.textContent = formatMoney(0);
    totalEl.textContent = formatMoney(deliveryFee);
    return;
  }

  emptyMsg.classList.add("d-none");

  function updateTotals() {
    const subtotal = item.price * item.qty;
    const tax = subtotal * taxRate;
    const total = subtotal + deliveryFee + tax;

    subtotalEl.textContent = formatMoney(subtotal);
    deliveryEl.textContent = formatMoney(deliveryFee);
    taxEl.textContent = formatMoney(tax);
    totalEl.textContent = formatMoney(total);
  }

  function renderItemRow() {
    orderItemsDiv.innerHTML = `
      <div class="d-flex align-items-center justify-content-between gap-3 border rounded p-3">
        <div class="d-flex align-items-center gap-3">
          <img src="${item.img}" alt="${item.name}"
            style="width:70px;height:70px;object-fit:cover"
            class="rounded"
          >
          <div>
            <h6 class="mb-1">${item.name}</h6>
            <div class="text-muted small">Price: ${formatMoney(item.price)}</div>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2">
          <button class="btn btn-outline-secondary btn-sm" id="minusBtn">−</button>
          <span class="fw-bold" id="qtyText">${item.qty}</span>
          <button class="btn btn-outline-secondary btn-sm" id="plusBtn">+</button>
        </div>

        <button class="btn btn-outline-danger btn-sm" id="removeBtn">Remove</button>
      </div>
    `;

    document.getElementById("minusBtn").addEventListener("click", () => {
      item.qty = Math.max(1, item.qty - 1);
      localStorage.setItem("selectedItem", JSON.stringify(item));
      document.getElementById("qtyText").textContent = item.qty;
      updateTotals();
    });

    document.getElementById("plusBtn").addEventListener("click", () => {
      item.qty += 1;
      localStorage.setItem("selectedItem", JSON.stringify(item));
      document.getElementById("qtyText").textContent = item.qty;
      updateTotals();
    });

    document.getElementById("removeBtn").addEventListener("click", () => {
      localStorage.removeItem("selectedItem");
      renderOrderPage(); // re-render empty state
    });
  }

  renderItemRow();
  updateTotals();

  // Optional: place order message
  const placeBtn = document.getElementById("placeOrderBtn");
  if (placeBtn) {
    placeBtn.addEventListener("click", () => {
      alert("Order placed successfully!");
    });
  }
}

document.addEventListener("DOMContentLoaded", renderOrderPage);
