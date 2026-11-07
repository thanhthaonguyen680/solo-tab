-- Schema cho solo.tab (Neon Postgres). Chạy lại nhiều lần vẫn an toàn.

create table if not exists songs (
  slug        text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null,
  artist      text,
  collection  text not null check (collection in ('solo', 'melody')),
  -- Các phiên bản / phần của bài: "Intro", "Ver. 2", ...
  tags        text[] not null default '{}',
  level       text not null check (level in ('Dễ', 'Vừa', 'Khó')),
  key         text,
  bpm         integer check (bpm between 20 and 400),
  audio_url   text,
  -- Tab dạng ASCII. Sau này có thể thêm cột cho sheet ảnh/PDF.
  tab         text,
  -- Bài mở miễn phí cho mọi người xem
  free        boolean not null default false,
  -- Ngày thêm bài — dùng để sắp xếp và gắn nhãn "Mới"
  added_at    date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists songs_collection_added_at_idx on songs (collection, added_at desc);

-- ---------- Sheet PDF (lưu thành ảnh từng trang) ----------

-- Phiên bản sheet đang hiển thị. Sheet mới được tải lên dưới một version mới và chỉ
-- được kích hoạt (gán vào đây) khi đã đủ mọi trang — tải dở không làm hỏng sheet cũ.
alter table songs add column if not exists sheet_version text;

create table if not exists song_sheet_pages (
  song_slug     text not null references songs (slug) on update cascade on delete cascade,
  version       text not null,
  page          integer not null check (page between 1 and 50),
  image         bytea not null,
  content_type  text not null check (content_type in ('image/webp', 'image/jpeg', 'image/png')),
  width         integer not null check (width > 0),
  height        integer not null check (height > 0),
  created_at    timestamptz not null default now(),
  primary key (song_slug, version, page)
);

-- Tab tương tác (alphaTex), đọc tự động từ sheet PDF xuất bởi Guitar Pro
alter table songs add column if not exists notation text;
