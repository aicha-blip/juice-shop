# Stage 1: Install dependencies and build
FROM node:20-buster AS installer

# Install build tools (with DNS fix)
RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf && \
    apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Configure node-gyp
RUN mkdir -p /root/.cache/node-gyp/20.15.0
ENV npm_config_build_from_source=false

# Force HTTPS for GitHub
RUN git config --global url."https://github.com/".insteadOf "git@github.com:" && \
    git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"

COPY . /juice-shop
WORKDIR /juice-shop

# Install with increased memory limit
RUN NODE_OPTIONS="--max-old-space-size=4096" npm i -g typescript ts-node && \
    NODE_OPTIONS="--max-old-space-size=4096" npm install --omit=dev --unsafe-perm && \
    npm dedupe --omit=dev

# Cleanup - MOVED INTO RUN INSTRUCTION
RUN rm -rf frontend/node_modules frontend/.angular frontend/src/assets && \
    mkdir logs && \
    chown -R 65532:0 logs ftp/ frontend/dist/ data/ i18n/ && \
    chmod -R g=u ftp/ frontend/dist/ logs/ data/ i18n/ && \
    rm -f data/chatbot/botDefaultTrainingData.json ftp/legal.md i18n/*.json

# Generate SBOM
ARG CYCLONEDX_NPM_VERSION=latest
RUN npm install -g @cyclonedx/cyclonedx-npm@$CYCLONEDX_NPM_VERSION && \
    npm run sbom

# Stage 2: Rebuild libxmljs
FROM node:20-buster AS libxmljs-builder

# Install build tools (with DNS fix)
RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf && \
    apt-get update && \
    apt-get install -y python3 gcc g++ make && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /juice-shop
COPY --from=installer /juice-shop/node_modules ./node_modules
RUN rm -rf node_modules/libxmljs/build && \
    cd node_modules/libxmljs && \
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
COPY --from=installer --chown=65532:0 /juice-shop .
COPY --chown=65532:0 --from=libxmljs-builder /juice-shop/node_modules/libxmljs ./node_modules/libxmljs

# Health check
COPY --chown=65532:0 healthcheck.js .

USER 65532
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD ["node", "/juice-shop/healthcheck.js"]
CMD ["build/server.js"]
