/**
 * Tạo bảng (db/schema.sql) và nạp dữ liệu mẫu từ src/data/songs.ts.
 * Bài đã có (trùng slug) được giữ nguyên — không ghi đè chỉnh sửa từ trang admin.
 *
 *   npm run db:setup
 */
import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";
import { songs } from "../src/data/songs.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Thiếu DATABASE_URL — kiểm tra file .env.local");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

try {
  await pool.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("✓ Đã tạo / kiểm tra bảng songs");

  let inserted = 0;
  for (const s of songs) {
    const { rowCount } = await pool.query(
      `insert into songs (slug, title, artist, collection, tags, level, key, bpm, audio_url, tab, free, added_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       on conflict (slug) do nothing`,
      [
        s.slug,
        s.title,
        s.artist ?? null,
        s.collection,
        s.tags,
        s.level,
        s.key ?? null,
        s.bpm ?? null,
        s.audioUrl ?? null,
        s.tab ?? null,
        s.free ?? false,
        s.addedAt,
      ],
    );
    inserted += rowCount ?? 0;
  }

  const { rows } = await pool.query(
    "select collection, count(*)::int as n from songs group by collection order by collection",
  );
  console.log(`✓ Thêm mới ${inserted} bài (bỏ qua ${songs.length - inserted} bài đã có)`);
  for (const r of rows) console.log(`  ${r.collection}: ${r.n} bài`);
} finally {
  await pool.end();
}
