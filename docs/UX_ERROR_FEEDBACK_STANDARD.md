# FollowMee UX Error Feedback Standard

สถานะ: มาตรฐานกลางของทุกหน้าที่มีการบันทึก อัปโหลด อนุมัติ ลบ หรือเปลี่ยนสถานะ

## หลักการ

- Mutation ที่ล้มเหลวต้องเปิด branded FollowMee Dialog ที่อ่านได้ชัดเจน ไม่ใช้ snackbar เป็นช่องทางหลัก
- Feedback Dialog ใช้ custom Portal/HTML/CSS ของ FollowMee แบบ SweetAlert-style; MUI Snackbar และ MUI Alert ไม่ใช้เป็นช่องทาง feedback ของ mutation
- Dialog ต้องบอกว่าเกิดอะไรขึ้น ผู้ใช้ได้รับผลกระทบอย่างไร และทำอะไรต่อได้
- ข้อความทั้งหมดต้องผ่าน translation catalog เดียวกัน (English/Thai) ห้ามแสดง raw backend message, stack trace, payload หรือ secret
- Success ที่ไม่ต้องตัดสินใจใช้ inline feedback หรือ toast ได้
- Validation ยังคงแสดงใต้ field และต้องเปิด Dialog สรุปพร้อมพา focus ไปยัง field แรกที่ผิด

## Focus และการแก้ไข

เมื่อผู้ใช้กดปุ่มยืนยันใน Dialog ระบบต้องเลื่อนไปยัง field/section ที่เกี่ยวข้อง ใช้ `scrollIntoView` ที่เคารพ `prefers-reduced-motion`, ตั้ง focus ให้ keyboard และ screen reader ใช้งานต่อได้ และแสดง highlight ชั่วคราวที่จุดผิด

`TASK_VERSION_CONFLICT` ต้องแจ้งว่าข้อมูลถูกแก้จาก session อื่น ข้อมูลที่ผู้ใช้พิมพ์ยังไม่หาย และมีทางเลือก `Reload latest and keep my draft` เป็นหลัก ระบบโหลด task ล่าสุด อัปเดต version เก็บ draft และ highlight field ที่ขัดแย้ง ห้าม retry mutation อัตโนมัติหรือทับ draft โดยไม่ยืนยัน

## Error mapping

ทุก mutation ใช้ shared error descriptor ที่แปลง HTTP status/backend code เป็น translation keys เดียวกันสำหรับ validation, permission, conflict, network, provider และ server errors หากมี retry ต้องเป็นปุ่มที่ผู้ใช้กดเอง และต้องป้องกันการส่ง mutation ซ้ำ

## Accessibility และ visual language

Dialog ต้องมีชื่อ/คำอธิบายที่สัมพันธ์กัน, focus trap, keyboard close ที่เหมาะสม, ปุ่มมีคำกริยาชัดเจน และใช้ visual tokens ของ FollowMee เอง ห้ามใช้ browser `alert/confirm` หรือ component default ที่ไม่มี next action

## Task navigation และ status recovery

Task card เป็นพื้นที่เปิดรายละเอียดบน desktop และ mobile (ยกเว้นปุ่ม ช่องกรอก และเมนูที่เป็น action เฉพาะ) และเมนู `…` ต้องมีคำสั่ง **View** เสมอ เพื่อให้เข้าหน้า `/tasks/:taskId` ได้โดยไม่ต้องกดเฉพาะชื่อ งานที่อยู่สถานะ `review` ต้องมีทางเลือก `Move to To do` เมื่อสิทธิ์อนุญาต

หากผู้ใช้ส่งตรวจซ้ำแล้ว backend แจ้งว่างานอยู่ใน `review` ให้ถือเป็นสถานะที่สำเร็จจาก session อื่น: รีเฟรชรายการและเปิด Dialog อธิบายว่าไม่เสียข้อมูล พร้อมปุ่มเปิดรายละเอียด ห้ามปล่อยให้ผู้ใช้เห็นเพียงข้อความเงียบหรือส่ง mutation ซ้ำอัตโนมัติ

## Capacity provider states

หน้า System Capacity ต้องแยก `Verified`, `Provider reported`, `Unavailable` และ `Stale` ให้เห็นชัด ค่าร้อยละแสดงเฉพาะเมื่อมี used และ limit ที่ยืนยันได้ ถ้า provider ไม่เปิด API ให้แสดงเหตุผลและเวลาตรวจล่าสุดแทนการเดา Cloudinary ใช้ server-side Admin API เท่านั้น; ห้ามนำ API secret ไปไว้ใน `VITE_*`
