import { useState, useEffect, useContext } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
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
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [supportContact, setSupportContact] = useState(null);

  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    let isMounted = true;

    // Admin does not have any support contact card
    if (user?.role === 'Admin') {
      setSupportContact({ hidden: true });
      return;
    }

    const fetchSupportContact = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:9999/api/auth/support-contact', {
          headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {},
        });
        if (isMounted && res.data) {
          setSupportContact(res.data);
        }
      } catch {
        // Fallback default
        if (isMounted) {
          setSupportContact({
            hidden: false,
            title: user?.role === 'Supplier' ? 'Procurement Contact' : 'Sales Contact',
            name: user?.role === 'Supplier' ? 'Priya Nair' : 'Vikram Malhotra',
            email: user?.role === 'Supplier' ? 'purchase@erp.com' : 'sales@erp.com',
            phone_number: user?.role === 'Supplier' ? '+91 93123 45678' : '+91 92123 45678',
            role: user?.role === 'Supplier' ? 'Purchase Manager' : 'Sales Manager',
          });
        }
      }
    };

    fetchSupportContact();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }

    const passRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passRegex.test(newPassword)) {
      setPasswordError('Password must be at least 8 characters long and contain at least 1 letter, 1 number, and 1 special character (@$!%*#?&)');
      return;
    }

    setPasswordLoading(true);
    try {
      await axios.put(
        'http://127.0.0.1:9999/api/auth/change-password',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      setPasswordSuccess('Password successfully updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Define sidebar navigation items based on user roles
  // Customers do NOT have dashboard; their home is Store & Products
  const menuItems = [
    { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager', 'Supplier'] },
    { text: user?.role === 'Customer' ? 'Store & Products' : 'Products', path: '/products', icon: <InventoryIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager', 'Customer'] },
    { text: 'Customers', path: '/customers', icon: <PeopleIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager'] },
    { text: 'Suppliers', path: '/suppliers', icon: <LocalShippingIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager'] },
    { text: user?.role === 'Customer' ? 'My Orders' : 'Sales Orders', path: '/sales-orders', icon: <ReceiptIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Customer', 'Inventory_Manager'] },
    { text: 'Purchase Orders', path: '/purchase-orders', icon: <AssignmentIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Supplier', 'Inventory_Manager'] },
    { text: 'GRNs', path: '/grns', icon: <InventoryIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager'] },
    { text: user?.role === 'Customer' ? 'My Invoices' : 'Invoices', path: '/invoices', icon: <ReceiptIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Customer', 'Inventory_Manager'] },
    { text: 'Users', path: '/users', icon: <SupervisorAccountIcon />, roles: ['Admin'] },
    { text: 'My Profile', path: '/profile', icon: <PersonIcon />, roles: ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager', 'Supplier', 'Customer'] },
  ];

  return (
    <div className="flex h-screen bg-[#F8F7F4] overflow-hidden">
      {/* Sidebar Navigation - Warm Off-White / Alabaster with Yellow Accent */}
      <aside
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-[#FCFBF8] border-r border-[#E5E0D5] flex flex-col justify-between transition-all duration-300 relative shadow-2xs z-20`}
      >
        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-amber-400 hover:bg-amber-500 text-stone-950 flex items-center justify-center shadow-md transition-all cursor-pointer z-30 border border-amber-500/40"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="!w-4 !h-4" />
          ) : (
            <ChevronLeftIcon className="!w-4 !h-4" />
          )}
        </button>

        {/* Brand / Logo Header */}
        <div>
          <div className="h-16 flex items-center px-6 border-b border-[#E5E0D5]">
            <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center text-stone-950 font-black text-base shadow-xs shrink-0">
              E
            </div>
            {!isCollapsed && (
              <div className="ml-3">
                <span className="font-black text-stone-900 tracking-tight text-base block leading-tight">
                  ERP PORTAL
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 block">
                  Enterprise Suite
                </span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto">
            {menuItems
              .filter((item) => item.roles.includes(user?.role))
              .map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.text}
                    to={item.path}
                    title={isCollapsed ? item.text : ''}
                    className={`flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'px-3.5 space-x-3'
                    } py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-amber-400 text-stone-950 shadow-xs shadow-amber-400/20'
                        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    <span
                      className={`shrink-0 ${
                        isActive ? 'text-stone-950' : 'text-stone-500'
                      }`}
                    >
                      {item.icon}
                    </span>
                    {!isCollapsed && <span className="truncate">{item.text}</span>}
                  </Link>
                );
              })}
          </nav>
        </div>

        {/* Dynamic Support Contact Details Widget (Customer -> Sales Manager, Supplier -> Purchase Manager, Managers -> Admin, Admin -> Hidden) */}
        {supportContact && !supportContact.hidden && user?.role !== 'Admin' && (
          <div className="px-3 pt-2 pb-1 border-t border-[#E5E0D5]">
            {!isCollapsed ? (
              <div className="p-3 rounded-xl bg-white/90 border border-[#E2DDD2] shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center text-stone-900 shadow-xs shrink-0">
                    <SupportAgentIcon className="!w-4 !h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                        {supportContact.title || 'Support Contact'}
                      </span>
                      <span className="inline-flex items-center space-x-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Online</span>
                      </span>
                    </div>
                    <p className="text-xs font-bold text-stone-900 truncate">
                      {supportContact.name}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] pt-1.5 border-t border-[#F0ECE1]">
                  <a
                    href={`tel:${supportContact.phone_number}`}
                    className="flex items-center space-x-2 text-stone-600 hover:text-amber-800 transition-colors py-0.5 group"
                    title={`Call ${supportContact.role || 'Contact'}`}
                  >
                    <PhoneIcon className="!w-3.5 !h-3.5 text-stone-400 group-hover:text-amber-600 shrink-0" />
                    <span className="font-semibold text-stone-800 group-hover:text-amber-900 truncate">
                      {supportContact.phone_number}
                    </span>
                  </a>
                  <a
                    href={`mailto:${supportContact.email}`}
                    className="flex items-center space-x-2 text-stone-600 hover:text-amber-800 transition-colors py-0.5 group"
                    title={`Email ${supportContact.role || 'Contact'}`}
                  >
                    <EmailIcon className="!w-3.5 !h-3.5 text-stone-400 group-hover:text-amber-600 shrink-0" />
                    <span className="font-medium text-stone-700 group-hover:text-amber-900 truncate">
                      {supportContact.email}
                    </span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-1">
                <a
                  href={`tel:${supportContact.phone_number}`}
                  title={`${supportContact.title || 'Support'}:\n${supportContact.name} (${supportContact.role})\nPhone: ${supportContact.phone_number}\nEmail: ${supportContact.email}`}
                  className="w-10 h-10 rounded-xl bg-amber-100 hover:bg-amber-400 text-amber-900 hover:text-stone-950 border border-amber-300 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                >
                  <SupportAgentIcon className="!w-5 !h-5" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions: Change Password & Logout */}
        <div className="p-3 border-t border-[#E5E0D5] space-y-1">
          <button
            onClick={() => {
              setPasswordError('');
              setPasswordSuccess('');
              setShowPasswordModal(true);
            }}
            title={isCollapsed ? 'Change Password' : ''}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-2' : 'px-3.5 space-x-3'
            } py-2 rounded-xl text-sm font-bold text-stone-600 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-200 border border-transparent transition-all cursor-pointer`}
          >
            <VpnKeyIcon className="!w-5 !h-5 text-stone-500 hover:text-amber-700 shrink-0" />
            {!isCollapsed && <span>Change Password</span>}
          </button>

          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Logout' : ''}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-2' : 'px-3.5 space-x-3'
            } py-2 rounded-xl text-sm font-bold text-stone-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-transparent transition-all cursor-pointer`}
          >
            <LogoutIcon className="!w-5 !h-5 text-stone-500 hover:text-red-600 shrink-0" />
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
          <div className="flex items-center space-x-3">
            <Link
              to="/profile"
              className="h-9 w-9 rounded-full bg-amber-400 border border-amber-500/30 hover:border-amber-500 hover:ring-2 hover:ring-amber-400/40 flex items-center justify-center text-stone-950 font-black text-sm uppercase shadow-xs select-none transition-all cursor-pointer"
              title={`My Profile: ${user?.name} (${user?.role})`}
            >
              {user?.name?.[0]}
            </Link>
          </div>
        </header>

        {/* Dynamic Nested View */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 bg-[#F8F7F4]">
          <Outlet />
        </main>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
              <div>
                <h3 className="font-black text-gray-900 text-base">Change Account Password</h3>
                <p className="text-xs text-gray-500">Update your security credentials</p>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg cursor-pointer transition-colors"
              >
                <CloseIcon className="!w-5 !h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                  ✓ {passwordSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min. 8 chars, 1 number, 1 symbol"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900 font-semibold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
