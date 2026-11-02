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

## Tahap 3b: k3s di VPS (manual, nanti dipindah ke Ansible di Tahap 8)

VPS: Ubuntu 24.04, 2 vCPU, 1.9 GB RAM + 1.9 GB swap, user `ubuntu`, SSH key only, ufw hanya SSH (`LIMIT`).

1. Cek bentrok alamat: `ip route` hanya berisi subnet privat provider yang tidak tumpang tindih dengan `10.42`/`10.43`, jadi CIDR default k3s (`10.42.0.0/16` pod, `10.43.0.0/16` service) dipakai apa adanya.
2. Firewall untuk jaringan k3s, berbasis interface (bukan IP), dibuat sebelum install:
   - `ufw allow in on cni0 comment 'k3s pods to node'`
   - `ufw route allow in on cni0 comment 'k3s pod egress'`
   - `ufw route allow out on cni0 comment 'k3s pod ingress'`
3. Install: `curl -sfL https://get.k3s.io | sh -s - --secrets-encryption` (v1.36.5+k3s1). Cek: `k3s secrets-encrypt status` → Enabled, AES-CBC.
4. Port 6443 tidak dibuka. `kubectl` dari laptop lewat SSH tunnel: kubeconfig `/etc/rancher/k3s/k3s.yaml` disalin (dari Git Bash, bukan PowerShell, agar UTF-8) ke `~/.kube/portofolio.yaml`; `~/.ssh/config` punya alias `portofolio-k8s` dengan `LocalForward 6443 127.0.0.1:6443` dan `ServerAliveInterval 30`.

RAM setelah k3s kosong: used 1.0 GB, available ±876 MB.

## Tahap 3c: Infisical Operator

1. Install dari laptop (Git Bash, tunnel terbuka): `helm repo add infisical-helm-charts https://dl.cloudsmith.io/public/infisical/helm-charts/helm/charts/`, lalu `helm install infisical-operator infisical-helm-charts/secrets-operator -n infisical --create-namespace` (chart 0.11.16, ±13 MB RAM). Kalau unduhan chart putus lewat IPv6, unduh `.tgz` dengan `curl -4` lalu install dari file.
2. Kunci pembuka, satu-satunya secret yang dibuat manual: `kubectl create secret generic universal-auth-credentials -n portofolio` dengan key `clientId` dan `clientSecret` milik identity `k8s-prod`. Nilai dibaca dengan `read -rsp` supaya tidak tampil di layar maupun di history. Client ID berupa UUID, jadi panjangnya harus 36 byte.
3. `kubectl apply -f deploy/base/infisical.yaml` membuat `InfisicalConnection`, `InfisicalAuth`, dan `InfisicalStaticSecret` (API `v1beta1`; `InfisicalSecret` v1alpha1 sudah deprecated). Setiap `...Ref` wajib menulis `namespace`.
4. Hasil: Secret `app-secrets` berisi 6 key `prod`, disinkronkan ulang setiap 60 detik. Panjang `DATABASE_URL` cocok dengan referensi `${POSTGRES_PASSWORD}` yang sudah ter-expand.

## Tahap 3d–3e: Aplikasi di k3s (Kustomize)

`kubectl apply -k deploy/base` memasang semuanya di namespace `portofolio`:

| Resource | Catatan |
|---|---|
| `postgres` (StatefulSet + headless Service) | `postgres:18.6-alpine`, UID 70, PVC `local-path` di-mount ke `/var/lib/postgresql`. Ukuran 5Gi tidak ditegakkan oleh `local-path` |
| `api` (Deployment + Service :3001) | Probe `/api/health`, migrasi jalan saat boot, auto-reload saat `app-secrets` berubah |
| `web` (Deployment + Service :8080) | nginx-unprivileged UID 101 |
| `app-config` (ConfigMap) | Nilai non-rahasia: domain, admin, `TRUST_PROXY` |

Semua container non-root, `allowPrivilegeEscalation: false`, capability di-drop, seccomp `RuntimeDefault`. `api` dan `web` memakai root filesystem read-only dengan `/tmp` emptyDir. Hanya RAM yang diberi limit; CPU tidak, supaya tidak di-throttle.

Tag image di `kustomization.yaml` harus **SHA lengkap** commit `main` (`git rev-parse origin/main`), karena CI men-tag dengan `$GITHUB_SHA`. SHA pendek berujung `ErrImagePull`.

Verifikasi (2026-10-29): ketiga pod `1/1 Running` tanpa restart; `web` → `http://api:3001/api/health` membalas `{"status":"ok"}`. RAM: api 46Mi, postgres 54Mi, web 3Mi.

Service masih `ClusterIP`, jadi belum bisa diakses dari luar. Untuk mengintip: `kubectl port-forward -n portofolio svc/web 8080:8080`.

