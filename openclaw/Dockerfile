FROM node:22-slim

# Install system dependencies needed by OpenClaw
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    python3 \
    build-essential \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install OpenClaw globally
RUN npm install -g openclaw@latest

# Create non-root user directories
RUN mkdir -p /home/node/.openclaw/workspace && \
    chown -R node:node /home/node

USER node
WORKDIR /home/node

EXPOSE 18789 18790

CMD ["openclaw", "gateway", "--bind", "lan", "--port", "18789"]
