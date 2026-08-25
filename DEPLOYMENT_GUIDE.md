# FollowMee Deployment Guide

อัปเดตล่าสุด: 17 สิงหาคม 2026
Production flow: **GitHub `main` → Render Backend + Vercel Frontend → TiDB Cloud**

อ่าน [Developer Handbook](docs/DEVELOPER_HANDBOOK.md) และ [production migration runbook](docs/PRODUCTION_MIGRATION_RUNBOOK.md) ก่อน deployment ที่มี migration

## Safety rules

- `main` เป็น production branch; งานพัฒนาเข้า `develop` ผ่าน feature PR ก่อน แล้วใช้ release PR ไป `main`
- ห้ามใส่ credentials, tokens, connection strings หรือค่าจาก `.env` จริงใน Git/เอกสาร
- ห้ามใช้ local schema export/import เป็น production update workflow ปกติ
- production schema เปลี่ยนด้วย reviewed additive TypeORM migrations เท่านั้น
- `database/followmee-clean-schema.sql` ใช้สร้างฐานว่าง ไม่ใช้กับ TiDB/ฐานที่มีข้อมูล
- ก่อน migration ต้อง backup, checksum และ restore drill ตาม runbook

## 1. TiDB Cloud

สร้าง database/cluster ตามนโยบายของบัญชี production และเลือก region ใกล้ Render จากหน้า Connect ของ TiDB ให้นำค่าต่อไปนี้ไปเก็บเป็น Render secrets:

- `DB_HOST`
- `DB_PORT` (TiDB Cloud มักใช้ `4000`; ยึดค่าจากหน้า Connect)
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL=true`
- `DB_SSL_CA_BASE64` เมื่อ connection profile ต้องใช้ CA ที่กำหนด

อย่านำค่าเหล่านี้ไปใส่ Vercel หรือ `VITE_*`

สำหรับฐานใหม่ให้ใช้กระบวนการ bootstrap ที่ผ่านการตรวจสอบแยกจาก deployment ปกติ หลังฐานมีข้อมูลแล้วให้ใช้ migration เท่านั้น

## 2. Render Backend

ค่าหลักถูกประกาศใน [render.yaml](render.yaml):

- service: `followmee-backend`
- branch: `main`
- root directory: `Backend`
- build: `npm ci && npm run build`
- start: `npm run migration:run:prod && npm run start`
- health check: `/health`

Render environment ต้องมีอย่างน้อย:

```text
NODE_ENV=production
REWARD_DEV_SEED=false
DB_HOST=<tidb-host>
DB_PORT=<tidb-port>
DB_USERNAME=<tidb-user>
DB_PASSWORD=<tidb-password>
DB_NAME=<production-database>
DB_SSL=true
JWT_SECRET=<server-secret>
JWT_EXPIRES_IN=24h
INVITATION_SECRET=<server-secret>
PROFILE_ANALYTICS_SALT=<server-secret>
PROFILE_LEAD_RATE_LIMIT=8
PROFILE_CUSTOM_DOMAINS_ENABLED=false
FRONTEND_URL=https://<production-vercel-domain>
CORS_ORIGIN=https://<production-vercel-domain>
CORS_PREVIEW_ORIGINS=https://<approved-preview-domain-1>,https://<approved-preview-domain-2>
```

เพิ่ม Cloudinary, email และ VAPID variables ตาม feature ที่เปิดใช้ โดยใช้ชื่อจาก `Backend/.env.example`; SMTP password ใช้ชื่อ `SMTP_PASS`

Custom domain เปิดหลัง migration และ Phase 3 verification เท่านั้น โดยตั้ง `VERCEL_ACCESS_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` เป็น Render server secrets แล้วเปลี่ยน `PROFILE_CUSTOM_DOMAINS_ENABLED=true` ห้ามนำ token ไปไว้ในตัวแปร `VITE_*`

`migration:run:prod` เป็น data-preserving migration command แต่ยังต้องปฏิบัติตาม runbook ทุกครั้งที่ release มี pending migration ห้ามให้หลาย instance แข่งกัน run migration

## 3. Vercel Frontend

ตั้ง project:

- production branch: `main`
- root directory: `Frontend`
- framework: Vite
- build: `npm run build`
- output: `dist`

Production environment:

```text
VITE_APP_NAME=FollowMee
VITE_NODE_ENV=production
VITE_API_URL=https://<render-backend-domain>/api
VITE_WS_URL=https://<render-backend-domain>
VITE_DEFAULT_LOGIN_REDIRECT=/dashboard
VITE_DEFAULT_LOGOUT_REDIRECT=/
VITE_ENCRYPTION_KEY=<non-secret-compatibility-value>
```

ค่าที่ขึ้นต้น `VITE_` เป็นข้อมูลสาธารณะที่ bundle ใน browser `VITE_ENCRYPTION_KEY` ไม่ใช่ secret และไม่แทน TLS/server authentication

`Frontend/vercel.json` rewrite `/p/:slug` ไป `api/profile.ts` เพื่อสร้าง server-rendered title/canonical/OG/Twitter/robots และใช้ SPA fallback สำหรับ route อื่น Function ต้อง include `dist/index.html` และเข้าถึง `VITE_API_URL` ตอน deploy; PR deployment ใช้เป็น preview ได้ แต่ backend ต้อง allow เฉพาะ origin ที่อนุมัติ

## 4. Release flow

1. รวม feature PR เข้า `develop`
2. รัน `npm run verify` และตรวจ CI
3. สร้าง release PR จาก `develop` ไป `main`
4. หากมี migration ให้ทำ backup/restore drill และ maintenance coordination ก่อน merge; deploy ordered migration ของ Phase 1 (`1850000000000`), Phase 2 (`1851000000000`) และ Phase 3 (`1852000000000`) ก่อนเปิด capability/flag ของเฟสนั้น
5. Merge เมื่อ CI และ operational checklist ผ่าน
6. Render และ Vercel deploy จาก `main`
7. ตรวจ Render migration/start logs และ `GET /health`
8. ตรวจ frontend load, auth, REST, Socket.IO connection และ critical read-only flows
9. Mutation smoke/UAT ใช้เฉพาะ approved disposable/staging environment; ห้ามทดสอบด้วยข้อมูลจริงโดยไม่มีกระบวนการที่อนุมัติ

## 5. Verification

```powershell
npm run verify
git diff --check
```

หลัง deploy:

- Backend health ตอบสำเร็จ
- Vercel ใช้ API/WS URL ของ release ปัจจุบัน
- CORS ยอมรับ production origin และ reject lookalike origins
- Socket.IO แสดง Connected และ reconnect ได้
- migration ledger ไม่มี pending migration ที่ไม่ตั้งใจ
- logs ไม่มี secrets หรือ customer data

## Troubleshooting

- CORS error: ตรวจ exact origin, protocol, trailing slash และ preview allowlist
- WebSocket error: ตรวจ `VITE_WS_URL`, Render availability, CORS และ auth cookie
- Database connection error: ตรวจ TiDB host/port/TLS/CA และ Render secrets โดยไม่พิมพ์ค่า secret ลง log
- Frontend ยังเรียก URL เก่า: Vite env ถูกฝังตอน build ต้อง redeploy
- Render migration ล้ม: หยุด writes/instances ตาม runbook อย่า reset schema และอย่ารัน clean schema
- Render cold start: รอ `/health` พร้อมก่อนสรุปว่า frontend/API ผิด
