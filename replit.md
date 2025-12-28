# WMS - Stratejik Atık Yönetim Merkezi

Hastane atık toplama, tartım ve analiz sistemi.

## Proje Genel Bakış

Bu sistem, hastane atıklarının toplanması, tartılması ve analizini yönetmek için tasarlanmıştır. Üç farklı kullanıcı rolünü destekler:

- **HQ (Genel Merkez)**: Tüm hastaneleri görür ve yönetir
- **HOSPITAL_MANAGER**: Kendi hastanesini görür ve yönetir
- **COLLECTOR**: Saha atık toplama işlemlerini yapar

## Test Kullanıcıları

| Kullanıcı Adı | Şifre | Rol |
|---------------|-------|-----|
| hq.admin | 123456 | HQ + Manager + Collector |
| manager.h1 | 123456 | Manager + Collector (H1) |
| collector.h1 | 123456 | Collector (H1) |

## Atık Türleri

| Tür | Renk | Maliyet |
|-----|------|---------|
| Tıbbi Atık | Rose (#e11d48) | 15.00 TL/kg |
| Tehlikeli Atık | Amber (#f59e0b) | 25.00 TL/kg |
| Evsel Atık | Slate (#64748b) | 2.00 TL/kg |
| Geri Dönüşüm | Cyan (#06b6d4) | -1.00 TL/kg (kazanç) |

## Teknoloji Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS + Shadcn/UI
- **Backend**: Node.js + Express + Session Auth
- **Database**: PostgreSQL + Drizzle ORM
- **Fonts**: Inter (sans), JetBrains Mono (mono)
- **Theme**: Dark mode varsayılan

## Proje Yapısı

```
├── client/src/
│   ├── components/       # UI bileşenleri
│   │   ├── charts/       # Donut, Bar, Time chart
│   │   ├── ui/           # Shadcn bileşenleri
│   │   └── *.tsx         # Özel bileşenler
│   ├── lib/              # Yardımcı fonksiyonlar
│   │   ├── auth-context.tsx  # Auth state yönetimi
│   │   ├── theme-provider.tsx # Dark/light tema
│   │   └── queryClient.ts    # TanStack Query
│   └── pages/            # Sayfa bileşenleri
│       ├── dashboard.tsx
│       ├── analytics.tsx
│       ├── settings.tsx
│       ├── issues.tsx
│       └── collector.tsx
├── server/
│   ├── db.ts             # Database connection
│   ├── storage.ts        # DatabaseStorage class
│   ├── routes.ts         # API endpoints
│   ├── seed.ts           # Test data seeding
│   └── index.ts          # Server entry
└── shared/
    └── schema.ts         # Drizzle schema + Zod types
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Giriş
- `POST /api/auth/logout` - Çıkış
- `GET /api/auth/me` - Mevcut kullanıcı bilgisi

### Dashboard
- `GET /api/dashboard/summary` - Dashboard verileri
- `GET /api/analytics` - Analitik verileri

### Settings
- `GET /api/settings/location-categories` - Mahal kategorileri
- `GET /api/settings/locations` - Lokasyonlar
- `GET/POST /api/settings/operational-coefficients` - HBYS verileri

### Waste Collections
- `GET /api/waste/collections` - Atık toplama kayıtları
- `POST /api/waste/collections` - Yeni kayıt oluştur
- `PATCH /api/waste/collections/:tagCode/weigh` - Tartım kaydet

### Issues
- `GET /api/issues` - Uygunsuzluk bildirimleri
- `POST /api/issues` - Yeni bildirim oluştur
- `PATCH /api/issues/:id/resolve` - Çözüldü işaretle

## Veritabanı Tabloları

- users, hospitals, roles
- user_hospitals, user_roles
- waste_types, location_categories, locations
- operational_coefficients
- waste_collections, issues, sync_logs

## Önemli Notlar

- Session-based authentication kullanılır (JWT değil)
- Şifreler bcrypt ile hashlenir (SALT_ROUNDS = 10)
- Dark mode varsayılan olarak aktiftir
- Tüm UI Türkçe dilindedir
- Atık türü renkleri sabit tutulmalıdır
- QR kod okuma simülasyonu manuel giriş ile yapılır

## Linux Sunucu Dağıtımı (GitHub ile)

### 1. GitHub Repository'si Oluşturma

```bash
# Proje klasöründe
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/kullanici/wms.git
git push -u origin main
```

### 2. Sunucu Gereksinimleri

- Node.js 20+ (LTS)
- PostgreSQL 14+
- PM2 veya systemd (process management)
- Nginx (reverse proxy)

### 3. Sunucu Kurulumu

```bash
# Node.js 20 kurulumu (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL kurulumu
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres createuser --interactive
sudo -u postgres createdb wms

# PM2 kurulumu
sudo npm install -g pm2
```

### 4. Projeyi Sunucuya Çekme

```bash
cd /var/www
git clone https://github.com/kullanici/wms.git
cd wms
npm install
```

### 5. Ortam Değişkenleri (.env)

```bash
# /var/www/wms/.env
DATABASE_URL=postgresql://kullanici:sifre@localhost:5432/wms
SESSION_SECRET=cok-guclu-ve-uzun-rastgele-bir-secret-key
NODE_ENV=production
PORT=5000
```

### 6. Veritabanı Kurulumu

```bash
npm run db:push
# İlk çalıştırmada seed otomatik çalışır
```

### 7. Production Build

```bash
npm run build
```

### 8. PM2 ile Başlatma

```bash
# Ecosystem dosyası oluştur
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'wms',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
EOF

pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 9. Nginx Konfigürasyonu

```nginx
# /etc/nginx/sites-available/wms
server {
    listen 80;
    server_name wms.example.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 10. SSL Sertifikası (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d wms.example.com
```

### 11. Güncelleme Prosedürü

```bash
cd /var/www/wms
git pull origin main
npm install
npm run build
pm2 restart wms
```

### Önemli Güvenlik Notları

1. **SESSION_SECRET**: En az 64 karakter, rastgele oluşturulmuş olmalı
2. **PostgreSQL**: Güçlü şifre kullanın, uzaktan erişimi kapatın
3. **Firewall**: Sadece 80, 443, 22 portlarını açık tutun
4. **Güncellemeler**: Düzenli olarak sistem ve paket güncellemeleri yapın
