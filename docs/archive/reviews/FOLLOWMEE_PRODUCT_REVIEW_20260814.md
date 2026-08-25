# FollowMee Product Review — 2026-08-14

## ภาพรวม

คะแนนภาพรวมปัจจุบัน: **7.8/10**

FollowMee ใช้งานจริงได้ มีระบบงานครบ และมีเอกลักษณ์ชัดขึ้นมาก โดยเฉพาะ My Work, Analytics, Profile Cards และ Completed Work

สิ่งที่ยังขัดประสบการณ์คือ:

- ผู้ใช้ใหม่เห็นเมนูและความสามารถจำนวนมากเกินไป
- Dashboard กับ Schedule ยังใช้พลังในการทำความเข้าใจสูง
- บางหน้าดู premium แต่บางหน้ากลับเป็น form/table แบบระบบหลังบ้าน
- Realtime ทำงาน แต่ผู้ใช้ไม่รู้ว่าออนไลน์ กำลัง reconnect หรือข้อมูลอาจยังไม่ล่าสุด
- ภาษาไทย/อังกฤษยังมีจุดหลุด เช่น notification error, Saved View และข้อความ blocked บางรายการ

ภาพรวมของระบบตอนนี้มีความรู้สึกเหมือน UI อยู่สามยุคในผลิตภัณฑ์เดียวกัน:

1. Dashboard ใช้ Liquid Glass และข้อมูลจำนวนมาก
2. หน้างานเดิมใช้กล่องและ controls ค่อนข้างแน่น
3. Analytics และ Achievement รุ่นใหม่เรียบ ชัด และเน้นการตัดสินใจมากกว่า

เป้าหมายถัดไปควรเป็นการทำให้ของที่มีอยู่เบาลง เป็นภาษาเดียวกัน และพาผู้ใช้ไปยังสิ่งสำคัญได้เร็วขึ้น โดยยังไม่จำเป็นต้องเพิ่ม feature ใหม่จำนวนมาก

## คะแนนรายหน้า

| หน้า | คะแนน | ความรู้สึกและสิ่งที่ยังขาด |
|---|---:|---|
| Login / Register / Recovery | 8.0 | ฟอร์มและ validation ค่อนข้างครบ แต่ component ใหญ่มาก และ error animation บางส่วนยังไม่เคารพ reduced-motion |
| Dashboard | 6.8 | ข้อมูลครบแต่แย่งสายตากันมาก ทั้ง quick actions, วันนี้, achievement, KPI, charts และ leaderboard ยังไม่รู้ว่าสิ่งแรกที่ควรทำคืออะไร |
| My Work | 8.5 | เป็นหน้าที่ดีที่สุดด้าน action-first เห็นงานสำคัญและปุ่มทำต่อชัดเจน แต่ loading/error ยังธรรมดาและไม่มี Retry; Saved View ตั้งชื่ออัตโนมัติเป็นอังกฤษ |
| Task Detail | 8.1 | workflow, next actor, blocked state และความคิดเห็นเข้าใจง่าย แต่ mutation errors ส่วนใหญ่บอกเพียงให้ลองใหม่ ยังไม่อธิบายสาเหตุหรือวิธีแก้ |
| Tasks & Schedule | 7.3 | ความสามารถสูง แต่ search, filter, sort, status, selection และ create แสดงพร้อมกันมากไป บนจอเล็กต้องใช้ความคิดสูง และ task card ยังเข้าถึงด้วย keyboard ไม่สมบูรณ์ |
| Customers | 7.8 | ความน่าเชื่อถือดีขึ้นมาก มี stale-data warning, retry และรักษารายการเดิมเมื่อโหลดพลาด แต่หน้าใหญ่และมีรายละเอียดแน่น ทำให้แก้ไขต่อยาก |
| Profile Cards | 8.2 | Library, editor, preview และ public sharing เป็น flow ที่ค่อนข้างครบและดูเป็นผลิตภัณฑ์จริง แต่ editor ยังยาวและบาง action ควรใช้ progressive disclosure |
| Analytics | 8.6 | ดีที่สุดด้าน information hierarchy: At a glance และ Focus next ทำให้รู้ว่าควรดูอะไร แต่ CTA ยังพาไปหน้าเป้าหมายแบบทั่วไป ไม่ได้เปิด filter ที่ตรงกับปัญหาทันที |
| Completed Work | 8.4 | Achievement ใหม่ดูน่าสะสมและ share ได้จริง แต่หน้ายังแบกทั้ง feed, search, reactions, task actions และ sharing ใน component เดียว |
| Rewards | 7.6 | Next mission และ controls ใหม่ดีขึ้นชัดเจน แต่เปิดหน้า Missions แล้วยังโหลด catalog, achievements และ seasons พร้อมกัน ส่วน Badge cabinet แบบเก่ายังอยู่ใน Leaderboard |
| User Profile | 7.3 | แนวคิด privacy-first และ public projection ดีมาก แต่ preview ยังไม่เหมือนหน้าจริง, ไม่มี theme editor และ Save กับ Publish แยกกันจนเสี่ยง publish ข้อมูลเก่าที่ยังไม่ได้ Save |
| Notifications | 7.4 | Realtime, grouping, safe deep link และ archive ทำได้ดี แต่ยังมี error ภาษาอังกฤษตายตัว โหลดเพียง 50 รายการโดยไม่มี Load more และทุก action โหลดรายการใหม่ทั้งชุด |
| Settings | 7.6 | ครอบคลุมภาษา ธีม และ notification แต่เป็นหน้าตั้งค่าแบบยาว ควรแบ่งหัวข้อและแสดงสถานะบันทึกให้ชัดขึ้น |
| User Management | 7.1 | ความสามารถด้าน invite, role, deactivate และ owner transfer ครบ แต่ UI หนาแน่นและ table บน mobile อ่านยาก การซ่อนเมนูยังอิง role มากกว่า capability |

