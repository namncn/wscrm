#!/usr/bin/env node

/**
 * Script kiểm tra migration đã được áp dụng
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

async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');

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
    const connection = await mysql.createConnection(dbConfig);

    // Kiểm tra customers table có externalAccountId không
    console.log('📋 Checking customers table...');
    const [customersColumns] = await connection.execute(
      "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'externalAccountId'",
      [process.env.DB_NAME || 'crm_db']
    );

    if (customersColumns.length > 0) {
      console.log('✅ customers.externalAccountId exists:', customersColumns[0]);
    } else {
      console.log('❌ customers.externalAccountId NOT found!');
    }

    // Kiểm tra hosting table không còn externalAccountId
    console.log('\n📋 Checking hosting table...');
    const [hostingColumns] = await connection.execute(
      "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'hosting' AND COLUMN_NAME = 'externalAccountId'",
      [process.env.DB_NAME || 'crm_db']
    );

    if (hostingColumns.length === 0) {
      console.log('✅ hosting.externalAccountId has been removed (correct!)');
    } else {
      console.log('❌ hosting.externalAccountId still exists!');
    }

    // Kiểm tra index
    console.log('\n📋 Checking index...');
    const [indexes] = await connection.execute(
      "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'customers' AND INDEX_NAME = 'idx_customers_externalAccountId'",
      [process.env.DB_NAME || 'crm_db']
    );

    if (indexes.length > 0) {
      console.log('✅ Index idx_customers_externalAccountId exists');
    } else {
      console.log('⚠️  Index idx_customers_externalAccountId not found (may need to be created)');
    }

    // Đếm số customers có externalAccountId
    const [count] = await connection.execute(
      "SELECT COUNT(*) as total, COUNT(externalAccountId) as with_external FROM customers"
    );
    console.log('\n📊 Statistics:');
    console.log(`   Total customers: ${count[0].total}`);
    console.log(`   Customers with externalAccountId: ${count[0].with_external}`);

    await connection.end();
    console.log('\n✅ Verification completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Verification failed!');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyMigration();

