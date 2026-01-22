#!/usr/bin/env node

/**
 * Test script để kiểm tra flow mua hosting và thanh toán
 * Test 2 phương án:
 * - Phương án 1: Sử dụng customer đã có sẵn (đã có externalAccountId)
 * - Phương án 2: Tạo mới customer (chưa có externalAccountId)
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

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

async function getDbConnection() {
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

  return await mysql.createConnection(dbConfig);
}

async function testScenario(scenarioName, customerEmail, customerName, hasExistingCustomer) {
  logSection(`🧪 ${scenarioName}`);
  
  const connection = await getDbConnection();
  
  try {
    // Step 1: Kiểm tra hoặc tạo customer
    log(`\n📋 Bước 1: Kiểm tra customer...`, 'cyan');
    
    let [customers] = await connection.execute(
      'SELECT id, name, email, externalAccountId FROM customers WHERE email = ?',
      [customerEmail]
    );
    
    let customerId;
    let customerExternalId = null;
    
    if (customers.length > 0) {
      customerId = customers[0].id;
      customerExternalId = customers[0].externalAccountId;
      log(`   ✓ Customer đã tồn tại: ID=${customerId}, externalAccountId=${customerExternalId || 'NULL'}`, 'green');
      
      if (hasExistingCustomer && !customerExternalId) {
        log(`   ⚠️  Cảnh báo: Customer tồn tại nhưng chưa có externalAccountId`, 'yellow');
      }
    } else {
      // Tạo customer mới
      log(`   → Tạo customer mới...`, 'yellow');
      
      // Lấy userId đầu tiên
      const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
      if (users.length === 0) {
        throw new Error('Không tìm thấy user trong database');
      }
      const userId = users[0].id;
      
      const [result] = await connection.execute(
        'INSERT INTO customers (name, email, password, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [customerName, customerEmail, 'TEST_PASSWORD', userId]
      );
      
      customerId = result.insertId;
      log(`   ✓ Đã tạo customer mới: ID=${customerId}`, 'green');
    }
    
    // Step 2: Lấy hosting package đầu tiên
    log(`\n📋 Bước 2: Lấy hosting package...`, 'cyan');
    
    const [hostingPackages] = await connection.execute(
      'SELECT id, planName, price FROM hosting_packages WHERE status = "ACTIVE" LIMIT 1'
    );
    
    if (hostingPackages.length === 0) {
      throw new Error('Không tìm thấy hosting package nào');
    }
    
    const hostingPackage = hostingPackages[0];
    log(`   ✓ Hosting package: ${hostingPackage.planName} (ID=${hostingPackage.id}, Price=${hostingPackage.price})`, 'green');
    
    // Step 3: Tạo order với hosting item
    log(`\n📋 Bước 3: Tạo order...`, 'cyan');
    
    const [users] = await connection.execute('SELECT id FROM users LIMIT 1');
    const userId = users[0].id;
    
    const [orderResult] = await connection.execute(
      'INSERT INTO orders (customerId, userId, totalAmount, status, createdAt, updatedAt) VALUES (?, ?, ?, "PENDING", NOW(), NOW())',
      [customerId, userId, hostingPackage.price]
    );
    
    const orderId = orderResult.insertId;
    log(`   ✓ Đã tạo order: ID=${orderId}`, 'green');
    
    // Tạo order item
    await connection.execute(
      'INSERT INTO order_items (orderId, serviceId, serviceType, quantity, price, createdAt, updatedAt) VALUES (?, ?, "HOSTING", 1, ?, NOW(), NOW())',
      [orderId, hostingPackage.id, hostingPackage.price]
    );
    
    log(`   ✓ Đã tạo order item cho hosting`, 'green');
    
    // Step 4: Simulate thanh toán thành công (update order status = COMPLETED)
    log(`\n📋 Bước 4: Simulate thanh toán thành công...`, 'cyan');
    
    await connection.execute(
      'UPDATE orders SET status = "COMPLETED", updatedAt = NOW() WHERE id = ?',
      [orderId]
    );
    
    log(`   ✓ Đã cập nhật order status = COMPLETED`, 'green');
    
    // Step 5: Gọi createServicesFromOrder để trigger flow tự động
    log(`\n📋 Bước 5: Tạo hosting service và sync lên Enhance...`, 'cyan');
    log(`   → Đang gọi createServicesFromOrder...`, 'yellow');
    
    // Note: Để trigger flow tự động, bạn có thể:
    // 1. Gọi API endpoint: POST /api/test/hosting-flow với { scenario, customerEmail, customerName }
    // 2. Hoặc chạy server và update order status qua API PUT /api/orders
    // 3. Hoặc chờ webhook thanh toán tự động trigger
    
    log(`   ℹ️  Để trigger flow tự động, vui lòng:`, 'cyan');
    log(`      1. Gọi API: POST /api/test/hosting-flow`, 'cyan');
    log(`      2. Hoặc update order status = COMPLETED qua API`, 'cyan');
    log(`   → Đang chờ 5 giây để simulate...`, 'yellow');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 6: Kiểm tra kết quả
    log(`\n📋 Bước 6: Kiểm tra kết quả...`, 'cyan');
    
    // Kiểm tra customer có externalAccountId chưa
    const [updatedCustomers] = await connection.execute(
      'SELECT id, name, email, externalAccountId FROM customers WHERE id = ?',
      [customerId]
    );
    
    const updatedCustomer = updatedCustomers[0];
    const hasExternalAccountId = updatedCustomer.externalAccountId !== null;
    
    if (hasExternalAccountId) {
      log(`   ✓ Customer đã có externalAccountId: ${updatedCustomer.externalAccountId}`, 'green');
    } else {
      log(`   ✗ Customer chưa có externalAccountId`, 'red');
    }
    
    // Kiểm tra hosting đã được tạo chưa
    const [hostings] = await connection.execute(
      'SELECT id, customerId, hostingTypeId, syncStatus, subscriptionId, syncError FROM hosting WHERE customerId = ? ORDER BY createdAt DESC LIMIT 1',
      [customerId]
    );
    
    if (hostings.length > 0) {
      const hosting = hostings[0];
      log(`   ✓ Hosting đã được tạo: ID=${hosting.id}`, 'green');
      log(`     - Sync Status: ${hosting.syncStatus}`, hosting.syncStatus === 'SYNCED' ? 'green' : 'yellow');
      log(`     - Subscription ID: ${hosting.subscriptionId || 'NULL'}`, hosting.subscriptionId ? 'green' : 'yellow');
      
      if (hosting.syncError) {
        log(`     - Sync Error: ${hosting.syncError}`, 'red');
      }
      
      // Kiểm tra hosting package
      const [hostingPackageInfo] = await connection.execute(
        'SELECT planName FROM hosting_packages WHERE id = ?',
        [hosting.hostingTypeId]
      );
      
      if (hostingPackageInfo.length > 0) {
        log(`     - Package: ${hostingPackageInfo[0].planName}`, 'cyan');
      }
    } else {
      log(`   ✗ Hosting chưa được tạo`, 'red');
    }
    
    // Tóm tắt kết quả
    log(`\n📊 Tóm tắt kết quả:`, 'bright');
    const results = {
      customerCreated: customerId !== null,
      customerHasExternalId: hasExternalAccountId,
      hostingCreated: hostings.length > 0,
      hostingSynced: hostings.length > 0 && hostings[0].syncStatus === 'SYNCED',
      subscriptionCreated: hostings.length > 0 && hostings[0].subscriptionId !== null,
    };
    
    log(`   - Customer ID: ${customerId}`, results.customerCreated ? 'green' : 'red');
    log(`   - Customer External ID: ${updatedCustomer.externalAccountId || 'NULL'}`, results.customerHasExternalId ? 'green' : 'yellow');
    log(`   - Hosting Created: ${results.hostingCreated ? 'YES' : 'NO'}`, results.hostingCreated ? 'green' : 'red');
    log(`   - Hosting Synced: ${results.hostingSynced ? 'YES' : 'NO'}`, results.hostingSynced ? 'green' : 'yellow');
    log(`   - Subscription ID: ${hostings.length > 0 ? (hostings[0].subscriptionId || 'NULL') : 'N/A'}`, results.subscriptionCreated ? 'green' : 'yellow');
    
    // Đánh giá
    const allPassed = results.customerCreated && 
                     results.customerHasExternalId && 
                     results.hostingCreated && 
                     results.hostingSynced && 
                     results.subscriptionCreated;
    
    if (allPassed) {
      log(`\n✅ ${scenarioName}: TẤT CẢ KIỂM TRA ĐÃ PASS!`, 'green');
    } else {
      log(`\n⚠️  ${scenarioName}: MỘT SỐ KIỂM TRA CHƯA PASS`, 'yellow');
      if (!results.customerHasExternalId) {
        log(`   - Customer chưa có externalAccountId (có thể cần sync thủ công)`, 'yellow');
      }
      if (!results.hostingCreated) {
        log(`   - Hosting chưa được tạo (có thể do lỗi trong createServicesFromOrder)`, 'red');
      }
      if (!results.hostingSynced) {
        log(`   - Hosting chưa được sync (có thể do lỗi kết nối Enhance)`, 'yellow');
      }
      if (!results.subscriptionCreated) {
        log(`   - Subscription chưa được tạo (có thể do lỗi trong createHosting)`, 'yellow');
      }
    }
    
    return {
      scenarioName,
      orderId,
      customerId,
      results,
      allPassed,
    };
    
  } catch (error) {
    log(`\n❌ Lỗi trong ${scenarioName}:`, 'red');
    log(`   ${error.message}`, 'red');
    console.error(error);
    throw error;
  } finally {
    await connection.end();
  }
}

async function main() {
  logSection('🚀 TEST FLOW MUA HOSTING VÀ THANH TOÁN');
  
  log(`\nMục đích: Kiểm tra flow tự động khi thanh toán thành công`, 'cyan');
  log(`- Tạo/lấy customer trên Enhance`, 'cyan');
  log(`- Lưu customer ID vào database`, 'cyan');
  log(`- Tạo hosting trong database`, 'cyan');
  log(`- Tạo subscription trên Enhance`, 'cyan');
  log(`- Lưu subscription ID vào hosting`, 'cyan');
  
  try {
    // Phương án 1: Customer đã có sẵn
    const result1 = await testScenario(
      'Phương án 1: Customer đã có sẵn',
      'existing.customer@test.com',
      'Customer Existing',
      true
    );
    
    // Đợi một chút trước khi test phương án 2
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Phương án 2: Customer mới
    const timestamp = Date.now();
    const result2 = await testScenario(
      'Phương án 2: Customer mới',
      `new.customer.${timestamp}@test.com`,
      `New Customer ${timestamp}`,
      false
    );
    
    // Tổng kết
    logSection('📊 TỔNG KẾT');
    
    log(`\nPhương án 1: ${result1.allPassed ? '✅ PASS' : '⚠️  MỘT SỐ TEST CHƯA PASS'}`, result1.allPassed ? 'green' : 'yellow');
    log(`Phương án 2: ${result2.allPassed ? '✅ PASS' : '⚠️  MỘT SỐ TEST CHƯA PASS'}`, result2.allPassed ? 'green' : 'yellow');
    
    if (result1.allPassed && result2.allPassed) {
      log(`\n🎉 TẤT CẢ TEST ĐÃ PASS!`, 'green');
      process.exit(0);
    } else {
      log(`\n⚠️  MỘT SỐ TEST CHƯA PASS. Vui lòng kiểm tra log ở trên.`, 'yellow');
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n❌ Lỗi khi chạy test:`, 'red');
    log(`   ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Chạy test
main();

