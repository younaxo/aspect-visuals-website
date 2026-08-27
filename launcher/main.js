const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

// Windows taskbar: show "Aspect Visuals" instead of "Electron"
app.setAppUserModelId("com.aspectvisuals.launcher");
// Имя процесса и приложения: в собранной сборке электрон не должен светиться
app.setName("Aspect Visuals");

// Иконка для всех окон приложения, включая окна OAuth
function appIcon() {
  const ico = path.join(__dirname, "icon.ico");
  const png = path.join(__dirname, "icon.png");
  if (fs.existsSync(ico)) return ico;
  if (fs.existsSync(png)) return png;
  return undefined;
}

// Fix: skip logged-out Discord IPC pipes (Stable + Canary)
(() => {
  try {
    const target = require.resolve("discord-rpc/src/transports/ipc");
    const patch = path.join(__dirname, "discord-rpc-ipc.patch.js");
    if (fs.existsSync(patch)) {
      fs.copyFileSync(patch, target);
      console.log("[Discord RPC] IPC multi-pipe patch applied");
    }
  } catch (err) {
    console.warn("[Discord RPC] IPC patch skipped:", err.message);
  }
})();

const DiscordRPC = require("discord-rpc");

const clientId = "1541884171822047335";
let mainWindow;
let rpc;
let activityTimer = null;
const startTimestamp = Date.now();

app.commandLine.appendSwitch("disable-gpu-sandbox");

function createWindow() {
  const iconPath = path.join(__dirname, "icon.png");
  const iconIco = path.join(__dirname, "icon.ico");
  const icon = fs.existsSync(iconIco)
    ? iconIco
    : fs.existsSync(iconPath)
      ? iconPath
      : path.join(__dirname, "icon.png");

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 1100,
    minHeight: 720,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: true,
    fullscreenable: false,
    title: "Aspect Visuals",
    icon: path.join(__dirname, "icon.png"),
    backgroundColor: "#00000000",
    hasShadow: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, "preload.js"),
      autoplayPolicy: "no-user-gesture-required",
    },
  });

  // Ensure Windows picks up product name + icon
  mainWindow.setTitle("Aspect Visuals");
  if (fs.existsSync(icon)) {
    try {
      mainWindow.setIcon(icon);
    } catch (_) {}
  }

  // Главное окно ничего не открывает само: любые popup и переходы блокируются,
  // внешние ссылки идут через проверенный канал open-external
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void openExternalSafely(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) event.preventDefault();
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function setActivity() {
  if (!rpc) return;
  rpc
    .setActivity({
      details: "Современные визуалы",
      state: "Версия 1.21.4",
      startTimestamp: startTimestamp,
      largeImageKey: "logo",
      largeImageText: "Aspect Visuals",
      instance: false,
      buttons: [{ label: "Сайт", url: "https://aspectvisuals.su" }],
    })
    .then(() => {
      console.log("[Discord RPC] Статус успешно отправлен в Discord!");
    })
    .catch((err) => {
      console.error(
        "[Discord RPC] Ошибка при отправке активности:",
        err.message
      );
    });
}

function initDiscordRPC() {
  console.log("[Discord RPC] Попытка инициализации...");
  try {
    if (rpc) {
      try {
        rpc.removeAllListeners();
        rpc.destroy();
      } catch (_) {}
      rpc = null;
    }
  } catch (_) {}

  DiscordRPC.register(clientId);
  rpc = new DiscordRPC.Client({ transport: "ipc" });

  rpc.on("ready", () => {
    console.log("[Discord RPC] Готово! Соединение с Discord установлено!");
    setActivity();
    if (activityTimer) clearInterval(activityTimer);
    activityTimer = setInterval(setActivity, 15000);
  });

  rpc.login({ clientId }).catch((err) => {
    console.error(
      "[Discord RPC] Ошибка входа (проверьте, запущен ли Discord):",
      err.message
    );
    setTimeout(initDiscordRPC, 10000);
  });
}

function shutdownDiscord() {
  if (activityTimer) {
    clearInterval(activityTimer);
    activityTimer = null;
  }
  if (!rpc) return;
  try {
    rpc.clearActivity().catch(() => {});
    rpc.destroy();
  } catch (_) {}
  rpc = null;
}

