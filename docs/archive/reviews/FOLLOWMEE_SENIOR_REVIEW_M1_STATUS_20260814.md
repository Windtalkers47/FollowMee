# FollowMee — Senior Fullstack Review หลัง Milestone 1

วันที่รีวิว: 14 สิงหาคม 2026  
ขอบเขต: working tree หลังงาน P1 และ Milestone 1 — Realtime Correctness and Cost  
สถานะ: เอกสารเพื่อทำความเข้าใจก่อนเลือกงานใน session ถัดไป

> เอกสารนี้เป็น product/engineering review จากโค้ดปัจจุบัน ผลทดสอบ และ authenticated read-only UAT ไม่ใช่ production benchmark และยังไม่มี mutation E2E บน disposable database

## Executive summary

คะแนนภาพรวมขยับจาก **8.3/10 เป็นประมาณ 8.5/10**

Milestone 1 แก้เรื่องที่มีความเสี่ยงสูงได้ตรงจุด: task realtime มี version ราย entity, event เก่าถูกปฏิเสธอย่างมีลำดับ, bulk partial failure ไม่ประกาศรายการที่ล้มเหลว, list cache ตรวจ membership ตาม filter และ mutation ส่วนใหญ่ patch จาก response snapshot แทนการ refetch ทั้งกลุ่ม

ผลที่ผู้ใช้สัมผัสได้คือข้อมูลระหว่าง Schedule, My Work, Task Detail และ Completed Work นิ่งและเชื่อถือได้ขึ้น มีโอกาสกระพริบหรือโหลดซ้ำหลัง action น้อยลง โดยเฉพาะเมื่อเปิดหลายหน้า/หลายแท็บ

อย่างไรก็ตาม ระบบยังไม่ควรได้ 9/10 เพราะ:

- หน้าหลักบางหน้ายังใหญ่และรับผิดชอบหลายเรื่องเกินไป
- Schedule และ admin pages ยังใช้แรงคิดสูง โดยเฉพาะบนจอเล็ก
- Dashboard ยังมี request ซ้อนและ polling ทุก 2 นาทีเมื่อ tab มองเห็นอยู่
- visual language ของ Settings, Schedule, Customers และ User Management ยังไม่เป็นชุดเดียวกัน
- error และคำแปลบางเส้นทางยังไม่บอก next action ชัด
- realtime ยังต้องพิสูจน์ด้วย multi-tab/out-of-order soak test และ mutation E2E บนฐานทดสอบที่ทิ้งได้

## วิธีให้คะแนน

- functionality และ permission behavior 40%
- UX/UI และความเข้าใจง่าย 30%
- performance, realtime และ resource usage 20%
- maintainability และ accessibility 10%

คะแนนเป็นการประเมินเชิงผลิตภัณฑ์ ไม่ใช่คะแนนจาก Lighthouse หรือ Web Vitals ใน production

## คะแนนรายหน้า

