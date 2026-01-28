const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "visits.json");
const PUBLIC_DIR = path.join(__dirname, "..");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function readVisits() {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeVisits(visits) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(visits, null, 2), "utf8");
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  let ip = Array.isArray(xff) ? xff[0] : xff?.split(",")[0]?.trim();
  if (!ip) ip = req.socket.remoteAddress || "";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip === "::1") ip = "127.0.0.1";
  return ip;
}

function fetchGeo(ip) {
  return new Promise((resolve) => {
    if (!ip || ip === "127.0.0.1") {
      resolve(null);
      return;
    }

    const url = `https://ipapi.co/${ip}/json/`;
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      })
      .on("error", () => resolve(null));
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html";
    case ".css":
      return "text/css";
    case ".js":
      return "application/javascript";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".mp4":
      return "video/mp4";
    default:
      return "application/octet-stream";
  }
}

function serveStatic(req, res) {
  let reqPath = decodeURIComponent(req.url.split("?")[0]);
  if (reqPath === "/") reqPath = "/index.html";

  const filePath = path.join(PUBLIC_DIR, reqPath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": getContentType(filePath) });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.url.startsWith("/api/visits")) {
    const visits = readVisits();
    sendJson(res, 200, { visits });
    return;
  }

  if (req.url.startsWith("/api/visit") && req.method === "POST") {
    const ip = getClientIp(req);
    const geo = await fetchGeo(ip);
    const visit = {
      ip,
      city: geo?.city || "",
      region: geo?.region || geo?.region_code || "",
      country: geo?.country_name || geo?.country || "",
      latitude: geo?.latitude || geo?.lat || "",
      longitude: geo?.longitude || geo?.lon || "",
      timezone: geo?.timezone || "",
      userAgent: req.headers["user-agent"] || "",
      time: new Date().toISOString(),
    };

    const visits = readVisits();
    visits.push(visit);
    writeVisits(visits);
    sendJson(res, 200, { ok: true, visit });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Visitor tracker running at http://localhost:${PORT}`);
});
