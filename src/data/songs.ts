import type { Song } from "../lib/song-model.ts";

// Dữ liệu khởi tạo — chỉ dùng để nạp vào database lần đầu (npm run db:setup); app đọc bài từ database.
// Sheet PDF và tab tương tác của bài được thêm riêng (trang admin, src/data/notation/).
export const songs: Song[] = [
  {
    slug: "beo-dat-may-troi",
    title: "Bèo dạt mây trôi",
    artist: "Dân ca Quan họ",
    tags: ["Melody", "Ver. chậm"],
    addedAt: "2026-11-01",
    level: "Dễ",
    key: "Am",
    audioUrl: "/audio/beo-dat-may-troi.mp3",
  },
];
