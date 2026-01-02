#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="playwright-v1.57.0-rtgl-v0.0.36"
REGISTRY="${REGISTRY:-docker.io}"
REPO="${REPO:-han4wluc/rtgl}"

FULL_TAG="$REGISTRY/$REPO:$IMAGE_NAME"

docker build -t "$IMAGE_NAME" "$SCRIPT_DIR"
echo "Built image: $IMAGE_NAME"

docker tag "$IMAGE_NAME" "$FULL_TAG"
docker push "$FULL_TAG"
echo "Pushed: $FULL_TAG"
