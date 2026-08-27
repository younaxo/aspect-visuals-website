const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const USER_AGENT = "AspectVisuals/1.0 (+https://aspectvisuals.su)";

function sha1File(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha1");
    const stream = fs.createReadStream(file);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/** Файл считается готовым, только если совпал размер и, при наличии, sha1. */
async function isValid(file, expectedSha1, expectedSize) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size === 0) return false;
    if (expectedSize && stat.size !== expectedSize) return false;
    if (expectedSha1) return (await sha1File(file)) === expectedSha1;
    return true;
  } catch (_) {
    return false;
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Не удалось загрузить ${url}: HTTP ${res.status}`);
  return res.json();
}

/**
 * Скачивает файл, если его ещё нет или он повреждён.
 * Возвращает true, если файл был реально скачан.
 */
async function downloadFile(url, dest, { sha1, size, retries = 3 } = {}) {
  if (await isValid(dest, sha1, size)) return false;

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;

  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(tmp, buffer);

      if (sha1) {
        const actual = crypto.createHash("sha1").update(buffer).digest("hex");
        if (actual !== sha1) throw new Error(`несовпадение sha1 (ожидался ${sha1})`);
      }

      fs.renameSync(tmp, dest);
      return true;
    } catch (err) {
      lastError = err;
      try { fs.existsSync(tmp) && fs.unlinkSync(tmp); } catch (_) {}
      if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }

  throw new Error(`Не удалось скачать ${path.basename(dest)}: ${lastError && lastError.message}`);
}

/** Скачивает список файлов с ограничением параллелизма и отчётом о прогрессе. */
async function downloadAll(items, { concurrency = 8, onProgress } = {}) {
  let done = 0;
  const total = items.length;
  let index = 0;
  const errors = [];

  async function worker() {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      try {
        await downloadFile(item.url, item.dest, { sha1: item.sha1, size: item.size });
      } catch (err) {
        errors.push(err.message);
      }
      done += 1;
      if (onProgress) onProgress(done, total);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, worker));

  if (errors.length) {
    throw new Error(`Ошибок при загрузке: ${errors.length}. Первая: ${errors[0]}`);
  }
}

module.exports = { downloadFile, downloadAll, fetchJson, sha1File, isValid };
