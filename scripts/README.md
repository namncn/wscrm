# Deployment Scripts

Thư mục chứa các script hỗ trợ deploy và quản lý ứng dụng.

## Scripts có sẵn

### 1. `deploy.sh` - Script deploy đầy đủ

Script tự động deploy ứng dụng với các bước:
- Kiểm tra môi trường (Node.js, PM2)
- Kiểm tra file .env
- Cài đặt dependencies
- Build ứng dụng
- Chạy database migration (tùy chọn)
- Khởi động/restart với PM2

**Sử dụng:**
```bash
./scripts/deploy.sh
```

### 2. `quick-deploy.sh` - Script deploy nhanh

Script deploy nhanh cho người dùng đã có kinh nghiệm:
- Pull code mới
- Cài đặt dependencies
- Build
- Restart PM2

**Sử dụng:**
```bash
./scripts/quick-deploy.sh
```

**Lưu ý:** Script này giả định bạn đã cấu hình mọi thứ và chỉ cần update code.

### 3. `backup.sh` - Script sao lưu

Script sao lưu database và files:
- Sao lưu database (mysqldump + gzip)
- Sao lưu application files (tar.gz)
- Tự động xóa backup cũ (mặc định 30 ngày)

**Sử dụng:**
```bash
# Với biến môi trường
DB_PASSWORD=your_password ./scripts/backup.sh

# Hoặc sẽ prompt password
./scripts/backup.sh
```

**Biến môi trường:**
- `BACKUP_DIR`: Thư mục lưu backup (mặc định: `/var/backups/crm`)
- `DB_NAME`: Tên database (mặc định: `crm_db`)
- `DB_USER`: User database (mặc định: `crm_user`)
- `DB_PASSWORD`: Mật khẩu database (nếu không set sẽ prompt)
- `RETENTION_DAYS`: Số ngày giữ backup (mặc định: `30`)

**Ví dụ:**
```bash
BACKUP_DIR=/backup/crm DB_PASSWORD=secret RETENTION_DAYS=60 ./scripts/backup.sh
```

## Cấu hình Cron Jobs

### Tự động backup hàng ngày

Thêm vào crontab:
```bash
crontab -e
```

```cron
# Backup mỗi ngày lúc 2:00 AM
0 2 * * * cd /var/www/crm && DB_PASSWORD=your_password ./scripts/backup.sh >> /var/log/crm-backup.log 2>&1
```

### Tự động deploy (không khuyến nghị cho production)

```cron
# Deploy tự động mỗi đêm (chỉ dùng cho staging)
0 3 * * * cd /var/www/crm && ./scripts/quick-deploy.sh >> /var/log/crm-deploy.log 2>&1
```

## Lưu ý

1. **Quyền thực thi**: Tất cả scripts đã được set quyền thực thi (`chmod +x`)
2. **Bảo mật**: Không commit file `.env` hoặc credentials vào git
3. **Backup**: Luôn test restore trước khi tin tưởng vào backup
4. **Logs**: Kiểm tra logs sau mỗi lần deploy/backup

## Troubleshooting

### Script không chạy được

```bash
# Kiểm tra quyền thực thi
ls -l scripts/*.sh

# Nếu không có quyền, chạy:
chmod +x scripts/*.sh
```

### Backup thất bại

```bash
# Kiểm tra MySQL credentials
mysql -u crm_user -p crm_db -e "SELECT 1;"

# Kiểm tra quyền ghi vào thư mục backup
touch /var/backups/crm/test.txt && rm /var/backups/crm/test.txt
```

### Deploy thất bại

```bash
# Kiểm tra logs PM2
pm2 logs crm

# Kiểm tra file .env
cat .env

# Kiểm tra build
npm run build
```

