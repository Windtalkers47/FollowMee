# FollowMee Developer Handbook

อัปเดตล่าสุด: 25 สิงหาคม 2026 (Asia/Bangkok) — closed-UAT readiness
สถานะ: **เอกสารหลักสำหรับเริ่มพัฒนาและส่งต่องาน**

อ่านไฟล์นี้ก่อนเริ่มงานทุกครั้ง แล้วเปิด runbook เฉพาะเมื่อกำลังทำ deployment หรือ database operation เท่านั้น เอกสารใน `docs/archive/` เป็นประวัติ ไม่ใช่ source of truth ปัจจุบัน

## 1. Product และสถานะปัจจุบัน

FollowMee เป็น full-stack workspace สำหรับจัดการลูกค้า งาน ตารางเวลา โปรไฟล์สาธารณะ การแจ้งเตือน analytics และ rewards ภายใต้สถาปัตยกรรมองค์กรเดียว สิทธิ์สำคัญยึด Owner, Creator, Assignee และ backend capabilities ไม่ใช้ Team scope

สถานะสำคัญล่าสุด:

- P1 ด้าน security, authorization, loading/error feedback และ production readiness ถูกแก้แล้ว
- Milestone 1 ทำ realtime reconciliation และ targeted cache updates โดยยังคง fallback ที่จำเป็นสำหรับ partial/ambiguous updates
- Schedule ถูกแยก controller, filters, mutation feedback, dialogs และ task list แบบ behavior-preserving แล้ว
- Customer list มี shared filter builder; `missingImage` ไม่หลุดเมื่อ pagination/refetch และ Analytics ใช้ predicate เดียวกัน
- `missing image` หมายถึง `customerImageUrl IS NULL OR customerImageUrl = ''` เท่านั้น ไม่รวม URL ที่โหลดไม่ได้
- ยังไม่มี mutation browser UAT บน disposable database ครบทุก workflow
- working tree อาจมี P1/M1 และ extraction changes ที่ยังไม่ commit ต้องตรวจ `git status` และ diff ก่อนแก้ทุกครั้ง

### Current checkpoint — 25 สิงหาคม 2026

- cleanup/documentation/tooling และ P1/M1 เดิมถูก checkpoint บน branch `develop` แล้ว (`a4c514f` และ commit ก่อนหน้า); งาน Profile Conversion รอบนี้เริ่มจาก clean tree และต้องรักษา checkpoint เหล่านั้น
- generated artifacts 407 ไฟล์ถูกถอนออกจาก Git index และไฟล์จริงถูกเก็บแบบ recoverable ใต้ `.local/`
- เอกสารปัจจุบันอยู่ที่ Handbook นี้; review, handoff และ validation รุ่นเก่าอยู่ใน `docs/archive/`
- Profile Conversion ใช้ ordered additive migrations `1850000000000`, `1851000000000`, `1852000000000`, `1853000000000` (custom-domain redirect preference) และ `1854000000000` (UAT access, privacy, capacity และ funnel); migration ใหม่ต้อง verify กับ temporary schema ก่อนและห้ามนำ mutation testไปใช้กับ `followmee`
- Closed UAT เพิ่ม migration `1854000000000` สำหรับ pending registration approval, versioned consent/privacy requests, product funnel และ capacity-alert dedupe; UAT startup ปฏิเสธ `DB_NAME=followmee`
- ยังคงห้ามใช้ `reset`, `checkout`, `clean` หรือการลบกว้างที่อาจย้อน checkpoint P1/M1
- verification ล่าสุดผ่าน: Backend 57 tests, Frontend 366 tests, typecheck, critical lint, build, bundle budget, docs check และ hygiene check

## 1.1 สิ่งที่ยังเหลือและลำดับที่แนะนำ

### A. ต้องทำก่อนเริ่ม structural refactor

