# First stage: Install dependencies and build the app
FROM node:20-buster as installer

# Install git
RUN apt-get update && apt-get install -y git

# Copy application files
COPY . /juice-shop
WORKDIR /juice-shop

# Install TypeScript and ts-node globally
RUN npm i -g typescript ts-node

# Install dependencies
RUN npm install --omit=dev --unsafe-perm

# Deduplicate dependencies
RUN npm dedupe --omit=dev

# Clean up unnecessary files
RUN rm -rf frontend/node_modules
RUN rm -rf frontend/.angular
RUN rm -rf frontend/src/assets

# Prepare logs directory
RUN mkdir logs
RUN chown -R 65532 logs

# Set correct permissions for the directories
RUN chgrp -R 0 ftp/ frontend/dist/ logs/ data/ i18n/
RUN chmod -R g=u ftp/ frontend/dist/ logs/ data/ i18n/

# Clean up unnecessary files
RUN rm data/chatbot/botDefaultTrainingData.json || true
RUN rm ftp/legal.md || true
RUN rm i18n/*.json || true

# Install CycloneDX npm package
ARG CYCLONEDX_NPM_VERSION=latest
RUN npm install -g @cyclonedx/cyclonedx-npm@$CYCLONEDX_NPM_VERSION
RUN npm run sbom

# Second stage: Workaround for libxmljs startup error
FROM node:20-buster as libxmljs-builder
WORKDIR /juice-shop

# Install build dependencies for libxmljs
RUN apt-get update && apt-get install -y build-essential python3

# Copy node_modules from installer stage
COPY --from=installer /juice-shop/node_modules ./node_modules

# Build libxmljs module
RUN rm -rf node_modules/libxmljs/build && \
  cd node_modules/libxmljs && \
  npm run build

# Final stage: Set up the minimal runtime environment
FROM gcr.io/distroless/nodejs20-debian11

# Build metadata
ARG BUILD_DATE
ARG VCS_REF
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

# Set working directory
WORKDIR /juice-shop

# Copy files from installer and libxmljs-builder stages
COPY --from=installer --chown=65532:0 /juice-shop .
COPY --chown=65532:0 --from=libxmljs-builder /juice-shop/node_modules/libxmljs ./node_modules/libxmljs

# Set non-root user
USER 65532

# Expose port for the app
EXPOSE 3000

# Start the application
CMD ["/juice-shop/build/app.js"]
