(function () {
  let currentPage = 1;
  let currentCategoryId = null;
  const pageSize = 10;
  let totalPages = 1;

  const productsContainer = document.getElementById("cj-products");
  const paginationContainer = document.getElementById("cj-pagination");
  const categoryContainer = document.querySelector(".categories");

  async function loadProducts(page = 1, categoryId = null) {
    currentPage = page;
    currentCategoryId = categoryId;
    
    productsContainer.innerHTML = '<p style="text-align:center; width:100%;">Loading products...</p>';
    
    try {
      const url = `/api/cj-products?page=${page}&pageSize=${pageSize}${categoryId ? `&categoryId=${categoryId}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      totalPages = data.totalPages;
      renderProducts(data.products);
      renderPagination();
      updateCategoryButtons(data.products); // Dynamically build category list
    } catch (err) {
      productsContainer.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  }

  function renderProducts(products) {
    productsContainer.innerHTML = products.map(p => `
      <div class="product-card" style="background:var(--bg-card); border-radius:var(--radius); overflow:hidden; border:1px solid var(--border);">
        <div class="product-img-wrap"><img src="${p.image}" loading="lazy"></div>
        <div class="product-info" style="padding:12px;">
          <h3 style="font-size:0.9rem; margin-bottom:8px;">${p.name}</h3>
          <div style="font-weight:bold; color:var(--accent-light); font-size:1.1rem;">$${parseFloat(p.price).toFixed(2)}</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">SKU: ${p.sku}</div>
        </div>
      </div>
    `).join('');
  }

  function renderPagination() {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = `
      <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
        <button id="prev-btn" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button id="next-btn" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
      </div>
    `;
    document.getElementById('prev-btn').onclick = () => loadProducts(currentPage - 1, currentCategoryId);
    document.getElementById('next-btn').onclick = () => loadProducts(currentPage + 1, currentCategoryId);
  }

  function updateCategoryButtons(products) {
    if (!categoryContainer) return;
    // Get unique categories from current products
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    
    // Only rebuild if we don't have buttons yet or if we are in "All" mode
    if (categoryContainer.children.length <= 1) {
      const allBtn = document.createElement('button');
      allBtn.className = 'cat-btn active';
      allBtn.innerText = 'All';
      allBtn.onclick = () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
        loadProducts(1, null);
      };
      categoryContainer.appendChild(allBtn);

      cats.forEach(catId => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        btn.innerText = `Cat ${catId.slice(0,4)}`; // Using ID as label for now
        btn.onclick = () => {
          document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          loadProducts(1, catId);
        };
        categoryContainer.appendChild(btn);
      });
    }
  }

  loadProducts();
})();
