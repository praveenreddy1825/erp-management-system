import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const GRNs = () => {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
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
  const [deliveryReference, setDeliveryReference] = useState('');
  const [packingSlipNumber, setPackingSlipNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Handle PO Selection in Form
  const handleSelectPo = async (poId) => {
    setSelectedPoId(poId);
    if (!poId) {
      setSelectedPoDetails(null);
      setReceivedItems([]);
      return;
    }

    try {
      const res = await axios.get(`http://127.0.0.1:9999/api/purchase-orders/${poId}`);
      const po = res.data.order;
      const summary = res.data.receivedSummary || {};

      setSelectedPoDetails(po);
      setDeliveryReference(po.trackingNumber || '');

      const lines = po.products.map((item) => {
        const pId = (item.product?._id || item.product).toString();
        const pSummary = summary[pId] || { ordered: item.quantity, accepted: 0, remaining: item.quantity };
        const rem = pSummary.remaining !== undefined ? pSummary.remaining : item.quantity;
        return {
          product: pId,
          name: item.product?.name || 'Product',
          orderedQuantity: item.quantity,
          previouslyAccepted: pSummary.accepted || 0,
          remaining: rem,
          receivedQuantity: rem,
          acceptedQuantity: rem,
          rejectedQuantity: 0,
          rejectionReason: '',
        };
      });

      setReceivedItems(lines);
      setIsCreateModalOpen(true);
    } catch {
      showToast('Error loading purchase order receiving summary', 'error');
    }
  };

  // Fetch GRN List and Eligible Purchase Orders
  const fetchData = async () => {
    setLoading(true);
    try {
      const [grnRes, poRes] = await Promise.all([
        axios.get('http://127.0.0.1:9999/api/grns?limit=200'),
        axios.get('http://127.0.0.1:9999/api/purchase-orders?limit=200'),
      ]);
      setGrns(grnRes.data.grns || []);

      // Filter POs to show only ones that can accept receipts
      const eligiblePOs = (poRes.data.orders || []).filter(
        (po) => ['Confirmed', 'Processing', 'Shipped', 'Partially_Received', 'Pending'].includes(po.status)
      );
      setPurchaseOrders(eligiblePOs);

      // Auto-open modal if URL searchParam has poId
      const targetPoId = searchParams.get('poId');
      if (targetPoId) {
        const foundPo = eligiblePOs.find((p) => p._id === targetPoId);
        if (foundPo) {
          handleSelectPo(foundPo._id);
        }
      }
    } catch (error) {
      console.error('Error fetching GRN data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Submit GRN Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPoId) return alert('Please select a purchase order.');

    const payload = {
      purchaseOrder: selectedPoId,
      productsReceived: receivedItems.map((item) => ({
        product: item.product,
        receivedQuantity: parseInt(item.receivedQuantity, 10),
        acceptedQuantity: parseInt(item.acceptedQuantity, 10),
        rejectedQuantity: parseInt(item.rejectedQuantity, 10) || 0,
        rejectionReason: item.rejectionReason?.trim(),
      })),
      deliveryReference: deliveryReference?.trim(),
      packingSlipNumber: packingSlipNumber?.trim(),
      remarks: remarks?.trim(),
    };

    try {
      setActionLoading(true);
      await axios.post('http://127.0.0.1:9999/api/grns', payload);
      setIsCreateModalOpen(false);
      showToast('🎉 Goods Receipt Note registered! Accepted quantities added to warehouse inventory.');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error processing Goods Receipt Note');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = (grn) => {
    setSelectedGrn(grn);
    setIsDetailModalOpen(true);
  };

  const canWrite = ['Admin', 'Inventory_Manager', 'Purchase_Manager'].includes(user?.role);

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
          <h1 className="text-2xl font-bold text-gray-800">Goods Receipt Notes (GRN)</h1>
          <p className="text-gray-500 text-sm">Verify vendor dock shipments, inspect accepted/rejected units, and atomically intake warehouse stock</p>
        </div>
        {canWrite && (
          <button
            onClick={() => {
              setSelectedPoId('');
              setSelectedPoDetails(null);
              setReceivedItems([]);
              setDeliveryReference('');
              setPackingSlipNumber('');
              setRemarks('');
              setIsCreateModalOpen(true);
            }}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <span>+ New Goods Receipt Note</span>
          </button>
        )}
      </div>

      {/* Workflow Explainer Card */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-150 shadow-xs">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2 flex items-center space-x-2">
          <span>📦 Goods Receipt & Warehouse Inventory Separation</span>
          <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-mono font-bold">Audit Principle</span>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">
          In real enterprise ERPs, issuing a Purchase Order does <strong>not</strong> change inventory. Inventory rises only when physical cargo reaches the receiving dock and passes inspection. <strong>Only accepted quantities increment catalog stock</strong>. Rejected or damaged goods are logged for vendor credit/re-dispatch without inflating stock counts.
        </p>
      </div>

      {/* GRN Table */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-stone-50/80 border-b border-gray-100 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                <th className="p-4">GRN Number</th>
                <th className="p-4">PO Reference</th>
                <th className="p-4">Supplier Vendor</th>
                <th className="p-4">Delivery Ref / BOL</th>
                <th className="p-4">Received Date</th>
                <th className="p-4 text-center">Intake Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">Loading receipt logs...</td>
                </tr>
              ) : grns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">No goods receipts registered yet.</td>
                </tr>
              ) : (
                grns.map((grn) => (
                  <tr key={grn._id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-gray-900 text-xs">
                      {grn.grnNumber || `#GRN-${grn._id.slice(-8)}`}
                    </td>
                    <td className="p-4 font-mono text-gray-600 text-xs">
                      {grn.purchaseOrder?.poNumber || (grn.purchaseOrder?._id ? `#PO-${grn.purchaseOrder._id.slice(-8)}` : '—')}
                    </td>
                    <td className="p-4 font-semibold text-gray-900">
                      {grn.purchaseOrder?.supplier?.name || '—'}
                    </td>
                    <td className="p-4 text-gray-600 text-xs">
                      {grn.deliveryReference || grn.packingSlipNumber || '—'}
                    </td>
                    <td className="p-4 text-gray-500">
                      {new Date(grn.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-800 border-emerald-200 inline-flex items-center space-x-1">
                        <CheckCircleIcon className="!w-3.5 !h-3.5" />
                        <span>Stock Incremented</span>
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleViewDetails(grn)}
                        className="p-1.5 hover:bg-stone-100 text-stone-700 rounded cursor-pointer"
                        title="View GRN Inspection Details"
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
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-stone-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Create Goods Receipt Note (GRN)</h2>
                <p className="text-xs text-gray-500">Inspect physical delivery and update catalog inventory</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Select Eligible Purchase Order
                </label>
                <select
                  required
                  value={selectedPoId}
                  onChange={(e) => handleSelectPo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                >
                  <option value="">-- Choose Purchase Order --</option>
                  {purchaseOrders.map((po) => (
                    <option key={po._id} value={po._id}>
                      {po.poNumber || `#PO-${po._id.slice(-8)}`} | Vendor: {po.supplier?.name} | Status: {po.status}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPoDetails && (
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/50 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-amber-900 block">Vendor: {selectedPoDetails.supplier?.name}</span>
                    <span className="text-gray-600">Total PO Value: ${selectedPoDetails.TotalAmount?.toFixed(2)}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded">
                    Status: {selectedPoDetails.status}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Carrier Tracking / BOL #</label>
                  <input
                    type="text"
                    value={deliveryReference}
                    onChange={(e) => setDeliveryReference(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="TRK-9821-DEL"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Vendor Packing Slip #</label>
                  <input
                    type="text"
                    value={packingSlipNumber}
                    onChange={(e) => setPackingSlipNumber(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="PS-KIR-8821"
                  />
                </div>
              </div>

              {receivedItems.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Line Item Counts (Accepted vs Rejected)
                  </label>
                  <div className="space-y-3">
                    {receivedItems.map((item, index) => (
                      <div key={index} className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-900 text-sm">{item.name}</span>
                          <span className="text-gray-500">
                            Ordered: <strong>{item.orderedQuantity}</strong> | Remaining: <strong className="text-amber-800">{item.remaining}</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600">Total Counted</label>
                            <input
                              type="number"
                              min="0"
                              max={item.remaining}
                              value={item.receivedQuantity}
                              onChange={(e) => {
                                const updated = [...receivedItems];
                                const val = parseInt(e.target.value, 10) || 0;
                                updated[index].receivedQuantity = val;
                                updated[index].acceptedQuantity = val;
                                updated[index].rejectedQuantity = 0;
                                setReceivedItems(updated);
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded font-bold text-center bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-emerald-800">Accepted (Stock +)</label>
                            <input
                              type="number"
                              min="0"
                              max={item.remaining}
                              value={item.acceptedQuantity}
                              onChange={(e) => {
                                const updated = [...receivedItems];
                                const accepted = parseInt(e.target.value, 10) || 0;
                                updated[index].acceptedQuantity = accepted;
                                updated[index].rejectedQuantity = Math.max(0, updated[index].receivedQuantity - accepted);
                                setReceivedItems(updated);
                              }}
                              className="w-full px-2 py-1 border border-emerald-300 rounded font-bold text-center bg-emerald-50 text-emerald-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-rose-800">Rejected (Damaged)</label>
                            <input
                              type="number"
                              min="0"
                              value={item.rejectedQuantity}
                              onChange={(e) => {
                                const updated = [...receivedItems];
                                const rejected = parseInt(e.target.value, 10) || 0;
                                updated[index].rejectedQuantity = rejected;
                                updated[index].acceptedQuantity = Math.max(0, updated[index].receivedQuantity - rejected);
                                setReceivedItems(updated);
                              }}
                              className="w-full px-2 py-1 border border-rose-300 rounded font-bold text-center bg-rose-50 text-rose-900"
                            />
                          </div>
                        </div>

                        {item.rejectedQuantity > 0 && (
                          <div>
                            <input
                              type="text"
                              value={item.rejectionReason}
                              onChange={(e) => {
                                const updated = [...receivedItems];
                                updated[index].rejectionReason = e.target.value;
                                setReceivedItems(updated);
                              }}
                              placeholder="Reason for rejection (e.g. broken carton, damaged seal)"
                              className="w-full px-2 py-1 border border-rose-200 rounded text-xs text-rose-900 bg-rose-50/50"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Dock Inspection Remarks & Carrier Notes
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 h-16 resize-none"
                  placeholder="E.g., Cartons inspected, seal numbers match, pallet stored in Bay 4"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || receivedItems.length === 0}
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer flex items-center space-x-1"
                >
                  <span>✓ Intake Goods & Update Inventory</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {isDetailModalOpen && selectedGrn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-stone-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Goods Receipt Note Detail</h2>
                <p className="text-xs font-mono text-gray-400">{selectedGrn.grnNumber || `#GRN-${selectedGrn._id}`}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm bg-stone-50/70 p-3.5 rounded-lg border border-stone-150">
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Supplier Vendor</span>
                  <span className="font-semibold text-gray-900">{selectedGrn.purchaseOrder?.supplier?.name || '—'}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Received By (Employee)</span>
                  <span className="text-gray-800">{selectedGrn.receivedBy?.name || 'Warehouse Operator'}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Delivery Reference</span>
                  <span className="text-gray-800">{selectedGrn.deliveryReference || '—'}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Packing Slip</span>
                  <span className="text-gray-800">{selectedGrn.packingSlipNumber || '—'}</span>
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase mb-2">Verified Received Items</span>
                <div className="space-y-2">
                  {selectedGrn.productsReceived?.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-gray-50 rounded-lg border border-gray-150 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">{item.product?.name || 'Product'}</span>
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          +{item.acceptedQuantity !== undefined ? item.acceptedQuantity : item.quantity} Units Stocked
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-500 text-[11px]">
                        <span>Received: {item.receivedQuantity !== undefined ? item.receivedQuantity : item.quantity} | Rejected: {item.rejectedQuantity || 0}</span>
                        {item.rejectionReason && <span className="text-rose-600">Reason: {item.rejectionReason}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedGrn.remarks && (
                <div className="bg-stone-50 p-3 rounded-lg border border-gray-150">
                  <span className="block text-xs font-bold text-stone-600 uppercase">Dock Inspection Remarks</span>
                  <p className="text-sm text-gray-700 mt-1">{selectedGrn.remarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GRNs;
