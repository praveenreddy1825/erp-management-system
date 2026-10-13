import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext.jsx';
import VisibilityIcon from '@mui/icons-material/Visibility';

const GRNs = () => {
  const { user } = useContext(AuthContext);
  const [grns, setGrns] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState(null);

  // Form Fields
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedPoDetails, setSelectedPoDetails] = useState(null);
  const [receivedItems, setReceivedItems] = useState([]);
  const [remarks, setRemarks] = useState('');

  // Fetch GRN List and Pending Purchase Orders
  const fetchData = async () => {
    setLoading(true);
    try {
      const [grnRes, poRes] = await Promise.all([
        axios.get('http://127.0.0.1:9999/api/grns'),
        axios.get('http://127.0.0.1:9999/api/purchase-orders'),
      ]);
      setGrns(grnRes.data.grns || []); // Fixed: extract nested grns array
      // Filter POs to show only ones that are pending, processing, or shipped (not yet delivered or cancelled)
      const pendingPOs = (poRes.data.orders || []).filter(
        (po) => ['Pending', 'Processing', 'Shipped'].includes(po.status)
      );
      setPurchaseOrders(pendingPOs);
    } catch (error) {
      console.error('Error fetching GRN data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle PO Selection in Form
  const handlePoChange = (e) => {
    const poId = e.target.value;
    setSelectedPoId(poId);

    if (!poId) {
      setSelectedPoDetails(null);
      setReceivedItems([]);
      return;
    }

    const po = purchaseOrders.find((p) => p._id === poId);
    setSelectedPoDetails(po);

    // Pre-populate received items with ordered quantities
    const items = po.products.map((item) => ({
      product: item.product?._id,
      name: item.product?.name,
      orderedQuantity: item.quantity,
      receivedQuantity: item.quantity, // Defaults to fully received
    }));
    setReceivedItems(items);
  };

  // Handle Qty Change
  const handleItemChange = (index, field, value) => {
    const newItems = [...receivedItems];
    newItems[index][field] = value;
    setReceivedItems(newItems);
  };

  // Submit GRN Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPoId) return alert('Please select a purchase order.');

    // Fixed: change receivedProducts to productsReceived to match backend
    const payload = {
      purchaseOrder: selectedPoId,
      productsReceived: receivedItems.map((item) => ({
        product: item.product,
        quantity: parseInt(item.receivedQuantity),
      })),
      remarks,
    };

    try {
      await axios.post('http://127.0.0.1:9999/api/grns', payload);
      setIsCreateModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error processing Goods Receipt Note');
    }
  };

  const handleViewDetails = (grn) => {
    setSelectedGrn(grn);
    setIsDetailModalOpen(true);
  };

  const canWrite = ['Admin', 'Inventory_Manager'].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Goods Receipt Notes (GRN)</h1>
          <p className="text-gray-500 text-sm">Log supplier warehouse shipments, inspect quality, and intake inventory</p>
        </div>
        {canWrite && (
          <button
            onClick={() => {
              setSelectedPoId('');
              setSelectedPoDetails(null);
              setReceivedItems([]);
              setRemarks('');
              setIsCreateModalOpen(true);
            }}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-emerald-955 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
          >
            + New Goods Receipt Note
          </button>
        )}
      </div>

      {/* GRN Table */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                <th className="p-4">GRN Number</th>
                <th className="p-4">PO Link</th>
                <th className="p-4">Supplier Vendor</th>
                <th className="p-4">Received Date</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">Loading receipt logs...</td>
                </tr>
              ) : grns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">No goods receipts registered.</td>
                </tr>
              ) : (
                grns.map((grn) => (
                  <tr key={grn._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-mono font-bold text-gray-900 text-xs">
                      #GRN-{grn._id.substring(grn._id.length - 8)}
                    </td>
                    <td className="p-4 font-mono text-gray-500 text-xs">
                      #PO-{grn.purchaseOrder?._id?.substring(grn.purchaseOrder?._id?.length - 8) || '—'}
                    </td>
                    <td className="p-4 font-semibold">{grn.purchaseOrder?.supplier?.name || '—'}</td>
                    <td className="p-4 text-gray-500">
                      {new Date(grn.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-100">
                        Received & Verified
                      </span>
                    </td>
                    <td className="p-4 flex items-center justify-center">
                      <button
                        onClick={() => handleViewDetails(grn)}
                        className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded cursor-pointer"
                      >
                        <VisibilityIcon className="!w-5 !h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create GRN Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">New Goods Receipt Note (GRN)</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Select Incoming Purchase Order</label>
                <select
                  required
                  value={selectedPoId}
                  onChange={handlePoChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- Select Pending PO --</option>
                  {purchaseOrders.map((po) => (
                    <option key={po._id} value={po._id}>
                      #PO-{po._id.substring(po._id.length - 8)} ({po.supplier?.name} | Value: ${po.totalAmount})
                    </option>
                  ))}
                </select>
              </div>

              {selectedPoDetails && (
                <div className="space-y-4">
                  <div className="border border-emerald-100 bg-emerald-50/30 p-3 rounded-lg text-sm">
                    <span className="block text-xs font-bold text-emerald-800 uppercase">Vendor Supplier Details</span>
                    <span className="font-semibold text-gray-800">{selectedPoDetails.supplier?.name}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">Item Delivery and Quality Verification</label>
                    <div className="space-y-2">
                      {receivedItems.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-sm">
                          <div className="col-span-6 font-bold text-gray-800">{item.name}</div>
                          <div className="col-span-2 text-gray-500">Ordered: {item.orderedQuantity}</div>
                          <div className="col-span-4 flex items-center space-x-1.5">
                            <span className="text-xs text-gray-400">Recd Qty:</span>
                            <input
                              type="number"
                              required
                              min="0"
                              max={item.orderedQuantity}
                              value={item.receivedQuantity}
                              onChange={(e) => handleItemChange(index, 'receivedQuantity', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Receipt Remarks (Optional)</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 h-16 resize-none"
                      placeholder="E.g., Delivered with minor cardboard tear, counts verified..."
                    />
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedPoDetails}
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-emerald-955 font-black rounded-lg text-sm shadow-md shadow-yellow-500/10 transition-all cursor-pointer disabled:opacity-50"
                >
                  Post GRN & Intake Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {isDetailModalOpen && selectedGrn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Goods Receipt Details</h2>
                <p className="text-xs font-mono text-gray-400">#GRN-{selectedGrn._id}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm border-b border-gray-100 pb-4">
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Vendor Supplier</span>
                  <span className="font-semibold text-gray-800">{selectedGrn.purchaseOrder?.supplier?.name || '—'}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Intake Date</span>
                  <span className="font-semibold text-gray-800">{new Date(selectedGrn.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase mb-2">Received Inventory Items</span>
                <div className="space-y-2">
                  {/* Fixed: change receivedProducts to productsReceived to load items */}
                  {selectedGrn.productsReceived?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <div>
                        <span className="font-semibold text-gray-800">{item.product?.name || 'Deleted Product'}</span>
                      </div>
                      <span className="font-black text-emerald-700">+{item.quantity} Qty</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedGrn.remarks && (
                <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100/50">
                  <span className="block text-xs font-bold text-amber-800 uppercase">Remarks</span>
                  <p className="text-sm text-gray-700 mt-1">{selectedGrn.remarks}</p>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-sm font-semibold">
                <span className="text-gray-500">Receiving Agent:</span>
                <span className="text-gray-800 font-bold">{selectedGrn.receivedBy?.name || 'Warehouse Staff'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GRNs;
