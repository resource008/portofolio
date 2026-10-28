# Infra notes

Catatan konsep per tahap. Nilai secret tidak pernah ditulis di sini.

## Tahap 1: Containerization

- Image `api` dan `web` di-build multi-stage; runtime hanya berisi hasil build dan dependency production.
- Tidak ada Docker di laptop. `.github/workflows/containers.yml` mem-build kedua image dan menjalankan smoke test (Postgres 18.6, `/api/health`, non-root, SPA fallback) di setiap PR.

## Tahap 2: Secret management (Infisical Cloud)

Infisical adalah satu-satunya sumber secret. Tidak ada `.env` berisi nilai asli di Git maupun di disk.

### Struktur

Paket Free tidak bisa membatasi akses per folder, jadi isolasi dilakukan per project:

| Project | Environment | Isi | Dibaca oleh |
|---|---|---|---|
| `portofolio-app` | `dev`, `prod` | Secret aplikasi (DB, auth, OAuth, blob) | Laptop (login pribadi), `k8s-prod` |
| `portofolio-ci` | `prod` | Token yang hanya dibutuhkan CI | `ci` |
| `portofolio-infra` | `prod` | Cloudflare, VPS, password ArgoCD | `infra` (Terraform, Ansible) |

Setiap machine identity hanya diberi role Viewer di satu project. Kalau satu kredensial bocor, hanya secret project itu yang terbuka.

Keterbatasan Free: tidak ada riwayat versi atau rollback. Sebelum merotasi secret, pastikan nilai baru sudah benar; nilai lama tidak bisa dipulihkan.

### Secret `portofolio-app`

| Nama | dev | prod |
|---|---|---|
| `DATABASE_URL` | Postgres lokal | `postgres://app:${POSTGRES_PASSWORD}@postgres:5432/portofolio` |
| `POSTGRES_PASSWORD` | — | `openssl rand -hex 24` |
| `BETTER_AUTH_SECRET` | nilai dev | `openssl rand -base64 32` (baru, jangan pakai ulang nilai dev) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | OAuth App dev | OAuth App production terpisah |
| `BLOB_READ_WRITE_TOKEN` | token Vercel Blob | token Vercel Blob |

Nilai non-rahasia (`PORT`, `WEB_ORIGIN`, `BETTER_AUTH_URL`, `ADMIN_GITHUB_USERNAMES`, `STORAGE_LIMIT_MB`) masuk ConfigMap di Tahap 3, bukan Infisical.

### Kunci pembuka (satu-satunya kredensial di luar Infisical)

| Identity | Disimpan di |
|---|---|
| `ci` | GitHub Secrets: `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET` |
| `k8s-prod` | K8s Secret, dipasang sekali oleh Ansible |
| `infra` | Env shell laptop: `INFISICAL_UNIVERSAL_AUTH_CLIENT_ID`, `INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET` |

### Dev lokal

```bash
infisical login
pnpm dev:secrets   # = infisical run --env=dev -- turbo run dev
```

Turbo berjalan dalam strict env mode, jadi setiap env var yang dipakai `dev` harus terdaftar di `passThroughEnv` pada `turbo.json`.

### Verifikasi (2026-10-28)

- Identity `k8s-prod` (Universal Auth, Viewer di `portofolio-app`) bisa membaca ke-6 secret `prod`; referensi `${POSTGRES_PASSWORD}` di `DATABASE_URL` ter-expand.
- Identity yang sama ditolak (403) saat membaca `portofolio-ci`.
- Identity `ci` ditunda ke Tahap 6, saat isi `portofolio-ci` sudah jelas. Identity `infra` dibuat di Tahap 7.

## Override dependency (pnpm.overrides)

Tambalan sementara untuk temuan Trivy. Hapus begitu paket induknya memakai versi yang sudah diperbaiki.

| Override | Alasan |
|---|---|
| `source-map-js` → `^1.2.2` | CVE-2026-93749 lewat `postcss` (tsup) |
| `@vercel/cli-config>zod` → `^4.6.7` | `@vercel/cli-config` (via `@vercel/blob` → `@vercel/oidc`) mengunci `zod@4.1.11`, kena CVE-2023-54404 |

`.npmrc` memakai `auto-install-peers=false` supaya peer opsional yang tidak dipakai (mis. `next` milik `better-auth`) tidak ikut terpasang. Peer wajib ditulis eksplisit, contohnya `react-is` untuk `recharts` di `apps/web`.
