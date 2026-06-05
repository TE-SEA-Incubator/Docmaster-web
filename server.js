const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3003;
const DIST = path.join(__dirname, "dist");
const API_TARGET = process.env.API_TARGET || "http://localhost:5000";

const MIME = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

function proxyRequest(targetUrl, req, res) {
  const url = new URL(targetUrl);
  const isHttps = url.protocol === "https:";
  const client = isHttps ? https : http;

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: req.method,
    headers: {
      ...req.headers,
      "X-Forwarded-For": req.socket.remoteAddress,
      "X-Forwarded-Proto": req.socket.encrypted ? "https" : "http",
    },
  };

  const proxyReq = client.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", () => {
    res.writeHead(502);
    res.end("502 Bad Gateway");
  });

  if (req.method !== "GET" && req.method !== "HEAD") {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/") || req.url.startsWith("/uploads/") || req.url.startsWith("/socket.io/")) {
    return proxyRequest(API_TARGET + req.url, req, res);
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;
  let filePath = path.join(DIST, pathname === "/" ? "index.html" : pathname);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(DIST, "index.html"), (err2, data2) => {
        if (err2) {
          res.writeHead(500);
          return res.end("500 Internal Server Error");
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data2);
      });
      return;
    }
    const ext = path.extname(filePath);
    const isAsset = req.url.startsWith("/assets/");
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": isAsset ? "public, immutable, max-age=31536000" : "no-store, no-cache, must-revalidate, proxy-revalidate",
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Docmaster frontend serving dist/ on port ${PORT}`);
  console.log(`Proxy /api/* and /uploads/* -> ${API_TARGET}`);
});
