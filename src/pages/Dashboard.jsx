/**
 * /dashboard now redirects to /ai-dashboard.
 * The AI Dashboard is the single unified dashboard for NeuroLearn AI.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/ai-dashboard', { replace: true });
  }, [navigate]);
  return null;
}
