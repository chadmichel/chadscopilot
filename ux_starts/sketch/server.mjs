import http from "node:http";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 7777;

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);

const hmrClients = new Set();
let reloadTimer = null;

function broadcastReload() {
  for (const res of hmrClients) {
    res.write(`event: reload\ndata: ${Date.now()}\n\n`);
  }
}

function scheduleReload() {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    broadcastReload();
  }, 75);
}

function shouldTriggerReload(filename) {
  if (!filename) return true;
  if (filename.includes("node_modules")) return false;
  if (filename.endsWith(".DS_Store")) return false;
  const ext = path.extname(filename).toLowerCase();
  return ext === ".html" || ext === ".css" || ext === ".js" || ext === ".mjs" || ext === ".json";
}

function safeResolveUrlToFile(requestUrl) {
  const urlPath = requestUrl.split("?")[0] || "/";
  const decoded = decodeURIComponent(urlPath);
  const normalized = path.posix.normalize(decoded);
  const cleaned = normalized.replace(/^(\.\.(\/|\\|$))+/, "");
  const asPath = cleaned === "/" ? "/index.html" : cleaned;
  return path.join(__dirname, asPath);
}

const server = http.createServer(async (req, res) => {
  try {
    const method = req.method || "GET";
    if (method !== "GET" && method !== "HEAD") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Method Not Allowed");
      return;
    }

    if ((req.url || "/").split("?")[0] === "/__hmr") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive"
      });

      res.write("event: connected\ndata: ok\n\n");
      hmrClients.add(res);

      req.on("close", () => {
        hmrClients.delete(res);
      });

      return;
    }

    const filePath = safeResolveUrlToFile(req.url || "/");
    const relative = path.relative(__dirname, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes.get(ext) || "application/octet-stream",
      "Cache-Control": "no-store"
    });

    if (method === "HEAD") {
      res.end();
      return;
    }

    const data = await fs.readFile(filePath);
    res.end(data);
  } catch (err) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`Sketch server running at http://127.0.0.1:${PORT}`);
});

try {
  const watcher = fsSync.watch(__dirname, { recursive: true }, (_eventType, filename) => {
    if (!shouldTriggerReload(filename?.toString())) return;
    scheduleReload();
  });

  server.on("close", () => watcher.close());
} catch {
  // If recursive watch isn't supported, the server still works (just without HMR).
}

