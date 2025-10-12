# Railway Deployment - Ayrı WebSocket Servisi

## 🚀 Railway'de 2 Servis Kurulumu

### Servis 1: Ana Uygulama (Next.js + Worker)

1. Railway Dashboard'da mevcut servisi kullan
2. `Dockerfile` kullanacak
3. Port: 3000
4. Environment Variables:
   ```
   DATABASE_URL=<PostgreSQL URL>
   REDIS_URL=<Redis URL>
   CLOUDINARY_URL=cloudinary://...
   KICK_CLIENT_ID=...
   KICK_CLIENT_SECRET=...
   WEBHOOK_SECRET=...
   JWT_SECRET=...
   NEXT_PUBLIC_WS_URL=kick-alert-box-websocket.up.railway.app
   ```

### Servis 2: WebSocket Servisi

1. Railway Dashboard'da "New Service" → "GitHub Repo"
2. Aynı repo'yu seç
3. Settings:
   - **Name**: `kick-alert-box-websocket`
   - **Dockerfile Path**: `Dockerfile.websocket`
   - **Port**: `4001`
4. Environment Variables:
   ```
   DATABASE_URL=<PostgreSQL URL>
   REDIS_URL=<Redis URL>
   ```
5. Railway otomatik domain verecek: `kick-alert-box-websocket.up.railway.app`

### ✅ Avantajlar:

- ✅ Port çakışması yok
- ✅ Her servis bağımsız scale edilebilir
- ✅ WebSocket servisi ayrı restart olabilir
- ✅ Daha temiz mimari

### 📝 Not:

Ana servisin `NEXT_PUBLIC_WS_URL` değişkenini WebSocket servisinin Railway URL'i ile güncelle!
