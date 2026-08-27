const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const { paths, readCurrent } = require("./paths");
const { createHandshake } = require("./handshake");

/**
 * Запуск клиента.
 *
 * Токен не идёт ни аргументом, ни через stdin: аргументы видны всей системе,
 * а Electron на Windows собран как GUI-приложение и рабочего stdin от пайпа
 * не получает. Вместо этого поднимается одноразовый локальный обмен,
 * клиенту передаётся только его адрес с одноразовым секретом.
 */

let running = null;

function isRunning() {
  return Boolean(running && running.exitCode === null && !running.killed);
}

function resolveExecutable(dir, manifest) {
  const declared = manifest && manifest.files && manifest.files.find((f) => f.executable);
  const candidates = [];

  if (declared) candidates.push(declared.path);
  candidates.push(
    process.platform === "win32" ? "AspectVisuals.exe" : "AspectVisuals",
    process.platform === "win32" ? "client.exe" : "client",
  );

  for (const rel of candidates) {
    const full = path.join(dir, rel);
    // Проверяем, что путь не вывел за каталог версии
    if (full.startsWith(dir) && fs.existsSync(full)) return full;
  }

  return null;
}

async function launchClient({ dir, manifest, token, onExit }) {
  if (isRunning()) throw new Error("Клиент уже запущен");

  const exe = resolveExecutable(dir, manifest);
  if (!exe) throw new Error("В установленной версии нет исполняемого файла клиента");

  const logFile = path.join(paths.logs, `client-${Date.now()}.log`);
  fs.mkdirSync(paths.logs, { recursive: true });
  const log = fs.createWriteStream(logFile, { flags: "a" });

  // Клиент получает только адрес обмена: сам токен по нему выдаётся один раз
  const handshake = await createHandshake(token);

  const child = spawn(exe, [`--aspect-handshake=${handshake.url}`], {
    cwd: dir,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: false,
  });

  running = child;

  child.stdout.pipe(log);
  child.stderr.pipe(log);

  child.on("exit", (code, signal) => {
    running = null;
    handshake.close();
    log.end();
    if (onExit) onExit({ code, signal, logFile });
  });

  child.on("error", (err) => {
    running = null;
    handshake.close();
    log.end();
    if (onExit) onExit({ code: null, signal: null, logFile, error: err.message });
  });

  return { pid: child.pid, executable: exe, logFile };
}

function stopClient() {
  if (!isRunning()) return false;
  running.kill();
  return true;
}

function installedVersion() {
  const current = readCurrent();
  if (!current) return null;
  const dir = path.join(paths.releases, current.version);
  return fs.existsSync(dir) ? { ...current, dir } : null;
}

module.exports = { launchClient, stopClient, isRunning, installedVersion, resolveExecutable };
