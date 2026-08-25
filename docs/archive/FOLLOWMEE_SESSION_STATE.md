# FollowMee — Session State / Handoff

อัปเดตล่าสุด: 2026-07-30 (Asia/Bangkok)

ไฟล์นี้เป็น state กลางสำหรับส่งต่องานระหว่าง Codex sessions ไม่ใช่เอกสาร production specification หากเริ่ม session ใหม่ ให้เปิดไฟล์นี้ก่อน แล้วตรวจ `git diff` และผลทดสอบล่าสุดก่อนแก้โค้ด

## เป้าหมายผลิตภัณฑ์

FollowMee เป็น internal work-management app ที่มี Tasks & Schedule, Customers, Profile Cards/Public Profiles, Team Activity/Comments, Notifications, Analytics และ User Management โดยต้องรองรับ desktop, notebook, iPad และ mobile

แนวทางแบรนด์ที่ล็อกไว้:

- Internal UI ใช้ Purple เป็นค่าเริ่มต้น; Green เป็น brand theme ที่เลือกได้
- Appearance: Light / Dark / System
- Language: English / ไทย
- Internal pages เรียบ อ่านง่าย ลด gradient/glass; Public Profile ใช้ pastel/depth ได้
- Primary action ใช้สีจาก design token; destructive action ใช้แดง semantic

## ทำเสร็จแล้ว

### Database / Backend

- เพิ่ม `user_preferences` แบบ one-to-one กับ `users`
- เพิ่ม authenticated API:
  - `GET /api/user-preferences`
  - `PATCH /api/user-preferences`
- เพิ่ม TypeORM migration:
  - `Backend/src/migrations/1795000000000-AddUserPreferences.ts`
- เพิ่ม entity/service/controller/route ที่เกี่ยวข้อง
- อัปเดต `database/followmee-clean-schema.sql`
- migration ฐานข้อมูลหลักรันสำเร็จแล้ว และรันซ้ำล่าสุดได้ `No migrations are pending`
- schema verify ล่าสุด: 25 tables, 34 foreign keys, 58 secondary indexes, 13 migrations
- แก้ CORS ให้รองรับ `x-user-locale`
- Notification email wrapper รองรับ locale และแก้ข้อความ encoding เสีย
- Reset-password email รองรับ English/ไทย ตาม `x-user-locale` ทั้ง subject, HTML และ plain text
- Smart Suggestions ส่ง `translationKey` เพื่อให้ frontend แปลตาม locale ได้

### Frontend / UX

- `UserPreferencesContext` รองรับ server sync + local cache + browser-locale fallback
- `ThemeContext` รองรับ Purple/Green และ Light/Dark/System
- Settings เพิ่ม Language, Brand theme และ Appearance
- ลบ legacy `Frontend/src/theme.ts`
- Main navigation แก้ active route และเพิ่ม More menu บน mobile
- Dashboard initial fetch ซ้ำถูกลดลงและมี visible error/retry state
- memoize task grouping, menu filtering, notification grouping และ current tab data
- Feedback layer กลางใช้ MUI Dialog/Snackbar; ไม่มี native alert/confirm หรือ `Swal.fire` ใน runtime แล้ว
- Notification UI ใช้ neutral surface, unread state และ localized time/action labels
- Customer/Users/Register ลด semantic hard-coded colors และใช้ theme tokens มากขึ้น
- Settings ไม่แสดง legacy LiquidGlassSettings component ซ้ำซ้อนแล้ว
- แยก translation catalog กลางไปที่ `Frontend/src/i18n/messages.ts` และบังคับ key ของ English/ไทยให้ตรงกันด้วย TypeScript
- หน้า Login/Register/Forgot/Reset ใช้ catalog กลางแล้ว รวม validation, feedback dialogs, labels, placeholders และ accessibility labels
- หน้า Schedule, Customers, Users, Team Activity และ Notification Analytics ใช้ catalog กลางแล้วใน navigation ภายในหน้า, headings, filters, tables, forms และ dialogs หลัก
- เพิ่ม catalog tests ตรวจ key parity, interpolation placeholders และข้อความว่าง

## ผลการตรวจล่าสุด

ผ่านแล้ว:

