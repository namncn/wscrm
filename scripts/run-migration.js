#!/usr/bin/env node

/**
 * Script chạy migration SQL file
 * Usage: node scripts/run-migration.js <migration-file.sql>
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load .env manually
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

async function runMigration(migrationFile) {
  console.log(`📄 Running migration: ${migrationFile}\n`);

  // Đọc file SQL
  const sqlPath = path.join(process.cwd(), migrationFile);
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Migration file not found: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Tạo connection config
  const dbConfig = process.env.DB_SOCKET_PATH
    ? {
        socketPath: process.env.DB_SOCKET_PATH,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'crm_db',
        multipleStatements: true,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'crm_db',
        multipleStatements: true,
      };

  try {
    console.log('🔌 Connecting to database...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected!\n');

    // Chạy SQL
    console.log('🚀 Executing migration...');
    await connection.query(sql);
    console.log('✅ Migration completed successfully!\n');

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed!\n');
    console.error('Error details:');
    console.error('  Code:', error.code);
    console.error('  Errno:', error.errno);
    console.error('  SQL State:', error.sqlState);
    console.error('  Message:', error.message);
    
    if (error.sql) {
      console.error('\n  SQL:', error.sql.substring(0, 200) + '...');
    }
    
    process.exit(1);
  }
}

// Lấy file migration từ command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Usage: node scripts/run-migration.js <migration-file.sql>');
  console.error('   Example: node scripts/run-migration.js drizzle/0031_move_external_account_id_to_customers.sql');
  process.exit(1);
}

runMigration(migrationFile);

