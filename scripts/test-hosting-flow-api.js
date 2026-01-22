#!/usr/bin/env node

/**
 * Script để gọi API test hosting flow
 * Sử dụng API endpoint /api/test/hosting-flow
 * 
 * Usage:
 *   node scripts/test-hosting-flow-api.js existing
 *   node scripts/test-hosting-flow-api.js new
 *   node scripts/test-hosting-flow-api.js existing --email=test@example.com
 */

const http = require('http');
const https = require('https');
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

async function callTestAPI(scenario, customerEmail, customerName) {
  return new Promise((resolve, reject) => {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || 'localhost';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    
    const url = `${protocol}://${host}:${port}/api/test/hosting-flow`;
    
    const body = JSON.stringify({
      scenario,
      customerEmail,
      customerName,
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        // Note: API yêu cầu authentication, cần session cookie hoặc token
        // Trong thực tế, bạn cần đăng nhập trước và lấy session cookie
      },
    };

    const client = protocol === 'https' ? https : http;
    
    log(`\n📡 Gọi API: ${url}`, 'cyan');
    log(`   Body: ${body}`, 'cyan');

    const req = client.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(body);
    req.end();
  });
}

async function main() {
  const scenario = process.argv[2];
  
  if (!scenario || !['existing', 'new'].includes(scenario)) {
    log('❌ Usage:', 'red');
    log('   node scripts/test-hosting-flow-api.js <scenario> [--email=email] [--name=name]', 'yellow');
    log('', 'reset');
    log('   scenario: "existing" hoặc "new"', 'cyan');
    log('   --email: Email của customer (optional)', 'cyan');
    log('   --name: Tên của customer (optional)', 'cyan');
    log('', 'reset');
    log('   Examples:', 'yellow');
    log('     node scripts/test-hosting-flow-api.js existing', 'cyan');
    log('     node scripts/test-hosting-flow-api.js new', 'cyan');
    log('     node scripts/test-hosting-flow-api.js existing --email=test@example.com', 'cyan');
    process.exit(1);
  }

  // Parse optional arguments
  let customerEmail = null;
  let customerName = null;
  
  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--email=')) {
      customerEmail = arg.split('=')[1];
    } else if (arg.startsWith('--name=')) {
      customerName = arg.split('=')[1];
    }
  }

  logSection(`🧪 TEST HOSTING FLOW - ${scenario === 'existing' ? 'Customer có sẵn' : 'Customer mới'}`);

  try {
    log(`\n⚠️  Lưu ý: API endpoint yêu cầu authentication (ADMIN role)`, 'yellow');
    log(`   Bạn cần đăng nhập và có session cookie để gọi API này`, 'yellow');
    log(`   Hoặc sử dụng tool như Postman/curl với session cookie`, 'yellow');
    log(`\n💡 Cách khác: Mở browser, đăng nhập với tài khoản ADMIN, sau đó:`, 'cyan');
    log(`   1. Mở DevTools > Console`, 'cyan');
    log(`   2. Chạy lệnh:`, 'cyan');
    log(`      fetch('/api/test/hosting-flow', {`, 'cyan');
    log(`        method: 'POST',`, 'cyan');
    log(`        headers: { 'Content-Type': 'application/json' },`, 'cyan');
    log(`        body: JSON.stringify({ scenario: '${scenario}', customerEmail: '${customerEmail || ''}', customerName: '${customerName || ''}' })`, 'cyan');
    log(`      }).then(r => r.json()).then(console.log)`, 'cyan');
    
    // Vẫn thử gọi API (có thể fail nếu chưa có auth)
    try {
      const result = await callTestAPI(scenario, customerEmail, customerName);
      
      if (result.status === 200 && result.data.success) {
        log(`\n✅ Test thành công!`, 'green');
        log(`\n📊 Kết quả:`, 'bright');
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        log(`\n❌ Test thất bại:`, 'red');
        log(`   Status: ${result.status}`, 'red');
        log(`   Error: ${result.data.error || 'Unknown error'}`, 'red');
        console.log(JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        log(`\n❌ Không thể kết nối đến server`, 'red');
        log(`   Vui lòng đảm bảo server đang chạy: npm run dev`, 'yellow');
      } else {
        log(`\n❌ Lỗi khi gọi API:`, 'red');
        log(`   ${error.message}`, 'red');
      }
    }
    
  } catch (error) {
    log(`\n❌ Lỗi:`, 'red');
    log(`   ${error.message}`, 'red');
    process.exit(1);
  }
}

main();

