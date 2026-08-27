const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const { readLaunchToken, openSession, startHeartbeat, closeSession } = require("./session");

app.setAppUserModelId("com.aspectvisuals.client");
app.setName("AspectVisuals");

function apiUrl() {
  try {
    return String(require("./config.js").apiUrl || "https://aspectvisuals.su").replace(/\/$/, "");
  } catch (_) {
    return "https://aspectvisuals.su";
  }
}

let win = null;
let session = null;
let stopHeartbeat = null;
let state = { status: "connecting", message: "Подключаемся к Aspect Visuals…" };

function pushState(next) {
  state = { ...state, ...next };
  if (win && !win.isDestroyed()) win.webContents.send("session-state", state);
}

function createWindow() {
  win = new BrowserWindow({
    width: 880,
    height: 560,
    minWidth: 720,
    minHeight: 480,
    title: "Aspect Visuals",
    backgroundColor: "#09090b",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) event.preventDefault();
  });

  win.loadFile(path.join(__dirname, "index.html"));
  win.once("ready-to-show", () => win.show());
  win.webContents.on("did-finish-load", () => pushState({}));
  win.on("closed", () => { win = null; });
}

async function connect() {
  const api = apiUrl();
  try {
    const token = await readLaunchToken();
    pushState({ status: "connecting", message: "Проверяем доступ…" });

    session = await openSession(api, token);

    stopHeartbeat = startHeartbeat(api, session, (reason) => {
      pushState({ warning: reason });
    });

    pushState({
      status: "online",
      message: "Сессия активна",
      username: session.username,
      userId: session.userId,
      sessionId: session.id,
      roles: session.roles,
      warning: null,
    });
  } catch (err) {
    pushState({ status: "error", message: (err && err.message) || "Не удалось подключиться" });
  }
}

ipcMain.on("quit", () => app.quit());

app.whenReady().then(() => {
  createWindow();
  void connect();
});

app.on("window-all-closed", () => app.quit());

app.on("before-quit", async (event) => {
  if (stopHeartbeat) { stopHeartbeat(); stopHeartbeat = null; }
  if (session) {
    const closing = session;
    session = null;
    event.preventDefault();
    await closeSession(apiUrl(), closing);
    app.quit();
  }
});
