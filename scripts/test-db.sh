#!/bin/bash

# Script kiểm tra kết nối database
# Sử dụng để debug lỗi kết nối database

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

# Load .env if exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Database Connection Test             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Display configuration
print_info "Configuration:"
echo "  DB_HOST: ${DB_HOST:-localhost}"
echo "  DB_PORT: ${DB_PORT:-3306}"
echo "  DB_USER: ${DB_USER:-root}"
echo "  DB_NAME: ${DB_NAME:-crm_db}"
if [ -n "$DB_SOCKET_PATH" ]; then
    echo "  DB_SOCKET_PATH: $DB_SOCKET_PATH"
fi
echo "  DB_PASSWORD: ${DB_PASSWORD:+***hidden***}"
echo ""

# Check if MySQL client is installed
if ! command -v mysql &> /dev/null; then
    print_error "MySQL client not found. Please install:"
    echo "  sudo apt install mysql-client -y"
    exit 1
fi

# Test connection
print_info "Testing database connection..."

if [ -n "$DB_SOCKET_PATH" ]; then
    # Socket connection
    print_info "Using socket connection: $DB_SOCKET_PATH"
    
    if [ ! -S "$DB_SOCKET_PATH" ]; then
        print_error "Socket file not found: $DB_SOCKET_PATH"
        print_info "Try to find socket path:"
        echo "  mysql_config --socket"
        echo "  or check /etc/mysql/my.cnf"
        exit 1
    fi
    
    if [ -z "$DB_PASSWORD" ]; then
        mysql -S "$DB_SOCKET_PATH" -u "$DB_USER" -e "SELECT 1 as test, DATABASE() as current_db, USER() as current_user;" "$DB_NAME" 2>&1
    else
        mysql -S "$DB_SOCKET_PATH" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1 as test, DATABASE() as current_db, USER() as current_user;" "$DB_NAME" 2>&1
    fi
else
    # TCP connection
    print_info "Using TCP connection: ${DB_HOST:-localhost}:${DB_PORT:-3306}"
    
    if [ -z "$DB_PASSWORD" ]; then
        mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" -e "SELECT 1 as test, DATABASE() as current_db, USER() as current_user;" "${DB_NAME:-crm_db}" 2>&1
    else
        mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" -p"$DB_PASSWORD" -e "SELECT 1 as test, DATABASE() as current_db, USER() as current_user;" "${DB_NAME:-crm_db}" 2>&1
    fi
fi

if [ $? -eq 0 ]; then
    print_success "Connection successful!"
    echo ""
    
    # Show tables
    print_info "Checking tables..."
    if [ -n "$DB_SOCKET_PATH" ]; then
        if [ -z "$DB_PASSWORD" ]; then
            TABLE_COUNT=$(mysql -S "$DB_SOCKET_PATH" -u "$DB_USER" -e "SHOW TABLES;" "$DB_NAME" 2>/dev/null | wc -l)
        else
            TABLE_COUNT=$(mysql -S "$DB_SOCKET_PATH" -u "$DB_USER" -p"$DB_PASSWORD" -e "SHOW TABLES;" "$DB_NAME" 2>/dev/null | wc -l)
        fi
    else
        if [ -z "$DB_PASSWORD" ]; then
            TABLE_COUNT=$(mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" -e "SHOW TABLES;" "${DB_NAME:-crm_db}" 2>/dev/null | wc -l)
        else
            TABLE_COUNT=$(mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" -p"$DB_PASSWORD" -e "SHOW TABLES;" "${DB_NAME:-crm_db}" 2>/dev/null | wc -l)
        fi
    fi
    
    if [ "$TABLE_COUNT" -gt 1 ]; then
        print_success "Found $((TABLE_COUNT - 1)) tables in database"
    else
        print_warning "No tables found. Database might be empty."
        print_info "Run: npm run db:push"
    fi
    
    echo ""
    print_success "All tests passed! ✅"
else
    print_error "Connection failed!"
    echo ""
    print_info "Troubleshooting:"
    echo "  1. Check if MySQL/MariaDB is running:"
    echo "     sudo systemctl status mariadb"
    echo "  2. Verify credentials in .env file"
    echo "  3. Check if database exists:"
    echo "     mysql -u root -p -e \"SHOW DATABASES LIKE '${DB_NAME:-crm_db}';\""
    echo "  4. If using socket, verify DB_SOCKET_PATH is correct"
    echo "  5. Check firewall settings"
    exit 1
fi

