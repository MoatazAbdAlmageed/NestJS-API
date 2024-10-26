# Stop all containers
docker-compose down

# Remove volumes and build cache
docker-compose down -v
docker system prune -f

# Rebuild and start
docker-compose up --build