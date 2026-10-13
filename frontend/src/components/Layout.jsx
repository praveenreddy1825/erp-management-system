import React, { useState, useContext } from 'react';
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
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    <div className="flex h-screen bg-[#F8F7F4] overflow-hidden">
      {/* Sidebar Navigation - Warm Off-White / Alabaster with Yellow Accent */}
      <aside
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-[#F4F1EA] text-stone-800 flex flex-col h-full border-r border-[#E5E0D5] shadow-xs transition-all duration-300 relative select-none`}
      >
        {/* Brand & Collapse Header */}
        <div className="h-16 px-4 border-b border-[#E5E0D5] flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center font-black text-stone-900 text-sm shadow-xs">
                E
              </span>
              <span className="text-base font-black tracking-wider text-stone-900">
                ERP SYSTEM
              </span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-full flex justify-center">
              <span className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center font-black text-stone-900 text-sm shadow-xs">
                E
              </span>
            </div>
          )}
          {/* Side Collapse Mark Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`${
              isCollapsed ? 'absolute -right-3 top-5 z-20 bg-amber-400 text-stone-900' : 'bg-[#EAE5D9] hover:bg-amber-400 text-stone-700 hover:text-stone-900'
            } p-1 rounded-full shadow-xs border border-[#DED7C8] flex items-center justify-center transition-colors cursor-pointer`}
          >
            {isCollapsed ? <ChevronRightIcon className="!w-4 !h-4" /> : <ChevronLeftIcon className="!w-4 !h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          {menuItems
            .filter((item) => item.roles.includes(user?.role))
            .map((item, idx) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={idx}
                  to={item.path}
                  title={isCollapsed ? item.text : ''}
                  className={`flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'px-3.5 space-x-3'
                  } py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-amber-400 text-stone-950 font-black shadow-sm shadow-amber-400/20'
                      : 'text-stone-700 hover:bg-[#EBE6DB] hover:text-stone-950'
                  }`}
                >
                  <span className={`flex items-center justify-center ${isActive ? 'text-stone-950' : 'text-stone-600'}`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="truncate">{item.text}</span>}
                </Link>
              );
            })}
        </nav>

        {/* Logout Footer */}
        <div className="p-3 border-t border-[#E5E0D5]">
          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Logout' : ''}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-2' : 'px-3.5 space-x-3'
            } py-2.5 rounded-xl text-sm font-bold text-stone-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-transparent transition-all cursor-pointer`}
          >
            <LogoutIcon className="!w-5 !h-5" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F7F4]">
        {/* Topbar Banner - Off-White with Warm Accents */}
        <header className="h-16 bg-[#FCFBF8] border-b border-[#E5E0D5] flex items-center justify-between px-8 shadow-2xs">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-stone-500">Welcome,</span>
            <span className="text-sm font-black text-stone-800">{user?.name}</span>
            <span className="text-xs bg-amber-100 text-amber-900 font-black px-2.5 py-0.5 rounded-full uppercase ml-2 border border-amber-300">
              {user?.role}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="h-9 w-9 rounded-full bg-amber-400 border border-amber-500/30 flex items-center justify-center text-stone-950 font-black text-sm uppercase shadow-xs">
              {user?.name?.[0]}
            </div>
          </div>
        </header>

        {/* Dynamic Nested View */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 bg-[#F8F7F4]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