1. ให้เจ้าของงานตรวจ diff และแบ่ง checkpoint ปัจจุบันเป็น commit/PR ที่ตั้งใจ โดยแยก cleanup/docs/tooling ออกจาก P1/M1 runtime changes
2. ตรวจว่า staged generated-file deletions และ `.local/` ที่ถูก ignore เป็นสิ่งที่ต้องการก่อน push
3. หลัง checkpoint แล้วรัน `npm run verify` บน branch ที่สะอาดอีกครั้ง

### B. งานพัฒนาถัดไป

1. **Schedule boundary follow-up** — ตรวจว่า controller/filter/list/dialog/mutation extraction ที่มีอยู่รักษา query keys, URL state, permissions และ realtime reconciliation ครบ แล้วค่อยย้ายเข้า feature boundary ทีละส่วน
2. **Customer feature boundary** — แยก page orchestration, header/stats, list/selection และ form/dialog โดยคง `customerListFilter` และ API contract เดิม
3. **Backend domain consolidation** — เริ่ม Customers/Analytics ก่อน แล้วค่อยแยก `task.service.ts` เป็น query, command/workflow และ realtime coordination
4. **Error/translation polish** — เพิ่ม next action ให้ permission/conflict/network errors และเก็บข้อความอังกฤษคงที่ใน bulk/smart-suggestion flows
5. **Disposable database verification** — ตั้ง `followmee_e2e` ที่ disposable อย่างชัดเจน แล้วทำ mutation E2E, multi-tab realtime soak และ production-like restore drill

### C. งานที่ไม่ควรทำในรอบเดียวกับข้อ A/B

- visual redesign ใหญ่หรือเพิ่ม feature ใหม่
- เปลี่ยน REST route, Socket.IO event, permission model, query-key naming หรือ database schema
- ย้ายทั้ง Backend/Frontend tree แบบ big-bang
- browser mutation UAT บน `followmee`

## 2. Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Material UI, Redux Toolkit, TanStack Query |
| Backend | Node.js, Express, TypeScript, TypeORM, Socket.IO |
| Database | MySQL 8+/MariaDB local, TiDB Cloud production |
| Tests | Vitest, Jest, Supertest, Playwright |
| Delivery | GitHub, GitHub Actions, Render, Vercel |
| Media/email/push | Cloudinary, SMTP/SendGrid compatibility, Web Push/VAPID |

Node.js 20+ เป็น baseline ของ CI ปัจจุบัน ส่วน Render กำหนด Node.js 22

## 3. Project map

```text
FollowMee/
├─ Backend/                 Express API, domain services, TypeORM และ migrations
│  ├─ src/config/           database, security, Swagger และ runtime config
│  ├─ src/controllers/      HTTP boundary; parse request และ map response
│  ├─ src/services/         business rules และ transaction coordination
│  ├─ src/repositories/     database queries
│  ├─ src/entities/         TypeORM entities
│  ├─ src/routes/           REST routes และ middleware composition
│  ├─ src/migrations/       immutable ordered migration history
│  └─ src/__tests__/        unit/contract/integration tests
├─ Frontend/                React application
│  ├─ src/pages/            route entry/orchestration
│  ├─ src/components/       reusable and extracted UI boundaries
│  ├─ src/hooks/            controller/query hooks
│  ├─ src/api/              canonical feature API adapters during transition
│  ├─ src/services/         infrastructure and compatibility adapters
│  ├─ src/lib/api/          canonical shared HTTP client
│  ├─ src/store/            Redux store/slices
│  ├─ src/utils/            pure shared helpers
│  └─ src/__tests__/        unit/characterization tests
├─ database/                canonical clean schema and database notes
├─ docs/                    current handbook and operational runbooks
├─ e2e/                     Playwright specifications; may mutate only disposable DB
├─ scripts/                 repository-level verification/maintenance scripts
├─ .local/                  ignored logs, reports, backups and DB sandboxes
└─ package.json             cross-platform root commands
```

