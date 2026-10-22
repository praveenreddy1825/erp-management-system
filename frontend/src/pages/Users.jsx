import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext.jsx';
import ShieldIcon from '@mui/icons-material/Shield';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CloseIcon from '@mui/icons-material/Close';

const Users = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    role: 'Sales_Manager',
    password: 'Welcome@123',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://127.0.0.1:9999/api/auth/users');
      setUsers(res.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchUsers();
    }
  }, [user]);

  const handleOpenModal = () => {
    setFormData({
      name: '',
      email: '',
      phone_number: '',
      role: 'Sales_Manager',
      password: 'Welcome@123',
    });
    setModalError('');
    setShowModal(true);
  };

  const handleCreateManager = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);

    try {
      await axios.post(
        'http://127.0.0.1:9999/api/auth/users',
        {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone_number: formData.phone_number.trim(),
          role: formData.role,
          password: formData.password || 'Welcome@123',
        },
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        }
      );

      setSuccessMsg(`Manager ${formData.name} successfully created with default credentials!`);
      setShowModal(false);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to create manager account');
    } finally {
      setModalLoading(false);
    }
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="bg-red-50 border border-red-100 p-6 rounded-xl text-center">
        <h2 className="text-red-700 font-bold text-lg mb-2">Access Denied</h2>
        <p className="text-red-600 text-sm">You do not have administrative clearance to access the user registry.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Team Directory</h1>
          <p className="text-gray-500 text-sm">Manage staff authorization credentials and organizational roles</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
        >
          <PersonAddIcon className="!w-4 !h-4" />
          <span>Add Manager</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                <th className="p-4">Staff Name</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4 text-center">Assigned Role</th>
                <th className="p-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">Loading team members...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">No users found.</td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleColors = {
                    Admin: 'bg-red-50 text-red-700 border-red-100',
                    Sales_Manager: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    Purchase_Manager: 'bg-blue-50 text-blue-700 border-blue-100',
                    Inventory_Manager: 'bg-purple-50 text-purple-700 border-purple-100',
                    Customer: 'bg-stone-50 text-stone-700 border-stone-200',
                    Supplier: 'bg-amber-50 text-amber-800 border-amber-200',
                  };
                  return (
                    <tr key={u._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-bold text-gray-900 flex items-center space-x-2">
                        <span>{u.name}</span>
                        {u.role === 'Admin' && <ShieldIcon className="!w-4 !h-4 text-red-500" title="System Administrator" />}
                      </td>
                      <td className="p-4 font-mono text-gray-600">{u.email}</td>
                      <td className="p-4">{u.phone_number || '—'}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleColors[u.role] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Manager Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
              <div>
                <h3 className="font-black text-gray-900 text-lg">Add Department Manager</h3>
                <p className="text-xs text-gray-500">Provision a verified Sales or Purchase Manager account</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg cursor-pointer transition-colors"
              >
                <CloseIcon className="!w-5 !h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManager} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="manager@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Designated Manager Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 font-semibold bg-white cursor-pointer"
                >
                  <option value="Sales_Manager">Sales Manager</option>
                  <option value="Purchase_Manager">Purchase Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Initial Password</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 font-mono text-gray-800"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Default: <span className="font-mono font-bold text-gray-700">Welcome@123</span>. The manager will be prompted to change their password upon logging in.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900 font-semibold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? 'Creating Manager...' : 'Confirm & Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
