# Kick Alert Box - Docker Deployment Guide

Bu dokümantasyon, Kick Alert Box uygulamasının Railway'de Docker ile nasıl deploy edilieceğini açıklar.

## 🐳 Docker Setup

### Özellikler

- **Multi-stage build**: Optimize edilmiş Docker image
- **Multi-process container**: Next.js + WebSocket + Worker tek container'da
- **External services**: Redis ve PostgreSQL dış servisler olarak
- **Health checks**: Railway için health check endpoint'i
- **Production ready**: Next.js standalone output

### Dosya Yapısı

```
├── Dockerfile              # Multi-stage Docker build
├── .dockerignore           # Docker build optimization
├── start.sh                # Multi-process startup script
├── railway.toml            # Railway deployment config
└── src/app/api/health/     # Health check endpoint
```

## 🚀 Local Docker Test

### 1. Docker Build

```bash
npm run docker:build
```

### 2. Docker Run (Local Test)

```bash
npm run docker:run
```

### 3. Test Services

- Next.js: http://localhost:3000
- WebSocket: ws://localhost:4001
- Health Check: http://localhost:3000/api/health

## 🛤️ Railway Deployment

### 1. Environment Variables (Railway'de ayarla)

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# OAuth
KICK_CLIENT_ID=your_client_id
KICK_CLIENT_SECRET=your_client_secret
KICK_REDIRECT_URI=https://yourdomain.railway.app/api/auth/callback

# Encryption
ENCRYPTION_KEY=your_32_char_encryption_key

# JWT
JWT_SECRET=your_jwt_secret

# WebSocket
WEBSOCKET_PORT=4001
```

### 2. Deploy

```bash
# Railway CLI ile
railway deploy

# Veya GitHub integration ile otomatik deploy
```

### 3. Domain Configuration

Railway'de custom domain ayarlandıktan sonra:

- KICK_REDIRECT_URI'yi güncelle
- Kick.com'da OAuth callback URL'ini güncelle

## 📊 Monitoring

### Health Check

Railway otomatik olarak `/api/health` endpoint'ini kontrol eder:

- **URL**: `/api/health`
- **Interval**: 10 saniye
- **Timeout**: 5 saniye
- **Retry**: 3 defa

### Processes

Container içinde 3 process çalışır:

1. **Next.js Server** (Port 3000)
2. **WebSocket Server** (Port 4001)
3. **Background Worker** (Alert processing)

### Logs

Railway dashboard'dan tüm process'lerin loglarını görebilirsin:

```bash
railway logs
```

## 🔧 Configuration

### Resource Limits (railway.toml)

```toml
[deploy.resources]
memoryLimit = "1Gi"
cpuLimit = "1000m"
```

### Port Configuration

- **Next.js**: 3000 (HTTP)
- **WebSocket**: 4001 (WS)
- Railway otomatik olarak bu portları expose eder

## 🐛 Troubleshooting

### Common Issues

1. **Build fails**:

   - Check environment variables
   - Verify Prisma schema

2. **WebSocket connection fails**:

   - Verify WEBSOCKET_PORT environment variable
   - Check Railway port configuration

3. **Database connection fails**:

   - Verify DATABASE_URL and DIRECT_URL
   - Check Prisma client generation

4. **Worker not processing**:
   - Check Redis connection
   - Verify worker logs in Railway

### Debug Commands

```bash
# Local debugging
docker run -it --rm kick-alert-box sh

# Railway logs
railway logs --tail

# Railway shell
railway shell
```

## 📝 Notes

- **External Services**: Redis ve PostgreSQL external olarak host edilmeli
- **File Uploads**: Railway'de persistent volume yok, external storage gerekebilir
- **WebSocket**: Railway WebSocket'i destekler
- **SSL**: Railway otomatik HTTPS sağlar

## 🔄 Updates

Kod değişikliklerinden sonra:

1. `git push` yap (GitHub integration varsa otomatik deploy)
2. Veya `railway deploy` komutu ile manuel deploy

---

✅ **Ready for Railway deployment!**
