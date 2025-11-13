#!/bin/bash

# OrangePrivacy MySQL Setup Script
# This script helps you set up MySQL for local development

set -e

echo "========================================="
echo "OrangePrivacy MySQL Setup"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if MySQL is installed
check_mysql() {
    echo "Checking MySQL installation..."
    if command -v mysql &> /dev/null; then
        echo -e "${GREEN}✓${NC} MySQL client found"
        mysql --version
        return 0
    else
        echo -e "${RED}✗${NC} MySQL client not found"
        return 1
    fi
}

# Check if MySQL server is running
check_mysql_server() {
    echo ""
    echo "Checking MySQL server status..."
    if mysql -u root -proot -e "SELECT 1;" &> /dev/null; then
        echo -e "${GREEN}✓${NC} MySQL server is running and accessible with password 'root'"
        return 0
    elif mysql -u root -e "SELECT 1;" &> /dev/null; then
        echo -e "${YELLOW}!${NC} MySQL server is running but password is blank"
        echo "Please update DB_PASSWORD= (blank) in .env file"
        return 0
    elif mysql -u root -ppassword -e "SELECT 1;" &> /dev/null; then
        echo -e "${YELLOW}!${NC} MySQL server is running with password 'password'"
        echo "Please update DB_PASSWORD=password in .env file"
        return 0
    else
        echo -e "${RED}✗${NC} Cannot connect to MySQL server"
        return 1
    fi
}

# Install MySQL
install_mysql() {
    echo ""
    echo "Would you like to install MySQL? (requires sudo)"
    echo "1) Yes, install MySQL"
    echo "2) No, I'll install it manually"
    read -p "Enter choice [1-2]: " choice

    case $choice in
        1)
            echo "Installing MySQL..."
            if [ -f /etc/debian_version ]; then
                # Debian/Ubuntu
                sudo apt update
                sudo apt install -y mysql-server
            elif [ -f /etc/redhat-release ]; then
                # RedHat/CentOS
                sudo yum install -y mysql-server
            else
                echo -e "${RED}Unsupported OS. Please install MySQL manually.${NC}"
                exit 1
            fi

            echo "Starting MySQL service..."
            sudo systemctl start mysql || sudo service mysql start
            sudo systemctl enable mysql || true
            ;;
        2)
            echo ""
            echo "Please install MySQL manually:"
            echo "  Ubuntu/Debian: sudo apt install mysql-server"
            echo "  RedHat/CentOS: sudo yum install mysql-server"
            echo "  macOS: brew install mysql"
            echo ""
            echo "Then run this script again."
            exit 0
            ;;
        *)
            echo "Invalid choice"
            exit 1
            ;;
    esac
}

# Create database
create_database() {
    echo ""
    echo "Creating database 'orangeprivacy_dev'..."

    # Try different password combinations
    if mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS orangeprivacy_dev;" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Database created successfully with password 'root'"
        echo "DB_PASSWORD=root" > .env.db.tmp
    elif mysql -u root -e "CREATE DATABASE IF NOT EXISTS orangeprivacy_dev;" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Database created successfully with blank password"
        echo "DB_PASSWORD=" > .env.db.tmp
    elif mysql -u root -ppassword -e "CREATE DATABASE IF NOT EXISTS orangeprivacy_dev;" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Database created successfully with password 'password'"
        echo "DB_PASSWORD=password" > .env.db.tmp
    else
        echo -e "${RED}✗${NC} Failed to create database"
        echo "Please enter your MySQL root password manually:"
        read -s MYSQL_PASSWORD
        if mysql -u root -p"$MYSQL_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS orangeprivacy_dev;"; then
            echo -e "${GREEN}✓${NC} Database created successfully"
            echo "DB_PASSWORD=$MYSQL_PASSWORD" > .env.db.tmp
        else
            echo -e "${RED}✗${NC} Failed to create database with provided password"
            exit 1
        fi
    fi

    if [ -f .env.db.tmp ]; then
        PASSWORD=$(cat .env.db.tmp | cut -d'=' -f2)
        rm .env.db.tmp

        # Update .env file
        if [ -f .env ]; then
            sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$PASSWORD/" .env
            echo -e "${GREEN}✓${NC} Updated .env file with correct password"
        fi
    fi
}

# Verify database connection
verify_connection() {
    echo ""
    echo "Verifying database connection..."

    # Source .env to get password
    if [ -f .env ]; then
        export $(grep -v '^#' .env | grep DB_PASSWORD | xargs)
    fi

    if mysql -u root -p"$DB_PASSWORD" -e "USE orangeprivacy_dev; SELECT 'Connection successful!' as status;" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Database connection verified!"
        return 0
    else
        echo -e "${RED}✗${NC} Database connection failed"
        return 1
    fi
}

# Main execution
main() {
    cd "$(dirname "$0")"

    if ! check_mysql; then
        install_mysql
    fi

    if ! check_mysql_server; then
        echo ""
        echo -e "${YELLOW}MySQL server is not running or not accessible.${NC}"
        echo "Please start MySQL server:"
        echo "  sudo systemctl start mysql"
        echo "  or"
        echo "  sudo service mysql start"
        echo ""
        exit 1
    fi

    create_database
    verify_connection

    echo ""
    echo "========================================="
    echo -e "${GREEN}MySQL setup complete!${NC}"
    echo "========================================="
    echo ""
    echo "Next steps:"
    echo "  1. Install dependencies: npm install"
    echo "  2. Run migrations: npm run migrate"
    echo "  3. Start server: npm run dev"
    echo ""
}

main
