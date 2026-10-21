# Food Guide – Microservices (Node.js + MySQL + Docker)

## Chạy
1. Mở thư mục bằng VS Code, bật Docker Desktop.
2. Terminal: `docker compose up --build`
3. Khách:  http://localhost:8080/customer
   Admin:  http://localhost:8080/admin

## Kiến trúc
- gateway (8080): phục vụ giao diện /customer, /admin và định tuyến /api/*
- restaurant-service (3001): CRUD quán + lọc khoảng cách (mét) bằng SQL tại MySQL
- translation-service (3002): dịch bằng MyMemory (có cache)
- mysql: lưu dữ liệu (volume `dbdata`)
Thuyết minh: khách chọn ngôn ngữ -> dịch -> đọc bằng SpeechSynthesis của trình duyệt.

## Dùng trên điện thoại / nhiều thiết bị (4-5 máy)
Định vị cần HTTPS (trừ localhost). Cách thử nhanh: `npx localtunnel --port 8080` hoặc `cloudflared tunnel --url http://localhost:8080`.
Để chạy lâu dài, xem mục Deploy lên Render bên dưới.

## Deploy miễn phí lên Render
Blueprint chạy cả ba Node service trên Render Free. Database dùng TiDB Cloud Starter ở ngoài Render vì Render Free không có MySQL bền dữ liệu; Free Postgres trên Render hết hạn sau 30 ngày. TiDB Starter tương thích với driver `mysql2` và có hạn mức miễn phí, nhưng sau khi chạm hạn mức thao tác DB sẽ bị giới hạn.

1. Tạo một TiDB Cloud Starter ở chế độ **MySQL Compatible**, đặt spending limit bằng `0`, rồi tạo database `foodguide`. TiDB cấp miễn phí 5 GiB row storage và 50 triệu Request Units mỗi tháng cho mỗi instance đủ điều kiện.
2. Lấy connection details của TiDB: host, user, password. Giữ port `4000` và bật TLS.
3. Trong Render chọn **New > Blueprint**, kết nối repo và branch `codex/render-deploy`. Khi được hỏi, nhập `DB_HOST`, `DB_USER`, `DB_PASSWORD` từ TiDB.
4. Xác nhận cả ba service đều dùng plan `free`, rồi Apply.
5. Sau khi deploy, mở URL của `food-guide-gateway` và thêm `/customer/` để có link cho khách; tạo QR từ link đó.

Render Free service có thể ngủ sau 15 phút không hoạt động, mất khoảng một phút để thức dậy. 750 giờ chạy miễn phí là hạn mức chung của workspace, nên nhiều service hoạt động liên tục sẽ dùng hạn mức nhanh hơn. Các API phụ được bảo vệ bằng khóa nội bộ do Blueprint tạo; không chia sẻ khóa này. Admin vẫn bị chặn khi truy cập từ xa.
