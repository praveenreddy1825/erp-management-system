import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  // If not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user role is not allowed, redirect based on their role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return user.role === 'Supplier'
      ? <Navigate to="/purchase-orders" replace />
      : <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
