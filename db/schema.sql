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

-- ---------- Thành viên đóng góp (tên đăng nhập + mật khẩu, không cần email) ----------

-- Bản thử trước đăng nhập bằng Google (bảng còn trống) → đổi sang bảng mới một lần
do $$ begin
  if exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'google_sub') then
    drop table if exists user_sessions;
    drop table users cascade; -- bỏ luôn khoá ngoại songs.author_id, thêm lại ở dưới
  end if;
end $$;

create table if not exists users (
  id             bigint generated always as identity primary key,
  -- chữ thường, số, dấu chấm / gạch dưới; hiện làm tên người soạn trên trang bài
  username       text not null unique check (username ~ '^[a-z0-9._]{3,30}$'),
  -- "scrypt:<salt hex>:<hash hex>"
  password_hash  text not null,
  is_banned      boolean not null default false,
  created_at     timestamptz not null default now(),
  last_login_at  timestamptz not null default now()
);

-- Phiên đăng nhập: cookie giữ token ngẫu nhiên, DB chỉ lưu SHA-256 của token
create table if not exists user_sessions (
  token_hash  text primary key,
  user_id     bigint not null references users (id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists user_sessions_user_idx on user_sessions (user_id);

-- Bài do thành viên gửi: nháp → chờ duyệt → đã đăng / bị từ chối. Bài admin tạo mặc định "published".
alter table songs add column if not exists status text not null default 'published';
do $$ begin
  alter table songs add constraint songs_status_check check (status in ('draft', 'pending', 'published', 'rejected'));
exception when duplicate_object then null; end $$;
alter table songs add column if not exists author_id bigint;
do $$ begin
  alter table songs add constraint songs_author_id_fkey foreign key (author_id) references users (id) on delete set null;
exception when duplicate_object then null; end $$;
alter table songs add column if not exists review_note text;
alter table songs add column if not exists submitted_at timestamptz;
create index if not exists songs_author_idx on songs (author_id);
create index if not exists songs_status_idx on songs (status);

-- ---------- Đóng góp không cần tài khoản ----------

-- Bảng users / user_sessions ở trên chỉ còn để giữ tên người soạn của các bài gửi trước đây.
-- Tên người gửi tự ghi (tuỳ chọn) — hiện là "người soạn tab" trên trang bài
alter table songs add column if not exists contributor_name text;
-- SHA-256 của IP người gửi (không lưu IP gốc) — để giới hạn số bài chờ duyệt, chống spam
alter table songs add column if not exists submitter_hash text;
create index if not exists songs_pending_submitter_idx on songs (submitter_hash) where status = 'pending';
