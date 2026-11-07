# solo.tab

Kho tab guitar **solo** & **melody** có tab tương tác: bấm phát là đàn chơi, con trỏ chạy theo từng nốt.

**Site:** https://solotab.site · **Repo:** https://github.com/thanhthaonguyen680/solo-tab

Next.js 16 (App Router, Turbopack, `cacheComponents`) · TypeScript · Tailwind CSS v4 · Neon Postgres · alphaTab · Vercel

## Tính năng

- **Kho bài** `/solo`, `/melody`: tìm kiếm không dấu, lọc bài có audio, sắp xếp.
- **Tab tương tác** (alphaTab):
  - Vẽ khuông nhạc + tab từ dữ liệu nốt và phát bằng soundfont guitar nylon.
  - Con trỏ chạy theo từng nốt, trang tự cuộn theo.
  - Chỉnh tempo theo bpm, lặp lại, máy đếm nhịp, đếm vào; bấm vào nốt để phát từ đó.
- **Sheet PDF:** admin tải PDF lên, trình duyệt chuyển từng trang thành ảnh có watermark.
- **Trang admin** `/admin`: thêm, sửa, xoá bài; đặt tempo mặc định cho từng bài; tải sheet PDF.
- **Gói thành viên:** công tắc `membership` trong `src/config/site.ts` đang **tắt**, nên mọi bài đều mở và trang `/goi` ẩn.
- Theme tối, nhấn xanh chanh; font Chakra Petch (tiêu đề) và Zalando Sans (chữ thường); bộ icon cho trình duyệt, iPhone và Android.

## Chạy local

```bash
npm install        # tự chép font/soundfont của alphaTab vào public/alphatab (postinstall)
npm run dev        # http://localhost:3000
npm run build      # kiểm tra build production
npm run lint
```

`.env.local` (không commit) cần có:

| Biến | Lấy ở đâu |
| --- | --- |
| `DATABASE_URL` | `neonctl connection-string --project-id still-tree-79727148 --pooled` |
| `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` | `npm run admin:password` (nhập mật khẩu ẩn, chỉ lưu bản hash) |

> Máy local và site thật dùng **chung một database**. Thêm, sửa, xoá bài ở `localhost:3000/admin` là sửa trên site thật.

## Lệnh npm

| Lệnh | Việc |
| --- | --- |
| `npm run db:setup` | Tạo bảng theo `db/schema.sql` + nạp dữ liệu khởi tạo (bài trùng slug được giữ nguyên) |
| `npm run admin:password` | Đặt / đổi mật khẩu admin |
| `npm run notation -- <slug>` | Chuyển file nốt `scripts/tab-audio/scores/<slug>.mjs` thành alphaTex trong `src/data/notation/<slug>.ts` |
| `npm run audio:render -- <slug>` | Tổng hợp MP3 từ file nốt ra `public/audio/<slug>.mp3` (cần `ffmpeg`) |

## Thêm bài có tab tương tác

1. **Tạo bài:** `/admin` → **Thêm bài**. Ô **Tempo (bpm)** là tempo mặc định khi phát; để trống thì dùng tempo trong dữ liệu nốt.
2. **Chép nốt:** tạo `scripts/tab-audio/scores/<slug>.mjs`, theo mẫu `beo-dat-may-troi.mjs`.
   - Mỗi nốt viết là `[phách, dây, phím]`; thêm `"slide"` cho chỗ luyến.
   - Ghi kèm capo, tempo gốc và tên hợp âm từng ô.
3. **Tạo alphaTex:** `npm run notation -- <slug>`, rồi khai báo slug trong `src/data/notation/index.ts`.
4. **Đưa lên site:** commit + push.

Dữ liệu nốt chỉ được gửi xuống trình duyệt khi người xem có quyền xem bài (`canViewSong()`).

## Database (Neon Postgres)

Database `solo-tab`: Neon, region Singapore, gói Free. Tạo qua Vercel Marketplace, quản lý tại Vercel → Storage.

- Bảng `songs` và `song_sheet_pages` (ảnh sheet dạng bytea), xem `db/schema.sql`.
- App đọc bài qua `src/lib/songs.ts`, cache bằng `use cache` + tag `songs`.
  - Lưu bài trong admin thì site cập nhật ngay (`updateTag` + `revalidatePath`).
  - **Sửa thẳng trong database** thì cần deploy lại để trang dựng sẵn đọc dữ liệu mới.
  - Ở máy local thì xoá `.next/dev` rồi chạy lại `npm run dev`.
- Neon lưu lịch sử vài giờ gần nhất. Lỡ xoá nhầm thì tạo branch từ thời điểm trước đó để lấy lại dữ liệu.

## Trang admin (`/admin`)

