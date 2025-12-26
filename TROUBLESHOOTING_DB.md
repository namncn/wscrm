# Troubleshooting: Lỗi kết nối Database (ECONNREFUSED)

## Lỗi thường gặp

```
Error: connect ECONNREFUSED
code: 'ECONNREFUSED'
```

Lỗi này xảy ra khi `drizzle-kit` hoặc ứng dụng không thể kết nối đến MySQL/MariaDB.

## Giải pháp nhanh

### Bước 1: Test kết nối database

```bash
# Cách 1: Sử dụng script bash (khuyến nghị)
./scripts/test-db.sh

# Cách 2: Sử dụng Node.js script
npm run db:test
```

### Bước 2: Kiểm tra các nguyên nhân phổ biến

#### 1. MySQL/MariaDB chưa được khởi động

```bash
# Kiểm tra trạng thái
sudo systemctl status mariadb
# hoặc
sudo systemctl status mysql

# Nếu không chạy, khởi động:
sudo systemctl start mariadb
sudo systemctl enable mariadb  # Tự động khởi động khi boot
```

#### 2. File .env không đúng hoặc thiếu biến

```bash
# Kiểm tra file .env
cat .env | grep DB_

# Đảm bảo có đầy đủ:
# DB_HOST=localhost (hoặc IP của DB server)
# DB_PORT=3306
# DB_USER=crm_user
# DB_PASSWORD=your_password
# DB_NAME=crm_db
```

#### 3. Shared Hosting - Cần dùng Socket Connection

Nếu bạn đang dùng Shared Hosting (như cPanel, Plesk), MySQL thường chỉ chấp nhận kết nối qua socket, không phải TCP.

**Tìm đường dẫn socket:**
```bash
# Cách 1: Dùng mysql_config
mysql_config --socket

# Cách 2: Kiểm tra file cấu hình
cat /etc/mysql/my.cnf | grep socket
# hoặc
cat /etc/my.cnf | grep socket

# Cách 3: Tìm trong thư mục MySQL
find /var/lib/mysql -name "*.sock"
find /tmp -name "mysql.sock"
```

**Cập nhật .env:**
```env
# Comment hoặc xóa các dòng TCP connection
# DB_HOST=localhost
# DB_PORT=3306

# Thêm socket path
DB_SOCKET_PATH=/var/lib/mysql/mysql.sock
DB_USER=crm_user
DB_PASSWORD=your_password
DB_NAME=crm_db
```

**Lưu ý:** Sau khi cập nhật, `drizzle.config.ts` đã được cập nhật để hỗ trợ socket connection tự động.

#### 4. Database chưa được tạo

```bash
# Kiểm tra database có tồn tại
mysql -u root -p -e "SHOW DATABASES LIKE 'crm_db';"

# Nếu không có, tạo database:
mysql -u root -p << EOF
CREATE DATABASE crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'crm_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON crm_db.* TO 'crm_user'@'localhost';
FLUSH PRIVILEGES;
EOF
```

#### 5. User không có quyền truy cập

```bash
# Kiểm tra quyền của user
mysql -u root -p << EOF
SHOW GRANTS FOR 'crm_user'@'localhost';
SELECT user, host FROM mysql.user WHERE user='crm_user';
EOF

# Nếu không có quyền, cấp quyền:
mysql -u root -p << EOF
GRANT ALL PRIVILEGES ON crm_db.* TO 'crm_user'@'localhost';
FLUSH PRIVILEGES;
EOF
```

#### 6. Firewall chặn port 3306

```bash
# Kiểm tra firewall
sudo ufw status
sudo iptables -L | grep 3306

# Nếu cần, mở port (chỉ cho localhost)
sudo ufw allow from 127.0.0.1 to any port 3306
```

#### 7. MySQL chỉ bind localhost

Kiểm tra file cấu hình MySQL:
```bash
sudo cat /etc/mysql/mariadb.conf.d/50-server.cnf | grep bind-address
```

Nếu `bind-address = 127.0.0.1`, MySQL chỉ chấp nhận kết nối từ localhost. Điều này là đúng nếu bạn chạy ứng dụng trên cùng server.

### Bước 3: Test lại sau khi sửa

```bash
# Test kết nối
./scripts/test-db.sh

# Nếu thành công, chạy lại db:push
npm run db:push
```

## Kiểm tra chi tiết

### Test kết nối thủ công với TCP

```bash
mysql -h localhost -P 3306 -u crm_user -p crm_db
```

### Test kết nối thủ công với Socket

```bash
mysql -S /var/lib/mysql/mysql.sock -u crm_user -p crm_db
```

### Kiểm tra MySQL đang listen trên port nào

```bash
sudo netstat -tulpn | grep 3306
# hoặc
sudo ss -tulpn | grep 3306
```

### Kiểm tra MySQL logs

```bash
# Ubuntu/Debian
sudo tail -f /var/log/mysql/error.log

# CentOS/RHEL
sudo tail -f /var/log/mariadb/mariadb.log
```

## Các trường hợp đặc biệt

### Docker MySQL

Nếu MySQL chạy trong Docker:
```env
DB_HOST=localhost  # hoặc IP của container
DB_PORT=3306
# Đảm bảo port đã được map: docker run -p 3306:3306 ...
```

### Remote MySQL Server

Nếu MySQL ở server khác:
```env
DB_HOST=192.168.1.100  # IP của MySQL server
DB_PORT=3306
# Đảm bảo MySQL cho phép remote connection và firewall mở port
```

### Cloud Database (AWS RDS, Google Cloud SQL, etc.)

Thường dùng TCP connection:
```env
DB_HOST=your-db-instance.region.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=your_password
DB_NAME=crm_db
```

## Vẫn không được?

1. **Kiểm tra logs chi tiết:**
   ```bash
   npm run db:push 2>&1 | tee db-push-error.log
   ```

2. **Kiểm tra version compatibility:**
   ```bash
   node -v  # Phải >= 18
   mysql --version
   npm list drizzle-kit mysql2
   ```

3. **Thử import schema thủ công:**
   ```bash
   mysql -u crm_user -p crm_db < database/schema.sql
   ```

4. **Tạo issue với thông tin:**
   - Output của `./scripts/test-db.sh`
   - Nội dung `.env` (ẩn password)
   - Logs từ `npm run db:push`
   - OS version: `uname -a`
   - MySQL version: `mysql --version`

## Liên kết hữu ích

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Hướng dẫn deploy đầy đủ
- [README.md](./README.md) - Tài liệu chính