- Backend TypeScript build
- Frontend production build
- Frontend unit/component: 14/14
- Backend unit: 8/8
- Backend integration: 7/7
- Authenticated workflow E2E: 4/4
- Accessibility/axe: 3/3, ไม่มี serious/critical violation
- Visual regression: 2/2
- Mobile performance budget
- Bundle budget: initial entry 364 KB
- Responsive Chromium: 390x844, 768x1024, 1280x800, 1440x900
- WebKit desktop smoke
- ไม่มี horizontal overflow, `undefined` หรือ actionable console errors ใน core-page smoke

E2E ใช้ฐานข้อมูลแยก `followmee_e2e` เท่านั้น ห้าม reset ฐานข้อมูลหลัก

## สิ่งที่ยังไม่สมบูรณ์

1. Localization ของ main flows ใน Login/Register/Forgot/Reset, Schedule, Customers, Users, Team Activity และ Notification Analytics ทำแล้ว แต่ nested legacy components บางตัว เช่น TaskForm, CustomerForm, FilterBar, task cards/comments และ role descriptions ยังมี hard-coded text ที่ต้อง audit ต่อเพื่อให้ครบ 100%
2. Notification รุ่นเก่าบางรายการยังเก็บ title/message เป็นข้อความสำเร็จรูป ควรย้ายเป็น event key + parameters หากต้องการเปลี่ยนภาษาตามผู้รับครบทุก event
3. WebKit ผ่าน browser engine ระดับ desktop แล้ว แต่ยังไม่ได้ตรวจ Safari บนอุปกรณ์ iPhone/iPad จริง โดยเฉพาะ autofill, virtual keyboard และ safe-area
4. E2E สอง session ผ่าน workflow หลักแล้ว แต่ควรเพิ่ม coverage reconnect/offline และ role matrix ให้กว้างขึ้นก่อน production เต็มรูปแบบ
5. มีไฟล์ generated จาก Playwright ใน `playwright-report/` และ `test-results/`; อย่าลบหรือ commit เพิ่มโดยไม่ตรวจ `.gitignore` และเจตนาของทีม

## งานถัดไปที่แนะนำ

ลำดับที่ควรทำต่อ:

1. เก็บ localization รอบสุดท้ายใน nested components ของ Schedule/Customers/Users/Team Activity (TaskForm, CustomerForm, filters, task cards/comments, role descriptions) และเพิ่ม component tests สลับ English/ไทย
2. เปลี่ยน notification storage/delivery เป็น `translationKey + params + entity metadata`; render title/message ตาม locale ของผู้รับ
3. เพิ่ม E2E สำหรับ offline/reconnect, duplicate notification, mark read/unread, deep-link comment และ role matrix
4. ตรวจ Safari iOS/iPadOS จริง และ keyboard/autofill/safe-area
5. รัน full CI: build, unit, integration, schema verify, E2E, axe, visual และ bundle budget

หมายเหตุการตรวจล่าสุด: Backend/Frontend build และ unit tests ผ่าน แต่ `npm run lint` ทั้ง repo ยังไม่ผ่านจาก technical debt เดิม 239 รายการ (221 errors, 18 warnings) กระจายอยู่ในไฟล์ legacy หลายส่วน; warning ที่เกิดจาก dependency ของ `t` ในงานรอบนี้แก้แล้ว

## วิธีเริ่ม session ใหม่

ส่งข้อความสั้น ๆ ใน session ใหม่ได้ เช่น:

> อ่าน `FOLLOWMEE_SESSION_STATE.md` ก่อน แล้วตรวจสถานะ repo และทำงานต่อจากหัวข้อ “งานถัดไปที่แนะนำ” ข้อ 1

จากนั้น Codex ควรตรวจ:

```powershell
git status --short
git diff --check
```

และอ่านไฟล์นี้ร่วมกับ `README.md`, `DEPLOYMENT_GUIDE.md` และเอกสาร audit ที่เกี่ยวข้องก่อนลงมือแก้

## กติกาความปลอดภัย

- ห้ามใช้ credential ส่วนตัวของผู้ใช้ใน E2E
- ห้าม reset/drop ฐานข้อมูลหลักเพื่อทดสอบ
- ใช้ `followmee_e2e` สำหรับ destructive test data เท่านั้น
- ก่อน migration production ตรวจชื่อฐานข้อมูลและรัน schema verifier
- ก่อนลบหรือย้ายไฟล์ให้ตรวจ target ชัดเจนและรักษา uncommitted work เดิม

