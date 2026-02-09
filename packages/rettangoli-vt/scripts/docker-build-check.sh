#!/bin/bash
# Quick check script to verify Docker image builds correctly
# This is useful for CI/CD or local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Docker Build Check${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}Error: Docker daemon is not running${NC}"
    exit 1
fi

# Find monorepo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VT_PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
MONOREPO_ROOT="$(dirname "$VT_PACKAGE_DIR")"

# Check for monorepo root
if [ ! -f "$MONOREPO_ROOT/bun.lock" ]; then
    echo -e "${RED}Error: Could not find monorepo root with bun.lock${NC}"
    exit 1
fi

echo "Monorepo root: $MONOREPO_ROOT"
echo "VT package: $VT_PACKAGE_DIR"
echo ""

# Build the Docker image
IMAGE_NAME="rtgl-local-test:latest"

echo -e "${YELLOW}Building Docker image: $IMAGE_NAME${NC}"
echo ""

docker build \
  -t "$IMAGE_NAME" \
  -f "$MONOREPO_ROOT/packages/rettangoli-vt/docker/Dockerfile.test" \
  --progress=plain \
  "$MONOREPO_ROOT"

echo ""
echo -e "${GREEN}✓ Docker image built successfully${NC}"
echo ""
echo -e "${YELLOW}Testing rtgl command in container...${NC}"

# Test the image by running a simple command
docker run --rm "$IMAGE_NAME" rtgl --version

echo ""
echo -e "${GREEN}✓ rtgl command works in container${NC}"
echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Docker build check passed!${NC}"
echo -e "${GREEN}==================================${NC}"
