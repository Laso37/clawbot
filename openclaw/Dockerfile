FROM node:22-slim

# Install system dependencies needed by OpenClaw
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    python3 \
    python3-pip \
    build-essential \
    ca-certificates \
    curl \
    gcc \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Go (needed to build wacli)
ENV GOLANG_VERSION=1.23.6
RUN curl -fsSL "https://go.dev/dl/go${GOLANG_VERSION}.linux-amd64.tar.gz" \
    | tar -C /usr/local -xz
ENV PATH="/usr/local/go/bin:/root/go/bin:${PATH}"

# Build wacli from source (WhatsApp CLI — no pre-built Linux binaries)
RUN CGO_ENABLED=1 go install -tags sqlite_fts5 \
    github.com/steipete/wacli/cmd/wacli@latest \
    && cp /root/go/bin/wacli /usr/local/bin/wacli \
    && rm -rf /root/go /root/.cache/go-build

# Install agent-browser CLI (browser automation — Playwright-based)
RUN npm install -g agent-browser

# Install markitdown (document-to-markdown converter)
RUN python3 -m pip install --break-system-packages markitdown

# Install OpenClaw globally
RUN npm install -g openclaw@latest

# Create non-root user directories
RUN mkdir -p /home/node/.openclaw/workspace && \
    chown -R node:node /home/node

USER node
WORKDIR /home/node

EXPOSE 18789 18790

CMD ["openclaw", "gateway", "--bind", "lan", "--port", "18789"]
