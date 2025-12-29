# WMS - Stratejik Atık Yönetim Merkezi

Hastane atık toplama, tartım ve analiz sistemi.

## Sistem Gereksinimleri

- Ubuntu 22.04 LTS
- Node.js 20 LTS
- PostgreSQL 16
- 4 CPU, 8GB RAM, 160GB SSD (minimum)

---

## Ubuntu 22.04 VPS Kurulum Rehberi

Bu rehber, sistemi sıfırdan Ubuntu 22.04 sunucuya kurmanızı sağlar. Tüm komutlar `root` kullanıcısı olarak çalıştırılacaktır.

---

## 1. Sistemi Güncelleme ve Hazırlık

```bash
# Sistem paketlerini güncelle
apt update && apt upgrade -y

# Gerekli araçları kur
apt install -y curl wget git build-essential software-properties-common gnupg2

# Zaman dilimini ayarla (Türkiye için)
timedatectl set-timezone Europe/Istanbul

# Sistem bilgisini kontrol et
hostnamectl
```

---

## 2. Güvenlik Duvarı (UFW) Ayarları

```bash
# UFW'yi kur ve aktifleştir
apt install -y ufw

# SSH, HTTP ve HTTPS portlarını aç
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Güvenlik duvarını aktifleştir
ufw --force enable

# Durumu kontrol et
ufw status
```

---

## 3. Swap Alanı Oluşturma (Önerilen)

8GB RAM için 4GB swap önerilir:

```bash
# Swap dosyası oluştur
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Kalıcı yap
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Swap ayarlarını optimize et
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p

# Kontrol et
free -h
```

---

## 4. Node.js 20 LTS Kurulumu

```bash
# NodeSource repository ekle
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Node.js kur
apt install -y nodejs

# Versiyonu kontrol et
node --version
npm --version

# npm'i güncelle
npm install -g npm@latest
```

---

## 5. PM2 Kurulumu (Process Manager)

```bash
# PM2'yi global olarak kur
npm install -g pm2

# Versiyonu kontrol et
pm2 --version
```

---

## 6. PostgreSQL 16 Kurulumu

```bash
# PostgreSQL resmi repository ekle
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# İmzalama anahtarını ekle
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg

# Paket listesini güncelle ve PostgreSQL 16 kur
apt update
apt install -y postgresql-16 postgresql-contrib-16

# PostgreSQL servisini başlat ve aktifleştir
systemctl start postgresql
systemctl enable postgresql

# Durumu kontrol et
systemctl status postgresql
```

---

## 7. PostgreSQL Veritabanı ve Kullanıcı Oluşturma

```bash
# PostgreSQL kullanıcısına geç
sudo -u postgres psql
```

PostgreSQL shell'inde aşağıdaki komutları çalıştır:

```sql
-- Veritabanı kullanıcısı oluştur (şifreyi değiştirin!)
CREATE USER wmsuser WITH PASSWORD 'GuCLu_S1fre_123!';

-- Veritabanı oluştur
CREATE DATABASE wmsdb OWNER wmsuser;

-- Kullanıcıya tam yetki ver
GRANT ALL PRIVILEGES ON DATABASE wmsdb TO wmsuser;

-- Şema yetkisi ver
\c wmsdb
GRANT ALL ON SCHEMA public TO wmsuser;

-- Çıkış
\q
```

### PostgreSQL Bağlantı Testi

```bash
# Bağlantıyı test et
psql -U wmsuser -d wmsdb -h localhost -c "SELECT version();"
# Şifre sorulduğunda yukarıda belirlediğiniz şifreyi girin
```

---

## 8. GitHub'dan Projeyi Çekme

```bash
# www dizinine git
cd /var/www

# Git repository'sini klonla (kendi repository URL'nizi kullanın)
git clone https://github.com/KULLANICI_ADINIZ/wms.git

# Proje dizinine gir
cd wms
```

---

## 9. Bağımlılıkları Kurma

