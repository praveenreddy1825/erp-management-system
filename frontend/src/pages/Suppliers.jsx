import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext.jsx';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const Suppliers = () => {
  const { user } = useContext(AuthContext);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentSupplierId, setCurrentSupplierId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    address: '',
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://127.0.0.1:9999/api/suppliers?search=${search}&page=${page}&limit=8`
      );
      setSuppliers(res.data.suppliers || []);
      setTotalPages(res.data.pages || 1);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search, page]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddOpen = () => {
    setIsEditMode(false);
    setFormData({
      name: '',
      email: '',
      phone_number: '',
      address: '',
    });
    setIsModalOpen(true);
  };

  const handleEditOpen = (supplier) => {
    setIsEditMode(true);
    setCurrentSupplierId(supplier._id);
    setFormData({
      name: supplier.name,
      email: supplier.contactInfo?.email || '',
      phone_number: supplier.contactInfo?.phone_number || '',
      address: supplier.contactInfo?.address?.street || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      email: formData.email,
      phone_number: formData.phone_number,
      address: {
        street: formData.address,
      },
    };

    try {
      if (isEditMode) {
        await axios.put(`http://127.0.0.1:9999/api/suppliers/${currentSupplierId}`, payload);
      } else {
        await axios.post('http://127.0.0.1:9999/api/suppliers', payload);
      }
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving supplier');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await axios.delete(`http://127.0.0.1:9999/api/suppliers/${id}`);
        fetchSuppliers();
      } catch (error) {
        alert(error.response?.data?.message || 'Error deleting supplier');
      }
    }
  };

  const canAddSupplier = ['Admin', 'Purchase_Manager'].includes(user?.role);
  const canEditSupplier = (supp) => ['Admin', 'Purchase_Manager'].includes(user?.role) || (user?.role === 'Supplier' && supp.contactInfo?.email === user?.email);
  const canDeleteSupplier = user?.role === 'Admin';
  const showActions = ['Admin', 'Purchase_Manager', 'Supplier'].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Suppliers Directory</h1>
          <p className="text-gray-500 text-sm">Manage vendor links, phone records, and shipping addresses</p>
        </div>
        {canAddSupplier && (
          <button
            onClick={handleAddOpen}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-emerald-955 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
          >
            + Add Supplier
          </button>
        )}
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-sm flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by Supplier Name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Table List */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                <th className="p-4">Supplier Name</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4">Shipping Address</th>
                {showActions && <th className="p-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={showActions ? 5 : 4} className="p-8 text-center text-gray-400">Loading suppliers...</td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={showActions ? 5 : 4} className="p-8 text-center text-gray-400">No suppliers found.</td>
                </tr>
              ) : (
                suppliers.map((supp) => (
                  <tr key={supp._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-bold text-gray-900">{supp.name}</td>
                    <td className="p-4 font-mono text-gray-600">{supp.contactInfo?.email || '—'}</td>
                    <td className="p-4">{supp.contactInfo?.phone_number || '—'}</td>
                    <td className="p-4 text-gray-600 truncate max-w-xs">{supp.contactInfo?.address?.street || '—'}</td>
                    {showActions && (
                      <td className="p-4 flex items-center justify-center space-x-2">
                        {canEditSupplier(supp) && (
                          <button
                            onClick={() => handleEditOpen(supp)}
                            className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded transition-colors cursor-pointer"
                          >
                            <EditIcon className="!w-5 !h-5" />
                          </button>
                        )}
                        {canDeleteSupplier && (
                          <button
                            onClick={() => handleDelete(supp._id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors cursor-pointer"
                          >
                            <DeleteIcon className="!w-5 !h-5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Panel */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50 cursor-pointer disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50 cursor-pointer disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">
                {isEditMode ? 'Edit Supplier Info' : 'Register Supplier'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Supplier Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="E.g., Tata Steel"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="sales@tatasteel.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone_number"
                    required
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="123456789"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Shipping Address</label>
                <textarea
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 h-20 resize-none"
                  placeholder="Street name, City, Zip, Country..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-emerald-955 font-black rounded-lg text-sm shadow-md shadow-yellow-500/10 transition-all cursor-pointer"
                >
                  {isEditMode ? 'Save Changes' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