## Tahap 4: Pintu depan (Traefik Gateway API + Cloudflare)

```
Browser ──HTTPS──▶ Cloudflare (proxy, sertifikat publik) ──HTTPS :443──▶ Traefik (Gateway) ──▶ web / api
```

1. DNS dipindah ke Cloudflare (Free). NS di Sumopod diganti ke `aleena`/`armando.ns.cloudflare.com`; Sumopod tetap registrar. Record `A @` → IP VPS, **Proxied**, sehingga IP VPS tidak terlihat.
2. Traefik bawaan k3s (v3.7) dinyalakan provider Gateway API-nya lewat `deploy/cluster/traefik.yaml` (`HelmChartConfig`). CRD Gateway API sudah ikut k3s.
3. HTTPS ke origin memakai **Cloudflare Origin Certificate** (ECC, 15 tahun, apex + wildcard), bukan cert-manager, untuk hemat RAM. Sertifikat dan key disimpan di Infisical `portofolio-app/prod/tls` (`TLS_CRT`, `TLS_KEY`) dan disinkronkan operator menjadi Secret `kubernetes.io/tls` `portofolio-tls`.
4. `deploy/base/gateway.yaml`: listener `http` (8000) dan `https` (8443) Traefik, terpetakan ke 80/443 di node. `deploy/base/routes.yaml`: `/api` → `api:3001`, sisanya → `web:8080`, plus redirect HTTP → HTTPS.
5. Cloudflare: SSL/TLS **Full (strict)**, **Always Use HTTPS** aktif. Firewall panel provider hanya membuka TCP 443 (port 80 tetap tertutup; redirect dilakukan Cloudflare). Pembatasan 443 hanya untuk IP Cloudflare menyusul di Tahap 7–8.

## Tahap 5: GitOps dengan Flux

Flux dipilih menggantikan ArgoCD karena RAM VPS terbatas: hanya `source-controller` dan `kustomize-controller` yang dipasang (±37 MB, ArgoCD versi hemat butuh ±250–300 MB).

1. Laptop: `winget install -e --id FluxCD.Flux`, lalu `flux check --pre`.
2. `flux install --components=source-controller,kustomize-controller`. Tanpa `flux bootstrap`, karena bootstrap butuh token tulis dan push langsung ke `main` yang dilindungi.
3. `kubectl apply -f deploy/flux/portofolio.yaml` sekali secara manual. File ini mendefinisikan sumber resep dan `Kustomization` `portofolio` (`prune`, `wait`, patroli self-heal setiap 10 menit).
4. Terbukti: perubahan yang di-apply manual dari laptop dikembalikan Flux sesuai sumbernya.

Pemantauan: Headlamp desktop di laptop (`winget install -e --id Headlamp.Headlamp`, plugin Flux), memakai kubeconfig + SSH tunnel yang sama. Windows perlu `setx KUBECONFIG "%USERPROFILE%\.kube\portofolio.yaml"` karena Headlamp tidak membaca `~/.bashrc`.

## Tahap 6: Rilis otomatis (OCI artifact)

```
push dev ──containers.yml──▶ build + smoke test ──▶ ghcr.io/resource008/portofolio-{api,web}:<sha-dev>
merge main ──release.yml──▶ promote (retag ke <sha-main>)
                         └─▶ deploy/base dengan newTag=<sha-main> ──▶ portofolio-web:deploy-<sha-main> (tag deploy-main)
Flux (OCIRepository, tiap 1 menit) ──▶ apply ──▶ pod baru
```

- `newTag` hanya diisi di workspace CI (`yq`), tidak di-commit, sehingga satu merge sudah cukup untuk deploy. Versi yang berjalan selalu = commit `main` terakhir.
- Resep disimpan sebagai tag `deploy-*` di paket `portofolio-web` supaya GHCR tetap dua paket. Paket itu publik, jadi Flux tidak butuh kredensial.
- Perpindahan sumber: apply `deploy/flux/portofolio.yaml` (`OCIRepository`), lalu `kubectl delete gitrepository portofolio -n flux-system`. Nama `Kustomization` tetap sama sehingga tidak ada resource yang ter-prune.
- `newTag` di Git hanya relevan untuk `kubectl apply -k` manual.

Rollback: `git revert` commit yang bermasalah lalu merge. CI menerbitkan resep baru dan Flux menerapkannya.

Kubeconfig laptop bisa diambil ulang kapan saja (Git Bash, bukan PowerShell): `ssh portofolio-vps "sudo cat /etc/rancher/k3s/k3s.yaml" > ~/.kube/portofolio.yaml`. Di VPS, `kubectl` butuh `sudo` karena file itu hanya bisa dibaca root.