| หน้า | หลัง P1 | หลัง M1 | เปลี่ยนแปลง | ความเห็นหลัก |
|---|---:|---:|---:|---|
| Login / Register / Recovery | 8.4 | **8.4** | — | Auth shell และ feedback ใช้งานดีแล้ว รอบนี้ไม่ได้เปลี่ยนพฤติกรรมหลัก เหลือแยก form/validation orchestration และตรวจ reduced motion ให้ครบ |
| Dashboard | 8.1 | **8.2** | +0.1 | ได้ประโยชน์จาก cache/realtime ที่นิ่งขึ้น แต่ initial data ยังมาจากหลายแหล่งและ static overview ยัง refresh ทุก 2 นาที |
| My Work | 8.7 | **8.9** | +0.2 | เป็นหน้าที่แข็งแรงที่สุดด้าน action-first; status/assignee change สามารถย้ายงานเข้า–ออก cache และปรับ counts ได้แม่นขึ้น |
| Task Detail | 8.4 | **8.7** | +0.3 | mutation response ถูกใช้ patch task/list มากขึ้น, block/unblock ได้ snapshot กลับมา และ event เก่าไม่เขียนทับข้อมูลใหม่ เหลือ duplicate action ที่ยังต้อง invalidate list |
| Tasks & Schedule | 8.0 | **8.5** | +0.5 | ได้ประโยชน์สูงสุดจาก M1: filter-aware membership, pagination-aware reconciliation และ bulk snapshot ลด refetch ชัดเจน แต่หน้า entry ยัง 1,031 บรรทัดและมีหลาย responsibility |
| Customers | 8.3 | **8.3** | — | reliability ดีจาก P1 แต่ page entry ยัง 1,204 บรรทัด มี selection, form, dialog และ presentation รวมกันมากเกินไป |
| Profile Cards | 8.5 | **8.5** | — | save/publish flow แข็งแรง แต่ editor ยัง 678 บรรทัดและ preview ยังไม่ใช่ projection ที่สมบูรณ์ |
| Analytics | 8.8 | **8.8** | — | information hierarchy และ decision support ดีที่สุดกลุ่มหนึ่ง รอบนี้ไม่มีการเปลี่ยนสำคัญ |
| Completed Work | 8.6 | **8.8** | +0.2 | membership/order และ comment/reaction summary ถูก target ดีขึ้น ลดการ refresh ส่วนที่ไม่เกี่ยวข้อง เหลือ entry ประมาณ 605 บรรทัด |
| Rewards | 8.2 | **8.4** | +0.2 | invalidation จำกัดที่ summary/achievements มากขึ้น แต่ Manage experience และ destructive actions ยังหนาแน่น |
| User Profile | 8.1 | **8.1** | — | save-before-publish และ unsaved warning ดีอยู่แล้ว เหลือ error specificity และ preview/presentation |
| Notifications | 8.2 | **8.2** | — | grouping, load more และ safe deep-link ดี รอบนี้ไม่ได้เปลี่ยนแกนหลัก |
| Settings | 8.0 | **8.0** | — | feedback ตอนบันทึกมีแล้ว แต่หน้า 552 บรรทัด ตัวเลือกยาว และ control styles ยังผสมกัน |
| User Management | 7.8 | **7.8** | — | permission เป็น capability-driven แล้ว แต่ page entry 705 บรรทัดและ table/card/dialog/data loading ยังแน่น |

คะแนนเพิ่มเฉพาะหน้าที่ได้รับผลจาก realtime/cache policy โดยตรง เพื่อไม่ให้การปรับ infrastructure ถูกนับเป็น UX improvement ของทุกหน้าเกินจริง

## สิ่งที่ Milestone 1 ทำให้ดีขึ้นจริง

### 1. ความถูกต้องของข้อมูลข้ามแท็บ

- task event มี `schemaVersion`, `occurredAt` และ `changes[]`
- แต่ละ task change มี numeric `version` ของตัวเอง ไม่ใช้ลำดับของ bulk array เป็นตัวตัดสิน
- mutation สำคัญเพิ่ม version หลังเขียนสำเร็จ
- bulk event ส่งเฉพาะ task ที่สำเร็จ จึงไม่สร้างภาพลวงว่ารายการที่ล้มเหลวถูกแก้แล้ว
- วันที่ถูก normalize เป็น ISO ที่ backend boundary และไม่พึ่ง lexical comparison แบบเดิม
- legacy payload ยังรองรับเพื่อ rolling deployment แต่ถ้าไม่มี ordering metadata เพียงพอ client จะไม่ patch แบบเสี่ยง

### 2. Cache reconciliation ตรงกับ query มากขึ้น

- Schedule ตรวจ status, assignee, creator, due filter, search uncertainty และ draft visibility
- task ที่ไม่ตรง filter ถูกนำออก ไม่ใช่เพียงแก้ field แล้วปล่อยให้อยู่ผิด list
- My Work ปรับ membership และ count ตาม before/after snapshot
- Completed Work ปรับ membership และลำดับโดย target เฉพาะ cache ที่เกี่ยวข้อง
- page 1 สามารถเพิ่มและ trim ตาม limit ได้ ส่วน later page ที่ต้องเลื่อนสมาชิกข้ามหน้าใช้ targeted invalidation
- duplicate/out-of-order event ถูก coalesce ราย task ID และใช้ revision ล่าสุดของ entity

