const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { paths, ensureDirs, readCurrent, writeCurrent } = require("./paths");

const USER_AGENT = "AspectVisuals/1.0 (+https://aspectvisuals.su)";

function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(file);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function fileMatches(file, sha256, size) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) return false;
    if (typeof size === "number" && stat.size !== size) return false;
    return (await sha256File(file)) === sha256.toLowerCase();
  } catch (_) {
    return false;
  }
}

async function downloadTo(url, dest, expected, retries = 3) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(120000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      const actual = crypto.createHash("sha256").update(buffer).digest("hex");
      if (actual !== expected.toLowerCase()) {
        throw new Error(`SHA-256 не совпал (ожидался ${expected.slice(0, 12)}…)`);
      }

      fs.writeFileSync(dest, buffer);
      return;
    } catch (err) {
      lastError = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  throw new Error(`${path.basename(dest)}: ${lastError && lastError.message}`);
}

/**
 * Устанавливает версию из проверенного манифеста.
 *
 * Файлы собираются в staging и переносятся в releases только целиком:
 * прерванная загрузка не может повредить уже установленную версию.
 * Указатель current.json переключается последним.
 */
async function installRelease(manifest, onProgress = () => {}) {
  ensureDirs();

  const target = path.join(paths.releases, manifest.version);
  const staging = path.join(paths.staging, `${manifest.version}-${Date.now()}`);

  const current = readCurrent();
  const alreadyInstalled =
    current && current.version === manifest.version && fs.existsSync(target);

  // Проверяем уже установленное: повреждённый файл заставит переустановить
  if (alreadyInstalled) {
    let intact = true;
    let checked = 0;
    for (const file of manifest.files) {
      if (!(await fileMatches(path.join(target, file.path), file.sha256, file.size))) {
        intact = false;
        break;
      }
      checked += 1;
      onProgress({ stage: "verify", done: checked, total: manifest.files.length, label: "Проверяем файлы" });
    }
    if (intact) {
      return { version: manifest.version, dir: target, updated: false };
    }
  }

  fs.mkdirSync(staging, { recursive: true });

  try {
    let done = 0;
    for (const file of manifest.files) {
      const dest = path.join(staging, file.path);

      // Уже проверенный файл из текущей установки переносим вместо скачивания
      const existing = path.join(target, file.path);
      if (await fileMatches(existing, file.sha256, file.size)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(existing, dest);
      } else {
        await downloadTo(file.url, dest, file.sha256);
      }

      if (file.executable && process.platform !== "win32") {
        try { fs.chmodSync(dest, 0o755); } catch (_) {}
      }

      done += 1;
      onProgress({ stage: "download", done, total: manifest.files.length, label: "Загружаем клиент" });
    }

    onProgress({ stage: "apply", done: 0, total: 1, label: "Применяем обновление" });

    // Прежнюю версию не удаляем сразу: она остаётся для отката
    const backup = `${target}.old-${Date.now()}`;
    if (fs.existsSync(target)) fs.renameSync(target, backup);

    try {
      fs.renameSync(staging, target);
    } catch (err) {
      if (fs.existsSync(backup)) fs.renameSync(backup, target);
      throw err;
    }

    writeCurrent({ version: manifest.version, channel: manifest.channel, installedAt: new Date().toISOString() });

    if (fs.existsSync(backup)) {
      try { fs.rmSync(backup, { recursive: true, force: true }); } catch (_) {}
    }

    onProgress({ stage: "apply", done: 1, total: 1, label: "Обновление применено" });
    return { version: manifest.version, dir: target, updated: true };
  } finally {
    if (fs.existsSync(staging)) {
      try { fs.rmSync(staging, { recursive: true, force: true }); } catch (_) {}
    }
  }
}

module.exports = { installRelease, sha256File, fileMatches };
