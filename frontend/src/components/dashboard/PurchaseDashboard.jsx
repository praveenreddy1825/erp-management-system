import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StoreIcon from '@mui/icons-material/Store';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

const PurchaseDashboard = () => {
  const [metrics, setMetrics] = useState({
    procurementCost: 0,
    suppliersCount: 0,
    pendingPOs: 0,
    shippedPOs: 0,
  });
  const [recentPOs, setRecentPOs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPurchaseData = async () => {
    setLoading(true);
    try {
      const [poRes, suppRes] = await Promise.all([
        axios.get('http://127.0.0.1:9999/api/purchase-orders?limit=100'),
        axios.get('http://127.0.0.1:9999/api/suppliers?limit=100'),
      ]);

      const orders = poRes.data.orders || [];
      const suppliers = suppRes.data.suppliers || [];

      const totalPurchVal = orders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + (o.TotalAmount || 0), 0);

      const pendingCount = orders.filter((o) => o.status === 'Ordered' || o.status === 'Pending').length;
      const shippedCount = orders.filter((o) => o.status === 'Shipped').length;

      setMetrics({
        procurementCost: totalPurchVal,
        suppliersCount: suppliers.length,
        pendingPOs: pendingCount,
        shippedPOs: shippedCount,
      });

      setRecentPOs(orders.slice(0, 5));

      // Prepare Purchase Order status breakdown
      const statuses = ['Ordered', 'Shipped', 'Delivered', 'Cancelled'];
      const statusCounts = statuses.map((status) => ({
        name: status,
        Count: orders.filter((o) => o.status === status).length,
      }));
      setChartData(statusCounts);
    } catch (error) {
      console.error('Error fetching purchase dashboard data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPurchaseData();
  }, []);

  const kpis = [
    {
      title: 'Procurement Cost',
      value: `$${metrics.procurementCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Total vendor pipeline costs',
      icon: <AccountBalanceWalletIcon className="!w-6 !h-6 text-amber-600" />,
      bg: 'bg-amber-50 border-amber-100',
    },
    {
      title: 'Active Suppliers',
      value: `${metrics.suppliersCount} Vendors`,
      subtitle: 'Registered supplier links',
      icon: <StoreIcon className="!w-6 !h-6 text-emerald-600" />,
      bg: 'bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Pending POs',
      value: `${metrics.pendingPOs} Orders`,
      subtitle: 'Awaiting shipping response',
      icon: <AssignmentIcon className="!w-6 !h-6 text-blue-600" />,
      bg: 'bg-blue-50 border-blue-100',
    },
    {
      title: 'Shipped POs',
      value: `${metrics.shippedPOs} Shipments`,
      subtitle: 'Incoming warehouse cargo',
      icon: <LocalShippingIcon className="!w-6 !h-6 text-purple-600" />,
      bg: 'bg-purple-50 border-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 font-sans tracking-tight">Procurement & Suppliers Dashboard</h1>
        <p className="text-gray-500 text-sm">Issue procurement orders, track supplier lists, and monitor incoming stock status</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-800">Procurement Order Distribution</h3>
            <p className="text-xs text-gray-400">Total count of purchase orders issued by stage</p>
          </div>
          <div className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading chart...</div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No procurement orders.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="Count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Task Board */}
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Procurement Check Board</h3>
            <p className="text-xs text-gray-400">Standard operational goals for procurement</p>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex items-center space-x-2.5 p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 border-gray-300 rounded cursor-pointer" />
              <span className="font-semibold text-gray-700">Audit vendor pricing tables</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
              <input type="checkbox" className="w-4 h-4 text-emerald-600 border-gray-300 rounded cursor-pointer" />
              <span className="font-semibold text-gray-700">Draft POs for low stock lines</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
              <input type="checkbox" className="w-4 h-4 text-emerald-600 border-gray-300 rounded cursor-pointer" />
              <span className="font-semibold text-gray-700">Verify supplier lead timelines</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent POs */}
      <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-gray-800 text-sm">Recent Purchase Orders</h3>
          <p className="text-xs text-gray-400">Overview of the last 5 procurement orders placed</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <th className="p-3">PO ID</th>
                <th className="p-3">Vendor</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Order Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {recentPOs.map((o) => (
                <tr key={o._id} className="hover:bg-gray-50/50">
                  <td className="p-3 font-mono">#PO-{o._id.substring(o._id.length - 8)}</td>
                  <td className="p-3 font-semibold">{o.supplier?.name || '—'}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      o.status === 'Delivered' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold">${o.TotalAmount?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDashboard;
