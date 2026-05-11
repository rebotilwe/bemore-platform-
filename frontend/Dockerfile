FROM node:20-alpine

WORKDIR /app

# Install deps first so the layer caches when only source changes
COPY package*.json ./
RUN npm ci

# Copy app source
COPY . .

EXPOSE 3001

# --host 0.0.0.0 so the dev server is reachable from outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3001"]
