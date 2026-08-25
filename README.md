# FollowMee

Full-stack workspace สำหรับจัดการลูกค้า งาน ตารางเวลา โปรไฟล์สาธารณะ การแจ้งเตือน Analytics และ Rewards

อ่าน [Developer Handbook](docs/DEVELOPER_HANDBOOK.md) ก่อนเริ่มพัฒนา เอกสารนี้เป็น quick start เท่านั้น

## Stack

- Frontend: React 19, TypeScript, Vite, Material UI, Redux Toolkit, TanStack Query
- Backend: Node.js, Express, TypeScript, TypeORM, Socket.IO
- Database: MySQL/MariaDB local และ TiDB Cloud production
- Delivery: GitHub Actions, Render และ Vercel

## Quick start

ต้องมี Node.js 20+, npm, Git และ MySQL 8+/MariaDB 10.6+

```powershell
Copy-Item Backend/.env.example Backend/.env
Copy-Item Frontend/.env.example Frontend/.env
npm run install:all
npm run doctor:db
npm start
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

ห้าม commit `.env` จริง และห้าม reset/drop/seed หรือทำ mutation test บนฐาน `followmee`

## คำสั่งหลัก

```powershell
npm start                 # DB doctor + Backend + Frontend
npm run test:backend
npm run test:frontend
npm run typecheck
npm run lint
npm run build
npm run verify            # hygiene + docs + tests + types + lint + build + bundle
```

E2E ที่มี mutation ต้องใช้ `followmee_e2e` เท่านั้น ดูรายละเอียดใน Developer Handbook

## Project map

```text
Backend/      API, business rules, TypeORM และ migrations
Frontend/     React application
database/     canonical clean schema และ database notes
docs/         handbook, runbooks และ archive
e2e/          Playwright tests สำหรับ disposable environment
scripts/      repository verification และ maintenance
.local/       ignored local logs/reports/backups/database sandboxes
```

## เอกสารสำคัญ

- [Developer Handbook](docs/DEVELOPER_HANDBOOK.md)
- [Documentation index](docs/README.md)
- [Deployment guide](DEPLOYMENT_GUIDE.md)
- [Database notes](database/README.md)
- [Production migration runbook](docs/PRODUCTION_MIGRATION_RUNBOOK.md)

Git workflow หลักคือ `develop → feature/PR → develop → release PR → main` โดย `main` เป็น production source ของ Render และ Vercel
