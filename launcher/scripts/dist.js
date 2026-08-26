const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const mainSrc = path.join(root, "main.js");
const mainBak = path.join(root, "main.js.preobf");
const obfOut = path.join(root, ".obf", "main.js");

fs.mkdirSync(path.dirname(obfOut), { recursive: true });

console.log("[dist] Obfuscating main.js…");
execSync(
  `npx javascript-obfuscator "${mainSrc}" --output "${obfOut}" --compact true --string-array true --string-array-threshold 0.75 --dead-code-injection false --control-flow-flattening false --self-defending false`,
  { stdio: "inherit", cwd: root }
);

fs.copyFileSync(mainSrc, mainBak);
fs.copyFileSync(obfOut, mainSrc);

try {
  console.log("[dist] Running electron-builder…");
  execSync("npx electron-builder --win", { stdio: "inherit", cwd: root });
} finally {
  if (fs.existsSync(mainBak)) {
    fs.copyFileSync(mainBak, mainSrc);
    fs.unlinkSync(mainBak);
    console.log("[dist] Restored original main.js");
  }
}
