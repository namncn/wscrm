# Hướng dẫn Deploy WSCRM Platform lên Custom VPS

Hướng dẫn chi tiết để deploy ứng dụng CRM lên VPS tự quản lý (Ubuntu/Debian).

> **💡 Lưu ý**: Nếu bạn đang sử dụng **CyberPanel**, vui lòng xem hướng dẫn riêng tại [DEPLOYMENT_CYBERPANEL.md](./DEPLOYMENT_CYBERPANEL.md) để tận dụng tối đa các tính năng của CyberPanel.

---

## 📋 Mục lục

1. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
2. [Chuẩn bị VPS](#chuẩn-bị-vps)
3. [Cài đặt phần mềm cần thiết](#cài-đặt-phần-mềm-cần-thiết)
4. [Cấu hình Database](#cấu-hình-database)
5. [Deploy ứng dụng](#deploy-ứng-dụng)
6. [Cấu hình Nginx Reverse Proxy](#cấu-hình-nginx-reverse-proxy)
7. [Cài đặt SSL/HTTPS](#cài-đặt-sslhttps)
8. [Quản lý tiến trình với PM2](#quản-lý-tiến-trình-với-pm2)
9. [Cấu hình Cron Jobs](#cấu-hình-cron-jobs)
10. [Cấu hình Firewall](#cấu-hình-firewall)
11. [Sao lưu và khôi phục](#sao-lưu-và-khôi-phục)
12. [Giám sát và bảo trì](#giám-sát-và-bảo-trì)
13. [Troubleshooting](#troubleshooting)

---

## Yêu cầu hệ thống

### Phần cứng tối thiểu
- **CPU**: 2 cores
- **RAM**: 2GB (khuyến nghị 4GB)
- **Ổ cứng**: 20GB SSD
- **Băng thông**: Không giới hạn

### Phần mềm
- **OS**: Ubuntu 20.04+ hoặc Debian 11+
- **Node.js**: >= 20 LTS (khuyến nghị Node.js 20.x - phiên bản tối ưu và ổn định nhất)
- **MySQL/MariaDB**: >= 10.3
- **Nginx**: Latest stable
- **PM2**: Process manager
- **Git**: Version control

---

## Chuẩn bị VPS

### 1. Kết nối SSH vào VPS

```bash
ssh root@your-vps-ip
# hoặc
ssh username@your-vps-ip
```

### 2. Cập nhật hệ thống

```bash
# Ubuntu
sudo apt update && sudo apt upgrade -y

# Debian
sudo apt-get update && sudo apt-get upgrade -y
```

### 3. Tạo user mới (khuyến nghị)

```bash
# Tạo user mới
sudo adduser crmuser
sudo usermod -aG sudo crmuser

# Chuyển sang user mới
su - crmuser
```

---

## Cài đặt phần mềm cần thiết

### 1. Cài đặt Node.js 20 LTS (Khuyến nghị)

**Lưu ý:** Node.js 20 LTS là phiên bản tối ưu nhất hiện tại với hiệu năng tốt hơn, bảo mật cao hơn và hỗ trợ dài hạn đến năm 2026.

```bash
# Cài đặt Node.js 20 LTS qua NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Kiểm tra phiên bản
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

### 2. Cài đặt MySQL/MariaDB

```bash
# Cài đặt MariaDB
sudo apt install mariadb-server mariadb-client -y

# Khởi động và bật tự động khởi động
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Bảo mật cài đặt
sudo mysql_secure_installation
```

**Lưu ý**: Trong quá trình `mysql_secure_installation`:
- Đặt mật khẩu root mạnh
- Xóa anonymous users: **Y**
- Disallow root login remotely: **Y** (nếu chỉ truy cập local)
- Remove test database: **Y**
- Reload privilege tables: **Y**

### 3. Cài đặt Nginx

```bash
sudo apt install nginx -y

# Khởi động và bật tự động khởi động
sudo systemctl start nginx
sudo systemctl enable nginx

# Kiểm tra trạng thái
sudo systemctl status nginx
```

### 4. Cài đặt PM2

```bash
sudo npm install -g pm2

# Bật PM2 khởi động cùng hệ thống
pm2 startup
# Chạy lệnh được hiển thị (thường là sudo env PATH=...)
```

### 5. Cài đặt Git

```bash
sudo apt install git -y
```

---

## Cấu hình Database

### 1. Tạo database và user

```bash
# Đăng nhập MySQL
sudo mysql -u root -p

# Trong MySQL console
CREATE DATABASE crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'crm_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';
GRANT ALL PRIVILEGES ON crm_db.* TO 'crm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Import schema (tùy chọn)

```bash
# Nếu có file schema.sql
mysql -u crm_user -p crm_db < database/schema.sql
```

---

## Deploy ứng dụng

### 1. Clone repository

```bash
# Tạo thư mục cho ứng dụng
sudo mkdir -p /var/www
cd /var/www

# Clone repository (thay bằng URL repo của bạn)
sudo git clone https://github.com/your-username/crm.git
sudo chown -R $USER:$USER /var/www/crm
cd crm
```

### 2. Cài đặt dependencies

```bash
npm install --production
# hoặc nếu muốn cài đầy đủ
npm install
```

### 3. Tạo file .env

```bash
# Tạo file .env từ template (nếu có)
cp .env.example .env
# hoặc tạo mới
nano .env
```

**Nội dung file .env**:

```env
# Application
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-super-secret-key-min-32-characters-long
NEXT_PUBLIC_BRAND_NAME=WSCRM Platform

# Database
# Sử dụng TCP connection (mặc định)
DB_HOST=localhost
DB_PORT=3306
DB_USER=crm_user
DB_PASSWORD=your_strong_password_here
DB_NAME=crm_db
DB_CONNECTION_LIMIT=10

# Nếu dùng Shared Hosting hoặc MySQL chỉ chấp nhận socket connection,
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
- `SMTP_PASSWORD`: Nếu dùng Gmail, cần tạo App Password (không dùng mật khẩu thường)
- Bảo vệ file `.env`: `chmod 600 .env`

### 4. Build ứng dụng

```bash
npm run build
```

### 5. Đồng bộ database schema

**Quan trọng:** Trước khi chạy `db:push`, hãy test kết nối database:

```bash
# Test kết nối database
./scripts/test-db.sh
# hoặc
npm run db:test
```

Nếu test thành công, tiếp tục:

```bash
# Sử dụng Drizzle để đồng bộ schema
npm run db:push

# Hoặc import thủ công nếu có file SQL
mysql -u crm_user -p crm_db < database/schema.sql
```

**Nếu gặp lỗi ECONNREFUSED:**
- Xem phần [Troubleshooting - Lỗi kết nối Database](#lỗi-kết-nối-database-econnrefused)
- Kiểm tra MySQL/MariaDB có đang chạy không
- Nếu dùng Shared Hosting, có thể cần dùng `DB_SOCKET_PATH` thay vì `DB_HOST`

### 6. Khởi động với PM2

```bash
# Tạo file ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'crm',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/crm',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/crm/logs/pm2-error.log',
    out_file: '/var/www/crm/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
EOF

# Tạo thư mục logs
mkdir -p logs

# Khởi động ứng dụng
pm2 start ecosystem.config.js

# Lưu cấu hình PM2
pm2 save

# Kiểm tra trạng thái
pm2 status
pm2 logs crm
```

---

## Cấu hình Nginx Reverse Proxy

### 1. Tạo file cấu hình Nginx

```bash
sudo nano /etc/nginx/sites-available/crm
```

**Nội dung file cấu hình**:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Logs
    access_log /var/log/nginx/crm-access.log;
    error_log /var/log/nginx/crm-error.log;

    # Client max body size (cho upload file)
    client_max_body_size 10M;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Security headers (sẽ được bổ sung sau khi có SSL)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 2. Kích hoạt site

```bash
# Tạo symbolic link
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/

# Xóa default site (tùy chọn)
sudo rm /etc/nginx/sites-enabled/default

# Kiểm tra cấu hình
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 3. Cấu hình DNS

Trỏ domain về IP VPS:
- **A Record**: `yourdomain.com` → `your-vps-ip`
- **A Record**: `www.yourdomain.com` → `your-vps-ip`

Đợi DNS propagate (có thể mất vài phút đến vài giờ).

---

## Cài đặt SSL/HTTPS

### 1. Cài đặt Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Lấy chứng chỉ SSL

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot sẽ:
- Tự động cấu hình Nginx
- Tạo chứng chỉ SSL
- Thiết lập tự động gia hạn

### 3. Kiểm tra tự động gia hạn

```bash
# Test tự động gia hạn
sudo certbot renew --dry-run
```

### 4. Cập nhật .env với HTTPS

```bash
nano /var/www/crm/.env
```

Đảm bảo `NEXTAUTH_URL=https://yourdomain.com`

### 5. Restart ứng dụng

```bash
pm2 restart crm
```

---

## Quản lý tiến trình với PM2

### Các lệnh PM2 hữu ích

```bash
# Xem trạng thái
pm2 status

# Xem logs
pm2 logs crm
pm2 logs crm --lines 100  # Xem 100 dòng cuối

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

# Xem memory/CPU usage
pm2 list
```

### Cập nhật ứng dụng

```bash
cd /var/www/crm

# Pull code mới
git pull origin main  # hoặc branch của bạn

# Cài đặt dependencies mới (nếu có)
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

### 1. Email nhắc hợp đồng/dịch vụ

```bash
# Mở crontab
crontab -e

# Thêm các dòng sau (thay YOUR_EMAIL_CRON_SECRET bằng secret thực tế)
# Gửi email nhắc hợp đồng/dịch vụ hàng ngày lúc 8:00
0 8 * * * curl -X POST "https://yourdomain.com/api/email-notifications/cron?token=YOUR_EMAIL_CRON_SECRET"

# Xử lý email queue mỗi 5 phút
*/5 * * * * curl -X POST "https://yourdomain.com/api/email-notifications/cron-process?token=YOUR_EMAIL_CRON_SECRET"
```

### 2. Email nhắc thanh toán hoá đơn

```bash
# Thêm vào crontab
# Chạy mỗi 10 phút để kiểm tra và gửi email nhắc thanh toán
*/10 * * * * curl -X POST "https://yourdomain.com/api/invoices/cron?token=YOUR_EMAIL_CRON_SECRET"
```

### 3. Sao lưu database (tùy chọn)

```bash
# Tạo script backup
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

# Thêm vào crontab - chạy mỗi ngày lúc 2:00 AM
0 2 * * * /var/www/crm/scripts/backup-db.sh
```

---

## Cấu hình Firewall

### 1. Cấu hình UFW (Ubuntu Firewall)

```bash
# Cho phép SSH
sudo ufw allow 22/tcp

# Cho phép HTTP và HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Bật firewall
sudo ufw enable

# Kiểm tra trạng thái
sudo ufw status
```

### 2. Cấu hình Fail2Ban (tùy chọn, khuyến nghị)

```bash
# Cài đặt Fail2Ban
sudo apt install fail2ban -y

# Khởi động
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Kiểm tra trạng thái
sudo fail2ban-client status
```

---

## Sao lưu và khôi phục

### 1. Sao lưu Database

```bash
# Sao lưu thủ công
mysqldump -u crm_user -p crm_db > backup_$(date +%Y%m%d).sql

# Sao lưu và nén
mysqldump -u crm_user -p crm_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 2. Sao lưu Application Files

```bash
# Tạo archive
tar -czf crm_backup_$(date +%Y%m%d).tar.gz /var/www/crm --exclude=node_modules --exclude=.next
```

### 3. Khôi phục Database

```bash
# Khôi phục từ file SQL
mysql -u crm_user -p crm_db < backup_20240101.sql

# Khôi phục từ file nén
gunzip < backup_20240101.sql.gz | mysql -u crm_user -p crm_db
```

### 4. Script tự động sao lưu

Tạo script `/var/www/crm/scripts/full-backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/crm"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u crm_user -p$DB_PASSWORD crm_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup files (loại trừ node_modules và .next)
tar -czf $BACKUP_DIR/files_$DATE.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=logs \
  /var/www/crm

# Xóa backup cũ hơn 30 ngày
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

---

## Giám sát và bảo trì

### 1. Giám sát PM2

```bash
# Xem thống kê
pm2 status
pm2 monit

# Xem logs
pm2 logs crm --lines 100
```

### 2. Giám sát hệ thống

```bash
# CPU và Memory
htop
# hoặc
top

# Disk usage
df -h

# Network
netstat -tulpn
```

### 3. Giám sát Nginx

```bash
# Xem logs
sudo tail -f /var/log/nginx/crm-access.log
sudo tail -f /var/log/nginx/crm-error.log

# Kiểm tra cấu hình
sudo nginx -t
```

### 4. Giám sát Database

```bash
# Kiểm tra kết nối
mysql -u crm_user -p -e "SHOW PROCESSLIST;"

# Kiểm tra kích thước database
mysql -u crm_user -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.TABLES WHERE table_schema = 'crm_db';"
```

### 5. Cập nhật hệ thống định kỳ

```bash
# Cập nhật hệ thống (chạy hàng tuần)
sudo apt update && sudo apt upgrade -y

# Cập nhật Node.js (nếu cần)
# Sử dụng nvm hoặc NodeSource
```

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

# Test kết nối database
mysql -u crm_user -p crm_db -e "SELECT 1;"
```

### Lỗi kết nối Database (ECONNREFUSED)

**Lỗi thường gặp:**
```
Error: connect ECONNREFUSED
code: 'ECONNREFUSED'
```

**Các bước kiểm tra:**

1. **Kiểm tra kết nối database bằng script test:**
```bash
# Cách 1: Sử dụng script bash (khuyến nghị)
./scripts/test-db.sh

# Cách 2: Sử dụng Node.js script
npm run db:test
# hoặc
node scripts/test-db-connection.js
```

2. **Kiểm tra MySQL/MariaDB đang chạy:**
```bash
# Ubuntu/Debian
sudo systemctl status mariadb
sudo systemctl status mysql

# Nếu không chạy, khởi động:
sudo systemctl start mariadb
sudo systemctl enable mariadb
```

3. **Kiểm tra file .env có đúng cấu hình:**
```bash
cat .env | grep DB_
```

4. **Nếu dùng Shared Hosting (socket connection):**
```bash
# Tìm đường dẫn socket MySQL
mysql_config --socket
# hoặc
cat /etc/mysql/my.cnf | grep socket

# Cập nhật .env với DB_SOCKET_PATH
# Ví dụ: DB_SOCKET_PATH=/var/lib/mysql/mysql.sock
```

5. **Kiểm tra user và quyền:**
```bash
sudo mysql -u root -p
# Trong MySQL:
SHOW GRANTS FOR 'crm_user'@'localhost';
SELECT user, host FROM mysql.user WHERE user='crm_user';
```

6. **Test kết nối thủ công:**
```bash
# Với TCP connection
mysql -h localhost -P 3306 -u crm_user -p crm_db

# Với socket connection (nếu có DB_SOCKET_PATH)
mysql -S /var/lib/mysql/mysql.sock -u crm_user -p crm_db
```

7. **Kiểm tra firewall:**
```bash
# Kiểm tra port 3306 có bị chặn không
sudo ufw status
sudo netstat -tulpn | grep 3306
```

8. **Kiểm tra database có tồn tại:**
```bash
mysql -u root -p -e "SHOW DATABASES LIKE 'crm_db';"
# Nếu không có, tạo database:
mysql -u root -p -e "CREATE DATABASE crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Nginx không proxy được

```bash
# Kiểm tra cấu hình
sudo nginx -t

# Kiểm tra ứng dụng có chạy trên port 3000
curl http://localhost:3000

# Xem logs Nginx
sudo tail -f /var/log/nginx/crm-error.log
```

### SSL không hoạt động

```bash
# Kiểm tra chứng chỉ
sudo certbot certificates

# Gia hạn thủ công (nếu cần)
sudo certbot renew

# Kiểm tra cấu hình Nginx sau khi cài SSL
sudo cat /etc/nginx/sites-available/crm
```

### Email không gửi được

```bash
# Kiểm tra SMTP credentials trong .env
cat /var/www/crm/.env | grep SMTP

# Test gửi email từ server
# Cài đặt mailutils để test
sudo apt install mailutils -y
echo "Test email" | mail -s "Test" your-email@gmail.com
```

### Cron jobs không chạy

```bash
# Kiểm tra crontab
crontab -l

# Xem logs cron
sudo tail -f /var/log/syslog | grep CRON

# Test endpoint cron thủ công
curl -X POST "https://yourdomain.com/api/invoices/cron?token=YOUR_EMAIL_CRON_SECRET"
```

### Ứng dụng chạy chậm

```bash
# Kiểm tra memory
free -h

# Kiểm tra CPU
top

# Kiểm tra database queries chậm
mysql -u crm_user -p -e "SHOW PROCESSLIST;" crm_db

# Tăng connection limit trong .env
# DB_CONNECTION_LIMIT=20
```

---

## Checklist Deploy

- [ ] VPS đã được cấu hình và cập nhật
- [ ] Node.js >= 20 LTS đã được cài đặt (khuyến nghị Node.js 20.x)
- [ ] MySQL/MariaDB đã được cài đặt và cấu hình
- [ ] Database và user đã được tạo
- [ ] Nginx đã được cài đặt và cấu hình
- [ ] PM2 đã được cài đặt
- [ ] Repository đã được clone
- [ ] Dependencies đã được cài đặt
- [ ] File .env đã được tạo và cấu hình đúng
- [ ] Ứng dụng đã được build thành công
- [ ] Database schema đã được đồng bộ
- [ ] PM2 đã khởi động ứng dụng
- [ ] Nginx đã được cấu hình reverse proxy
- [ ] DNS đã được trỏ về VPS
- [ ] SSL/HTTPS đã được cài đặt
- [ ] Cron jobs đã được cấu hình
- [ ] Firewall đã được cấu hình
- [ ] Backup script đã được thiết lập
- [ ] Ứng dụng đã được test và hoạt động bình thường

---

## Liên hệ và hỗ trợ

Nếu gặp vấn đề trong quá trình deploy, vui lòng:
1. Kiểm tra logs: `pm2 logs crm`
2. Kiểm tra logs Nginx: `sudo tail -f /var/log/nginx/crm-error.log`
3. Kiểm tra logs hệ thống: `sudo journalctl -u nginx`
4. Tạo issue trên repository với thông tin chi tiết

---

**Chúc bạn deploy thành công! 🚀**

