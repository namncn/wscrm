#!/usr/bin/env node

/**
 * Script kiểm tra kết nối database
 * Sử dụng để debug lỗi kết nối database
 * 
 * Lưu ý: Script này đọc từ process.env
 * Đảm bảo file .env đã được load hoặc export biến môi trường trước khi chạy
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load .env manually if exists (không cần dotenv package)
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  // Hiển thị cấu hình (ẩn password)
  const config = {
    socketPath: process.env.DB_SOCKET_PATH || null,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ? '***' : '(empty)',
    database: process.env.DB_NAME || 'crm_db',
  };

  console.log('📋 Configuration:');
  console.log(JSON.stringify(config, null, 2));
  console.log('');

  // Tạo connection config
  const dbConfig = process.env.DB_SOCKET_PATH
    ? {
        socketPath: process.env.DB_SOCKET_PATH,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'crm_db',
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'crm_db',
      };

  try {
    console.log('🔌 Attempting to connect...');
    const connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Connection successful!\n');
    
    // Test query
    const [rows] = await connection.execute('SELECT 1 as test, DATABASE() as current_db, USER() as current_user');
    console.log('📊 Test query result:');
    console.log(rows);
    console.log('');
    
    // Check if database exists and show tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`📋 Tables in database: ${tables.length}`);
    if (tables.length > 0) {
      console.log('   Tables:', tables.map(t => Object.values(t)[0]).join(', '));
    } else {
      console.log('   ⚠️  No tables found. Database might be empty.');
    }
    
    await connection.end();
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!\n');
    console.error('Error details:');
    console.error('  Code:', error.code);
    console.error('  Errno:', error.errno);
    console.error('  SQL State:', error.sqlState);
    console.error('  Message:', error.message);
    console.error('\n💡 Troubleshooting tips:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('  1. Check if MySQL/MariaDB is running:');
      console.error('     sudo systemctl status mariadb');
      console.error('     sudo systemctl status mysql');
      console.error('  2. Check if host/port is correct');
      console.error('  3. If using socket, check if DB_SOCKET_PATH is correct');
      console.error('  4. Check firewall settings');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('  1. Check username and password in .env');
      console.error('  2. Verify user has access to the database');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('  1. Database does not exist');
      console.error('  2. Create database: CREATE DATABASE ' + config.database);
    } else if (error.code === 'ENOENT' && process.env.DB_SOCKET_PATH) {
      console.error('  1. Socket file not found at:', process.env.DB_SOCKET_PATH);
      console.error('  2. Find correct socket path:');
      console.error('     mysql_config --socket');
      console.error('     or check /etc/mysql/my.cnf');
    }
    
    process.exit(1);
  }
}

testConnection();

