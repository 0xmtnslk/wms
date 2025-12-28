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
- Dark mode varsayılan olarak aktiftir
- Tüm UI Türkçe dilindedir
- Atık türü renkleri sabit tutulmalıdır
- QR kod okuma simülasyonu manuel giriş ile yapılır
