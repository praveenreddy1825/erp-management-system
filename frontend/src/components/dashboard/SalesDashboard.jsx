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
} from 'recharts';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const SalesDashboard = () => {
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    pendingOrdersCount: 0,
    invoicesCount: 0,
    customersCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const [salesRes, custRes, invoiceRes] = await Promise.all([
        axios.get('http://127.0.0.1:9999/api/sales-orders?limit=100'),
        axios.get('http://127.0.0.1:9999/api/customers?limit=100'),
        axios.get('http://127.0.0.1:9999/api/invoices?limit=100'),
      ]);

      const orders = salesRes.data.orders || [];
      const customers = custRes.data.customers || [];
      const invoices = invoiceRes.data.invoices || [];

      const totalSalesVal = orders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + (o.TotalAmount || 0), 0);

      const pendingCount = orders.filter((o) => o.status === 'Pending').length;

      setMetrics({
        totalSales: totalSalesVal,
        pendingOrdersCount: pendingCount,
        invoicesCount: invoices.length,
        customersCount: customers.length,
      });

      setRecentOrders(orders.slice(0, 5));

      // Prepare Sales Status chart data
      const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
      const statusCounts = statuses.map((status) => ({
        name: status,
        Count: orders.filter((o) => o.status === status).length,
      }));
      setChartData(statusCounts);
    } catch (error) {
      console.error('Error fetching sales dashboard data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  const kpis = [
    {
      title: 'Sales Revenue',
      value: `$${metrics.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Total pipeline value',
      icon: <ShoppingBagIcon className="!w-6 !h-6 text-emerald-600" />,
      bg: 'bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Pending Orders',
      value: `${metrics.pendingOrdersCount} Orders`,
      subtitle: 'Awaiting fulfillment',
      icon: <CheckCircleIcon className="!w-6 !h-6 text-amber-600" />,
      bg: 'bg-amber-50 border-amber-100',
    },
    {
      title: 'Invoices Generated',
      value: `${metrics.invoicesCount} Invoices`,
      subtitle: 'Commercial bills issued',
      icon: <ReceiptIcon className="!w-6 !h-6 text-blue-600" />,
      bg: 'bg-blue-50 border-blue-100',
    },
    {
      title: 'Active Customers',
      value: `${metrics.customersCount} Clients`,
      subtitle: 'Registered customer entries',
      icon: <PeopleIcon className="!w-6 !h-6 text-purple-600" />,
      bg: 'bg-purple-50 border-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 font-sans tracking-tight">Sales & Billing Dashboard</h1>
        <p className="text-gray-500 text-sm">Monitor client lists, sales orders, invoices, and completed revenue</p>
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

      {/* Sales status breakdown */}
      <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-gray-800">Sales Order Status Distribution</h3>
          <p className="text-xs text-gray-400">Pipeline count of orders by fulfillment phase</p>
        </div>
        <div className="h-64">
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading chart...</div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">No sales order records.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="Count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent sales orders list */}
      <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-gray-800 text-sm">Recent Sales Orders</h3>
          <p className="text-xs text-gray-400">Overview of the last 5 sales orders received</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <th className="p-3">Order ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3 text-center">Fulfillment</th>
                <th className="p-3 text-center">Payment</th>
                <th className="p-3 text-right">Order Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {recentOrders.map((o) => (
                <tr key={o._id} className="hover:bg-gray-50/50">
                  <td className="p-3 font-mono">#{o._id.substring(o._id.length - 8)}</td>
                  <td className="p-3 font-semibold">{o.customer?.name || '—'}</td>
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

export default SalesDashboard;
