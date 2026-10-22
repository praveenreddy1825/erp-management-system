import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import HomeIcon from '@mui/icons-material/Home';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BusinessIcon from '@mui/icons-material/Business';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';

export default function Profile() {
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Profile Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    phone_number: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: '',
    },
    linkedBusiness: null,
    createdAt: null,
  });

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://127.0.0.1:9999/api/auth/profile');
      setFormData({
        name: res.data.name || '',
        email: res.data.email || '',
        role: res.data.role || '',
        phone_number: res.data.phone_number || '',
        address: {
          street: res.data.address?.street || '',
          city: res.data.address?.city || '',
          state: res.data.address?.state || '',
          zip: res.data.address?.zip || '',
          country: res.data.address?.country || '',
        },
        linkedBusiness: res.data.linkedBusiness || null,
        createdAt: res.data.createdAt || null,
      });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to load profile details');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    try {
      setSaving(true);
      const res = await axios.put('http://127.0.0.1:9999/api/auth/profile', {
        name: formData.name,
        phone_number: formData.phone_number,
        address: formData.address,
      });

      // Update stored user name if changed
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.name = res.data.name;
          localStorage.setItem('user', JSON.stringify(parsed));
        } catch {
          // ignore json error
        }
      }

      setSuccessMessage('Profile details updated and synchronized successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword.length < 8) {
      return setPasswordError('New password must be at least 8 characters long');
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return setPasswordError('New passwords do not match');
    }

    try {
      setPasswordLoading(true);
      await axios.put('http://127.0.0.1:9999/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordSuccess('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const roleBadgeColors = {
    Admin: 'bg-amber-100 text-amber-900 border-amber-300',
    Sales_Manager: 'bg-blue-100 text-blue-900 border-blue-300',
    Purchase_Manager: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    Inventory_Manager: 'bg-teal-100 text-teal-900 border-teal-300',
    Supplier: 'bg-purple-100 text-purple-900 border-purple-300',
    Customer: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-stone-400 text-sm">
        <div className="animate-pulse flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-amber-400"></div>
          <span>Loading user profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Toast Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircleIcon className="!w-5 !h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-xl text-sm font-semibold flex items-center space-x-2 animate-in fade-in">
          <span>✕</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile Header Banner */}
      <div className="bg-white rounded-2xl border border-[#E5E0D5] p-6 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-20 h-20 rounded-2xl bg-amber-400 border border-amber-500/40 text-stone-950 flex items-center justify-center font-black text-3xl shadow-sm shrink-0 uppercase select-none">
          {formData.name?.[0] || user?.name?.[0] || 'U'}
        </div>
        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-2xl font-black text-stone-900 truncate">{formData.name}</h1>
            <span
              className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-black uppercase border tracking-wider self-center sm:self-auto ${
                roleBadgeColors[formData.role] || 'bg-stone-100 text-stone-800 border-stone-300'
              }`}
            >
              {formData.role?.replace('_', ' ')}
            </span>
          </div>
          <p className="text-stone-500 text-sm mt-1 flex items-center justify-center sm:justify-start space-x-1.5">
            <EmailIcon className="!w-4 !h-4 text-stone-400" />
            <span>{formData.email}</span>
          </p>
          {formData.createdAt && (
            <p className="text-stone-400 text-xs mt-1">
              Account active since {new Date(formData.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Personal & Contact Information */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleProfileSubmit} className="bg-white rounded-2xl border border-[#E5E0D5] shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E0D5] bg-stone-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-stone-900">Personal & Contact Details</h2>
                <p className="text-xs text-stone-500">Manage your contact information used across the ERP system</p>
              </div>
              <PersonIcon className="!w-5 !h-5 text-amber-600" />
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 font-medium bg-stone-50/30"
                    placeholder="Your Full Name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                    className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm font-medium bg-stone-100 text-stone-500 cursor-not-allowed"
                    title="Account login email cannot be changed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <PhoneIcon className="!w-4 !h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 font-medium bg-stone-50/30"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  {formData.role === 'Sales_Manager' || formData.role === 'Purchase_Manager'
                    ? 'Shown to customers/suppliers in the sidebar support widget.'
                    : 'Used for order confirmations and dispatch notifications.'}
                </p>
              </div>

              {/* Address Details */}
              <div className="pt-2 border-t border-stone-100 space-y-3">
                <div className="flex items-center space-x-1.5 text-stone-800 font-bold text-xs uppercase tracking-wider">
                  <HomeIcon className="!w-4 !h-4 text-amber-600" />
                  <span>
                    {formData.role === 'Customer'
                      ? 'Default Shipping & Delivery Address'
                      : formData.role === 'Supplier'
                      ? 'Supplier Business Address'
                      : 'Physical / Office Address'}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, street: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 font-medium bg-stone-50/30"
                    placeholder="House/Unit, Street name, Area"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, city: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-stone-50/30"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, state: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-stone-50/30"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">ZIP / Postal Code</label>
                    <input
                      type="text"
                      value={formData.address.zip}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, zip: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-stone-50/30"
                      placeholder="ZIP Code"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">Country</label>
                    <input
                      type="text"
                      value={formData.address.country}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, country: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-stone-50/30"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-xl text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer flex items-center space-x-2"
                >
                  {saving ? <span>Saving...</span> : <span>Save Profile Changes</span>}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Col: Security & Role Context */}
        <div className="space-y-6">
          {/* Security & Password Card */}
          <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl border border-[#E5E0D5] shadow-xs p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#E5E0D5]">
              <VpnKeyIcon className="!w-5 !h-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-stone-900">Change Password</h3>
                <p className="text-[11px] text-stone-500">Update your security login credentials</p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                ✓ {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {passwordError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-400"
                placeholder="Current password"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-400"
                placeholder="Min 8 characters"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-400"
                placeholder="Repeat new password"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          {/* Context Info Box */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-5 space-y-3">
            <div className="flex items-center space-x-2 text-stone-800 font-bold text-xs uppercase tracking-wider">
              <SecurityIcon className="!w-4 !h-4 text-amber-600" />
              <span>Role Permissions & Context</span>
            </div>
            {formData.role === 'Customer' && (
              <p className="text-xs text-stone-600 leading-relaxed">
                As a registered Customer, your updated address is automatically applied to new store orders and billing statements.
              </p>
            )}
            {formData.role === 'Supplier' && (
              <div className="space-y-1 text-xs text-stone-600">
                <p className="flex items-center space-x-1.5 font-bold text-stone-800">
                  <BusinessIcon className="!w-4 !h-4 text-purple-600" />
                  <span>Linked Business: {formData.linkedBusiness || 'Supplier Account'}</span>
                </p>
                <p>Purchase managers use your verified phone and address to coordinate purchase order deliveries.</p>
              </div>
            )}
            {['Sales_Manager', 'Purchase_Manager'].includes(formData.role) && (
              <div className="space-y-1 text-xs text-stone-600">
                <p className="flex items-center space-x-1.5 font-bold text-amber-800">
                  <SupportAgentIcon className="!w-4 !h-4 text-amber-600" />
                  <span>Primary Staff Contact</span>
                </p>
                <p>Your name and phone number appear dynamically in the sidebar support widget for your clients.</p>
              </div>
            )}
            {formData.role === 'Admin' && (
              <p className="text-xs text-stone-600 leading-relaxed">
                Full administrative system access: User provisioning, role assignment, and inventory catalog control.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
