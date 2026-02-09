#!/bin/bash
# Full local Docker E2E test runner.
# Builds the Docker image, then runs all Docker E2E tests.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Rettangoli VT Docker E2E Test${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}Error: Docker daemon is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
fi

echo -e "${GREEN}✓ Docker daemon is running${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ] || ! grep -q "@rettangoli/vt" "package.json"; then
    echo -e "${RED}Error: Please run this script from the rettangoli-vt package directory${NC}"
    exit 1
fi

echo -e "${GREEN}✓ In correct directory${NC}"
echo ""

# Find monorepo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VT_PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
MONOREPO_ROOT="$(dirname "$(dirname "$VT_PACKAGE_DIR")")"

if [ ! -d "$MONOREPO_ROOT/packages/rettangoli-vt" ]; then
    echo -e "${RED}Error: Could not find monorepo root${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Monorepo root: $MONOREPO_ROOT${NC}"
echo ""

# Build Docker image first
IMAGE_NAME="rtgl-local-test:latest"
echo -e "${YELLOW}Step 1: Building Docker image: $IMAGE_NAME${NC}"
echo ""

docker build \
  -t "$IMAGE_NAME" \
  -f "$MONOREPO_ROOT/packages/rettangoli-vt/docker/Dockerfile.test" \
  "$MONOREPO_ROOT"

echo ""
echo -e "${GREEN}✓ Docker image built successfully${NC}"
echo ""

# Verify the image works
echo -e "${YELLOW}Step 2: Verifying rtgl command in container...${NC}"
docker run --rm "$IMAGE_NAME" rtgl --version
echo -e "${GREEN}✓ rtgl command works in container${NC}"
echo ""

# Run Docker E2E tests
echo -e "${YELLOW}Step 3: Running E2E scenarios...${NC}"
echo ""

cd "$VT_PACKAGE_DIR"
node e2e/run.js

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}E2E tests completed!${NC}"
echo -e "${GREEN}==================================${NC}"
