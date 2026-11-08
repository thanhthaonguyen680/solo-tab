# solo.tab

🌐 **Website:** https://solotab.site

Kho tab guitar solo & melody tiếng Việt, cho người tự tập đàn. Mỗi bài là một bản tab **tương tác**: không chỉ để đọc, mà còn nghe, xem và tập theo từng nốt.

## Tính năng nổi bật

### 🎸 Tab tương tác cho người tập
- **Nghe và nhìn cùng lúc:** bấm phát là đàn chơi, con trỏ chạy theo từng nốt trên khuông nhạc và tab, trang tự cuộn theo.
- **Chỉnh tempo theo bpm:** chậm lại để tập, nhanh dần khi đã quen; cao độ không đổi.
- **Lặp đoạn, máy đếm nhịp, đếm vào:** tập từng câu khó cho tới khi chơi đều.
- **Phát từ bất kỳ nốt nào:** bấm vào nốt là nghe từ chỗ đó.
- **Đọc được đủ kỹ thuật** của bản soạn gốc: capo, luyến, nốt nối, hoà âm, chặn dây, rải hợp âm, tên hợp âm.

### ⚡ Thêm bài chỉ bằng một file
- **File Guitar Pro** (`.gp5`, `.gp`, `.gpx`…) hoặc **MusicXML:** tải lên là có tab tương tác chính xác như bản gốc.
- **Sheet PDF xuất từ Guitar Pro:** hệ thống **tự đọc** số trên tab và ký hiệu trường độ trên khuông nhạc để dựng lại tab tương tác, không cần chép tay. Admin xem trước số ô nhịp, số nốt trước khi lưu.
- **Sheet PDF vẫn được giữ** làm bản in tham khảo, thu gọn dưới trình phát và có watermark.

### 🤝 Cộng đồng cùng đóng góp
- Nút **Đóng góp**: đăng ký / đăng nhập bằng tên đăng nhập + mật khẩu (không cần email).
- **Đẩy file PDF hoặc Guitar Pro lên** là hệ thống tự dựng phần nhạc phát được ngay trên trình duyệt; nghe thử rồi gửi.
- **Kiểm duyệt trước khi đăng:** admin nghe thử, duyệt hoặc trả về kèm lời nhắn. Bài được đăng ghi rõ **“Soạn tab bởi …”**.

### 🛠 Trang quản trị gọn nhẹ
- Thêm, sửa, xoá bài; đặt độ khó, tông, tempo mặc định cho từng bài.
- **Soạn tab mới từ đầu:** chọn cách lên dây, capo, tempo, nhịp và số ô là có ngay tab trống để điền nốt, không cần Guitar Pro.
- **Sửa tab trực quan ngay trong admin:** bấm vào nốt hoặc dây trống rồi gõ số phím; thanh công cụ có chia đôi nốt để chèn, thêm nốt đôi / hợp âm, đổi trường độ, thêm/xoá ô nhịp, tiếng đập “xx”, luyến, ngân. **Chép / dán ô nhịp** (một hoặc nhiều ô) cho đoạn lặp lại. Ô bị thừa phách được **tự dồn như Guitar Pro**: bớt dấu lặng cuối ô, nốt quá vạch nhịp chuyển sang ô sau, hết ô thì tự thêm ô. Nghe thử với tempo tuỳ chỉnh, hoàn tác/làm lại, cảnh báo ô thiếu/thừa phách.
- Sửa xong là site cập nhật ngay, không cần deploy lại.

### 📱 Dùng tốt trên điện thoại
- Giao diện tối, gọn trên màn hình nhỏ; thanh điều khiển luôn nằm trong tầm tay khi cuộn.
- **Chế độ cuộn ngang:** bản nhạc trôi mượt dưới con trỏ, trang không giật khi đang phát.
- Trên iPhone vẫn nghe được tiếng kể cả khi máy đang để chế độ im lặng.
- Lưu ra màn hình chính như một app, có icon riêng.

## Tech stack

- **Next.js 16** (App Router) · **TypeScript** · **Tailwind CSS v4**
- **Neon Postgres**: dữ liệu bài, sheet, tab và thành viên
- **alphaTab**: vẽ tab, phát nhạc bằng soundfont guitar
- **pdf.js**: chuyển sheet PDF thành ảnh và đọc tab tự động ngay trong trình duyệt
- **Vercel**: hosting, tự deploy khi push lên `main`

---

© 2026 solo.tab · A product by **Thao.Nguyen**
