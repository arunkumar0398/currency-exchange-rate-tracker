FROM node:18-alpine

WORKDIR /app

# Copy only backend files
COPY backend/ ./

# Install production dependencies
RUN npm install --production

# Expose the port Railway will assign via $PORT (default 3001 locally)
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
