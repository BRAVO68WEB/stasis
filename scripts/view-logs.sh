#!/bin/bash
# view-logs.sh - View Stasis AIO container logs
# Usage: ./view-logs.sh [service] [options]

set -e

CONTAINER_NAME="stasis-aio-test"
LOG_DIR="/var/log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_help() {
    echo -e "${GREEN}Stasis AIO Log Viewer${NC}"
    echo ""
    echo "Usage: $0 [service] [options]"
    echo ""
    echo "Services:"
    echo "  api         - API server logs"
    echo "  web         - Web frontend logs"
    echo "  nginx       - Nginx access/error logs"
    echo "  supervisord - Process manager logs"
    echo "  all         - All logs (tail)"
    echo ""
    echo "Options:"
    echo "  -f, --follow    Follow log output"
    echo "  -n, --lines N   Show last N lines (default: 50)"
    echo "  -e, --errors    Show error logs only"
    echo "  -h, --help      Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 api              # Show last 50 lines of API logs"
    echo "  $0 api -f           # Follow API logs"
    echo "  $0 api -n 100       # Show last 100 lines"
    echo "  $0 api -e           # Show API errors only"
    echo "  $0 all -f           # Follow all logs"
}

check_container() {
    if ! docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        echo -e "${RED}Error: Container $CONTAINER_NAME is not running${NC}"
        echo "Start it with: docker compose -f docker-compose.aio-test.yml up -d"
        exit 1
    fi
}

show_api_logs() {
    local follow=$1
    local lines=$2
    local errors=$3
    
    if [ "$errors" = "true" ]; then
        echo -e "${BLUE}=== API Error Logs ===${NC}"
        docker exec $CONTAINER_NAME tail -${lines} ${LOG_DIR}/stasis/api-error.log
    else
        echo -e "${BLUE}=== API Logs ===${NC}"
        if [ "$follow" = "true" ]; then
            docker exec -it $CONTAINER_NAME tail -f ${LOG_DIR}/stasis/api.log
        else
            docker exec $CONTAINER_NAME tail -${lines} ${LOG_DIR}/stasis/api.log
        fi
    fi
}

show_web_logs() {
    local follow=$1
    local lines=$2
    local errors=$3
    
    if [ "$errors" = "true" ]; then
        echo -e "${BLUE}=== Web Error Logs ===${NC}"
        docker exec $CONTAINER_NAME tail -${lines} ${LOG_DIR}/stasis/web-error.log
    else
        echo -e "${BLUE}=== Web Logs ===${NC}"
        if [ "$follow" = "true" ]; then
            docker exec -it $CONTAINER_NAME tail -f ${LOG_DIR}/stasis/web.log
        else
            docker exec $CONTAINER_NAME tail -${lines} ${LOG_DIR}/stasis/web.log
        fi
    fi
}

show_nginx_logs() {
    local follow=$1
    local lines=$2
    local errors=$3
    
    if [ "$errors" = "true" ]; then
        echo -e "${BLUE}=== Nginx Error Logs ===${NC}"
        docker exec $CONTAINER_NAME tail -${lines} ${LOG_DIR}/nginx/error.log
    else
        echo -e "${BLUE}=== Nginx Access Logs ===${NC}"
        if [ "$follow" = "true" ]; then
            docker exec -it $CONTAINER_NAME tail -f ${LOG_DIR}/nginx/access.log
        else
            docker exec $CONTAINER_NAME tail -${lines} ${LOG_DIR}/nginx/access.log
        fi
    fi
}

show_supervisord_logs() {
    local follow=$1
    local lines=$2
    
    echo -e "${BLUE}=== Supervisord Logs ===${NC}"
    if [ "$follow" = "true" ]; then
        docker exec -it $CONTAINER_NAME tail -f ${LOG_DIR}/supervisord/supervisord.log
    else
        docker exec $CONTAINER_NAME tail -${lines} ${LOG_DIR}/supervisord/supervisord.log
    fi
}

show_all_logs() {
    local follow=$1
    local lines=$2
    
    echo -e "${BLUE}=== All Logs (last $lines lines each) ===${NC}"
    echo -e "${YELLOW}--- API Logs ---${NC}"
    docker exec $CONTAINER_NAME tail -${lines} ${LOG_DIR}/stasis/api.log
    echo -e "\n${YELLOW}--- Web Logs ---${NC}"
    docker exec $CONTAINER_NAME tail -${lines} ${LOG_DIR}/stasis/web.log
    echo -e "\n${YELLOW}--- Nginx Access Logs ---${NC}"
    docker exec $CONTAINER_NAME tail -${lines} ${LOG_DIR}/nginx/access.log
    echo -e "\n${YELLOW}--- Supervisord Logs ---${NC}"
    docker exec $CONTAINER_NAME tail -${lines} ${LOG_DIR}/supervisord/supervisord.log
    
    if [ "$follow" = "true" ]; then
        echo -e "\n${GREEN}Following all logs (Ctrl+C to stop)...${NC}"
        docker exec -it $CONTAINER_NAME tail -f \
            ${LOG_DIR}/stasis/api.log \
            ${LOG_DIR}/stasis/web.log \
            ${LOG_DIR}/nginx/access.log \
            ${LOG_DIR}/supervisord/supervisord.log
    fi
}

# Parse arguments
SERVICE=""
FOLLOW=false
LINES=50
ERRORS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        api|web|nginx|supervisord|all)
            SERVICE=$1
            shift
            ;;
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -n|--lines)
            LINES=$2
            shift 2
            ;;
        -e|--errors)
            ERRORS=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Default to showing help if no service specified
if [ -z "$SERVICE" ]; then
    show_help
    exit 0
fi

# Check if container is running
check_container

# Show logs based on service
case $SERVICE in
    api)
        show_api_logs $FOLLOW $LINES $ERRORS
        ;;
    web)
        show_web_logs $FOLLOW $LINES $ERRORS
        ;;
    nginx)
        show_nginx_logs $FOLLOW $LINES $ERRORS
        ;;
    supervisord)
        show_supervisord_logs $FOLLOW $LINES
        ;;
    all)
        show_all_logs $FOLLOW $LINES
        ;;
esac
