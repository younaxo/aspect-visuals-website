# Ротация пароля PostgreSQL на продакшене

## Зачем

В `docker-compose.prod.yml` пароль базы был записан как значение по умолчанию
(`${POSTGRES_PASSWORD:-aspect_prod_9898}`) и попал в публичный репозиторий.
Значение по умолчанию убрано, но **старый пароль остаётся в истории git**,
поэтому его необходимо считать скомпрометированным и заменить.

Переписывать историю репозитория не нужно и не рекомендуется: пароль всё равно
уже мог быть скопирован. Правильное решение — ротация.

## Важно про поведение Postgres

`POSTGRES_PASSWORD` применяется **только при первичной инициализации тома**.
Если том `postgres_data` уже создан, изменение переменной пароль в базе не
поменяет, но сломает `DATABASE_URL` у backend — он не сможет подключиться.

Поэтому менять надо в два действия: сначала внутри базы, потом в окружении.

## Порядок

Выполнять на сервере, в каталоге `/opt/aspect-visuals-website`.

### 1. Резервная копия (обязательно)

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres -d aspect_visuals \
  | gzip > ~/aspect_visuals_$(date +%F_%H%M).sql.gz

ls -lh ~/aspect_visuals_*.sql.gz
```

Убедитесь, что файл не пустой, прежде чем продолжать.

### 2. Новый пароль

```bash
NEW_PASS="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
echo "$NEW_PASS"
```

Сохраните значение — оно понадобится дважды.

### 3. Сменить пароль внутри базы

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres -d aspect_visuals \
  -c "ALTER USER postgres WITH PASSWORD '$NEW_PASS';"
```

### 4. Прописать пароль в окружение

Файл `.env` рядом с `docker-compose.prod.yml` (он в `.gitignore`):

```bash
echo "POSTGRES_PASSWORD=$NEW_PASS" >> /opt/aspect-visuals-website/.env
chmod 600 /opt/aspect-visuals-website/.env
```

Если `DATABASE_URL` продублирован в `backend/.env.production`, обновите пароль
и там.

### 5. Перезапустить backend

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate backend
docker compose -f docker-compose.prod.yml logs --tail 40 backend
curl -sS https://aspectvisuals.su/api/health
```

### 6. Проверка

- `/api/health` отвечает `{"status":"ok"}`
- в логах backend нет ошибок подключения к базе
- вход на сайте и в лаунчере работает

## Откат

Если backend не поднялся, верните прежний пароль тем же `ALTER USER`
и уберите строку из `.env`, затем пересоздайте контейнер. Данные при этом
не затрагиваются: менялся только пароль роли.

Полный откат данных — только из дампа, снятого на шаге 1.
