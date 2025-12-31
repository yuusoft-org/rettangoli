FROM mcr.microsoft.com/playwright:v1.57.0-noble

# Install dependencies for Bun
RUN apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v1.1.42"
ENV PATH="/root/.bun/bin:${PATH}"

# Install rtgl globally
RUN bun install -g rtgl@0.0.36
