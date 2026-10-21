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
Định vị cần HTTPS (trừ localhost). Cách nhanh: `npx localtunnel --port 8080` hoặc `cloudflared tunnel --url http://localhost:8080`
để có link https công khai. Hoặc deploy lên Render (Web Service Docker cho từng service) + MySQL miễn phí bên ngoài (Aiven/TiDB Cloud);
đặt biến DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME cho restaurant-service.
