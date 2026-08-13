FROM mcr.microsoft.com/playwright:v1.61.1-noble
RUN apt-get update && apt-get install -y default-jre && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npx", "playwright", "test"]