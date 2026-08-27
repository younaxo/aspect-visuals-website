AGENTS.md

О проекте: Веб-сайт Aspect Visuals с Discord авторизацией, магазином подписок, чатом, админ-панелью и системой промокодов

Стек: React 18 + TypeScript + Vite + Tailwind, Node.js + Express + Prisma, PostgreSQL, Discord OAuth2 + JWT, Socket.io, Zustand, Axios, React Query

Структура:
frontend/src/ - components/, hooks/, store/, api/, types/, utils/
backend/src/ - controllers/, routes/, middleware/, services/, utils/
backend/prisma/ - schema.prisma, seed.ts

Discord роли для синхронизации:
Owner: 1541875062208995328
Developer: 1541784961986596874
Technical Administrator: 1541875599331561604
Administrator: 1541785126856429568
Chief Moderator: 1541785097374793799
Moderator: 1541785042706235472
Support: 1541785160297480243
Subscriber_Plus: 1541875642524766290
Subscriber: 1541790489399791716
Default: 1541869586004058264

Подписки (цены в ₽):
Базовые: 7д(59) | 14д(129) | 30д(199) | 90д(299) | 180д(499) | Навсегда(599)
Премиум: 30д(49) | 90д(139) | Навсегда(299)
Допы: Бета-тест(99) | Сброс HWID(139)
Тестовая подписка: 1 день раз в 3 месяца бесплатно

API эндпоинты:
Auth: POST /api/auth/discord, GET /api/auth/me, POST /api/auth/refresh, POST /api/auth/logout
Shop: GET /api/shop/subscriptions, GET /api/shop/products, POST /api/shop/purchase, POST /api/shop/activate-key, POST /api/shop/apply-promo, POST /api/shop/test-subscription
Chat: GET /api/chat/messages, POST /api/chat/messages, WS /api/chat
Admin: GET /api/admin/users, PUT /api/admin/users/:id/role, POST /api/admin/keys/generate, POST /api/admin/promo/create, GET /api/admin/stats
Bonus: GET /api/bonus/daily, POST /api/bonus/daily/claim, POST /api/bonus/redeem
News: GET /api/news, GET /api/news/:slug, CRUD /api/admin/news
Content: GET /api/content (бутстрап лаунчера, всё из базы)

Правила кода:
- TypeScript строгий (strict: true), все компоненты с интерфейсами props
- Комментарии на русском для сложной логики
- Zustand для глобального состояния (authStore, shopStore, chatStore)
- React Query для API запросов (кэширование, ревалидация)
- axios с интерсепторами для добавления токена и обработки 401
- try/catch для ошибок с понятными сообщениями пользователю
- Все секреты в .env, никогда не хардкодить
- Tailwind классы: позиционирование → размеры → отступы → цвета → текст
- Адаптивность через mobile-first подход
- Семантический HTML (main, section, article, header, nav)

Безопасность:
- JWT токены с refresh токенами
- Rate limiting на все API (100 запросов в 15 минут)
- CORS настроен только для фронтенда
- Валидация всех входных данных (express-validator)
- Защита от XSS, CSRF, SQL инъекций (Prisma ORM)

Git коммиты:
Типы: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
Все коммиты на русском языке
Пример: feat(auth): добавлена авторизация через Discord

Авто-коммиты:
После каждого значимого изменения
Автоматический пуш в репозиторий
Сообщение на русском с описанием изменений

Интеграции:
- Discord: синхронизация ролей, уведомления о покупках, логирование действий
- ЮKassa/Stripe: прием платежей, вебхуки
- Redis: кэширование сессий и данных
- Sentry: мониторинг ошибок

Деплой:
Собственный VPS: docker-compose.prod.yml (postgres, redis, backend, nginx)
Nginx отдаёт frontend/dist и проксирует /api на backend, домен aspectvisuals.su
Docker: docker-compose.yml для локальной разработки

Документация:
README.md с инструкцией по установке и запуску
Комментарии в коде на русском
Swagger/OpenAPI для API

Ссылки:
Репозиторий: https://github.com/younaxo/aspect-visuals-website
Дизайн: из предоставленного HTML файла (Apple Design, стеклянная морфология)
Правила стиля: https://github.com/emilkowalski/skills