# FollowMee — Senior Fullstack Product Review หลังปิด P1

วันที่รีวิว: 14 สิงหาคม 2026  
ขอบเขต: รีวิวจาก working tree ปัจจุบันหลังปิด P1, authenticated read-only UAT และการตรวจโครงสร้างโค้ดแบบ static review  
สถานะ: เอกสารส่งต่อสำหรับ session ถัดไป

> เอกสารนี้เป็น product/engineering review ไม่ใช่ผล benchmark เชิง production และยังไม่ใช่ผลจาก destructive E2E หรือ mutation flow จริงบนฐานข้อมูล disposable

## ภาพรวมปัจจุบัน

FollowMee ขยับจากประมาณ **7.8/10 เป็นประมาณ 8.3/10** หลังปิดงาน P1

ระบบตอนนี้ใช้งานจริงได้ มี workflow หลักครบ และมีเอกลักษณ์ชัดขึ้น โดยเฉพาะเส้นทาง:

```text
My Work → Task Detail → Completed Work
Analytics → Focus next → หน้าที่ต้องแก้
```

จุดที่ยังทำให้ภาพรวมไม่ถึงระดับ polished product เต็มตัวคือ page orchestration ที่ยังใหญ่, realtime ที่ยังมี fallback แบบ broad invalidation, visual language ที่ยังไม่เป็นหนึ่งเดียวทุกหน้า, admin/settings ที่หนาแน่น และ error บางเส้นทางที่ยัง generic

คะแนนเป็นการประเมินเชิงผลิตภัณฑ์จาก 4 มิติ:

- functionality และ permission behavior 40%
- UX/UI และความเข้าใจง่าย 30%
- performance/realtime/resource usage 20%
- maintainability/accessibility 10%

## คะแนนรายหน้า ณ ตอนนี้

| หน้า | เดิม | ตอนนี้ | ความเห็นหลัก |
|---|---:|---:|---|
| Login / Register / Recovery | 8.0 | **8.4** | มี Auth shell และ feedback กลางแล้ว ฟอร์มใช้งานดีขึ้น เหลือแยก validation/form orchestration และตรวจ reduced-motion ให้ครบทุก transition |
| Dashboard | 6.8 | **8.1** | Daily Focus และ hierarchy ดีขึ้นมาก ผู้ใช้รู้ว่าควรทำอะไรต่อ แต่ยังมีข้อมูลจำนวนมากและ initial load มี request ซ้อนบางส่วน |
| My Work | 8.5 | **8.7** | ยังเป็นหนึ่งในหน้าที่ดีที่สุดด้าน action-first เห็นงานและปุ่มทำต่อชัด มี loading/error/retry แล้ว เหลือ polish Saved View และ empty states บางแบบ |
| Task Detail | 8.1 | **8.4** | workflow, next actor และ blocked state เข้าใจง่ายขึ้น error ถูกแปลแล้ว แต่ mutation/dialog logic ยังรวมอยู่ใน page เดียวและบาง action invalidate กว้าง |
| Tasks & Schedule | 7.3 | **8.0** | filter progressive disclosure, bulk bar, safe-area และ keyboard task card ดีขึ้นชัดเจน แต่ยังหนาแน่นและ orchestration ใหญ่มาก |
| Customers | 7.8 | **8.3** | stale-data, retry และ capabilities ทำให้เชื่อถือได้ขึ้น มี controller แยกแล้ว แต่ page ยังประมาณ 1,200 บรรทัดและมี dialog/form/selection logic รวมกันมาก |
| Profile Cards | 8.2 | **8.5** | editor, shared states, sticky save/publish และ safe-area ดีขึ้นมาก เหลือ editor ที่ยาวและ preview ที่ยังไม่ใช่ projection สมบูรณ์แบบ |
| Analytics | 8.6 | **8.8** | ดีที่สุดด้าน information hierarchy และ decision support เหลือ polish CTA/deep-link edge cases |
| Completed Work | 8.4 | **8.6** | feed/reaction/query controller แยกแล้ว achievement มีคุณค่าขึ้น แต่ task actions, dialogs และ reaction flow ยังอยู่ใน entry มาก |
| Rewards | 7.6 | **8.2** | lazy-query และ surface ดีขึ้น เปิด tab แล้วไม่โหลดทุกอย่างทันที แต่ mutation refresh ยัง invalidate กว้างและ Manage ยังหนาแน่น |
| User Profile | 7.3 | **8.1** | save-before-publish และ unsaved warning แก้ความเสี่ยงหลักแล้ว เหลือ preview, error specificity และ theme/profile presentation |
| Notifications | 7.4 | **8.2** | Load more, grouping, safe deep-link และ realtime ดีขึ้น เหลือ action ที่ refetch ทั้งชุดและ dropdown ที่ยังใช้จำนวนจำกัด |
| Settings | 7.6 | **8.0** | แบ่งส่วนและมี Saving/Saved/Save failed แล้ว แต่ยังยาว และ Liquid Glass controls ทำให้ visual language ปะปน |
| User Management | 7.1 | **7.8** | capability-driven และ mobile card ดีขึ้น แต่ table/dialog orchestration ยังใหญ่ และ invitation actions ยังมี direct fetch/error handling บางส่วน |

