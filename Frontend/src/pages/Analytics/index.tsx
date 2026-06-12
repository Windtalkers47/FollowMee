import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Analytics page has been merged into Dashboard
 * Redirecting to Dashboard page
 */
const AnalyticsPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  return null;
};

export default AnalyticsPage;