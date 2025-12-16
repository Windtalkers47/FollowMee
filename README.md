<div align="center">
  <div>
    <a href="#english--%E0%B8%A0%E0%B8%B2%E0%B8%A9%E0%B8%B2%E0%B9%84%E0%B8%97%E0%B8%A2" style="margin: 0 10px;">English / ภาษาไทย</a>
  </div>
  <h1>FollowMee - Social Media Management Platform</h1>
</div>

A full-stack social media management platform built with React, TypeScript, Node.js, and MySQL.

<div id="english">

## 🚀 Getting Started / เริ่มต้นใช้งาน

### Prerequisites

- Node.js (v16 or later)
- npm (v8 or later) or yarn
- MySQL (v8.0 or later)
- Git

### 🛠 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/FollowMee.git
   cd FollowMee
   ```

2. **Set up environment variables**
   - Create a `.env` file in both `frontend` and `backend` directories
   - See `.env.example` files in each directory for required variables

3. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

### 🗄 Database Setup

1. Start your MySQL server
2. Create a new database named `followmee`
3. Run database migrations:
   ```bash
   cd backend
   npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts
   ```

### 🚦 Running the Application

#### Backend
```bash
cd backend
npm run dev
```

#### Frontend
```bash
cd frontend
npm run dev
```

## 🏗 Project Structure

```
FollowMee/
├── frontend/           # React frontend application
│   ├── public/         # Static files
│   └── src/            # Source files
│       ├── components/ # React components
│       ├── pages/      # Page components
│       ├── store/      # Redux store
│       └── styles/     # Global styles
│
├── backend/            # Node.js backend
│   ├── src/
│   │   ├── config/    # Configuration files
│   │   ├── controllers/# Request handlers
│   │   ├── models/    # Database models
│   │   ├── routes/    # API routes
│   │   └── utils/     # Utility functions
│   └── .env           # Environment variables
│
└── docs/              # Project documentation
```

## 🔧 Environment Variables

### Backend (`.env`)
```
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_NAME=followmee
JWT_SECRET=your_jwt_secret
```

### Frontend (`.env`)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 🛠 Built With

- **Frontend**: React, TypeScript, Redux, Material-UI, React Hook Form
- **Backend**: Node.js, Express, TypeORM, MySQL, Socket.IO
- **Tools**: Git, Webpack, Babel, ESLint, Prettier

## 📄 License / สัญญาอนุญาต

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div id="thai" style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 30px;">

# FollowMee - แพลตฟอร์มจัดการโซเชียลมีเดีย

แพลตฟอร์มจัดการโซเชียลมีเดียแบบครบวงจร สร้างด้วย React, TypeScript, Node.js และ MySQL

## 🚀 เริ่มต้นใช้งาน

### สิ่งที่ต้องมี

- Node.js (รุ่น 16 ขึ้นไป)
- npm (รุ่น 8 ขึ้นไป) หรือ yarn
- MySQL (รุ่น 8.0 ขึ้นไป)
- Git

### 🛠 การติดตั้ง

1. **โคลนโปรเจค**
   ```bash
   git clone https://github.com/yourusername/FollowMee.git
   cd FollowMee
   ```

2. **ตั้งค่าตัวแปรสภาพแวดล้อม**
   - สร้างไฟล์ `.env` ในโฟลเดอร์ `frontend` และ `backend`
   - ดูตัวอย่างตัวแปรที่จำเป็นได้จากไฟล์ `.env.example` ในแต่ละโฟลเดอร์

3. **ติดตั้งแพ็คเกจที่จำเป็น**
   ```bash
   # ติดตั้งแพ็คเกจของ backend
   cd backend
   npm install
   
   # ติดตั้งแพ็คเกจของ frontend
   cd ../frontend
   npm install
   ```

### 🗄 การตั้งค่าฐานข้อมูล

1. เริ่มต้นเซิร์ฟเวอร์ MySQL
2. สร้างฐานข้อมูลใหม่ชื่อ `followmee`
3. รัน migration:
   ```bash
   cd backend
   npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts
   ```

### 🚦 เริ่มต้นการทำงาน

#### Backend
```bash
cd backend
npm run dev
```

#### Frontend
```bash
cd frontend
npm run dev
```

## 🏗 โครงสร้างโปรเจค

```
FollowMee/
├── frontend/           # ส่วนติดต่อผู้ใช้
│   ├── public/         # ไฟล์สาธารณะ
│   └── src/            # ไฟล์ซอร์สโค้ด
│       ├── components/ # คอมโพเนนต์ React
│       ├── pages/      # หน้าต่างๆ
│       ├── store/      # Redux store
│       └── styles/     # สไตล์
│
├── backend/            # ส่วนหลังบ้าน
│   ├── src/
│   │   ├── config/    # ไฟล์คอนฟิก
│   │   ├── controllers/# ควบคุมการทำงาน
│   │   ├── models/    # โมเดลฐานข้อมูล
│   │   ├── routes/    # เส้นทาง API
│   │   └── utils/     # ฟังก์ชันอรรถประโยชน์
│   └── .env           # ตัวแปรสภาพแวดล้อม
│
└── docs/              # เอกสารประกอบ
```

## 🔧 ตัวแปรสภาพแวดล้อม

### Backend (`.env`)
```
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_NAME=followmee
JWT_SECRET=your_jwt_secret
```

### Frontend (`.env`)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 🛠 เทคโนโลยีที่ใช้

- **Frontend**: React, TypeScript, Redux, Material-UI, React Hook Form
- **Backend**: Node.js, Express, TypeORM, MySQL, Socket.IO
- **เครื่องมือ**: Git, Webpack, Babel, ESLint, Prettier

## 📄 สัญญาอนุญาต

โปรเจคนี้อยู่ภายใต้สัญญาอนุญาต MIT - ดูรายละเอียดได้ที่ไฟล์ [LICENSE](LICENSE)

</div>
