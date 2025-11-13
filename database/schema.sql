-- CRM Database Schema for MariaDB/MySQL
-- This file can be imported even if database already exists
-- It will create tables if they don't exist, but won't drop existing data
--
-- REQUIREMENTS:
-- - MySQL 5.7.8+ or MariaDB 10.2.7+ (for JSON data type support)
-- - InnoDB storage engine (recommended for FOREIGN KEY support)
-- - utf8mb4 character set (for full Unicode support including emoji)
--
-- COMPATIBILITY NOTES:
-- - JSON columns: Requires MySQL 5.7.8+ or MariaDB 10.2.7+
-- - CREATE INDEX: If indexes already exist, you may see warnings (safe to ignore)
-- - TIMESTAMP columns: Multiple TIMESTAMP columns with DEFAULT are supported in MySQL 5.6.5+/MariaDB 5.3.0+
--
-- IMPORTANT: Before importing, you MUST select your database first!
-- 
-- Option 1: If database doesn't exist, uncomment and run these lines first:
-- CREATE DATABASE IF NOT EXISTS crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE crm_db;
--
-- Option 2: If database already exists with different name, select it in phpMyAdmin or MySQL CLI:
-- In phpMyAdmin: Select your database from the dropdown before importing
-- In MySQL CLI: USE your_database_name; (before running this file)
--
-- Option 3: If you want to use database name 'crm_db', uncomment these lines:
-- CREATE DATABASE IF NOT EXISTS crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE crm_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'USER') DEFAULT 'USER',
  phone VARCHAR(20),
  company VARCHAR(255),
  address TEXT,
  bio TEXT,
  emailVerified ENUM('YES', 'NO') DEFAULT 'NO',
  verificationToken VARCHAR(255),
  pendingEmail VARCHAR(255),
  pendingEmailToken VARCHAR(255),
  pendingEmailRequestedAt TIMESTAMP,
  resetToken VARCHAR(255),
  resetTokenExpiry TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  company VARCHAR(255),
  taxCode VARCHAR(50),
  companyEmail VARCHAR(255),
  companyAddress TEXT,
  companyPhone VARCHAR(20),
  companyTaxCode VARCHAR(50),
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
  userId INT,
  emailVerified ENUM('YES', 'NO') DEFAULT 'NO',
  verificationToken VARCHAR(255),
  pendingEmail VARCHAR(255),
  pendingEmailToken VARCHAR(255),
  pendingEmailRequestedAt TIMESTAMP,
  resetToken VARCHAR(255),
  resetTokenExpiry TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

-- Domain table
CREATE TABLE IF NOT EXISTS domain (
  id INT AUTO_INCREMENT PRIMARY KEY,
  domainName VARCHAR(255) UNIQUE NOT NULL,
  registrar VARCHAR(255),
  registrationDate DATE,
  expiryDate DATE,
  status ENUM('ACTIVE', 'EXPIRED', 'SUSPENDED') DEFAULT 'ACTIVE',
  price DECIMAL(10,2),
  customerId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Hosting table
CREATE TABLE IF NOT EXISTS hosting (
  id INT AUTO_INCREMENT PRIMARY KEY,
  planName VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  storage INT NOT NULL,
  bandwidth INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
  customerId INT,
  expiryDate DATE,
  serverLocation VARCHAR(255),
  addonDomain VARCHAR(50) DEFAULT 'Unlimited',
  subDomain VARCHAR(50) DEFAULT 'Unlimited',
  ftpAccounts VARCHAR(50) DEFAULT 'Unlimited',
  `databases` VARCHAR(50) DEFAULT 'Unlimited',
  hostingType VARCHAR(255) DEFAULT 'VPS Hosting',
  operatingSystem VARCHAR(255) DEFAULT 'Linux',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- VPS table
CREATE TABLE IF NOT EXISTS vps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  planName VARCHAR(255) NOT NULL,
  ipAddress VARCHAR(45),
  cpu INT NOT NULL,
  ram INT NOT NULL,
  storage INT NOT NULL,
  bandwidth INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
  customerId INT,
  expiryDate DATE,
  os VARCHAR(255),
  serverLocation VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customerId INT NOT NULL,
  userId INT NOT NULL,
  totalAmount DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
  paymentMethod ENUM('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'E_WALLET') DEFAULT 'CASH',
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderId INT NOT NULL,
  serviceId INT NOT NULL,
  serviceType ENUM('DOMAIN', 'HOSTING', 'VPS') NOT NULL,
  quantity INT DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  serviceData JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contractNumber VARCHAR(50) NOT NULL,
  orderId INT NOT NULL,
  customerId INT NOT NULL,
  userId INT NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  totalValue INT NOT NULL,
  status ENUM('ACTIVE', 'EXPIRED', 'CANCELLED') DEFAULT 'ACTIVE',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Contract Domains junction table
CREATE TABLE IF NOT EXISTS contract_domains (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contractId INT NOT NULL,
  domainId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contractId) REFERENCES contracts(id) ON DELETE CASCADE,
  FOREIGN KEY (domainId) REFERENCES domain(id) ON DELETE CASCADE,
  UNIQUE KEY unique_contract_domain (contractId, domainId)
);

-- Contract Hostings junction table
CREATE TABLE IF NOT EXISTS contract_hostings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contractId INT NOT NULL,
  hostingId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contractId) REFERENCES contracts(id) ON DELETE CASCADE,
  FOREIGN KEY (hostingId) REFERENCES hosting(id) ON DELETE CASCADE,
  UNIQUE KEY unique_contract_hosting (contractId, hostingId)
);

