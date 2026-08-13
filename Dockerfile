FROM mcr.microsoft.com/playwright:v1.61.1-noble
RUN apt-get update && apt-get install -y default-jre && rm -rf /var/lib/apt/lists/*
USER pwuser
WORKDIR /app
COPY --chown=pwuser:pwuser package*.json ./
RUN npm ci
COPY --chown=pwuser:pwuser . .
CMD ["npx", "playwright", "test"]