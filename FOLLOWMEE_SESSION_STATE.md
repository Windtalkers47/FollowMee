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