### 3. ลด request และ render หลัง mutation

- Schedule, My Work, Task Detail และ Completed Work ใช้ response snapshot patch cache มากขึ้น
- bulk response มี task snapshots/deleted IDs แบบ additive ทำให้ client รุ่นใหม่ patch รายการสำเร็จได้ทันที
- comment/reaction/reward refresh ถูกจำกัดที่ task, feed หรือ summary ที่เกี่ยวข้อง
- ไม่มีการเพิ่ม polling ใหม่

ผลสำคัญคือผู้ใช้ไม่ต้องจ่ายค่า network และ loading state ทั้งหน้าเพื่อยืนยันสิ่งที่ server เพิ่งตอบกลับมาแล้ว

## จุดที่ควรแก้ก่อน

### Priority 1 — แยก Schedule โดยคง behavior เดิม

นี่คืองานที่แนะนำที่สุดสำหรับ session ถัดไป เพราะ Schedule เป็นทั้งหน้าที่มีการใช้งานสูงและเป็นจุดที่ realtime/cache logic เชื่อมกับ filter, pagination, bulk action, dialog และ permission มากที่สุด

ควรแยกอย่างน้อยเป็น:

- `useScheduleController` หรือ query/state controller
- filter/search/sort URL-state adapter
- task list/grid และ pagination boundary
- create/edit/complete/review dialogs
- mutation feedback และ bulk action adapter

เป้าหมายไม่ใช่ลดจำนวนบรรทัดเพื่อความสวยงาม แต่ทำให้ realtime policy, permission และ UI state มีขอบเขตที่ทดสอบได้ โดยไม่ redesign และไม่เปลี่ยน API

### Priority 2 — แยก Customers แล้วตามด้วย User Management

- Customers ใหญ่ที่สุดที่ 1,204 บรรทัด แม้มี controller บางส่วนแล้ว ยังควรย้าย form/dialog/selection/list presentation ออกจาก page
- User Management 705 บรรทัด ควรแยก users/roles/invitations query lifecycle และ lazy-load invitation section/dialog
- ทั้งสองหน้าควรรักษา backend capabilities เป็น source of truth และห้ามย้อนกลับไปใช้ role-name checks

### Priority 3 — รวม visual language หลัง component boundary ชัด

ปรับ Settings, Customers, Schedule และ User Management ให้ใช้หลักเดียวกันเรื่อง:

- section hierarchy และ primary action ต่อ section
- spacing, radius, border และ elevation
- empty/loading/error surfaces
- progressive disclosure สำหรับ advanced controls
- destructive action แยกจาก routine action

ควรทำหลัง extraction เพื่อหลีกเลี่ยงการแก้ style ซ้ำใน component ขนาดใหญ่

### Priority 4 — เก็บ performance และ error gaps

- รวม Dashboard overview/stats/summary ที่ซ้อนกัน หรือกำหนด ownership ของแต่ละ response ให้ชัด
- แทน polling 2 นาทีด้วย stale policy, focus refresh หรือ realtime-driven refresh ตามความเหมาะสม
- lazy-load assignable users, roles, invitations และ dialog-heavy data เมื่อผู้ใช้ต้องใช้จริง
- ทำ error ของ Profile, Rewards, Settings และ invitations ให้แยก network/permission/conflict/validation และมี next action
- ตรวจข้อความอังกฤษที่ยังฝังใน toast ของ bulk/smart suggestion และย้ายเข้า translation source

### Priority 5 — Verification ที่ต้องใช้ environment ปลอดภัย

- multi-tab/out-of-order realtime soak test
- authenticated mutation E2E บน disposable database เท่านั้น
- long-list profiling สำหรับ tasks/customers/users
- production-like Lighthouse/Web Vitals หลัง extraction และ request consolidation

## ประสิทธิภาพและการใช้ทรัพยากร

### สถานะที่ดีขึ้น

