ARG PLAYWRIGHT_VERSION=1.57.0
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble

ARG PLAYWRIGHT_VERSION
ARG RTGL_VERSION=2.1.2
ARG VT_VERSION=1.1.0

# Install dependencies for Bun
RUN apt-get update && apt-get install -y unzip curl && rm -rf /var/lib/apt/lists/*

# Install Bun to system location directly (latest version)
RUN curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash

# Install rtgl globally
RUN bun install -g "rtgl@${RTGL_VERSION}"

# Copy bun global packages to /usr/local/lib/rtgl (accessible to all users)
RUN mkdir -p /usr/local/lib/rtgl && \
    cp -r /root/.bun/install/global /usr/local/lib/rtgl/ && \
    chmod -R a+rx /usr/local/lib/rtgl/

# Create wrapper script that uses copied packages
RUN echo "#!/bin/sh" > /usr/local/bin/rtgl && \
    echo "BUN_INSTALL_LOCKFILE=/usr/local/lib/rtgl/bun/install/cache/bun-install.lock" >> /usr/local/bin/rtgl && \
    echo "exec bun /usr/local/lib/rtgl/global/node_modules/rtgl/cli.js \"\$@\"" >> /usr/local/bin/rtgl && \
    chmod +x /usr/local/bin/rtgl

COPY verify-install.mjs /usr/local/lib/rtgl/verify-install.mjs
RUN node /usr/local/lib/rtgl/verify-install.mjs \
      /usr/local/lib/rtgl/global/node_modules/rtgl/cli.js \
      "$RTGL_VERSION" "$VT_VERSION" "$PLAYWRIGHT_VERSION" && \
    rtgl --version && rtgl vt --help

LABEL org.rettangoli.rtgl.version=$RTGL_VERSION \
      org.rettangoli.vt.version=$VT_VERSION \
      org.rettangoli.playwright.version=$PLAYWRIGHT_VERSION

# Default working directory for mounted projects
WORKDIR /workspace
