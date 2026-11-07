# solo.tab

Kho tab guitar **solo** & **melody** — Next.js 16 (App Router) + TypeScript + Tailwind CSS v4.

## Chạy local

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # kiểm tra build production
npm run lint
```

## Database (Neon Postgres)

Database `solo-tab` (Neon, region Singapore, gói Free) được tạo qua Vercel Marketplace — quản lý tại Vercel → Storage.

```bash
# .env.local (không commit) cần có:
# DATABASE_URL="postgresql://..."   ← lấy bằng: neonctl connection-string --project-id still-tree-79727148 --pooled

npm run db:setup   # tạo bảng theo db/schema.sql + nạp bài mẫu (bài trùng slug được giữ nguyên)
```

App đọc bài từ database (`src/lib/songs.ts`, cache bằng `use cache` + tag `songs`). `src/data/songs.ts` chỉ còn là dữ liệu khởi tạo để nạp lần đầu.

## Trang admin (`/admin`)

Thêm / sửa / xoá bài và soạn tab. Đăng nhập bằng một mật khẩu admin.

```bash
npm run admin:password   # chạy trong terminal: nhập mật khẩu (ẩn), lưu bản hash vào .env.local
```

Lệnh trên ghi 2 biến vào `.env.local`: `ADMIN_PASSWORD_HASH` (hash scrypt, không phải mật khẩu thật) và `ADMIN_SESSION_SECRET` (khoá ký cookie đăng nhập, tạo một lần). Khi deploy, thêm 2 biến này vào Vercel → Project → Settings → Environment Variables.

- Lưu bài xong, site công khai cập nhật ngay (`updateTag` + `revalidatePath` trong `src/app/admin/actions.ts`).
- Mọi trang và server action admin tự kiểm tra quyền qua `requireAdmin()` (`src/lib/admin-auth.ts`); `src/proxy.ts` chỉ chặn sớm.
- **Sheet PDF**: ở trang sửa bài, chọn file PDF → trình duyệt tự chuyển từng trang thành ảnh WebP (rộng 1600px) → xem trước → lưu. Ảnh lưu trong bảng `song_sheet_pages` (Neon), phục vụ qua `/api/sheet/...` có kiểm tra quyền xem; bài trả phí không lộ link ảnh. Thay sheet chỉ có hiệu lực khi đã tải đủ mọi trang.
- Phiên đăng nhập 7 ngày. Muốn đăng xuất mọi nơi: xoá dòng `ADMIN_SESSION_SECRET` trong `.env.local` rồi chạy lại `npm run admin:password`.

## Cấu trúc

| Đường dẫn | Nội dung |
| --- | --- |
| `src/app/page.tsx` | Trang chủ: hero, 2 bộ sưu tập, bài mới cập nhật |
| `src/app/[collection]/page.tsx` | `/solo`, `/melody` — danh sách bài, tìm kiếm, lọc, sắp xếp |
| `src/app/bai/[slug]/page.tsx` | Trang chi tiết bài: thông tin, audio mẫu, tab (khoá nếu chưa là thành viên) |
| `src/app/goi/page.tsx` | Trang gói thành viên |
| `src/config/site.ts` | Tên site, giá gói, kênh liên hệ, danh sách bộ sưu tập |
| `src/app/admin/` | Trang admin: đăng nhập, danh sách bài, form thêm/sửa, server actions |
| `src/data/songs.ts` | Dữ liệu khởi tạo để nạp vào database lần đầu |
| `src/lib/songs.ts` | Truy vấn bài cho site công khai (có cache); `SongSummary` gửi xuống client không kèm tab/audio |
| `src/lib/song-model.ts` | Kiểu `Song`, tạo slug tiếng Việt, kiểm tra dữ liệu form admin |
| `src/lib/db.ts` | Kết nối Neon Postgres |
| `db/schema.sql` | Cấu trúc bảng `songs`, `song_sheet_pages` |
| `src/app/api/` | Upload ảnh sheet (admin) và phục vụ ảnh sheet (kiểm tra quyền) |
| `src/lib/search.ts` | Tìm kiếm không dấu tiếng Việt |
| `src/lib/access.ts` | `canViewSong()` — chỗ duy nhất quyết định ai được xem bài |
| `src/components/` | Header, footer, logo, thẻ bài, bộ lọc/tìm kiếm |

## Thêm bài

Vào `/admin` → **Thêm bài**. Nhãn **Mới** tự gắn cho 4 bài có ngày thêm gần nhất; tick **Mở miễn phí** để ai cũng xem được tab.

## Dữ liệu khởi tạo

`src/data/songs.ts` chỉ còn bài Bèo dạt mây trôi. Audio `public/audio/beo-dat-may-troi.mp3` được tổng hợp bằng `npm run audio:render -- beo-dat-may-troi` (Karplus–Strong); tab tương tác lấy từ `src/data/notation/`.

## Việc tiếp theo

- [ ] Đăng nhập (vd. Auth.js / Neon Auth) và lưu gói thành viên trong Postgres
- [ ] Thanh toán (VietQR / PayOS / Momo) → cập nhật hạn gói; nối vào `canViewSong()`
- [x] Chuyển bài sang database + trang admin quản lý tab
- [x] Upload sheet PDF từ trang admin, hiển thị dạng ảnh có watermark
- [ ] Upload audio từ trang admin
- [ ] Watermark theo tài khoản người xem (khi có đăng nhập thành viên)
- [ ] Phục vụ audio trả phí có kiểm tra quyền thay vì để trong `public/`
- [ ] Form yêu cầu bài
- [ ] Deploy (Vercel)