## จุดที่ดีขึ้นชัดเจน

### ประสบการณ์หลัก

- Dashboard มี Daily Focus และ “งานที่ควรทำต่อ” เป็นจุดเริ่มต้นที่ชัดขึ้น
- My Work ยังคงเป็น action-first และเหมาะกับการเปิดเพื่อเริ่มงานทันที
- Task Detail สื่อ workflow, ผู้รับผิดชอบถัดไป และ blocked state ได้ดีขึ้น
- Completed Work และ Achievement ให้ความรู้สึกว่าการทำงานมีผลลัพธ์และมีสิ่งสะสม
- Analytics ช่วยบอก “ควรแก้ปัญหาอะไรต่อ” แทนการเป็นเพียงหน้ารายงาน
- Rewards มี Next mission และ lazy-query ที่ช่วยลดภาระตอนเปิดหน้า

### Reliability และ safety

- มี shared PageShell/PageHeader/PageLoading/PageError/PageEmpty/PageActionBar
- Error state สำคัญมี retry และไม่แสดง raw backend text ในหลายเส้นทาง
- User Profile ใช้ save-before-publish และแจ้ง unsaved state ก่อนออกจากหน้า
- Public profile แยก network/permission และคง 404 แบบรวมเพื่อไม่เปิดเผย private profile
- User Management เริ่มใช้ backend capabilities เป็น source of truth แทน role-name checks สำหรับ permission behavior
- Customer มี stale-data warning, retry และรักษาข้อมูลเดิมเมื่อโหลดใหม่พลาด

### Accessibility และ mobile

- Schedule task card เป็น semantic article
- primary task action แยกจาก checkbox/image/action menu
- รองรับ Enter/Space และ focus-visible
- sticky action bar และ bottom padding รองรับ safe-area
- UAT ครบ 4 viewport และ 8 ชุด light/dark × purple/green × ไทย/อังกฤษ โดยไม่พบ horizontal overflow ในเส้นทางหลัก

### Realtime

- มีสถานะ Connected / Reconnecting / Offline / Last updated ให้ผู้ใช้เห็น
- มี typed RealtimeDomainEvent
- มี revision/entity IDs และ coalescing ภายในรอบสั้น
- task list, task detail, My Work และ reward summary บางส่วนสามารถ patch cache ได้
- browser UAT เมื่อหยุด backend แสดงพฤติกรรม Connected → Reconnecting → Connected หลัง backend กลับมา

## สิ่งที่ยังขาดหรือควรทำต่อ

## 1. Realtime ยังไม่สมบูรณ์เต็มที่

ตอนนี้ดีขึ้นจาก broad invalidation เดิม แต่ยังมีความเสี่ยงและต้นทุนเหลืออยู่:

- `revision` ยัง optional ทำให้ event เก่าบางรูปแบบอาจตัดสินลำดับได้ไม่แน่นอน
- การเทียบ revision ที่ไม่ใช่ timestamp อาจพึ่งพา lexical ordering
- bulk task event ต้องระวัง task IDs ที่ order ต่างกันและ pagination ที่มีหลาย cache key
- task ที่เปลี่ยน status/assignee อาจควรถูกย้ายออกจาก list ที่ไม่ตรง filter แทนการ patch อย่างเดียว
- reaction/comment อาจ update detail ได้ แต่ aggregate count ใน feed บางแห่งอาจไม่ครบทุกกรณี
- fallback ยัง invalidate `tasks`, `my-work`, `rewards` หรือ `dashboard` แบบกว้างเมื่อ payload ไม่เพียงพอ
- mutation flow ใน Schedule, Task Detail และ Completed Work ยังมี invalidate กว้าง แม้ไม่ใช่ WebSocket path