## 2026-08-03 pre-deployment hardening update

- Local changes only. Nothing was deployed to Vercel, Render, TiDB, or production.
- SmartAvatar now handles Thai/Unicode initials consistently and user avatars in task, comment, user-management, and account flows use the shared component.
- `profile:updated` now carries a typed canonical profile event with revision metadata. React Query and the signed-in Redux user are patched only for the matching user; duplicate BroadcastChannel rebroadcasting was removed.
- Admin edits to another user's public profile fields create a persistent, localized `PROFILE_UPDATED_BY_ADMIN` notification and a realtime event. Self edits do not create a persistent notification.
- Added exact-origin CORS, mutation-origin verification, Helmet, API rate limiting, production cookie settings for split Vercel/Render origins, TiDB TLS/pooling, and production runtime env validation.
- Fixed refresh-cookie path so protected API middleware can actually refresh an expired access token.
- Added additive migration `1797000000000-AddProfileChangedNotificationPreference.ts`, migration scripts, and clean-schema ledger entries through 1797000000000.
- Added Vercel SPA rewrite and corrected Render/TiDB configuration. Render is configured to run pending migrations before start, but no deployment or migration has been executed.
- Notification deep links now reject external, protocol-relative, backslash, and encoded-slash paths.
- Completed Work comment layout is denser; account/profile/comment runtime copy touched in this round is localized.
- Final automated results: Frontend 187/187 tests pass; Backend 19/19 tests pass; both production builds pass; `git diff --check` passes.
- New infrastructure files pass targeted ESLint. Full legacy Frontend lint still has 215 errors and 20 warnings across 55 files.
- Backend production dependency audit: 0 vulnerabilities. Frontend production audit: 2 moderate React Router advisories; the SSR issue is not used, and notification navigation now has an application-level internal-path guard. Moving to React Router 8.3+ requires Node 22.22+ and React 19.2.7+ and remains a planned platform upgrade.
- At the time of this earlier checkpoint, local MySQL was not running (`ECONNREFUSED`). This item is superseded by the database/UAT update below: MySQL was started, the backup and migration were completed, and schema verification passed.

## 2026-08-03 local database startup and UAT readiness update

### Root cause and startup behavior

- The backend startup failure was caused by XAMPP MariaDB not listening on `localhost:3306`. The application credentials and database name were not the original cause.
- Added `npm run doctor:db` at the repository root and Backend. It checks connectivity, the selected database, server version, and pending TypeORM migrations without printing credentials.
- Root `npm start` now runs `prestart` and stops before launching either application when the database is unreachable, missing, or has pending migrations. The doctor never starts XAMPP, creates a database, or runs migrations automatically.
- `npm run start:frontend` remains available for frontend-only development.
- Development database startup fails fast with an actionable nested error such as `ECONNREFUSED localhost:3306`. Production uses bounded retries and returns a generic message without database topology or secrets.
- `/health` now executes `SELECT 1`: healthy returns HTTP 200 with `{ status: "UP", database: "UP" }`; a disconnected database returns HTTP 503 with `{ status: "DEGRADED", database: "DOWN" }`.

### Backup, migration, and schema verification

- Created a local pre-migration backup at `Backups/followmee-before-1797000000000-20260803-123934.sql` (93,992 bytes, SHA-256 `A84DA337518E045CF1C5B8155E1042098FDDB405FED4B1EE5621450D9111F514`). `Backups/` is gitignored because dumps can contain sensitive data.
- Ran additive migration `AddProfileChangedNotificationPreference1797000000000` in a transaction. `npm run migration:show` now reports all 15 migrations as applied.
- Clean-schema verification passed against the isolated `followmee_schema_verify` database: 25 tables, 34 foreign keys, 58 secondary indexes, no missing/unexpected tables, no missing primary keys, and all 15 migration records present.
- Removed one orphan generated verifier artifact (`C:\xampp\mysql\data\followmee_schema_verify\users.ibd`) left by the earlier interrupted verification. It was not part of `followmee`; the verifier recreated its isolated schema and passed afterward.
- The primary `followmee` database was never reset or dropped. Destructive E2E used only `followmee_e2e`.

