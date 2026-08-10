# FollowMee UX/UI Audit — 2026-08-10

ระบบที่ตรวจเป็นสถาปัตยกรรมองค์กรเดียว ไม่มี Team และใช้สิทธิ์จาก Creator, Assignee, Owner และ backend capabilities เท่านั้น คะแนนหลังแก้เป็นคะแนน readiness สำหรับ local/UAT ไม่ใช่ production certification

## P0/P1 ที่แก้ในรอบนี้

- Analytics Calendar: ปุ่ม Apply มองไม่เห็น, range อ่านยาก, เปิดเดือนนอกขอบเขต, navigation/label สำหรับ keyboard ไม่ครบ
- Tasks & Schedule: Focus mode และ filter controls ใช้ state คนละชุด ทำให้ UI แสดง Any date แต่ API ยังส่ง `dueFilter=overdue`
- Tasks & Schedule: All tasks, tab, due date, sort และ search ไม่ยกเลิก Focus; Back ไม่ได้ restore snapshot ครบ
- My Work: Saved View, Blocked และ status summary เปลี่ยน filter ปกติแต่ Focus ยัง override อยู่
- Organization Focus: Due soon นับ 3 วันแต่ primary action เคยส่ง `week`; ปรับเป็น `soon` และรองรับค่าเดิมเพื่อ compatibility
- Accessibility/localization: เชื่อม label ของ Due date/Sort, แปลชื่อ Focus และ Task status/Blocked ที่ยังเป็นข้อความดิบ
- Analytics Calendar accessibility: ปรับ contrast ของวันภายในช่วงให้ผ่าน WCAG AA ใน Dark/Purple และจัด trigger ให้ touch target กึ่งกลางไม่ทับปุ่ม Clear บน iPad

ไม่พบ P0 เพิ่มจาก static review, seeded browser smoke และ authorization/integration baseline

## คะแนนรายหน้า

| หน้า | ก่อนรอบใหญ่ | หลังรอบนี้ | สิ่งที่มีแล้ว | P2 backlog |
|---|---:|---:|---|---|
| Login / Register | 8.4 | 8.7 | Invite lifecycle, account-state feedback, invite-only production | ปรับ recovery/invite edge-case copy และ visual baseline |
| Dashboard | 8.5 | 8.8 | Today focus, achievement, role shortcuts, progressive loading | ปรับแต่ง/ซ่อน section ตามผู้ใช้ |
| My Work | 8.4 | 8.9 | Saved views, grouped urgency, quick actions, predictable Focus session | Rename/delete/default management ของ saved views |
| Tasks & Schedule | 8.6 | 9.0 | Duplicate, templates, recurrence, checklist, blocked work, Focus/query consistency | URL-synced filters และ virtualization เมื่อข้อมูลจำนวนมาก |
| Task Detail | 8.7 | 9.0 | Workflow capabilities, duplicate lineage, checklist, completed snapshot | Lineage visualization และ checklist bulk editing |
| Customers | 8.1 | 8.7 | Server pagination, creator/assignee filters, duplicate warnings, timeline | หน้าจอเปรียบเทียบข้อมูลซ้ำก่อน merge แบบ manual |
| Profile Card Library | 8.8 | 9.0 | Readiness, engagement, quick preview, Share/URL/QR shortcuts | Bulk operations และ scheduled publishing |
| Profile Editor / Public Card | 9.0 | 9.2 | Live preview, crop, focused publish validation, Share Center | Share-template refinement และ approved visual baselines |
| Completed Work | 8.2 | 8.8 | Podium, badges, Aura, achievement card, accessible status | Season storytelling และ feed filters |
| Rewards | 7.9 | 8.6 | Season history/close, Top-3 badges, cabinet, localized rewards | Redemption SLA/filtering และ richer scoring simulator |
| Notifications | 8.3 | 8.7 | Grouping, inline actions, digest preferences, localized rewards | Digest preview และ personal grouping rules |
| Analytics | 7.7 | 8.8 | Work/customer/profile/notification tabs, shared range, presets, CSV | Trend charts, saved reports และ scheduled exports |
| User Management | 8.3 | 8.8 | Invitation lifecycle, impact check, atomic reassignment/deactivate, audit | Audit export และ advanced history filters |
| Settings | 8.4 | 8.8 | Digest, privacy/share defaults, motion, Aura selector | Search settings และ reset ราย section |

## Gate ที่ยังเหลือก่อน Production

- ตรวจและอนุมัติ visual snapshots ใหม่หลัง UI เปลี่ยน โดยไม่ update baseline อัตโนมัติ
- UAT ภาษาไทย/อังกฤษ, Purple/Green, Light/Dark บนอุปกรณ์และ viewport ที่กำหนด
- Safari จริงบน iPhone/iPad โดยเน้น calendar keyboard/touch, crop, share sheet และ safe area
- staging notification credentials, queue alerts และ production-like restore drill
