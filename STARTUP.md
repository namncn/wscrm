# 🚀 Hướng dẫn khởi động ứng dụng WSCRM

## Các cách khởi động ứng dụng

### 1. Script khởi động đầy đủ (Khuyến nghị)

Sử dụng script `start.sh` để khởi động với đầy đủ kiểm tra và tùy chọn:

```bash
./start.sh
```

Script này sẽ:
- ✅ Kiểm tra Node.js và npm
- ✅ Kiểm tra và cài đặt dependencies nếu cần
- ✅ Kiểm tra file .env
- ✅ Hỏi có muốn push database schema không
- ✅ Cho phép chọn chế độ Development hoặc Production

### 2. Script khởi động nhanh (Development)

Sử dụng script `start-dev.sh` để khởi động nhanh cho development:

```bash
./start-dev.sh
```

Script này sẽ:
- ✅ Tự động cài đặt dependencies nếu chưa có
- ✅ Tạo file .env từ .env.example nếu chưa có
- ✅ Khởi động development server ngay

### 3. Khởi động thủ công

Nếu bạn muốn khởi động thủ công:

```bash
# Cài đặt dependencies (lần đầu tiên)
npm install

# Tạo file .env từ .env.example
cp .env.example .env
# Sau đó chỉnh sửa .env với thông tin của bạn

# Đồng bộ database schema (nếu cần)
npm run db:push

# Khởi động development server
npm run dev

# Hoặc build và chạy production
npm run build
npm run start
```

## Cấu hình môi trường

### Tạo file .env

1. Copy file `.env.example` thành `.env`:
   ```bash
   cp .env.example .env
   ```

2. Chỉnh sửa file `.env` với thông tin của bạn:
   - **NEXTAUTH_URL**: URL công khai của ứng dụng (ví dụ: `http://localhost:3000`)
   - **NEXTAUTH_SECRET**: Secret key cho NextAuth (tạo bằng: `openssl rand -base64 32`)
   - **Database**: Thông tin kết nối MySQL/MariaDB
   - **SMTP**: Thông tin SMTP để gửi email
   - **EMAIL_CRON_SECRET**: Secret token cho cron jobs

### Các biến môi trường bắt buộc

- `NEXTAUTH_URL` - URL của ứng dụng
- `NEXTAUTH_SECRET` - Secret key cho authentication
- `DB_HOST` - Database host
- `DB_PORT` - Database port (mặc định: 3306)
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `SMTP_HOST` - SMTP server
- `SMTP_PORT` - SMTP port
- `SMTP_USER` - SMTP username
- `SMTP_PASSWORD` - SMTP password

### Các biến môi trường tùy chọn

- `NEXT_PUBLIC_BRAND_NAME` - Tên brand hiển thị
- `DB_SOCKET_PATH` - Socket path cho shared hosting
- `SMTP_FROM_NAME` - Tên người gửi email
- `EMAIL_CRON_SECRET` - Secret cho cron jobs
- `SEPAY_API_KEY` - API key cho Sepay (nếu dùng)
- `ENHANCE_API_KEY` - API key cho Enhance (nếu dùng)

## Yêu cầu hệ thống

- Node.js >= 20 LTS (khuyến nghị Node.js 20.x - phiên bản tối ưu và ổn định nhất)
- npm hoặc pnpm
- MySQL/MariaDB >= 10.3
- SMTP server (Gmail, SendGrid, etc.)

## Troubleshooting

### Lỗi "Node.js is not installed"
- Cài đặt Node.js từ [nodejs.org](https://nodejs.org/)
- Đảm bảo phiên bản >= 18

### Lỗi "Cannot find module"
- Chạy `npm install` để cài đặt dependencies

### Lỗi kết nối database
- Kiểm tra thông tin database trong file `.env`
- Đảm bảo MySQL/MariaDB đang chạy
- Kiểm tra firewall và quyền truy cập

### Lỗi SMTP
- Kiểm tra thông tin SMTP trong file `.env`
- Với Gmail, sử dụng App Password thay vì mật khẩu thường
- Kiểm tra port và secure settings

## Lệnh hữu ích

```bash
# Development
npm run dev              # Khởi động development server

# Production
npm run build            # Build ứng dụng
npm run start            # Chạy production server

# Database
npm run db:generate      # Tạo migration từ schema
npm run db:push          # Đồng bộ schema với database
npm run db:studio        # Mở Drizzle Studio

# Linting
npm run lint             # Chạy ESLint
```

## Liên kết

- Ứng dụng: http://localhost:3000 (sau khi khởi động)
- Drizzle Studio: Chạy `npm run db:studio` để mở giao diện quản lý database

---

**Chúc bạn sử dụng ứng dụng thành công! 🎉**

