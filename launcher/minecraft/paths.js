const path = require("path");
const os = require("os");
const fs = require("fs");

/**
 * Каталог клиента. Держим его отдельно от .minecraft, чтобы не трогать
 * пользовательскую установку официального лаунчера.
 */
function gameRoot() {
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), ".aspectvisuals");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "aspectvisuals");
  }
  return path.join(os.homedir(), ".aspectvisuals");
}

const ROOT = gameRoot();

const paths = {
  root: ROOT,
  versions: path.join(ROOT, "versions"),
  libraries: path.join(ROOT, "libraries"),
  assets: path.join(ROOT, "assets"),
  assetObjects: path.join(ROOT, "assets", "objects"),
  assetIndexes: path.join(ROOT, "assets", "indexes"),
  natives: path.join(ROOT, "natives"),
  mods: path.join(ROOT, "mods"),
  resourcepacks: path.join(ROOT, "resourcepacks"),
  serversDat: path.join(ROOT, "servers.dat"),
};

function ensureDirs() {
  for (const dir of [
    paths.root,
    paths.versions,
    paths.libraries,
    paths.assets,
    paths.assetObjects,
    paths.assetIndexes,
    paths.natives,
    paths.mods,
    paths.resourcepacks,
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = { paths, ensureDirs, gameRoot };
