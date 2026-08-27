const fs = require("fs");
const path = require("path");

const { paths } = require("./paths");
const { downloadFile, downloadAll, fetchJson } = require("./download");

const FABRIC_META = "https://meta.fabricmc.net/v2";
const FABRIC_MAVEN = "https://maven.fabricmc.net/";

/** maven-координаты вида group:artifact:version -> относительный путь в libraries */
function mavenPath(coordinate) {
  const [group, artifact, version] = coordinate.split(":");
  return path.join(...group.split("."), artifact, version, `${artifact}-${version}.jar`);
}

function mavenUrl(coordinate, base) {
  const [group, artifact, version] = coordinate.split(":");
  return `${base}${group.split(".").join("/")}/${artifact}/${version}/${artifact}-${version}.jar`;
}

async function getLoaderVersions(gameVersion) {
  const list = await fetchJson(`${FABRIC_META}/versions/loader/${encodeURIComponent(gameVersion)}`);
  return list.map((item) => ({ loader: item.loader.version, stable: item.loader.stable }));
}

/**
 * Устанавливает Fabric поверх уже установленной ванильной версии.
 * Возвращает данные, необходимые для запуска: mainClass и дополнительные библиотеки.
 */
async function installFabric(gameVersion, onProgress = () => {}, loaderVersion) {
  onProgress("fabric-meta", 0, 1);

  let loader = loaderVersion;
  if (!loader) {
    const versions = await getLoaderVersions(gameVersion);
    const stable = versions.find((v) => v.stable) || versions[0];
    if (!stable) throw new Error(`Fabric не поддерживает версию ${gameVersion}`);
    loader = stable.loader;
  }

  const profile = await fetchJson(
    `${FABRIC_META}/versions/loader/${encodeURIComponent(gameVersion)}/${encodeURIComponent(loader)}/profile/json`,
  );
  onProgress("fabric-meta", 1, 1);

  // Сохраняем профиль рядом с версией, чтобы установку можно было воспроизвести
  const profileId = profile.id || `fabric-loader-${loader}-${gameVersion}`;
  const profileDir = path.join(paths.versions, profileId);
  fs.mkdirSync(profileDir, { recursive: true });
  fs.writeFileSync(path.join(profileDir, `${profileId}.json`), JSON.stringify(profile, null, 2));

  const items = [];
  const libs = [];
  for (const library of profile.libraries || []) {
    if (!library.name) continue;
    const rel = mavenPath(library.name);
    const dest = path.join(paths.libraries, rel);
    libs.push(dest);
    items.push({ url: mavenUrl(library.name, library.url || FABRIC_MAVEN), dest });
  }

  await downloadAll(items, { concurrency: 6, onProgress: (d, t) => onProgress("fabric-libraries", d, t) });

  return {
    profileId,
    loaderVersion: loader,
    mainClass: profile.mainClass,
    libraries: libs,
    arguments: profile.arguments || null,
  };
}

module.exports = { installFabric, getLoaderVersions };