ผลต่อผู้ใช้: โดยทั่วไปข้อมูลสดขึ้นและเชื่อถือได้ขึ้น แต่เมื่อมีหลายแท็บหรือ event ถี่ ผู้ใช้อาจเห็น loading/refetch หรือรายการกระพริบมากกว่าที่จำเป็น

## 2. Page extraction ยังไม่จบในเชิง maintainability

ขนาด page entry ปัจจุบันยังใหญ่ในหน้าที่มีความเสี่ยงสูง:

- Customer ประมาณ 1,200 บรรทัด
- Schedule ประมาณ 1,000 บรรทัด
- User Management ประมาณ 700 บรรทัด
- Profile editor ประมาณ 680 บรรทัด
- Dashboard ประมาณ 620 บรรทัด
- Completed Work ประมาณ 590 บรรทัด

ควรแยกต่อเป็น controller/query hooks, toolbar, filters, list/grid, dialogs และ mutation feedback โดยให้ page entry เหลือ orchestration เป็นหลัก

นี่ไม่ใช่ปัญหา performance โดยตรง แต่เพิ่มความเสี่ยง regression, ทำ code review ยาก และทำให้การแก้ permission/URL state ในอนาคตช้าลง

## 3. Visual language ยังไม่เป็นหนึ่งเดียวทุกหน้า

หน้าที่มีความรู้สึกเป็น product มากที่สุดตอนนี้คือ Analytics, My Work, Profile editor และ Completed Work

หน้าที่ยังรู้สึกผสมระหว่าง UI รุ่นเก่ากับรุ่นใหม่:

- Settings ยังมี Paper/Liquid Glass controls และ advanced options ที่แสดงพร้อมกันมาก
- User Management ยังมี table/card/dialog style แบบ admin console ที่หนาแน่น
- Schedule ยังมี controls จำนวนมากและ spacing แบบ legacy
- Customer ยังมีรายละเอียดแน่นและบางส่วนยังไม่ใช้ shared surface language เต็มที่
- Rewards Manage ยังมี form และ destructive actions ในพื้นที่เดียวกันมากเกินไป

เป้าหมายถัดไปควรเป็น consistency ของ hierarchy, border, radius, elevation, spacing และ primary action ต่อ section มากกว่าการเพิ่ม visual effect ใหม่

## 4. Performance ยังมีจุดประหยัดได้

จุดที่ควรลด request หรือการ render ที่ไม่จำเป็น:

- Dashboard initial load มี overview, stats และ React Query data บางส่วนที่ซ้อนกัน
- Dashboard refresh static data ทุก 2 นาที แม้ข้อมูลบางส่วนไม่ต้อง polling ตลอดเวลา
- Posts/Completed Work ยังต้องโหลด task collection ขนาดใหญ่เพื่อรองรับหลาย action
- Customer โหลด assignable users แยก แม้ผู้ใช้อาจยังไม่เปิด form
- User Management โหลด users, roles และ invitations แยกกัน และ invitation data ควร lazy-load เมื่อเปิด section/dialog
- Rewards refresh หลัง mutation ยัง invalidate กลุ่ม `rewards` และ `dashboard` กว้างกว่าที่จำเป็น
- หลายหน้าใช้ refetch หลัง mutation แทนการ patch cache เมื่อ response มี snapshot เพียงพอ

ผลต่อผู้ใช้: ระบบยังเร็วพอในการใช้งานทั่วไป แต่ account ที่มี task/customer/user จำนวนมากจะเห็นเวลาโหลดและ network traffic สูงขึ้นชัดเจน

## 5. Error consistency ยังมีหลุมเล็ก ๆ

จุดที่ควรเก็บรอบสุดท้าย:

- User Profile save/publish ยัง generic กว่าการแยก network, permission, conflict และ validation
- Rewards mutation บางตัวบอกเพียง “ลองใหม่” โดยไม่บอกสาเหตุหรือ next action
- User Management invitation resend/revoke ยังใช้ direct fetch และไม่ผ่าน typed error descriptor ทุกเส้นทาง
- Customer form validation บางข้อความยังฝังอยู่ใน schema เดิม
- Settings แสดง save failed ได้ แต่ยังไม่มีรายละเอียดที่ช่วยผู้ใช้แก้ปัญหา
- Public profile 404 ตั้งใจรวมหลายกรณีเพื่อ privacy ซึ่งถูกต้อง แต่ควรมีคำแนะนำ next action ที่ชัดโดยไม่เปิดเผยข้อมูล