### Realtime and concurrency hardening found during UAT preparation

- Added a two-browser profile workflow: a self profile change updates both browser contexts without a persistent self-notification; an Admin/Superadmin edit to another user updates both contexts and creates the persistent realtime notification.
- Fixed concurrent first-load races for `user_preferences` and `user_notification_settings` using parameterized MariaDB/TiDB-compatible `INSERT IGNORE` followed by a canonical read.
- Updated the task lifecycle E2E to follow the real workflow after request changes: restart the task, resubmit it, approve it, and verify invalid reverse transitions remain rejected.
- Workflow E2E is serial because the scenarios intentionally share the four fixed isolated QA accounts and notification state.

### Final verification for this update

- Database doctor: passed with MariaDB 10.4.32 and no pending migrations.
- Doctor failure paths manually verified: refused connection/wrong port and missing database produce actionable non-secret errors and exit non-zero.
- Health check: HTTP 200, application `UP`, database `UP`.
- Backend unit tests: 21/21 passed.
- Frontend unit/component tests: 187/187 passed.
- Authenticated Chromium workflow E2E: 5/5 passed, including task CRUD/realtime, lifecycle, comments/reactions/deep links, notification archive/restore, and cross-browser profile synchronization.
- Backend and Frontend production builds: passed.
- Clean-schema verifier: passed.
- `git diff --check`: passed (line-ending conversion notices only).
- No commit, push, Vercel, Render, TiDB, or production deployment was performed.

### Remaining UAT/release blockers

1. Full legacy Frontend lint is not clean: the last audit found 215 errors and 20 warnings across 55 legacy files. New database-doctor and realtime work is covered by build/tests, but the repository should reach a clean lint baseline before production release.
2. Frontend production audit still has two moderate React Router advisories. The current app does not use the affected SSR path and internal notification navigation is guarded, but the planned Node/React/React Router platform upgrade remains before a full production release.
3. Run the manual UAT matrix in real browsers for English/Thai, Purple/Green, Light/Dark, Desktop/Notebook/iPad/Mobile, including XAMPP restart and WebSocket reconnect/offline behavior.
4. Test Safari on real iPhone/iPad hardware for virtual keyboard, autofill, safe-area, and image upload behavior.
5. Configure and validate real email/push credentials only in a later staging environment. Local logs correctly report SendGrid and VAPID as disabled.

### Correct local startup

1. Open XAMPP and start **MySQL** (Apache is not required for FollowMee).
2. From `C:\PAom\FollowMee`, run `npm run doctor:db` when diagnosing readiness.
3. Run `npm start`. The prestart doctor will block startup and explain the corrective action if the database or schema is not ready.
4. Use `npm run start:frontend` only when intentionally working without the backend.

## 2026-08-03 Owner, organization workspace, and Rewards Economy update

### Product and authorization changes

- Renamed the runtime role `Superadmin` to `Owner`. A one-release compatibility normalizer accepts legacy tokens containing `Superadmin`, but all new database/UI/API behavior uses `Owner`.
- Added the `system_owner` singleton and a password-confirmed, transactional transfer endpoint: `PUT /api/user-management/system-owner`. The previous Owner becomes Admin and the target becomes Owner atomically.
- Generic role assignment, role removal, deactivation, and deletion reject changes to Owner with `OWNER_TRANSFER_REQUIRED`. Recovery uses the audited CLI `npm --prefix Backend run owner:transfer -- --email user@example.com`.
- User Management now separates normal role changes from Owner transfer and refreshes roles across browsers after the targeted `owner:transferred` event.
- Customer and Public Profile management are organization-shared. Moderator can view/create/edit drafts; Admin and Owner can publish/unpublish/delete. The legacy `/customers/public/:id` CRM route now requires authentication and `VIEW_CUSTOMERS`; only the explicit Public Profile route remains public.
- Customer/Profile responses include backend capabilities and the Profile Library/Editor hide or disable unauthorized controls. Create/update/publish/unpublish/delete actions write audit records.

### Rewards Economy

