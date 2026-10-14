import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PostAddIcon from '@mui/icons-material/PostAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';

const Suppliers = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form & Detail States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState(null);
  const [supplierOrders, setSupplierOrders] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentSupplierId, setCurrentSupplierId] = useState(null);
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    address: '',
    notes: '',
    isActive: true,
  });

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      let url = `http://127.0.0.1:9999/api/suppliers?search=${encodeURIComponent(search)}&page=${page}&limit=8`;
      if (statusFilter !== '') {
        url += `&isActive=${statusFilter === 'active'}`;
      }
      const res = await axios.get(url);
      setSuppliers(res.data.suppliers || []);
      setTotalPages(res.data.pages || 1);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search, statusFilter, page]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleAddOpen = () => {
    setIsEditMode(false);
    setCurrentSupplierId(null);
    setFormData({
      name: '',
      email: '',
      phone_number: '',
      address: '',
      notes: '',
      isActive: true,
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
      notes: supplier.notes || '',
      isActive: supplier.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleViewSupplier = async (supplierId) => {
    try {
      const res = await axios.get(`http://127.0.0.1:9999/api/suppliers/${supplierId}`);
      setSelectedSupplierDetail(res.data.supplier);
      setSupplierOrders(res.data.purchaseOrders || []);
      setIsDetailModalOpen(true);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to load supplier details');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone_number: formData.phone_number.trim(),
      address: {
        street: formData.address.trim(),
      },
      notes: formData.notes.trim(),
      isActive: formData.isActive,
    };

    try {
      if (isEditMode) {
        await axios.put(`http://127.0.0.1:9999/api/suppliers/${currentSupplierId}`, payload);
        showToast('Supplier profile updated successfully');
      } else {
        await axios.post('http://127.0.0.1:9999/api/suppliers', payload);
        showToast('Supplier registered successfully (internal vendor record)');
      }
      setIsModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving supplier');
    }
  };

  const handleDeleteOrDeactivate = async (supplier) => {
    const confirmMsg = `Are you sure you want to remove or deactivate "${supplier.name}"?\n(If historical POs exist, the supplier will be safely deactivated to protect order audit history)`;
    if (window.confirm(confirmMsg)) {
      try {
        const res = await axios.delete(`http://127.0.0.1:9999/api/suppliers/${supplier._id}`);
        showToast(res.data.message || 'Supplier deleted successfully', res.data.deactivated ? 'info' : 'success');
        fetchSuppliers();
      } catch (error) {
        alert(error.response?.data?.message || 'Error deleting supplier');
      }
    }
  };

  const canAddSupplier = ['Admin', 'Purchase_Manager'].includes(user?.role);
  const canEditSupplier = ['Admin', 'Purchase_Manager'].includes(user?.role);
  const canDeleteSupplier = user?.role === 'Admin';
  const showActions = ['Admin', 'Purchase_Manager'].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-xs transition-all ${
            notification.type === 'info'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span>✨</span>
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Suppliers & Vendor Directory</h1>
          <p className="text-gray-500 text-sm">Manage vendor contact records, track PO procurement history, and issue new orders</p>
        </div>
        {canAddSupplier && (
          <button
            onClick={handleAddOpen}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <span>+ Add Supplier</span>
          </button>
        )}
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-xs flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by Supplier Name, Email, or Phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Status: All Vendors</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive / Deactivated</option>
        </select>
        {(search || statusFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-lg cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      {/* Table List */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-stone-50/80 border-b border-gray-100 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                <th className="p-4">Supplier Name</th>
                <th className="p-4">Contact Email</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4">Shipping / Warehouse Address</th>
                <th className="p-4 text-center">Status</th>
                {showActions && <th className="p-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={showActions ? 6 : 5} className="p-8 text-center text-gray-400">Loading suppliers...</td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={showActions ? 6 : 5} className="p-8 text-center text-gray-400">No suppliers found matching your query.</td>
                </tr>
              ) : (
                suppliers.map((supp) => {
                  const isActive = supp.isActive !== false;
                  return (
                    <tr key={supp._id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="p-4 font-bold text-gray-900">
                        <span>{supp.name}</span>
                        {supp.notes && <span className="block text-[11px] font-normal text-gray-400 truncate max-w-xs">{supp.notes}</span>}
                      </td>
                      <td className="p-4 font-mono text-xs text-gray-600">{supp.contactInfo?.email || '—'}</td>
                      <td className="p-4 text-gray-600">{supp.contactInfo?.phone_number || '—'}</td>
                      <td className="p-4 text-gray-600 truncate max-w-xs">{supp.contactInfo?.address?.street || '—'}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center space-x-1 ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-stone-100 text-stone-600 border-stone-200'
                          }`}
                        >
                          {isActive ? <span>✓ Active</span> : <span>✕ Inactive</span>}
                        </span>
                      </td>
                      {showActions && (
                        <td className="p-4">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Direct Issue PO */}
                            {isActive && ['Admin', 'Purchase_Manager'].includes(user?.role) && (
                              <button
                                onClick={() => navigate('/purchase-orders')}
                                title="Issue Purchase Order to this Vendor"
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all"
                              >
                                <PostAddIcon className="!w-3.5 !h-3.5 text-amber-700" />
                                <span>+ Issue PO</span>
                              </button>
                            )}

                            {/* View Details & Linked POs */}
                            <button
                              onClick={() => handleViewSupplier(supp._id)}
                              className="p-1.5 hover:bg-stone-100 text-stone-600 rounded transition-colors cursor-pointer"
                              title="View Supplier Details & Purchase Orders"
                            >
                              <VisibilityIcon className="!w-4 !h-4" />
                            </button>

                            {/* Edit */}
                            {canEditSupplier && (
                              <button
                                onClick={() => handleEditOpen(supp)}
                                className="p-1.5 hover:bg-stone-100 text-stone-600 rounded transition-colors cursor-pointer"
                                title="Edit Supplier Profile"
                              >
                                <EditIcon className="!w-4 !h-4" />
                              </button>
                            )}

                            {/* Delete / Deactivate */}
                            {canDeleteSupplier && (
                              <button
                                onClick={() => handleDeleteOrDeactivate(supp)}
                                className="p-1.5 hover:bg-rose-50 text-rose-600 rounded transition-colors cursor-pointer"
                                title="Delete or Deactivate Supplier"
                              >
                                <DeleteIcon className="!w-4 !h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Panel */}
        <div className="p-4 bg-stone-50 border-t border-gray-100 flex items-center justify-between">
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

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-stone-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {isEditMode ? 'Edit Supplier Profile' : 'Register New Vendor Supplier'}
                </h2>
                <p className="text-xs text-gray-500">Internal procurement record for vendor tracking</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Company / Supplier Name</label>
                <input
                  type="text"
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="E.g., Nestle India B2B Supplies"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Contact Email</label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="orders@supplier.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="9988776655"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Dispatch / Warehouse Address</label>
                <textarea
                  required
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 h-18 resize-none"
                  placeholder="Street, Industrial Area, City, State, PIN"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Internal Notes / Terms</label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="E.g., Authorized distributor, 30 days credit terms"
                />
              </div>

              {isEditMode && (
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">Active Vendor (Eligible for new Purchase Orders)</label>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
                >
                  {isEditMode ? 'Save Changes' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Details & Associated POs Modal */}
      {isDetailModalOpen && selectedSupplierDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-stone-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{selectedSupplierDetail.name}</h2>
                <p className="text-xs text-gray-500">Vendor Profile & Linked Purchase Orders</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 text-sm bg-stone-50 p-3.5 rounded-lg border border-stone-200">
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Email</span>
                  <span className="font-semibold text-gray-900">{selectedSupplierDetail.contactInfo?.email}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Phone</span>
                  <span className="font-semibold text-gray-900">{selectedSupplierDetail.contactInfo?.phone_number}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-xs font-bold text-gray-400 uppercase">Address</span>
                  <span className="text-gray-700">{selectedSupplierDetail.contactInfo?.address?.street || '—'}</span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Associated Purchase Orders ({supplierOrders.length})
                </h3>
                {supplierOrders.length === 0 ? (
                  <p className="text-xs text-gray-400 bg-gray-50 p-4 rounded-lg text-center">No purchase orders placed with this vendor yet.</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-600">
                          <th className="p-2.5">PO Number</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-center">Status</th>
                          <th className="p-2.5 text-center">Payment</th>
                          <th className="p-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {supplierOrders.map((po) => (
                          <tr key={po._id} className="hover:bg-amber-50/20">
                            <td className="p-2.5 font-mono font-bold text-gray-900">{po.poNumber || `#${po._id.slice(-8)}`}</td>
                            <td className="p-2.5 text-gray-500">{new Date(po.createdAt).toLocaleDateString()}</td>
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-700">
                                {po.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                {po.paymentStatus}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-black text-gray-900">${po.TotalAmount?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