- frontend initial entry ล่าสุดประมาณ **293 KB** และยังผ่าน budget 450 KB
- full frontend suite ผ่าน 50 files / 352 tests
- full backend suiteผ่าน 14 suites / 51 tests
- realtime targeted tests ผ่าน frontend 9/9 และ backend 3/3
- frontend/backend build, targeted lint, `doctor:db` และ `git diff --check` ผ่าน
- list mutation ปกติใช้ cache patch แทน full-list refetch
- broad invalidation ที่เหลือส่วนใหญ่เป็น fallback สำหรับ backend รุ่นเก่า, partial failure หรือ pagination ที่สรุปไม่ได้อย่างปลอดภัย

### ต้นทุนที่ยังเหลือ

- Dashboard โหลด overview พร้อม React Query data เพิ่มเติม และ time-range stats มี lifecycle แยก
- Dashboard polling static data ทุก 2 นาทีเมื่อ tab visible แม้ข้อมูลบางส่วนอาจใช้ event/stale-on-focus ได้
- query `my-work` บน Dashboard ขอสูงสุด 50 รายการเพื่อสร้าง daily focus ซึ่งควรประเมินว่าต้องใช้ snapshot มากเพียงใด
- Schedule/Customers/User Management มี component tree และ local state มาก ทำให้การเปลี่ยนเล็ก ๆ มีโอกาสกระทบ render กว้าง
- Customers โหลด assignable users ตั้งแต่เข้า page; admin data บางชุดยังควร lazy-load
- duplicate task ยัง invalidate `tasks` เพราะ response ไม่มี snapshot เต็ม
- legacy/partial-failure bulk path ยัง invalidate `tasks` และ `my-work` เพื่อรักษาความถูกต้อง ซึ่งยอมรับได้ชั่วคราว

การเพิ่มจากประมาณ 287 KB เป็น 293 KB อยู่ในระดับยอมรับได้สำหรับ correctness layer แต่ควรเฝ้าดูหลัง extraction ไม่ให้เกิด duplicate dependency หรือ eager import เพิ่ม

## ประสบการณ์ของผู้ใช้

### สิ่งที่รู้สึกดี

- My Work เปิดแล้วรู้ทันทีว่าควรทำอะไร
- Task Detail สื่อสถานะ เจ้าของ next action และ blocked state ชัด
- การกด action แล้วรายการเปลี่ยนทันทีโดยไม่กระพริบทั้งหน้า ทำให้ระบบรู้สึกตอบสนองและน่าเชื่อถือขึ้น
- Schedule filter แล้วรายการอยู่ถูกกลุ่มมากขึ้นเมื่อข้อมูลมาจากอีกแท็บ
- Completed Work/Achievements ทำให้ผู้ใช้เห็นผลลัพธ์ของงาน ไม่ใช่เพียงงานหายจากรายการ
- Analytics ยังเป็นหน้าที่ช่วยตัดสินใจได้ดี ไม่ใช่ dashboard ที่มีแต่ตัวเลข
- สถานะ Connected/Reconnecting/Offline ช่วยลดความไม่แน่ใจเมื่อเครือข่ายมีปัญหา

### สิ่งที่ยังทำให้เหนื่อย

- Schedule มี filter, sort, selection, bulk action และหลาย workflow อยู่ในพื้นที่เดียวกัน ผู้ใช้ mobile ต้องสลับบริบทบ่อย
- Customers และ User Management ยังรู้สึกเป็น back-office tool มากกว่า product experience
- Settings แสดงตัวเลือกขั้นสูงมากและต้องเลื่อนยาว
- Dashboard ยังมีข้อมูลหลายระดับสำหรับผู้ใช้ใหม่ แม้ Daily Focus ช่วยแล้ว
- error บางจุดบอกเพียงว่าทำไม่สำเร็จ แต่ไม่บอกว่าควรตรวจอะไรหรือทำต่ออย่างไร
- คำว่า Reconnecting กับ Offline ยังควรมี microcopy ที่อธิบายผลต่อข้อมูลที่ผู้ใช้เห็น
- toast จาก bulk/smart suggestions บางส่วนยังเป็นอังกฤษคงที่ จึงทำให้ประสบการณ์ภาษาไทยไม่ต่อเนื่อง

