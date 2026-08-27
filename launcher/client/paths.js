const path = require("path");
const os = require("os");
const fs = require("fs");

/** Каталог собственного клиента Aspect. */
function clientRoot() {
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "AspectVisuals");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "AspectVisuals");
  }
  return path.join(os.homedir(), ".aspectvisuals-client");
}

const ROOT = clientRoot();

const paths = {
  root: ROOT,
  releases: path.join(ROOT, "releases"),
  staging: path.join(ROOT, "staging"),
  // Указатель на установленную версию: позволяет откатиться, не удаляя файлы
  current: path.join(ROOT, "current.json"),
  logs: path.join(ROOT, "logs"),
  mods: path.join(ROOT, "mods"),
  resourcepacks: path.join(ROOT, "resourcepacks"),
};

function ensureDirs() {
  for (const dir of [paths.root, paths.releases, paths.staging, paths.logs, paths.mods, paths.resourcepacks]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readCurrent() {
  try {
    return JSON.parse(fs.readFileSync(paths.current, "utf8"));
  } catch (_) {
    return null;
  }
}

function writeCurrent(value) {
  fs.writeFileSync(paths.current, JSON.stringify(value, null, 2));
}

module.exports = { paths, ensureDirs, readCurrent, writeCurrent };
