#!/bin/bash
# Alembic Migration Helper Script for ProSell SaaS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Activate virtual environment
if [ -f "$PROJECT_ROOT/.venv/bin/activate" ]; then
    source "$PROJECT_ROOT/.venv/bin/activate"
fi

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show help
show_help() {
    cat << 'HELP'
Alembic Migration Helper - ProSell SaaS

Usage: ./alembic-migrations.sh [COMMAND]

Commands:
    status      Show current migration status
    upgrade     Apply all pending migrations
    downgrade   Revert the last migration
    create      Create a new migration (autogenerate)
    revision    Create a blank migration
    history     Show migration history
    stamp       Mark database as up-to-date without running migrations
    reset       Drop all tables and reapply migrations (DEV ONLY!)

Examples:
    ./alembic-migrations.sh status
    ./alembic-migrations.sh upgrade
    ./alembic-migrations.sh create "Add user preferences"
    ./alembic-migrations.sh reset

HELP
}

# Main command dispatcher
case "${1:-}" in
    status)
        print_info "Migration status:"
        alembic current
        echo ""
        print_info "Pending migrations:"
        alembic history
        ;;
    upgrade)
        print_info "Applying migrations..."
        alembic upgrade head
        print_success "Migrations applied successfully!"
        ;;
    downgrade)
        print_info "Downgrading migration..."
        alembic downgrade -1
        print_success "Migration downgraded successfully!"
        ;;
    create)
        if [ -z "${2:-}" ]; then
            print_error "Please provide a migration message"
            echo "Usage: ./alembic-migrations.sh create 'Your message here'"
            exit 1
        fi
        print_info "Creating new migration: $2"
        alembic revision --autogenerate -m "$2"
        print_success "Migration created! Review it before applying."
        ;;
    revision)
        if [ -z "${2:-}" ]; then
            print_error "Please provide a migration message"
            echo "Usage: ./alembic-migrations.sh revision 'Your message here'"
            exit 1
        fi
        print_info "Creating blank migration: $2"
        alembic revision -m "$2"
        print_success "Blank migration created!"
        ;;
    history)
        print_info "Migration history:"
        alembic history
        ;;
    stamp)
        print_warning "Stamping database as current (no migrations will run)"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            alembic stamp head
            print_success "Database stamped as current!"
        else
            print_info "Operation cancelled"
        fi
        ;;
    reset)
        print_warning "This will DROP ALL TABLES and reapply migrations!"
        read -p "Are you sure? Type 'DESTROY' to confirm: " confirm
        if [ "$confirm" = "DESTROY" ]; then
            print_info "Dropping all tables..."
            alembic downgrade base
            print_info "Applying migrations..."
            alembic upgrade head
            print_success "Database reset complete!"
        else
            print_info "Operation cancelled"
        fi
        ;;
    *)
        show_help
        ;;
esac
