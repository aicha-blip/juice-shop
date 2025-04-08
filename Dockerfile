# Use a Node.js image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Now copy the entire project (including frontend/)
COPY . .

# Run build commands
RUN npm run build

# -- Production Image --

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy built app from builder
COPY --from=builder /app .

# Install only production dependencies
RUN npm install --only=production --legacy-peer-deps

# Expose the application port (change if necessary)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
