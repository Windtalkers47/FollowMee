# FollowMee Project Recap

อัปเดต: 2026-08-05 (Asia/Bangkok)

ไฟล์นี้เป็นสรุปสถานะสำหรับเริ่มงานต่อใน Codex session อื่น โดยให้เปิดไฟล์นี้ก่อน แล้วตรวจ `git status`, `git log` และผลทดสอบล่าสุดก่อนแก้โค้ด

## ภาพรวมผลิตภัณฑ์ที่ล็อกแล้ว

FollowMee เป็น internal work-management web app สำหรับองค์กรเดียว ผู้ใช้ทุกคนทำงานร่วมกัน ไม่มี Team domain และไม่มีการ publish ไป Facebook/Instagram/TikTok ในรุ่นนี้

- Customers และ Profile Cards ใช้สิทธิ์ตาม `creator`, `assignee` และ `Owner`
- ทุกคนสร้างและดู Customer ได้
- Creator และ assignee แก้ข้อมูลที่รับผิดชอบได้
- การ assign/reassign, publish/unpublish และ delete เป็นสิทธิ์ของ creator หรือ Owner
- Owner เป็นผู้ override ระดับองค์กรเพียงบทบาทเดียว
- Admin/Moderator ดูแลระบบตาม permission แต่ไม่มีสิทธิ์ override ข้อมูลเพียงเพราะชื่อ role
- Published Tasks เห็นได้ทั้งองค์กร; Draft เห็นเฉพาะ creator และ Owner
- Task มี assignee หลักหนึ่งคน; watchers รับ notification แต่ไม่ได้สิทธิ์แก้ไขเพิ่ม
- Completed Work เป็นฟีดผลงานภายใน พร้อม comment/reaction/rewards

## ทำเสร็จแล้ว

### Product และ UX

- Task workflow: Draft → To do → In progress → Review → Done
- My Work, Schedule, Task Detail, Review/Approve/Request changes, cancel และ realtime task updates
- Customer/Profile capability จาก backend เพื่อซ่อนหรือปิด action ที่ไม่มีสิทธิ์
- Owner transfer พร้อม password confirmation และ audit
- Rewards Economy: season score, points, missions, badges, catalog, redemption, approve/reject/cancel/expiry/fulfill
- Settings: Thai/English, Purple/Green, Light/Dark/System
- Responsive layouts สำหรับ desktop, tablet และ mobile; shared SmartAvatar และ feedback system
- Main flows ที่ audit แล้วใช้ translation catalog กลางและมี type-safe key parity

### Backend / Database / Security

- ใช้ modular monolith: React + Express + TypeORM + MariaDB ฐานข้อมูลเดียว
- ใช้ migration แบบ additive; migration ล่าสุด `1800000000000-SingleOrganizationOwnership`
- ฐานหลัก `followmee` อยู่ที่ 18/18 migrations และไม่ถูก reset/drop
- ถอด Team schema ออกจาก final model: ไม่มี `teams`, `team_members`, `tasks.teamId` และ `MANAGE_TEAMS`
- เพิ่ม `customers.assignedTo` และ backfill assignment แล้ว; `customers.userId` ยังเก็บเป็น compatibility alias ชั่วคราว
- Task มี `priority`, `watchers`, `activity history`, `version`/`expectedVersion` และคืน action capabilities
- ป้องกัน concurrent edit ด้วย `409 TASK_VERSION_CONFLICT`
- Customer bulk actions ตรวจสิทธิ์ทุกรายการก่อน transaction จึงไม่เกิด partial update
- Task metadata, assignment, watcher/image/activity writes ใช้ transaction
- Notification analytics, monitoring, cleanup และ system notification มี permission middleware
- Refresh token เก็บเป็น SHA-256 hash, rotate/revoke เมื่อ refresh/logout
- Service worker ไม่ cache `/api`, auth response, cross-origin หรือ mutation request
- Upload จำกัดจำนวน/ขนาด ตรวจ magic bytes และตรวจ remote URL ไม่ให้ยิง private/local network
- CORS, Helmet, origin verification, rate limit, request ID, health/readiness และ production env validation ถูกเพิ่มแล้ว

### Verification ล่าสุด

Database Doctor รันผ่านหลังแก้ XAMPP:

```text
Connected to localhost:3306/followmee
Server version: 10.4.32-MariaDB
Database and migration state are ready
```

ผลตรวจโค้ด/ฐานข้อมูลล่าสุดที่บันทึกไว้:

- Backend production build: ผ่าน
- Frontend production build: ผ่าน
- Backend unit: 32/32
- Frontend Vitest: 192/192
- Seeded backend integration: 12/12
- Critical Chromium E2E: 9/9
- Clean schema: 40 tables, 58 foreign keys, 91 secondary indexes, 18 migration rows
- Customer authorization E2E: creator, assignee, unrelated member/admin, Owner และ atomic bulk rejection ผ่าน
- Bundle budget: initial entry ประมาณ 419 KB
- `git diff --check`: ผ่าน

## เหตุการณ์ MySQL วันที่ 2026-08-05

