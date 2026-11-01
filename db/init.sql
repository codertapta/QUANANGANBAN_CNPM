SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS foodguide CHARACTER SET utf8mb4;
USE foodguide;
CREATE TABLE IF NOT EXISTS restaurants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  address VARCHAR(300),
  image_url MEDIUMTEXT,
  description TEXT,
  lat DOUBLE NOT NULL,
  lng DOUBLE NOT NULL,
  status ENUM('active','hidden') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_geo (status, lat, lng)
);
CREATE TABLE IF NOT EXISTS restaurant_translations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  lang VARCHAR(5) NOT NULL,
  description TEXT,
  status ENUM('ok','fallback') NOT NULL DEFAULT 'ok',
  UNIQUE KEY uq (restaurant_id, lang),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) UNIQUE NOT NULL,
  password_hash VARCHAR(100) NOT NULL
);
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id VARCHAR(64) PRIMARY KEY,
  language VARCHAR(5),
  device_lang VARCHAR(20),
  country_guess VARCHAR(8),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_seen (last_seen)
);
CREATE TABLE IF NOT EXISTS visit_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  restaurant_id INT NULL,
  event_type VARCHAR(30) NOT NULL,
  lang VARCHAR(5),
  value DOUBLE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (event_type), INDEX idx_rest (restaurant_id), INDEX idx_time (created_at)
);
INSERT INTO restaurants (name,address,description,lat,lng) VALUES
('Quán Phở Mẫu','Gần chợ Bến Thành, Quận 1','Quán phở bò truyền thống nấu từ xương hầm mười hai tiếng. Nước dùng trong và ngọt thanh, bánh phở mềm, thịt bò tái chín vừa tới. Quán mở cửa từ sáng sớm và rất đông khách vào buổi sáng.',10.7725,106.6980),
('Bánh Mì Mẫu','Đường Lê Lợi, Quận 1','Bánh mì giòn nóng với pate tự làm, thịt nguội và rau thơm tươi. Mỗi ổ bánh được nướng ngay khi khách gọi. Đây là món ăn nhanh quen thuộc của người Sài Gòn.',10.7731,106.6995),
('Cơm Tấm Mẫu','Đường Nguyễn Thị Nghĩa, Quận 1','Cơm tấm sườn nướng than hoa thơm lừng, ăn kèm bì, chả trứng và nước mắm chua ngọt. Phần cơm dẻo, sườn mềm thấm vị. Quán phục vụ từ trưa đến tối.',10.7690,106.6930);
