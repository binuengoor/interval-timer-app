# Use an official lightweight Node image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy backend server script
COPY server.js .

# Copy frontend static files
COPY public/ ./public/

# Create data directory (which can be mounted as a volume)
RUN mkdir -p /app/data

# Expose port 80
EXPOSE 80

# Start the server
CMD ["npm", "start"]