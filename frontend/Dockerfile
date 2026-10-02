# Stage 1: Build the React application
FROM node:22-alpine AS build

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci || npm install

# Copy application source code
COPY . .

# Build production bundle with TypeScript check
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine AS runtime

# Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
