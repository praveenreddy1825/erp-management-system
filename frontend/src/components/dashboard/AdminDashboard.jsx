import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import Inventory2Icon from '@mui/icons-material/Inventory2';

const AdminDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://127.0.0.1:9999/api/dashboard/summary');
      setSummary(res.data);
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const financials = summary?.financials || {
    customerCollections: 0,
    supplierPayments: 0,
    netCashMovement: 0,
    outstandingInvoices: { balance: 0, count: 0 },
  };

  const counts = summary?.counts || {
    totalProducts: 0,
    totalOnHandStock: 0,
    totalReservedStock: 0,
    totalAvailableStock: 0,
    lowStockCount: 0,
  };

  const lowStockItems = summary?.lowStockItems || [];
  const topProductsStock = summary?.charts?.topProductsStock || [];

  const kpis = [
    {
      title: 'Customer Collections',
      value: `$${(financials.customerCollections || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Total settled customer payments',
      icon: <TrendingUpIcon className="!w-6 !h-6 text-emerald-600" />,
      bg: 'bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Supplier Payments',
      value: `$${(financials.supplierPayments || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Disbursements for verified PO deliveries',
      icon: <TrendingDownIcon className="!w-6 !h-6 text-amber-600" />,
      bg: 'bg-amber-50 border-amber-100',
    },
    {
      title: 'Net Cash Movement',
      value: `$${(financials.netCashMovement || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Collections minus supplier payouts',
      icon: <AccountBalanceWalletIcon className="!w-6 !h-6 text-indigo-600" />,
      bg: 'bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Outstanding Invoices',
      value: `$${(financials.outstandingInvoices?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${financials.outstandingInvoices?.count || 0} unpaid customer invoices`,
      icon: <ReceiptIcon className="!w-6 !h-6 text-rose-600" />,
      bg: 'bg-rose-50 border-rose-100',
    },
  ];

  // Financial Comparison Chart: Collections vs Payments
  const financeChartData = [
    {
      name: 'Cash Flow',
      'Customer Collections': financials.customerCollections || 0,
      'Supplier Payments': financials.supplierPayments || 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-sans tracking-tight">Admin Operational Command Center</h1>
          <p className="text-gray-500 text-sm">Server-verified financial aggregations, 3-tier inventory metrics, and pipeline status</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 bg-stone-100 hover:bg-stone-200 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer border border-gray-200"
        >
          {loading ? 'Refreshing...' : '↻ Refresh Metrics'}
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-xl border ${k.bg} shadow-xs flex items-center justify-between hover:scale-[1.01] transition-transform`}
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-500 uppercase">{k.title}</span>
              <h2 className="text-xl font-black text-gray-900">{k.value}</h2>
              <p className="text-[11px] text-gray-500 font-medium">{k.subtitle}</p>
            </div>
            <div className="p-3 bg-white/85 rounded-lg border border-gray-100 shadow-xs">{k.icon}</div>
          </div>
        ))}
      </div>

      {/* 3-Tier Inventory Summary Banner */}
      <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs">
        <div className="flex items-center space-x-2 mb-3">
          <Inventory2Icon className="text-amber-500 !w-5 !h-5" />
          <h3 className="font-bold text-gray-800 text-sm">3-Tier Warehouse Inventory Ledger Overview</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-stone-50 rounded-lg border border-gray-150">
            <span className="text-[11px] font-bold text-gray-500 uppercase block">On-Hand Physical</span>
            <span className="text-lg font-black text-gray-900">{counts.totalOnHandStock} units</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <span className="text-[11px] font-bold text-amber-700 uppercase block">Reserved (Allocated)</span>
            <span className="text-lg font-black text-amber-800">{counts.totalReservedStock} units</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <span className="text-[11px] font-bold text-emerald-700 uppercase block">Available to Order</span>
            <span className="text-lg font-black text-emerald-800">{counts.totalAvailableStock} units</span>
          </div>
          <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
            <span className="text-[11px] font-bold text-rose-700 uppercase block">Low Stock Alert</span>
            <span className="text-lg font-black text-rose-800">{counts.lowStockCount} Products</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Flow Chart */}
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-800">Financial Movement Comparison</h3>
            <p className="text-xs text-gray-400 font-medium">Realized Customer Collections vs Verified Supplier Payments</p>
          </div>
          <div className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading charts...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="Customer Collections" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Supplier Payments" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Inventory Stock Levels Chart */}
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-800">Top Catalog Stock (On-Hand vs Available)</h3>
            <p className="text-xs text-gray-400 font-medium">Comparison of physical warehouse units and available allocations</p>
          </div>
          <div className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading charts...</div>
            ) : topProductsStock.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No catalog products found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsStock} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="OnHand" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ReorderLimit" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Critical Low Stock Panel */}
      <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Critical Inventory Alert Warnings (Available ≤ Reorder Level)</h3>
            <p className="text-xs text-gray-400">Products requiring procurement replenishment purchase orders</p>
          </div>
          {lowStockItems.length > 0 && (
            <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full text-xs font-bold">
              {lowStockItems.length} Critical
            </span>
          )}
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="p-4 text-center text-gray-400 text-xs">Loading items...</div>
          ) : lowStockItems.length === 0 ? (
            <div className="p-6 text-center text-emerald-700 font-bold bg-emerald-50 rounded-lg text-xs border border-emerald-100">
              ✓ All catalog inventory levels are healthy! No items at or below reorder threshold.
            </div>
          ) : (
            lowStockItems.map((item) => (
              <div
                key={item._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-rose-50/40 rounded-lg border border-rose-100 text-xs text-gray-700 gap-2"
              >
                <div>
                  <span className="font-bold text-gray-900 block">{item.name}</span>
                  <span className="text-gray-400 font-mono text-[11px]">SKU: {item.SKU} | Cat: {item.category}</span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-rose-700 font-black block">
                    Available: {item.available} units (On-Hand: {item.onHand}, Reserved: {item.reserved})
                  </span>
                  <span className="text-gray-400 text-[11px]">Reorder Threshold: {item.reorderLevel} units</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
