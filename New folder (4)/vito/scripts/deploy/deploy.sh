#!/bin/bash
# OLYMPUS 3.0 - Deployment Script
# Usage: ./deploy.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
REGISTRY="ghcr.io"
IMAGE_NAME="olympus/olympus-2.0"
COMPOSE_FILE="docker-compose.yml"

echo "==================================="
echo "OLYMPUS 3.0 Deployment"
echo "Environment: $ENVIRONMENT"
echo "==================================="

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo "Error: Environment must be 'staging' or 'production'"
    exit 1
fi

# Load environment-specific config
if [ -f ".env.$ENVIRONMENT" ]; then
    export $(cat ".env.$ENVIRONMENT" | grep -v '^#' | xargs)
    echo "Loaded .env.$ENVIRONMENT"
else
    echo "Warning: .env.$ENVIRONMENT not found"
fi

# Pull latest images
echo "Pulling latest images..."
docker compose -f $COMPOSE_FILE pull

# Stop existing containers
echo "Stopping existing containers..."
docker compose -f $COMPOSE_FILE down --remove-orphans

# Start new containers
echo "Starting new containers..."
if [ "$ENVIRONMENT" = "production" ]; then
    docker compose -f $COMPOSE_FILE up -d --scale app=2
else
    docker compose -f $COMPOSE_FILE up -d
fi

# Wait for health checks
echo "Waiting for health checks..."
sleep 10

# Check container status
echo "Container status:"
docker compose -f $COMPOSE_FILE ps

# Run database migrations (if any)
if [ -f "scripts/migrate.sh" ]; then
    echo "Running migrations..."
    ./scripts/migrate.sh
fi

echo "==================================="
echo "Deployment complete!"
echo "==================================="

# Show logs
echo "Recent logs:"
docker compose -f $COMPOSE_FILE logs --tail=20 app
