const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");
const app = express();
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const internalUrl = (value, fallback) => {
  const target = (value || fallback).trim();
  return /^[a-z][a-z\d+.-]*:\/\//i.test(target)
    ? target
    : `http://${target}`;
};
const R = internalUrl(process.env.RESTAURANT_URL, "http://localhost:3001");
const T = internalUrl(process.env.TRANSLATE_URL, "http://localhost:3002");

// Truy cập qua đường hầm Cloudflare (internet) thì chặn /admin và các thao tác ghi, trừ khi ALLOW_REMOTE_ADMIN=1
app.use((req, res, next) => {
  const isLocal = req.hostname === "localhost" || req.hostname === "127.0.0.1";

  if (!isLocal && process.env.ALLOW_REMOTE_ADMIN !== "1") {
    const write =
      req.path.startsWith("/api/restaurants") && req.method !== "GET";

    if (req.path.startsWith("/admin") || write) {
      return res.status(403).send("Admin chỉ dùng trên máy chủ (localhost).");
    }
  }

  next();
});
app.use(
  createProxyMiddleware("/api/restaurants", {
    target: R,
    changeOrigin: true,
    pathRewrite: { "^/api/restaurants": "/restaurants" },
    onProxyReq: (proxyReq) => {
      if (INTERNAL_API_KEY) proxyReq.setHeader("x-internal-api-key", INTERNAL_API_KEY);
    },
  }),
);
app.use(
  createProxyMiddleware("/api/translate", {
    target: T,
    changeOrigin: true,
    pathRewrite: { "^/api/translate": "/translate" },
    onProxyReq: (proxyReq) => {
      if (INTERNAL_API_KEY) proxyReq.setHeader("x-internal-api-key", INTERNAL_API_KEY);
    },
  }),
);
app.use(
  createProxyMiddleware("/api/tts", {
    target: T,
    changeOrigin: true,
    pathRewrite: { "^/api/tts": "/tts" },
    onProxyReq: (proxyReq) => {
      if (INTERNAL_API_KEY) proxyReq.setHeader("x-internal-api-key", INTERNAL_API_KEY);
    },
  }),
);

app.use("/customer", express.static(path.join(__dirname, "public/customer")));
app.use("/admin", express.static(path.join(__dirname, "public/admin")));
app.get("/", (_q, res) => res.redirect("/customer"));
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`gateway :${PORT} -> /customer và /admin`),
);
