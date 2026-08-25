# FollowMee Session Handoff — 2026-08-13

## วิธีใช้ไฟล์นี้

ไฟล์นี้สรุปสถานะล่าสุดสำหรับเปิดงานต่อใน session ใหม่ โปรดอ่านไฟล์นี้ก่อนเริ่มแก้โค้ด และอ่านร่วมกับ:

1. `FOLLOWMEE_SESSION_HANDOFF_20260811.md`
2. `FOLLOWMEE_PROJECT_RECAP_20260805.md`

## สถานะล่าสุด

- โปรเจกต์: `C:\PAom\FollowMee`
- ระบบเป็นองค์กรเดียว ไม่มี Team domain
- ห้าม reset/drop/seed หรือเขียนข้อมูลทดสอบลงฐานหลัก `followmee`
- Destructive integration ใช้เฉพาะ `followmee_e2e`
- Migration ต้อง additive และต้องอัปเดต clean schema หากมี migration ใหม่
- Worktree มี source changes ที่ตั้งใจเก็บไว้ ยังไม่ได้ commit; ห้ามใช้ `git reset --hard` หรือ checkout ทับงานเหล่านี้

## งานที่ทำเสร็จในรอบล่าสุด

### Customer reliability

- แก้ request lifecycle ให้แยก aborted, transient และ HTTP failure
- retry network/502/503/504 จำกัดหนึ่งครั้ง
- รักษาข้อมูลลูกค้าชุดล่าสุดระหว่าง refresh/error
- เพิ่ม request ID ใน failure response/logging
- แก้ปัญหา Customer API ได้ `304 Not Modified` แล้ว frontend แสดง empty state ทั้งที่มีข้อมูล:
  - Backend customer routes ส่ง `Cache-Control: no-cache, no-store`
  - Frontend Customer GET ใช้ `cache: 'no-store'`
  - 304 ถูกจัดเป็น retryable response
- เพิ่ม regression tests สำหรับ abort, stale list, stats failure, request ID และ 304 → 200

### Dashboard / My Work / Rewards

- Dashboard ใช้ reward translation resolver และไม่แสดง raw key เช่น `rewards.badge.runnerUp`
- เพิ่ม badge translations champion, runner-up และ third place ทั้งไทย/อังกฤษ
- My Work รวม Saved views, Save current view และ Blocked ให้อยู่ใน toolbar เดียวกัน
- Rewards เพิ่ม guided empty state, Earn/Redeem/Leaderboard/Manage labels และคำอธิบายคะแนน
- Rewards ใช้ backend capability `MANAGE_REWARDS` แทน frontend role shortcut
- Reward summary เพิ่ม `capabilities.canManageRewards` แบบ additive

### Analytics

- เพิ่ม previous-period metrics ใน analytics overview แบบ backward-compatible
- ปรับ Analytics เป็น action-first
- เพิ่ม compact period toolbar แยกเป็น `Frontend/src/components/AnalyticsPeriodToolbar.tsx`
- เพิ่ม Work health summary แยกเป็น `Frontend/src/components/AnalyticsInsightSummary.tsx`
- คง presets 7/30/90/เดือนนี้ และ custom date range
- Work health แสดง completion, trend, blocked, on-time/first-pass และ Review work
- zero-data state ไม่แสดง `0%` แบบไร้บริบท
- คง scope, tabs, export CSV, query keys และ backend API เดิม

### Registration / Invite

- Production registration flag ตั้งเป็น false
- Production เป็น invite-only
- `/register?invite=...` ยังคงใช้ได้ และ backend ล็อก email/role ตาม invitation
- Dev public registration เปิดได้เมื่อ feature flag เปิด และผู้สมัครเองได้ Member เสมอ
- User Management แปลสถานะ invitation pending/accepted/expired/revoked

## Verification ล่าสุด