- Added monthly Season Score, persistent Reward Points wallets (`availablePoints` and `reservedPoints`), immutable point ledger, badges, mission templates/instances/progress/events, catalog items, and redemption requests.
- Approved Done tasks credit `completionScore` once using `task:<taskId>:completion`; task scoring remains 10 base, +3 on time, -2 per request-changes cycle, minimum 4.
- Completed Work now shows a compact season/reward summary and links to the new responsive `/rewards` page.
- Rewards page includes balances, missions, badges, catalog, redemption history, leaderboard, and an Owner Console for redemption settings, catalog, mission enable/disable, targets, reward points, approval/rejection, and fulfillment.
- Catalog management now supports create/edit, optional responsive images, per-user limits, active start/end dates, Owner-only active/inactive inventory, reactivation, and guarded soft deactivation. The backend rejects invalid date ranges and refuses deactivation while pending or approved redemption requests still exist. Deactivation uses the branded destructive confirmation flow.
- Requests reserve points and stock in one transaction. Approval settles reservations; rejection/cancellation/expiry returns both and appends release ledger entries. A 15-minute expiry worker handles stale requests.
- Local development seeds three sample catalog items, badges, and rotating mission templates and enables redemption. `REWARD_DEV_SEED=false` is documented and set for hosted/UAT configuration so redemption remains Owner-controlled.
- Mission generation uses Bangkok Monday-Sunday/calendar-month periods, idempotent period keys, 28-day exact-template cooldown, previous-category avoidance, workload-capped personal targets, and one scored mission per task per cadence.
- Realtime events invalidate only Rewards/Dashboard data. Redemption decisions create persistent targeted notifications; notification failures never roll back committed wallet/stock state.

### Database and migration

- Backup created before migration: `backups/followmee-before-owner-rewards-20260803.sql` (95,187 bytes; gitignored).
- Applied `OwnerOrganizationRewards1798000000000` to local `followmee`. `migration:show` reports all 16 migrations applied and Database Doctor reports ready.
- The primary `followmee` database was never reset or dropped. Destructive tests used only `followmee_e2e`.
- Clean schema now contains 38 tables, 53 foreign keys, 86 secondary indexes, 16 migration ledger rows, four roles, and 12 permissions. Isolated `followmee_schema_verify` passed with no missing/unexpected tables or missing primary keys.

### Verification completed

- Backend production build: passed.
- Frontend production build: passed.
- Backend unit tests: 23/23 passed.
- Frontend unit/component/policy tests: 189/189 passed.
- Backend integration: 12/12 passed, including concurrent Owner transfer, idempotent task credit, idempotent mission generation, last-stock redemption concurrency, catalog date validation, and pending-redemption deactivation protection.
- Authenticated Chromium workflow E2E: 5/5 passed (task realtime/lifecycle, comments/reactions, notification archive/restore, and two-browser profile synchronization).
- Health check: HTTP 200 `{ status: "UP", database: "UP" }`; local seed currently contains 3 catalog items, 14 rotating mission templates, and 12 historical/current mission instances.
- `git diff --check`: passed after removing three trailing spaces; CRLF conversion notices are non-failing.
- No commit, push, Vercel, Render, TiDB, or production deployment was performed.

### Current score and remaining release work

- Overall local/UAT readiness: **8.6/10**.
- Product/workflow architecture: 9.0/10; Owner security: 8.9/10; Task workflow: 8.8/10; Customer/Profile workspace: 8.6/10; Rewards MVP: 8.3/10; realtime/notifications: 8.5/10; UI/responsive: 8.4/10; production operations: 7.6/10.
- Before customer UAT, manually walk the new Owner transfer and Rewards pages in Thai/English, Purple/Green, Light/Dark at 1440x900, 1280x800, 768x1024, and 390x844. Automated browser coverage currently validates core workflows but not every Rewards visual state.
- Add authenticated browser E2E for catalog CRUD, redemption approve/reject/expiry/fulfill, mission editing, and Moderator/Admin capability visibility. Transactional behavior is already integration-tested.
- Add localized translation keys for reward decision notification content; current in-app reward notifications are persistent and targeted but use English fallback text.
- Add season closing/Top-3 badge automation and an Owner season history view. Current monthly season creation/ranking works, while historical presentation is minimal.
- Resolve the existing repository-wide legacy lint baseline and planned React/React Router platform security upgrade before a production launch.
- Configure and validate real SendGrid/VAPID credentials in staging, and test Safari on physical iPhone/iPad hardware.

## 2026-08-04 Team scope and production-hardening implementation