// Во внешнем браузере разрешаем открывать только известные домены проекта
const EXTERNAL_ALLOWLIST = [
  "aspectvisuals.su",
  "cdn-files.aspectvisuals.su",
  "discord.gg",
  "discord.com",
  "t.me",
  "telegram.me",
  "youtube.com",
  "www.youtube.com",
  "tiktok.com",
  "www.tiktok.com",
  "modrinth.com",
  "www.modrinth.com",
  "curseforge.com",
  "www.curseforge.com",
];

async function openExternalSafely(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || ""));
  } catch (_) {
    return { ok: false, reason: "Некорректная ссылка" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "Разрешены только https-ссылки" };
  }

  const host = parsed.hostname.toLowerCase();
  const allowed = EXTERNAL_ALLOWLIST.some((item) => host === item || host.endsWith("." + item));
  if (!allowed) {
    console.warn("[external] заблокирован переход на", host);
    return { ok: false, reason: "Домен не разрешён" };
  }

  await shell.openExternal(parsed.toString());
  return { ok: true };
}

ipcMain.handle("open-external", (_event, url) => openExternalSafely(url));

ipcMain.on("app-min", () => mainWindow && mainWindow.minimize());
ipcMain.on("app-max", () => {
  if (mainWindow) {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  }
});
ipcMain.on("app-close", () => mainWindow && mainWindow.close());

const CALLBACK_PREFIX = "https://aspectvisuals.su/auth/discord/callback";

function loadSiteConfig() {
  try {
    return require("./site-config.js");
  } catch (_) {
    return { apiUrl: "https://aspectvisuals.su", siteUrl: "https://aspectvisuals.su" };
  }
}

ipcMain.handle("discord-oauth", async () => {
  const cfg = loadSiteConfig();
  const apiUrl = String(cfg.apiUrl || "https://aspectvisuals.su").replace(/\/$/, "");
  const authRes = await fetch(`${apiUrl}/api/auth/discord`);
  const authJson = await authRes.json().catch(() => ({}));
  if (!authRes.ok || !authJson.url) {
    throw new Error(authJson.message || "Не удалось начать вход через Discord");
  }

  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (err, payload) => {
      if (settled) return
      settled = true
      if (oauthWin && !oauthWin.isDestroyed()) oauthWin.close()
      if (err) reject(err)
      else resolve(payload)
    }

    const oauthWin = new BrowserWindow({
      parent: mainWindow || undefined,
      modal: Boolean(mainWindow),
      width: 520,
      height: 740,
      title: "Aspect Visuals — Discord",
      icon: appIcon(),
      autoHideMenuBar: true,
      backgroundColor: "#09090b",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    const tryCapture = (navUrl) => {
      let parsed
      try {
        parsed = new URL(String(navUrl || ""))
      } catch (_) {
        return false
      }

      // Callback принимаем только с ожидаемого origin и пути, а не по подстроке URL
      const expected = new URL(CALLBACK_PREFIX)
      if (parsed.origin !== expected.origin || parsed.pathname !== expected.pathname) return false

      try {
        const error = parsed.searchParams.get("error")
        const code = parsed.searchParams.get("code")
        const state = parsed.searchParams.get("state")
        if (error) {
          finish(new Error(error === "access_denied" ? "Вход через Discord отменён" : "Ошибка Discord OAuth"))
          return true
        }
        if (!code || !state) {
          finish(new Error("Discord не вернул код авторизации"))
          return true
        }
        finish(null, { code, state })
        return true
      } catch (_) {
        return false
      }
    }

    // OAuth-окно не должно открывать popup и уходить на посторонние адреса
    oauthWin.webContents.setWindowOpenHandler(() => ({ action: "deny" }))

    const ALLOWED_OAUTH_ORIGINS = [
      "https://discord.com",
      "https://discordapp.com",
      new URL(CALLBACK_PREFIX).origin,
    ]

    const isAllowedOAuthUrl = (navUrl) => {
      try {
        return ALLOWED_OAUTH_ORIGINS.indexOf(new URL(String(navUrl || "")).origin) !== -1
      } catch (_) {
        return false
      }
    }

    oauthWin.webContents.on("will-redirect", (event, url) => {
      if (tryCapture(url)) { event.preventDefault(); return }
      if (!isAllowedOAuthUrl(url)) event.preventDefault()
    })
    oauthWin.webContents.on("will-navigate", (event, url) => {
      if (tryCapture(url)) { event.preventDefault(); return }
      if (!isAllowedOAuthUrl(url)) event.preventDefault()
    })
    oauthWin.webContents.on("did-navigate", (_event, url) => {
      tryCapture(url)
    })
    oauthWin.webContents.on("did-redirect-navigation", (_event, url) => {
      tryCapture(url)
    })

    oauthWin.on("closed", () => {
      finish(new Error("Вход через Discord закрыт"))
    })

    oauthWin.loadURL(authJson.url)
  })
})

