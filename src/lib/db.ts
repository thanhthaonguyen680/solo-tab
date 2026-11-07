import "server-only";
import { neon } from "@neondatabase/serverless";
import type { CollectionSlug } from "@/config/site";
import type { Level, Sheet, Song } from "./song-model";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Thiếu DATABASE_URL — xem README phần Database");

export const sql = neon(url);

/** Cột trả về từ bảng songs, đổi tên sang camelCase */
export const SONG_COLUMNS = `
  slug, title, artist, collection, tags, level, key, bpm,
  audio_url as "audioUrl", tab, free, added_at::text as "addedAt", sheet_version as "sheetVersion", notation`;

export type SongRow = {
  slug: string;
  title: string;
  artist: string | null;
  collection: CollectionSlug;
  tags: string[];
  level: Level;
  key: string | null;
  bpm: number | null;
  audioUrl: string | null;
  tab: string | null;
  free: boolean;
  addedAt: string;
  sheetVersion: string | null;
  notation: string | null;
};

export function rowToSong(r: SongRow, sheetPages: Sheet["pages"] = []): Song {
  return {
    slug: r.slug,
    title: r.title,
    artist: r.artist ?? undefined,
    collection: r.collection,
    tags: r.tags,
    level: r.level,
    key: r.key ?? undefined,
    bpm: r.bpm ?? undefined,
    audioUrl: r.audioUrl ?? undefined,
    tab: r.tab ?? undefined,
    free: r.free,
    addedAt: r.addedAt,
    sheet: r.sheetVersion && sheetPages.length > 0 ? { version: r.sheetVersion, pages: sheetPages } : undefined,
    notation: r.notation ?? undefined,
  };
}

/** Kích thước các trang của sheet đang dùng */
export async function loadSheetPages(slug: string, version: string | null): Promise<Sheet["pages"]> {
  if (!version) return [];
  return (await sql.query(
    "select width, height from song_sheet_pages where song_slug = $1 and version = $2 order by page",
    [slug, version],
  )) as Sheet["pages"];
}