-- Contract VPSs junction table
CREATE TABLE IF NOT EXISTS contract_vpss (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contractId INT NOT NULL,
  vpsId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contractId) REFERENCES contracts(id) ON DELETE CASCADE,
  FOREIGN KEY (vpsId) REFERENCES vps(id) ON DELETE CASCADE,
  UNIQUE KEY unique_contract_vps (contractId, vpsId)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderId INT NOT NULL,
  customerId INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
  paymentMethod VARCHAR(50),
  transactionId VARCHAR(255),
  paymentData JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceNumber VARCHAR(50) NOT NULL UNIQUE,
  customerId INT NOT NULL,
  status ENUM('DRAFT', 'SENT', 'PARTIAL', 'OVERDUE', 'PAID') DEFAULT 'DRAFT',
  issueDate DATE NOT NULL,
  dueDate DATE NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'VND',
  paymentTerms VARCHAR(50),
  paymentMethod ENUM('CASH', 'BANK_TRANSFER') DEFAULT 'BANK_TRANSFER',
  notes TEXT,
  subtotal DECIMAL(12,2) NOT NULL,
  tax DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance DECIMAL(12,2) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceId INT NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unitPrice DECIMAL(12,2) NOT NULL,
  taxRate DECIMAL(5,2) NOT NULL DEFAULT 0,
  taxLabel VARCHAR(20),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Invoice schedules table
CREATE TABLE IF NOT EXISTS invoice_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceId INT NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  frequency VARCHAR(20) NOT NULL,
  intervalDays INT,
  sendTime VARCHAR(8),
  startDate DATE,
  daysBeforeDue INT,
  ccAccountingTeam TINYINT(1) NOT NULL DEFAULT 0,
  lastSentAt TIMESTAMP NULL DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE,
  UNIQUE KEY unique_invoice_schedule (invoiceId)
);

-- Invoice payments table
CREATE TABLE IF NOT EXISTS invoice_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceId INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method VARCHAR(50),
  note TEXT,
  paidAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Cart table
CREATE TABLE IF NOT EXISTS cart (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  serviceId INT NOT NULL,
  serviceType ENUM('DOMAIN', 'HOSTING', 'VPS') NOT NULL,
  serviceName VARCHAR(255) NOT NULL,
  quantity INT DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  serviceData JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Settings table - Stores system settings as JSON
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(255) UNIQUE NOT NULL,
  value JSON NOT NULL,
  description TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Email Notifications table - Queue for sending emails
CREATE TABLE IF NOT EXISTS email_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customerId INT NOT NULL,
  serviceId INT NOT NULL,
  serviceType ENUM('DOMAIN','HOSTING','VPS') NOT NULL,
  notificationType ENUM('EXPIRING_SOON_1','EXPIRING_SOON_2','EXPIRING_SOON_3','EXPIRED','DELETION_WARNING','DELETED') NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  recipientEmail VARCHAR(255) NOT NULL,
  status ENUM('PENDING','SENDING','SENT','FAILED','CANCELLED') DEFAULT 'PENDING',
  scheduledAt TIMESTAMP NULL,
  sentAt TIMESTAMP NULL,
  errorMessage TEXT,
  retryCount INT DEFAULT 0,
  metadata JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
);

-- Websites table
CREATE TABLE IF NOT EXISTS websites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domainId INT,
  hostingId INT,
  vpsId INT,
  contractId INT,
  orderId INT,
  customerId INT NOT NULL,
  status ENUM('LIVE','DOWN','MAINTENANCE') DEFAULT 'LIVE',
  description TEXT,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (domainId) REFERENCES domain(id) ON DELETE SET NULL,
  FOREIGN KEY (hostingId) REFERENCES hosting(id) ON DELETE SET NULL,
  FOREIGN KEY (vpsId) REFERENCES vps(id) ON DELETE SET NULL,
  FOREIGN KEY (contractId) REFERENCES contracts(id) ON DELETE SET NULL,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
);