### Implemented

- Added `teams`, `team_members`, `task_watchers`, and `task_activities`. Existing active users and tasks were backfilled into the `General` team without resetting the primary database.
- Split organization roles (`Owner`, `Admin`, `Member`) from team roles (`manager`, `member`). The legacy `Customer` role was migrated to `Member`; frontend normalization keeps temporary compatibility.
- Task list/detail, Schedule, Completed Work, comments, reactions, likes, and images now enforce backend team scope. Owner is organization-wide; Team Manager manages team tasks; Members see published team work; creators retain management rights.
- Added task `teamId`, `priority`, watchers, activity history, backend action capabilities, manager actions, and optimistic concurrency through `version`/`expectedVersion` with `409 TASK_VERSION_CONFLICT`.
- Task metadata, watcher/image records, and activity audit writes use database transactions. Task detail no longer eagerly loads the full comment/reaction graph; counts are aggregated in SQL.
- Protected notification analytics, queue/email monitoring, system notification creation, and cleanup with permission middleware.
- Refresh tokens are stored only as SHA-256 hashes, rotate on refresh, and revoke by hash on logout. Existing plaintext session values were backfilled and cleared.
- Service worker caching excludes `/api`, non-GET, and cross-origin requests. Uploads are limited to six files and 5 MB each, validate magic bytes, and remote URL validation blocks private/local destinations.
- Added response/error request IDs, a canonical frontend API client with compatibility re-export, Team administration UI, CI gates, and bundle splitting.

### Database safety and verification

- Backup: `Backups/followmee-before-teams-task-hardening-20260804.sql` (164,220 bytes; SHA-256 `062CB3ACB77CD6025AFA5CAF67B6DD686BAB2725402617B423D014D334753783`).
- Applied `TeamsAndTaskHardening1799000000000`; Database Doctor reports 17/17 migrations ready on MariaDB 10.4.32.
- Clean schema passed: 42 tables, 60 foreign keys, 94 secondary indexes, 17 migration rows, no missing primary keys.
- Backend and frontend production builds passed.
- Backend tests: 29/29. Frontend tests: 194/194. Seeded integration: 12/12. Chromium critical E2E: 9/9.
- Bundle budget passed; initial entry reduced from 514 KB to 420 KB. Critical changed-file lint passed.

### Still required before production

- Add a durable transactional outbox for every Cloudinary/notification/reward external side effect. Task database writes are transactional and notifications retry, but all side effects are not yet guaranteed by one outbox.
- Complete direct HTTP security tests for all analytics endpoints, malicious action URLs, version conflicts, and the full two-team IDOR matrix.
- Continue splitting the large legacy Schedule, Posts, Customer, MainLayout, and task-service modules and reduce the repository-wide lint baseline.
- Complete Rewards Catalog/redemption/mission browser E2E and localized reward notification keys.
- Run manual theme/locale/device UAT including physical Safari; validate real staging SendGrid/VAPID and alert thresholds.
- Perform and document a restore drill from the new backup before approving production.
- No commit, push, deployment, or production credential change was performed.

## 2026-08-04 session handoff

### จุดประสงค์ของงานรอบที่ผ่านมา

FollowMee ถูกวางให้เป็น Web App สำหรับองค์กรเดียว: พนักงานรับข้อมูลจากลูกค้าแล้วสร้าง Customer และ Profile Card, เจ้าของงานจัดการ Task/Schedule, Dashboard ใช้วิเคราะห์งาน, และ Completed Work เป็น Community ที่เชื่อมกับคะแนน ภารกิจ Badge และ Rewards เพื่อสร้างแรงจูงใจในการทำงาน

### สิ่งที่ทำเสร็จแล้ว

