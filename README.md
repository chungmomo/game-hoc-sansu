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
hồ sơ bé, chơi được cả khi mất mạng (Firestore tự đồng bộ lại khi có mạng),
và chơi tiếp được trên thiết bị khác nhờ một **mã tiếp tục** riêng cho mỗi bé
(xem "Chơi trên nhiều thiết bị" bên dưới).

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
       match /profiles/{profileId} {
         allow read, write: if request.auth != null;
       }
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
   (Quy tắc thứ hai — `users/{uid}/...` — chỉ giữ lại để app còn đọc được
   hồ sơ kiểu cũ một lần khi tự động chuyển sang kiểu mã mới; có thể xoá
   sau khi đã chắc chắn mọi hồ sơ đang dùng đều đã có mã.)
6. Mở [`src/firebase-config.js`](src/firebase-config.js) và thay các giá trị
   `REPLACE_ME` bằng `firebaseConfig` lấy được ở bước 2.

### Chơi trên nhiều thiết bị

Mỗi hồ sơ bé có một **mã tiếp tục** 6 ký tự (vd `A7K2QX`), hiện ra khi tạo hồ
sơ và cũng hiển thị luôn dưới tên bé ở màn hình chọn hồ sơ. Để bé chơi tiếp
trên máy/trình duyệt khác: mở app, bấm "🔑 べつの きき の コードで つづける"
(tiếp tục bằng mã của máy khác) rồi nhập mã đó.

Đánh đổi cần biết: hồ sơ không gắn với tài khoản đăng nhập (email/mật khẩu),
nên **ai biết mã đều xem/sửa được hồ sơ đó** — giống một link chia sẻ. Phù
hợp app dùng trong gia đình; đừng đăng mã lên nơi công khai. Danh sách hồ sơ
hiện trên mỗi thiết bị là các hồ sơ *tạo trên chính thiết bị đó* cộng với các
mã đã từng nhập bằng tay — Firestore là nguồn dữ liệu thật, danh sách này chỉ
là bộ nhớ đệm cục bộ để khỏi phải nhập lại mã mỗi lần mở app.

Hồ sơ tạo trước khi có mã (kiểu `users/{uid}/profiles/{id}` cũ) được tự động
sao chép sang hồ sơ có mã mới, một lần duy nhất cho mỗi thiết bị, ngay lần
đầu mở app sau khi cập nhật — không mất tiến trình đã có trên thiết bị đó.
Nhưng vì hồ sơ cũ vốn đã tách riêng theo từng thiết bị, nếu cùng một bé từng
chơi trên 2 máy khác nhau *trước* khi có mã thì sau khi nâng cấp sẽ thành 2
hồ sơ có mã riêng biệt (không tự gộp điểm) — cần chọn 1 mã để dùng tiếp và tự
xoá hồ sơ còn lại nếu muốn.

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
                      Anonymous Auth): khởi tạo, danh sách/tạo/xoá/liên kết
                      hồ sơ bé bằng mã tiếp tục, load/save state của một hồ
                      sơ, và tự chuyển hồ sơ kiểu cũ sang kiểu có mã.
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
