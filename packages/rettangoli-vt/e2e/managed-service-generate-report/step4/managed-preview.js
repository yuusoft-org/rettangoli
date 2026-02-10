const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const port = Number(process.argv[2] || 3001);
const rootDir = process.cwd();
const siteRoot = path.join(rootDir, ".rettangoli", "vt", "_site");
const stopMarkerPath = path.join(rootDir, ".service-stopped");

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  return "application/octet-stream";
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  let requestPath = decodeURIComponent(url.pathname);

  if (requestPath === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }

  const normalized = requestPath.replace(/^\/+/, "");
  const filePath = path.join(siteRoot, normalized);

  if (!filePath.startsWith(siteRoot) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("not found");
    return;
  }

  res.writeHead(200, { "Content-Type": getContentType(filePath) });
  res.end(fs.readFileSync(filePath));
});

function shutdown() {
  server.close(() => {
    fs.writeFileSync(stopMarkerPath, "stopped\n", "utf8");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

server.listen(port, "127.0.0.1");
