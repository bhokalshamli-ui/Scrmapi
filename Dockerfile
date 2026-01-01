# Multi-stage build for smaller image
FROM node:18-alpine AS base

# Install pentesting tools in runtime stage
FROM base AS runtime

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S pentest -u 1001

# Install security tools
USER root
RUN apk update && apk add --no-cache \
    nmap \
    nmap-ncat \
    nikto \
    curl \
    bash \
    && rm -rf /var/cache/apk/*

# Switch back to non-root user
USER pentest

WORKDIR /app

# Copy package files first for better caching
COPY --chown=pentest:nodejs package*.json ./
RUN npm ci --only=production --no-optional && npm cache clean --force

# Copy source code
COPY --chown=pentest:nodejs . .

# Create data directory
RUN mkdir -p /data/scans && chown pentest:nodejs /data

# Expose port
EXPOSE 10000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:10000/health || exit 1

# Non-root runtime
USER pentest
CMD ["npm", "start"]
