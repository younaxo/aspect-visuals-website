FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 5000
# migrate deploy применяет только незакоммиченные миграции и никогда не удаляет данные.
# db push --accept-data-loss здесь недопустим: он молча дропает несовпавшие колонки и таблицы.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
