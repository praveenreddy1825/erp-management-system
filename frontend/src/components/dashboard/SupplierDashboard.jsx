import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import StoreIcon from '@mui/icons-material/Store';
import DownloadIcon from '@mui/icons-material/Download';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { exportPOInvoicePDF } from '../../utils/poInvoiceGenerator.js';

const SupplierDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalPOs: 0,
    pendingPOs: 0,
    confirmedPOs: 0,
    processingPOs: 0,
    shippedPOs: 0,
    deliveredPOs: 0,
    totalContractValue: 0,
    totalEarnings: 0,
    unpaidBalance: 0,
  });
  const [recentPOs, setRecentPOs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingPO, setRejectingPO] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchSupplierDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch server-calculated summary
      const [summaryRes, poRes] = await Promise.all([
        axios.get('http://127.0.0.1:9999/api/dashboard/summary'),
        axios.get('http://127.0.0.1:9999/api/purchase-orders?limit=15'),
      ]);

      const summary = summaryRes.data || {};
      const orders = poRes.data?.orders || [];

      const totalVal = orders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + (o.TotalAmount || 0), 0);

      setMetrics({
        totalPOs: summary.totalPOs ?? orders.length,
        pendingPOs: summary.pendingPOs ?? orders.filter((o) => o.status === 'Pending').length,
        confirmedPOs: summary.confirmedPOs ?? orders.filter((o) => o.status === 'Confirmed').length,
        processingPOs: summary.processingPOs ?? orders.filter((o) => o.status === 'Processing').length,
        shippedPOs: summary.shippedPOs ?? orders.filter((o) => o.status === 'Shipped').length,
        deliveredPOs: summary.deliveredPOs ?? orders.filter((o) => o.status === 'Delivered').length,
        totalContractValue: totalVal,
        totalEarnings: summary.totalEarnings ?? 0,
        unpaidBalance: summary.unpaidDeliveredBalance ?? 0,
      });

      setRecentPOs(orders.slice(0, 8));
    } catch (error) {
      console.error('Error fetching supplier dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplierDashboardData();
  }, []);

  // Accept incoming PO
  const handleAcceptPO = async (order) => {
    try {
      setActionLoading(true);
      await axios.put(`http://127.0.0.1:9999/api/purchase-orders/${order._id}/status`, {
        status: 'Confirmed',
        notes: 'Order accepted and confirmed by supplier vendor',
      });
      showToast(`Purchase Order #${order.poNumber || order._id.slice(-6)} Accepted!`);
      await fetchSupplierDashboardData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to accept purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Reject Modal
  const handleOpenReject = (order) => {
    setRejectingPO(order);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  // Submit Rejection
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      return alert('Please enter a reason for rejecting this purchase order.');
    }
    try {
      setActionLoading(true);
      await axios.put(`http://127.0.0.1:9999/api/purchase-orders/${rejectingPO._id}/status`, {
        status: 'Rejected',
        notes: rejectionReason.trim(),
        rejectionReason: rejectionReason.trim(),
      });
      setRejectModalOpen(false);
      showToast(`Purchase Order rejected with documented reason.`);
      await fetchSupplierDashboardData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  const kpis = [
    {
      title: 'Total Contract Value',
      value: `$${metrics.totalContractValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${metrics.totalPOs} Total PO Contracts`,
      icon: <StoreIcon className="!w-6 !h-6 text-indigo-600" />,
      bg: 'bg-indigo-50/70 border-indigo-100',
    },
    {
      title: 'Pending Acceptance',
      value: `${metrics.pendingPOs} POs`,
      subtitle: 'Awaiting your acceptance / review',
      icon: <AssignmentLateIcon className="!w-6 !h-6 text-amber-600" />,
      bg: 'bg-amber-50/70 border-amber-100',
    },
    {
      title: 'In Processing / Transit',
      value: `${metrics.confirmedPOs + metrics.processingPOs + metrics.shippedPOs} POs`,
      subtitle: `${metrics.shippedPOs} in-transit to warehouse`,
      icon: <LocalShippingIcon className="!w-6 !h-6 text-blue-600" />,
      bg: 'bg-blue-50/70 border-blue-100',
    },
    {
      title: 'Delivered & Received',
      value: `${metrics.deliveredPOs} POs`,
      subtitle: 'Verified by warehouse GRN',
      icon: <CheckCircleIcon className="!w-6 !h-6 text-emerald-600" />,
      bg: 'bg-emerald-50/70 border-emerald-100',
    },
    {
      title: 'Total Paid Disbursements',
      value: `$${metrics.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Received disbursements',
      icon: <AttachMoneyIcon className="!w-6 !h-6 text-emerald-700" />,
      bg: 'bg-emerald-50/50 border-emerald-100',
    },
    {
      title: 'Unpaid Delivered Balance',
      value: `$${metrics.unpaidBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Awaiting finance payment',
      icon: <HourglassEmptyIcon className="!w-6 !h-6 text-purple-600" />,
      bg: 'bg-purple-50/70 border-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-700 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Supplier Portal Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full">
            Supplier Procurement Portal
          </span>
          <h1 className="text-xl font-bold font-sans mt-2">Welcome, {user?.name || 'Vendor Partner'}!</h1>
          <p className="text-slate-300 text-xs mt-1">
            Review incoming Purchase Orders, accept or decline contracts, and download official PO Billing Invoices.
          </p>
        </div>
        <button
          onClick={() => navigate('/purchase-orders')}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-sm"
        >
          View All Purchase Orders
          <ArrowForwardIcon className="!w-4 !h-4" />
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-xl border ${k.bg} shadow-xs flex items-center justify-between hover:scale-[1.01] transition-transform`}
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-500 uppercase">{k.title}</span>
              <h2 className="text-xl font-black text-gray-900">{k.value}</h2>
              <p className="text-[11px] text-gray-400 font-medium">{k.subtitle}</p>
            </div>
            <div className="p-3 bg-white/90 rounded-lg border border-gray-100 shadow-xs">{k.icon}</div>
          </div>
        ))}
      </div>

      {/* Recent POs with Process & Download Actions */}
      <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Assigned Purchase Orders</h3>
            <p className="text-xs text-gray-400 font-medium">
              Accept new incoming POs or download official PO invoices for your accounting
            </p>
          </div>
          <button
            onClick={() => navigate('/purchase-orders')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 self-start sm:self-auto"
          >
            Manage in Full Table &rarr;
          </button>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <th className="p-3">PO Number</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Contract Amount</th>
                <th className="p-3 text-center">Payment Status</th>
                <th className="p-3 text-center">Placed Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400">
                    Loading your purchase contracts...
                  </td>
                </tr>
              ) : recentPOs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400">
                    No Purchase Orders assigned to your vendor profile yet.
                  </td>
                </tr>
              ) : (
                recentPOs.map((o) => (
                  <tr key={o._id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-mono font-bold text-gray-900">
                      {o.poNumber || `#PO-${o._id.substring(o._id.length - 8)}`}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          o.status === 'Delivered'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : o.status === 'Pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : o.status === 'Confirmed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : o.status === 'Shipped'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : o.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-black text-gray-900">
                      ${(o.TotalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          o.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {o.paymentStatus || 'unpaid'}
                      </span>
                    </td>
                    <td className="p-3 text-center text-gray-400">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Process Actions: Accept / Reject if Pending */}
                        {o.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleAcceptPO(o)}
                              disabled={actionLoading}
                              title="Accept Purchase Order"
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1 text-[11px] transition-colors"
                            >
                              <ThumbUpIcon className="!w-3 !h-3" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleOpenReject(o)}
                              disabled={actionLoading}
                              title="Reject Purchase Order"
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded flex items-center gap-1 text-[11px] transition-colors"
                            >
                              <ThumbDownIcon className="!w-3 !h-3" />
                              Reject
                            </button>
                          </>
                        )}

                        {/* Download PO Invoice Slip */}
                        <button
                          onClick={() => exportPOInvoicePDF(o)}
                          title="Download PO Invoice Slip (PDF)"
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded flex items-center gap-1 text-[11px] transition-colors"
                        >
                          <DownloadIcon className="!w-3.5 !h-3.5 text-amber-400" />
                          PO Invoice
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-150 space-y-4">
            <h3 className="text-base font-bold text-gray-900">
              Reject Purchase Order #{rejectingPO?.poNumber || rejectingPO?._id?.slice(-6)}
            </h3>
            <p className="text-xs text-gray-500">
              Please document the reason for rejecting this purchase order. This reason will be logged into the PO audit trail for the procurement team.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Insufficient raw materials, capacity full, or price adjustment required..."
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDashboard;
