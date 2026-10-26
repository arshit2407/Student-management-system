import { Link } from 'react-router-dom';

const getUserNameFromToken = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return '';
  }

  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) {
      return '';
    }

    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded));
    return payload.name || '';
  } catch (error) {
    return '';
  }
};

function HomePage() {
  const userName = getUserNameFromToken();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Welcome, {userName || 'User'}</h1>
          <p className="dashboard-subtitle">Welcome to your student management dashboard.</p>
        </div>
      </div>
      <div className="dashboard-card">
        <h2>Manage Groups & Students</h2>
        <p>Create custom groups, then manage each group's student list independently.</p>
        <Link className="primary-btn" to="/students">
          Go to Groups
        </Link>
      </div>
    </div>
  );
}

export default HomePage;
