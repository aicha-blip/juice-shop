# Stage 1: Install dependencies and build
FROM node:20-buster AS installer

# Install build tools (without modifying resolv.conf)
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Configure node-gyp
RUN mkdir -p /root/.cache/node-gyp/20.15.0
ENV npm_config_build_from_source=false

# Force HTTPS for GitHub
RUN git config --global url."https://github.com/".insteadOf "git@github.com:" && \
    git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"

# Set workdir and copy package files first (for better caching)
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
ARG CYCLONEDX_NPM_VERSION=3.10.0   # <-- locked version
RUN npm install -g @cyclonedx/cyclonedx-npm@$CYCLONEDX_NPM_VERSION
RUN npm run sbom

# Stage 2: Rebuild libxmljs
FROM node:20-buster AS libxmljs-builder

# Install build tools
RUN apt-get update && \
    apt-get install -y build-essential python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /juice-shop
COPY --from=installer /juice-shop/node_modules ./node_modules
RUN rm -rf node_modules/libxmljs/build && \
    cd node_modules/libxmljs && \
    npm run build

# Stage 3: Final distroless image
FROM gcr.io/distroless/nodejs20-debian11@sha256:66b32a70e5d6a3d740673a8efbdc18135f706f93cbab74a3403c5d48ed089e3e

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
    org.opencontainers.image.source="https://github.com/juice-shop/juice-shop" \
    org.opencontainers.image.revision=$VCS_REF \
    org.opencontainers.image.created=$BUILD_DATE

WORKDIR /juice-shop
COPY --from=installer --chown=65532:0 /juice-shop . 
COPY --chown=65532:0 --from=libxmljs-builder /juice-shop/node_modules/libxmljs ./node_modules/libxmljs

USER 65532
EXPOSE 3000
CMD ["/juice-shop/build/app.js"]
