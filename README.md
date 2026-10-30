# Portofolio

Website portofolio pribadi lengkap dengan CMS. Satu aplikasi React melayani halaman publik (`/`) dan panel admin (`/admin`), didukung REST API berbasis Hono dan PostgreSQL.

## Fitur

**Halaman publik**
- Hero yang menyesuaikan ukuran layar, dengan running announcement; Education & Achievement, Experience (timeline dengan bar progres scroll), Projects, dan form Contact
- Halaman proyek dengan pencarian, drawer detail, serta tombol like & share beranimasi
- Dock navigasi, mode terang/gelap, kursor custom, dan animasi masuk (GSAP + Motion) yang menghormati pengaturan "kurangi gerakan" perangkat
- Ilustrasi WebP ringan dan kode admin yang dimuat terpisah (lazy) agar halaman publik cepat

**Panel admin (CMS)**
- Login dengan GitHub (hanya username yang diizinkan)
- Kelola konten setiap section, proyek, pendidikan, dan pengalaman dengan status draf/terbit (draf otomatis tersimpan saat keluar form)
- Editor proyek berbasis blok: cover wajib sebelum menambah blok atau mempublikasikan, layar penuh di HP
- Kelola announcement dan tautan sosial media; aksi ubah/hapus lewat geser (swipe) di HP dan tablet
- Inbox pesan dari form Contact beserta push notification
- Dashboard ringkasan (jumlah suka, proyek, pesan belum dibaca) dan meter penyimpanan
- Upload media ke Vercel Blob

## Teknologi

| Bagian | Stack |
| --- | --- |
| Frontend (`apps/web`) | React 19, Vite, TypeScript, Tailwind CSS 4, Base UI, React Router, TanStack Query, GSAP, Motion |
| Backend (`apps/api`) | Hono (Node.js), PostgreSQL dengan raw SQL (tanpa ORM), Zod |
| Autentikasi | Better Auth + GitHub OAuth |
| Penyimpanan file | Vercel Blob |
| Monorepo | pnpm workspaces + Turborepo |

## Struktur

```
.
├── apps/
│   ├── web/          # SPA React: halaman publik + panel admin (+ Dockerfile, nginx.conf)
│   └── api/          # REST API Hono (+ Dockerfile)
│       └── migrations/   # File SQL, dijalankan otomatis saat API start
├── packages/
│   └── shared/       # Tipe TypeScript bersama (web & api)
├── deploy/           # Manifest Kubernetes (Kustomize) untuk k3s
└── infra/            # Catatan infrastruktur (secret, k3s, gateway)
```

Folder `assets-src/` (di-gitignore) dipakai secara lokal untuk menyimpan gambar sumber beresolusi tinggi. File yang dipakai aplikasi adalah versi WebP di `apps/web/src/assets/illustrations/`.

## Menjalankan secara lokal

### Prasyarat
- Node.js 24
- pnpm 9 (`corepack enable`)
- PostgreSQL
- GitHub OAuth App (callback: `<BETTER_AUTH_URL>/api/auth/callback/github`)
- Token Vercel Blob (untuk upload media)

### Langkah

```bash
pnpm install

# Salin lalu isi variabel lingkungan
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Jalankan web + api sekaligus
pnpm dev
```

Migrasi database dijalankan otomatis setiap API start. Setelah itu buka web di alamat yang ditampilkan Vite, dan panel admin di `/admin`.

### Variabel lingkungan

**`apps/api/.env`**

| Variabel | Keterangan |
| --- | --- |
| `PORT` | Port API (contoh `3001`) |
| `NODE_ENV` | `development` / `production` |
| `DATABASE_URL` | Connection string PostgreSQL |
| `BETTER_AUTH_SECRET` | Secret acak untuk Better Auth |
| `BETTER_AUTH_URL` | URL publik API |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Kredensial GitHub OAuth App |
| `ADMIN_GITHUB_USERNAMES` | Username GitHub yang boleh masuk admin, pisahkan dengan koma |
| `WEB_ORIGIN` | Origin web untuk CORS |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob |
| `STORAGE_LIMIT_MB` | Batas penyimpanan untuk meter di dashboard (default 10240) |

**`apps/web/.env`**

| Variabel | Keterangan |
| --- | --- |
| `VITE_API_URL` | Base URL API (contoh `http://localhost:3001/api`) |

## Skrip

| Perintah | Fungsi |
| --- | --- |
| `pnpm dev` | Jalankan web dan api bersamaan |
| `pnpm dev:secrets` | Sama seperti `pnpm dev`, dengan secret diambil dari Infisical (`infisical login` dulu) |
| `pnpm dev:web` / `pnpm dev:api` | Jalankan salah satu saja |
| `pnpm build` | Build semua app |
| `pnpm typecheck` | Cek tipe TypeScript di semua app |

## Kredit

### Ilustrasi & animasi

| Aset | Kreator | Sumber |
| --- | --- | --- |
| Jerapah dengan laptop (`giraffe-laptop.webp`) | [Charcoal 3D](https://iconscout.com/contributors/triple-t) | [IconScout](https://iconscout.com/free-3d-icon/free-cute-giraffe-working-on-laptop-3d-icon_10199650) |
| Jerapah dengan headset VR (`giraffe-vr-headset.webp`) | [Charcoal 3D](https://iconscout.com/contributors/triple-t) | [IconScout](https://iconscout.com/free-3d-icon/free-cute-giraffe-wearing-virtual-reality-headset-3d-icon_10199646) |
| No notification (`no-notification.svg`) | [Dominika Faściszewska](https://iconscout.com/contributors/dominika-fasciszewska) | [IconScout](https://iconscout.com/free-illustration/free-no-notification-illustration_12308345) |
| Empty box (`empty-box.svg`) | [Dominika Faściszewska](https://iconscout.com/contributors/dominika-fasciszewska) | [IconScout](https://iconscout.com/free-illustration/free-empty-box-illustration_12308349) |
| Empty email (`empty-email.svg`) | [Dominika Faściszewska](https://iconscout.com/contributors/dominika-fasciszewska) | [IconScout](https://iconscout.com/free-illustration/free-empty-email-illustration_12308350) |
| 404 kipas meja (`not-found-404.svg`) | [Abdul Latif](https://lottiefiles.com/animoox) | [LottieFiles](https://lottiefiles.com/free-animation/table-fan-404-error-sjGhWl2wEy) |
| Medali (`medal.webp`) | Vijay Verma | [3dicons](https://3dicons.co) |

Aset di atas tetap milik kreatornya masing-masing, digunakan sesuai lisensinya, dan **tidak** termasuk dalam lisensi kode repo ini. Jangan mengambil atau mendistribusikan ulang aset tersebut dari repo ini; unduh langsung dari sumbernya.

Gambar asli beresolusi tinggi tidak disimpan di repo; yang ada hanya versi WebP yang sudah diperkecil untuk ditampilkan di website.

### Komponen & animasi

- [React Bits](https://reactbits.dev): Dock (navigasi publik), ClickSpark dan Counter (tombol like & share), serta Stroke Text (teks "Mohon Tunggu"/"Selamat Datang!" di admin).
