#!/bin/bash
# Docker development environment helper script

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

case "${1:-}" in
    "up"|"start")
        echo -e "${BLUE}🐳 Starting Docker containers...${NC}"
        cd docker
        docker-compose up -d db redis
        echo -e "${GREEN}✅ Database and Redis started${NC}"
        echo ""
        echo -e "${YELLOW}PostgreSQL:${NC} localhost:5432"
        echo -e "${YELLOW}Redis:${NC}        localhost:6379"
        echo ""
        echo -e "${BLUE}To start the API run:${NC}"
        echo "  cd apps/api"
        echo "  source .venv/bin/activate"
        echo "  fastapi dev src/prosell/infrastructure/api/main.py --reload"
        ;;

    "up-all"|"start-all")
        echo -e "${BLUE}🐳 Starting ALL Docker containers...${NC}"
        cd docker
        docker-compose up -d
        echo -e "${GREEN}✅ All services started${NC}"
        echo ""
        echo -e "${YELLOW}API:${NC}  http://localhost:8000"
        echo -e "${YELLOW}Docs:${NC} http://localhost:8000/docs"
        echo -e "${YELLOW}Web:${NC}  http://localhost:3000"
        ;;

    "down"|"stop")
        echo -e "${BLUE}🛑 Stopping Docker containers...${NC}"
        cd docker
        docker-compose down
        echo -e "${GREEN}✅ Containers stopped${NC}"
        ;;

    "logs")
        cd docker
        docker-compose logs -f "${2:-}"
        ;;

    "ps")
        cd docker
        docker-compose ps
        ;;

    "db"|"psql")
        echo -e "${BLUE}🔌 Connecting to PostgreSQL...${NC}"
        docker exec -it prosell-db psql -U postgres -d prosell_dev
        ;;

    "redis"|"redis-cli")
        echo -e "${BLUE}🔌 Connecting to Redis...${NC}"
        docker exec -it prosell-redis redis-cli
        ;;

    "init-db")
        echo -e "${BLUE}🔧 Initializing database...${NC}"
        cd apps/api
        source .venv/bin/activate
        python ../../scripts/init-db.py
        ;;

    "clean")
        echo -e "${YELLOW}⚠️  This will remove all containers and volumes!${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            cd docker
            docker-compose down -v
            echo -e "${GREEN}✅ Cleaned up${NC}"
        else
            echo "Aborted"
        fi
        ;;

    *)
        echo "ProSell SaaS - Docker Development Helper"
        echo ""
        echo "Usage: ./scripts/docker-dev.sh [command]"
        echo ""
        echo "Commands:"
        echo "  up, start       Start database and Redis only"
        echo "  up-all          Start all services (API, Web, DB, Redis)"
        echo "  down, stop      Stop all containers"
        echo "  logs [service]  Show logs (optional service name)"
        echo "  ps              Show running containers"
        echo "  db, psql        Connect to PostgreSQL"
        echo "  redis, redis-cli Connect to Redis"
        echo "  init-db         Initialize database schema and seed data"
        echo "  clean           Remove all containers and volumes (WARNING: destructive)"
        echo ""
        echo "Examples:"
        echo "  ./scripts/docker-dev.sh up          # Start DB and Redis"
        echo "  ./scripts/docker-dev.sh logs api    # Show API logs"
        echo "  ./scripts/docker-dev.sh db          # Open PostgreSQL shell"
        ;;
esac
