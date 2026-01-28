# FoodOrder University Assignment (SPA)
[live link](https://nirjonroy.github.io/food-order-university-assignment/)

A responsive food ordering UI built with **HTML, CSS, Bootstrap 5, JavaScript**.  
This project evolved step-by-step from a simple static design to a fully working **offline SPA** with dynamic data, product details, cart, and order flow.



## Project Features

- Bootstrap 5 responsive layout
- Hero carousel (slider)
- Search filter (typing hides non-matching cards)
- “No results found” message when search returns nothing
- Category buttons (scroll to section + active highlight)
- Product details view (SPA route)
- Add to cart + cart count badge
- Order page (cart list, quantity update, remove, clear cart)
- SweetAlert2 for notifications (Add to cart / Clear cart / Order placed)
- Offline support (works by double-clicking `index.html`)

---

## Final Technology Used

- HTML5  
- CSS3  
- Bootstrap 5  
- JavaScript (Vanilla)  
- LocalStorage (cart persistence)  
- SweetAlert2  

---


> **Note:** `assets/js/data.js` contains embedded API-style data so the app works offline without fetch.

---

## Development Journey (Step-by-Step)

### Phase 1 — Static UI + Manual Data
- Built the initial UI layout using Bootstrap:
  - Navbar
  - Search bar
  - Category buttons
  - Food cards (manual/static)
- Implemented basic sections like Pizza, Burger, Drinks, Dessert
- Used manual images and hardcoded sample products

**What was working:**
- Static home page layout
- Basic styling and responsiveness

---

### Phase 2 — Added Cart + Order Page Logic
- Implemented:
  - Add to Cart button
  - Cart count badge in navbar
  - Order page (cart list)
  - Quantity increase/decrease
  - Remove item
  - Clear cart
- Stored cart data using **localStorage**

**What was working:**
- Cart persistence
- Order summary UI and pricing layout

---

### Phase 3 — Converted into SPA (Single Page Application)
- Converted navigation into a SPA using **hash routing**:
  - `#/home`
  - `#/product?id=...`
  - `#/order`
- Replaced multi-page navigation with dynamic rendering inside one `index.html`

**What improved:**
- Faster navigation (no page reload)
- Product and order pages render inside the SPA root container

---

### Phase 4 — Added API-Style Data (TheMealDB format)
- Introduced large dataset using TheMealDB response structure:
  - `idMeal`, `strMeal`, `strCategory`, `strMealThumb`, `strInstructions`
- Initially attempted to load JSON using fetch (API/local JSON)

**Problem discovered:**
- `fetch()` does not work reliably when opening via `file://` (double-click) due to browser security restrictions.

---

### Phase 5 — Final Offline-Safe SPA (Embedded API Data)
- Final solution:
  - Stored TheMealDB-style data inside `assets/js/data.js` as `RAW_MEAL_DATA`
  - Loaded products directly from `RAW_MEAL_DATA` (no fetch)
- Kept SPA routing + all features working offline

**Final Result:**
- Offline-safe SPA with dynamic data, product view, cart/order flow

---

## SPA Routes

- **Home/Menu:** `#/home`
- **Product Details:** `#/product?id=MEAL_ID`
- **Order Page:** `#/order`

---

## Notes / Submission Highlights

- Data is structured in an **API-compatible format** (TheMealDB-style).
- For offline reliability, the dataset is **embedded into `data.js`** (no network calls).
- Cart data persists using **localStorage**.

---

## How to Run (Offline)

This project is **offline-safe**.  
✅ Just double-click:

`index.html`

No server / Live Server required.

---
---

## Developer Info

- **Name:** Nirjon Roy  
- **Student ID:** 2023100010067  
- **Department:** CSE  
- **University:** Southeast University  

### Portfolio & Links
- Portfolio: https://blacktechcorp.com/team/nirjon-roy  
- GitHub: https://github.com/nirjonroy  
- LinkedIn: https://www.linkedin.com/in/softdev-nirjon-roy  



