const form = document.querySelector("#product-form");
const table = document.querySelector("#products-table");
const search = document.querySelector("#search");
const formTitle = document.querySelector("#form-title");
const saveButton = document.querySelector("#save-button");
const cancelButton = document.querySelector("#cancel-edit");
const formMessage = document.querySelector("#form-message");
const listMessage = document.querySelector("#list-message");

let products = [];

const fields = {
  id: document.querySelector("#product-id"),
  name: document.querySelector("#name"),
  price: document.querySelector("#price"),
  category: document.querySelector("#category"),
  stock: document.querySelector("#stock"),
  image: document.querySelector("#image"),
  description: document.querySelector("#description")
};

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Не удалось выполнить запрос");
  }

  return data;
}

function showMessage(element, message, type = "") {
  element.textContent = message;
  element.className = `message ${type}`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatPrice(price) {
  return Number(price).toLocaleString("ru-RU", {
    maximumFractionDigits: 2
  }) + " ₽";
}

function updateStats() {
  document.querySelector("#total-products").textContent = products.length;

  document.querySelector("#total-categories").textContent =
    new Set(products.map(item => item.category.trim()).filter(Boolean)).size;

  document.querySelector("#total-stock").textContent =
    products.reduce((sum, item) => sum + Number(item.stock || 0), 0);
}

function renderProducts() {
  const query = search.value.trim().toLowerCase();

  const filtered = products.filter(product =>
    [product.name, product.category, product.description]
      .some(value => String(value || "").toLowerCase().includes(query))
  );

  if (!filtered.length) {
    table.innerHTML = `
      <tr>
        <td colspan="5" class="empty">Товары не найдены</td>
      </tr>`;
    return;
  }

  table.innerHTML = filtered.map(product => `
    <tr>
      <td>${escapeHtml(product.name)}</td>
      <td>${escapeHtml(product.category || "—")}</td>
      <td>${formatPrice(product.price)}</td>
      <td>${Number(product.stock || 0)}</td>
      <td>
        <div class="actions">
          <button class="edit-button" data-action="edit"
            data-id="${product.id}">Изменить</button>
          <button class="delete-button" data-action="delete"
            data-id="${product.id}">Удалить</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function loadProducts() {
  try {
    products = await api("/api/products");
    updateStats();
    renderProducts();
    showMessage(listMessage, "");
  } catch (error) {
    showMessage(listMessage, error.message, "error");
  }
}

function resetForm() {
  form.reset();
  fields.id.value = "";
  fields.stock.value = "0";
  formTitle.textContent = "Добавить товар";
  saveButton.textContent = "Добавить товар";
  cancelButton.hidden = true;
  showMessage(formMessage, "");
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  const product = {
    name: fields.name.value.trim(),
    price: Number(fields.price.value),
    category: fields.category.value.trim(),
    stock: Number(fields.stock.value || 0),
    image: fields.image.value.trim(),
    description: fields.description.value.trim()
  };

  if (!product.name || !Number.isFinite(product.price) || product.price < 0) {
    showMessage(formMessage, "Проверь название и цену товара.", "error");
    return;
  }

  const id = fields.id.value;
  const url = id ? `/api/products/${id}` : "/api/products";
  const method = id ? "PUT" : "POST";

  saveButton.disabled = true;
  showMessage(formMessage, "Сохранение...");

  try {
    await api(url, {
      method,
      body: JSON.stringify(product)
    });

    resetForm();
    showMessage(formMessage, "Товар успешно сохранён.", "success");
    await loadProducts();
  } catch (error) {
    showMessage(formMessage, error.message, "error");
  } finally {
    saveButton.disabled = false;
  }
});

table.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const id = Number(button.dataset.id);
  const product = products.find(item => item.id === id);

  if (!product) return;

  if (button.dataset.action === "edit") {
    fields.id.value = product.id;
    fields.name.value = product.name;
    fields.price.value = product.price;
    fields.category.value = product.category || "";
    fields.stock.value = product.stock || 0;
    fields.image.value = product.image || "";
    fields.description.value = product.description || "";

    formTitle.textContent = "Редактировать товар";
    saveButton.textContent = "Сохранить изменения";
    cancelButton.hidden = false;
    showMessage(formMessage, "");

    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (button.dataset.action === "delete") {
    if (!confirm(`Удалить товар «${product.name}»?`)) return;

    try {
      await api(`/api/products/${id}`, { method: "DELETE" });
      showMessage(listMessage, "Товар удалён.", "success");
      await loadProducts();
    } catch (error) {
      showMessage(listMessage, error.message, "error");
    }
  }
});

cancelButton.addEventListener("click", resetForm);
search.addEventListener("input", renderProducts);

loadProducts();