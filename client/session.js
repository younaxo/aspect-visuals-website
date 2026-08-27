const readline = require("readline");

/**
 * Работа с игровой сессией.
 *
 * Launch-токен приходит в stdin, а не аргументом командной строки:
 * аргументы видны в списке процессов, stdin — нет.
 * Токен одноразовый и живёт секунды, поэтому обменивается сразу при старте.
 */

const HEARTBEAT_MS = 30 * 1000;

/** Читает первую строку stdin. Отдельный поток закрывается сразу после чтения. */
function readLaunchToken(timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      reject(new Error("Клиент запускается через лаунчер Aspect Visuals"));
      return;
    }

    const rl = readline.createInterface({ input: process.stdin });
    const timer = setTimeout(() => {
      rl.close();
      reject(new Error("Лаунчер не передал токен запуска"));
    }, timeoutMs);

    rl.once("line", (line) => {
      clearTimeout(timer);
      rl.close();
      const token = String(line || "").trim();
      if (!token) reject(new Error("Пустой токен запуска"));
      else resolve(token);
    });

    rl.once("close", () => clearTimeout(timer));
  });
}

async function openSession(apiUrl, token) {
  const res = await fetch(`${apiUrl}/api/game/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    signal: AbortSignal.timeout(15000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.session) {
    throw new Error(data.message || `Сервер отклонил запуск (HTTP ${res.status})`);
  }
  return data.session;
}

/** Периодически подтверждает, что сессия жива. Возвращает функцию остановки. */
function startHeartbeat(apiUrl, session, onError) {
  const timer = setInterval(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/game/session/${session.id}/heartbeat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.sessionToken}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok && onError) onError(`heartbeat: HTTP ${res.status}`);
    } catch (err) {
      if (onError) onError(err.message || "heartbeat не прошёл");
    }
  }, HEARTBEAT_MS);

  return () => clearInterval(timer);
}

async function closeSession(apiUrl, session) {
  try {
    await fetch(`${apiUrl}/api/game/session/${session.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.sessionToken}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch (_) {
    // Сессия всё равно завершится по отсутствию heartbeat
  }
}

module.exports = { readLaunchToken, openSession, startHeartbeat, closeSession, HEARTBEAT_MS };
