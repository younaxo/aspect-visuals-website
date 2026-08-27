/**
 * Работа с игровой сессией.
 *
 * Launch-токен не приходит аргументом командной строки: аргументы видны
 * любому процессу в системе. Лаунчер поднимает одноразовый локальный обмен
 * и передаёт только его адрес, по которому токен выдаётся ровно один раз.
 */

const HEARTBEAT_MS = 30 * 1000;

/** Адрес обмена приходит в --aspect-handshake=... Сам токен в аргументах не появляется. */
function handshakeUrl(argv = process.argv) {
  const arg = argv.find((a) => a.startsWith("--aspect-handshake="));
  if (!arg) return null;

  const url = arg.slice("--aspect-handshake=".length);
  try {
    const parsed = new URL(url);
    // Принимаем только петлевой интерфейс: обмен локальный по замыслу
    if (parsed.hostname !== "127.0.0.1") return null;
    return url;
  } catch (_) {
    return null;
  }
}

async function readLaunchToken(timeoutMs = 15000) {
  const url = handshakeUrl();
  if (!url) throw new Error("Клиент запускается через лаунчер Aspect Visuals");

  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`Лаунчер не выдал токен запуска (HTTP ${res.status})`);

  const data = await res.json().catch(() => ({}));
  const token = String(data.token || "").trim();
  if (!token) throw new Error("Лаунчер вернул пустой токен");

  return token;
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

module.exports = { readLaunchToken, openSession, startHeartbeat, closeSession, handshakeUrl, HEARTBEAT_MS };
