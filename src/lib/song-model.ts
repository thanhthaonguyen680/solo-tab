import { collections, type CollectionSlug } from "@/config/site";

export const LEVELS = ["Dễ", "Vừa", "Khó"] as const;
export type Level = (typeof LEVELS)[number];

/** Bài thành viên gửi: nháp → chờ duyệt → đã đăng / bị từ chối. Bài admin tạo luôn "published". */
export const SONG_STATUSES = ["draft", "pending", "published", "rejected"] as const;
export type SongStatus = (typeof SONG_STATUSES)[number];
export const STATUS_LABEL: Record<SongStatus, string> = {
  draft: "Nháp",
  pending: "Chờ duyệt",
  published: "Đã đăng",
  rejected: "Cần sửa",
};

export type Song = {
  slug: string;
  title: string;
  artist?: string;
  collection: CollectionSlug;
  /** Các phiên bản / phần của bài: "Intro", "Ver. 2", ... */
  tags: string[];
  /** Ngày thêm bài (YYYY-MM-DD) — dùng để sắp xếp và gắn nhãn "Mới" */
  addedAt: string;
  level: Level;
  key?: string;
  bpm?: number;
  audioUrl?: string;
  /** Bài mở miễn phí cho mọi người xem */
  free?: boolean;
  /** Tab dạng ASCII */
  tab?: string;
  /** Sheet PDF đã chuyển thành ảnh: phiên bản đang dùng và kích thước từng trang */
  sheet?: Sheet;
  /** Tab tương tác (alphaTex) — đọc tự động từ sheet PDF Guitar Pro khi admin tải lên */
  notation?: string;
  status?: SongStatus;
  /** Thành viên (tài khoản cũ) đã gửi bài — bài gửi không cần tài khoản thì không có */
  authorId?: number;
  /** Tên người soạn tab: tên tài khoản cũ hoặc tên người gửi tự ghi */
  authorName?: string;
  /** Bài do người dùng gửi qua trang Đóng góp (không phải admin tự thêm) */
  contributed?: boolean;
  /** Ghi chú của admin khi từ chối bài */
  reviewNote?: string;
};

export type Sheet = {
  version: string;
  pages: { width: number; height: number }[];
};

/** Giới hạn cho sheet PDF */
export const SHEET_LIMITS = {
  maxPages: 30,
  /** Mỗi ảnh trang — dưới giới hạn 4,5 MB/request của Vercel */
  maxPageBytes: 3.5 * 1024 * 1024,
  contentTypes: ["image/webp", "image/jpeg", "image/png"] as const,
};

export const SHEET_VERSION_PATTERN = /^[a-f0-9-]{36}$/;

/** Giới hạn dữ liệu tab tương tác gửi kèm khi lưu sheet */
export const NOTATION_MAX_CHARS = 300_000;

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Link bài nằm ngay sau tên miền (/ten-bai) nên không được trùng tên các trang có sẵn của site
 * (kho bài, đóng góp, admin, trang tiếng Anh, link cũ /bai…).
 */
export const RESERVED_SLUGS = new Set(["solo", "melody", "en", "bai", "song", "tac-gia", "author", "dong-gop", "contribute", "goi", "admin", "api", "dang-nhap"]);

/** "Bèo dạt mây trôi" → "beo-dat-may-troi" */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type SongFieldErrors = Partial<Record<keyof Song, string>>;

export type ParsedSong = { ok: true; song: Song } | { ok: false; errors: SongFieldErrors };

function text(form: FormData, name: string) {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

/** Đọc và kiểm tra dữ liệu form admin. Dùng ở server — không tin dữ liệu từ client. */
export function parseSongForm(form: FormData): ParsedSong {
  const errors: SongFieldErrors = {};

  const title = text(form, "title");
  if (!title) errors.title = "Nhập tên bài";
  else if (title.length > 200) errors.title = "Tên bài tối đa 200 ký tự";

  const slug = text(form, "slug") || slugify(title);
  if (!SLUG_PATTERN.test(slug)) errors.slug = "Chỉ dùng chữ thường không dấu, số và dấu gạch ngang";
  else if (RESERVED_SLUGS.has(slug)) errors.slug = "Đường dẫn này trùng với một trang có sẵn của site — thêm chữ khác (vd. ten-bai-tab)";

  const collection = text(form, "collection");
  if (!Object.hasOwn(collections, collection)) errors.collection = "Chọn kho bài";

  const level = text(form, "level");
  if (!(LEVELS as readonly string[]).includes(level)) errors.level = "Chọn độ khó";

  const bpmRaw = text(form, "bpm");
  const bpm = bpmRaw ? Number(bpmRaw) : undefined;
  if (bpm !== undefined && !(Number.isInteger(bpm) && bpm >= 20 && bpm <= 400)) {
    errors.bpm = "Tempo là số nguyên từ 20 đến 400";
  }

  const addedAt = text(form, "addedAt") || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(addedAt) || Number.isNaN(Date.parse(addedAt))) {
    errors.addedAt = "Ngày không hợp lệ";
  }

  const audioUrl = text(form, "audioUrl");
  if (audioUrl && !/^(https:\/\/|\/)/.test(audioUrl)) {
    errors.audioUrl = "Link audio phải bắt đầu bằng https:// hoặc /";
  }

  const tags = [
    ...new Set(
      text(form, "tags")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];
  if (tags.length > 12) errors.tags = "Tối đa 12 tag";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    song: {
      slug,
      title,
      artist: text(form, "artist") || undefined,
      collection: collection as CollectionSlug,
      tags,
      addedAt,
      level: level as Level,
      key: text(form, "key") || undefined,
      bpm,
      audioUrl: audioUrl || undefined,
      free: form.get("free") === "on",
      // Tab chữ không còn nhập trên form (đã thay bằng sheet PDF); tab cũ trong DB giữ nguyên
    },
  };
}
