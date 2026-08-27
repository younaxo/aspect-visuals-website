const { paths, ensureDirs, readCurrent } = require("./paths");
const { getVerifiedManifest } = require("./manifest");
const { installRelease } = require("./installer");
const { launchClient, stopClient, isRunning, installedVersion } = require("./launch");
const { installContent, removeContent, listInstalled } = require("./content");

/**
 * Полный цикл запуска собственного клиента:
 * проверенный манифест -> установка по SHA-256 -> одноразовый токен -> запуск.
 *
 * Токен запрашивается последним и живёт секунды, поэтому не успевает
 * устареть за время загрузки файлов.
 */
async function prepareAndLaunch({ apiUrl, accessToken, channel = "stable", onProgress = () => {}, onExit }) {
  ensureDirs();

  onProgress({ stage: "manifest", done: 0, total: 1, label: "Проверяем версию" });
  const manifest = await getVerifiedManifest(apiUrl, channel);
  onProgress({ stage: "manifest", done: 1, total: 1, label: "Манифест подтверждён" });

  const installed = await installRelease(manifest, onProgress);

  onProgress({ stage: "token", done: 0, total: 1, label: "Запрашиваем доступ" });
  const res = await fetch(`${apiUrl}/api/launch/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(15000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(data.message || "Не удалось получить доступ к запуску");
  }
  onProgress({ stage: "token", done: 1, total: 1, label: "Доступ получен" });

  const started = launchClient({
    dir: installed.dir,
    manifest,
    token: data.token,
    onExit,
  });

  return {
    version: manifest.version,
    channel: manifest.channel,
    updated: installed.updated,
    pid: started.pid,
    logFile: started.logFile,
  };
}

function status() {
  const current = readCurrent();
  return {
    root: paths.root,
    installed: installedVersion(),
    version: current ? current.version : null,
    running: isRunning(),
    content: listInstalled(),
  };
}

module.exports = { prepareAndLaunch, stopClient, isRunning, status, paths, installContent, removeContent, listInstalled };
