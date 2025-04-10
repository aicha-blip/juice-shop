# Stage 1: Install dependencies and build
FROM node:20-buster AS installer

# Install build tools with retry for flaky networks
RUN apt-get update && \
    apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Configure node-gyp and npm
RUN mkdir -p /root/.cache/node-gyp/20.15.0 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Force HTTPS for GitHub
RUN git config --global url."https://github.com/".insteadOf "git@github.com:" && \
    git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"

# Copy package files first for better layer caching
COPY package*.json ./
COPY tsconfig.json ./
COPY config/*.json ./config/

# Install production dependencies with retry logic
RUN NODE_OPTIONS="--max-old-space-size=4096" npm install --omit=dev --unsafe-perm && \
    npm dedupe --omit=dev

# Copy remaining files
COPY . .

# Build and cleanup
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build && \
    rm -rf \
    frontend/node_modules \
    frontend/.angular \
    frontend/src/assets \
    /root/.npm/_logs \
    /root/.cache \
    /tmp/* && \
    mkdir -p logs && \
    chown -R 65532:0 logs ftp/ frontend/dist/ data/ i18n/ && \
    chmod -R g=u ftp/ frontend/dist/ logs/ data/ i18n/

# Generate SBOM
ARG CYCLONEDX_NPM_VERSION=latest
RUN npm install -g @cyclonedx/cyclonedx-npm@${CYCLONEDX_NPM_VERSION} && \
    npm run sbom && \
    rm -rf /root/.npm/_logs

# Stage 2: Rebuild libxmljs
FROM node:20-buster AS libxmljs-builder

# Install build tools
RUN apt-get update && \
    apt-get install -y \
    python3 \
    gcc \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /juice-shop
COPY --from=installer /juice-shop/node_modules ./node_modules
RUN cd node_modules/libxmljs && \
    rm -rf build && \
    npm run build

# Stage 3: Final distroless image
FROM gcr.io/distroless/nodejs20-debian11

# Metadata
LABEL maintainer="Bjoern Kimminich <bjoern.kimminich@owasp.org>" \
    org.opencontainers.image.title="OWASP Juice Shop" \
    org.opencontainers.image.description="Probably the most modern and sophisticated insecure web application" \
    org.opencontainers.image.authors="Bjoern Kimminich <bjoern.kimminich@owasp.org>" \
    org.opencontainers.image.vendor="Open Worldwide Application Security Project" \
    org.opencontainers.image.documentation="https://help.owasp-juice.shop" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.version="17.2.0" \
    org.opencontainers.image.url="https://owasp-juice.shop" \
    org.opencontainers.image.source="https://github.com/juice-shop/juice-shop"

WORKDIR /juice-shop

# Copy application files
COPY --from=installer --chown=65532:0 /juice-shop .

# Copy rebuilt libxmljs
COPY --chown=65532:0 --from=libxmljs-builder /juice-shop/node_modules/libxmljs ./node_modules/libxmljs

# Health check configuration
COPY --chown=65532:0 healthcheck.js .
HEALTHCHECK --interval=15s \
            --timeout=5s \
            --start-period=60s \
            --retries=3 \
            CMD ["node", "/juice-shop/healthcheck.js"]

# Runtime configuration
USER 65532
EXPOSE 3000
ENV NODE_ENV=production \
    DB_OPTIONS="{\"waitForConnections\": true, \"connectionLimit\": 20, \"queueLimit\": 0}" \
    CONNECTION_TIMEOUT=30000

CMD ["build/server.js"]
