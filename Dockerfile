FROM node:18-slim

# Install pentesting tools FIRST
USER root
RUN apt-get update && \
    apt-get install -y \
      nmap \
      nikto \
      curl \
      wget \
      jq \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# FIXED: Use npm install (not ci)
RUN npm install --production --no-optional && npm cache clean --force

# Copy app
COPY . .

# Expose port
EXPOSE $PORT

# Healthcheck
HEALTHCHECK --interval=30s CMD curl -f http://localhost:$PORT/health || exit 1

CMD ["npm", "start"]