ปัญหาไม่ได้เกิดจาก `npm start` ไปปิด MySQL แต่ XAMPP MariaDB process crash เอง (`mysqld.exe` access violation) เมื่อใช้ data directory เดิม ทำให้เกิด `ECONNRESET`/`ECONNREFUSED` ที่ port 3306

การแก้ที่ทำโดยผู้ใช้:

- ปิด XAMPP และ restart Windows
- copy `C:\xampp\mysql\backup` ไปแทน `C:\xampp\mysql\data` เพื่อให้ MariaDB start ได้
- ตอนนี้ `npm run doctor:db` ผ่านแล้ว

ข้อควรระวัง: data directory เดิมอาจมีข้อมูลหลัง backup ล่าสุดที่ไม่ได้อยู่ในชุด clean data หากต้องการกู้ข้อมูลช่วงนั้น ให้เก็บโฟลเดอร์เดิมไว้ก่อนลบ/เขียนทับ และใช้ SQL backup ที่มีใน `Backups` ตรวจสอบประกอบ

ไฟล์ diagnostic ที่ยัง untracked ใน workspace (`mysql-clean-test-20260805/`, `mysqld-*.out/err`) เป็นไฟล์ตรวจสาเหตุ ไม่ใช่ source code และไม่ควร commit โดยไม่ตรวจ `.gitignore` ก่อน

## สิ่งที่ยังเหลือก่อน Production

1. ทำ durable transactional outbox/reconciliation ให้ Cloudinary, notification และ reward side effects ไม่สูญหายหลัง transaction commit
2. เพิ่ม browser E2E สำหรับ Rewards Catalog CRUD, redemption ทุกสถานะ, mission editing และ permission visibility ของ Owner/Admin/Moderator
3. เปลี่ยน reward notifications จาก English fallback เป็น `titleKey/messageKey + params` และ render ตาม locale ของผู้รับ
4. เพิ่ม season closing, Top-3 badge automation และหน้า season history
5. ทำ manual UAT ภาษาไทย/อังกฤษ, Purple/Green, Light/Dark ที่ 1440×900, 1280×800, iPad 768×1024 และ mobile 390×844
6. ทดสอบ Safari บน iPhone/iPad จริง โดยเฉพาะ autofill, virtual keyboard และ safe-area
7. ตั้งค่าและทดสอบ SendGrid/VAPID ใน staging พร้อม queue failure alerts, retention policy และ restore drill แบบ production-like
8. ลด legacy lint debt แบบราย module (baseline ห้ามเพิ่ม error ใหม่) และทยอยแยกโมดูลใหญ่ เช่น Schedule, Posts, Customer, MainLayout และ task service
9. วางแผนอัปเกรด React Router/Node หลังตรวจ compatibility และ security advisory ให้พร้อม
10. ตรวจ generated `playwright-report/` และ `test-results/` ให้ถูก ignore ก่อน commit

## ลำดับงานที่แนะนำสำหรับ session ถัดไป

### Phase 1 — Production safety

- ตรวจ backup/restore runbook และทำ restore drill อีกครั้ง
- ตรวจ outbox/reconciliation design
- ตรวจ staging secrets, SendGrid, VAPID, logs และ alerts

### Phase 2 — Rewards completeness

- เพิ่ม E2E catalog/redemption/mission/permissions
- ทำ localized reward notification keys
- ทำ season close, Top-3 badges และ history UI

### Phase 3 — UAT และคุณภาพ

- ทำ manual device/theme/locale matrix
- ทดสอบ physical Safari
- ลด lint debt และแยกโมดูล legacy ที่ใหญ่
- รัน CI gate เต็มชุดและบันทึกผล

## คำสั่งเริ่มงาน

```powershell
cd C:\PAom\FollowMee
npm run doctor:db
npm start
```

สำหรับ frontend อย่างเดียว:

```powershell
npm run start:frontend
```

ห้าม reset/drop ฐานหลัก `followmee`; ใช้ `followmee_e2e` สำหรับ destructive/integration tests เท่านั้น

## สถานะ release โดยย่อ

ระบบพร้อมสำหรับ local/UAT แบบควบคุมแล้ว แต่ยังไม่ควรเปิด production เต็มรูปแบบจนกว่าจะผ่าน outbox, Rewards E2E/localization, manual device UAT, staging notification test, restore drill และ lint/platform security gate

คะแนน readiness ล่าสุดที่บันทึกไว้: **8.6/10**

ไม่มีการ deploy, commit เพิ่ม, push หรือเปลี่ยน production credentials ในรอบนี้

## Prompt สำหรับ session ใหม่

> อ่าน `FOLLOWMEE_PROJECT_RECAP_20260805.md` ก่อน เรายึด architecture แบบองค์กรเดียวไม่มี Team แล้ว ตรวจ `git status`, `git log -5`, `npm run doctor:db` และผลทดสอบล่าสุด จากนั้นทำงานต่อจากหัวข้อ “ลำดับงานที่แนะนำสำหรับ session ถัดไป” โดยห้าม reset/drop ฐาน `followmee`
