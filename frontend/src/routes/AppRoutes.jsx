import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import HomePage from '../pages/HomePage';
import StudentsPage from '../pages/StudentsPage';
import GroupStudentsPage from '../pages/GroupStudentsPage';
import GroupAttendancePage from '../pages/GroupAttendancePage';
import ProtectedRoute from '../components/ProtectedRoute';

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/register';

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className={`app-shell ${hideNavbar ? '' : 'app-page'}`}>
      {!hideNavbar && (
        <nav className="navbar">
          <div className="navbar-brand">Thapar Student Management</div>
          <div className="navbar-right">
            <div className="navbar-links">
              <NavLink to="/home">Home</NavLink>
              <NavLink to="/students">Students</NavLink>
            </div>
            <button className="danger-btn navbar-logout-btn" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </nav>
      )}

      <main className="page-wrapper">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <StudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:groupId"
            element={
              <ProtectedRoute>
                <GroupStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:groupId/attendance"
            element={
              <ProtectedRoute>
                <GroupAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/register" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default AppRoutes;