ทิศทางระยะยาวของ Frontend คือ `app / features / shared / lib`; Backend จะรวม controller/service/repository/DTO/tests ตาม domain ทีละ feature การย้ายต้องทำหลัง current behavior มี characterization tests และห้ามทำ big-bang move

## 4. Request และ realtime flow

```text
React page/component
  → feature hook/controller
  → API adapter + shared HTTP client
  → Express route + auth/permission middleware
  → controller
  → service/business rule
  → repository/TypeORM
  → MySQL/TiDB
```

เมื่อ mutation สำเร็จ backend อาจส่ง Socket.IO domain event กลับมา Frontend จะ patch/invalidate cache ตาม canonical query keys ห้ามเปลี่ยน event name, payload compatibility, query-key naming หรือ broad invalidation โดยไม่มี characterization tests

## 5. Development conventions

- REST route และ response contract เป็น public compatibility boundary
- Authorization ตัดสินที่ backend เสมอ; UI capabilities ใช้เพื่อ presentation เท่านั้น
- Controller รับผิดชอบ HTTP parsing/response ไม่ควรถือ business rule ซ้ำกับ service
- Query ที่ใช้ซ้ำหรือมี semantic สำคัญให้มี helper/predicate กลาง เช่น missing customer image
- Frontend page ควรเหลือ orchestration; state/query/mutation/dialog/list แยกเป็น testable boundaries
- Shared HTTP behavior อยู่ที่ `Frontend/src/lib/api/client.ts`; `src/api/config.ts` และ `src/services/api.ts` เป็น compatibility entrypoints ระหว่างการย้าย
- ใช้ `@/` สำหรับ frontend imports ใหม่ หลีกเลี่ยง path ข้าม feature โดยตรง
- Translation key เป็น compatibility boundary; ห้าม hard-code user-facing copy หากมี i18n
- URL filter/deep-link ต้อง round-trip ได้ และ pagination/refetch ต้องรักษา filter เดิม
- Realtime mutation ต้องตอบสนองทันที แต่ยังเก็บ refetch fallback สำหรับ partial failure, aggregate หรือ unknown later pages

## 6. Local development

### Prerequisites

- Node.js 20+
- npm
- MySQL 8+ หรือ MariaDB 10.6+
- Git

### Install

```powershell
Copy-Item Backend/.env.example Backend/.env
Copy-Item Frontend/.env.example Frontend/.env
npm run install:all
```

กรอกค่าใน `.env` ภายในเครื่องเท่านั้น ห้าม commit ไฟล์จริง

### Start

```powershell
npm run doctor:db
npm start
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health: `http://localhost:5000/health`

`localhost:5173` เป็น Vite SPA และใช้ตรวจ dynamic SEO/social HTML ไม่ได้ เมื่อต้องทดสอบ Vercel Function, rewrite และ raw metadata ให้ build frontendแล้วใช้ `npm run start:ssr` หรือ Vercel preview จากนั้นตรวจ source โดยไม่รัน JavaScript

`npm start` เรียก DB doctor ก่อน หากพบ pending migration ให้หยุด ตรวจ backup/runbook และอย่ารัน migration โดยเดา

## 7. Environment matrix

### Backend