## 6. ประสบการณ์ของผู้ใช้ยังดีไหม

คำตอบคือ **ยังดีและน่าใช้ขึ้นอย่างชัดเจน** โดยเฉพาะคนที่เข้ามาทำงานเป็นประจำ:

- เปิด My Work แล้วเริ่มงานได้เร็ว
- เปิด task แล้วเห็นสถานะและ next action
- ทำเสร็จแล้วเห็นผลลัพธ์ใน Completed Work/Achievement
- Analytics ช่วยชี้ปัญหาแทนการให้ผู้ใช้ค้นเอง
- Rewards เพิ่มแรงจูงใจโดยไม่บังคับให้โหลดข้อมูลทั้งหมดทันที
- ภาษา, theme, responsive behavior และ feedback มีความน่าเชื่อถือขึ้น

## จุดที่ทำให้ผู้ใช้ยังรู้สึกเหนื่อย

- Dashboard ยังมีข้อมูลมากสำหรับผู้ใช้ใหม่ แม้ hierarchy จะดีขึ้นแล้ว
- Schedule ยังต้องตัดสินใจหลายอย่างพร้อมกัน โดยเฉพาะบน mobile
- Admin pages เช่น Customer/User Management ยังให้ความรู้สึกเป็นเครื่องมือหลังบ้านมากกว่า product experience
- บาง error บอกว่าล้มเหลว แต่ไม่บอกว่าผู้ใช้ควรทำอะไรต่อ
- Realtime status แสดงแล้ว แต่ผู้ใช้อาจยังไม่เข้าใจความต่างระหว่าง Reconnecting กับ Offline
- Settings มีตัวเลือกขั้นสูงมากและยังต้องเลื่อนค่อนข้างยาว

## มุมมองด้าน resource และความสิ้นเปลือง

### สิ่งที่ทำได้ดีแล้ว

- route ถูก lazy-load
- React Query มี stale time และ placeholder ในหลายจุด
- Rewards มี lazy-query strategy
- WebSocket มี reconnect และ heartbeat
- Customer API มี stale/aborted request handling บางส่วน
- bundle budget ล่าสุดอยู่ในเกณฑ์ที่กำหนด โดย initial entry ประมาณ 287 KB

### สิ่งที่ควรลดต่อ

- broad invalidation หลัง mutation และ realtime fallback
- duplicate fetch ระหว่าง dashboard overview/stats/summary
- polling ที่ไม่จำเป็นเมื่อ tab ไม่ active หรือข้อมูลไม่มีการเปลี่ยนแปลงบ่อย
- โหลด user/customer/task collection ขนาดใหญ่ก่อนผู้ใช้เปิดส่วนที่เกี่ยวข้อง
- render dialogs/forms จำนวนมากพร้อมกัน แม้ยังไม่เปิด

## สรุปแบบ Senior Fullstack Developer

P1 functional work ถือว่าปิดได้ดี ระบบพร้อมใช้งานจริงมากกว่าเดิมอย่างชัดเจน และมี product loop ที่น่าใช้แล้ว คะแนนที่ยังไม่ถึง 9 ไม่ได้เกิดจาก feature หลักขาด แต่เกิดจากคุณภาพรอบสุดท้าย:

1. realtime semantics และ cache invalidation ยังไม่ละเอียดพอ
2. page orchestration ยังใหญ่ในหน้าที่ซับซ้อน
3. visual language ยังไม่เหมือนกันทุก route
4. admin/settings ยังหนาแน่นและใช้ความคิดสูง
5. error บางจุดยังไม่ actionable พอ
6. full mutation integration ยังไม่ได้ตรวจบน disposable database

## ลำดับงานที่แนะนำหลังจากนี้

### ระยะที่ 1 — Realtime correctness และ cost

- บังคับ/กำหนดรูปแบบ revision ให้ชัดเจนและเปรียบเทียบแบบ typed
- รองรับ entity-level revision สำหรับ bulk events
- patch/remove รายการตาม filter/pagination ให้ถูกต้อง
- ลด fallback invalidation ให้เหลือเฉพาะ membership/count/schema change
- ปรับ mutation paths ที่ยัง refetch ทั้งชุด

### ระยะที่ 2 — Extraction เพื่อ maintainability

- Schedule: controller, filter panel, task list, dialogs
- Customer: controller, toolbar, stats, list/grid, form/dialogs
- User Management: capability-aware data hooks, table, mobile cards, dialogs
- Profile editor: form sections, validation, preview, save/publish action bar
- Dashboard: data orchestration, summary, chart และ insights hooks

