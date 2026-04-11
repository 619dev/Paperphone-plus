#!/bin/bash
# Build and push Docker images for PaperPhone Plus
set -e

TAG=${TAG:-"latest"}

echo "🔨 Building server image..."
docker build -t facilisvelox/paperphone-plus-server:${TAG} ./server

echo "🔨 Building client image..."
docker build -t facilisvelox/paperphone-plus-client:${TAG} ./client

echo "📤 Pushing server image..."
docker push facilisvelox/paperphone-plus-server:${TAG}

echo "📤 Pushing client image..."
docker push facilisvelox/paperphone-plus-client:${TAG}

echo "✅ Done! Images pushed:"
echo "  - facilisvelox/paperphone-plus-server:${TAG}"
echo "  - facilisvelox/paperphone-plus-client:${TAG}"
