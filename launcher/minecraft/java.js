const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

/** Читает версию Java из вывода `java -version` (он идёт в stderr). */
function probeJava(javaPath) {
  return new Promise((resolve) => {
    execFile(javaPath, ["-version"], { timeout: 8000 }, (err, _stdout, stderr) => {
      if (err && !stderr) return resolve(null);
      const text = String(stderr || "");
      const match = text.match(/version "(\d+)(?:\.(\d+))?[^"]*"/);
      if (!match) return resolve(null);
      const major = Number(match[1]) === 1 ? Number(match[2] || 0) : Number(match[1]);
      resolve({ path: javaPath, major, raw: text.split("\n")[0].trim() });
    });
  });
}

function candidatePaths() {
  const list = ["java"];
  if (process.env.JAVA_HOME) {
    list.push(path.join(process.env.JAVA_HOME, "bin", process.platform === "win32" ? "java.exe" : "java"));
  }

  if (process.platform === "win32") {
    const roots = [
      path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Java"),
      path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Eclipse Adoptium"),
      path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Microsoft", "jdk"),
      path.join(process.env["LOCALAPPDATA"] || path.join(os.homedir(), "AppData", "Local"), "Programs", "Eclipse Adoptium"),
    ];
    for (const root of roots) {
      try {
        for (const dir of fs.readdirSync(root)) {
          list.push(path.join(root, dir, "bin", "java.exe"));
        }
      } catch (_) {
        // каталога может не быть — это не ошибка
      }
    }
  }

  return list;
}

/**
 * Ищет подходящую Java. Minecraft 1.21.x требует Java 21+,
 * поэтому minMajor передаётся вызывающей стороной.
 */
async function findJava(minMajor = 21) {
  const seen = new Set();
  const found = [];

  for (const candidate of candidatePaths()) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    const info = await probeJava(candidate);
    if (info) found.push(info);
  }

  found.sort((a, b) => b.major - a.major);
  const suitable = found.find((j) => j.major >= minMajor);

  return {
    java: suitable || null,
    installed: found,
    minMajor,
  };
}

module.exports = { findJava, probeJava };
