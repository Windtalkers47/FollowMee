# FollowMee - Social Media Management Platform

A full-stack social media management platform built with React, TypeScript, Node.js, and MySQL.

## 🚀 Getting Started

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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
