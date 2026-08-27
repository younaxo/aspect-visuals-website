const fs = require("fs");
const path = require("path");

const { paths, ensureDirs } = require("./paths");
const { downloadFile } = require("./download");
const { installVanilla } = require("./vanilla");
const { installFabric } = require("./fabric");
const { ensureDefaultServer } = require("./servers");
const { findJava } = require("./java");

// Пока поддерживается одна версия, как и договаривались
const TARGET_VERSION = "1.21.4";
const MIN_JAVA = 21;

function safeName(name, fallback) {
  const clean = String(name || "").replace(/[^\w.\- ]+/g, "").trim();
  return clean || fallback;
}

/**
 * Полная подготовка клиента: ванильные файлы, Fabric, servers.dat.
 * onProgress получает { stage, done, total, label } для реального прогресс-бара.
 */
async function prepareClient(onProgress = () => {}) {
  ensureDirs();

  const LABELS = {
    meta: "Получаем описание версии",
    client: "Скачиваем клиент",
    libraries: "Скачиваем библиотеки",
    natives: "Распаковываем нативные библиотеки",
    assets: "Скачиваем ресурсы",
    "fabric-meta": "Получаем описание Fabric",
    "fabric-libraries": "Скачиваем библиотеки Fabric",
  };

  const report = (stage, done, total) =>
    onProgress({ stage, done, total, label: LABELS[stage] || stage });

  const vanilla = await installVanilla(TARGET_VERSION, report);
  const fabric = await installFabric(TARGET_VERSION, report);

  report("servers", 0, 1);
  const servers = ensureDefaultServer();
  report("servers", 1, 1);

  const java = await findJava(MIN_JAVA);

  return {
    version: TARGET_VERSION,
    root: paths.root,
    clientJar: vanilla.clientJar,
    nativesDir: vanilla.nativesDir,
    assetIndexId: vanilla.assetIndexId,
    mainClass: fabric.mainClass,
    loaderVersion: fabric.loaderVersion,
    libraries: [...vanilla.libraries, ...fabric.libraries],
    servers,
    java: java.java,
    javaInstalled: java.installed,
    minJava: MIN_JAVA,
  };
}

/** Скачивает файл мода или ресурспака в соответствующую папку клиента. */
async function installContent(kind, item) {
  ensureDirs();
  if (!item || !item.url) throw new Error("Не указана ссылка на файл");

  const dir = kind === "resourcepack" ? paths.resourcepacks : paths.mods;
  const fallback = kind === "resourcepack" ? "resourcepack.zip" : "mod.jar";
  const filename = safeName(item.filename || path.basename(new URL(item.url).pathname), fallback);
  const dest = path.join(dir, filename);

  await downloadFile(item.url, dest, { sha1: item.sha1, size: item.size });
  return { path: dest, filename };
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

function removeContent(kind, filename) {
  const dir = kind === "resourcepack" ? paths.resourcepacks : paths.mods;
  const clean = safeName(filename, "");
  if (!clean) throw new Error("Некорректное имя файла");

  const target = path.join(dir, clean);
  // Не даём выйти за пределы каталога
  if (!target.startsWith(dir)) throw new Error("Недопустимый путь");
  if (fs.existsSync(target)) fs.unlinkSync(target);
  return true;
}

module.exports = {
  TARGET_VERSION,
  MIN_JAVA,
  prepareClient,
  installContent,
  listInstalled,
  removeContent,
  paths,
};
