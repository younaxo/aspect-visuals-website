const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// Windows taskbar: show "Aspect Visuals" instead of "Electron"
app.setAppUserModelId("com.aspectvisuals.launcher");

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
      nodeIntegration: true,
      contextIsolation: false,
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

ipcMain.on("app-min", () => mainWindow && mainWindow.minimize());
ipcMain.on("app-max", () => {
  if (mainWindow) {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  }
});
ipcMain.on("app-close", () => mainWindow && mainWindow.close());

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