## ความเสี่ยงที่ยังต้องรู้ก่อนสั่งงานต่อ

- working tree มีงาน P1 และ M1 จำนวนมากที่ยังไม่ commit จึงควรทำ session ถัดไปให้แคบและตรวจ diff ทุกช่วง
- backward-compatible realtime fallback ยังต้องอยู่จนมั่นใจว่า backend/frontend รุ่นใหม่ถูก deploy ครบ
- targeted invalidation ไม่ควรถูกลบทั้งหมด: creation ที่ไม่มี snapshot, aggregate ที่คำนวณไม่ได้, partial failure และ ambiguous later pages ยังควร refetch เพื่อความถูกต้อง
- read-only browser UAT ยืนยัน navigation และ reconnect ได้ แต่ไม่ได้พิสูจน์ create/update/delete/approve/reaction จริง
- ห้ามทำ reset/drop/seed/migrate หรือ mutation test บนฐาน `followmee`

## สรุปในมุม Senior Fullstack Developer

Milestone 1 ปิดได้ดีและมีคุณค่ามากกว่าการ polish ภาพ เพราะแก้ความน่าเชื่อถือของข้อมูลซึ่งเป็นฐานของทุก workflow คะแนนเพิ่มไม่มากแบบก้าวกระโดด เนื่องจากสิ่งที่แก้ส่วนใหญ่ทำให้ “ไม่เกิดปัญหา” มากกว่าสร้าง feature ที่เห็นชัด แต่คุณภาพเชิงระบบดีขึ้นอย่างมีนัยสำคัญ

ตอนนี้คอขวดหลักไม่ใช่ realtime แล้ว แต่เป็น **maintainability และ cognitive load ของหน้าขนาดใหญ่** หากเพิ่ม feature หรือ visual redesign ต่อบน Schedule/Customers/User Management โดยยังไม่แยก boundary ความเสี่ยง regression และต้นทุน review จะเพิ่มเร็ว

คำแนะนำหลักคือทำ **Schedule extraction แบบ behavior-preserving เพียงเรื่องเดียวใน session ถัดไป** จากนั้นค่อยเลือกว่าจะไป Customers/User Management หรือ Dashboard request consolidation ตามเป้าหมายธุรกิจ

## ลำดับงานแนะนำสำหรับ session ถัดไป

### Session 2 — Schedule extraction (แนะนำ)

1. บันทึก baseline tests/build และ inventory ของ Schedule state/query/mutation
2. แยก controller กับ URL/filter state โดยไม่เปลี่ยน query keys
3. แยก list/grid, pagination และ dialogs
4. เพิ่ม characterization tests สำหรับ permission, filter, bulk และ realtime integration
5. ตรวจ diff ว่า API, permission, URL state และ cache behavior ไม่เปลี่ยน
6. ทำ read-only navigation UAT; mutation UAT รอ disposable database

### Session 3 — Customers extraction

แยก page controller, header/stats, list/grid, selection และ form/dialog แล้ว lazy-load assignable users เมื่อเปิด flow ที่ต้องใช้

### Session 4 — User Management extraction

แยก capability-aware hooks, table/mobile cards, roles/invitations และ dialogs พร้อมทำ invitation errors ให้ typed และ actionable

### Session 5 — Visual consolidation และ Settings disclosure

ใช้ shared surface/token เดียวกัน ลด control ที่แสดงพร้อมกัน และทำ advanced settings เป็น progressive disclosure

### Session 6 — Dashboard cost และ final quality

รวม request ownership, ลด polling, เก็บ translation/error gaps และวัด long-list/Lighthouse/Web Vitals

### Session 7 — Safe integration verification

ตั้ง disposable database แล้วทำ mutation E2E และ multi-tab realtime soak โดยไม่แตะฐานจริง

## ทางเลือกหากยังไม่ต้องการ extraction

