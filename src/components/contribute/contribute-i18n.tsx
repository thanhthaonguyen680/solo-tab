/** Chữ trên trang đóng góp (/dong-gop, /en/contribute) */
import type { Lang } from "@/i18n";

const B = ({ children }: { children: React.ReactNode }) => <b className="text-soft">{children}</b>;

const vi = {
  metaTitle: "Đóng góp tab",
  metaDescription:
    "Cùng góp những bản soạn guitar fingerstyle hay cho cộng đồng: tải file Guitar Pro / PDF lên hoặc tự soạn tab ngay trên trình duyệt.",
  eyebrow: "Đóng góp",
  title: ["Gửi tab ", "của bạn"] as [string, string],
  lead: "Cùng góp những bản soạn hay cho cộng đồng guitar fingerstyle nhé! Có sẵn file thì tải lên, chưa có thì cứ thoải mái soạn ngay tại đây. Gửi xong, bài sẽ chờ admin duyệt ít phút rồi hiện trên site.",
  sent: (title: string) => `✓ Đã gửi “${title}”. Bài đang chờ duyệt — ít phút nữa sẽ hiện trên site.`,
  tabs: {
    region: "Gửi bài",
    list: "Cách đóng góp",
    file: { label: "Tải file lên", hint: "Guitar Pro, PDF, MusicXML" },
    compose: { label: "Tự soạn tab", hint: "Soạn thoải mái ngay tại đây" },
  },
  upload: {
    heading: "Tải file lên",
    intro: (
      <>
        <B>File Guitar Pro</B> (.gp, .gp5, .gpx…) / MusicXML, hoặc <B>PDF xuất từ Guitar Pro</B>. Hệ thống tự dựng phần nhạc phát được —
        nghe thử rồi gửi.
      </>
    ),
    pick: "Chọn file PDF / Guitar Pro",
    pickOther: "Chọn file khác",
    wrongType: (exts: string) => `Chọn file PDF hoặc file Guitar Pro / MusicXML (${exts}).`,
    readFail: "Không đọc được file.",
    reading: (name: string) => `Đang đọc “${name}”…`,
    built: (name: string, bars: number) => (
      <>
        🎸 Đã dựng phần nhạc từ <b>{name}</b>: {bars} ô nhịp. Bấm phát để nghe thử.
      </>
    ),
    oddBars: (bars: string) => `Có thể đọc chưa chuẩn ở ô ${bars} — admin sẽ nghe và chỉnh khi duyệt.`,
    track: "Track hiển thị:",
    notes: (n: number) => `${n} nốt`,
  },
  compose: {
    heading: "Tự soạn tab",
    intro:
      "Không có file Guitar Pro? Tạo khung tab trống rồi bấm vào từng chỗ để điền số phím, đổi trường độ, thêm luyến / ngân, nghe thử ngay — xong thì gửi.",
    open: "Mở trình soạn",
    opening: "Đang mở trình soạn…",
    done: "Xong, gửi bài →",
    finished: "🎸 Tab đã soạn xong. Nghe lại lần cuối, điền thông tin bài rồi gửi.",
    editMore: "← Sửa tiếp",
    discard: "Bỏ tab này",
    confirmDiscard: "Bỏ tab vừa soạn?",
  },
  form: {
    region: "Thông tin bài",
    title: "Tên bài *",
    artist: "Ca sĩ / tác giả bài hát",
    name: "Người đóng góp",
    nameHint: "Tên hoặc biệt danh của bạn — hiện trên bản nhạc khi bài được đăng. Để trống nếu muốn ẩn danh.",
    namePlaceholder: "VD: Minh Anh",
    collection: "Kho",
    level: "Độ khó",
    rights: (
      <>
        <b>Tôi tự soạn tab này</b> (hoặc được người soạn cho phép đăng). Tab có thể bị gỡ nếu chủ sở hữu bản quyền yêu cầu.
      </>
    ),
    submit: "Gửi đóng góp",
    sending: "Đang gửi…",
    cancel: "Huỷ",
    network: "Không gửi được — kiểm tra mạng rồi thử lại.",
  },
};

export type ContributeText = typeof vi;

const en: ContributeText = {
  metaTitle: "Contribute a tab",
  metaDescription:
    "Share great fingerstyle guitar arrangements with the community: upload a Guitar Pro / PDF file or compose a tab right in your browser.",
  eyebrow: "Contribute",
  title: ["Share ", "your tab"],
  lead: "Share your favourite arrangements with the fingerstyle guitar community! Got a file? Upload it. No file yet? Compose away right here. Once sent, your tab waits a few minutes for the admin to approve it, then goes live.",
  sent: (title) => `✓ “${title}” sent. It’s waiting for approval and will be live in a few minutes.`,
  tabs: {
    region: "Submit a tab",
    list: "Ways to contribute",
    file: { label: "Upload a file", hint: "Guitar Pro, PDF, MusicXML" },
    compose: { label: "Compose a tab", hint: "Write it right here" },
  },
  upload: {
    heading: "Upload a file",
    intro: (
      <>
        A <B>Guitar Pro file</B> (.gp, .gp5, .gpx…) / MusicXML, or a <B>PDF exported from Guitar Pro</B>. We turn it into a playable tab —
        have a listen, then send it.
      </>
    ),
    pick: "Choose a PDF / Guitar Pro file",
    pickOther: "Choose another file",
    wrongType: (exts) => `Choose a PDF or a Guitar Pro / MusicXML file (${exts}).`,
    readFail: "Couldn't read the file.",
    reading: (name) => `Reading “${name}”…`,
    built: (name, bars) => (
      <>
        🎸 Built a playable tab from <b>{name}</b>: {bars} {bars === 1 ? "bar" : "bars"}. Press play to listen.
      </>
    ),
    oddBars: (bars) => `Bars ${bars} may not have been read perfectly — the admin will listen and fix them during review.`,
    track: "Track to show:",
    notes: (n) => `${n} ${n === 1 ? "note" : "notes"}`,
  },
  compose: {
    heading: "Compose a tab",
    intro:
      "No Guitar Pro file? Start a blank tab, then click anywhere to enter fret numbers, change note lengths, add slides and let-rings, and listen as you go — send it when you're done.",
    open: "Open the editor",
    opening: "Opening the editor…",
    done: "Done, submit →",
    finished: "🎸 Your tab is ready. Have one last listen, fill in the details and send it.",
    editMore: "← Keep editing",
    discard: "Discard this tab",
    confirmDiscard: "Discard the tab you just composed?",
  },
  form: {
    region: "Song details",
    title: "Song title *",
    artist: "Artist / songwriter",
    name: "Contributor",
    nameHint: "Your name or nickname — shown on the sheet once the tab is published. Leave blank to stay anonymous.",
    namePlaceholder: "e.g. Alex Nguyen",
    collection: "Collection",
    level: "Level",
    rights: (
      <>
        <b>I arranged this tab myself</b> (or have the arranger&apos;s permission to post it). Tabs may be removed at the copyright
        owner&apos;s request.
      </>
    ),
    submit: "Submit",
    sending: "Sending…",
    cancel: "Cancel",
    network: "Couldn't send — check your connection and try again.",
  },
};

export const contributeText: Record<Lang, ContributeText> = { vi, en };
