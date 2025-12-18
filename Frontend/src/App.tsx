import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Components
const MainLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="main-layout">
    <div className="sidebar">Sidebar</div>
    <div className="content">{children}</div>
  </div>
);

const LoadingSpinner = () => <div>Loading...</div>;

// Pages - Keep the lazy loading for code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const LandingPage = React.lazy(() => import('./pages/Landing'));
const Customers = React.lazy(() => import('./pages/Customers'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

function App() {
  return (
    <div className="app">
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Protected Routes */}
          <Route element={
            <MainLayout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers/*" element={<Customers />} />
              </Routes>
            </MainLayout>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customers/*" element={<Customers />} />
          </Route>
          
          {/* 404 Route */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
