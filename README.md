# Food Guide – Website thuyết minh quán ăn tự động

Kiến trúc (các service giao tiếp qua HTTP):

```
Trình duyệt ──> gateway :3000 ──┬─> restaurant-service :3001 ─┐
 (/ và /admin)  (static + JWT)  └─> analytics-service  :3002 ─┼─> MySQL
                                        └─(gọi tên quán)──> restaurant-service
```
- **gateway**: phục vụ giao diện, định tuyến API, kiểm tra JWT cho `/api/admin/*`.
- **restaurant-service**: quán ăn, bản dịch (MyMemory), tìm quán theo bán kính (Haversine), đăng nhập admin.
- **analytics-service**: phiên ẩn danh, heartbeat, sự kiện, dashboard.

## Chạy bằng VS Code + Docker (khuyên dùng)
1. Mở thư mục `food-guide` bằng VS Code, mở Terminal.
2. `docker compose up --build`  (lần đầu MySQL khởi tạo mất ~30 giây)
3. Khách: http://localhost:3000   ·   Admin: http://localhost:3000/admin
4. Admin mặc định: `admin` / `admin123` (đổi trong docker-compose.yml: ADMIN_PASSWORD, JWT_SECRET).

3 quán mẫu nằm gần chợ Bến Thành. Để thử ở chỗ bạn đang đứng: vào Admin → Quản lý quán → Sửa → "Lấy tọa độ của tôi".

## Chạy không Docker
Cần MySQL 8 chạy sẵn, nạp `db/init.sql`. Rồi mở 3 terminal: `cd <service> && npm install && npm start`
(biến môi trường: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME; RESTAURANT_URL, ANALYTICS_URL).

## Lưu ý quan trọng
- **GPS chỉ hoạt động trên HTTPS hoặc localhost.** Test trên điện thoại cần deploy (Render cấp HTTPS sẵn) hoặc dùng tunnel (ngrok/cloudflared).
- Ngưỡng nằm đầu `gateway/public/app.js`: ACC_MAX (độ chính xác GPS tối đa 500 m), VISIT_R (150 m), VISIT_DWELL (30 s), VISIT_LISTEN (50%), DONE (90%), AUTO_DELAY (4 s).
- Dịch MyMemory chỉ chạy khi Admin lưu/sửa mô tả (lưu vào DB, không dịch lại khi khách nghe). Nếu lỗi/hết hạn mức: lưu bản tiếng Việt, đánh dấu ⚠ (dùng nút "Dịch lại", hoặc tự thử lại khi khởi động service). Đặt `MYMEMORY_EMAIL` để tăng hạn mức miễn phí.
- Giọng đọc phụ thuộc thiết bị: nếu thiếu giọng cho ngôn ngữ đã chọn, web báo rõ và đề nghị nghe bản tiếng Anh.
- 4–5 thiết bị cùng lúc: không cần cấu hình gì thêm (connection pool MySQL, mỗi thiết bị một session_id).

## Deploy lên Render
Render không có MySQL miễn phí → dùng MySQL ngoài (Aiven, Railway, TiDB Cloud…) và đặt `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/DB_SSL=1`, chạy `db/init.sql` trên đó.
Tạo 3 Web Service từ Dockerfile (thư mục gốc lần lượt `restaurant-service`, `analytics-service`, `gateway`); đặt `RESTAURANT_URL`, `ANALYTICS_URL` cho gateway/analytics bằng URL nội bộ/công khai của service tương ứng, và cùng `JWT_SECRET`. Gói free của Render sẽ "ngủ" khi không dùng nên request đầu tiên chậm.
