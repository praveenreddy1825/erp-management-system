import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext.jsx';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const PurchaseOrders = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Quick GRN Intake Modal
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [grnTargetPo, setGrnTargetPo] = useState(null);
  const [grnItems, setGrnItems] = useState([]);
  const [grnRemarks, setGrnRemarks] = useState('');

  // Form Fields for Create PO
  const [supplierId, setSupplierId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState([{ product: '', quantity: 1 }]);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch POs, Suppliers, and Products
  const fetchData = async () => {
    setLoading(true);
    try {
      const [poRes, suppRes, prodRes] = await Promise.all([
        axios.get('http://127.0.0.1:9999/api/purchase-orders?limit=200'),
        axios.get('http://127.0.0.1:9999/api/suppliers?limit=100'),
        axios.get('http://127.0.0.1:9999/api/products?limit=100'),
      ]);
      setOrders(poRes.data.orders || []);
      setSuppliers(suppRes.data.suppliers || []);
      setProducts(prodRes.data.products || []);
    } catch (error) {
      console.error('Error fetching purchase data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addLineItem = () => {
    setItems([...items, { product: '', quantity: 1 }]);
  };

  const removeLineItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== index));
    }
  };

  const calculateFormTotal = () => {
    return items.reduce((sum, item) => {
      const prod = products.find((p) => p._id === item.product);
      return sum + (prod ? prod.price * item.quantity : 0);
    }, 0);
  };

  // Submit PO Creation
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId) return alert('Please select a supplier vendor.');

    const payload = {
      supplier: supplierId,
      paymentStatus,
      products: items.map((item) => {
        const prod = products.find((p) => p._id === item.product);
        return {
          product: item.product,
          quantity: parseInt(item.quantity, 10),
          price: prod ? prod.price : 0,
        };
      }),
      remarks,
    };

    try {
      setActionLoading(true);
      await axios.post('http://127.0.0.1:9999/api/purchase-orders', payload);
      setIsCreateModalOpen(false);
      showToast('Purchase Order created successfully!');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Status (e.g., mark as Processing, Shipped, Delivered)
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      setActionLoading(true);
      await axios.put(`http://127.0.0.1:9999/api/purchase-orders/${id}/status`, { status: newStatus });
      showToast(`PO status transitioned to "${newStatus}"!`);
      await fetchData();
      if (selectedOrder && selectedOrder._id === id) {
        setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating order status');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Vendor Payment Status
  const handleUpdatePaymentStatus = async (orderId, newPaymentStatus) => {
    try {
      setActionLoading(true);
      const res = await axios.put(`http://127.0.0.1:9999/api/purchase-orders/${orderId}/status`, {
        paymentStatus: newPaymentStatus,
      });
      showToast(`Vendor payment status recorded as "${newPaymentStatus}"!`);
      await fetchData();
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(res.data);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating payment status');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Direct GRN Intake Modal for a PO
  const handleOpenGrnModal = (order) => {
    setGrnTargetPo(order);
    setGrnItems(
      order.products.map((item) => ({
        product: item.product?._id || item.product,
        name: item.product?.name || 'Product',
        orderedQuantity: item.quantity,
        receivedQuantity: item.quantity, // Default to full delivery
      }))
    );
    setGrnRemarks(`Warehouse goods receipt for PO #${order._id.substring(order._id.length - 8)}`);
    setIsGrnModalOpen(true);
  };

  // Submit GRN Intake Directly
  const handleSubmitGrn = async (e) => {
    e.preventDefault();
    if (!grnTargetPo) return;

    const payload = {
      purchaseOrder: grnTargetPo._id,
      productsReceived: grnItems.map((item) => ({
        product: item.product,
        quantity: parseInt(item.receivedQuantity, 10),
      })),
      remarks: grnRemarks,
    };

    try {
      setActionLoading(true);
      await axios.post('http://127.0.0.1:9999/api/grns', payload);
      setIsGrnModalOpen(false);
      showToast('🎉 Goods received into warehouse! Inventory stock has been incremented.');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error processing Goods Receipt Note');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const canWrite = ['Admin', 'Purchase_Manager'].includes(user?.role);
  const canReceiveGrn = ['Admin', 'Inventory_Manager', 'Purchase_Manager'].includes(user?.role);
  const isSupplier = user?.role === 'Supplier';

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const matchSearch =
      !search ||
      order._id.toLowerCase().includes(search.toLowerCase()) ||
      order.supplier?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || order.status === statusFilter;
    const matchPayment = !paymentFilter || order.paymentStatus === paymentFilter;
    return matchSearch && matchStatus && matchPayment;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-xs transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span>✨</span>
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Purchase Orders & Inbound Procurement</h1>
          <p className="text-gray-500 text-sm">Issue procurement orders to suppliers, advance delivery stages, and intake stock via GRN</p>
        </div>
        {canWrite && (
          <button
            onClick={() => {
              setSupplierId('');
              setPaymentStatus('unpaid');
              setRemarks('');
              setItems([{ product: '', quantity: 1 }]);
              setIsCreateModalOpen(true);
            }}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <span>+ Create Purchase Order</span>
          </button>
        )}
      </div>

      {/* Procurement Lifecycle Stepper Guide */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-150 shadow-xs">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3 flex items-center space-x-2">
          <span>📦 Inbound Procurement & Inventory Intake Pipeline</span>
          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-mono font-bold">Standard ERP Workflow</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-100 flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-black flex items-center justify-center text-[11px] shrink-0">1</span>
            <div>
              <p className="font-bold text-gray-800">PO Drafted (Pending)</p>
              <p className="text-gray-500 text-[11px]">Purchase manager creates PO and sends to vendor.</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-black flex items-center justify-center text-[11px] shrink-0">2</span>
            <div>
              <p className="font-bold text-gray-800">Vendor Processing</p>
              <p className="text-gray-500 text-[11px]">Supplier confirms and prepares manufacturing/packaging.</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-100 flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-purple-500 text-white font-black flex items-center justify-center text-[11px] shrink-0">3</span>
            <div>
              <p className="font-bold text-gray-800">Shipped (In Transit)</p>
              <p className="text-gray-500 text-[11px]">Vendor dispatches cargo toward warehouse loading dock.</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center text-[11px] shrink-0">4</span>
            <div>
              <p className="font-bold text-gray-800">Warehouse GRN Intake</p>
              <p className="text-gray-500 text-[11px]">Dock logs GRN: <strong className="text-emerald-800">catalog stock increments automatically</strong>.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-xs flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by PO Number (#...) or Supplier Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">PO Status: All</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Payment: All</option>
            <option value="Paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
          {(search || statusFilter || paymentFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setPaymentFilter('');
              }}
              className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-lg cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-stone-50/80 border-b border-gray-100 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                <th className="p-4">PO Number</th>
                <th className="p-4">Supplier Vendor</th>
                <th className="p-4 text-center">Fulfillment Status</th>
                <th className="p-4 text-center">Vendor Payment</th>
                <th className="p-4 text-right">PO Total</th>
                <th className="p-4 text-center">Warehouse Stock Intake</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">Loading purchase orders...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">No purchase orders found matching your criteria.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusColors = {
                    Pending: 'bg-amber-50 text-amber-800 border-amber-200',
                    Processing: 'bg-blue-50 text-blue-800 border-blue-200',
                    Shipped: 'bg-purple-50 text-purple-800 border-purple-200',
                    Delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    Cancelled: 'bg-red-50 text-red-800 border-red-200',
                  };

                  return (
                    <tr key={order._id} className="hover:bg-amber-50/30 transition-colors">
                      {/* PO Number */}
                      <td className="p-4">
                        <span className="font-mono font-bold text-gray-900 text-xs block">
                          #PO-{order._id.substring(order._id.length - 8)}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(order.createdAt || order.DateOfOrder).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Supplier */}
                      <td className="p-4 font-semibold text-gray-900">
                        {order.supplier?.name || '—'}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusColors[order.status] || 'bg-gray-50 text-gray-600'}`}>
                          {order.status}
                        </span>
                      </td>

                      {/* Payment Status & Action */}
                      <td className="p-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              order.paymentStatus === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : order.paymentStatus === 'partial'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {order.paymentStatus === 'Paid' ? '✓ Paid' : order.paymentStatus === 'partial' ? '⏳ Partial' : '✕ Unpaid'}
                          </span>

                          {canWrite && order.paymentStatus !== 'Paid' && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdatePaymentStatus(order._id, 'Paid')}
                              className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded cursor-pointer transition-all border border-emerald-300"
                              title="Mark Vendor Paid"
                            >
                              💳 Mark Paid
                            </button>
                          )}
                          {canWrite && order.paymentStatus === 'Paid' && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdatePaymentStatus(order._id, 'unpaid')}
                              className="text-[10px] text-gray-400 hover:text-rose-600 underline cursor-pointer"
                              title="Reset to Unpaid"
                            >
                              Mark Unpaid
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="p-4 text-right font-black text-gray-900 text-sm">
                        ${order.TotalAmount?.toFixed(2)}
                      </td>

                      {/* Goods Receipt Intake Action */}
                      <td className="p-4 text-center">
                        {order.status === 'Delivered' ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded border border-emerald-200 inline-flex items-center space-x-1">
                            <CheckCircleIcon className="!w-3.5 !h-3.5" />
                            <span>Stock In Stock</span>
                          </span>
                        ) : order.status === 'Cancelled' ? (
                          <span className="text-gray-300 text-xs">Cancelled</span>
                        ) : canReceiveGrn ? (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleOpenGrnModal(order)}
                            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-stone-950 font-black text-xs rounded-lg shadow-xs shadow-amber-400/20 cursor-pointer transition-all flex items-center justify-center space-x-1 mx-auto"
                            title="Receive items into warehouse catalog via GRN"
                          >
                            <InventoryIcon className="!w-3.5 !h-3.5" />
                            <span>📦 Receive Goods (GRN)</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">Awaiting Intake</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="p-1.5 hover:bg-stone-100 text-stone-700 rounded cursor-pointer"
                            title="View Full PO Details"
                          >
                            <VisibilityIcon className="!w-5 !h-5" />
                          </button>

                          {/* Progression Status Buttons */}
                          {canWrite && order.status === 'Pending' && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdateStatus(order._id, 'Processing')}
                              className="px-2.5 py-1 bg-blue-50 text-blue-800 hover:bg-blue-100 font-bold text-xs rounded border border-blue-200 cursor-pointer"
                              title="Approve PO and start processing"
                            >
                              Process ➜
                            </button>
                          )}

                          {(canWrite || isSupplier) && order.status === 'Processing' && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdateStatus(order._id, 'Shipped')}
                              className="px-2.5 py-1 bg-purple-50 text-purple-800 hover:bg-purple-100 font-bold text-xs rounded border border-purple-200 cursor-pointer flex items-center space-x-1"
                              title="Mark as Shipped by Vendor"
                            >
                              <LocalShippingIcon className="!w-3.5 !h-3.5" />
                              <span>Ship 🚚</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Direct GRN Warehouse Intake Modal */}
      {isGrnModalOpen && grnTargetPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-amber-50/70">
              <div>
                <h2 className="text-lg font-bold text-stone-900 flex items-center space-x-2">
                  <span>📦 Goods Receipt Note (GRN) Intake</span>
                </h2>
                <p className="text-xs text-stone-600">
                  Receiving PO #PO-{grnTargetPo._id.substring(grnTargetPo._id.length - 8)} from{' '}
                  <strong>{grnTargetPo.supplier?.name}</strong>
                </p>
              </div>
              <button onClick={() => setIsGrnModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmitGrn} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-xs text-blue-900">
                <strong>Warehouse Action Notice:</strong> Verifying received quantities will immediately increment stock counts in the product database catalog and transition this PO.
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Items Counted at Receiving Dock
                </label>
                <div className="space-y-2">
                  {grnItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200 text-sm">
                      <div className="flex-1 pr-4">
                        <span className="font-bold text-gray-900 block">{item.name}</span>
                        <span className="text-xs text-gray-500">Ordered Quantity: {item.orderedQuantity} units</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs font-bold text-gray-600">Qty Received:</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max={item.orderedQuantity}
                          value={item.receivedQuantity}
                          onChange={(e) => {
                            const updated = [...grnItems];
                            updated[index].receivedQuantity = e.target.value;
                            setGrnItems(updated);
                          }}
                          className="w-20 px-2.5 py-1.5 border border-gray-300 rounded text-sm text-center font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Dock Inspection Notes / Packing Slip No.
                </label>
                <textarea
                  value={grnRemarks}
                  onChange={(e) => setGrnRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 h-16 resize-none"
                  placeholder="E.g., Cartons inspected, seals intact, batch #49 verified..."
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsGrnModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer flex items-center space-x-1"
                >
                  <span>✓ Confirm & Intake to Inventory</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-stone-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Create Purchase Order</h2>
                <p className="text-xs text-gray-500">Draft inbound procurement order to vendor</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Supplier Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Select Supplier Vendor</label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.contactInfo?.email || 'No email'})</option>
                  ))}
                </select>
              </div>

              {/* Vendor Payment Status Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Vendor Payment Terms
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    className={`flex items-center p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      paymentStatus === 'unpaid'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentStatus"
                      value="unpaid"
                      checked={paymentStatus === 'unpaid'}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="mr-2 accent-rose-600"
                    />
                    <span>Unpaid (Net 30)</span>
                  </label>

                  <label
                    className={`flex items-center p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      paymentStatus === 'Paid'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentStatus"
                      value="Paid"
                      checked={paymentStatus === 'Paid'}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="mr-2 accent-emerald-600"
                    />
                    <span>Prepaid to Vendor</span>
                  </label>

                  <label
                    className={`flex items-center p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      paymentStatus === 'partial'
                        ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentStatus"
                      value="partial"
                      checked={paymentStatus === 'partial'}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="mr-2 accent-amber-600"
                    />
                    <span>Advance Deposit</span>
                  </label>
                </div>
              </div>

              {/* Line items */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Order Line Items</label>
                <div className="space-y-2">
                  {items.map((item, index) => {
                    const selectedProductObj = products.find((p) => p._id === item.product);
                    return (
                      <div key={index} className="flex items-center space-x-2">
                        <select
                          required
                          value={item.product}
                          onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => {
                            const isLowStock = p.stock <= p.reorderLevel;
                            return (
                              <option key={p._id} value={p._id}>
                                {isLowStock ? '⚠️ [LOW STOCK] ' : ''}{p.name} (Cost: ${p.price} | Stock: {p.stock})
                              </option>
                            );
                          })}
                        </select>
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="Qty"
                        />
                        <div className="w-24 text-right font-semibold text-gray-700 text-sm">
                          ${selectedProductObj ? (selectedProductObj.price * item.quantity).toFixed(2) : '0.00'}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="mt-2.5 px-3 py-1.5 text-xs bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-bold rounded cursor-pointer"
                >
                  + Add Item Line
                </button>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Procurement Instructions / Terms</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 h-16 resize-none"
                  placeholder="E.g., Delivery terms FOB warehouse dock, Net 30, rush restocking..."
                />
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-500">
                  Estimated PO Value: <span className="text-lg font-black text-amber-700">${calculateFormTotal().toFixed(2)}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/10 transition-all cursor-pointer"
                  >
                    Issue Purchase Order
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {isDetailModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-stone-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Purchase Order Detail</h2>
                <p className="text-xs font-mono text-gray-400">#PO-{selectedOrder._id}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 text-sm bg-stone-50/70 p-3.5 rounded-lg border border-stone-150">
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Vendor Supplier</span>
                  <span className="font-semibold text-gray-900">{selectedOrder.supplier?.name}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">PO Status</span>
                  <span className="font-bold text-amber-800">{selectedOrder.status}</span>
                </div>
              </div>

              {/* Payment Section */}
              <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-gray-700 block">Vendor Payment Status:</span>
                  <span className="text-gray-500">{selectedOrder.paymentStatus}</span>
                </div>
                {canWrite && (
                  <div className="flex space-x-1.5">
                    <button
                      onClick={() => handleUpdatePaymentStatus(selectedOrder._id, 'Paid')}
                      className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded cursor-pointer"
                    >
                      Mark Paid
                    </button>
                    <button
                      onClick={() => handleUpdatePaymentStatus(selectedOrder._id, 'unpaid')}
                      className="px-2.5 py-1 bg-rose-600 text-white font-bold rounded cursor-pointer"
                    >
                      Mark Unpaid
                    </button>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase mb-2">Procured Products</span>
                <div className="space-y-2">
                  {selectedOrder.products?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2.5 rounded-lg border border-gray-150">
                      <div>
                        <span className="font-semibold text-gray-900">{item.product?.name || 'Item'}</span>
                        <span className="block text-xs text-gray-500">Qty: {item.quantity} × ${item.price?.toFixed(2)}</span>
                      </div>
                      <span className="font-black text-gray-900">${(item.quantity * item.price)?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.remarks && (
                <div className="bg-stone-50 p-3 rounded-lg border border-gray-150">
                  <span className="block text-xs font-bold text-stone-600 uppercase">Procurement Notes</span>
                  <p className="text-sm text-gray-700 mt-1">{selectedOrder.remarks}</p>
                </div>
              )}

              {/* Quick GRN button from inside details modal */}
              {selectedOrder.status !== 'Delivered' && selectedOrder.status !== 'Cancelled' && canReceiveGrn && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenGrnModal(selectedOrder);
                    }}
                    className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black text-sm rounded-lg shadow-sm cursor-pointer transition-all flex items-center justify-center space-x-2"
                  >
                    <span>📦 Intake Received Goods (Create GRN)</span>
                  </button>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-sm font-semibold">
                <span className="text-gray-500">Total Purchase Value:</span>
                <span className="text-xl font-black text-amber-700">${selectedOrder.TotalAmount?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
