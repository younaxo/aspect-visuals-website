const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const { paths, readCurrent } = require("./paths");

/**
 * Запуск клиента.
 *
 * Launch-токен передаётся в stdin, а не аргументом командной строки:
 * аргументы видны в списке процессов любому пользователю системы,
 * а stdin виден только самому процессу.
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

function launchClient({ dir, manifest, token, onExit }) {
  if (isRunning()) throw new Error("Клиент уже запущен");

  const exe = resolveExecutable(dir, manifest);
  if (!exe) throw new Error("В установленной версии нет исполняемого файла клиента");

  const logFile = path.join(paths.logs, `client-${Date.now()}.log`);
  fs.mkdirSync(paths.logs, { recursive: true });
  const log = fs.createWriteStream(logFile, { flags: "a" });

  const child = spawn(exe, [], {
    cwd: dir,
    // Токен уходит в stdin, поэтому его нет ни в аргументах, ни в окружении
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: false,
  });

  running = child;

  child.stdout.pipe(log);
  child.stderr.pipe(log);

  child.stdin.on("error", () => {
    // Клиент мог закрыться раньше, чем мы записали токен
  });
  child.stdin.write(`${token}\n`);
  child.stdin.end();

  child.on("exit", (code, signal) => {
    running = null;
    log.end();
    if (onExit) onExit({ code, signal, logFile });
  });

  child.on("error", (err) => {
    running = null;
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