const TELEGRAM_CALLBACK = "https://aspectvisuals.su/auth/telegram/callback";

ipcMain.handle("telegram-oauth", async () => {
  const cfg = loadSiteConfig();
  const apiUrl = String(cfg.apiUrl || "https://aspectvisuals.su").replace(/\/$/, "");

  const configRes = await fetch(`${apiUrl}/api/auth/telegram/config`);
  const configJson = await configRes.json().catch(() => ({}));
  if (!configRes.ok || !configJson.botId) {
    throw new Error(configJson.message || "Вход через Telegram пока недоступен");
  }

  const expected = new URL(TELEGRAM_CALLBACK);
  const authUrl =
    "https://oauth.telegram.org/auth?" +
    new URLSearchParams({
      bot_id: String(configJson.botId),
      origin: expected.origin,
      return_to: TELEGRAM_CALLBACK,
      request_access: "write",
    }).toString();

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (err, payload) => {
      if (settled) return;
      settled = true;
      if (win && !win.isDestroyed()) win.close();
      if (err) reject(err);
      else resolve(payload);
    };

    const win = new BrowserWindow({
      parent: mainWindow || undefined,
      modal: Boolean(mainWindow),
      width: 520,
      height: 640,
      title: "Aspect Visuals — Telegram",
      icon: appIcon(),
      autoHideMenuBar: true,
      backgroundColor: "#09090b",
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

    // Telegram возвращает результат во фрагменте #tgAuthResult=<base64url(json)>
    const tryCapture = (navUrl) => {
      let parsed;
      try {
        parsed = new URL(String(navUrl || ""));
      } catch (_) {
        return false;
      }
      if (parsed.origin !== expected.origin || parsed.pathname !== expected.pathname) return false;

      const match = /tgAuthResult=([^&]+)/.exec(parsed.hash || "");
      if (!match) {
        finish(new Error("Telegram не вернул данные авторизации"));
        return true;
      }

      try {
        const base64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
        const json = Buffer.from(base64, "base64").toString("utf8");
        finish(null, JSON.parse(json));
      } catch (_) {
        finish(new Error("Не удалось разобрать ответ Telegram"));
      }
      return true;
    };

    const ALLOWED = ["https://oauth.telegram.org", "https://telegram.org", expected.origin];
    const allowed = (navUrl) => {
      try {
        return ALLOWED.indexOf(new URL(String(navUrl || "")).origin) !== -1;
      } catch (_) {
        return false;
      }
    };

    win.webContents.on("will-redirect", (event, url) => {
      if (tryCapture(url)) { event.preventDefault(); return; }
      if (!allowed(url)) event.preventDefault();
    });
    win.webContents.on("will-navigate", (event, url) => {
      if (tryCapture(url)) { event.preventDefault(); return; }
      if (!allowed(url)) event.preventDefault();
    });
    win.webContents.on("did-redirect-navigation", (_event, url) => { tryCapture(url); });
    win.webContents.on("did-navigate", (_event, url) => { tryCapture(url); });

    win.on("closed", () => finish(new Error("Вход через Telegram закрыт")));

    win.loadURL(authUrl);
  });
});

app.whenReady().then(() => {
  createWindow();
  initDiscordRPC();
});

app.on("window-all-closed", () => {
  shutdownDiscord();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  shutdownDiscord();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
