# Aspect Visuals

Веб-сайт Aspect Visuals: Discord-авторизация, магазин подписок, чат, админ-панель и промокоды.

Стек: React 18 + TypeScript + Vite + Tailwind, Node.js + Express + Prisma, PostgreSQL, Discord OAuth2 + JWT.

## Требования

- Node.js 20+
- Docker Desktop
- npm

## Быстрый старт

1. Клонируйте репозиторий и установите зависимости:

```bash
cd frontend
npm install

cd ../backend
npm install
```

2. Скопируйте переменные окружения:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Заполните Discord Client ID/Secret, Bot Token, Guild ID и JWT_SECRET в `.env`.

3. Поднимите PostgreSQL и Redis:

```bash
docker compose up -d
```

4. Примените миграции Prisma:

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

5. Запустите сервисы в двух терминалах:

```bash
cd frontend
npm run dev
```

```bash
cd backend
npm run dev
```

- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/api/health

## Структура

- `frontend/src/components` — Layout, Auth, Common
- `frontend/src/store` — Zustand (authStore)
- `backend/src` — Express-контроллеры, маршруты, middleware и сервисы
- `backend/prisma` — схема и seed ролей Discord

## Discord-роли

Роли синхронизируются с Discord-сервером по ID из `.cursorrules` (Owner, Developer, администраторы, модераторы, подписчики).