-- Insert sample data (only if not exists)
-- Note: Password hash for all sample users/customers: 'password123'
-- Note: IDs are auto-generated, so we don't specify them unless needed for relationships

-- Users data
INSERT IGNORE INTO users (email, password, name, role, phone, company, address, emailVerified) VALUES 
('admin@example.com', '$2b$10$9G8OUOTOQ19lBzjBh9NqCOYsRLwvCn2jg7nv3OLb4vHm0bh90E5Fe', 'Admin User', 'ADMIN', '0901234567', 'CRM System', '123 Admin Street, Hanoi', 'YES'),
('user@example.com', '$2b$10$9G8OUOTOQ19lBzjBh9NqCOYsRLwvCn2jg7nv3OLb4vHm0bh90E5Fe', 'Nguyễn Văn Nhân viên', 'USER', '0907654321', 'CRM System', '456 Staff Street, HCMC', 'YES'),
('manager@example.com', '$2b$10$9G8OUOTOQ19lBzjBh9NqCOYsRLwvCn2jg7nv3OLb4vHm0bh90E5Fe', 'Trần Thị Quản lý', 'USER', '0912345678', 'CRM System', '789 Manager Street, Da Nang', 'YES');

-- Customers data
INSERT IGNORE INTO customers (id, name, email, password, phone, address, company, taxCode, companyEmail, companyAddress, companyPhone, companyTaxCode, status, userId, emailVerified) VALUES
(1, 'Nguyễn Văn A', 'customer@example.com', '$2b$10$Tux9JemIUu.gZnGfSNeEo.eniHvA/ydEs/s1N192iEvF0AM4DNzPe', '0123456789', '123 Đường ABC, Quận 1, TP.HCM', 'Công ty TNHH ABC', '0123456789', 'info@abc-company.com', '123 Đường ABC, Quận 1, TP.HCM', '0123456789', '0123456789', 'ACTIVE', 1, 'YES'),
(2, 'Trần Thị B', 'customer2@example.com', '$2b$10$Tux9JemIUu.gZnGfSNeEo.eniHvA/ydEs/s1N192iEvF0AM4DNzPe', '0987654321', '456 Đường XYZ, Quận 2, TP.HCM', 'Công ty Cổ phần XYZ', '0987654321', 'contact@xyz-corp.vn', '456 Đường XYZ, Quận 2, TP.HCM', '0987654321', '0987654321', 'ACTIVE', 2, 'YES'),
(3, 'Lê Văn C', 'customer3@example.com', '$2b$10$Tux9JemIUu.gZnGfSNeEo.eniHvA/ydEs/s1N192iEvF0AM4DNzPe', '0911223344', '789 Đường DEF, Quận 3, TP.HCM', 'Công ty TNHH DEF', '0911223344', 'hello@def-company.vn', '789 Đường DEF, Quận 3, TP.HCM', '0911223344', '0911223344', 'ACTIVE', NULL, 'YES'),
(4, 'Phạm Thị D', 'customer4@example.com', '$2b$10$Tux9JemIUu.gZnGfSNeEo.eniHvA/ydEs/s1N192iEvF0AM4DNzPe', '0933445566', '321 Đường GHI, Quận 7, TP.HCM', 'Công ty TNHH GHI', '0933445566', 'sales@ghi-company.com', '321 Đường GHI, Quận 7, TP.HCM', '0933445566', '0933445566', 'ACTIVE', NULL, 'NO'),
(5, 'Hoàng Văn E', 'customer5@example.com', '$2b$10$Tux9JemIUu.gZnGfSNeEo.eniHvA/ydEs/s1N192iEvF0AM4DNzPe', '0955667788', '654 Đường JKL, Quận Bình Thạnh, TP.HCM', NULL, NULL, NULL, NULL, NULL, NULL, 'INACTIVE', NULL, 'NO');

-- Domain data - Mix of assigned and unassigned domains
INSERT IGNORE INTO domain (domainName, registrar, registrationDate, expiryDate, price, customerId, status) VALUES
-- Domains assigned to customers
('abc-company.com', 'GoDaddy', '2024-01-15', '2025-01-15', 250000, 1, 'ACTIVE'),
('abc-company.vn', 'P.A Vietnam', '2024-02-10', '2025-02-10', 450000, 1, 'ACTIVE'),
('xyz-corp.com', 'Namecheap', '2024-03-01', '2025-03-01', 300000, 2, 'ACTIVE'),
('xyz-corp.vn', 'Mat Bao', '2024-01-20', '2025-01-20', 420000, 2, 'ACTIVE'),
('def-company.vn', 'Nhân Hòa', '2024-04-05', '2025-04-05', 380000, 3, 'ACTIVE'),
('ghi-company.com', 'FPT', '2024-05-12', '2025-05-12', 280000, 4, 'ACTIVE'),
-- Domains expiring soon (for testing notifications)
('expiring-soon.com', 'GoDaddy', '2023-12-01', '2024-12-20', 250000, 1, 'ACTIVE'),
('expired-domain.com', 'Namecheap', '2023-06-01', '2024-06-01', 300000, 2, 'EXPIRED'),
-- Unassigned domains (available for purchase)
('available-domain.com', 'GoDaddy', NULL, NULL, 250000, NULL, 'ACTIVE'),
('test-domain.vn', 'P.A Vietnam', NULL, NULL, 450000, NULL, 'ACTIVE');

