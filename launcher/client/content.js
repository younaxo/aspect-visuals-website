const fs = require("fs");
const path = require("path");

const { paths, ensureDirs } = require("./paths");

/**
 * Дополнительный контент клиента: моды и наборы ресурсов.
 * Файлы кладутся в каталог клиента, проверяются по SHA-256 из каталога источника.
 */

const USER_AGENT = "AspectVisuals/1.0 (+https://aspectvisuals.su)";

function dirFor(kind) {
  return kind === "resourcepack" ? paths.resourcepacks : paths.mods;
}

// Плюс и скобки в именах встречаются постоянно, разделители пути — нет
function safeName(name, fallback) {
  const clean = String(name || "")
    .replace(/[\/]/g, "")
    .replace(/[^\w.+\-()[\] ]+/g, "")
    .trim();
  return clean || fallback;
}

function assertPlainName(raw) {
  if (!raw || /[/\:]/.test(raw) || raw.includes("..")) {
    throw new Error("Недопустимое имя файла");
  }
}

async function installContent(kind, item) {
  ensureDirs();
  if (!item || !item.url) throw new Error("Не указана ссылка на файл");

  const fallback = kind === "resourcepack" ? "resourcepack.zip" : "mod.jar";
  const filename = safeName(item.filename || path.basename(new URL(item.url).pathname), fallback);
  const dest = path.join(dirFor(kind), filename);

  const res = await fetch(item.url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Не удалось скачать файл: HTTP ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());

  if (item.sha1) {
    const crypto = require("crypto");
    const actual = crypto.createHash("sha1").update(buffer).digest("hex");
    if (actual !== String(item.sha1).toLowerCase()) {
      throw new Error("Контрольная сумма файла не совпала");
    }
  }

  fs.writeFileSync(dest, buffer);
  return { path: dest, filename };
}

function removeContent(kind, filename) {
  const raw = String(filename || "");
  assertPlainName(raw);

  const dir = dirFor(kind);
  const clean = safeName(raw, "");
  if (!clean) throw new Error("Некорректное имя файла");

  const target = path.resolve(dir, clean);
  if (path.dirname(target) !== path.resolve(dir)) throw new Error("Недопустимый путь");

  if (!fs.existsSync(target)) return false;
  fs.unlinkSync(target);
  return true;
}

function listInstalled() {
  ensureDirs();
  const read = (dir) => {
    try {
      return fs.readdirSync(dir).filter((f) => !f.startsWith(".") && !f.endsWith(".part"));
    } catch (_) {
      return [];
    }
  };
  return { mods: read(paths.mods), resourcepacks: read(paths.resourcepacks) };
}

module.exports = { installContent, removeContent, listInstalled };
