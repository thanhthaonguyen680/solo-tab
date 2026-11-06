# solo.tab

Kho tab guitar **solo** & **melody** — Next.js 16 (App Router) + TypeScript + Tailwind CSS v4.

## Chạy local

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # kiểm tra build production
npm run lint
```

## Cấu trúc

| Đường dẫn | Nội dung |
| --- | --- |
| `src/app/page.tsx` | Trang chủ: hero, 2 bộ sưu tập, bài mới cập nhật |
| `src/app/[collection]/page.tsx` | `/solo`, `/melody` — danh sách bài, tìm kiếm, lọc, sắp xếp |
| `src/app/bai/[slug]/page.tsx` | Trang chi tiết bài: thông tin, audio mẫu, tab (khoá nếu chưa là thành viên) |
| `src/app/goi/page.tsx` | Trang gói thành viên |
| `src/config/site.ts` | Tên site, giá gói, kênh liên hệ, danh sách bộ sưu tập |
| `src/data/songs.ts` | Dữ liệu bài hát (**hiện là dữ liệu mẫu**) |
| `src/lib/songs.ts` | Hàm truy vấn bài; `SongSummary` gửi xuống client không kèm tab/audio |
| `src/lib/search.ts` | Tìm kiếm không dấu tiếng Việt |
| `src/lib/access.ts` | `canViewSong()` — chỗ duy nhất quyết định ai được xem bài |
| `src/components/` | Header, footer, logo, thẻ bài, bộ lọc/tìm kiếm |

## Thêm bài

Thêm một object vào `songs` trong `src/data/songs.ts`. Nhãn **Mới** tự gắn cho 4 bài có `addedAt` gần nhất; `free: true` mở bài cho mọi người.

## Dữ liệu mẫu

Các bài hiện có là dân ca / nhạc cổ điển phổ biến, dùng để dựng giao diện. Tab là bài tập minh hoạ (không phải bản chuyển soạn), `public/audio/demo.wav` là âm thanh tổng hợp bằng thuật toán Karplus–Strong.

## Việc tiếp theo

- [ ] Đăng nhập (vd. Auth.js / Neon Auth) và lưu gói thành viên trong Postgres
- [ ] Thanh toán (VietQR / PayOS / Momo) → cập nhật hạn gói; nối vào `canViewSong()`
- [ ] Chuyển `src/data/songs.ts` sang database + trang admin để upload sheet (ảnh/PDF) và audio
- [ ] Phục vụ sheet/audio trả phí qua URL có ký (signed URL) thay vì `public/`
- [ ] Form yêu cầu bài
- [ ] Deploy (Vercel)
