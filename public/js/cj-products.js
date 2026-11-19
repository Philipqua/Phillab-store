/**
 * CJ Products Loader
 * Fetches and displays live CJdropshipping products on phillab.store
 *
 * Usage in your HTML:
 *   <div id="cj-products"></div>
 *   <div id="cj-pagination"></div>
 *   <script src="/js/cj-products.js"></script>
 */

(function () {
  let currentPage = 1;
  const pageSize = 10;
  let totalPages = 1;

  const productsContainer = document.getElementById("cj-products");
  const paginationContainer = document.getElementById("cj-pagination");

  if (!productsContainer) {
    console.warn("CJ Products: #cj-products container not found in the DOM.");
    return;
  }

  function formatPrice(price) {
    if (!price) return "N/A";
    return "$" + parseFloat(price).toFixed(2);
  }

  function renderProducts(products) {
    if (!products || products.length === 0) {
      productsContainer.innerHTML = "<p>No products found.</p>";
      return;
    }

    productsContainer.innerHTML = products
      .map(
        (p) => `
        <div class="cj-product-card" style="
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          max-width: 250px;
          display: flex;
          flex-direction: column;
          background: #fff;
          transition: box-shadow 0.2s;
        "
        onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
        onmouseout="this.style.boxShadow='none'"
        >
          <img
            src="${p.image || ""}"
            alt="${p.name || "Product"}"
            style="width:100%; height:200px; object-fit:cover;"
            loading="lazy"
            onerror="this.src='https://via.placeholder.com/250x200?text=No+Image'"
          />
          <div style="padding:12px;">
            <h3 style="
              font-size:14px;
              font-weight:600;
              margin:0 0 8px 0;
              color:#1a202c;
              line-height:1.3;
              display:-webkit-box;
              -webkit-line-clamp:2;
              -webkit-box-orient:vertical;
              overflow:hidden;
            ">${p.name || "Unnamed Product"}</h3>
            <p style="font-size:16px; font-weight:700; color:#2b6cb0; margin:0 0 4px 0;">
              ${formatPrice(p.price)}
            </p>
            <p style="font-size:12px; color:#718096; margin:0;">
              SKU: ${p.sku || "N/A"} · In stock: ${p.inventory || 0}
            </p>
          </div>
        </div>`
      )
      .join("");
  }

  function renderPagination() {
    if (!paginationContainer) return;

    paginationContainer.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; gap:12px; margin-top:24px;">
        <button
          id="cj-prev"
          ${currentPage <= 1 ? "disabled" : ""}
          style="
            padding:8px 16px;
            border-radius:8px;
            border:1px solid #cbd5e0;
            background:${currentPage <= 1 ? "#f7fafc" : "#fff"};
            color:${currentPage <= 1 ? "#a0aec0" : "#2d3748"};
            cursor:${currentPage <= 1 ? "not-allowed" : "pointer"};
            font-size:14px;
          "
        >← Previous</button>

        <span style="font-size:14px; color:#4a5568;">
          Page ${currentPage} of ${totalPages}
        </span>

        <button
          id="cj-next"
          ${currentPage >= totalPages ? "disabled" : ""}
          style="
            padding:8px 16px;
            border-radius:8px;
            border:1px solid #cbd5e0;
            background:${currentPage >= totalPages ? "#f7fafc" : "#fff"};
            color:${currentPage >= totalPages ? "#a0aec0" : "#2d3748"};
            cursor:${currentPage >= totalPages ? "not-allowed" : "pointer"};
            font-size:14px;
          "
        >Next →</button>
      </div>
    `;

    const prevBtn = document.getElementById("cj-prev");
    const nextBtn = document.getElementById("cj-next");

    if (prevBtn && currentPage > 1) {
      prevBtn.addEventListener("click", () => {
        currentPage--;
        loadProducts();
        window.scrollTo({ top: productsContainer.offsetTop - 20, behavior: "smooth" });
      });
    }

    if (nextBtn && currentPage < totalPages) {
      nextBtn.addEventListener("click", () => {
        currentPage++;
        loadProducts();
        window.scrollTo({ top: productsContainer.offsetTop - 20, behavior: "smooth" });
      });
    }
  }

  async function loadProducts() {
    productsContainer.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; width:100%; padding:40px;">
        <div style="font-size:16px; color:#718096;">Loading products...</div>
      </div>
    `;

    try {
      const res = await fetch(`/api/cj-products?page=${currentPage}&pageSize=${pageSize}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.error) throw new Error(data.detail || data.error);

      totalPages = data.totalPages || 1;
      renderProducts(data.products);
      renderPagination();
    } catch (err) {
      productsContainer.innerHTML = `
        <div style="text-align:center; padding:40px; color:#e53e3e;">
          <p style="font-size:16px; font-weight:600;">Failed to load products</p>
          <p style="font-size:14px;">${err.message}</p>
        </div>
      `;
    }
  }

  // Load first page on init
  loadProducts();
})();