- แก้ Task workflow ให้เป็น Draft → To do → In progress → Review → Done โดย creator เป็นผู้ตรวจและอนุมัติ
- เพิ่ม My Work, Task Detail, Review/Approve/Request changes และ realtime task updates
- แยก Completed Work ออกจาก My Work และลดความสับสนระหว่าง Team Activity/My Activity
- เพิ่ม FollowMee Feedback System แบบ branded แทนการติดตั้ง SweetAlert ใหม่
- ปรับ Pastel Purple/Green, collapsed navigation rail, Smart Focus และ localization ไทย/อังกฤษในส่วนที่ผ่าน audit แล้ว
- เพิ่ม SmartAvatar ให้รองรับ Unicode/ภาษาไทยและ sync ชื่อ/รูปข้าม browser
- เปลี่ยน Superadmin เป็น Owner, จำกัด Owner หนึ่งคน และเพิ่มระบบโอน Owner แบบมี password confirmation
- เปลี่ยน Customer/Profile เป็นข้อมูลร่วมองค์กร พร้อม capability จาก backend และ audit
- เพิ่ม Rewards Economy ครบแกนหลัก: Season Score, Reward Points available/reserved, missions, badges, catalog, redemption, approval, reject, cancel, expiry และ fulfill
- เพิ่ม Catalog CRUD สำหรับ Owner: สร้าง/แก้ไข/เปิดกลับรายการ inactive/ปิดรายการแบบ soft deactivate, รูปภาพ, per-user limit และ active period
- ป้องกัน Catalog date range ผิด และป้องกันปิดรายการที่มี redemption pending/approved

### ฐานข้อมูลและการรันระบบ

- ใช้ XAMPP MariaDB ที่ `localhost:3306`
- Database หลักคือ `followmee`; ไม่ได้ reset หรือ drop
- Migration ล่าสุด `OwnerOrganizationRewards1798000000000` ถูก apply แล้ว
- Migration ทั้งหมด 16 รายการอยู่สถานะ applied
- Backup ล่าสุด: `backups/followmee-before-owner-rewards-20260803.sql`
- `followmee_e2e` ใช้เฉพาะ destructive/integration tests
- เปิดระบบ:
  1. เปิด XAMPP และ Start MySQL
  2. `cd C:\PAom\FollowMee`
  3. `npm run doctor:db`
  4. `npm start`
- Frontend-only: `npm run start:frontend`
- ห้ามใช้ `INSERT user_roles` ตรง ๆ เพื่อแต่งตั้ง Owner ให้ใช้ transfer endpoint หรือ CLI ที่มี audit

### Endpoint สำคัญ

- `PUT /api/user-management/system-owner`
- `GET /api/rewards/summary`
- `GET /api/rewards/catalog`
- `POST /api/rewards/redemptions`
- `GET /api/admin/rewards/catalog` สำหรับ Owner ดูรายการ active/inactive ทั้งหมด
- `POST/PUT/DELETE /api/admin/rewards/catalog...`
- `GET/PUT /api/admin/rewards/missions...`
- `POST /api/admin/rewards/redemptions/:id/approve|reject|fulfill`

### ผลตรวจล่าสุด

- Database Doctor: ผ่าน, MariaDB 10.4.32, ไม่มี migration ค้าง
- Health: `UP`, Database: `UP`
- Backend build: ผ่าน
- Frontend build: ผ่าน
- Backend unit: 23/23
- Frontend tests: 189/189
- Backend integration: 12/12
- Authenticated Chromium E2E เดิม: 5/5
- `git diff --check`: ผ่าน โดยข้อความ LF/CRLF เป็นเพียง warning ของ Windows
- ไม่มีการ deploy, commit หรือ push

### งานที่ควรทำต่อใน session ใหม่

1. Manual UAT หน้า Owner, Rewards, Catalog และ Redemption ในไทย/อังกฤษ, Purple/Green, Light/Dark และ 1440×900, 1280×800, iPad 768×1024, Mobile 390×844
2. เพิ่ม browser E2E สำหรับ Catalog CRUD, redemption ทุกสถานะ, mission editing และ permission ของ Moderator/Admin/Owner
3. แปลข้อความ notification ของ Rewards ด้วย `titleKey/messageKey` แทน English fallback
4. เพิ่มการปิด Season, แจก Top 3 badge และหน้า Season history
5. ตรวจ lint legacy 215 errors/20 warnings และวางแผนอัปเกรด React Router/Node ก่อน production
6. ทดสอบ Safari บนอุปกรณ์จริง และเตรียม SendGrid/VAPID ใน staging เท่านั้น

### คะแนนประเมินล่าสุด

Overall local/UAT readiness: **8.6/10**. ระบบพร้อมสำหรับ local/UAT แบบควบคุม แต่ยังไม่ควรเปิด production จนกว่าจะผ่าน manual UAT, browser E2E ของ Rewards, lint/security upgrade และ staging notification test.

