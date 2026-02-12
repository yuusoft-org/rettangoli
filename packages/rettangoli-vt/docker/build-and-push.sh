#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="playwright-v1.57.0-rtgl-v1.0.0-rc13"
REGISTRY="${REGISTRY:-docker.io}"
REPO="${REPO:-han4wluc/rtgl}"
BUILDER_NAME="multiplatform-builder"

FULL_TAG="$REGISTRY/$REPO:$IMAGE_NAME"

# Create builder if it doesn't exist
if ! docker buildx inspect "$BUILDER_NAME" >/dev/null 2>&1; then
  echo "Creating multi-platform builder..."
  docker buildx create --name "$BUILDER_NAME" --driver docker-container --use
else
  docker buildx use "$BUILDER_NAME"
fi

# Build and push multi-platform image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t "$FULL_TAG" \
  --push \
  "$SCRIPT_DIR"

echo "Built and pushed multi-platform image: $FULL_TAG"
