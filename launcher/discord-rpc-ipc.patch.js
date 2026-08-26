'use strict';

const net = require('net');
const EventEmitter = require('events');
const fetch = require('node-fetch');
const { uuid } = require('../util');

const OPCodes = {
  HANDSHAKE: 0,
  FRAME: 1,
  CLOSE: 2,
  PING: 3,
  PONG: 4,
};

function getIPCPath(id) {
  if (process.platform === 'win32') {
    return `\\\\?\\pipe\\discord-ipc-${id}`;
  }
  const { env: { XDG_RUNTIME_DIR, TMPDIR, TMP, TEMP } } = process;
  const prefix = XDG_RUNTIME_DIR || TMPDIR || TMP || TEMP || '/tmp';
  return `${prefix.replace(/\/$/, '')}/discord-ipc-${id}`;
}

/**
 * Connect to a Discord IPC pipe that accepts the handshake.
 * Skips logged-out clients (common when Stable + Canary both run).
 */
function tryHandshake(id, clientId) {
  return new Promise((resolve) => {
    const path = getIPCPath(id);
    let settled = false;
    let buf = Buffer.alloc(0);
    let sock;

    const done = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!value && sock) {
        try { sock.destroy(); } catch (_) {}
      }
      resolve(value);
    };

    const timer = setTimeout(() => done(null), 2500);

    try {
      sock = net.createConnection(path, () => {
        sock.write(encode(OPCodes.HANDSHAKE, {
          v: 1,
          client_id: String(clientId),
        }));
      });
    } catch (_) {
      done(null);
      return;
    }

    sock.on('error', () => done(null));
    sock.on('close', () => done(null));

    sock.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 8) {
        const op = buf.readInt32LE(0);
        const len = buf.readInt32LE(4);
        if (buf.length < 8 + len) break;
        let data;
        try {
          data = JSON.parse(buf.slice(8, 8 + len).toString('utf8'));
        } catch (_) {
          done(null);
          return;
        }
        buf = buf.slice(8 + len);

        if (op === OPCodes.CLOSE) {
          done(null);
          return;
        }

        if (op === OPCodes.FRAME && data && data.evt === 'READY' && data.cmd === 'DISPATCH') {
          sock.removeAllListeners('data');
          sock.removeAllListeners('close');
          sock.removeAllListeners('error');
          sock.pause();
          // Put READY frame back so discord-rpc client can consume it via decode
          const raw = JSON.stringify(data);
          const packet = Buffer.alloc(8 + Buffer.byteLength(raw));
          packet.writeInt32LE(OPCodes.FRAME, 0);
          packet.writeInt32LE(Buffer.byteLength(raw), 4);
          packet.write(raw, 8);
          sock.unshift(packet);
          done(sock);
          return;
        }
      }
    });
  });
}

async function getIPC(clientId) {
  for (let id = 0; id < 10; id += 1) {
    // eslint-disable-next-line no-await-in-loop
    const sock = await tryHandshake(id, clientId);
    if (sock) return sock;
  }
  throw new Error('Could not connect');
}

async function findEndpoint(tries = 0) {
  if (tries > 30) {
    throw new Error('Could not find endpoint');
  }
  const endpoint = `http://127.0.0.1:${6463 + (tries % 10)}`;
  try {
    const r = await fetch(endpoint);
    if (r.status === 404) {
      return endpoint;
    }
    return findEndpoint(tries + 1);
  } catch (e) {
    return findEndpoint(tries + 1);
  }
}

function encode(op, data) {
  data = JSON.stringify(data);
  const len = Buffer.byteLength(data);
  const packet = Buffer.alloc(8 + len);
  packet.writeInt32LE(op, 0);
  packet.writeInt32LE(len, 4);
  packet.write(data, 8, len);
  return packet;
}

const working = {
  full: '',
  op: undefined,
};

function decode(socket, callback) {
  const packet = socket.read();
  if (!packet) {
    return;
  }

  let { op } = working;
  let raw;
  if (working.full === '') {
    op = working.op = packet.readInt32LE(0);
    const len = packet.readInt32LE(4);
    raw = packet.slice(8, len + 8);
  } else {
    raw = packet.toString();
  }

  try {
    const data = JSON.parse(working.full + raw);
    callback({ op, data }); // eslint-disable-line callback-return
    working.full = '';
    working.op = undefined;
  } catch (err) {
    working.full += raw;
  }

  decode(socket, callback);
}

class IPCTransport extends EventEmitter {
  constructor(client) {
    super();
    this.client = client;
    this.socket = null;
  }

  async connect() {
    const socket = this.socket = await getIPC(this.client.clientId);
    socket.on('close', this.onClose.bind(this));
    socket.on('error', this.onClose.bind(this));
    this.emit('open');
    // Handshake already completed in getIPC (skips logged-out pipes)
    if (socket.isPaused && socket.isPaused()) {
      // keep paused until readable handler is attached
    } else {
      socket.pause();
    }
    socket.on('readable', () => {
      decode(socket, ({ op, data }) => {
        switch (op) {
          case OPCodes.PING:
            this.send(data, OPCodes.PONG);
            break;
          case OPCodes.FRAME:
            if (!data) {
              return;
            }
            if (data.cmd === 'AUTHORIZE' && data.evt !== 'ERROR') {
              findEndpoint()
                .then((endpoint) => {
                  this.client.request.endpoint = endpoint;
                })
                .catch((e) => {
                  this.client.emit('error', e);
                });
            }
            this.emit('message', data);
            break;
          case OPCodes.CLOSE:
            this.emit('close', data);
            break;
          default:
            break;
        }
      });
    });
    socket.resume();
  }

  onClose(e) {
    this.emit('close', e);
  }

  send(data, op = OPCodes.FRAME) {
    this.socket.write(encode(op, data));
  }

  async close() {
    return new Promise((r) => {
      this.once('close', r);
      this.send({}, OPCodes.CLOSE);
      this.socket.end();
    });
  }

  ping() {
    this.send(uuid(), OPCodes.PING);
  }
}

module.exports = IPCTransport;
module.exports.encode = encode;
module.exports.decode = decode;
