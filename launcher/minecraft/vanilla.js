const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const { paths, ensureDirs } = require("./paths");
const { downloadFile, downloadAll, fetchJson } = require("./download");

const VERSION_MANIFEST = "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";
const RESOURCES = "https://resources.download.minecraft.net";

function currentOsName() {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "osx";
  return "linux";
}

/** Правила allow/disallow из манифеста: определяют, нужна ли библиотека на этой ОС. */
function rulesAllow(rules) {
  if (!rules || !rules.length) return true;
  let allowed = false;
  for (const rule of rules) {
    const osRule = rule.os;
    let matches = true;
    if (osRule && osRule.name) matches = osRule.name === currentOsName();
    if (matches) allowed = rule.action === "allow";
  }
  return allowed;
}

function nativeClassifier(library) {
  const natives = library.natives;
  if (!natives) return null;
  const key = natives[currentOsName()];
  if (!key) return null;
  return key.replace("${arch}", process.arch === "x64" ? "64" : "32");
}

/** Токен ОС в maven-именах natives: там macos, а не osx. */
function mavenOsToken() {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "macos";
  return "linux";
}

/**
 * С версии 1.19 Mojang не использует ключ natives и downloads.classifiers.
 * Нативные библиотеки приходят обычными артефактами с ":natives-<os>" в имени,
 * поэтому их нужно опознавать по имени и всё равно распаковывать.
 */
function nativeTokenMatches(name) {
  const marker = ":natives-";
  const at = name.indexOf(marker);
  if (at === -1) return false;

  const token = name.slice(at + marker.length);
  const os = mavenOsToken();
  const isArm = process.arch === "arm64";

  if (token === os) return !isArm;
  if (token === `${os}-arm64`) return isArm;
  // macos-patch поставляется дополнением к основному нативу
  if (token === `${os}-patch`) return true;
  return false;
}

async function getVersionList() {
  const manifest = await fetchJson(VERSION_MANIFEST);
  return manifest.versions.map((v) => ({ id: v.id, type: v.type, url: v.url, releaseTime: v.releaseTime }));
}

async function getVersionMeta(versionId) {
  const manifest = await fetchJson(VERSION_MANIFEST);
  const entry = manifest.versions.find((v) => v.id === versionId);
  if (!entry) throw new Error(`Версия ${versionId} не найдена в манифесте Mojang`);

  const dir = path.join(paths.versions, versionId);
  const file = path.join(dir, `${versionId}.json`);
  await downloadFile(entry.url, file, { sha1: entry.sha1 });
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** Библиотеки, подходящие под текущую ОС: обычные артефакты и natives. */
function collectLibraries(meta) {
  const artifacts = [];
  const natives = [];

  for (const library of meta.libraries || []) {
    if (!rulesAllow(library.rules)) continue;
    const downloads = library.downloads || {};

    if (downloads.artifact && downloads.artifact.path) {
      const dest = path.join(paths.libraries, downloads.artifact.path.split("/").join(path.sep));
      artifacts.push({
        url: downloads.artifact.url,
        dest,
        sha1: downloads.artifact.sha1,
        size: downloads.artifact.size,
      });

      // Современный формат: натив опознаётся по имени, а не по classifiers
      if (library.name && nativeTokenMatches(library.name)) {
        natives.push({ dest, exclude: (library.extract && library.extract.exclude) || [] });
      }
    }

    const classifier = nativeClassifier(library);
    if (classifier && downloads.classifiers && downloads.classifiers[classifier]) {
      const native = downloads.classifiers[classifier];
      const dest = path.join(paths.libraries, native.path.split("/").join(path.sep));
      artifacts.push({ url: native.url, dest, sha1: native.sha1, size: native.size });
      natives.push({ dest, exclude: (library.extract && library.extract.exclude) || [] });
    }
  }

  return { artifacts, natives };
}

function extractNatives(natives, versionId) {
  const target = path.join(paths.natives, versionId);
  fs.mkdirSync(target, { recursive: true });

  // Извлекаем только сами бинарники: остальное в java.library.path не нужно
  const NATIVE_EXT = [".dll", ".so", ".dylib", ".jnilib"];

  for (const item of natives) {
    const zip = new AdmZip(item.dest);
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const name = entry.entryName;
      if (name.startsWith("META-INF/")) continue;
      if (item.exclude.some((prefix) => name.startsWith(prefix))) continue;

      const base = path.basename(name);
      const lower = base.toLowerCase();
      if (!NATIVE_EXT.some((ext) => lower.endsWith(ext))) continue;

      // Раскладываем плоско: JVM ищет библиотеки в java.library.path
      fs.writeFileSync(path.join(target, base), entry.getData());
    }
  }

  return target;
}

/**
 * Полная установка ванильной версии.
 * onProgress(stage, done, total) вызывается для отображения реального прогресса.
 */
async function installVanilla(versionId, onProgress = () => {}) {
  ensureDirs();

  onProgress("meta", 0, 1);
  const meta = await getVersionMeta(versionId);
  onProgress("meta", 1, 1);

  // 1. Клиентский jar
  onProgress("client", 0, 1);
  const clientJar = path.join(paths.versions, versionId, `${versionId}.jar`);
  await downloadFile(meta.downloads.client.url, clientJar, {
    sha1: meta.downloads.client.sha1,
    size: meta.downloads.client.size,
  });
  onProgress("client", 1, 1);

  // 2. Библиотеки и natives
  const { artifacts, natives } = collectLibraries(meta);
  await downloadAll(artifacts, { onProgress: (d, t) => onProgress("libraries", d, t) });

  onProgress("natives", 0, 1);
  const nativesDir = extractNatives(natives, versionId);
  onProgress("natives", 1, 1);

  // 3. Ассеты
  const assetIndex = meta.assetIndex;
  const indexFile = path.join(paths.assetIndexes, `${assetIndex.id}.json`);
  await downloadFile(assetIndex.url, indexFile, { sha1: assetIndex.sha1 });
  const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));

  const assetItems = Object.values(index.objects || {}).map((obj) => {
    const sub = obj.hash.slice(0, 2);
    return {
      url: `${RESOURCES}/${sub}/${obj.hash}`,
      dest: path.join(paths.assetObjects, sub, obj.hash),
      sha1: obj.hash,
      size: obj.size,
    };
  });
  await downloadAll(assetItems, { concurrency: 16, onProgress: (d, t) => onProgress("assets", d, t) });

  return {
    versionId,
    meta,
    clientJar,
    nativesDir,
    assetIndexId: assetIndex.id,
    libraries: artifacts.map((a) => a.dest),
  };
}

module.exports = { installVanilla, getVersionList, getVersionMeta, collectLibraries, rulesAllow };