```bash
cd /var/www/wms

# Node.js bağımlılıklarını kur
npm install

# bcrypt için native modülleri derle (gerekirse)
npm rebuild bcrypt
```

---

## 10. Ortam Değişkenleri (.env) Dosyası Oluşturma

```bash
# .env dosyası oluştur
cat > /var/www/wms/.env << 'EOF'
# Veritabanı Bağlantısı
DATABASE_URL=postgresql://wmsuser:GuCLu_S1fre_123!@localhost:5432/wmsdb

# Uygulama Ayarları
NODE_ENV=production
PORT=5000

# Oturum Güvenliği (64+ karakter rastgele string kullanın!)
SESSION_SECRET=buraya-cok-guclu-ve-uzun-rastgele-bir-secret-key-yazin-en-az-64-karakter-olmali
EOF

# Dosya izinlerini ayarla (güvenlik için)
chmod 600 /var/www/wms/.env
```

### Güçlü SESSION_SECRET Oluşturma

```bash
# Rastgele 64 karakterlik secret oluştur
openssl rand -base64 48
# Çıkan değeri .env dosyasındaki SESSION_SECRET'a yapıştırın
```

---

## 11. Veritabanı Şemasını Oluşturma

```bash
cd /var/www/wms

# .env dosyasındaki değişkenleri yükle
export $(grep -v '^#' .env | xargs)

# Drizzle ile veritabanı tablolarını oluştur
npm run db:push
```

Bu komut tüm tabloları oluşturacaktır:
- users, hospitals, roles
- user_hospitals, user_roles
- waste_types, location_categories, locations
- operational_coefficients
- waste_collections, issues, sync_logs

---

## 12. Uygulamayı Derleme (Build)

```bash
cd /var/www/wms

# Production build oluştur
npm run build

# Build çıktısını kontrol et
ls -la dist/
```

---

## 13. İlk Çalıştırma ve Seed Data

Uygulama ilk çalıştığında otomatik olarak seed data oluşturur:
- 33 gerçek hastane
- 33 hastane yöneticisi (manager.h1 - manager.h33)
- 33 saha personeli (collector.h1 - collector.h33)
- 1 genel merkez admin (hq.admin)
- Atık türleri, lokasyon kategorileri ve örnek veriler

```bash
cd /var/www/wms

# .env dosyasındaki değişkenleri yükle (henüz yüklemediyseniz)
export $(grep -v '^#' .env | xargs)

# Uygulamayı test olarak bir kez çalıştır
npm run start

# Çalıştığını gördükten sonra Ctrl+C ile durdurun
```

---

## 14. PM2 ile Uygulamayı Başlatma

### PM2 Ecosystem Dosyası Oluşturma

```bash
cat > /var/www/wms/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'wms',
    script: 'dist/index.cjs',
    cwd: '/var/www/wms',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_file: '/var/www/wms/.env',
    error_file: '/var/log/pm2/wms-error.log',
    out_file: '/var/log/pm2/wms-out.log',
    log_file: '/var/log/pm2/wms-combined.log',
    time: true,
    max_memory_restart: '1G',
    exp_backoff_restart_delay: 100
  }]
};
EOF
```

### Log Dizini Oluşturma

```bash
mkdir -p /var/log/pm2
```

### PM2 ile Başlatma

```bash
cd /var/www/wms

# Uygulamayı başlat
pm2 start ecosystem.config.cjs

# Durumu kontrol et
pm2 status

# Logları izle
pm2 logs wms

# PM2'yi sistem başlangıcında otomatik başlat
pm2 startup systemd
# Çıkan komutu kopyalayıp çalıştırın

# Mevcut process listesini kaydet
pm2 save
```

### PM2 Komutları

```bash
# Durumu görüntüle
pm2 status

# Logları görüntüle
pm2 logs wms

# Uygulamayı yeniden başlat
pm2 restart wms

# Uygulamayı durdur
pm2 stop wms

# Uygulamayı sil
pm2 delete wms

# Tüm uygulamaları yeniden başlat
pm2 reload all
```

---

