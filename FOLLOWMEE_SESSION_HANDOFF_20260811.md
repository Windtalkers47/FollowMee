# FollowMee — Session Handoff

อัปเดต: 2026-08-11 (Asia/Bangkok)

ไฟล์นี้ใช้เป็นเอกสารส่งต่องานสำหรับ Codex session ถัดไป โปรดอ่านไฟล์นี้ร่วมกับ `FOLLOWMEE_PROJECT_RECAP_20260805.md` ก่อนเริ่มแก้โค้ด

## 1. วิธีเริ่ม session ใหม่

โปรเจกต์อยู่ที่:

```powershell
cd C:\PAom\FollowMee
```

ก่อนแก้ไขโค้ดทุกครั้งให้ทำตามลำดับนี้:

```powershell
Get-Content .\FOLLOWMEE_SESSION_HANDOFF_20260811.md
Get-Content .\FOLLOWMEE_PROJECT_RECAP_20260805.md
git status --short
git log -5 --oneline
npm run doctor:db
```

ตรวจผลทดสอบล่าสุดจาก `test-results/.last-run.json` และดูไฟล์/สคริปต์ที่เกี่ยวข้องก่อนเริ่มงานใหม่

การเปิดระบบ local:

```powershell
npm start
```

คำสั่งนี้จะเรียก `doctor:db` ก่อน หากฐานข้อมูลไม่พร้อมหรือมี migration ค้าง ระบบจะหยุดพร้อมข้อความแนะนำ

Frontend-only:

```powershell
npm run start:frontend
```

## 2. กติกาสถาปัตยกรรมและความปลอดภัย

- ระบบเป็นองค์กรเดียว ไม่มี Team domain
- สิทธิ์ต้องอิง Creator, Assignee, Owner และ backend capability ที่ส่งมาเท่านั้น
- ห้ามใช้ชื่อ role เช่น Admin/Moderator เป็นสิทธิ์ลัด
- ห้าม reset, drop หรือเขียนข้อมูลทดสอบลงฐานหลัก `followmee`
- งาน destructive E2E ใช้ฐานแยก `followmee_e2e` เท่านั้น
- Migration ต้อง additive และต้องอัปเดต `database/followmee-clean-schema.sql`
- ก่อน migration production ต้อง backup และตรวจ schema/foreign keys/indexes
- ห้าม commit credential, token, database dump หรือข้อมูลส่วนตัว

## 3. สถานะผลิตภัณฑ์ปัจจุบัน

FollowMee เป็น internal work-management application ที่มี:

- Login/Register และ invitation lifecycle
- Dashboard, My Work, Tasks & Schedule และ Task Detail
- Customers และ Customer Timeline
- Profile Card Library, Profile Editor และ Public Profile
- Completed Work, Rewards และ Season Top-3
- Comments, reactions, notifications และ digest preference
- Analytics: Work, Customers, Profile Cards, Notifications
- User Management, Owner transfer และ Settings
- Thai/English, Purple/Green, Light/Dark/System
- Responsive desktop, laptop, iPad และ mobile layout

Workflow หลักของ Task:

```text
Draft → To do → In progress → Review → Done
```

## 4. งานที่ทำเสร็จในรอบล่าสุด

### P1 Outbox/Queue Reliability และ Restore Drill

- เพิ่ม migration แบบ forward-only `1830000000000-ReliableDeliveryWorkers` สำหรับ persistent retry, lease ownership, stale reconciliation, bounded attempts และ dead-letter
- Outbox และ notification queue ใช้ atomic database claim, ป้องกัน drain ซ้อน, retry แบบ exponential backoff และหยุดที่ 8 attempts
- Notification aggregation มี durable deduplication key และรองรับ recipient หลายคนโดยสร้าง queue item แยกรายผู้รับ
- Attachment copy และ season achievement handler ตรวจ idempotency ก่อนทำ side effect ซ้ำ
- Queue stats endpoint เดิมเพิ่ม health summary สำหรับ pending, processing, failed, stale processing และ dead โดยยังใช้ `MANAGE_NOTIFICATION_SYSTEM`
- Backup ใช้ consistent snapshot, บังคับ absolute path นอก repository และไม่เขียนทับไฟล์เดิม
- Restore drill บังคับ target เป็น `followmee_e2e` เท่านั้น ตรวจ checksum, critical row counts, migration ledger, tables, foreign keys และ indexes
- Production-like restore drill ผ่าน: 48 tables, 77 foreign keys, 119 secondary indexes และ critical counts ตรงกันทุกชุดก่อน migration
- Migration 183 ผ่านบนฐาน restore `followmee_e2e`; clean schema verification ผ่านที่ 48 tables, 78 foreign keys, 125 secondary indexes และ 21 migrations
- ฐานหลัก `followmee` apply migration 183 แล้วหลังสร้าง backup นอก repository และ `doctor:db` ผ่านเรียบร้อย

