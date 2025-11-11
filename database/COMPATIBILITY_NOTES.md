# MariaDB/MySQL Compatibility Notes for schema.sql

## ✅ Đã kiểm tra và sửa

### 1. JSON Data Type
- **Yêu cầu**: MySQL 5.7.8+ hoặc MariaDB 10.2.7+
- **Đã sửa**: Sử dụng `CAST(... AS JSON)` cho tất cả JSON values trong Settings table
- **Trạng thái**: ✅ Tương thích

### 2. CREATE INDEX
- **Vấn đề**: MySQL/MariaDB không hỗ trợ `CREATE INDEX IF NOT EXISTS`
- **Giải pháp**: Đã thêm warning comments, nếu index đã tồn tại sẽ báo lỗi (có thể bỏ qua)
- **Trạng thái**: ⚠️ Cần lưu ý khi import lần thứ 2

### 3. Multiple TIMESTAMP Columns
- **Yêu cầu**: MySQL 5.6.5+ hoặc MariaDB 5.3.0+
- **Trạng thái**: ✅ Tương thích (hầu hết các phiên bản hiện đại đều hỗ trợ)

### 4. ENUM Types
- **Trạng thái**: ✅ Tương thích hoàn toàn với MySQL và MariaDB

### 5. FOREIGN KEY Constraints
- **Yêu cầu**: InnoDB storage engine
- **Trạng thái**: ✅ Tương thích (InnoDB là default trong MySQL 5.5.5+ và MariaDB)

### 6. UTF8MB4 Character Set
- **Trạng thái**: ✅ Được khuyến nghị sử dụng (hỗ trợ đầy đủ Unicode)

## 📝 Các điểm cần lưu ý

### JSON Values trong INSERT Statements
- **order_items.serviceData**: Sử dụng JSON strings như `'{"domainName": "abc-company.com"}'` - MySQL/MariaDB sẽ tự động parse
- **payments.paymentData**: Tương tự
- **cart.serviceData**: Tương tự
- **settings.value**: Đã sửa để dùng `CAST(... AS JSON)` cho đảm bảo

### Reserved Keywords
- **settings.`key`**: Đã dùng backticks để escape reserved keyword `key`
- **hosting.`databases`**: Đã dùng backticks để escape reserved keyword `databases`

### INSERT IGNORE
- Tất cả INSERT statements sử dụng `INSERT IGNORE` để tránh lỗi khi dữ liệu đã tồn tại
- **Lưu ý**: `INSERT IGNORE` sẽ bỏ qua cả duplicate key errors và data type errors

## 🔍 Kiểm tra tương thích

### Để kiểm tra schema có hoạt động:
```sql
-- Kiểm tra version
SELECT VERSION();

-- Kiểm tra JSON support
SELECT JSON_TYPE('{"test": "value"}');

-- Kiểm tra InnoDB
SHOW ENGINES;
```

### Yêu cầu tối thiểu:
- **MySQL**: 5.7.8+ (khuyến nghị 8.0+)
- **MariaDB**: 10.2.7+ (khuyến nghị 10.5+)

## ⚠️ Các vấn đề có thể gặp

1. **CREATE INDEX lỗi**: Nếu index đã tồn tại, comment out các dòng CREATE INDEX
2. **JSON parsing errors**: Đảm bảo JSON strings là valid JSON format
3. **Character set**: Đảm bảo database sử dụng utf8mb4 để hỗ trợ tiếng Việt và emoji

## ✅ Kết luận

Schema đã được kiểm tra và sửa để tương thích với:
- ✅ MySQL 5.7.8+ và 8.0+
- ✅ MariaDB 10.2.7+ và 10.5+

Tất cả các tính năng sử dụng đều được hỗ trợ trong các phiên bản này.