- ถ้าเน้นความเร็ว/ค่าใช้จ่ายก่อน: ทำ Dashboard request consolidation และ polling policy
- ถ้าเน้น UX ที่เห็นผลทันที: ทำ Settings progressive disclosure และ realtime status microcopy
- ถ้าเน้นความมั่นใจก่อนพัฒนาต่อ: สร้าง disposable DB harness และ realtime soak test

แต่โดย risk-to-value ratio ยังแนะนำ **Schedule extraction ก่อน**

## Prompt พร้อมใช้สำหรับ session ถัดไป

> อ่าน `FOLLOWMEE_PRODUCT_REVIEW_20260814.md`, `FOLLOWMEE_SENIOR_REVIEW_P1_STATUS_20260814.md` และ `FOLLOWMEE_SENIOR_REVIEW_M1_STATUS_20260814.md` ก่อนเริ่ม ตรวจ `git status`, diff เดิม และ baseline tests โดยห้าม reset/drop/seed/migrate ห้ามเขียนข้อมูลทดสอบลงฐาน `followmee` และห้ามทับ P1/M1 changes เดิม
>
> ทำเฉพาะ Schedule extraction แบบ behavior-preserving: แยก controller/query state, URL/filter adapter, task list/pagination, dialogs และ mutation feedback ออกจาก `Frontend/src/pages/Schedule/index.tsx` โดยคง REST routes, Socket.IO event names, permissions, query-key naming, URL state, realtime reconciliation และหน้าตา/พฤติกรรมผู้ใช้เดิม
>
> เพิ่ม characterization tests เฉพาะ boundary ที่แยก รัน targeted tests, full frontend tests, build, lint เฉพาะไฟล์ที่เปลี่ยน และ `git diff --check` ห้ามทำ mutation browser UAT จนกว่าจะมี disposable database

## ประโยคสำหรับ read-only signed-in browser UAT

> Claim signed-in in-app browser tab เดิมและใช้แบบ read-only เท่านั้น ตรวจ navigation, loading/error states และ Connected → Reconnecting/Offline → Connected โดยห้ามกด create/update/delete/approve/reaction และห้ามเขียนข้อมูลจริง หาก tab เดิมไม่มีอยู่ให้รายงานก่อน ไม่ต้องสร้าง session ที่มีการ mutation

## Acceptance สำหรับรอบถัดไป

- Schedule page entry เหลือ orchestration ที่อ่านลำดับงานได้ชัด
- ไม่มี query key, API contract, permission, URL state หรือ realtime behavior เปลี่ยนโดยไม่ตั้งใจ
- ไม่มี broad invalidation เพิ่ม
- tests/build/lint/diff check ผ่าน
- existing P1/M1 changes ไม่ถูกย้อนหรือเขียนทับ
- ไม่มี database migration, seed หรือ mutation บนฐานจริง

## Customer missing-image filter — database decision (17 สิงหาคม 2026)

- Root cause อยู่ที่ filter lifecycle และการส่ง request ไม่ครบระหว่าง pagination/refetch ไม่ใช่ schema ขาดคอลัมน์หรือ API route ใช้งานไม่ได้
- `customers.customerImageUrl` ใน clean schema เป็น `VARCHAR(512) NULL` อยู่แล้ว จึงไม่ต้องแก้ schema, สร้าง migration หรือปรับข้อมูลในฐาน `followmee`
- ความหมายที่ล็อกไว้คือ missing image = `customerImageUrl IS NULL OR customerImageUrl = ''` เท่านั้น ไม่รวม URL ที่โหลดไม่ได้
- Customer list และ Analytics ใช้ predicate กลางเดียวกัน และ request filter กลางรักษา `missingImage` ผ่าน initial fetch, tab change, pagination, page-size change และ refresh
- เมื่อ deep-link filter ได้ศูนย์ รายการจะแสดงข้อความว่าไม่มีลูกค้าที่ตรงกับตัวกรอง พร้อมทางกลับไปดูทั้งหมด แทนข้อความเพิ่มลูกค้าคนแรก
- การตรวจสอบรอบนี้เป็น static/test/read-only เท่านั้น: ไม่ได้ทำ migration, seed, reset, drop, database mutation หรือ browser mutation UAT
