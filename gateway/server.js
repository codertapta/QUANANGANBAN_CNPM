const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");
const app = express();
const R = process.env.RESTAURANT_URL || "http://localhost:3001";
const T = process.env.TRANSLATE_URL || "http://localhost:3002";

// Truy cập qua đường hầm Cloudflare (internet) thì chặn /admin và các thao tác ghi, trừ khi ALLOW_REMOTE_ADMIN=1
app.use((req, res, next) => {
  const remote = !!req.headers["cf-connecting-ip"];
  if (remote && process.env.ALLOW_REMOTE_ADMIN !== "1") {
    const write =
      req.path.startsWith("/api/restaurants") && req.method !== "GET";
    if (req.path.startsWith("/admin") || write)
      return res.status(403).send("Admin chỉ dùng trên máy chủ (localhost).");
  }
  next();
});

app.use(
  createProxyMiddleware("/api/restaurants", {
    target: R,
    changeOrigin: true,
    pathRewrite: { "^/api/restaurants": "/restaurants" },
  }),
);
app.use(
  createProxyMiddleware("/api/translate", {
    target: T,
    changeOrigin: true,
    pathRewrite: { "^/api/translate": "/translate" },
  }),
);
app.use(
  createProxyMiddleware("/api/tts", {
    target: T,
    changeOrigin: true,
    pathRewrite: { "^/api/tts": "/tts" },
  }),
);

app.use("/customer", express.static(path.join(__dirname, "public/customer")));
app.use("/admin", express.static(path.join(__dirname, "public/admin")));
app.get("/", (_q, res) => res.redirect("/customer"));
app.listen(8080, () => console.log("gateway :8080  ->  /customer  và  /admin"));