## จุดที่ควรแก้ก่อน

### P0 — ต้องแก้ก่อนเพิ่ม feature ใหม่

#### 1. ทำ Dashboard ให้มีเป้าหมายเดียว

ให้ “งานที่ควรทำต่อ” เป็นพระเอก ส่วน KPI, charts และ leaderboard เลื่อนลงไป Dashboard ปัจจุบันยังเป็นหน้ารายงานมากกว่าหน้าเริ่มวันทำงาน

#### 2. ใช้ Achievement system ใหม่บน Dashboard ทั้งหมด

Latest achievement ยังใช้ emoji เหรียญและแสดง season rank ใต้ achievement ซึ่งไม่สอดคล้องกับ Completed Work และ Collection ควรแสดง artwork, ชื่อภารกิจ, เหตุผลที่ได้ และวันที่ได้รับ

#### 3. ลด request ที่ไม่จำเป็นใน Rewards

เปิด Missions ควรโหลด summary และ missions ก่อน ส่วน catalog, leaderboard และ achievements ควรโหลดเมื่อเปิดแท็บนั้น เพื่อลดเวลาเปิดหน้าและการใช้ backend

#### 4. ทำ User Profile ให้ Save และ Publish ไม่พลาด

ควร Save draft ก่อน Publish อัตโนมัติ เตือนเมื่อออกโดยยังไม่บันทึก และแยก “profile private” ออกจาก “network error” บนหน้าสาธารณะ

#### 5. ทำ Realtime ให้ผู้ใช้เห็นสถานะ

เพิ่มสถานะ Connected / Reconnecting / Offline / Last updated และทำให้ผู้ใช้รู้ว่าข้อมูลล่าสุดเมื่อใด ระบบมี reconnect และ heartbeat อยู่แล้ว แต่สถานะยังมองไม่เห็นจาก UI

#### 6. แก้ภาษาให้เป็นชุดเดียวกัน

ตรวจ notification error, Saved View, blocked reason, empty state และข้อความจาก backend ให้ใช้ translation key ทั้งหมด ไม่ส่ง raw English หรือ raw key เข้า UI

### P1 — ควรทำต่อหลัง P0

