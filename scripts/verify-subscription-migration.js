#!/usr/bin/env node

/**
 * Script kiểm tra migration subscription fields
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
  console.log('🔍 Verifying subscription fields migration...\n');

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

    // Kiểm tra subscriptionId column
    console.log('📋 Checking hosting.subscriptionId column...');
    const [subscriptionIdColumn] = await connection.execute(
      "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'hosting' AND COLUMN_NAME = 'subscriptionId'",
      [process.env.DB_NAME || 'crm_db']
    );

    if (subscriptionIdColumn.length > 0) {
      console.log('✅ hosting.subscriptionId exists:', subscriptionIdColumn[0]);
    } else {
      console.log('❌ hosting.subscriptionId NOT found!');
    }

    // Note: subscriptionSyncedAt has been removed, we use lastSyncedAt instead

    // Kiểm tra index
    console.log('\n📋 Checking index...');
    const [indexes] = await connection.execute(
      "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'hosting' AND INDEX_NAME = 'idx_hosting_subscriptionId'",
      [process.env.DB_NAME || 'crm_db']
    );

    if (indexes.length > 0) {
      console.log('✅ Index idx_hosting_subscriptionId exists');
    } else {
      console.log('⚠️  Index idx_hosting_subscriptionId not found');
    }

    // Đếm số hosting có subscriptionId
    const [count] = await connection.execute(
      "SELECT COUNT(*) as total, COUNT(subscriptionId) as with_subscription FROM hosting"
    );
    console.log('\n📊 Statistics:');
    console.log(`   Total hostings: ${count[0].total}`);
    console.log(`   Hostings with subscriptionId: ${count[0].with_subscription}`);

    // Kiểm tra dữ liệu đã được migrate chưa
    if (count[0].with_subscription > 0) {
      const [sample] = await connection.execute(
        "SELECT id, subscriptionId, lastSyncedAt FROM hosting WHERE subscriptionId IS NOT NULL LIMIT 1"
      );
      if (sample.length > 0) {
        console.log('\n📝 Sample data:');
        console.log(`   Hosting ID: ${sample[0].id}`);
        console.log(`   Subscription ID: ${sample[0].subscriptionId}`);
        console.log(`   Last Synced At: ${sample[0].lastSyncedAt || 'NULL'}`);
      }
    }

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

