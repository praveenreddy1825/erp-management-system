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
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const InventoryDashboard = () => {
  const [metrics, setMetrics] = useState({
    productsCount: 0,
    lowStockCount: 0,
    grnsCount: 0,
    totalStockCount: 0,
  });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const [productsRes, grnsRes] = await Promise.all([
        axios.get('http://127.0.0.1:9999/api/products?limit=100'),
        axios.get('http://127.0.0.1:9999/api/grns?limit=100'),
      ]);

      const products = productsRes.data.products || [];
      const grns = grnsRes.data.grns || [];

      const lowStockProducts = products.filter((p) => p.stock <= p.reorderLevel);
      const totalStockVal = products.reduce((sum, p) => sum + (p.stock || 0), 0);

      setMetrics({
        productsCount: products.length,
        lowStockCount: lowStockProducts.length,
        grnsCount: grns.length,
        totalStockCount: totalStockVal,
      });

      setLowStockItems(lowStockProducts.slice(0, 5));

      // Prepare Stock Chart Data for Top 6 Products
      const stockData = products.slice(0, 6).map((p) => ({
        name: p.name.length > 10 ? p.name.substring(0, 10) + '..' : p.name,
        Stock: p.stock,
        Limit: p.reorderLevel,
      }));
      setChartData(stockData);
    } catch (error) {
      console.error('Error fetching inventory dashboard data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const kpis = [
    {
      title: 'Warehouse Catalog',
      value: `${metrics.productsCount} Products`,
      subtitle: 'Distinct items in DB',
      icon: <InventoryIcon className="!w-6 !h-6 text-indigo-600" />,
      bg: 'bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Critical Warnings',
      value: `${metrics.lowStockCount} Products`,
      subtitle: 'Stock below threshold limit',
      icon: <WarningIcon className="!w-6 !h-6 text-red-600" />,
      bg: 'bg-red-50 border-red-100',
    },
    {
      title: 'GRNs Received',
      value: `${metrics.grnsCount} Notes`,
      subtitle: 'Supplier receipts filed',
      icon: <LocalShippingIcon className="!w-6 !h-6 text-emerald-600" />,
      bg: 'bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Total Inventory Stock',
      value: `${metrics.totalStockCount.toLocaleString()} Units`,
      subtitle: 'Aggregated physical count',
      icon: <CheckCircleIcon className="!w-6 !h-6 text-purple-600" />,
      bg: 'bg-purple-50 border-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 font-sans tracking-tight">Warehouse & Stock Dashboard</h1>
        <p className="text-gray-500 text-sm">Monitor physical stock counts, reorder warnings, and file Goods Receipt Notes (GRN)</p>
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

      {/* Charts & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-800">Warehouse Stock vs Reorder Level</h3>
            <p className="text-xs text-gray-400">Current stock values compared with reorder thresholds</p>
          </div>
          <div className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading charts...</div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No catalog products.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
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

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Critical Inventory Alert Warnings</h3>
            <p className="text-xs text-gray-400">Products requiring purchase reorders</p>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="p-4 text-center text-gray-400 text-xs">Loading items...</div>
            ) : lowStockItems.length === 0 ? (
              <div className="p-6 text-center text-green-600 font-bold bg-green-50 rounded-lg text-xs border border-green-100">
                ✓ All catalog inventory levels are healthy.
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg border border-red-100/50 text-xs text-gray-700"
                >
                  <div>
                    <span className="font-bold text-gray-900 block">{item.name}</span>
                    <span className="text-gray-400 font-medium">SKU: {item.SKU}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-red-600 font-black block">Stock: {item.stock} Qty</span>
                    <span className="text-gray-400">Limit: {item.reorderLevel}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;
