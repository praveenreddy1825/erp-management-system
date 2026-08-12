import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext.jsx';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancelIcon from '@mui/icons-material/Cancel';

const SalesOrders = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal & Form States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Form Fields
  const [customerId, setCustomerId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState([{ product: '', quantity: 1 }]);

  // Fetch Orders, Customers, and Products
  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, custRes, prodRes] = await Promise.all([
        axios.get('http://127.0.0.1:9999/api/sales-orders'),
        axios.get('http://127.0.0.1:9999/api/customers?limit=100'),
        axios.get('http://127.0.0.1:9999/api/products?limit=100'),
      ]);
      setOrders(ordersRes.data.orders || []);
      setCustomers(custRes.data.customers || []);
      setProducts(prodRes.data.products || []);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Order Item Form Fields
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

  // Compute Live Order Total for Form
  const calculateFormTotal = () => {
    return items.reduce((sum, item) => {
      const prod = products.find((p) => p._id === item.product);
      return sum + (prod ? prod.price * item.quantity : 0);
    }, 0);
  };

  // Submit Order Creation
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) return alert('Please select a customer.');

    const payload = {
      customer: customerId,
      products: items.map((item) => ({
        product: item.product,
        quantity: parseInt(item.quantity),
      })),
      remarks,
    };

    try {
      await axios.post('http://127.0.0.1:9999/api/sales-orders', payload);
      setIsCreateModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating sales order');
    }
  };

  // Cancel Order Handler
  const handleCancelOrder = async (id) => {
    if (window.confirm('Are you sure you want to cancel this sales order?')) {
      try {
        await axios.put(`http://127.0.0.1:9999/api/sales-orders/${id}/cancel`);
        fetchData();
      } catch (error) {
        alert(error.response?.data?.message || 'Error cancelling sales order');
      }
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const isCustomer = user?.role === 'Customer';
  const canWrite = ['Admin', 'Sales_Manager', 'Customer'].includes(user?.role);

  const canCancelOrder = (order) => {
    if (['Admin', 'Sales_Manager'].includes(user?.role)) return true;
    if (user?.role === 'Customer') {
      return order.customer?.contactInfo?.email === user?.email;
    }
    return false;
  };

  useEffect(() => {
    if (isCustomer && customers.length > 0) {
      setCustomerId(customers[0]._id);
    }
  }, [customers, isCustomer]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sales Orders</h1>
          <p className="text-gray-500 text-sm">Issue customer quotes, lock sales pricing, and manage fulfillment</p>
        </div>
        {canWrite && (
          <button
            onClick={() => {
              setCustomerId(isCustomer && customers.length > 0 ? customers[0]._id : '');
              setRemarks('');
              setItems([{ product: '', quantity: 1 }]);
              setIsCreateModalOpen(true);
            }}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-emerald-955 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
          >
            + Create Sales Order
          </button>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                <th className="p-4">Order ID</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4 text-center">Fulfillment Status</th>
                <th className="p-4 text-center">Payment Status</th>
                <th className="p-4 text-right">Order Total</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">Loading sales orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">No sales orders found.</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const statusColors = {
                    Pending: 'bg-amber-50 text-amber-700 border-amber-100',
                    Completed: 'bg-green-50 text-green-700 border-green-100',
                    Cancelled: 'bg-red-50 text-red-700 border-red-100',
                  };
                  return (
                    <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-gray-900 text-xs">
                        #{order._id.substring(order._id.length - 8)}
                      </td>
                      <td className="p-4 font-semibold">{order.customer?.name || '—'}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          order.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-gray-900">${order.TotalAmount?.toFixed(2)}</td>
                      <td className="p-4 flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded cursor-pointer"
                        >
                          <VisibilityIcon className="!w-5 !h-5" />
                        </button>
                        {order.status === 'Pending' && canCancelOrder(order) && (
                          <button
                            onClick={() => handleCancelOrder(order._id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded cursor-pointer"
                          >
                            <CancelIcon className="!w-5 !h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Create Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Create Sales Order</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Customer Profile</label>
                {isCustomer ? (
                  <div className="px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm font-semibold text-gray-700">
                    {customers[0]?.name || 'Loading...'}
                  </div>
                ) : (
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">Order Line Items</label>
                <div className="space-y-2">
                  {items.map((item, index) => {
                    const selectedProductObj = products.find((p) => p._id === item.product);
                    return (
                      <div key={index} className="flex items-center space-x-2">
                        <select
                          required
                          value={item.product}
                          onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id} disabled={p.stock <= 0}>
                              {p.name} (Price: ${p.price} | Stock: {p.stock})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="Qty"
                        />
                        <div className="w-24 text-right font-semibold text-gray-700">
                          ${selectedProductObj ? (selectedProductObj.price * item.quantity).toFixed(2) : '0.00'}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded cursor-pointer"
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
                  className="mt-3 px-3 py-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 font-bold rounded cursor-pointer"
                >
                  + Add Item Line
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Remarks / Terms</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 h-16 resize-none"
                  placeholder="E.g., Delivery by Saturday, Net 30 terms..."
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-500">
                  Total Order Value: <span className="text-lg font-black text-emerald-700">${calculateFormTotal().toFixed(2)}</span>
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
                    className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-emerald-955 font-black rounded-lg text-sm shadow-md shadow-yellow-500/10 transition-all cursor-pointer"
                  >
                    Submit Order
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
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Sales Order Detail</h2>
                <p className="text-xs font-mono text-gray-400">#{selectedOrder._id}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm border-b border-gray-100 pb-4">
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Customer</span>
                  <span className="font-semibold text-gray-800">{selectedOrder.customer?.name}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Fulfillment Status</span>
                  <span className="font-bold text-emerald-700">{selectedOrder.status}</span>
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase mb-2">Itemized Products</span>
                <div className="space-y-2">
                  {selectedOrder.products?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2.5 rounded-lg">
                      <div>
                        <span className="font-semibold text-gray-800">{item.product?.name || 'Deleted Product'}</span>
                        <span className="block text-xs text-gray-500">Qty: {item.quantity} × ${item.price?.toFixed(2)}</span>
                      </div>
                      <span className="font-black text-gray-900">${(item.quantity * item.price)?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.remarks && (
                <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100/50">
                  <span className="block text-xs font-bold text-amber-800 uppercase">Remarks</span>
                  <p className="text-sm text-gray-700 mt-1">{selectedOrder.remarks}</p>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-sm font-semibold">
                <span className="text-gray-500">Grand Total:</span>
                <span className="text-xl font-black text-emerald-700">${selectedOrder.TotalAmount?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOrders;
