# Выкат на сервер

Сайт живёт на своём сервере: nginx отдаёт собранный фронтенд из
`frontend/dist`, рядом в Docker крутятся бэкенд, PostgreSQL и Redis
(`docker-compose.prod.yml`). Vercel здесь не используется.

## Автоматический выкат

`.github/workflows/deploy-server.yml` после каждого слияния в `main`
подключается к серверу и обновляет его. Пока секреты не заданы, шаг
пропускается с предупреждением и ничего не ломает.

### Что завести один раз

**1. Отдельный пользователь на сервере.** Не root: если ключ когда-нибудь
утечёт, ущерб будет ограничен папкой проекта.

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
chown -R deploy:deploy <папка проекта>
```

**2. Ключ — на своей машине.**

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f deploy_key
ssh-copy-id -i deploy_key.pub deploy@<адрес сервера>
```

**3. Отпечаток сервера** — чтобы раннер не отдал ключ подменённому хосту:

```bash
ssh-keyscan -H <адрес сервера>
```

**4. Секреты репозитория** — Settings → Secrets and variables → Actions:

| Имя | Значение |
| --- | --- |
| `DEPLOY_SSH_KEY` | содержимое файла `deploy_key` целиком |
| `DEPLOY_HOST` | адрес сервера |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_PATH` | путь к папке проекта на сервере |
| `DEPLOY_KNOWN_HOSTS` | вывод `ssh-keyscan` |
| `DEPLOY_PORT` | порт SSH, если не 22 |

Приватный ключ после этого нужен только GitHub. Свою копию `deploy_key`
можно удалить, а пересылать его в переписке или мессенджере не нужно
никому и никогда.

## Вручную

Если автоматика не настроена, то же самое делается на сервере руками:

```bash
cd <папка проекта>
git pull
cd frontend && npm ci && npm run build && cd ..
docker compose -f docker-compose.prod.yml up -d --build backend
```

Фронтенд обновляется сразу после сборки: nginx отдаёт `frontend/dist`
напрямую. Бэкенд пересобирается отдельно.