### ระยะที่ 3 — Visual consolidation

- ปรับ Settings ให้ progressive disclosure ชัดขึ้น
- ทำ User Management และ Customer ให้ใช้ surface/token เดียวกับ Analytics
- ลด legacy Liquid Glass ที่ไม่จำเป็น
- กำหนด spacing/radius/elevation/primary-action rule กลาง

### ระยะที่ 4 — Performance และ error polish

- รวม/ลด Dashboard requests
- lazy-load users, invitations, dialogs และ admin data
- เพิ่ม user-facing error descriptor ให้ Rewards, Profile, Settings และ invitations
- ตรวจ translation source-policy รอบสุดท้าย

### ระยะที่ 5 — Verification ที่ยัง deferred

- authenticated mutation E2E บน disposable database เท่านั้น
- long-list performance profiling
- realtime multi-tab/out-of-order event soak test
- production-like Lighthouse/Web Vitals measurement

## สิ่งที่ยังไม่ควรทำในรอบถัดไป

- ไม่เพิ่ม feature ใหญ่ก่อนลด complexity ของหน้าหลัก
- ไม่เพิ่ม visual effect ใหม่เพื่อแก้ปัญหา hierarchy
- ไม่ใช้ role-name checks ใหม่ใน frontend
- ไม่ทำ destructive E2E บนฐาน `followmee`
- ไม่ reset/drop/seed/migrate และไม่เขียนข้อมูลทดสอบ

## Prompt สำหรับเริ่ม session ถัดไป

ใช้ข้อความนี้เพื่อให้ทำงานต่อได้ตรงบริบท:

> อ่าน `FOLLOWMEE_PRODUCT_REVIEW_20260814.md` และ `FOLLOWMEE_SENIOR_REVIEW_P1_STATUS_20260814.md` ก่อนเริ่มงาน จากนั้นตรวจ `git status`, `git log`, diff เดิม และ `doctor:db` แบบ read-only โดยห้าม reset/drop/seed/migrate หรือเขียนข้อมูลทดสอบลง `followmee` และห้ามทับ changes เดิม
>
> เราปิด P1 แล้ว คะแนนภาพรวมปัจจุบันประมาณ 8.3/10 งานที่เหลือตามลำดับคือ:
> 1. Realtime correctness/cost: revision, entity-level ordering, pagination-aware patch และลด broad invalidation
> 2. แยก Schedule, Customer และ User Management เพื่อ maintainability โดยรักษา API, permission, URL state และ realtime behavior เดิม
> 3. Visual consolidation ของ Settings, Customer, Schedule และ User Management
> 4. Performance ลด duplicate fetch, polling และ eager loading
> 5. Error/translation consistency รอบสุดท้าย
>
> ก่อนแต่ละ milestone ให้สรุป scope และไฟล์ที่จะเปลี่ยน หลังแต่ละ milestone ตรวจเฉพาะส่วนที่เปลี่ยน, build, lint, diff check และ browser UAT ตามความเสี่ยง งาน browser ต้องเป็น read-only และ mutation ใช้ mocks/component tests เท่านั้นจนกว่าจะมี disposable database

## วิธีแจ้งเพื่อให้ดำเนินงานต่อใน session ใหม่

เพียงแจ้งสั้น ๆ ว่า:

> “ทำงานต่อจาก `FOLLOWMEE_SENIOR_REVIEW_P1_STATUS_20260814.md` เริ่ม Milestone 1: Realtime correctness/cost ตรวจ scope ก่อนแก้ และรักษาข้อจำกัดฐานข้อมูลเดิม”

ถ้าต้องการใช้ signed-in browser UAT ให้เพิ่ม:

> “มี signed-in in-app browser tab เปิดอยู่ ให้ claim tab เดิมและใช้เฉพาะ read-only UAT ห้ามกด mutation”

ถ้าต้องการให้เริ่มจากหน้าใดหน้าเดียว ให้ระบุเพิ่ม เช่น:

> “เริ่มจาก Schedule extraction ก่อน และอย่าแตะ Customer ใน milestone นี้”

เมื่อเริ่ม session ใหม่ ควรแจ้งด้วยหากมีเงื่อนไขเปลี่ยน เช่น อนุญาต disposable database แล้ว, ต้องการให้ทำเฉพาะ code review, หรือยังไม่ต้องการ browser UAT

