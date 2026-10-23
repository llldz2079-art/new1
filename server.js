const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const ROOT = __dirname;
const PRODUCTS_FILE = path.join(ROOT, "products.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

function readProducts() {
  return JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf8"));
}

function saveProducts(products) {
  fs.writeFileSync(
    PRODUCTS_FILE,
    JSON.stringify(products, null, 2),
    "utf8"
  );
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;

      if (body.length > 1_000_000) {
        reject(new Error("Слишком большой запрос"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Некорректный JSON"));
      }
    });

    req.on("error", reject);
  });
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      return res.end("Файл не найден");
    }

    const type = mimeTypes[path.extname(filePath).toLowerCase()]
      || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store"
    });

    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    if (url.pathname === "/api/products" && req.method === "GET") {
      return sendJson(res, 200, readProducts());
    }

    if (url.pathname === "/api/products" && req.method === "POST") {
      const product = await readBody(req);
      const products = readProducts();

      if (!product.name?.trim() ||
          !Number.isFinite(Number(product.price)) ||
          Number(product.price) < 0) {
        return sendJson(res, 400, {
          error: "Укажи название и корректную цену"
        });
      }

      const newProduct = {
        id: products.length
          ? Math.max(...products.map(item => item.id)) + 1
          : 1,
        name: String(product.name).trim(),
        price: Number(product.price),
        category: String(product.category || "").trim(),
        description: String(product.description || "").trim(),
        image: String(product.image || "").trim(),
        stock: Math.max(0, Number.parseInt(product.stock, 10) || 0)
      };

      products.push(newProduct);
      saveProducts(products);

      return sendJson(res, 201, newProduct);
    }

    const productRoute = url.pathname.match(/^\/api\/products\/(\d+)$/);

    if (productRoute && req.method === "PUT") {
      const id = Number(productRoute[1]);
      const update = await readBody(req);
      const products = readProducts();
      const index = products.findIndex(item => item.id === id);

      if (index === -1) {
        return sendJson(res, 404, { error: "Товар не найден" });
      }

      if (!update.name?.trim() ||
          !Number.isFinite(Number(update.price)) ||
          Number(update.price) < 0) {
        return sendJson(res, 400, {
          error: "Укажи название и корректную цену"
        });
      }

      products[index] = {
        ...products[index],
        name: String(update.name).trim(),
        price: Number(update.price),
        category: String(update.category || "").trim(),
        description: String(update.description || "").trim(),
        image: String(update.image || "").trim(),
        stock: Math.max(0, Number.parseInt(update.stock, 10) || 0)
      };

      saveProducts(products);
      return sendJson(res, 200, products[index]);
    }

    if (productRoute && req.method === "DELETE") {
      const id = Number(productRoute[1]);
      const products = readProducts();
      const filtered = products.filter(item => item.id !== id);

      if (filtered.length === products.length) {
        return sendJson(res, 404, { error: "Товар не найден" });
      }

      saveProducts(filtered);
      return sendJson(res, 200, { success: true });
    }

    if (req.method !== "GET") {
      return sendJson(res, 405, { error: "Метод не поддерживается" });
    }

    let relativePath;

    if (url.pathname === "/") {
      relativePath = "styles/index.html";
    } else if (url.pathname === "/admin") {
      relativePath = "admin.html";
    } else {
      relativePath = decodeURIComponent(url.pathname.slice(1));
    }

    const filePath = path.resolve(ROOT, relativePath);

    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
      return sendJson(res, 403, { error: "Доступ запрещён" });
    }

    serveFile(res, filePath);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Ошибка сервера" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Магазин: http://localhost:${PORT}`);
  console.log(`Админ-панель: http://localhost:${PORT}/admin`);
});