ผลทดสอบรอบนี้:

- Backend unit: 39/39 ผ่าน
- Seeded backend integration: 17/17 ผ่าน รวม reliability regression 5 cases
- Backend production build: ผ่าน
- Restore drill และ clean-schema verification: ผ่าน

### Analytics Calendar

- ปุ่ม Apply แสดงข้อความและ contrast ถูกต้องทุก theme
- Apply disabled จนกว่าจะมีช่วงวันที่ที่ valid
- ตรวจ start/end, max 366 วัน และห้ามเกินวันนี้สำหรับ Analytics
- วันเริ่ม/สิ้นสุดเป็นวงกลมทึบ วันภายในช่วงเป็นพื้นหลังอ่อนต่อเนื่อง
- เพิ่ม keyboard navigation, Enter/Space, focus-visible และ ARIA label
- ป้องกันการเปลี่ยนเดือนไปยังเดือนนอก min/max
- Cancel คืนค่าช่วงเดิมและไม่ยิง API
- แก้ปัญหา iPad ที่ click ตรงกลางช่องไปโดนปุ่ม Clear โดยจัด layout ให้ Clear ชิดขวา

ไฟล์หลัก: `Frontend/src/components/RangeCalendar/RangeCalendar.tsx`

### Schedule Focus Mode

- เพิ่ม `FocusSession` เพื่อเก็บ tab, due date, sort, search และ page ก่อนเข้า Focus
- Focus overdue ส่ง `dueFilter=overdue` และ UI แสดง Overdue ตรงกัน
- กด All tasks แล้วละ `dueFilter` และ `status` ที่ค้างจาก Focus
- เปลี่ยน Tab, Due date, Sort หรือ Search จะออกจาก Focus อัตโนมัติ
- Back คืน snapshot เดิมครบทุก filter
- Show all tasks reset เป็น All tasks, Any date, Recently updated, search ว่าง, page 1
- Refresh ระหว่าง Focus ยังคง Focus เดิม
- แก้ Organization Focus due-soon ให้ใช้ช่วง 3 วันตรงกับข้อความและจำนวน

ไฟล์หลัก:

- `Frontend/src/pages/Schedule/index.tsx`
- `Frontend/src/hooks/useFocusSession.ts`
- `Frontend/src/utils/scheduleFocus.ts`
- `Backend/src/utils/task-focus.util.ts`

### My Work

- Saved View, Blocked chip และ status summary ใช้กติกาออกจาก Focus เดียวกับ Schedule
- Back/Show all/empty focus มีทางออกชัดเจน
- ไม่ให้ filter UI กับ query API อยู่คนละ state

ไฟล์หลัก: `Frontend/src/pages/MyWork/index.tsx`

### Accessibility และ localization

- เชื่อม label ของ Due date และ Sort กับ control จริง
- แปลชื่อ Focus, status และ blocked state ผ่าน translation catalog
- Task Detail ใช้ localized status label

### การรีวิว UX รายหน้า

มีรายงานคะแนนก่อน–หลัง, P0/P1 ที่แก้แล้ว และ P2 backlog อยู่ที่:

`docs/FOLLOWMEE_UX_AUDIT_20260810.md`

คะแนน readiness หลังรอบล่าสุด:

| หน้า | คะแนน |
|---|---:|
| Login / Register | 8.7 |
| Dashboard | 8.8 |
| My Work | 8.9 |
| Tasks & Schedule | 9.0 |
| Task Detail | 9.0 |
| Customers | 8.7 |
| Profile Card Library | 9.0 |
| Profile Editor / Public Card | 9.2 |
| Completed Work | 8.8 |
| Rewards | 8.6 |
| Notifications | 8.7 |
| Analytics | 8.8 |
| User Management | 8.8 |
| Settings | 8.8 |

## 5. ผลการทดสอบล่าสุด

