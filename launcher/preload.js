const { contextBridge, ipcRenderer } = require("electron");

/**
 * Мост между renderer и main.
 * Renderer не получает доступ к Node.js API: наружу отдаётся только
 * перечисленный ниже набор операций, каждая из которых проверяется в main.
 */

let siteConfig = { apiUrl: "https://aspectvisuals.su", siteUrl: "https://aspectvisuals.su", turnstileSiteKey: "" };
try {
  const loaded = require("./site-config.js");
  if (loaded && typeof loaded === "object") {
    siteConfig = {
      apiUrl: String(loaded.apiUrl || siteConfig.apiUrl),
      siteUrl: String(loaded.siteUrl || siteConfig.siteUrl),
      turnstileSiteKey: String(loaded.turnstileSiteKey || ""),
    };
  }
} catch (err) {
  console.warn("[preload] site-config.js:", err.message || err);
}

contextBridge.exposeInMainWorld("av", {
  // Конфигурация читается один раз и отдаётся копией, чтобы renderer её не мутировал
  getSiteConfig: () => ({ ...siteConfig }),

  window: {
    minimize: () => ipcRenderer.send("app-min"),
    maximize: () => ipcRenderer.send("app-max"),
    close: () => ipcRenderer.send("app-close"),
  },

  // Ссылку открывает main после проверки по allowlist
  openExternal: (url) => ipcRenderer.invoke("open-external", String(url || "")),

  discordOAuth: () => ipcRenderer.invoke("discord-oauth"),

  telegramOAuth: () => ipcRenderer.invoke("telegram-oauth"),
});
