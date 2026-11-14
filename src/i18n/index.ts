/**
 * Song ngữ VI / EN cho phần đọc tab của site công khai.
 * Tiếng Việt giữ link cũ (/bai/…), tiếng Anh nằm dưới /en với đường dẫn tiếng Anh (/en/song/…).
 * Trang đóng góp: /dong-gop ↔ /en/contribute. Trang admin chỉ có tiếng Việt.
 * Dùng được cả ở server lẫn client component (không có gì bí mật ở đây).
 */
import { formatVnd } from "@/config/site";
import type { Level } from "@/lib/song-model";

export const LANGS = ["vi", "en"] as const;
export type Lang = (typeof LANGS)[number];

const vi = {
  langName: "Tiếng Việt",
  switchTo: "Switch to English",
  tagline: "Kho tab guitar solo & melody",
  description: "Tab guitar solo và melody, có audio mẫu, cập nhật mỗi tuần.",
  nav: { contribute: "Đóng góp", signUp: "Đăng ký", home: "trang chủ" },
  footer: { contact: "Liên hệ" },
  level: { "Dễ": "Dễ", "Vừa": "Vừa", "Khó": "Khó" } as Record<Level, string>,
  badge: { new: "Mới", free: "Miễn phí" },
  collections: {
    solo: "Fingerstyle, intro, đoạn solo — chơi một mình vẫn đầy đủ.",
    melody: "Giai điệu chính của bài hát, dễ bắt đầu, dễ đệm cùng.",
  },
  songs: (n: number) => `${n} bài`,
  home: {
    updated: "Cập nhật mỗi tuần",
    title: "Tab guitar solo & melody, đọc là chơi được.",
    lead: "Mỗi bài có tab rõ ràng, độ khó, tông, tempo và audio mẫu để nghe trước khi tập.",
    browse: "Xem kho bài",
    perMonth: (price: number) => `${formatVnd(price)}/tháng`,
    latestEyebrow: "Mới cập nhật",
    latestTitle: "Danh sách bài",
    /** Nút hiện thêm bài ở cuối danh sách trang chủ */
    more: (left: number) => `Xem thêm (còn ${left} bài)`,
  },
  collection: {
    back: "← Trang chủ",
    request: "Chưa có bài bạn cần? Yêu cầu bài →",
  },
  browser: {
    search: "Tìm bài",
    placeholder: "Tìm bài, tác giả, phiên bản… (gõ không dấu cũng được)",
    audioOnly: "Có audio",
    sort: "Sắp xếp",
    az: "Tên A → Z",
    za: "Tên Z → A",
    newest: "Mới nhất",
    oldest: "Cũ nhất",
    easy: "Dễ → Khó",
    hard: "Khó → Dễ",
    count: (shown: number, total: number) => `${shown} / ${total} bài`,
    empty: "Kho này chưa có bài — sắp cập nhật.",
    noMatch: (q: string) => `Không tìm thấy bài nào khớp “${q}”.`,
    noAudio: "Không có bài nào có audio.",
  },
  song: {
    metaDescription: (title: string, artist?: string) => `Tab guitar ${title}${artist ? ` — ${artist}` : ""}`,
    tabBy: "Soạn tab bởi",
    level: "Độ khó",
    key: "Tông",
    tempo: "Tempo",
    audio: "Audio mẫu",
    pages: (n: number) => `${n} trang`,
    showSheet: "Xem sheet",
    hideSheet: "Thu gọn",
    pageAlt: (title: string, i: number, n: number) => `${title} — trang ${i}/${n}`,
    comingSoon: "Tab đang được cập nhật.",
    locked: "Bài này dành cho thành viên",
    lockedSheet: (n: number) => `Sheet PDF ${n} trang`,
    lockedLead: (price: number) => `Mở toàn bộ kho tab và audio mẫu với gói ${formatVnd(price)}/tháng.`,
    plans: "Xem gói thành viên",
  },
  player: {
    region: "Tab tương tác",
    drawing: "Đang vẽ tab…",
    loadingSound: "Đang tải tiếng đàn…",
    error: "Không tải được tab tương tác.",
    play: "Phát",
    pause: "Tạm dừng",
    stop: "Về đầu bài",
    slower: "Giảm tempo",
    faster: "Tăng tempo",
    resetTempo: (bpm: number) => `Bấm để về tempo mặc định (${bpm} bpm)`,
    loop: "Lặp lại",
    metronome: "Đếm nhịp",
    countIn: "Đếm vào",
    horizontal: "Cuộn ngang",
    hint: "Bấm vào một nốt bất kỳ để phát từ chỗ đó.",
    /** Dòng tên người đóng góp ở góc bản nhạc */
    contributedBy: "Người đóng góp:",
  },
  author: {
    eyebrow: "Người soạn tab",
    member: "Thành viên",
    title: (name: string) => `Tab soạn bởi ${name}`,
    count: (n: number, site: string) => `${n} bài đã đăng trên ${site}`,
  },
  notFound: { title: "Lạc nhịp rồi — không tìm thấy trang", home: "Về trang chủ" },
  loading: "Đang tải…",
};

export type Dict = typeof vi;

