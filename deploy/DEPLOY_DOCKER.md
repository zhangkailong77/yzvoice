# Docker Deployment Guide

## 1. Prepare environment file

```bash
cp backend/.env.production.example backend/.env.production
```

Fill `backend/.env.production` with your real API keys.

## 2. Prepare HTTPS certificates

Put certificate files in `deploy/certs/`:

- `deploy/certs/fullchain.pem`
- `deploy/certs/privkey.pem`

If your certificate files from Alibaba Cloud have different names, rename them to the two names above.

These files are mounted in the frontend container at:

- `/etc/nginx/ssl/fullchain.pem`
- `/etc/nginx/ssl/privkey.pem`

## 3. Build and start

Set frontend public API origin to your HTTPS domain (port 4006) and start:

```bash
export VITE_API_ORIGIN=https://demo.ybystds.com:4006
docker compose -f docker-compose.prod.yml up -d --build
```

## 4. Check status and logs

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

## 5. Verify endpoints

- Frontend: `https://demo.ybystds.com:4006`
- Backend docs: `https://demo.ybystds.com:4006/api/docs` (proxied to backend)
- Generated files: `https://demo.ybystds.com:4006/files/<filename>`
- Health check: `https://demo.ybystds.com:4006/health`

## 6. Update process

```bash
git pull
export VITE_API_ORIGIN=https://demo.ybystds.com:4006
docker compose -f docker-compose.prod.yml up -d --build
```

## 7. Stop services

```bash
docker compose -f docker-compose.prod.yml down
```
