import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';

const CustomerDashboard = ({ user }) => {
  const [metrics, setMetrics] = useState({
    totalSpent: 0,
    completedOrders: 0,
    pendingOrders: 0,
    invoicesCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCustomerDashboardData = async () => {
    setLoading(true);
    try {
      const [salesRes, invoiceRes] = await Promise.all([
        axios.get('http://127.0.0.1:9999/api/sales-orders?limit=100'),
        axios.get('http://127.0.0.1:9999/api/invoices?limit=100'),
      ]);

      const orders = salesRes.data.orders || [];
      const invoices = invoiceRes.data.invoices || [];

      const totalSpentVal = orders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + (o.TotalAmount || 0), 0);

      const completedCount = orders.filter((o) => o.status === 'Delivered').length;
      const pendingCount = orders.filter((o) => o.status === 'Pending' || o.status === 'Processing' || o.status === 'Shipped').length;

      setMetrics({
        totalSpent: totalSpentVal,
        completedOrders: completedCount,
        pendingOrders: pendingCount,
        invoicesCount: invoices.length,
      });

      setRecentOrders(orders.slice(0, 5));
    } catch (error) {
      console.error('Error fetching customer dashboard analytics:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomerDashboardData();
  }, []);

  const kpis = [
    {
      title: 'Total Amount Spent',
      value: `$${metrics.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Total completed sales orders value',
      icon: <ShoppingBagIcon className="!w-6 !h-6 text-emerald-600" />,
      bg: 'bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Active Orders',
      value: `${metrics.pendingOrders} Orders`,
      subtitle: 'In fulfillment pipeline',
      icon: <CheckCircleIcon className="!w-6 !h-6 text-amber-600" />,
      bg: 'bg-amber-50 border-amber-100',
    },
    {
      title: 'Billing Invoices',
      value: `${metrics.invoicesCount} Invoices`,
      subtitle: 'Issued commercial bills',
      icon: <ReceiptIcon className="!w-6 !h-6 text-blue-600" />,
      bg: 'bg-blue-50 border-blue-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-emerald-900 text-white p-6 rounded-xl border border-emerald-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold font-sans">Welcome Back, {user?.name}!</h1>
          <p className="text-emerald-100 text-xs mt-1">Review your sales order tracking, invoices, and accounting summary details.</p>
        </div>
        <button className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-emerald-955 text-xs font-black rounded-lg transition-colors cursor-pointer">
          New Sales Quote
        </button>
      </div>

      {/* KPI metrics */}
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

      {/* Recent Purchases List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Your Recent Orders</h3>
            <p className="text-xs text-gray-400">Status of the last 5 sales orders you placed</p>
          </div>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                  <th className="p-3">Order ID</th>
                  <th className="p-3 text-center">Fulfillment Status</th>
                  <th className="p-3 text-center">Payment Status</th>
                  <th className="p-3 text-right">Order Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-400">Loading orders...</td>
                  </tr>
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-400">No sales orders placed yet.</td>
                  </tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr key={o._id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-mono font-semibold">#{o._id.substring(o._id.length - 8)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          o.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-gray-50 text-gray-600">
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-gray-900">${o.TotalAmount?.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Support Helpdesk card */}
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="p-3 bg-blue-50 rounded-full w-12 h-12 flex items-center justify-center border border-blue-100">
              <ContactSupportIcon className="text-blue-700" />
            </div>
            <h3 className="font-bold text-gray-800 text-sm">Need Help or Support?</h3>
            <p className="text-xs text-gray-400 font-medium">
              If you have any questions regarding your billing invoices, shipments, or order statuses, get in touch with our operations team immediately.
            </p>
          </div>
          <button className="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs rounded transition-colors cursor-pointer">
            Contact Support Agent
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
