import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import StoreIcon from '@mui/icons-material/Store';

const SupplierDashboard = ({ user }) => {
  const [metrics, setMetrics] = useState({
    totalSupplied: 0,
    shippedOrders: 0,
    pendingDeliveries: 0,
  });
  const [recentPOs, setRecentPOs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSupplierDashboardData = async () => {
    setLoading(true);
    try {
      const poRes = await axios.get('http://127.0.0.1:9999/api/purchase-orders?limit=100');
      const orders = poRes.data.orders || [];

      const totalVal = orders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + (o.TotalAmount || 0), 0);

      const shippedCount = orders.filter((o) => o.status === 'Shipped').length;
      const pendingCount = orders.filter((o) => o.status === 'Ordered' || o.status === 'Pending').length;

      setMetrics({
        totalSupplied: totalVal,
        shippedOrders: shippedCount,
        pendingDeliveries: pendingCount,
      });

      setRecentPOs(orders.slice(0, 5));
    } catch (error) {
      console.error('Error fetching supplier dashboard data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSupplierDashboardData();
  }, []);

  const kpis = [
    {
      title: 'Total Contract Value',
      value: `$${metrics.totalSupplied.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Value of all PO contracts',
      icon: <StoreIcon className="!w-6 !h-6 text-indigo-600" />,
      bg: 'bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Pending PO Shipments',
      value: `${metrics.pendingDeliveries} Orders`,
      subtitle: 'Awaiting shipping action',
      icon: <AssignmentLateIcon className="!w-6 !h-6 text-amber-600" />,
      bg: 'bg-amber-50 border-amber-100',
    },
    {
      title: 'Active Shipments',
      value: `${metrics.shippedOrders} POs`,
      subtitle: 'In-transit to warehouse',
      icon: <LocalShippingIcon className="!w-6 !h-6 text-blue-600" />,
      bg: 'bg-blue-50 border-blue-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold font-sans">Supplier Portal: Welcome, {user?.name}!</h1>
          <p className="text-slate-300 text-xs mt-1">Manage PO orders, update shipment statuses, and check warehouse delivery logs.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div className="p-3 bg-white/85 rounded-lg border border-gray-100 shadow-xs">{k.icon}</div>
          </div>
        ))}
      </div>

      {/* PO List */}
      <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-gray-800 text-sm">Incoming Purchase Orders</h3>
          <p className="text-xs text-gray-400 font-medium">Verify PO details and update shipment indicators</p>
        </div>
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <th className="p-3">PO Number</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">PO Total Amount</th>
                <th className="p-3 text-center">Placed On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-400">Loading contracts...</td>
                </tr>
              ) : recentPOs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-400">No PO orders assigned yet.</td>
                </tr>
              ) : (
                recentPOs.map((o) => (
                  <tr key={o._id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-mono font-semibold">#PO-{o._id.substring(o._id.length - 8)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        o.status === 'Delivered' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-black text-gray-900">${o.TotalAmount?.toFixed(2)}</td>
                    <td className="p-3 text-center text-gray-400">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;
