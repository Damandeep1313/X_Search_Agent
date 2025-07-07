# Use the official Node.js LTS base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your app
COPY . .

# Expose the port your Express app listens on
EXPOSE 3000

# Start the server
CMD ["node", "index.js"]
