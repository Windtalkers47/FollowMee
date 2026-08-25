# FollowMee Frontend

React 19 + TypeScript + Vite application สำหรับ FollowMee

เริ่มจาก [Developer Handbook](../docs/DEVELOPER_HANDBOOK.md) เพื่อดู architecture, env, API/realtime conventions, tests และ deployment

## Commands

```powershell
npm install
npm run dev
npm run test:run
npm run typecheck
npm run lint
npm run build
```

จาก repository root ให้ใช้ `npm run test:frontend`, `npm run typecheck`, `npm run lint` และ `npm run build`

## Runtime configuration

คัดลอก `.env.example` เป็น `.env` แล้วตั้ง `VITE_API_URL` และ `VITE_WS_URL` ค่า `VITE_*` ทั้งหมดถูก bundle ไปยัง browser จึงห้ามเก็บ server secrets

## Structure

- `src/pages`: route entry และ orchestration
- `src/components`: shared/extracted UI boundaries
- `src/hooks`: controller/query hooks
- `src/api`: canonical feature API adapters ระหว่างการปรับโครงสร้าง
- `src/services`: infrastructure และ compatibility adapters
- `src/lib/api`: canonical shared HTTP client
- `src/store`: Redux state
- `src/i18n`: translation catalog
- `src/__tests__`: Vitest characterization/unit tests

ทิศทางระยะยาวคือ `app / features / shared / lib` โดยย้ายทีละ feature และคง REST routes, permissions, query keys, URL state, translations และ Socket.IO contracts เดิม
