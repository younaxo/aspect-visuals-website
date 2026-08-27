const http = require("http");
const crypto = require("crypto");

/**
 * Передача launch-токена клиенту через одноразовый локальный обмен.
 *
 * Почему не аргументы командной строки: они видны любому процессу в системе.
 * Почему не stdin: Electron на Windows собран как GUI-приложение и рабочего
 * stdin от пайпа не получает — проверено, токен до клиента не доходил.
 * Почему не файл: токен оставался бы на диске.
 *
 * Сервер слушает только 127.0.0.1, адрес содержит 256-битный одноразовый
 * секрет, отдаёт токен ровно один раз и сразу закрывается.
 */

const HANDSHAKE_TTL_MS = 60 * 1000;

function createHandshake(token) {
  return new Promise((resolve, reject) => {
    const nonce = crypto.randomBytes(32).toString("hex");
    let delivered = false;
    let timer = null;

    const server = http.createServer((req, res) => {
      const ok = req.method === "GET" && req.url === `/${nonce}`;

      if (!ok || delivered) {
        res.writeHead(404).end();
        return;
      }

      delivered = true;
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ token }));
      close();
    });

    const close = () => {
      if (timer) clearTimeout(timer);
      try { server.close(); } catch (_) {}
    };

    server.on("error", (err) => {
      close();
      reject(err);
    });

    // Порт назначает система, слушаем только петлевой интерфейс
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      timer = setTimeout(close, HANDSHAKE_TTL_MS);
      resolve({
        url: `http://127.0.0.1:${port}/${nonce}`,
        close,
        wasDelivered: () => delivered,
      });
    });
  });
}

module.exports = { createHandshake, HANDSHAKE_TTL_MS };
