async function loadStoreProducts() {
  const containers = [
    "#products-grid",
    "#product-list",
    ".products-grid",
    ".product-grid",
    ".products-list",
    "[data-products]"
  ];

  const container = containers
    .map(selector => document.querySelector(selector))
    .find(Boolean);

  if (!container) {
    console.warn(
      "Контейнер товаров не найден. " +
      "Добавь id=\"products-grid\" к блоку каталога в index.html."
    );
    return;
  }

  try {
    const response = await fetch("/api/products", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Не удалось загрузить товары");
    }

    const products = await response.json();

    container.innerHTML = products.map(product => {
      const image = product.image
        ? `<img class="product-image" src="${escapeStoreHtml(product.image)}"
             alt="${escapeStoreHtml(product.name)}" loading="lazy">`
        : `<div class="product-image-placeholder">Канцелярия</div>`;

      return `
        <article class="product-card">
          ${image}
          <div class="product-info">
            <span class="product-category">
              ${escapeStoreHtml(product.category || "Товары")}
            </span>
            <h3>${escapeStoreHtml(product.name)}</h3>
            <p>${escapeStoreHtml(product.description || "")}</p>
            <div class="product-bottom">
              <strong class="price">${Number(product.price)
                .toLocaleString("ru-RU")} ₽</strong>
              <span class="product-stock">
                ${Number(product.stock) > 0 ? "В наличии" : "Нет в наличии"}
              </span>
            </div>
          </div>
        </article>`;
    }).join("");
  } catch (error) {
    console.error(error);
  }
}

function escapeStoreHtml(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

loadStoreProducts();