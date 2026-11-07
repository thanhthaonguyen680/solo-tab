// Chép các file alphaTab cần tải lúc chạy (font nốt nhạc, soundfont, worklet) vào public/alphatab.
// Tự chạy sau `npm install` (postinstall) — thư mục đích không commit.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const src = "node_modules/@coderline/alphatab/dist";
const dest = "public/alphatab";
const files = [
  // Turbopack không đóng gói Audio Worklet → alphaTab tự nạp từ bản ESM đặt cạnh core
  "alphaTab.mjs",
  "alphaTab.core.mjs",
  "alphaTab.worker.mjs",
  "alphaTab.worklet.mjs",
  "font/Bravura.woff2",
  "font/Bravura.woff",
  "font/Bravura.otf",
  "soundfont/sonivox.sf2",
];

for (const f of files) {
  mkdirSync(dirname(join(dest, f)), { recursive: true });
  copyFileSync(join(src, f), join(dest, f));
}
console.log(`alphaTab: đã chép ${files.length} file vào ${dest}`);