- **Phân quyền:** đăng nhập bằng một mật khẩu, phiên 7 ngày.
  - Mọi trang và server action tự kiểm tra quyền qua `requireAdmin()` (`src/lib/admin-auth.ts`); `src/proxy.ts` chỉ chặn sớm.
  - Muốn đăng xuất mọi nơi: xoá dòng `ADMIN_SESSION_SECRET` trong `.env.local`, chạy lại `npm run admin:password`, rồi cập nhật biến này trên Vercel.
- **Sheet PDF:** chọn file PDF ở trang sửa bài.
  - Trình duyệt chuyển từng trang thành ảnh WebP rộng 1600px, cho xem trước rồi mới lưu.
  - Ảnh phục vụ qua `/api/sheet/...` có kiểm tra quyền.
  - Thay sheet chỉ có hiệu lực khi đã tải đủ mọi trang.

## Deploy

- Vercel project `solo-tab`, tài khoản cá nhân `thanhthaonguyen680`. **Push lên `main` là tự deploy production.**
- Biến môi trường trên Vercel:
  - `DATABASE_URL`: tự có khi nối Neon.
  - `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`: dạng Secret.
- Tên miền `solotab.site` mua ở Nhân Hoà; DNS khai báo bên Nhân Hoà:

  | Loại | Tên | Giá trị |
  | --- | --- | --- |
  | A | `@` | `216.150.1.1` |
  | A | `@` | `216.150.16.1` |
  | CNAME | `www` | `3e3d59a07b438d8c.vercel-dns-016.com` |

- `www.solotab.site` và `solo-tab.vercel.app` tự chuyển (308) về `https://solotab.site`. HTTPS do Vercel cấp và tự gia hạn.

## Cấu trúc

| Đường dẫn | Nội dung |
| --- | --- |
| `src/app/page.tsx` | Trang chủ: hero, 2 kho bài, bài mới cập nhật |
| `src/app/[collection]/page.tsx` | `/solo`, `/melody`: danh sách bài, tìm kiếm, lọc, sắp xếp |
| `src/app/bai/[slug]/page.tsx` | Trang bài: thông tin, tab tương tác, sheet PDF (hoặc audio / tab chữ nếu chưa có dữ liệu nốt) |
| `src/app/goi/page.tsx` | Trang gói thành viên (ẩn khi `membership` tắt) |
| `src/app/admin/` | Admin: đăng nhập, danh sách bài, form thêm/sửa, upload sheet, server actions |
| `src/app/api/` | Upload ảnh sheet (admin) và phục vụ ảnh sheet (kiểm tra quyền) |
| `src/app/icon.svg`, `favicon.ico`, `apple-icon.png`, `manifest.ts` | Icon trình duyệt, iPhone, Android |
| `src/components/TabPlayer.tsx` | Trình phát tab tương tác (alphaTab) |
| `src/components/` | Header, footer, logo, nút, thẻ bài, bộ lọc/tìm kiếm |
| `src/config/site.ts` | Tên site, tên miền, tác giả, công tắc gói thành viên, liên hệ, kho bài |
| `src/data/notation/` | Dữ liệu nốt (alphaTex) theo slug |
| `src/data/songs.ts` | Dữ liệu khởi tạo cho `db:setup` |
| `src/lib/songs.ts` | Truy vấn bài cho site công khai (có cache) |
| `src/lib/access.ts` | `canViewSong()`: chỗ duy nhất quyết định ai được xem bài |
| `src/lib/song-model.ts` | Kiểu `Song`, tạo slug tiếng Việt, kiểm tra form admin |
| `src/lib/db.ts`, `db/schema.sql` | Kết nối Neon, cấu trúc bảng |
| `scripts/tab-audio/` | File nốt, chuyển sang alphaTex, tổng hợp audio |
| `scripts/copy-alphatab-assets.mjs` | Chép font/soundfont/worklet alphaTab vào `public/alphatab` (không commit) |

## Việc tiếp theo

- [x] Database + trang admin quản lý bài
- [x] Upload sheet PDF, hiển thị dạng ảnh có watermark
- [x] Tab tương tác: phát nhạc, con trỏ theo nốt, chỉnh tempo
- [x] Deploy Vercel + tên miền solotab.site
- [ ] Admin upload file `.gp` / MusicXML để có tab tương tác không cần chép tay
- [ ] Đăng nhập thành viên (Auth.js / Neon Auth) và lưu gói trong Postgres
- [ ] Thanh toán (VietQR / PayOS / Momo), nối vào `canViewSong()`, bật lại `membership`
- [ ] Watermark theo tài khoản người xem
- [ ] Form yêu cầu bài

## Ghi công

- [alphaTab](https://alphatab.net) (MPL-2.0): vẽ và phát tab.
- Font nốt nhạc Bravura (SIL OFL 1.1); soundfont Sonivox (Apache 2.0).
- Font Chakra Petch, Zalando Sans, JetBrains Mono (SIL OFL, qua Google Fonts).

---

© 2026 solo.tab · A product by **Thao.Nguyen**. All rights reserved.
