# Hướng dẫn Deploy WSCRM Platform lên CyberPanel (Ubuntu)

Hướng dẫn chi tiết để deploy ứng dụng CRM lên CyberPanel - một control panel web hosting dựa trên OpenLiteSpeed.

---

## 📋 Mục lục

1. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
2. [Cài đặt CyberPanel](#cài-đặt-cyberpanel)
3. [Chuẩn bị môi trường](#chuẩn-bị-môi-trường)
4. [Cấu hình Database trong CyberPanel](#cấu-hình-database-trong-cyberpanel)
5. [Tạo Website trong CyberPanel](#tạo-website-trong-cyberpanel)
6. [Deploy ứng dụng](#deploy-ứng-dụng)
7. [Cấu hình OpenLiteSpeed Reverse Proxy](#cấu-hình-openlitespeed-reverse-proxy)
8. [Cài đặt SSL/HTTPS](#cài-đặt-sslhttps)
9. [Quản lý tiến trình với PM2](#quản-lý-tiến-trình-với-pm2)
10. [Cấu hình Cron Jobs](#cấu-hình-cron-jobs)
11. [Tối ưu hóa CyberPanel](#tối-ưu-hóa-cyberpanel)
12. [Troubleshooting](#troubleshooting)

---

## Yêu cầu hệ thống

### Phần cứng tối thiểu
- **CPU**: 2 cores
- **RAM**: 2GB (khuyến nghị 4GB)
- **Ổ cứng**: 20GB SSD
- **Băng thông**: Không giới hạn

### Phần mềm
- **OS**: Ubuntu 20.04+ hoặc CentOS 7+
- **CyberPanel**: Latest stable version
- **Node.js**: >= 20 LTS (khuyến nghị Node.js 20.x - phiên bản tối ưu và ổn định nhất)
- **MySQL/MariaDB**: Đã được cài đặt cùng CyberPanel
- **OpenLiteSpeed**: Đã được cài đặt cùng CyberPanel
- **PM2**: Process manager

---

## Cài đặt CyberPanel

### 1. Cài đặt CyberPanel trên Ubuntu

```bash
# Kết nối SSH vào VPS
ssh root@your-vps-ip

# Tải và chạy script cài đặt CyberPanel
sh <(curl https://cyberpanel.net/install.sh || wget -O - https://cyberpanel.net/install.sh)

# Hoặc với các tùy chọn cụ thể
sh <(curl https://cyberpanel.net/install.sh || wget -O - https://cyberpanel.net/install.sh) -v ols -p your_admin_password
```

**Lưu ý:**
- Chọn **OpenLiteSpeed** (ols) thay vì LiteSpeed Enterprise
- Ghi nhớ mật khẩu admin panel
- Quá trình cài đặt có thể mất 15-30 phút

### 2. Truy cập CyberPanel

- **URL**: `https://your-vps-ip:8090`
- **Username**: `admin`
- **Password**: Mật khẩu bạn đã đặt

### 3. Cài đặt bổ sung trong CyberPanel

1. Đăng nhập vào CyberPanel
2. Vào **Package Manager** → Cài đặt các package cần thiết
3. Vào **Update** → Cập nhật CyberPanel lên phiên bản mới nhất

---

## Chuẩn bị môi trường

### 1. Cài đặt Node.js 20 LTS (Khuyến nghị)

**Lưu ý:** Node.js 20 LTS là phiên bản tối ưu nhất hiện tại với hiệu năng tốt hơn, bảo mật cao hơn và hỗ trợ dài hạn đến năm 2026.

CyberPanel có thể đã cài Node.js, nhưng cần đảm bảo phiên bản >= 20:

```bash
# Kiểm tra phiên bản Node.js hiện tại
node -v

# Nếu chưa có hoặc phiên bản cũ, cài đặt Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Kiểm tra lại
node -v  # Phải >= 20.x
npm -v
```

**Nâng cấp từ Node.js 18 (nếu đã cài đặt):**
```bash
# Xóa Node.js cũ (nếu cần)
sudo apt-get remove -y nodejs

# Cài đặt Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Kiểm tra lại
node -v  # Phải >= 20.x
```

### 2. Cài đặt PM2

```bash
# Cài đặt PM2 globally
sudo npm install -g pm2

# Bật PM2 khởi động cùng hệ thống
pm2 startup
# Chạy lệnh được hiển thị (thường là sudo env PATH=...)

# Kiểm tra PM2
pm2 --version
```

### 3. Cài đặt Git (nếu chưa có)

```bash
sudo apt install git -y
```

---

## Cấu hình Database trong CyberPanel

### Cách 1: Sử dụng CyberPanel Database Manager (Khuyến nghị)

1. Đăng nhập CyberPanel
2. Vào **Databases** → **Create Database**
3. Điền thông tin:
   - **Database Name**: `crm_db`
   - **Database Username**: `crm_user`
   - **Database Password**: Tạo mật khẩu mạnh
   - **Create Database**: ✓
   - **Create User**: ✓
4. Click **Create Database**
5. Ghi lại thông tin:
   - Database name
   - Username
   - Password
   - Host: Thường là `localhost` hoặc `127.0.0.1`

### Cách 2: Tạo thủ công qua MySQL CLI

```bash
# Đăng nhập MySQL (CyberPanel thường dùng root với mật khẩu riêng)
mysql -u root -p
# Nhập mật khẩu root MySQL (có thể khác với mật khẩu CyberPanel admin)

# Trong MySQL console
CREATE DATABASE crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'crm_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';
GRANT ALL PRIVILEGES ON crm_db.* TO 'crm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Import Schema (Tùy chọn)

Nếu muốn import schema từ file SQL:

```bash
# Tìm đường dẫn file schema.sql trong project
mysql -u crm_user -p crm_db < /path/to/database/schema.sql
```

---

## Tạo Website trong CyberPanel

### 1. Tạo Website mới

1. Đăng nhập CyberPanel
2. Vào **Websites** → **Create Website**
3. Điền thông tin:
   - **Domain**: `yourdomain.com`
   - **Email**: Email quản trị
   - **Package**: Chọn package phù hợp hoặc tạo mới
   - **PHP Version**: Không cần (vì dùng Node.js)
   - **Create Website**: ✓
4. Click **Create Website**

### 2. Lưu ý về thư mục

CyberPanel thường tạo website tại:
- **Path**: `/home/yourdomain.com/public_html`
- **User**: `yourdomain` (user được tạo tự động)

### 3. Cấu hình DNS

Trỏ domain về IP VPS:
- **A Record**: `yourdomain.com` → `your-vps-ip`
- **A Record**: `www.yourdomain.com` → `your-vps-ip`

---

## Deploy ứng dụng

### 1. Chọn vị trí deploy

**Tùy chọn 1: Deploy trong thư mục website CyberPanel** (Khuyến nghị cho production)

```bash
# Chuyển sang user của website
sudo su - yourdomain

# Tạo thư mục cho ứng dụng
mkdir -p ~/crm
cd ~/crm
```

**Tùy chọn 2: Deploy ở thư mục riêng** (Khuyến nghị cho dễ quản lý)

```bash
# Tạo thư mục riêng
sudo mkdir -p /var/www/crm
sudo chown -R $USER:$USER /var/www/crm
cd /var/www/crm
```

### 2. Clone repository

```bash
# Clone repository (thay bằng URL repo của bạn)
git clone https://github.com/your-username/crm.git .

# Hoặc nếu đã có code, copy vào thư mục
```

### 3. Cài đặt dependencies

```bash
# Cài đặt dependencies
npm install --production
# hoặc nếu muốn cài đầy đủ
npm install
```

### 4. Tạo file .env

```bash
# Tạo file .env
nano .env
```

**Nội dung file .env**:

```env
# Application
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-super-secret-key-min-32-characters-long
NEXT_PUBLIC_BRAND_NAME=WSCRM Platform

# Database
# CyberPanel thường dùng localhost với TCP connection
DB_HOST=localhost
DB_PORT=3306
DB_USER=crm_user
DB_PASSWORD=your_strong_password_here
DB_NAME=crm_db
DB_CONNECTION_LIMIT=10

# Nếu CyberPanel cấu hình MySQL chỉ chấp nhận socket connection,
# comment các dòng trên và sử dụng DB_SOCKET_PATH thay thế:
# DB_SOCKET_PATH=/var/lib/mysql/mysql.sock
# DB_USER=crm_user
# DB_PASSWORD=your_strong_password_here
# DB_NAME=crm_db

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_NAME=WSCRM Platform

# Cron Jobs
EMAIL_CRON_SECRET=your-cron-secret-token-min-32-characters

# Sepay (Optional)
SEPAY_API_KEY=your-sepay-api-key
SEPAY_PAYMENT_CODE_PREFIX=DH

# Node Environment
NODE_ENV=production
```

**Lưu ý quan trọng**:
- `NEXTAUTH_SECRET`: Tạo bằng lệnh `openssl rand -base64 32`
- `EMAIL_CRON_SECRET`: Tạo bằng lệnh `openssl rand -base64 32`
- `SMTP_PASSWORD`: Nếu dùng Gmail, cần tạo App Password
- Bảo vệ file `.env`: `chmod 600 .env`

### 5. Test kết nối database

```bash
# Test kết nối database trước khi build
./scripts/test-db.sh
# hoặc
npm run db:test
```

Nếu test thành công, tiếp tục. Nếu lỗi, xem phần [Troubleshooting](#troubleshooting).

### 6. Build ứng dụng

```bash
npm run build
```

### 7. Đồng bộ database schema

```bash
# Sử dụng Drizzle để đồng bộ schema
npm run db:push

# Hoặc import thủ công nếu có file SQL
mysql -u crm_user -p crm_db < database/schema.sql
```

---

## Cấu hình OpenLiteSpeed Reverse Proxy

CyberPanel sử dụng OpenLiteSpeed thay vì Nginx. Cần cấu hình reverse proxy.

### Cách 1: Sử dụng CyberPanel WebAdmin (Khuyến nghị)

1. Đăng nhập CyberPanel
2. Vào **Websites** → Click vào domain của bạn
3. Vào tab **WebAdmin** (hoặc truy cập trực tiếp `https://your-vps-ip:7080`)
4. Đăng nhập WebAdmin với:
   - **Username**: `admin`
   - **Password**: Mật khẩu CyberPanel admin
5. Tìm **Virtual Hosts** → Chọn domain của bạn
6. Vào **Script Handler**:
   - Thêm handler mới:
     - **Suffixes**: `node`
     - **Handler**: `lsphp` (hoặc để trống nếu không dùng PHP)
7. Vào **Rewrites**:
   - Thêm rule rewrite để proxy tất cả requests đến Node.js app

### Cách 2: Cấu hình thủ công qua file .htaccess

Tạo file `.htaccess` trong thư mục website:

```bash
# Nếu deploy trong public_html
nano /home/yourdomain.com/public_html/.htaccess
```

**Nội dung** (nếu CyberPanel hỗ trợ):

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

**Lưu ý**: OpenLiteSpeed có thể không hỗ trợ `.htaccess` như Apache. Nên dùng Cách 1.

### Cách 3: Cấu hình trực tiếp trong OpenLiteSpeed (Nâng cao)

1. Truy cập OpenLiteSpeed WebAdmin: `https://your-vps-ip:7080`
2. Vào **Virtual Hosts** → Chọn domain
3. Vào **External App**:
   - Tạo External App mới:
     - **Name**: `NodeApp`
     - **Type**: `Proxy`
     - **Address**: `http://127.0.0.1:3000`
4. Vào **Script Handler**:
   - Map `node` → External App `NodeApp`
5. Vào **Context**:
   - Tạo context mới:
     - **URI**: `/`
     - **Type**: `Proxy`
     - **Handler**: `NodeApp`
6. Click **Save** và **Graceful Restart**

### Cách 4: Sử dụng CyberPanel Node.js App Feature (Nếu có)

Một số phiên bản CyberPanel có tính năng Node.js App:

1. Vào **Websites** → Chọn domain
2. Tìm tab **Node.js** hoặc **Applications**
3. Cấu hình:
   - **App Root**: `/var/www/crm` (hoặc đường dẫn bạn deploy)
   - **Startup File**: `package.json`
   - **Port**: `3000`
4. Click **Deploy** hoặc **Start**

---

## Cài đặt SSL/HTTPS

### Sử dụng CyberPanel SSL Manager (Khuyến nghị)

1. Đăng nhập CyberPanel
2. Vào **SSL** → **Issue SSL**
3. Chọn domain của bạn
4. Chọn **Let's Encrypt** (miễn phí)
5. Click **Issue SSL**
6. CyberPanel sẽ tự động:
   - Tạo chứng chỉ SSL
   - Cấu hình OpenLiteSpeed
   - Thiết lập tự động gia hạn

### Cập nhật .env với HTTPS

```bash
nano /var/www/crm/.env
# hoặc
nano ~/crm/.env
```

Đảm bảo `NEXTAUTH_URL=https://yourdomain.com`

### Restart ứng dụng

```bash
pm2 restart crm
```

---

## Quản lý tiến trình với PM2

### 1. Cấu hình PM2

Tạo hoặc cập nhật file `ecosystem.config.js`:

```bash
cd /var/www/crm
# hoặc
cd ~/crm

nano ecosystem.config.js
```

**Nội dung** (điều chỉnh đường dẫn phù hợp):

```javascript
module.exports = {
  apps: [{
    name: 'crm',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/crm', // Thay bằng đường dẫn thực tế
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
}
```

### 2. Tạo thư mục logs

```bash
mkdir -p logs
```

### 3. Khởi động ứng dụng

```bash
# Khởi động với PM2
pm2 start ecosystem.config.js

# Lưu cấu hình PM2
pm2 save

# Kiểm tra trạng thái
pm2 status
pm2 logs crm
```

### 4. Các lệnh PM2 hữu ích

```bash
# Xem trạng thái
pm2 status

# Xem logs
pm2 logs crm
pm2 logs crm --lines 100

# Restart ứng dụng
pm2 restart crm

# Stop ứng dụng
pm2 stop crm

# Xóa ứng dụng khỏi PM2
pm2 delete crm

# Xem thông tin chi tiết
pm2 info crm

# Monitor real-time
pm2 monit
```

### 5. Cập nhật ứng dụng

```bash
cd /var/www/crm
# hoặc
cd ~/crm

# Pull code mới
git pull origin main

# Cài đặt dependencies mới
npm install --production

# Build lại
npm run build

# Restart ứng dụng
pm2 restart crm

# Kiểm tra logs
pm2 logs crm --lines 50
```

---

## Cấu hình Cron Jobs

### Cách 1: Sử dụng CyberPanel Cron Jobs Manager

1. Đăng nhập CyberPanel
2. Vào **Cron Jobs** → **Create Cron Job**
3. Tạo các cron jobs:

**Cron Job 1: Email nhắc hợp đồng/dịch vụ**
- **Minute**: `0`
- **Hour**: `8`
- **Day**: `*`
- **Month**: `*`
- **Weekday**: `*`
- **Command**: 
  ```bash
  curl -X POST "https://yourdomain.com/api/email-notifications/cron?token=YOUR_EMAIL_CRON_SECRET"
  ```

**Cron Job 2: Xử lý email queue**
- **Minute**: `*/5`
- **Hour**: `*`
- **Day**: `*`
- **Month**: `*`
- **Weekday**: `*`
- **Command**: 
  ```bash
  curl -X POST "https://yourdomain.com/api/email-notifications/cron-process?token=YOUR_EMAIL_CRON_SECRET"
  ```

**Cron Job 3: Email nhắc thanh toán**
- **Minute**: `*/10`
- **Hour**: `*`
- **Day**: `*`
- **Month**: `*`
- **Weekday**: `*`
- **Command**: 
  ```bash
  curl -X POST "https://yourdomain.com/api/invoices/cron?token=YOUR_EMAIL_CRON_SECRET"
  ```

### Cách 2: Sử dụng crontab thủ công

```bash
# Mở crontab
crontab -e

# Thêm các dòng sau
0 8 * * * curl -X POST "https://yourdomain.com/api/email-notifications/cron?token=YOUR_EMAIL_CRON_SECRET"
*/5 * * * * curl -X POST "https://yourdomain.com/api/email-notifications/cron-process?token=YOUR_EMAIL_CRON_SECRET"
*/10 * * * * curl -X POST "https://yourdomain.com/api/invoices/cron?token=YOUR_EMAIL_CRON_SECRET"
```

### 3. Sao lưu database tự động

Tạo script backup:

```bash
mkdir -p /var/backups/crm
cat > /var/www/crm/scripts/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/crm"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="crm_db"
DB_USER="crm_user"
DB_PASS="your_password_here"

mkdir -p $BACKUP_DIR
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Nén file
gzip $BACKUP_DIR/backup_$DATE.sql

# Xóa backup cũ hơn 7 ngày
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /var/www/crm/scripts/backup-db.sh
```

Thêm vào cron (chạy mỗi ngày lúc 2:00 AM):

```bash
0 2 * * * /var/www/crm/scripts/backup-db.sh
```

---

## Tối ưu hóa CyberPanel

### 1. Tối ưu OpenLiteSpeed

1. Vào OpenLiteSpeed WebAdmin: `https://your-vps-ip:7080`
2. Vào **Server Configuration** → **Tuning**
3. Điều chỉnh:
   - **Max Connections**: `10000`
   - **Max SSL Connections**: `10000`
   - **Connection Timeout**: `60`
   - **Keep-Alive Timeout**: `300`

### 2. Tối ưu MySQL/MariaDB

CyberPanel thường đã tối ưu MySQL, nhưng có thể kiểm tra:

```bash
# Kiểm tra cấu hình MySQL
mysql -u root -p -e "SHOW VARIABLES LIKE 'max_connections';"
```

### 3. Bật Gzip Compression

1. Vào OpenLiteSpeed WebAdmin
2. Vào Virtual Host → Domain của bạn
3. Vào **Compression**
4. Bật **Enable Compression**
5. Thêm các loại file: `text/html`, `text/css`, `application/javascript`, `application/json`

### 4. Cấu hình Cache (Nếu cần)

Next.js đã có built-in caching, nhưng có thể cấu hình thêm ở OpenLiteSpeed:

1. Vào Virtual Host → Domain
2. Vào **Cache**
3. Bật **Enable Cache**
4. Cấu hình cache cho static files

---

## Troubleshooting

### Ứng dụng không khởi động

```bash
# Kiểm tra logs PM2
pm2 logs crm

# Kiểm tra port 3000 có đang được sử dụng
sudo lsof -i :3000

# Kiểm tra file .env
cat /var/www/crm/.env
# hoặc
cat ~/crm/.env

# Test kết nối database
mysql -u crm_user -p crm_db -e "SELECT 1;"
```

### Lỗi kết nối Database

**Kiểm tra kết nối:**

```bash
# Sử dụng script test
./scripts/test-db.sh
# hoặc
npm run db:test
```

**Kiểm tra MySQL đang chạy:**

```bash
sudo systemctl status mariadb
sudo systemctl status mysql
```

**Kiểm tra thông tin database trong CyberPanel:**

1. Vào **Databases** → Xem danh sách databases
2. Kiểm tra username, password, host
3. Đảm bảo `.env` khớp với thông tin trong CyberPanel

**Nếu dùng socket connection:**

```bash
# Tìm đường dẫn socket MySQL
mysql_config --socket
# hoặc
cat /etc/mysql/my.cnf | grep socket

# Cập nhật .env với DB_SOCKET_PATH
# Ví dụ: DB_SOCKET_PATH=/var/lib/mysql/mysql.sock
```

### OpenLiteSpeed không proxy được

**Kiểm tra ứng dụng có chạy:**

```bash
curl http://localhost:3000
```

**Kiểm tra cấu hình OpenLiteSpeed:**

1. Vào OpenLiteSpeed WebAdmin
2. Kiểm tra Virtual Host → Domain → Context
3. Đảm bảo có context proxy đến `http://127.0.0.1:3000`

**Kiểm tra logs OpenLiteSpeed:**

```bash
# Logs thường ở
tail -f /usr/local/lsws/logs/error.log
tail -f /usr/local/lsws/logs/access.log
```

### SSL không hoạt động

**Kiểm tra SSL trong CyberPanel:**

1. Vào **SSL** → Xem danh sách SSL certificates
2. Đảm bảo SSL đã được issue cho domain
3. Kiểm tra trạng thái: Active/Expired

**Kiểm tra cấu hình SSL:**

```bash
# Kiểm tra chứng chỉ
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

**Gia hạn SSL thủ công (nếu cần):**

1. Vào **SSL** → Chọn domain
2. Click **Renew SSL**

### Email không gửi được

```bash
# Kiểm tra SMTP credentials trong .env
cat /var/www/crm/.env | grep SMTP
# hoặc
cat ~/crm/.env | grep SMTP

# Test gửi email từ server
sudo apt install mailutils -y
echo "Test email" | mail -s "Test" your-email@gmail.com
```

### Cron jobs không chạy

**Kiểm tra cron jobs trong CyberPanel:**

1. Vào **Cron Jobs** → Xem danh sách
2. Kiểm tra trạng thái: Active/Inactive
3. Xem logs: Click vào cron job → View Logs

**Kiểm tra crontab:**

```bash
crontab -l
```

**Test endpoint cron thủ công:**

```bash
curl -X POST "https://yourdomain.com/api/invoices/cron?token=YOUR_EMAIL_CRON_SECRET"
```

### Ứng dụng chạy chậm

```bash
# Kiểm tra memory
free -h

# Kiểm tra CPU
top
htop

# Kiểm tra database queries chậm
mysql -u crm_user -p -e "SHOW PROCESSLIST;" crm_db

# Tăng connection limit trong .env
# DB_CONNECTION_LIMIT=20
```

### Lỗi quyền truy cập file

```bash
# Kiểm tra quyền sở hữu
ls -la /var/www/crm
# hoặc
ls -la ~/crm

# Sửa quyền nếu cần
sudo chown -R $USER:$USER /var/www/crm
# hoặc nếu dùng user website
sudo chown -R yourdomain:yourdomain ~/crm

# Sửa quyền thư mục
chmod -R 755 /var/www/crm
chmod 600 /var/www/crm/.env
```

---

## Checklist Deploy trên CyberPanel

- [ ] CyberPanel đã được cài đặt và cấu hình
- [ ] Node.js >= 20 LTS đã được cài đặt (khuyến nghị Node.js 20.x)
- [ ] PM2 đã được cài đặt và cấu hình
- [ ] Database đã được tạo trong CyberPanel
- [ ] Website đã được tạo trong CyberPanel
- [ ] DNS đã được trỏ về VPS
- [ ] Repository đã được clone
- [ ] Dependencies đã được cài đặt
- [ ] File .env đã được tạo và cấu hình đúng
- [ ] Ứng dụng đã được build thành công
- [ ] Database schema đã được đồng bộ
- [ ] PM2 đã khởi động ứng dụng
- [ ] OpenLiteSpeed đã được cấu hình reverse proxy
- [ ] SSL/HTTPS đã được cài đặt qua CyberPanel
- [ ] Cron jobs đã được cấu hình
- [ ] Ứng dụng đã được test và hoạt động bình thường

---

## Lợi ích của CyberPanel

1. **Giao diện quản lý trực quan**: Quản lý website, database, SSL qua web interface
2. **Tự động hóa SSL**: Let's Encrypt tự động gia hạn
3. **Quản lý database dễ dàng**: Tạo, xóa, backup database qua giao diện
4. **Cron Jobs Manager**: Quản lý cron jobs không cần SSH
5. **File Manager**: Quản lý file qua web interface
6. **Email Management**: Quản lý email accounts (nếu cần)
7. **Backup tự động**: CyberPanel có tính năng backup tự động
8. **Monitoring**: Theo dõi tài nguyên server

---

## Liên hệ và hỗ trợ

Nếu gặp vấn đề trong quá trình deploy:

1. Kiểm tra logs PM2: `pm2 logs crm`
2. Kiểm tra logs OpenLiteSpeed: `/usr/local/lsws/logs/error.log`
3. Kiểm tra logs CyberPanel: Trong CyberPanel → **Logs**
4. Kiểm tra database connection: `./scripts/test-db.sh`
5. Tạo issue trên repository với thông tin chi tiết

---

**Chúc bạn deploy thành công trên CyberPanel! 🚀**

