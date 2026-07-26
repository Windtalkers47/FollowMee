# FollowMee — Technical & Product Audit

วันที่ตรวจ: 23 กรกฎาคม 2026

## ข้อสรุป

ไม่ควรรื้อ business logic ทั้งโปรเจกต์ เพราะระบบมี auth, RBAC, customers,
tasks, comments, notifications, analytics และ public profile อยู่แล้วในระดับที่
นำไปพัฒนาต่อได้ สิ่งที่ควรยกเครื่องคือ design system, responsive navigation,
profile experience และกระบวนการควบคุม schema/migration

แนวทางที่เหมาะกับ FollowMee คือ pastel ที่มีสี accent สดเฉพาะ action สำคัญ
ร่วมกับชั้นกระจกและความลึกแบบ 3D ที่ใช้ CSS เท่าที่จำเป็น วิธีนี้ดูมีเอกลักษณ์
โหลดเร็วกว่า 3D engine และยังใช้งานได้ดีบนมือถือระดับกลาง

## Database audit

Schema ที่รันจริงมี 21 tables และข้อมูลปัจจุบันมีอย่างน้อย 1 user, 2 customers
และ 8 sessions จึงยังไม่ควรลบโดยไม่มี export

ปัญหาที่พบ:

- `task_likes` มี foreign-key columns ซ้ำเป็น `taskTaskId` และ `userUserId`
  เพราะ relation เดิมไม่มี `@JoinColumn` แม้จะมี `taskId` และ `userId` อยู่แล้ว
- `customers.customerEmail` มี unique indexes ซ้ำสองชุด
- notification cleanup ใช้ alias ใน `DELETE`/`UPDATE` ที่ SQL จริงไม่ได้ประกาศ
  alias จึงเกิด `Unknown column recipient.isDeleted`
- schema จริงของ `notification_metrics` ไม่มี foreign keys ตาม entity
- `notification_queue.recipientUserId` ไม่มี foreign key ทำให้เกิด orphan row ได้
- schema, TypeORM entities, handwritten SQL และ migrations ไม่ได้มี source of truth
  เดียวกัน
- collation ปัจจุบันเป็น `utf8_unicode_ci`; ควรใช้ `utf8mb4` เพื่อรองรับ emoji
  และอักขระ Unicode ครบ
- audit logs เดิมลบตาม user (`CASCADE`) ซึ่งลดคุณค่าของ audit trail
- indexes บางส่วนซ้ำ แต่ composite indexes สำหรับ inbox, cleanup และ task due-date
  queries ยังไม่ตรงกับรูปแบบ query ที่ใช้งานจริง

ไฟล์ `database/followmee-clean-schema.sql` แก้ประเด็นเหล่านี้และผ่านการสร้างจริง
ใน temporary validation database: 21 tables, 29 foreign keys, 71 indexes

## Frontend / UX audit

ปัญหาที่ตรวจจาก browser จริง:

- หน้า Customer Profile บน viewport 390px เดิมมี document width 556px
- ปุ่ม Save/Copy ถูกบีบเป็นคอลัมน์แคบและอ่านยาก
- sidebar ใช้ permanent drawer ทุกขนาด แม้มีปุ่ม mobile menu
- public profile เรียก protected endpoint ก่อน จึงสร้าง 401 error ทุกครั้ง
- social values ที่เป็น handle เช่น `Kanom.ig` ถูกใช้เป็น URL โดยตรง
- ยังไม่มี first-use onboarding หรือคำสั่ง replay ใน Settings
- component หลักมีขนาดใหญ่ (`MainLayout` และ `CustomerProfilePage`) ทำให้แก้และ
  ทดสอบยาก
- API client ซ้ำกันระหว่าง `src/api` และ `src/services/api`

สิ่งที่ปรับแล้ว:

- mobile ใช้ temporary drawer; desktop ยังใช้ collapsible permanent drawer
- Customer Profile responsive โดยไม่มี horizontal overflow
- social handles ถูกแปลงเป็น URL ของแต่ละ platform
- public URL โหลด public endpoint โดยตรง
- เพิ่ม 4-step onboarding และ Replay guide ใน Settings
- เพิ่ม depth, restrained motion และ pastel immersive treatment โดยไม่เพิ่ม
  3D library
- dark mode เดิมยังทำงานร่วมกับ action colors และ onboarding

## Experimental navigation

ใช้ได้ แต่ไม่ควรทำให้เมนูหลักคาดเดายาก รุ่นนี้ใช้ adaptive navigation ก่อน:

- Desktop: collapsible side navigation
- Phone: temporary drawer
- First use: guided onboarding
- Later phase: command palette (`Cmd/Ctrl + K`) สำหรับ power users

ไม่แนะนำ radial menu หรือ gesture-only navigation เป็น navigation หลัก เพราะ
discoverability และ accessibility ต่ำ โดยเฉพาะผู้ใช้ใหม่

## Remaining technical debt

- `npm run build` ฝั่ง frontend ยังไม่ผ่านจาก TypeScript errors เดิมจำนวนมาก:
  unused code กระจายในหลายหน้า และ Chart.js type mismatches ใน Dashboard
- root `npm test` ยังเป็น placeholder
- frontend test coverage ครอบคลุมเพียง utility/theme บางส่วน
- onboarding รุ่นนี้จำสถานะต่อ user ใน browser; หากต้อง sync ข้ามอุปกรณ์ควรเพิ่ม
  `user_preferences.onboardingCompletedAt` และ API ใน phase ถัดไป
- ควรแยก `MainLayout` เป็น AppHeader, DesktopNav, MobileNav, ProfileMenu
- ควรรวม API client ให้เหลือชุดเดียวและกำหนด public/protected endpoints ชัดเจน
- ควรเพิ่ม route-level lazy loading เพื่อลด initial JavaScript
- ควรเพิ่ม Playwright responsive smoke tests ที่ 390, 768, 1280 และ 1440px

## Verification

- Backend TypeScript build: ผ่าน
- Frontend Vite production bundle: ผ่าน
- Clean SQL isolated validation: ผ่าน
- Public profile desktop: โหลดสำเร็จ ไม่มี console error
- Public profile mobile: document/client width เท่ากันที่ 375px ไม่มี overflow
- Social URLs: มี `https://` และชี้ไปยัง platform ที่ถูกต้อง