| Group | Variables | Notes |
|---|---|---|
| Runtime | `NODE_ENV`, `PORT` | production ใช้ค่าจาก Render |
| Database | `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | secret เฉพาะ server |
| TLS/pool | `DB_SSL`, `DB_SSL_CA_BASE64`, `DB_POOL_SIZE`, `DB_CONNECT_TIMEOUT_MS` | TiDB production ต้องใช้ TLS |
| Auth | `JWT_SECRET`, `JWT_EXPIRES_IN`, `ALLOW_PUBLIC_REGISTRATION`, `INVITATION_SECRET` | secrets อยู่ใน Render เท่านั้น |
| Browser origins | `FRONTEND_URL`, `CORS_ORIGIN`, `CORS_PREVIEW_ORIGINS` | exact origins; comma-separated previews |
| Media | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | API secret ห้ามอยู่ frontend |
| Email | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | `SMTP_PASS` คือชื่อ runtime ที่ถูกต้อง |
| Push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL` | private key เป็น server secret |
| Privacy | `PROFILE_ANALYTICS_SALT` | ต้องตั้งใน production |
| Profile conversion | `PROFILE_LEAD_RATE_LIMIT` | จำกัด lead ต่อ IP/profile window; ค่าเริ่มต้น 8 |
| Custom domains | `PROFILE_CUSTOM_DOMAINS_ENABLED`, `VERCEL_ACCESS_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | ปิด flag ไว้จน deploy Phase 3; token เป็น server secret |
| Closed UAT | `PRIVACY_POLICY_VERSION`, `PRIVACY_CONTROLLER_*`, `TURNSTILE_SECRET_KEY` | จำเป็นเมื่อ production runtime เปิด self-signup; signup ต้อง verify email และรอ Owner |
| Capacity | `TIDB_STORAGE_LIMIT_BYTES`, provider dashboard URLs, `CAPACITY_CHECK_INTERVAL_MS` | แจ้งเฉพาะ metric ที่วัดได้จริง; provider-only quota ไม่สร้างเปอร์เซ็นต์ |
| Safety | `REWARD_DEV_SEED`, `ENABLE_API_DOCS`, rate/body/retry variables | production ใช้ `REWARD_DEV_SEED=false` |

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | REST base URL; required in production |
| `VITE_WS_URL` | Socket.IO base URL; required in production |
| `VITE_APP_NAME` | display/application header value |
| `VITE_NODE_ENV` | compatibility environment label |
| `VITE_DEFAULT_LOGIN_REDIRECT` | post-login route |
| `VITE_DEFAULT_LOGOUT_REDIRECT` | post-logout route |
| `VITE_ENCRYPTION_KEY` | request-obfuscation compatibility value ไม่ใช่ secret |
| `VITE_FEATURE_REGISTRATION`, `VITE_TURNSTILE_SITE_KEY` | เปิด UAT self-signup และ human verification |
| `VITE_PRIVACY_CONTROLLER_*` | ข้อมูลผู้ควบคุมข้อมูลที่เปิดเผยบน Privacy Notice |

ค่าที่ขึ้นต้น `VITE_` ถูก bundle และผู้ใช้ browser อ่านได้ ห้ามใส่ database password, JWT secret, Cloudinary secret, SMTP password หรือ TiDB connection string

### Test

- `.env.e2e.example` ใช้เฉพาะ QA identities
- `followmee_e2e` เป็นฐาน disposable สำหรับ seed/reset/integration/mutation E2E
- ห้ามตั้ง E2E target เป็น `followmee`

## 8. Database safety

| Database | Allowed operations |
|---|---|
| `followmee` local/real | read-only diagnosis, application use, reviewed additive migration หลัง backup |
| `followmee_e2e` | reset, seed, integration, mutation browser tests และ clean-schema verification |
| TiDB production | controlled additive migration ตาม production runbook เท่านั้น |

กฎถาวร:

- `synchronize` ต้องเป็น `false`
- ห้าม reset/drop/seed/mutation test บน `followmee`
- `database/followmee-clean-schema.sql` ใช้สร้างฐานว่างเท่านั้น ห้ามรันบนฐานที่มีข้อมูล
- TiDB Starter ต้องเพิ่มคอลัมน์ที่อ้างตำแหน่ง `AFTER` กันแบบแยก `ALTER TABLE` ทีละคอลัมน์; ห้ามรวมคอลัมน์ใหม่และอ้างคอลัมน์นั้นใน statement เดียว
- migration source เป็น immutable operational history ห้ามลบหรือแก้ migration ที่เคยใช้งานแล้ว
- production migration ต้องมี backup, checksum, restore drill และ maintenance/read-only window
- ใช้ [database README](../database/README.md) และ [production migration runbook](PRODUCTION_MIGRATION_RUNBOOK.md) ก่อน database operation

## 9. Git, CI และ deployment

### Git workflow

1. `develop` เป็น integration branch
2. สร้าง feature/fix branch จาก `develop`
3. เปิด PR และให้ CI ผ่าน
4. รวมงานกลับ `develop`
5. เปิด release PR จาก `develop` ไป `main`
6. `main` เป็น production source สำหรับ Render/Vercel

ห้าม reset/drop uncommitted work ของผู้อื่น ตรวจ `git status`, `git diff` และ untracked files ก่อนแก้เสมอ

### GitHub Actions

CI ติดตั้ง root/Backend/Frontend dependencies แล้วเรียก `npm run verify` จากนั้นใช้ `followmee_e2e` สำหรับ integration และ critical Playwright paths

### Render

- root directory: `Backend`
- branch: `main`
- build: `npm ci && npm run build`
- start: `npm run migration:run:prod && npm run start`
- `/health` เป็น health check
- secrets/TiDB credentials ตั้งใน Render environment เท่านั้น

### Vercel

- root directory: `Frontend`
- production branch: `main`
- PR branches ใช้ preview deployment
- build: `npm run build`
- output: `dist`
- `/p/:slug` rewrite ไป Vercel Function `api/profile.ts` เพื่อ inject metadata/initial payload โดย URL ไม่เปลี่ยน; route อื่นใช้ SPA fallback
- Function ต้องอ่าน `dist/index.html`; metadata fetch ไม่สร้าง view event และ OG image ใช้ `api/profile-og.ts` ส่ง PNG 1200×630 ผ่าน `@vercel/og`

หลัง Vercel URL เปลี่ยน ต้องอัปเดต Render `FRONTEND_URL`, `CORS_ORIGIN` และ preview allowlist ตามความจำเป็น ดู [deployment guide](../DEPLOYMENT_GUIDE.md)

UAT แบบแยก environment ใช้ [closed-UAT runbook](UAT_DEPLOYMENT_RUNBOOK.md), `render.uat.yaml` และฐาน TiDB disposable เท่านั้น `npm run start:uat` ตรวจ database/feature/config ก่อน migration และปฏิเสธฐานชื่อ `followmee`

### Profile Conversion rollout

1. deploy additive migration ก่อนเปิด UI/capability ที่พึ่ง schema ใหม่
2. Phase 1 เปิด landing, quick-create, metadata และ Lead Inbox; lead ที่ไม่ convert ถูก anonymize หลัง 12 เดือนโดย retention worker
3. Phase 2 ใช้ link checker แบบ SSRF-safe, revision/restore, scheduling, merge และ CSV preview; network warning ต้อง acknowledge ก่อน publish
4. Phase 3 ตั้ง Vercel server secrets แล้วจึงเปลี่ยน `PROFILE_CUSTOM_DOMAINS_ENABLED=true`; Owner เท่านั้นที่เพิ่ม/verify/canonical/remove domain
5. mutation/integration/E2E ทั้งหมดใช้ `followmee_e2e` เท่านั้น; metadata/unit tests ต้องไม่แตะฐานข้อมูล

## 10. Standard verification

```powershell
npm run hygiene:check
npm run docs:check
npm run test:backend
npm run test:frontend
npm run typecheck
npm run lint
npm run build
npm run test:bundle
git diff --check
```

ใช้ `npm run verify` เพื่อเรียกชุดหลักทั้งหมด Mutation browser tests ไม่รวมอยู่ใน verify เพราะต้องมี disposable database และ explicit seeded environment

## 11. Troubleshooting

- `doctor:db` ขึ้น `ECONNREFUSED`: เปิด MySQL/MariaDB และตรวจ port/credentials; ไม่ต้อง reset schema
- pending migrations: หยุด app, อ่าน migration list, backup และใช้ runbook
- CORS: ตรวจ exact `FRONTEND_URL`, `CORS_ORIGIN`, preview origins และ trailing slash
- WebSocket offline/reconnecting: ตรวจ `VITE_WS_URL`, backend availability, CORS และ auth cookie ก่อนแก้ cache logic
- production frontend build ล้ม: `VITE_API_URL` และ `VITE_WS_URL` ต้องมีค่า
- หน้าเว็บใช้ endpoint เก่า: Vite env ถูกฝังตอน build ต้อง redeploy หลังแก้ env
- Linux/CI หา directory ไม่เจอ: ใช้ชื่อ `Backend` และ `Frontend` ตามตัวพิมพ์จริง หรือ root npm scripts
- test report หาไม่พบ: generated output อยู่ใต้ `.local/test-artifacts/` และไม่เข้า Git

## 12. Checklist ก่อนเริ่มและก่อนส่งงาน

ก่อนเริ่ม:

1. อ่านไฟล์นี้
2. ตรวจ `git status --short`, diff และ branch
3. อ่านไฟล์เฉพาะ feature ที่จะแก้
4. รัน baseline tests ที่เกี่ยวข้อง
5. ยืนยันว่าจะไม่แตะฐานจริงด้วย destructive operation

ก่อนส่ง:

1. ตรวจว่า API, permissions, query keys, URL state และ events ไม่เปลี่ยนโดยไม่ตั้งใจ
2. รัน targeted tests และ `npm run verify`
3. รัน `git diff --check`
4. ตรวจว่าไม่มี `.env`, logs, database files หรือ generated reports เข้า Git
5. อัปเดต Handbook เมื่อ architecture, env, commands หรือ deployment เปลี่ยน

## 13. Future Codex session bootstrap

สำหรับ session ใหม่ ไม่ต้องส่ง review/handoff เก่าทั้งหมด ให้ส่ง prompt นี้แล้วระบุงานที่ต้องการต่อท้าย:

```text
โปรเจกต์ FollowMee อยู่ที่ C:\PAom\FollowMee

