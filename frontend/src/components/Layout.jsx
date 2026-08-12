import React, { useContext } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import LogoutIcon from '@mui/icons-material/Logout';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define sidebar navigation items based on user roles
  const menuItems = [
    { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager', 'Customer', 'Supplier'] },
    { text: 'Products', path: '/products', icon: <InventoryIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager', 'Customer', 'Supplier'] },
    { text: 'Customers', path: '/customers', icon: <PeopleIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Customer', 'Inventory_Manager'] },
    { text: 'Suppliers', path: '/suppliers', icon: <LocalShippingIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Supplier', 'Inventory_Manager'] },
    { text: 'Sales Orders', path: '/sales-orders', icon: <ReceiptIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Customer', 'Inventory_Manager'] },
    { text: 'Purchase Orders', path: '/purchase-orders', icon: <AssignmentIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Supplier', 'Inventory_Manager'] },
    { text: 'GRNs', path: '/grns', icon: <InventoryIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager'] },
    { text: 'Invoices', path: '/invoices', icon: <ReceiptIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Customer', 'Supplier', 'Inventory_Manager'] },
    { text: 'Users', path: '/users', icon: <SupervisorAccountIcon />, roles: ['Admin'] },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Navigation - Deep Emerald Green */}
      <aside className="w-64 bg-emerald-950 text-gray-200 flex flex-col h-full shadow-lg">
        <div className="p-6 border-b border-emerald-900 flex justify-center items-center">
          <span className="text-xl font-black tracking-wider text-yellow-400">ERP SYSTEM</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems
            .filter(item => item.roles.includes(user?.role))
            .map((item, idx) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={idx}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-extrabold transition-all ${
                    isActive
                      ? 'bg-yellow-400 text-emerald-950 shadow-md shadow-yellow-500/20'
                      : 'hover:bg-emerald-900 hover:text-white text-emerald-300'
                  }`}
                >
                  <span className="opacity-95">{item.icon}</span>
                  <span>{item.text}</span>
                </Link>
              );
            })}
        </nav>
        <div className="p-4 border-t border-emerald-900">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-extrabold hover:bg-red-600 hover:text-white text-emerald-300 transition-all cursor-pointer"
          >
            <LogoutIcon />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar Banner */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-gray-500">Welcome,</span>
            <span className="text-sm font-bold text-gray-800">{user?.name}</span>
            <span className="text-xs bg-yellow-100 text-emerald-800 font-black px-2.5 py-1 rounded-full uppercase ml-2 border border-yellow-200">
              {user?.role}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm uppercase">
              {user?.name?.[0]}
            </div>
          </div>
        </header>

        {/* Dynamic Nested View */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