- Frontend unit/component: 220/220 ผ่าน
- Backend unit: 39/39 ผ่าน
- Seeded integration: 17/17 ผ่าน
- Calendar/Focus regression: 9/9 ผ่านบน Desktop, Mobile และ iPad
- Frontend production build: ผ่าน
- Backend production build: ผ่าน
- Bundle budget: ผ่าน, initial entry ประมาณ 439 KB
- `git diff --check`: ผ่าน; มีเพียงคำเตือน line-ending LF/CRLF
- `npm run doctor:db`: เชื่อมต่อ MariaDB 10.4.32 และฐาน `followmee` ได้ แต่ตั้งใจหยุดเพราะ migration 183 ยัง pending และยังไม่ได้ apply ลงฐานหลัก

Visual baseline ยังไม่ได้ update อัตโนมัติ ต้องตรวจภาพใหม่ด้วยสายตาก่อนอนุมัติทุกครั้ง

## 6. งานที่ยังค้าง

### P1/UAT ที่ควรทำก่อน production

- ทดสอบ Safari จริงบน iPhone/iPad โดยเน้น calendar touch, keyboard, autofill, crop, share sheet และ safe-area
- ทดสอบ locale ไทย/อังกฤษ, Purple/Green, Light/Dark ที่ 1440×900, 1280×800, 768×1024 และ 390×844
- ตรวจ visual baseline ใหม่ด้วยสายตา ไม่ใช้ snapshot update อัตโนมัติ
- ทดสอบ notification/push/email credentials ใน staging เท่านั้น
- ทดสอบการใช้งานจริงหลัง apply migration 183 แล้วจึงเดินหน้า manual UAT/Safari ตามลำดับ

### P2 backlog

- Saved View: rename, delete และ default management
- Schedule: URL-synced filters และ virtualization เมื่อข้อมูลจำนวนมาก
- Task Detail: lineage visualization และ checklist bulk editing
- Customers: หน้าสำหรับเปรียบเทียบรายการที่อาจซ้ำก่อน merge แบบ manual
- Profile Cards: bulk operations และ scheduled publishing
- Profile Editor: ปรับ share templates และอนุมัติ visual baseline
- Completed Work: season storytelling และ feed filters
- Rewards: redemption SLA/filtering และ scoring simulator
- Notifications: digest preview และ personal grouping rules
- Analytics: trend charts, saved reports และ scheduled exports
- User Management: audit export และ advanced history filters
- Settings: settings search และ reset ราย section

### Technical debt ที่ควรติดตาม

- Full legacy Frontend lint ยังมี error/warning เดิมจำนวนมาก ต้องแยก cleanup เป็นงานเฉพาะ
- React Router advisories เป็น dependency/platform upgrade backlog ไม่ใช่ scope ของรอบ Focus/Calendar
- Generated Playwright artifacts ใน `playwright-report/` และ `test-results/` ต้องจัดการตาม `.gitignore` และนโยบายทีมก่อน commit

## 7. ลำดับงานแนะนำสำหรับ session ถัดไป

1. อ่านไฟล์นี้และ recap เดิม
2. ตรวจ `git status`, `git log -5`, `npm run doctor:db` และผลทดสอบล่าสุด
3. ยืนยันว่าไม่มี server/test process เก่าค้างอยู่
4. เลือกงาน P1/UAT หนึ่งชุดที่มี acceptance criteria ชัดเจน
5. แก้โค้ดและเพิ่ม regression test ใกล้จุดที่แก้
6. รัน targeted tests ก่อน แล้วค่อย build/เต็มชุดตามความเสี่ยง
7. ตรวจ `git diff --check`
8. ตรวจว่าไม่มี migration/destructive operation ลง `followmee`
9. อัปเดตไฟล์ handoff นี้เมื่อสถานะงานหรือผลทดสอบเปลี่ยน

## 8. Template สำหรับเริ่มคุย session ใหม่

```text
โปรดอ่าน FOLLOWMEE_SESSION_HANDOFF_20260811.md และ FOLLOWMEE_PROJECT_RECAP_20260805.md ก่อนเริ่มงาน
ตรวจ git status, git log -5, npm run doctor:db และผลทดสอบล่าสุด
ทำงานต่อจากหัวข้อ “งานที่ยังค้าง” โดยห้าม reset/drop ฐาน followmee
เมื่อเสร็จให้เพิ่ม regression test, รัน build/test ที่เกี่ยวข้อง และอัปเดต handoff file
```