อ่าน docs/DEVELOPER_HANDBOOK.md ก่อนเริ่มงาน แล้วตรวจ:
- git status --short
- git diff และ staged diff
- branch/current checkpoint
- baseline tests ที่เกี่ยวข้องกับงาน

รักษา uncommitted P1/M1 และ cleanup changes เดิม ห้าม reset, checkout, clean,
drop, seed, migrate หรือเขียนข้อมูลทดสอบลงฐาน followmee
ใช้ followmee_e2e/disposable database เท่านั้นสำหรับ mutation หรือ E2E
คง REST routes, request/response contracts, Socket.IO event names, permissions,
query keys, URL state และ realtime reconciliation เว้นแต่ฉันสั่งเปลี่ยนโดยตรง
ก่อนส่งงานให้รัน targeted tests, npm run verify และ git diff --check
หากเปลี่ยน architecture, env, command, deployment หรือ database policy
ให้อัปเดต docs/DEVELOPER_HANDBOOK.md ในงานเดียวกัน

งานที่ต้องทำต่อ: <เขียนงานหนึ่งเรื่องที่ต้องการ เช่น Schedule boundary follow-up>
```

ถ้าเป็นงาน database/deployment ให้เปิด `database/README.md`, `DEPLOYMENT_GUIDE.md` หรือ `docs/PRODUCTION_MIGRATION_RUNBOOK.md` เฉพาะไฟล์ที่เกี่ยวข้อง ไม่ต้องอ่าน archive ทั้งหมด

## 14. Documentation maintenance

อัปเดตไฟล์นี้เมื่อเปลี่ยน architecture, public contract, env, scripts, database policy, Git flow หรือ deployment provider อัปเดต runbook เมื่อขั้นตอน operational เปลี่ยน และย้าย status/handoff แบบมีวันที่เข้า archive เมื่อถูกแทนที่แล้ว
