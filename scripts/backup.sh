#!/bin/bash

# WSCRM Platform - Backup Script
# Script sao lưu database và files

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/crm}"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="${DB_NAME:-crm_db}"
DB_USER="${DB_USER:-crm_user}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

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

# Banner
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   WSCRM Platform - Backup Script      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Create backup directory
print_info "Creating backup directory..."
mkdir -p "$BACKUP_DIR"
print_success "Backup directory: $BACKUP_DIR"

# Backup database
print_info "Backing up database: $DB_NAME..."

# Check if password is provided
if [ -z "$DB_PASSWORD" ]; then
    print_warning "DB_PASSWORD not set. Will prompt for password."
    mysqldump -u "$DB_USER" -p "$DB_NAME" | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"
else
    mysqldump -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"
fi

if [ -f "$BACKUP_DIR/db_$DATE.sql.gz" ]; then
    DB_SIZE=$(du -h "$BACKUP_DIR/db_$DATE.sql.gz" | cut -f1)
    print_success "Database backup completed: db_$DATE.sql.gz ($DB_SIZE)"
else
    print_error "Database backup failed!"
    exit 1
fi

# Backup application files
print_info "Backing up application files..."

# Get project root (assuming script is in scripts/ directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=logs \
    --exclude=.git \
    --exclude='*.log' \
    -C "$PROJECT_ROOT" .

if [ -f "$BACKUP_DIR/files_$DATE.tar.gz" ]; then
    FILES_SIZE=$(du -h "$BACKUP_DIR/files_$DATE.tar.gz" | cut -f1)
    print_success "Files backup completed: files_$DATE.tar.gz ($FILES_SIZE)"
else
    print_error "Files backup failed!"
    exit 1
fi

# Cleanup old backups
print_info "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "files_*.tar.gz" -mtime +$RETENTION_DAYS -delete
print_success "Old backups cleaned up"

# Summary
echo ""
print_success "Backup completed successfully! 🎉"
echo ""
echo "Backup files:"
echo "  - Database: $BACKUP_DIR/db_$DATE.sql.gz"
echo "  - Files: $BACKUP_DIR/files_$DATE.tar.gz"
echo ""
echo "To restore database:"
echo "  gunzip < $BACKUP_DIR/db_$DATE.sql.gz | mysql -u $DB_USER -p $DB_NAME"
echo ""
echo "To restore files:"
echo "  tar -xzf $BACKUP_DIR/files_$DATE.tar.gz -C /path/to/restore"