const en: Dict = {
  langName: "English",
  switchTo: "Chuyển sang tiếng Việt",
  tagline: "Guitar solo & melody tabs",
  description: "Guitar solo and melody tabs with playable audio, updated every week.",
  nav: { contribute: "Contribute", signUp: "Sign up", home: "home" },
  footer: { contact: "Contact" },
  level: { "Dễ": "Easy", "Vừa": "Medium", "Khó": "Hard" },
  badge: { new: "New", free: "Free" },
  collections: {
    solo: "Fingerstyle, intros and solos — complete on a single guitar.",
    melody: "The main melody of the song — easy to start, easy to play along.",
  },
  songs: (n) => `${n} ${n === 1 ? "song" : "songs"}`,
  home: {
    updated: "Updated every week",
    title: "Guitar solo & melody tabs you can play right away.",
    lead: "Every song comes with a clear tab, difficulty, key, tempo and audio to listen to before you practise.",
    browse: "Browse tabs",
    perMonth: (price) => `${formatVnd(price)}/month`,
    latestEyebrow: "Just added",
    latestTitle: "All tabs",
    more: (left) => `Show more (${left} left)`,
  },
  collection: {
    back: "← Home",
    request: "Can't find your song? Request it →",
  },
  browser: {
    search: "Search songs",
    placeholder: "Search by song, artist, version…",
    audioOnly: "With audio",
    sort: "Sort",
    az: "Title A → Z",
    za: "Title Z → A",
    newest: "Newest",
    oldest: "Oldest",
    easy: "Easy → Hard",
    hard: "Hard → Easy",
    count: (shown, total) => `${shown} / ${total} songs`,
    empty: "No songs here yet — coming soon.",
    noMatch: (q) => `No songs match “${q}”.`,
    noAudio: "No songs with audio.",
  },
  song: {
    metaDescription: (title, artist) => `${title}${artist ? ` by ${artist}` : ""} — guitar tab`,
    tabBy: "Tab by",
    level: "Level",
    key: "Key",
    tempo: "Tempo",
    audio: "Sample audio",
    pages: (n) => `${n} ${n === 1 ? "page" : "pages"}`,
    showSheet: "View sheet",
    hideSheet: "Collapse",
    pageAlt: (title, i, n) => `${title} — page ${i}/${n}`,
    comingSoon: "Tab coming soon.",
    locked: "This tab is for members",
    lockedSheet: (n) => `${n}-page PDF sheet`,
    lockedLead: (price) => `Unlock every tab and audio sample for ${formatVnd(price)}/month.`,
    plans: "See membership",
  },
  player: {
    region: "Interactive tab",
    drawing: "Drawing tab…",
    loadingSound: "Loading guitar sound…",
    error: "Couldn't load the interactive tab.",
    play: "Play",
    pause: "Pause",
    stop: "Back to start",
    slower: "Slower",
    faster: "Faster",
    resetTempo: (bpm) => `Click to reset to the default tempo (${bpm} bpm)`,
    loop: "Loop",
    metronome: "Metronome",
    countIn: "Count-in",
    horizontal: "Scroll sideways",
    hint: "Click any note to play from there.",
    contributedBy: "Contributed by",
  },
  author: {
    eyebrow: "Tab author",
    member: "Member",
    title: (name) => `Tabs by ${name}`,
    count: (n, site) => `${n} ${n === 1 ? "tab" : "tabs"} published on ${site}`,
  },
  notFound: { title: "Out of time — page not found", home: "Back to home" },
  loading: "Loading…",
};

export const dict: Record<Lang, Dict> = { vi, en };

/** Đường dẫn của từng loại trang theo ngôn ngữ */
export const paths = {
  home: (lang: Lang) => (lang === "en" ? "/en" : "/"),
  collection: (lang: Lang, slug: string) => (lang === "en" ? `/en/${slug}` : `/${slug}`),
  song: (lang: Lang, slug: string) => (lang === "en" ? `/en/song/${slug}` : `/bai/${slug}`),
  author: (lang: Lang, id: number | string) => (lang === "en" ? `/en/author/${id}` : `/tac-gia/${id}`),
  contribute: (lang: Lang) => (lang === "en" ? "/en/contribute" : "/dong-gop"),
};

export function langOf(pathname: string): Lang {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "vi";
}

/** Trang tương ứng ở ngôn ngữ kia — trang chưa có bản tiếng Anh thì về trang chủ tiếng Anh */
export function counterpart(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (langOf(pathname) === "en") {
    const [, section, id] = parts;
    if (!section) return "/";
    if (section === "song" && id) return paths.song("vi", id);
    if (section === "author" && id) return paths.author("vi", id);
    if (section === "contribute") return paths.contribute("vi");
    return parts.length === 2 ? paths.collection("vi", section) : "/";
  }
  const [section, id] = parts;
  if (!section) return "/en";
  if (section === "bai" && id) return paths.song("en", id);
  if (section === "tac-gia" && id) return paths.author("en", id);
  if (section === "dong-gop") return paths.contribute("en");
  if (section === "solo" || section === "melody") return paths.collection("en", section);
  return "/en";
}

/** Thẻ hreflang cho một trang có cả hai ngôn ngữ */
export function alternates(lang: Lang, vi: string, enPath: string) {
  return { canonical: lang === "en" ? enPath : vi, languages: { vi, en: enPath, "x-default": vi } };
}
