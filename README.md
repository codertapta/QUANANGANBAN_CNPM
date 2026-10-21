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

## Deploy lên Render
Repo có `render.yaml` để tạo các service theo Blueprint:
- `food-guide-gateway`: Web Service công khai; link user có dạng `https://<domain>/customer/`.
- `food-guide-restaurant`, `food-guide-translation`, `food-guide-mysql`: private services, chỉ nhận kết nối nội bộ.
- MySQL dùng persistent disk tại `/var/lib/mysql`; Render tự tạo DB credentials ngẫu nhiên và truyền cho restaurant-service.

1. Commit và push repo lên GitHub.
2. Trong Render chọn **New > Blueprint**, kết nối repo này và chọn `render.yaml` ở thư mục gốc.
3. Kiểm tra tài nguyên/chi phí Render sẽ tạo rồi chọn **Apply**. Gateway dùng Free plan; các private services dùng plan `0.5c-512mb`, MySQL có disk 10 GB.
4. Khi deploy xong, mở URL của `food-guide-gateway` rồi chia sẻ đường dẫn `/customer/` hoặc tạo QR từ URL đó.

Database trên Render ban đầu trống. Nếu cần giữ dữ liệu MySQL local, hãy export bằng `mysqldump` rồi import vào MySQL trên Render. Không bật `ALLOW_REMOTE_ADMIN` nếu chưa thêm đăng nhập cho trang admin.
