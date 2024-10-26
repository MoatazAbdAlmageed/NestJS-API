FROM node:18-bullseye

WORKDIR /usr/src/app

# Copy package files first to leverage Docker cache
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Clear any existing dist folder and build
RUN rm -rf dist && npm run build

EXPOSE 8080

# Set NODE_ENV to production
ENV NODE_ENV=production

CMD ["node", "dist/main"]