## 15. Nginx Kurulumu ve Konfigürasyonu

```bash
# Nginx kur
apt install -y nginx

# Nginx'i başlat
systemctl start nginx
systemctl enable nginx
```

### Nginx Site Konfigürasyonu

```bash
# Nginx konfigürasyon dosyası oluştur
cat > /etc/nginx/sites-available/wms << 'EOF'
server {
    listen 80;
    server_name wms.example.com;  # Kendi domain adresinizi yazın

    # Güvenlik başlıkları
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip sıkıştırma
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    # Dosya yükleme limiti
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF
```

### Site'ı Aktifleştirme

```bash
# Sembolik link oluştur
ln -s /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/

# Default site'ı kaldır (opsiyonel)
rm -f /etc/nginx/sites-enabled/default

# Nginx konfigürasyonunu test et
nginx -t

# Nginx'i yeniden yükle
systemctl reload nginx
```

---

## 16. SSL Sertifikası (Let's Encrypt)

```bash
# Certbot kur
apt install -y certbot python3-certbot-nginx

# SSL sertifikası al (domain adresinizi değiştirin)
certbot --nginx -d wms.example.com

# Otomatik yenilemeyi test et
certbot renew --dry-run
```

SSL kurulduktan sonra Nginx otomatik olarak HTTPS'e yönlendirecektir.

---

## 17. Log Rotasyonu Ayarlama

```bash
cat > /etc/logrotate.d/wms << 'EOF'
/var/log/pm2/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

---

## 18. PostgreSQL Yedekleme Scripti

```bash
# Yedekleme dizini oluştur
mkdir -p /var/backups/wms

# Yedekleme scripti oluştur
cat > /usr/local/bin/backup-wms.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/wms"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/wms_backup_$DATE.sql.gz"

# Veritabanını yedekle
PGPASSWORD="GuCLu_S1fre_123!" pg_dump -U wmsuser -h localhost wmsdb | gzip > $BACKUP_FILE

# 30 günden eski yedekleri sil
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
EOF

# Scripti çalıştırılabilir yap
chmod +x /usr/local/bin/backup-wms.sh

# Cron job ekle (her gün gece 02:00'de)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-wms.sh >> /var/log/wms-backup.log 2>&1") | crontab -
```

---

## 19. Güncelleme Prosedürü

Yeni güncellemeleri uygulamak için:

```bash
cd /var/www/wms

# Değişiklikleri çek
git pull origin main

# Bağımlılıkları güncelle
npm install

# Yeniden derle
npm run build

# Veritabanı şemasını güncelle (gerekirse)
npm run db:push

# Uygulamayı yeniden başlat
pm2 restart wms

# Durumu kontrol et
pm2 status
```

---

## 20. Sorun Giderme

### Uygulama Çalışmıyor

```bash
# PM2 durumunu kontrol et
pm2 status

# Hata loglarını görüntüle
pm2 logs wms --err --lines 100

# Node.js versiyonunu kontrol et
node --version

# Port kullanımını kontrol et
netstat -tlnp | grep 5000
```

### Veritabanı Bağlantı Hatası

```bash
# PostgreSQL servisini kontrol et
systemctl status postgresql

# Bağlantıyı test et
psql -U wmsuser -d wmsdb -h localhost -c "SELECT 1"

# PostgreSQL loglarını görüntüle
tail -100 /var/log/postgresql/postgresql-16-main.log
```

### Nginx Hataları

```bash
# Nginx konfigürasyonunu test et
nginx -t

# Nginx loglarını görüntüle
tail -100 /var/log/nginx/error.log
tail -100 /var/log/nginx/access.log
```

### Bellek Sorunları

```bash
# Bellek kullanımını kontrol et
free -h

