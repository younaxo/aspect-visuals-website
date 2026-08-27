const { contextBridge, ipcRenderer } = require("electron");

// Renderer не получает доступ к Node: только состояние сессии и выход
contextBridge.exposeInMainWorld("aspect", {
  onState: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on("session-state", handler);
    return () => ipcRenderer.removeListener("session-state", handler);
  },
  quit: () => ipcRenderer.send("quit"),
});
