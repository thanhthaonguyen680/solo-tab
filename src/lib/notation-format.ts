/**
 * Dữ liệu tab tương tác lưu trong cột `songs.notation` có hai dạng:
 * - alphaTex (chữ): đọc tự động từ sheet PDF hoặc chép tay;
 * - file gốc Guitar Pro / MusicXML, lưu nguyên dạng base64: `@score:<track>;<base64>`.
 */
const FILE_PREFIX = "@score:";

/** Đuôi file tab mà alphaTab đọc được */
export const SCORE_FILE_EXTENSIONS = [".gp", ".gp3", ".gp4", ".gp5", ".gpx", ".musicxml", ".xml", ".mxl"];
/** Giới hạn file gốc — sau khi mã hoá base64 vẫn dưới giới hạn 1 MB của server action */
export const SCORE_FILE_MAX_BYTES = 600 * 1024;

export type Notation = { kind: "tex"; tex: string } | { kind: "file"; bytes: Uint8Array; track: number };

export function isScoreFile(name: string) {
  const lower = name.toLowerCase();
  return SCORE_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isFileNotation(notation: string | null | undefined) {
  return Boolean(notation?.startsWith(FILE_PREFIX));
}

export function encodeScoreFile(bytes: Uint8Array, track: number): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `${FILE_PREFIX}${track};${btoa(bin)}`;
}

export function decodeNotation(notation: string): Notation {
  if (!notation.startsWith(FILE_PREFIX)) return { kind: "tex", tex: notation };
  const rest = notation.slice(FILE_PREFIX.length);
  const sep = rest.indexOf(";");
  const bin = atob(rest.slice(sep + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { kind: "file", bytes, track: Number(rest.slice(0, sep)) || 0 };
}

/** Kiểm tra phía server: đúng định dạng file gốc, không vượt giới hạn */
export function isValidFileNotation(notation: string) {
  const m = notation.match(/^@score:(\d{1,2});([A-Za-z0-9+/]+=*)$/);
  return Boolean(m) && notation.length <= FILE_PREFIX.length + 4 + Math.ceil((SCORE_FILE_MAX_BYTES * 4) / 3) + 4;
}

/**
 * Đặt tên bài / ca sĩ ở đầu bản nhạc theo thông tin trong admin (file nốt có thể còn tên cũ).
 * Gọi trong sự kiện scoreLoaded của alphaTab — sự kiện này chạy trước khi vẽ.
 */
export function applySongInfo(score: { title: string; artist: string }, title?: string, artist?: string) {
  if (title?.trim()) score.title = title.trim();
  if (artist?.trim()) score.artist = artist.trim();
}
