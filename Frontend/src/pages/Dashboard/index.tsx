import React from 'react';

// Define types for our components
interface StatCardProps {
  title: string;
  value: string;
  change?: string;
}

interface ActivityItemProps {
  title: string;
  time: string;
}

// Simple stat card component
const StatCard: React.FC<StatCardProps> = ({ title, value, change }) => (
  <div className="stat-card">
    <h3>{title}</h3>
    <div className="stat-value">{value}</div>
    {change && <div className="stat-change">{change}</div>}
  </div>
);

// Recent activity item component
const ActivityItem: React.FC<ActivityItemProps> = ({ title, time }) => (
  <div className="activity-item">
    <div className="activity-dot"></div>
    <div>
      <div className="activity-title">{title}</div>
      <div className="activity-time">{time}</div>
    </div>
  </div>
);

// Main Dashboard component
const Dashboard: React.FC = () => {
  // Mock data for the dashboard
  const stats = {
    totalUsers: '12,345',
    activeUsers: '8,765',
    revenue: '$45,678',
    conversion: '3.2%',
  };

  const recentActivity = [
    { id: 1, title: 'New user registered', time: '2 minutes ago' },
    { id: 2, title: 'New order received', time: '5 minutes ago' },
    { id: 3, title: 'System updated', time: '1 hour ago' },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => console.log('Create new')}
        >
          Create New
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard title="Total Users" value={stats.totalUsers} change="+12.5%" />
        <StatCard title="Active Users" value={stats.activeUsers} change="+5.2%" />
        <StatCard title="Revenue" value={stats.revenue} change="+8.3%" />
        <StatCard title="Conversion" value={stats.conversion} change="+1.2%" />
      </div>

      <div className="dashboard-content">
        {/* Main Content */}
        <div className="main-content">
          {/* Performance Overview */}
          <div className="card">
            <div className="card-header">
              <h3>Performance Overview</h3>
              <button className="btn btn-text">View All</button>
            </div>
            <div className="chart-placeholder">
              Performance Chart Placeholder
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h3>Recent Activity</h3>
              <button className="btn btn-text">Refresh</button>
            </div>
            <div className="activity-list">
              {recentActivity.map((activity) => (
                <ActivityItem 
                  key={activity.id} 
                  title={activity.title} 
                  time={activity.time} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar-content">
          {/* Quick Actions */}
          <div className="card">
            <h3>Quick Actions</h3>
            <div className="action-buttons">
              <button className="btn btn-outline">Create Post</button>
              <button className="btn btn-outline">View Analytics</button>
              <button className="btn btn-outline">Check Messages</button>
              <button className="btn btn-outline">Manage Team</button>
            </div>
          </div>

          {/* Notifications */}
          <div className="card">
            <div className="card-header">
              <h3>Notifications</h3>
              <span className="badge">3</span>
            </div>
            <div className="notification-list">
              <div className="notification-item unread">
                <div className="notification-title">New update available</div>
                <div className="notification-message">
                  Version 2.0 is now available with new features.
                </div>
                <div className="notification-time">2 hours ago</div>
              </div>
              <div className="notification-item">
                <div className="notification-title">System maintenance</div>
                <div className="notification-message">
                  Scheduled maintenance this weekend.
                </div>
                <div className="notification-time">1 day ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
