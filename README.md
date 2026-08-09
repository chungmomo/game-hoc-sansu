# Công Chúa Toán Học

Web app luyện phép cộng 2 chữ số + 2 chữ số kiểu Kumon, dành cho bé 7 tuổi
(lớp 1), chủ đề công chúa cổ tích. Ứng dụng dạy bé cách **đặt tính cộng theo
cột** (đơn vị → chục → trăm, viết/nhớ) thay vì chỉ đoán đáp số cuối.

Toàn bộ nhân vật công chúa là thiết kế gốc (icon + tên tự đặt) — không dùng
hình ảnh hay tên nhân vật có bản quyền của Disney hay bất kỳ hãng nào khác.

## Chạy thử

Ứng dụng là static site thuần HTML/CSS/JS, không cần build. Chạy một server
tĩnh bất kỳ từ thư mục dự án, ví dụ:

```bash
python3 -m http.server 8420
```

rồi mở `http://localhost:8420`. (Có thể mở thẳng `index.html` bằng trình
duyệt, nhưng một số trình duyệt giới hạn `localStorage`/audio trên `file://`
nên dùng server tĩnh sẽ ổn định hơn.)

## Cấu trúc dự án

```
index.html          Khung 3 màn hình: trang chủ / chơi / kết quả
style.css            Toàn bộ giao diện
src/
  math.js            Logic toán học thuần (không đụng DOM) — sinh đề bài,
                      tính kế hoạch cộng theo cột. Chạy được cả trong
                      trình duyệt (window.PM.Math) lẫn Node (module.exports).
  data.js             Nội dung game: danh sách công chúa, cấp độ, các câu
                      thoại động viên, và việc lưu/đọc tiến trình qua
                      localStorage.
  audio.js            Hiệu ứng âm thanh bằng WebAudio (không cần file mp3),
                      có thể bật/tắt qua nút loa.
  effects.js          Hiệu ứng hình ảnh: confetti, sticker thưởng, toast.
                      Tự giảm số lượng hạt khi trình duyệt bật
                      "reduce motion".
  app.js              Nối tất cả lại: render 3 màn hình, xử lý sự kiện
                      chuột/bàn phím, state machine của một lượt chơi.
test/
  math.test.js        Bộ test cho src/math.js, chạy bằng `npm test`.
```

Tách `math.js` (thuần, không DOM) khỏi phần còn lại giúp logic sinh đề bài
và kế hoạch cộng-nhớ được kiểm thử tự động độc lập với giao diện.

## Kiểm thử

```bash
npm test
```

Chạy hàng nghìn phép tính ngẫu nhiên cho cả 3 cấp độ để xác nhận: đầu vào
luôn là số 2 chữ số, tổng tính đúng, cấp độ Dễ không bao giờ có nhớ, cấp độ
Vừa luôn nhớ ở hàng đơn vị và tổng vẫn dưới 100, và kế hoạch cộng theo cột
(`buildColumnPlan`) luôn ráp lại đúng đáp số.

## Cơ chế dạy cộng theo cột

Mỗi bài toán được giải theo từng cột một, từ hàng đơn vị lên hàng chục
(rồi hàng trăm nếu có nhớ). Ví dụ 36 + 58:

1. "Hàng Đơn Vị: 6 + 8 = ?" → bé nhập **14** → hệ thống tách thành
   "viết 4, nhớ 1", chip **nhớ 1** hiện lên trên cột Chục.
2. "Hàng Chục: 3 + 5 + nhớ 1 = ?" → bé nhập **9** → đáp số cuối **94**.

Nếu số nhớ tràn ra khỏi cả hai số ban đầu (ví dụ 85 + 90 = 175), thêm một
bước "mang nhớ xuống" ở hàng trăm để bé hiểu số nhớ cuối cùng cũng phải
được viết xuống.
