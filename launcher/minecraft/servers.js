const fs = require("fs");

const { paths } = require("./paths");

/**
 * Запись servers.dat в формате NBT.
 * Файл несжатый, структура: TAG_Compound "" { TAG_List "servers" of TAG_Compound }.
 * Пишем вручную, чтобы не тащить зависимость ради одного файла.
 */

const TAG_END = 0;
const TAG_BYTE = 1;
const TAG_STRING = 8;
const TAG_LIST = 9;
const TAG_COMPOUND = 10;

function nbtString(value) {
  const body = Buffer.from(String(value), "utf8");
  const len = Buffer.alloc(2);
  len.writeUInt16BE(body.length, 0);
  return Buffer.concat([len, body]);
}

function namedTag(type, name, payload) {
  return Buffer.concat([Buffer.from([type]), nbtString(name), payload]);
}

function serverCompound(server) {
  const parts = [
    namedTag(TAG_STRING, "name", nbtString(server.name)),
    namedTag(TAG_STRING, "ip", nbtString(server.ip)),
  ];
  if (server.acceptTextures !== undefined) {
    parts.push(namedTag(TAG_BYTE, "acceptTextures", Buffer.from([server.acceptTextures ? 1 : 0])));
  }
  parts.push(Buffer.from([TAG_END]));
  return Buffer.concat(parts);
}

function buildServersDat(servers) {
  const entries = servers.map(serverCompound);

  const listLength = Buffer.alloc(4);
  listLength.writeInt32BE(entries.length, 0);
  // TAG_List: тип элементов, длина, элементы
  const listPayload = Buffer.concat([Buffer.from([TAG_COMPOUND]), listLength, ...entries]);

  const root = Buffer.concat([
    namedTag(TAG_LIST, "servers", listPayload),
    Buffer.from([TAG_END]),
  ]);

  // Корневой безымянный TAG_Compound
  return Buffer.concat([Buffer.from([TAG_COMPOUND]), nbtString(""), root]);
}

/** Минимальный разбор существующего файла: нужны только name и ip, чтобы не терять серверы игрока. */
function readExistingServers(file) {
  try {
    const buf = fs.readFileSync(file);
    const servers = [];
    let i = 0;
    while (i < buf.length - 4) {
      // Ищем пары строковых тегов name/ip внутри списка
      if (buf[i] === TAG_STRING) {
        const nameLen = buf.readUInt16BE(i + 1);
        const key = buf.slice(i + 3, i + 3 + nameLen).toString("utf8");
        const valStart = i + 3 + nameLen;
        if (valStart + 2 <= buf.length) {
          const valLen = buf.readUInt16BE(valStart);
          const value = buf.slice(valStart + 2, valStart + 2 + valLen).toString("utf8");
          if (key === "name") servers.push({ name: value, ip: "" });
          else if (key === "ip" && servers.length) servers[servers.length - 1].ip = value;
          i = valStart + 2 + valLen;
          continue;
        }
      }
      i += 1;
    }
    return servers.filter((s) => s.ip);
  } catch (_) {
    return [];
  }
}

const DEFAULT_SERVER = { name: "TwoMC", ip: "play.twomc.su", acceptTextures: true };

/** Добавляет наш сервер в список, не дублируя и не удаляя чужие записи. */
function ensureDefaultServer(extra = []) {
  const existing = readExistingServers(paths.serversDat);
  const wanted = [DEFAULT_SERVER, ...extra];

  const result = existing.slice();
  for (const server of wanted) {
    if (!result.some((s) => s.ip.toLowerCase() === server.ip.toLowerCase())) {
      result.unshift(server);
    }
  }

  fs.writeFileSync(paths.serversDat, buildServersDat(result));
  return result;
}

module.exports = { buildServersDat, ensureDefaultServer, readExistingServers, DEFAULT_SERVER };
