import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import AdminDashboard from '../components/dashboard/AdminDashboard.jsx';
import SalesDashboard from '../components/dashboard/SalesDashboard.jsx';
import PurchaseDashboard from '../components/dashboard/PurchaseDashboard.jsx';
import SupplierDashboard from '../components/dashboard/SupplierDashboard.jsx';

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  if (user?.role === 'Customer') {
    return <Navigate to="/products" replace />;
  }

  const renderDashboard = () => {
    switch (user?.role) {
      case 'Admin':
        return <AdminDashboard user={user} />;
      case 'Sales_Manager':
        return <SalesDashboard user={user} />;
      case 'Purchase_Manager':
        return <PurchaseDashboard user={user} />;
      case 'Supplier':
        return <SupplierDashboard user={user} />;
      default:
        return <Navigate to="/products" replace />;
    }
  };

  return renderDashboard();
};

export default Dashboard;
