FROM node:20-alpine

WORKDIR /app

# Install deps first so the layer caches when only source changes
COPY package*.json ./
RUN npm ci

# Copy app source
COPY . .

# Local-dev upload dir — overridden by mounted volume in compose
RUN mkdir -p /app/uploads

EXPOSE 5000

CMD ["npm", "run", "dev"]
