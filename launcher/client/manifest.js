const crypto = require("crypto");

/**
 * Проверка подписи манифеста.
 *
 * Публичный ключ берётся с backend и кэшируется на время работы лаунчера.
 * Приватный ключ в лаунчер не попадает: подписывает только сервер.
 * Без успешной проверки подписи обновление не применяется.
 */

let cachedKey = null;

async function fetchPublicKey(apiUrl) {
  if (cachedKey) return cachedKey;

  const res = await fetch(`${apiUrl}/api/launch/public-key`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Не удалось получить ключ проверки: HTTP ${res.status}`);

  const pem = (await res.text()).trim();
  if (!pem.includes("BEGIN PUBLIC KEY")) throw new Error("Сервер вернул некорректный ключ");

  cachedKey = crypto.createPublicKey(pem);
  return cachedKey;
}

/** Канонический вид должен совпадать с backend, иначе подпись не сойдётся. */
function canonicalPayload(manifest) {
  const files = manifest.files
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((f) => `${f.path}:${f.sha256}:${f.size}`)
    .join("\n");
  return `${manifest.channel}\n${manifest.version}\n${files}`;
}

function verifyManifest(manifest, publicKey) {
  if (!manifest || !Array.isArray(manifest.files) || !manifest.signature) return false;
  try {
    return crypto.verify(
      null,
      Buffer.from(canonicalPayload(manifest)),
      publicKey,
      Buffer.from(manifest.signature, "base64url"),
    );
  } catch (_) {
    return false;
  }
}

/** Загружает манифест и проверяет его подпись. Непроверенный манифест не возвращается. */
async function getVerifiedManifest(apiUrl, channel = "stable") {
  const res = await fetch(`${apiUrl}/api/client/manifest?channel=${encodeURIComponent(channel)}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (res.status === 404) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Версия клиента ещё не опубликована");
  }
  if (!res.ok) throw new Error(`Не удалось получить манифест: HTTP ${res.status}`);

  const manifest = await res.json();
  const key = await fetchPublicKey(apiUrl);

  if (!verifyManifest(manifest, key)) {
    throw new Error("Подпись манифеста не сошлась. Обновление отклонено.");
  }

  // Пути внутри манифеста не должны выводить за каталог установки
  for (const file of manifest.files) {
    const p = String(file.path || "");
    if (!p || p.includes("..") || p.startsWith("/") || p.startsWith("\\") || /^[a-zA-Z]:/.test(p)) {
      throw new Error(`Недопустимый путь в манифесте: ${p}`);
    }
    if (!/^[0-9a-f]{64}$/i.test(String(file.sha256 || ""))) {
      throw new Error(`Некорректный SHA-256 у файла ${p}`);
    }
  }

  return manifest;
}

module.exports = { getVerifiedManifest, verifyManifest, canonicalPayload, fetchPublicKey };
