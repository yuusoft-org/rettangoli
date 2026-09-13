#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
read -r RTGL_VERSION VT_VERSION PLAYWRIGHT_VERSION < <(node "$SCRIPT_DIR/release-versions.mjs")
IMAGE_NAME="playwright-v${PLAYWRIGHT_VERSION}-rtgl-v${RTGL_VERSION}"
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
  --build-arg "RTGL_VERSION=$RTGL_VERSION" \
  --build-arg "VT_VERSION=$VT_VERSION" \
  --build-arg "PLAYWRIGHT_VERSION=$PLAYWRIGHT_VERSION" \
  -t "$FULL_TAG" \
  --push \
  "$SCRIPT_DIR"

echo "Built and pushed multi-platform image: $FULL_TAG"
