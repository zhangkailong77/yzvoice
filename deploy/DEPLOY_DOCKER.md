# Docker Deployment Guide

## 1. Prepare environment file

```bash
cp backend/.env.production.example backend/.env.production
```

Fill `backend/.env.production` with your real API keys.

## 2. Build and start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 3. Check status and logs

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

## 4. Verify endpoints

- Frontend: `http://112.124.32.196`
- Backend docs: `http://112.124.32.196/api/docs` (proxied to backend)
- Generated files: `http://112.124.32.196/files/<filename>`

## 5. Update process

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## 6. Stop services

```bash
docker compose -f docker-compose.prod.yml down
```
