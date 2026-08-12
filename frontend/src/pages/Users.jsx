import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext.jsx';
import ShieldIcon from '@mui/icons-material/Shield';

const Users = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

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
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Team Directory</h1>
        <p className="text-gray-500 text-sm">View staff authorization access codes and roles</p>
      </div>

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
    </div>
  );
};

export default Users;
