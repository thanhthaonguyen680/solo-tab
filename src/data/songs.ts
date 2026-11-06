import type { CollectionSlug } from "@/config/site";

export type Song = {
  slug: string;
  title: string;
  artist?: string;
  collection: CollectionSlug;
  /** Các phiên bản / phần của bài: "Intro", "Ver. 2", ... */
  tags: string[];
  /** Ngày thêm bài (YYYY-MM-DD) — dùng để sắp xếp và gắn nhãn "Mới" */
  addedAt: string;
  level: "Dễ" | "Vừa" | "Khó";
  key?: string;
  bpm?: number;
  audioUrl?: string;
  /** Bài mở miễn phí cho mọi người xem */
  free?: boolean;
  /** Tab dạng ASCII. Khi có kho thật, thay bằng sheet/ảnh/PDF. */
  tab?: string;
};

// Dữ liệu MẪU để dựng giao diện — toàn bộ là dân ca / nhạc cổ điển phổ biến.
// Tab bên dưới chỉ là bài tập minh hoạ, không phải bản chuyển soạn của bài.
const DEMO_TAB = `e|-----------------5-8-----------------|
B|-------------5-8-------8-5-------------|
G|-------5-7-------------------7-5-------|
D|---5-7---------------------------7-5---|
A|-------------------------------------7-|
E|-5-8-----------------------------------|`;

const DEMO_AUDIO = "/audio/demo.wav";

export const songs: Song[] = [
  {
    slug: "greensleeves",
    title: "Greensleeves",
    artist: "Dân ca Anh",
    collection: "solo",
    tags: ["Fingerstyle", "Intro"],
    addedAt: "2026-10-28",
    level: "Vừa",
    key: "Am",
    bpm: 84,
    audioUrl: DEMO_AUDIO,
    free: true,
    tab: DEMO_TAB,
  },
  {
    slug: "romance-de-amor",
    title: "Romance de Amor",
    artist: "Khuyết danh",
    collection: "solo",
    tags: ["Classical", "Ver. 1"],
    addedAt: "2026-11-03",
    level: "Khó",
    key: "Em",
    bpm: 72,
    audioUrl: DEMO_AUDIO,
    tab: DEMO_TAB,
  },
  {
    slug: "canon-in-d",
    title: "Canon in D",
    artist: "J. Pachelbel",
    collection: "solo",
    tags: ["Fingerstyle", "Ver. ngắn", "Ver. đầy đủ"],
    addedAt: "2026-10-12",
    level: "Khó",
    key: "D",
    bpm: 66,
    tab: DEMO_TAB,
  },
  {
    slug: "fur-elise",
    title: "Für Elise",
    artist: "L. van Beethoven",
    collection: "solo",
    tags: ["Classical"],
    addedAt: "2026-09-30",
    level: "Vừa",
    key: "Am",
    audioUrl: DEMO_AUDIO,
    tab: DEMO_TAB,
  },
  {
    slug: "scarborough-fair",
    title: "Scarborough Fair",
    artist: "Dân ca Anh",
    collection: "solo",
    tags: ["Fingerstyle", "Drop D"],
    addedAt: "2026-11-05",
    level: "Vừa",
    key: "Dm",
    tab: DEMO_TAB,
  },
  {
    slug: "ly-cay-bong",
    title: "Lý cây bông",
    artist: "Dân ca Nam Bộ",
    collection: "melody",
    tags: ["Melody"],
    addedAt: "2026-10-20",
    level: "Dễ",
    key: "C",
    bpm: 96,
    audioUrl: DEMO_AUDIO,
    free: true,
    tab: DEMO_TAB,
  },
  {
    slug: "beo-dat-may-troi",
    title: "Bèo dạt mây trôi",
    artist: "Dân ca Quan họ",
    collection: "melody",
    tags: ["Melody", "Ver. chậm"],
    addedAt: "2026-11-01",
    level: "Dễ",
    key: "Am",
    audioUrl: DEMO_AUDIO,
    tab: DEMO_TAB,
  },
  {
    slug: "trong-com",
    title: "Trống cơm",
    artist: "Dân ca Quan họ",
    collection: "melody",
    tags: ["Melody"],
    addedAt: "2026-10-05",
    level: "Dễ",
    key: "G",
    bpm: 110,
    tab: DEMO_TAB,
  },
  {
    slug: "qua-cau-gio-bay",
    title: "Qua cầu gió bay",
    artist: "Dân ca Quan họ",
    collection: "melody",
    tags: ["Melody", "Intro"],
    addedAt: "2026-09-18",
    level: "Vừa",
    key: "Em",
    audioUrl: DEMO_AUDIO,
    tab: DEMO_TAB,
  },
  {
    slug: "ly-ngua-o",
    title: "Lý ngựa ô",
    artist: "Dân ca Nam Bộ",
    collection: "melody",
    tags: ["Melody"],
    addedAt: "2026-10-30",
    level: "Vừa",
    key: "D",
    bpm: 120,
    tab: DEMO_TAB,
  },
  {
    slug: "amazing-grace",
    title: "Amazing Grace",
    artist: "Thánh ca",
    collection: "melody",
    tags: ["Melody", "Ver. 3/4"],
    addedAt: "2026-08-22",
    level: "Dễ",
    key: "G",
    audioUrl: DEMO_AUDIO,
    tab: DEMO_TAB,
  },
  {
    slug: "inh-la-oi",
    title: "Inh lả ơi",
    artist: "Dân ca Thái",
    collection: "melody",
    tags: ["Melody"],
    addedAt: "2026-11-04",
    level: "Dễ",
    key: "Am",
    tab: DEMO_TAB,
  },
];
