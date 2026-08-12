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
  Legend,
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningIcon from '@mui/icons-material/Warning';
import ReceiptIcon from '@mui/icons-material/Receipt';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalPurchases: 0,
    lowStockCount: 0,
    invoiceCount: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [stockChartData, setStockChartData] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [salesRes, purchaseRes, productsRes, invoiceRes] = await Promise.all([
        axios.get('http://127.0.0.1:9999/api/sales-orders?limit=100'),
        axios.get('http://127.0.0.1:9999/api/purchase-orders?limit=100'),
        axios.get('http://127.0.0.1:9999/api/products?limit=100'),
        axios.get('http://127.0.0.1:9999/api/invoices?limit=100'),
      ]);

      const salesOrders = salesRes.data.orders || [];
      const purchaseOrders = purchaseRes.data.orders || [];
      const products = productsRes.data.products || [];
      const invoices = invoiceRes.data.invoices || [];

      // Calculate totals
      const totalSalesVal = salesOrders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + (o.TotalAmount || 0), 0);

      const totalPurchasesVal = purchaseOrders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + (o.TotalAmount || 0), 0);

      // Low stock count (stock <= reorderLevel)
      const lowStockProducts = products.filter((p) => p.stock <= p.reorderLevel);
      setLowStockItems(lowStockProducts.slice(0, 5));

      setMetrics({
        totalSales: totalSalesVal,
        totalPurchases: totalPurchasesVal,
        lowStockCount: lowStockProducts.length,
        invoiceCount: invoices.length,
      });

      // Prepare Financial Chart Data
      const financeCompare = [
        { name: 'Target Budget', Sales: totalSalesVal * 0.9, Purchases: totalPurchasesVal * 0.8 },
        { name: 'Actual Performance', Sales: totalSalesVal, Purchases: totalPurchasesVal },
      ];
      setChartData(financeCompare);

      // Prepare Stock Chart Data for Top 6 Products
      const stockData = products.slice(0, 6).map((p) => ({
        name: p.name.length > 10 ? p.name.substring(0, 10) + '..' : p.name,
        Stock: p.stock,
        Limit: p.reorderLevel,
      }));
      setStockChartData(stockData);
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const kpis = [
    {
      title: 'Sales Revenue',
      value: `$${metrics.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Total completed sales pipeline',
      icon: <TrendingUpIcon className="!w-6 !h-6 text-emerald-600" />,
      bg: 'bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Procurement Cost',
      value: `$${metrics.totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Vendor acquisition billing value',
      icon: <TrendingDownIcon className="!w-6 !h-6 text-amber-600" />,
      bg: 'bg-amber-50 border-amber-100',
    },
    {
      title: 'Stock Alert Warning',
      value: `${metrics.lowStockCount} Products`,
      subtitle: 'Items at or below reorder levels',
      icon: <WarningIcon className="!w-6 !h-6 text-red-600" />,
      bg: 'bg-red-50 border-red-100',
    },
    {
      title: 'Commercial Invoices',
      value: `${metrics.invoiceCount} Bills`,
      subtitle: 'Invoices generated and issued',
      icon: <ReceiptIcon className="!w-6 !h-6 text-blue-600" />,
      bg: 'bg-blue-50 border-blue-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 font-sans tracking-tight">Admin Operational Command Center</h1>
        <p className="text-gray-500 text-sm">Real-time metrics, financial statistics, and inventory warnings</p>
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
              <p className="text-[11px] text-gray-400 font-medium">{k.subtitle}</p>
            </div>
            <div className="p-3 bg-white/85 rounded-lg border border-gray-100 shadow-xs">{k.icon}</div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Flow Chart */}
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-800">Financial Comparison Pipeline</h3>
            <p className="text-xs text-gray-400 font-medium">Comparison of Sales pipeline vs procurement billing costs</p>
          </div>
          <div className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading charts...</div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No transaction records available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="Sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Purchases" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Inventory Stock Levels Chart */}
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-800">Warehouse Stock vs Reorder Level</h3>
            <p className="text-xs text-gray-400 font-medium">Check current stock status against product thresholds</p>
          </div>
          <div className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading charts...</div>
            ) : stockChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No catalog products found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="Stock" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Limit" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Stock Alert Summary and Recent Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Low Stock Panel */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Critical Inventory Alert Warnings</h3>
            <p className="text-xs text-gray-400">Products requiring immediate procurement purchase orders</p>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="p-4 text-center text-gray-400 text-xs">Loading items...</div>
            ) : lowStockItems.length === 0 ? (
              <div className="p-6 text-center text-green-600 font-bold bg-green-50 rounded-lg text-xs border border-green-100">
                ✓ Perfect! All catalog inventory levels are healthy.
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-3.5 bg-red-50/50 rounded-lg border border-red-100/50 text-xs text-gray-700"
                >
                  <div>
                    <span className="font-bold text-gray-900 block">{item.name}</span>
                    <span className="text-gray-400 font-medium">SKU Reference: {item.SKU}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-red-600 font-black block">Stock: {item.stock} Qty</span>
                    <span className="text-gray-400">Reorder Threshold: {item.reorderLevel}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Operations Actions */}
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Operational Task Board</h3>
            <p className="text-xs text-gray-400">Standard checklist operations for business users</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center space-x-2.5 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer" />
              <span className="font-semibold text-gray-700">Setup catalog items</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer" />
              <span className="font-semibold text-gray-700">Audit customer directories</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100">
              <input type="checkbox" className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer" />
              <span className="font-semibold text-gray-700">Acquire low stock elements</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100">
              <input type="checkbox" className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer" />
              <span className="font-semibold text-gray-700">Process pending invoices</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