## 2026-08-04 single-organization correction (supersedes Team scope)

The earlier “Team scope” product decision is superseded. FollowMee has one organization and no Team domain. Resource authorization is now based on creator, assignee, and Owner.

### Final authorization model

- Every authenticated user can list, view, and create Customers. New Customers default `assignedTo` to the creator.
- Customer creator, assignee, and Owner can edit Customer data/images/status and linked Profile drafts.
- Only Customer creator and Owner can reassign, delete, publish/unpublish, or delete the linked Profile. Admin and Moderator have no data override merely because of their role.
- Every authenticated user can see published Tasks. Drafts are private to creator and Owner.
- Task creator controls metadata, assignment, approval, request changes, cancellation, and deletion. Assignee performs the assigned workflow. Owner can override all Tasks. Watchers receive notifications but gain no edit permission.
- Backend Customer/Profile/Task responses expose resource capabilities; the UI hides or disables unavailable actions.

### Schema and implementation

- Added and applied forward migration `SingleOrganizationOwnership1800000000000`; migration `179900...` was not edited or rewritten.
- Added/backfilled `customers.assignedTo`, retained `customers.userId` as a compatibility alias, removed `tasks.teamId`, `teams`, `team_members`, and `MANAGE_TEAMS`.
- Removed `/api/teams`, Team entities/services/routes/page/navigation and Task Team fields. Added `GET /api/users/assignable` and `PUT /api/customers/:id/assignee`.
- Bulk Customer status/delete checks every row before one transaction; unauthorized mixed batches make no changes.
- Published Task realtime invalidation is organization-wide; content notifications remain limited to creator, assignee, and watchers.
- The Customer frontend uses one canonical typed API client with a compatibility re-export.
- CI now runs builds, unit/integration tests, clean critical lint, bundle budget, and isolated critical Chromium E2E with one worker.

### Database safety and verification

- Primary backup before correction: `Backups/followmee-before-single-organization-20260804.sql`, 128,627 bytes, SHA-256 `F2864677C66BC766CAB83256ACFA9824101FDB4AD542C43C5FE04873F99FEC3D`.
- Primary `followmee` now has 18/18 migrations. It was not reset or dropped.
- Post-migration primary check: 2 Customers, 0 unassigned Customers, 11 Tasks, Task version sum 11, and zero Team tables/columns/permissions.
- Restore drill used only temporary `followmee_migration_verify`: before/after counts remained 2 Customers and 11 Tasks with unchanged watcher/activity/version totals; assignment backfill completed and Team schema reached zero. The temporary database was removed.
- Clean schema verification passed: 40 tables, 58 foreign keys, 91 secondary indexes, 18 migration rows, and no missing primary keys.

### Verification completed

- Backend and Frontend production builds passed; bundle budget passed at 419 KB initial entry.
- Backend unit: 32/32. Frontend Vitest: 192/192 including service-worker cache policy. Seeded Backend integration: 12/12.
- Direct Customer authorization E2E: passed for creator/Admin, assignee, unrelated Member, unrelated Admin, Owner, and atomic rejected bulk update.
- Isolated Chromium critical UI/workflows: 9/9 passed (navigation, Schedule, Task CRUD/lifecycle/realtime, comments/reactions, notifications, and profile synchronization).
- The legacy all-project 100-test command is not a valid shared-fixture gate at eight workers: concurrent projects mutate the same E2E database and hit login rate limits; it reported cascading failures and stale visual baselines. CI therefore runs stateful critical flows with one worker. Cross-device visual tests still require isolated databases or serial project runs.

### Remaining production gates

- Durable transactional outbox/reconciliation is still required for guaranteed Cloudinary/notification/reward side effects; current database writes are transactional and notification delivery has retry handling, but this is not a full persistent outbox.
- Complete Rewards catalog/redemption/mission browser coverage and localized reward decision notifications.
- Run manual Thai/English, Purple/Green, Light/Dark, device matrix and physical Safari UAT.
- Validate real staging SendGrid/VAPID, alerts, retention policy, and a production-like restore runbook.
- Continue the module-by-module legacy lint reduction and platform dependency security upgrade.
- No commit, push, deployment, or production credential change was performed.