-- Public hosting packages (catalog) - customerId NULL so they appear on frontend
INSERT IGNORE INTO hosting (planName, domain, storage, bandwidth, price, status, customerId, expiryDate, serverLocation, addonDomain, subDomain, ftpAccounts, `databases`, hostingType, operatingSystem)
VALUES
-- Public catalog packages
('Starter', NULL, 10, 100, 200000, 'ACTIVE', NULL, NULL, 'Hanoi', '5', '10', '5', '5', 'Shared Hosting', 'Linux'),
('Pro', NULL, 30, 300, 450000, 'ACTIVE', NULL, NULL, 'HCMC', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited', 'Shared Hosting', 'Linux'),
('Business', NULL, 60, 600, 800000, 'ACTIVE', NULL, NULL, 'Singapore', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited', 'VPS Hosting', 'Linux'),
-- Assigned hosting packages to customers
('Pro - Assigned', 'abc-company.com', 30, 300, 450000, 'ACTIVE', 1, '2025-06-15', 'HCMC', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited', 'Shared Hosting', 'Linux'),
('Business - Assigned', 'xyz-corp.com', 60, 600, 800000, 'ACTIVE', 2, '2025-07-20', 'Singapore', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited', 'VPS Hosting', 'Linux'),
('Pro - Assigned', 'def-company.vn', 30, 300, 450000, 'ACTIVE', 3, '2025-08-10', 'HCMC', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited', 'Shared Hosting', 'Linux'),
('Business - Assigned', 'ghi-company.com', 60, 600, 800000, 'ACTIVE', 4, '2025-09-05', 'Singapore', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited', 'VPS Hosting', 'Linux'),
-- Expiring hosting
('Pro - Expiring', 'expiring-soon.com', 30, 300, 450000, 'ACTIVE', 1, '2024-12-25', 'HCMC', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited', 'Shared Hosting', 'Linux');

-- Public VPS packages (catalog) - customerId NULL so they appear on frontend
INSERT IGNORE INTO vps (planName, ipAddress, cpu, ram, storage, bandwidth, price, status, customerId, expiryDate, os)
VALUES
-- Public catalog packages
('VPS Nano', NULL, 1, 1, 20, 500, 900000, 'ACTIVE', NULL, NULL, 'Ubuntu 22.04'),
('VPS Micro', NULL, 2, 2, 40, 1000, 1500000, 'ACTIVE', NULL, NULL, 'Ubuntu 22.04'),
('VPS Small', NULL, 4, 4, 80, 2000, 2800000, 'ACTIVE', NULL, NULL, 'Ubuntu 22.04'),
('VPS Medium', NULL, 4, 8, 160, 4000, 4500000, 'ACTIVE', NULL, NULL, 'Ubuntu 22.04'),
('VPS Large', NULL, 8, 16, 320, 8000, 8000000, 'ACTIVE', NULL, NULL, 'Ubuntu 22.04'),
-- Assigned VPS packages to customers
('VPS Micro - Assigned', '192.168.1.100', 2, 2, 40, 1000, 1500000, 'ACTIVE', 1, '2025-10-15', 'Ubuntu 22.04'),
('VPS Small - Assigned', '192.168.1.101', 4, 4, 80, 2000, 2800000, 'ACTIVE', 2, '2025-11-20', 'Ubuntu 22.04'),
('VPS Medium - Assigned', '192.168.1.102', 4, 8, 160, 4000, 4500000, 'ACTIVE', 3, '2025-12-10', 'CentOS 8'),
('VPS Small - Assigned', '192.168.1.103', 4, 4, 80, 2000, 2800000, 'ACTIVE', 4, '2026-01-05', 'Ubuntu 22.04');

-- Orders data
INSERT IGNORE INTO orders (id, customerId, userId, totalAmount, status, paymentMethod, notes, createdAt) VALUES
(1, 1, 1, 700000, 'COMPLETED', 'BANK_TRANSFER', 'Đơn hàng domain và hosting cho công ty ABC', '2024-01-20 10:00:00'),
(2, 2, 1, 720000, 'COMPLETED', 'CREDIT_CARD', 'Đơn hàng domain cho công ty XYZ', '2024-02-15 14:30:00'),
(3, 1, 2, 1500000, 'COMPLETED', 'BANK_TRANSFER', 'Nâng cấp lên VPS', '2024-03-10 09:15:00'),
(4, 2, 2, 2800000, 'COMPLETED', 'E_WALLET', 'Mua VPS Small', '2024-04-05 16:45:00'),
(5, 3, 1, 830000, 'COMPLETED', 'CASH', 'Đơn hàng domain và hosting', '2024-05-12 11:20:00'),
(6, 4, 2, 1080000, 'CONFIRMED', 'BANK_TRANSFER', 'Đơn hàng đang chờ thanh toán', '2024-06-01 08:00:00'),
(7, 3, 1, 4500000, 'PENDING', 'CREDIT_CARD', 'Đơn hàng VPS Medium', '2024-06-15 13:30:00'),
(8, 1, 2, 450000, 'CANCELLED', 'BANK_TRANSFER', 'Khách hàng hủy đơn', '2024-06-20 10:00:00');

-- Order Items data
-- Note: serviceId references the actual IDs from domains, hostings, and vps tables
-- Domain IDs: 1-10 (1=abc-company.com, 2=abc-company.vn, 3=xyz-corp.com, 4=xyz-corp.vn, 5=def-company.vn, 6=ghi-company.com, 7=expiring-soon.com, 8=expired-domain.com, 9=available-domain.com, 10=test-domain.vn)
-- Hosting IDs: 1-8 (1=Starter, 2=Pro, 3=Business, 4=Pro-Assigned-customer1, 5=Business-Assigned-customer2, 6=Pro-Assigned-customer3, 7=Business-Assigned-customer4, 8=Pro-Expiring)
-- VPS IDs: 1-9 (1=VPS Nano, 2=VPS Micro, 3=VPS Small, 4=VPS Medium, 5=VPS Large, 6=VPS Micro-Assigned, 7=VPS Small-Assigned, 8=VPS Medium-Assigned, 9=VPS Small-Assigned-customer4)
INSERT IGNORE INTO order_items (orderId, serviceId, serviceType, quantity, price, serviceData) VALUES
-- Order 1: Domain + Hosting
(1, 1, 'DOMAIN', 1, 250000, '{"domainName": "abc-company.com"}'),
(1, 4, 'HOSTING', 1, 450000, '{"planName": "Pro - Assigned", "domain": "abc-company.com"}'),
-- Order 2: Domain
(2, 3, 'DOMAIN', 1, 300000, '{"domainName": "xyz-corp.com"}'),
(2, 4, 'DOMAIN', 1, 420000, '{"domainName": "xyz-corp.vn"}'),
-- Order 3: VPS
(3, 6, 'VPS', 1, 1500000, '{"planName": "VPS Micro - Assigned", "ipAddress": "192.168.1.100"}'),
-- Order 4: VPS
(4, 7, 'VPS', 1, 2800000, '{"planName": "VPS Small - Assigned", "ipAddress": "192.168.1.101"}'),
-- Order 5: Domain + Hosting
(5, 5, 'DOMAIN', 1, 380000, '{"domainName": "def-company.vn"}'),
(5, 6, 'HOSTING', 1, 450000, '{"planName": "Pro - Assigned", "domain": "def-company.vn"}'),
-- Order 6: Domain + Hosting
(6, 6, 'DOMAIN', 1, 280000, '{"domainName": "ghi-company.com"}'),
(6, 7, 'HOSTING', 1, 800000, '{"planName": "Business - Assigned", "domain": "ghi-company.com"}'),
-- Order 7: VPS
(7, 8, 'VPS', 1, 4500000, '{"planName": "VPS Medium - Assigned", "ipAddress": "192.168.1.102"}'),
-- Order 8: Hosting (Cancelled)
(8, 4, 'HOSTING', 1, 450000, '{"planName": "Pro - Assigned"}');

-- Contracts data
INSERT IGNORE INTO contracts (id, contractNumber, orderId, customerId, userId, startDate, endDate, totalValue, status, createdAt) VALUES
(1, 'HD-2024-001', 1, 1, 1, '2024-01-20', '2025-01-20', 700000, 'ACTIVE', '2024-01-20 10:30:00'),
(2, 'HD-2024-002', 2, 2, 1, '2024-02-15', '2025-02-15', 720000, 'ACTIVE', '2024-02-15 15:00:00'),
(3, 'HD-2024-003', 3, 1, 2, '2024-03-10', '2025-03-10', 1500000, 'ACTIVE', '2024-03-10 09:30:00'),
(4, 'HD-2024-004', 4, 2, 2, '2024-04-05', '2025-04-05', 2800000, 'ACTIVE', '2024-04-05 17:00:00'),
(5, 'HD-2024-005', 5, 3, 1, '2024-05-12', '2025-05-12', 830000, 'ACTIVE', '2024-05-12 11:45:00'),
(6, 'HD-2023-100', 1, 1, 1, '2023-01-01', '2024-01-01', 500000, 'EXPIRED', '2023-01-01 10:00:00');

-- Contract Domains data
INSERT IGNORE INTO contract_domains (contractId, domainId) VALUES
(1, 1),
(2, 3),
(2, 4),
(5, 5),
(6, 1);

-- Contract Hostings data
INSERT IGNORE INTO contract_hostings (contractId, hostingId) VALUES
(1, 4),
(5, 6);

-- Contract VPSs data
INSERT IGNORE INTO contract_vpss (contractId, vpsId) VALUES
(3, 6),
(4, 7);

-- Payments data
INSERT IGNORE INTO payments (orderId, customerId, amount, status, paymentMethod, transactionId, paymentData, createdAt) VALUES
(1, 1, 700000, 'COMPLETED', 'BANK_TRANSFER', 'TXN-2024-001', '{"bank": "Vietcombank", "accountNumber": "***1234"}', '2024-01-20 10:05:00'),
(2, 2, 720000, 'COMPLETED', 'CREDIT_CARD', 'TXN-2024-002', '{"cardType": "Visa", "last4": "1234"}', '2024-02-15 14:35:00'),
(3, 1, 1500000, 'COMPLETED', 'BANK_TRANSFER', 'TXN-2024-003', '{"bank": "BIDV", "accountNumber": "***5678"}', '2024-03-10 09:20:00'),
(4, 2, 2800000, 'COMPLETED', 'E_WALLET', 'TXN-2024-004', '{"wallet": "MoMo", "phoneNumber": "090****567"}', '2024-04-05 16:50:00'),
(5, 3, 830000, 'COMPLETED', 'CASH', 'TXN-2024-005', '{"receipt": "REC-2024-005"}', '2024-05-12 11:25:00'),
(6, 4, 1080000, 'PENDING', 'BANK_TRANSFER', NULL, NULL, '2024-06-01 08:00:00'),
(7, 3, 4500000, 'PENDING', 'CREDIT_CARD', NULL, NULL, '2024-06-15 13:30:00');

-- Invoices sample data
INSERT IGNORE INTO invoices (id, invoiceNumber, customerId, status, issueDate, dueDate, currency, paymentTerms, paymentMethod, notes, subtotal, tax, total, paid, balance, createdAt)
VALUES
(1, 'INV-2024-0001', 1, 'SENT', '2024-07-01', '2024-07-15', 'VND', 'Net 14', 'BANK_TRANSFER', 'Gia hạn dịch vụ domain & hosting cho Công ty ABC', 820000.00, 82000.00, 902000.00, 0.00, 902000.00, '2024-07-01 08:00:00'),
(2, 'INV-2024-0002', 2, 'PAID', '2024-06-05', '2024-06-20', 'VND', 'Net 15', 'BANK_TRANSFER', 'Máy chủ VPS Small và dịch vụ bảo trì cho Công ty XYZ', 2800000.00, 0.00, 2800000.00, 2800000.00, 0.00, '2024-06-05 09:00:00'),
(3, 'INV-2024-0003', 3, 'PARTIAL', '2024-07-10', '2024-08-05', 'VND', 'Net 30', 'BANK_TRANSFER', 'Triển khai máy chủ VPS Medium và gói hỗ trợ kỹ thuật', 1500000.00, 150000.00, 1650000.00, 800000.00, 850000.00, '2024-07-10 10:00:00'),
(4, 'INV-2024-0004', 4, 'DRAFT', '2024-08-15', '2024-09-01', 'VND', 'Net 15', 'BANK_TRANSFER', 'Hóa đơn đang soạn cho gói dịch vụ Business - Assigned', 1080000.00, 0.00, 1080000.00, 0.00, 1080000.00, '2024-08-15 09:30:00');

-- Invoice items sample data
INSERT IGNORE INTO invoice_items (invoiceId, description, quantity, unitPrice, taxRate, taxLabel, createdAt)
VALUES
-- Invoice 1 items
(1, 'Gia hạn domain abc-company.com (12 tháng)', 1.00, 250000.00, 10.00, '10%', '2024-07-01 08:05:00'),
(1, 'Gói hosting Pro (12 tháng)', 1.00, 450000.00, 10.00, '10%', '2024-07-01 08:05:00'),
(1, 'Dịch vụ sao lưu dữ liệu & giám sát', 1.00, 120000.00, 10.00, '10%', '2024-07-01 08:05:00'),
-- Invoice 2 items
(2, 'Máy chủ VPS Small - cấu hình 4 vCPU / 4GB RAM / 80GB SSD', 1.00, 2800000.00, 0.00, 'KCT', '2024-06-05 09:05:00'),
-- Invoice 3 items
(3, 'Máy chủ VPS Medium - cấu hình 4 vCPU / 8GB RAM', 1.00, 1350000.00, 10.00, '10%', '2024-07-10 10:05:00'),
(3, 'Gói hỗ trợ kỹ thuật nâng cao (tháng đầu)', 1.00, 150000.00, 10.00, '10%', '2024-07-10 10:05:00'),
-- Invoice 4 items
(4, 'Gói dịch vụ Business - Assigned cho domain ghi-company.com', 1.00, 1080000.00, 0.00, 'KCT', '2024-08-15 09:35:00');

-- Invoice schedules sample data
INSERT IGNORE INTO invoice_schedules (invoiceId, enabled, frequency, intervalDays, sendTime, startDate, daysBeforeDue, ccAccountingTeam, lastSentAt, createdAt)
VALUES
(1, 1, 'monthly', NULL, '09:00', '2024-07-01', 3, 1, '2024-06-28 09:00:00', '2024-07-01 08:10:00'),
(2, 0, 'monthly', NULL, '09:30', '2024-06-05', 5, 0, NULL, '2024-06-05 09:10:00'),
(3, 1, 'custom', 30, '10:00', '2024-07-10', 5, 0, '2024-07-10 10:00:00', '2024-07-10 10:10:00'),
(4, 1, 'monthly', NULL, '08:30', '2024-08-15', 7, 1, NULL, '2024-08-15 09:40:00');

-- Invoice payments sample data
INSERT IGNORE INTO invoice_payments (invoiceId, amount, method, note, paidAt, createdAt)
VALUES
(2, 2800000.00, 'BANK_TRANSFER', 'Thanh toán đủ theo ủy nhiệm chi ngày 10/06/2024', '2024-06-10 11:00:00', '2024-06-10 11:00:00'),
(3, 500000.00, 'CASH', 'Thanh toán đợt 1 tại văn phòng', '2024-07-20 09:30:00', '2024-07-20 09:30:00'),
(3, 300000.00, 'BANK_TRANSFER', 'Thanh toán đợt 2 qua ngân hàng', '2024-07-30 16:45:00', '2024-07-30 16:45:00');

-- Websites data
INSERT IGNORE INTO websites (name, domainId, hostingId, vpsId, contractId, orderId, customerId, status, description, notes, createdAt) VALUES
('Website ABC Company', 1, 4, NULL, 1, 1, 1, 'LIVE', 'Website chính của công ty ABC', 'Website đang hoạt động tốt', '2024-01-20 11:00:00'),
('Website XYZ Corp', 3, 5, NULL, 2, 2, 2, 'LIVE', 'Website chính của công ty XYZ', NULL, '2024-02-15 15:30:00'),
('Server ABC Company', NULL, NULL, 6, 3, 3, 1, 'LIVE', 'VPS server cho các ứng dụng của công ty ABC', 'Cần backup định kỳ', '2024-03-10 10:00:00'),
('Server XYZ Corp', NULL, NULL, 7, 4, 4, 2, 'LIVE', 'VPS server cho hệ thống của công ty XYZ', NULL, '2024-04-05 17:30:00'),
('Website DEF Company', 5, 6, NULL, 5, 5, 3, 'LIVE', 'Website công ty DEF', 'Đang trong giai đoạn phát triển', '2024-05-12 12:00:00'),
('Website GHI Company', 6, 7, NULL, NULL, 6, 4, 'MAINTENANCE', 'Website đang bảo trì', 'Chờ thanh toán để kích hoạt', '2024-06-01 08:30:00');

-- Cart data
INSERT IGNORE INTO cart (userId, serviceId, serviceType, serviceName, quantity, price, serviceData, createdAt) VALUES
(1, 9, 'DOMAIN', 'available-domain.com', 1, 250000, '{"domainName": "available-domain.com"}', '2024-06-25 10:00:00'),
(1, 2, 'HOSTING', 'Pro', 1, 450000, '{"planName": "Pro"}', '2024-06-25 10:05:00'),
(2, 10, 'DOMAIN', 'test-domain.vn', 1, 450000, '{"domainName": "test-domain.vn"}', '2024-06-25 11:00:00'),
(2, 4, 'VPS', 'VPS Medium', 1, 4500000, '{"planName": "VPS Medium"}', '2024-06-25 11:15:00');

-- Settings data
-- Note: MySQL 5.7.8+ and MariaDB 10.2.7+ support JSON type
-- JSON strings are automatically parsed when inserted into JSON columns
-- Format: strings use double quotes, numbers without quotes, arrays/objects as JSON strings
INSERT IGNORE INTO settings (`key`, value, description, createdAt) VALUES
('email_smtp_host', '"smtp.gmail.com"', 'SMTP server host for sending emails', NOW()),
('email_smtp_port', '587', 'SMTP server port', NOW()),
('email_smtp_user', '"your-email@gmail.com"', 'SMTP username', NOW()),
('email_smtp_password', '""', 'SMTP password (set via admin panel)', NOW()),
('domain_expiry_warning_days', '[30, 15, 7]', 'Days before expiry to send warning emails', NOW()),
('hosting_expiry_warning_days', '[30, 15, 7]', 'Days before expiry to send warning emails', NOW()),
('vps_expiry_warning_days', '[30, 15, 7]', 'Days before expiry to send warning emails', NOW()),
('company_name', '"CRM System"', 'Company name for emails and documents', NOW()),
('company_address', '"123 Business Street, Hanoi, Vietnam"', 'Company address', NOW()),
('company_phone', '"+84 123 456 789"', 'Company phone number', NOW()),
('company_email', '"info@crm-system.com"', 'Company email address', NOW()),
('company_tax_code', '"0101234567"', 'Company tax code', NOW());

-- Email Notifications sample data (optional - for testing)
INSERT IGNORE INTO email_notifications (customerId, serviceId, serviceType, notificationType, subject, content, recipientEmail, status, scheduledAt, createdAt) VALUES
(1, 7, 'DOMAIN', 'EXPIRING_SOON_1', 'Thông báo gia hạn domain expiring-soon.com', 'Domain của bạn sẽ hết hạn trong 30 ngày...', 'customer@example.com', 'SENT', '2024-11-20 09:00:00', '2024-11-20 09:00:00'),
(2, 8, 'DOMAIN', 'EXPIRED', 'Thông báo domain expired-domain.com đã hết hạn', 'Domain của bạn đã hết hạn...', 'customer2@example.com', 'SENT', '2024-06-02 09:00:00', '2024-06-02 09:00:00'),
(1, 8, 'HOSTING', 'EXPIRING_SOON_1', 'Thông báo gia hạn hosting expiring-soon.com', 'Hosting của bạn sẽ hết hạn trong 30 ngày...', 'customer@example.com', 'PENDING', '2024-11-25 09:00:00', '2024-11-25 08:00:00');

-- Create indexes for better performance
-- WARNING: If indexes already exist, these commands will fail with an error
-- In that case, you can either:
--   1. Drop the existing indexes first, or
--   2. Comment out the CREATE INDEX statements below, or  
--   3. Ignore the errors (indexes will remain unchanged)
-- Note: MySQL/MariaDB does not support CREATE INDEX IF NOT EXISTS syntax
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_userId ON customers(userId);
CREATE INDEX idx_orders_customerId ON orders(customerId);
CREATE INDEX idx_orders_userId ON orders(userId);
CREATE INDEX idx_order_items_orderId ON order_items(orderId);
CREATE INDEX idx_contracts_orderId ON contracts(orderId);
CREATE INDEX idx_contracts_customerId ON contracts(customerId);
CREATE INDEX idx_payments_orderId ON payments(orderId);
CREATE INDEX idx_payments_customerId ON payments(customerId);
CREATE INDEX idx_invoices_customerId ON invoices(customerId);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issueDate ON invoices(issueDate);
CREATE INDEX idx_invoice_items_invoiceId ON invoice_items(invoiceId);
CREATE INDEX idx_invoice_payments_invoiceId ON invoice_payments(invoiceId);
CREATE INDEX idx_cart_userId ON cart(userId);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_settings_key ON settings(`key`);
CREATE INDEX idx_email_notifications_customerId ON email_notifications(customerId);
CREATE INDEX idx_email_notifications_serviceId ON email_notifications(serviceId);
CREATE INDEX idx_email_notifications_status ON email_notifications(status);
CREATE INDEX idx_email_notifications_scheduledAt ON email_notifications(scheduledAt);
CREATE INDEX idx_websites_customerId ON websites(customerId);
CREATE INDEX idx_websites_domainId ON websites(domainId);
CREATE INDEX idx_websites_hostingId ON websites(hostingId);
CREATE INDEX idx_websites_vpsId ON websites(vpsId);
CREATE INDEX idx_websites_contractId ON websites(contractId);
CREATE INDEX idx_websites_orderId ON websites(orderId);
CREATE INDEX idx_websites_status ON websites(status);