- Frontend build: ผ่าน
- Backend build: ผ่าน
- Backend unit tests: 40 tests ผ่าน
- Frontend full suite รอบล่าสุด: 261 tests ผ่าน; 2 suites ไม่สามารถ collect ได้เพราะ Windows `EMFILE` file-handle limit ระหว่างโหลด MUI icon modules ไม่ใช่ assertion failure
- Targeted Analytics UX test: ยังถูก `EMFILE` ขัดขวางก่อนเริ่ม test
- Targeted ESLint สำหรับ Analytics components/page: ผ่าน
- `git diff --check`: ผ่าน
- `npm run doctor:db`: ผ่าน และยืนยันฐาน `followmee` พร้อม ไม่มี pending migration
- ไม่มีการ reset/drop/seed หรือ migration ในรอบนี้

## สิ่งที่ควรทำต่อใน session ถัดไป

1. อ่าน handoff นี้และไฟล์ handoff/recap รุ่นก่อน
2. ตรวจ `git status --short` และอย่าทับ uncommitted changes
3. แก้/ทดสอบปัญหา Windows `EMFILE` โดยไม่ปิด process ของผู้ใช้แบบกว้าง ๆ; ใช้ test command ที่ลด module loading หรือจัดการ process ของ test runner ที่สร้างโดยงานนี้เท่านั้น
4. รัน Analytics UX tests ให้ผ่านจริง และตรวจ visual ที่ 1440×900, 1280×800, 768×1024, 390×844 ทั้งไทย/อังกฤษ
5. ตรวจว่า Work health summary และ period toolbar ไม่มี horizontal overflow และ keyboard focus ถูกต้อง
6. รัน Frontend full tests, Frontend/Backend build, targeted ESLint และ `git diff --check`
7. ตรวจ `doctor:db` แบบ read-only ก่อน handoff รอบถัดไป

## ข้อควรระวัง

- อย่าเปลี่ยน public API, database, permission model หรือเพิ่ม Team domain โดยไม่มีแผนใหม่
- อย่าใช้ `isOwner` หรือ role shortcut แทน backend capabilities ใน feature ใหม่
- อย่าถือว่า 304 response มี JSON body
- อย่าแสดง empty state เมื่อ request ล้มเหลวหรือถูก abort; empty state ใช้เมื่อ successful response ระบุ `total === 0` เท่านั้น
- อย่าแก้หรือ seed ฐาน `followmee`; หากต้องการ destructive test ให้ใช้ `followmee_e2e`

## ข้อความสำหรับเริ่ม session ใหม่

คัดลอกข้อความนี้ไปเปิด session ใหม่ได้เลย:

> โปรเจกต์ FollowMee อยู่ที่ `C:\PAom\FollowMee` กรุณาอ่าน `FOLLOWMEE_SESSION_HANDOFF_20260813.md`, `FOLLOWMEE_SESSION_HANDOFF_20260811.md` และ `FOLLOWMEE_PROJECT_RECAP_20260805.md` ก่อนเริ่มงาน จากนั้นตรวจ `git status --short`, `git log -5 --oneline`, `npm run doctor:db` แบบ read-only และผลทดสอบล่าสุดใน `test-results/.last-run.json` ห้าม reset/drop/seed หรือเขียนข้อมูลทดสอบลงฐาน `followmee`; ใช้ `followmee_e2e` เฉพาะ destructive test และห้ามทับ uncommitted changes ที่มีอยู่
>
> งานต่อจาก handoff: ตรวจและทำให้ `Frontend/src/__tests__/components/AnalyticsUx.test.tsx` ผ่านจริง หลังจากตอนนี้ถูก Windows `EMFILE` ขัดขวางระหว่างโหลด MUI modules ให้ตรวจ visual/UAT หน้า Analytics ที่ desktop/tablet/mobile ทั้งไทยและอังกฤษ โดยเน้น compact period toolbar, Work health summary, keyboard focus และ horizontal overflow จากนั้นรัน Frontend/Backend build, full tests, targeted ESLint และ `git diff --check` พร้อมสรุปไฟล์ที่แก้และข้อจำกัดที่เหลือ
