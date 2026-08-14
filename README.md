# Công Chúa Toán Học

Web app luyện phép cộng kiểu Kumon, dành cho bé 7 tuổi (lớp 1), chủ đề công
chúa cổ tích. Ứng dụng dạy bé cách **đặt tính cộng theo cột** (đơn vị →
chục → trăm → nghìn, viết/nhớ) thay vì chỉ đoán đáp số cuối. 5 cấp độ tăng
dần: 2 chữ số + 2 chữ số (không nhớ → có nhớ → tự do) rồi tới 3 chữ số +
2 chữ số và 3 chữ số + 3 chữ số.

Toàn bộ nhân vật công chúa là thiết kế gốc (icon + tên tự đặt) — không dùng
hình ảnh hay tên nhân vật có bản quyền của Disney hay bất kỳ hãng nào khác.

## Chạy thử

Ứng dụng là static site thuần HTML/CSS/JS, không cần build, nhưng **cần một
Firebase project** vì tiến trình chơi được lưu trên Firestore (xem mục
"Thiết lập Firebase" bên dưới).

Chạy một server tĩnh bất kỳ từ thư mục dự án, ví dụ:

```bash
python3 -m http.server 8420
```

rồi mở `http://localhost:8420`. (Bắt buộc phải qua server tĩnh, không mở
thẳng `index.html` bằng `file://` — Firebase SDK cần origin `http(s)`.)

## Thiết lập Firebase

App dùng Firebase (Firestore + Anonymous Auth) để lưu tiến trình của nhiều
hồ sơ bé trên cùng một thiết bị/trình duyệt, chơi được cả khi mất mạng
(Firestore tự đồng bộ lại khi có mạng).

1. Tạo project tại [console.firebase.google.com](https://console.firebase.google.com/).
2. Trong project, bấm biểu tượng `</>` để đăng ký một Web App (không cần
   Firebase Hosting) — Firebase sẽ hiện một object `firebaseConfig`.
3. Vào **Build → Firestore Database** → tạo database (Native mode).
4. Vào **Build → Authentication → Sign-in method** → bật **Anonymous**.
5. Trong Firestore → tab **Rules**, dán:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
6. Mở [`src/firebase-config.js`](src/firebase-config.js) và thay các giá trị
   `REPLACE_ME` bằng `firebaseConfig` lấy được ở bước 2.

Lưu ý: vì dùng đăng nhập ẩn danh theo trình duyệt (không có tài khoản
email/password), danh sách hồ sơ bé gắn với *thiết bị/trình duyệt* — mở app
trên máy khác sẽ là danh sách hồ sơ rỗng, không tự đồng bộ giữa các máy.

## Cấu trúc dự án

```
index.html          Khung 3 màn hình: trang chủ / chơi / kết quả
style.css            Toàn bộ giao diện
src/
  math.js            Logic toán học thuần (không đụng DOM) — sinh đề bài,
                      tính kế hoạch cộng theo cột. Chạy được cả trong
                      trình duyệt (window.PM.Math) lẫn Node (module.exports).
  data.js             Nội dung game: danh sách công chúa, cấp độ, các câu
                      thoại động viên, và hình dạng (shape) mặc định của
                      một save-state.
  firebase-config.js  Config Web App của Firebase (không phải bí mật) —
                      cần tự điền, xem mục "Thiết lập Firebase".
  cloud.js            Lưu/đọc tiến trình qua Firebase (Firestore +
                      Anonymous Auth): khởi tạo, danh sách/tạo/xoá hồ sơ
                      bé, load/save state của một hồ sơ.
  audio.js            Hiệu ứng âm thanh bằng WebAudio (không cần file mp3),
                      có thể bật/tắt qua nút loa.
  effects.js          Hiệu ứng hình ảnh: confetti, sticker thưởng, toast.
                      Tự giảm số lượng hạt khi trình duyệt bật
                      "reduce motion".
  app.js              Nối tất cả lại: màn hình chọn hồ sơ + 3 màn hình chơi,
                      xử lý sự kiện chuột/bàn phím, state machine của một
                      lượt chơi.
test/
  math.test.js        Bộ test cho src/math.js, chạy bằng `npm test`.
```

Tách `math.js` (thuần, không DOM) khỏi phần còn lại giúp logic sinh đề bài
và kế hoạch cộng-nhớ được kiểm thử tự động độc lập với giao diện.

## Kiểm thử

```bash
npm test
```

Chạy hàng nghìn phép tính ngẫu nhiên cho cả 5 cấp độ để xác nhận: đúng số
chữ số đầu vào cho từng cấp (2 chữ số cho cấp 1-3, 3 chữ số cho cấp 4-5),
tổng tính đúng, cấp độ Dễ không bao giờ có nhớ, cấp độ Vừa luôn nhớ ở hàng
đơn vị và tổng vẫn dưới 100, và kế hoạch cộng theo cột (`buildColumnPlan`)
luôn ráp lại đúng đáp số — kể cả khi số nhớ tràn tới hàng nghìn (vd
999 + 999).

## Cơ chế dạy cộng theo cột

Giao diện hiện tại dùng tiếng Nhật (hiragana) vì bé học tiểu học ở Nhật.
Mỗi bài toán được giải theo từng cột một, từ hàng đơn vị (いちのくらい) lên
hàng chục (じゅうのくらい), hàng trăm (ひゃくのくらい), rồi hàng nghìn
(せんのくらい) nếu có nhớ (くりあがり) — cấp độ 4-5 (3 chữ số) có thể cần
tới cột hàng nghìn. Bên trái thẻ bài toán luôn hiển thị tổng quan (vd
"もんだい：36 + 58 = ?") để bé biết đang làm phép tính nào. Ví dụ 36 + 58:

1. "いちのくらい：6 + 8 = ?" → bé nhập **14** → hệ thống tách thành
   "viết 4, nhớ 1"; số nhớ **1** bay theo mũi tên từ cột Đơn Vị sang và
   đậu xuống *dưới* hai chữ số của cột Chục (thể hiện thứ tự 2+3 rồi
   mới +1).
2. "じゅうのくらい：3 + 5 + くりあがり1 = ?" → bé nhập **9** → đáp số
   cuối **94**.

Nếu số nhớ tràn ra khỏi cả hai số ban đầu (ví dụ 85 + 90 = 175), thêm một
bước "くりあがりの 1 を したに かいてね" (mang số nhớ xuống viết) ở hàng
trăm để bé hiểu số nhớ cuối cùng cũng phải được viết xuống.