# PM2 bellek kullanımını görüntüle
pm2 monit
```

---

## Varsayılan Kullanıcılar

Sistem ilk çalıştığında aşağıdaki kullanıcılar otomatik oluşturulur:

| Kullanıcı Adı | Şifre | Rol | Açıklama |
|---------------|-------|-----|----------|
| hq.admin | 123456 | HQ + Manager + Collector | Tüm hastaneleri görür |
| manager.h1 | 123456 | Manager + Collector | 1. hastane yöneticisi |
| manager.h2 | 123456 | Manager + Collector | 2. hastane yöneticisi |
| ... | 123456 | Manager + Collector | ... |
| manager.h33 | 123456 | Manager + Collector | 33. hastane yöneticisi |
| collector.h1 | 123456 | Collector | 1. hastane toplayıcısı |
| collector.h2 | 123456 | Collector | 2. hastane toplayıcısı |
| ... | 123456 | Collector | ... |
| collector.h33 | 123456 | Collector | 33. hastane toplayıcısı |

**Önemli:** Production ortamında şifreleri mutlaka değiştirin!

---

## Hastane Listesi

Sistemde 33 gerçek hastane tanımlıdır:

1. İstinye Üniversitesi Liv Hospital Bahçeşehir
2. İstinye Üniversitesi Liv Hospital Topkapı
3. İstinye Üniversitesi Medical Park Gaziosmanpaşa Hastanesi
4. Liv Hospital Ankara
5. Liv Hospital Gaziantep
6. Liv Hospital Samsun
7. Liv Hospital Ulus
8. Liv Hospital Vadistanbul
9. Medical Park Adana Hastanesi
10. Medical Park Ankara (Batıkent) Hastanesi
11. Medical Park İncek Hastanesi
12. Medical Park Antalya Hastanesi
13. Medical Park Ataşehir Hastanesi
14. Medical Park Bahçelievler Hastanesi
15. Medical Park Gebze Hastanesi
16. Medical Park Göztepe Hastanesi
17. Medical Park İzmir Hastanesi
18. Medical Park Ordu Hastanesi
19. Medical Park Seyhan Hastanesi
20. Medical Park Tem Hastanesi
21. Medical Park Tokat Hastanesi
22. Medical Park Karadeniz Hastanesi
23. Medical Park Yıldızlı Hastanesi
24. VM Medical Park Ankara (Keçiören) Hastanesi
25. VM Medical Park Bursa Hastanesi
26. VM Medical Park Gebze (Fatih) Hastanesi
27. VM Medical Park Florya Hastanesi
28. VM Medical Park Kocaeli Hastanesi
29. VM Medical Park Maltepe Hastanesi
30. VM Medical Park Mersin Hastanesi
31. VM Medical Park Pendik Hastanesi
32. VM Medical Park Samsun Hastanesi
33. İstinye Dental Hospital

---

## Atık Türleri

| Tür | Renk | Maliyet |
|-----|------|---------|
| Tıbbi Atık | Pembe (#e11d48) | 15.00 TL/kg |
| Tehlikeli Atık | Amber (#f59e0b) | 25.00 TL/kg |
| Evsel Atık | Gri (#64748b) | 2.00 TL/kg |
| Geri Dönüşüm | Cyan (#06b6d4) | -1.00 TL/kg (kazanç) |

---

## Teknoloji Stack

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS + Shadcn/UI
- **Backend:** Node.js + Express + Session Auth
- **Database:** PostgreSQL 16 + Drizzle ORM
- **Process Manager:** PM2
- **Web Server:** Nginx
- **SSL:** Let's Encrypt (Certbot)

---

## Güvenlik Kontrol Listesi

Canlıya almadan önce aşağıdakileri kontrol edin:

- [ ] Tüm kullanıcı şifreleri değiştirildi
- [ ] PostgreSQL şifresi güçlü ve benzersiz
- [ ] SESSION_SECRET 64+ karakter ve rastgele
- [ ] UFW güvenlik duvarı aktif
- [ ] SSL sertifikası kurulu
- [ ] .env dosyası 600 izinlerinde
- [ ] Yedekleme scripti çalışıyor
- [ ] Log rotasyonu ayarlandı

---

## Destek

Sorunlar için GitHub Issues kullanın veya sistem yöneticinizle iletişime geçin.
