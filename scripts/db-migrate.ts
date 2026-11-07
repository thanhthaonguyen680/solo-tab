/**
 * Cập nhật cấu trúc database theo db/schema.sql (thêm bảng / cột còn thiếu).
 * Chỉ thêm, không xoá dữ liệu, không nạp bài mẫu — chạy lại nhiều lần vẫn an toàn.
 *
 *   npm run db:migrate
 */
import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Thiếu DATABASE_URL — kiểm tra file .env.local");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
try {
  await pool.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  const { rows } = await pool.query(
    "select status, count(*)::int as n from songs group by status order by status",
  );
  console.log("✓ Đã cập nhật cấu trúc database");
  for (const r of rows) console.log(`  bài ${r.status}: ${r.n}`);
} finally {
  await pool.end();
}