- เปลี่ยน realtime จาก broad invalidation เป็น targeted cache update และ coalesce event ที่มาติดกัน
- สร้าง shared Page Header, Loading Skeleton, Error + Retry, Empty State และ Action Bar
- ลดความแน่นของ Schedule ด้วย progressive disclosure ของ filter และ bulk action
- เพิ่ม keyboard access ให้ task cards, icon buttons และ segmented controls ทุกหน้า
- แยก Customer, Schedule, Completed Work, Dashboard และ Rewards เป็น components/hooks ย่อย
- เพิ่ม pagination หรือ Load more ให้ Notifications
- ทำให้ CTA จาก Analytics เปิดหน้าพร้อม filter ที่ตรงกับปัญหา เช่น blocked, missing image หรือ profile engagement
- ปรับ mobile safe-area และระยะด้านล่างให้ action สำคัญไม่ถูก bottom navigation บัง

## ประสิทธิภาพและการใช้ทรัพยากร

จุดแข็ง:

- route ถูก lazy-load
- มี prefetch หน้าหลัก
- React Query มี stale time และ placeholder บางจุด
- WebSocket มี reconnect และ heartbeat
- Customer API มีการป้องกัน stale/aborted request ดีขึ้น

จุดที่ควรระวัง:

- app entry ประมาณ 462 KB ก่อน compression
- MUI vendor ประมาณ 449 KB
- charts vendor ประมาณ 161 KB
- Customers route ประมาณ 116 KB
- Rewards ยิงหลาย query แม้ผู้ใช้ยังไม่ได้เปิดแท็บที่เกี่ยวข้อง
- WebSocket event บางชนิด invalidate query หลายชุด ทำให้เกิด refetch และ UI กระพริบได้

## ประสบการณ์ของผู้ใช้

FollowMee ยังน่าใช้ค่ะ ระบบเริ่มมีบุคลิกของตัวเองแล้ว และหน้าใหม่อย่าง Analytics กับ Achievement มีทิศทางที่ถูกต้องมาก

สิ่งที่ผู้ใช้ยังน่าจะรู้สึกคือ:

- มีของให้ทำเยอะ แต่ไม่รู้ว่าควรเริ่มตรงไหน
- Dashboard และ Schedule ต้องอ่านระบบก่อนจึงจะใช้งานคล่อง
- บางหน้าดู premium มาก แต่บางหน้าดูเหมือน admin console
- Realtime ทำงาน แต่ไม่มี feedback ว่าข้อมูลสดหรือกำลัง reconnect
- ภาษาไม่สม่ำเสมอทำให้ความรู้สึก polished ลดลง

## ลำดับการทำงานที่แนะนำสำหรับ session ถัดไป

1. Dashboard hierarchy และ Achievement consistency
2. Rewards query strategy, tab states และ error/retry
3. User Profile save/publish/privacy UX
4. Realtime connection indicator และ targeted cache updates
5. Shared loading/error/empty patterns
6. Accessibility, mobile safe-area และภาษาไทย/อังกฤษ
7. ค่อย refactor component ใหญ่และลด bundle size

## Prompt สำหรับเริ่ม session ถัดไป

```text
อ่าน FOLLOWMEE_PRODUCT_REVIEW_20260814.md ก่อนเริ่มงาน

ให้เริ่มแก้ตามลำดับ P0 ก่อน โดยเริ่มจาก Dashboard, Rewards, User Profile และ Realtime consistency
ทำทีละ milestone และสรุป scope ก่อนแก้แต่ละ milestone

ห้าม reset/drop/seed หรือเขียนข้อมูลทดสอบลงฐาน followmee
ห้ามทับ uncommitted changes ที่มีอยู่
ใช้ capability จาก backend เป็น source of truth สำหรับ permission
ใช้ translation keys ห้าม hardcode English/Thai ใน UI

หลังแต่ละ milestone ให้ตรวจ build, targeted tests, targeted ESLint, git diff --check
และตรวจ browser UAT ที่ 1440x900, 1280x800, 768x1024 และ 390x844
โดยตรวจ light/dark, purple/green, ภาษาไทย/อังกฤษ, keyboard focus และ realtime reconnect
```

## ข้อจำกัดของรีวิวนี้

รีวิวนี้เป็น product/engineering review จากโค้ดปัจจุบัน ภาพ UAT ก่อนหน้า และ build artifact ที่มีอยู่ ยังไม่ได้รัน test suite ใหม่หรือ browser UAT ใหม่ในรอบนี้
