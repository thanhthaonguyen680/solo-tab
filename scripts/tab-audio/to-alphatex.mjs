// Chuyển file nốt (scripts/tab-audio/scores/<slug>.mjs) sang alphaTex để alphaTab vẽ tab + phát nhạc.
// Dùng: node scripts/tab-audio/to-alphatex.mjs <slug>  → ghi src/data/notation/<slug>.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const slug = process.argv[2];
if (!slug) throw new Error("Thiếu slug");
const score = (await import(pathToFileURL(resolve(`scripts/tab-audio/scores/${slug}.mjs`)).href)).default;

// Số phách → [trường độ alphaTex, có chấm dôi] (4 = nốt đen, 8 = móc đơn, [2, true] = trắng chấm…)
const DURATION = { 0.5: [8, false], 1: [4, false], 1.5: [4, true], 2: [2, false], 3: [2, true], 4: [1, false] };
const dur = (beats) => {
  const d = DURATION[beats];
  if (!d) throw new Error(`Trường độ ${beats} phách chưa hỗ trợ`);
  return d;
};

let firstBeatFx = null;
const bars = score.measures.map((notes, i) => {
  // Gom các nốt cùng phách thành một beat (hợp âm)
  const beats = new Map();
  for (const [beat, string, fret, kind] of notes) {
    if (!beats.has(beat)) beats.set(beat, []);
    beats.get(beat).push({ string, fret, kind });
  }
  const starts = [...beats.keys()].sort((a, b) => a - b);
  const out = [];
  if (starts[0] > 1) {
    out.push(...splitRest(starts[0] - 1));
  }
  // Cường độ đầu bài (sheet ghi mf) đặt ở beat đầu tiên của ô 1
  if (i === 0 && score.dynamic) {
    if (out.length) out[0] += `{dy ${score.dynamic}}`;
    else firstBeatFx = `dy ${score.dynamic}`;
  }
  starts.forEach((beat, k) => {
    const next = starts[k + 1] ?? score.beatsPerMeasure + 1;
    const length = next - beat;
    const [n, dotted] = dur(length);
    const notesHere = beats.get(beat).sort((a, b) => a.string - b.string);
    // Nốt này luyến (slide) sang nốt sau trên cùng dây?
    const nextNotes = beats.get(starts[k + 1]) ?? [];
    const noteTex = notesHere.map(({ string, fret }) => {
      const fx = ["lr"];
      if (nextNotes.some((x) => x.string === string && x.kind === "slide")) fx.push("sl");
      return `${fret}.${string}{${fx.join(" ")}}`;
    });
    const body = noteTex.length > 1 ? `(${noteTex.join(" ")})` : noteTex[0];
    const beatFx = [];
    if (dotted) beatFx.push("d");
    if (k === 0 && score.chords?.[i]) beatFx.push(`ch "${score.chords[i]}"`);
    if (i === 0 && k === 0 && firstBeatFx) beatFx.push(firstBeatFx);
    out.push(`${body}.${n}${beatFx.length ? `{${beatFx.join(" ")}}` : ""}`);
  });
  return out.join(" ");
});

function splitRest(beats) {
  const parts = [];
  for (const size of [4, 2, 1, 0.5]) {
    while (beats >= size) {
      parts.push(`r.${DURATION[size][0]}`);
      beats -= size;
    }
  }
  return parts;
}

const tex = [
  `\\title "${score.title}"`,
  score.artist ? `\\subtitle "${score.artist}"` : null,
  `\\tempo ${score.bpm}`,
  ".",
  `\\track "Guitar"`,
  `\\staff {score tabs}`,
  `\\instrument acousticguitarnylon`,
  `\\capo ${score.capo}`,
  // Khuông nhạc ghi theo thế bấm như sheet gốc: guitar ghi cao hơn 1 quãng tám, trừ phần capo
  `\\displaytranspose ${12 - score.capo}`,
  `\\ts ${score.beatsPerMeasure} 4`,
  bars.map((b, i) => `${b} |  // ô ${i + 1}`).join("\n"),
]
  .filter(Boolean)
  .join("\n");

mkdirSync("src/data/notation", { recursive: true });
writeFileSync(
  `src/data/notation/${slug}.ts`,
  `// Tạo tự động từ scripts/tab-audio/scores/${slug}.mjs — chạy lại: npm run notation -- ${slug}\n` +
    `export const notation = ${JSON.stringify(tex)};\n`,
);
console.log(tex);
