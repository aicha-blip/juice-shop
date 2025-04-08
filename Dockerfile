# Stage 1: Build and prepare app
FROM node:20-buster AS builder

# Install build tools
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Configure node-gyp
RUN mkdir -p /root/.cache/node-gyp/20.15.0
ENV npm_config_build_from_source=false

# Force HTTPS for GitHub
RUN git config --global url."https://github.com/".insteadOf "git@github.com:" && \
    git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"

WORKDIR /juice-shop
COPY package*.json ./

# Install global tools
RUN NODE_OPTIONS="--max-old-space-size=4096" npm install -g typescript ts-node

# Install project dependencies
RUN NODE_OPTIONS="--max-old-space-size=4096" npm install --omit=dev --unsafe-perm

# Copy rest of the app
COPY . .

# Dedupe packages
RUN npm dedupe --omit=dev

# Cleanup frontend junk
RUN rm -rf frontend/node_modules frontend/.angular frontend/src/assets

# Create logs dir
RUN mkdir logs

# Fix permissions
RUN chown -R 65532:0 logs ftp/ frontend/dist/ data/ i18n/
RUN chmod -R g=u ftp/ frontend/dist/ logs/ data/ i18n/

# Remove optional files
RUN rm -f data/chatbot/botDefaultTrainingData.json ftp/legal.md i18n/*.json

# Generate SBOM
ARG CYCLONEDX_NPM_VERSION=3.10.0
RUN npm install -g @cyclonedx/cyclonedx-npm@$CYCLONEDX_NPM_VERSION
RUN npm run sbom

# Rebuild libxmljs inside same stage
RUN rm -rf node_modules/libxmljs/build && \
    cd node_modules/libxmljs && \
    npm run build

# Stage 2: Distroless runtime
FROM gcr.io/distroless/nodejs20-debian11:latest

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
COPY --from=builder --chown=65532:0 /juice-shop .

USER 65532
EXPOSE 3000
CMD ["/juice-shop/build/app.js"]
