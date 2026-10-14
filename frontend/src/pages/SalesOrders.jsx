import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext.jsx';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancelIcon from '@mui/icons-material/Cancel';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentIcon from '@mui/icons-material/Payment';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SalesOrders = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Modal & Form States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Form Fields
  const [customerId, setCustomerId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState([{ product: '', quantity: 1 }]);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Orders, Customers, Products, and Invoices
  const fetchData = async () => {
    setLoading(true);
    try {
      const isCust = user?.role === 'Customer';
      const [ordersRes, custRes, prodRes, invRes] = await Promise.all([
        axios.get('http://127.0.0.1:9999/api/sales-orders?limit=200'),
        !isCust
          ? axios.get('http://127.0.0.1:9999/api/customers?limit=100').catch(() => ({ data: { customers: [] } }))
          : Promise.resolve({ data: { customers: [] } }),
        axios.get('http://127.0.0.1:9999/api/products?limit=100'),
        axios.get('http://127.0.0.1:9999/api/invoices?limit=200'),
      ]);
      setOrders(ordersRes.data.orders || []);
      setCustomers(custRes.data.customers || []);
      setProducts(prodRes.data.products || []);
      setInvoices(invRes.data.invoices || []);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Order Item Form Fields
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addLineItem = () => {
    setItems([...items, { product: '', quantity: 1 }]);
  };

  const removeLineItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== index));
    }
  };

  // Compute Live Order Total for Form
  const calculateFormTotal = () => {
    return items.reduce((sum, item) => {
      const prod = products.find((p) => p._id === item.product);
      return sum + (prod ? prod.price * item.quantity : 0);
    }, 0);
  };

  // Submit Order Creation
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId && !isCustomer) return alert('Please select a customer.');

    const payload = {
      ...(customerId ? { customer: customerId } : {}),
      paymentStatus: isCustomer ? 'unpaid' : paymentStatus,
      products: items.map((item) => ({
        product: item.product,
        quantity: parseInt(item.quantity, 10),
      })),
      remarks,
    };

    try {
      setActionLoading(true);
      await axios.post('http://127.0.0.1:9999/api/sales-orders', payload);
      setIsCreateModalOpen(false);
      showToast('Sales Order created successfully!');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating sales order');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Order Handler
  const handleCancelOrder = async (id) => {
    if (window.confirm('Are you sure you want to cancel this sales order? Stock will be restored.')) {
      try {
        setActionLoading(true);
        await axios.put(`http://127.0.0.1:9999/api/sales-orders/${id}/cancel`);
        showToast('Sales Order cancelled and stock restored to inventory', 'info');
        fetchData();
      } catch (error) {
        alert(error.response?.data?.message || 'Error cancelling sales order');
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Status Progression Handler for Managers
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      setActionLoading(true);
      await axios.put(`http://127.0.0.1:9999/api/sales-orders/${id}/status`, { status: newStatus });
      showToast(`Order status updated to "${newStatus}"`);
      await fetchData();
      if (selectedOrder && selectedOrder._id === id) {
        setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating status');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Payment Status Updater
  const handleUpdatePaymentStatus = async (orderId, newPaymentStatus) => {
    try {
      setActionLoading(true);
      const res = await axios.put(`http://127.0.0.1:9999/api/sales-orders/${orderId}/status`, {
        paymentStatus: newPaymentStatus,
      });
      showToast(`Payment status recorded as "${newPaymentStatus}"!`);
      await fetchData();
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(res.data);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating payment status');
    } finally {
      setActionLoading(false);
    }
  };

  // Instant Commercial Invoice Generator
  const handleGenerateInvoice = async (orderId) => {
    try {
      setActionLoading(true);
      const res = await axios.post('http://127.0.0.1:9999/api/invoices', {
        salesOrder: orderId,
        remarks: 'Commercial invoice automatically issued from Sales Order checkout',
      });
      showToast(`Commercial Invoice ${res.data.invoiceNumber} generated!`);
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setActionLoading(false);
    }
  };

  // PDF Export
  const handleDownloadInvoicePDF = (inv) => {
    if (!inv) return;
    const doc = new jsPDF();
    const customer = inv.salesOrder?.customer;
    const prods = inv.salesOrder?.products || [];

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('COMMERCIAL INVOICE', 14, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('ERP SYSTEM BILLING PORTAL', 140, 22);

    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('INVOICE METADATA', 14, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Invoice No: ${inv.invoiceNumber}`, 14, 55);
    doc.text(`Date Issued: ${new Date(inv.createdAt).toLocaleDateString()}`, 14, 61);
    doc.text(`Sales Order Ref: #${inv.salesOrder?._id?.substring(inv.salesOrder?._id?.length - 8)}`, 14, 67);
    doc.text(`Payment Status: ${inv.salesOrder?.paymentStatus || 'unpaid'}`, 14, 73);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CUSTOMER (BILL TO)', 120, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Customer Name: ${customer?.name || '—'}`, 120, 55);
    doc.text(`Email: ${customer?.contactInfo?.email || '—'}`, 120, 61);
    doc.text(`Address: ${customer?.contactInfo?.address?.street || '—'}`, 120, 67, { maxWidth: 80 });

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 80, 196, 80);

    const tableHeaders = [['#', 'Item Description', 'Unit Price', 'Quantity', 'Amount']];
    const tableRows = prods.map((item, idx) => [
      idx + 1,
      item.product?.name || 'Item',
      `$${item.price?.toFixed(2)}`,
      item.quantity,
      `$${(item.quantity * item.price)?.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 85,
      head: tableHeaders,
      body: tableRows,
      headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 249] },
      styles: { fontSize: 9, font: 'helvetica' },
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('FINANCIAL SUMMARY', 130, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Total Order Amount:`, 130, finalY + 8);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${inv.salesOrder?.TotalAmount?.toFixed(2)}`, 190, finalY + 8, { align: 'right' });

    doc.save(`Invoice_${inv.invoiceNumber}.pdf`);
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const isCustomer = user?.role === 'Customer';
  const canWrite = ['Admin', 'Sales_Manager', 'Customer'].includes(user?.role);
  const isManager = ['Admin', 'Sales_Manager'].includes(user?.role);

  const canCancelOrder = (order) => {
    if (isManager) return true;
    if (user?.role === 'Customer') {
      const custEmail = order.customer?.contactInfo?.email || '';
      return custEmail.toLowerCase() === user?.email?.toLowerCase() || order.createdBy?._id === user?._id || order.createdBy === user?._id;
    }
    return false;
  };

  useEffect(() => {
    if (isCustomer && customers.length > 0) {
      setCustomerId(customers[0]._id);
    }
  }, [customers, isCustomer]);

  // Helper: map orderId to existing invoice
  const getInvoiceForOrder = (orderId) => {
    return invoices.find((inv) => (inv.salesOrder?._id || inv.salesOrder) === orderId);
  };

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const matchSearch =
      !search ||
      order._id.toLowerCase().includes(search.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || order.status === statusFilter;
    const matchPayment = !paymentFilter || order.paymentStatus === paymentFilter;
    return matchSearch && matchStatus && matchPayment;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-sm transition-all ${
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
          <h1 className="text-2xl font-bold text-gray-800">
            {isCustomer ? 'My Orders & Deliveries' : 'Sales Orders & Payment Hub'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isCustomer
              ? 'Track your order fulfillment, delivery progress, and download official invoices'
              : 'Issue customer quotes, lock pricing, manage order fulfillment, and track incoming payment'}
          </p>
        </div>
        {canWrite && (
          isCustomer ? (
            <Link
              to="/products"
              className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <span>🛒 Browse Store & Order Items</span>
            </Link>
          ) : (
            <button
              onClick={() => {
                setCustomerId(isCustomer && customers.length > 0 ? customers[0]._id : '');
                setPaymentStatus('unpaid');
                setRemarks('');
                setItems([{ product: '', quantity: 1 }]);
                setIsCreateModalOpen(true);
              }}
              className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <span>+ Create Sales Order</span>
            </button>
          )
        )}
      </div>

      {/* Workflow Explainer Pipeline Stepper */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-150 shadow-xs">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3 flex items-center space-x-2">
          <span>🔄 Streamlined Sales & Fulfillment Lifecycle</span>
          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-mono font-bold">Fast-Track Delivery</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-100 flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 font-black flex items-center justify-center text-[11px] shrink-0">1</span>
            <div>
              <p className="font-bold text-gray-800">Order Placed (Pending)</p>
              <p className="text-gray-500 text-[11px]">Pricing locked; stock reserved from warehouse catalog.</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-black flex items-center justify-center text-[11px] shrink-0">2</span>
            <div>
              <p className="font-bold text-gray-800">Processing</p>
              <p className="text-gray-500 text-[11px]">Warehouse packs items; cashier records payment if ready.</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center text-[11px] shrink-0">3</span>
            <div>
              <p className="font-bold text-gray-800">Delivered & Settled</p>
              <p className="text-gray-500 text-[11px]">Customer receives shipment; inventory fulfilled; invoice ready.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-xs flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by Order ID (#...) or Customer Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Fulfillment: All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Payment: All</option>
            <option value="Paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
          {(search || statusFilter || paymentFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setPaymentFilter('');
              }}
              className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-lg cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-stone-50/80 border-b border-gray-100 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                <th className="p-4">Order ID</th>
                <th className="p-4">{isCustomer ? 'Recipient & Instructions' : 'Customer'}</th>
                <th className="p-4 text-center">Fulfillment Status</th>
                <th className="p-4 text-center">Payment Status & Action</th>
                <th className="p-4 text-center">Commercial Invoice</th>
                <th className="p-4 text-right">Order Total</th>
                <th className="p-4 text-center">Manage Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">Loading sales orders...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No sales orders matched your filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusColors = {
                    Pending: 'bg-amber-50 text-amber-800 border-amber-200',
                    Processing: 'bg-blue-50 text-blue-800 border-blue-200',
                    Shipped: 'bg-purple-50 text-purple-800 border-purple-200',
                    Delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    Cancelled: 'bg-red-50 text-red-800 border-red-200',
                  };
                  const linkedInvoice = getInvoiceForOrder(order._id);

                  return (
                    <tr key={order._id} className="hover:bg-amber-50/30 transition-colors">
                      {/* Order ID */}
                      <td className="p-4">
                        <span className="font-mono font-bold text-gray-900 text-xs block">
                          #{order._id.substring(order._id.length - 8)}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(order.createdAt || order.DateOfOrder).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Customer / Recipient */}
                      <td className="p-4 font-semibold text-gray-900">
                        {isCustomer ? (
                          <div>
                            <span className="block text-stone-900 font-bold">{order.customer?.name || user?.name}</span>
                            {order.remarks && <span className="block text-[11px] text-stone-500 line-clamp-1">{order.remarks}</span>}
                          </div>
                        ) : (
                          order.customer?.name || '—'
                        )}
                      </td>

                      {/* Fulfillment Status */}
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusColors[order.status] || 'bg-gray-50 text-gray-600'}`}>
                          {order.status}
                        </span>
                      </td>

                      {/* Payment Status & Quick Toggle */}
                      <td className="p-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              order.paymentStatus === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : order.paymentStatus === 'partial'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {order.paymentStatus === 'Paid' ? '✓ Paid' : order.paymentStatus === 'partial' ? '⏳ Partial' : '✕ Unpaid'}
                          </span>

                          {/* Quick Payment Action for Manager */}
                          {isManager && order.paymentStatus !== 'Paid' && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdatePaymentStatus(order._id, 'Paid')}
                              className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded cursor-pointer transition-all border border-emerald-300"
                              title="Record as Paid"
                            >
                              💳 Mark Paid
                            </button>
                          )}
                          {isManager && order.paymentStatus === 'Paid' && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdatePaymentStatus(order._id, 'unpaid')}
                              className="text-[10px] text-gray-400 hover:text-rose-600 underline cursor-pointer"
                              title="Reset to Unpaid"
                            >
                              Mark Unpaid
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Invoice Link */}
                      <td className="p-4 text-center">
                        {linkedInvoice ? (
                          <div className="inline-flex items-center space-x-1">
                            <button
                              onClick={() => handleDownloadInvoicePDF(linkedInvoice)}
                              title="Download Commercial Invoice PDF"
                              className="px-2.5 py-1 bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 rounded text-xs font-bold font-mono cursor-pointer flex items-center space-x-1"
                            >
                              <ReceiptLongIcon className="!w-3.5 !h-3.5 text-amber-600" />
                              <span>{linkedInvoice.invoiceNumber}</span>
                            </button>
                          </div>
                        ) : isManager && order.status !== 'Cancelled' ? (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleGenerateInvoice(order._id)}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-stone-900 text-xs font-semibold rounded border border-stone-200 cursor-pointer transition-all"
                            title="Generate Invoice for this Order"
                          >
                            + Issue Invoice
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="p-4 text-right font-black text-gray-900 text-sm">
                        ${order.TotalAmount?.toFixed(2)}
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleViewDetails(order)}
                            title="View Full Order Details"
                            className="p-1.5 hover:bg-stone-100 text-stone-700 rounded cursor-pointer"
                          >
                            <VisibilityIcon className="!w-5 !h-5" />
                          </button>

                          {/* Progressive Status Buttons */}
                          {isManager && order.status === 'Pending' && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdateStatus(order._id, 'Processing')}
                              title="Approve & Move to Processing"
                              className="px-2.5 py-1 bg-blue-50 text-blue-800 hover:bg-blue-100 font-bold text-xs rounded border border-blue-200 cursor-pointer"
                            >
                              Process ➜
                            </button>
                          )}
                          {isManager && (order.status === 'Processing' || order.status === 'Shipped') && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdateStatus(order._id, 'Delivered')}
                              title="Mark as Delivered to Customer & Fulfill Stock"
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs rounded border border-emerald-200 cursor-pointer flex items-center space-x-1"
                            >
                              <CheckCircleIcon className="!w-3.5 !h-3.5" />
                              <span>Deliver ✓</span>
                            </button>
                          )}

                          {['Pending', 'Processing'].includes(order.status) && canCancelOrder(order) && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleCancelOrder(order._id)}
                              title="Cancel Order & Restore Stock"
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded cursor-pointer"
                            >
                              <CancelIcon className="!w-5 !h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-stone-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Create New Sales Order</h2>
                <p className="text-xs text-gray-500">Locks current product prices server-side and deducts inventory</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Customer Account</label>
                {isCustomer ? (
                  <div className="px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm font-semibold text-gray-700">
                    {customers[0]?.name || 'Loading Customer...'}
                  </div>
                ) : (
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Payment Status Dropdown at Creation */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Payment Status at Checkout
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    className={`flex items-center p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      paymentStatus === 'unpaid'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentStatus"
                      value="unpaid"
                      checked={paymentStatus === 'unpaid'}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="mr-2 accent-rose-600"
                    />
                    <span>Unpaid (Due Later)</span>
                  </label>

                  <label
                    className={`flex items-center p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      paymentStatus === 'Paid'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentStatus"
                      value="Paid"
                      checked={paymentStatus === 'Paid'}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="mr-2 accent-emerald-600"
                    />
                    <span>Paid in Full</span>
                  </label>

                  <label
                    className={`flex items-center p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                      paymentStatus === 'partial'
                        ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentStatus"
                      value="partial"
                      checked={paymentStatus === 'partial'}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="mr-2 accent-amber-600"
                    />
                    <span>Partial / Deposit</span>
                  </label>
                </div>
              </div>

              {/* Order Line Items */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Order Line Items</label>
                <div className="space-y-2">
                  {items.map((item, index) => {
                    const selectedProductObj = products.find((p) => p._id === item.product);
                    return (
                      <div key={index} className="flex items-center space-x-2">
                        <select
                          required
                          value={item.product}
                          onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => {
                            const onHand = typeof p.onHand === 'number' ? p.onHand : (p.stock || 0);
                            const reserved = typeof p.reserved === 'number' ? p.reserved : 0;
                            const available = typeof p.available === 'number' ? p.available : Math.max(0, onHand - reserved);
                            return (
                              <option key={p._id} value={p._id} disabled={available <= 0}>
                                {p.name} (${p.price} | Available: {available} units)
                              </option>
                            );
                          })}
                        </select>
                        <input
                          type="number"
                          required
                          min="1"
                          max={
                            selectedProductObj
                              ? (typeof selectedProductObj.available === 'number'
                                  ? selectedProductObj.available
                                  : (selectedProductObj.stock || 9999))
                              : 9999
                          }
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="Qty"
                        />
                        <div className="w-24 text-right font-semibold text-gray-700 text-sm">
                          ${selectedProductObj ? (selectedProductObj.price * item.quantity).toFixed(2) : '0.00'}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="mt-2.5 px-3 py-1.5 text-xs bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-bold rounded cursor-pointer"
                >
                  + Add Item Line
                </button>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Remarks & Payment Notes</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 h-16 resize-none"
                  placeholder="E.g., Customer paid via UPI/Card, dispatch by Friday, Net 30 terms..."
                />
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-500">
                  Total Order Value: <span className="text-lg font-black text-emerald-700">${calculateFormTotal().toFixed(2)}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/10 transition-all cursor-pointer"
                  >
                    Submit Sales Order
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {isDetailModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-stone-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Sales Order Detail</h2>
                <p className="text-xs font-mono text-gray-400">Order ID: #{selectedOrder._id}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Order Info & Customer */}
              <div className="grid grid-cols-2 gap-4 text-sm bg-stone-50/70 p-3.5 rounded-lg border border-stone-150">
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Customer</span>
                  <span className="font-semibold text-gray-900">{selectedOrder.customer?.name}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Order Date</span>
                  <span className="text-gray-700">
                    {new Date(selectedOrder.createdAt || selectedOrder.DateOfOrder).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment & Invoice Controls */}
              <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Payment Status:</span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-bold border ${
                      selectedOrder.paymentStatus === 'Paid'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : selectedOrder.paymentStatus === 'partial'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {selectedOrder.paymentStatus === 'Paid' ? '✓ Paid' : selectedOrder.paymentStatus === 'partial' ? '⏳ Partial' : '✕ Unpaid'}
                  </span>
                </div>

                {isManager && (
                  <div className="flex items-center space-x-2 pt-1">
                    <span className="text-xs text-gray-500 font-medium">Record Payment:</span>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleUpdatePaymentStatus(selectedOrder._id, 'Paid')}
                      className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer ${
                        selectedOrder.paymentStatus === 'Paid'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50'
                      }`}
                    >
                      Paid
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleUpdatePaymentStatus(selectedOrder._id, 'partial')}
                      className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer ${
                        selectedOrder.paymentStatus === 'partial'
                          ? 'bg-amber-500 text-white'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-amber-50'
                      }`}
                    >
                      Partial
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleUpdatePaymentStatus(selectedOrder._id, 'unpaid')}
                      className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer ${
                        selectedOrder.paymentStatus === 'unpaid'
                          ? 'bg-rose-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-rose-50'
                      }`}
                    >
                      Unpaid
                    </button>
                  </div>
                )}

                {/* Linked Invoice inside Details */}
                <div className="pt-2 border-t border-amber-100 flex items-center justify-between text-xs">
                  {getInvoiceForOrder(selectedOrder._id) ? (
                    <>
                      <span className="text-gray-600">
                        Commercial Invoice: <span className="font-mono font-bold text-gray-900">{getInvoiceForOrder(selectedOrder._id).invoiceNumber}</span>
                      </span>
                      <button
                        onClick={() => handleDownloadInvoicePDF(getInvoiceForOrder(selectedOrder._id))}
                        className="px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-stone-950 font-bold rounded cursor-pointer flex items-center space-x-1"
                      >
                        <DownloadIcon className="!w-3.5 !h-3.5" />
                        <span>PDF Invoice</span>
                      </button>
                    </>
                  ) : isManager && selectedOrder.status !== 'Cancelled' ? (
                    <>
                      <span className="text-gray-500">No invoice issued yet.</span>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleGenerateInvoice(selectedOrder._id)}
                        className="px-3 py-1 bg-amber-400 hover:bg-amber-500 text-stone-950 font-bold rounded cursor-pointer"
                      >
                        Generate Invoice Now
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Items List */}
              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase mb-2">Itemized Products</span>
                <div className="space-y-2">
                  {selectedOrder.products?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2.5 rounded-lg border border-gray-150">
                      <div>
                        <span className="font-semibold text-gray-900">{item.product?.name || 'Deleted Product'}</span>
                        <span className="block text-xs text-gray-500">Qty: {item.quantity} × ${item.price?.toFixed(2)}</span>
                      </div>
                      <span className="font-black text-gray-900">${(item.quantity * item.price)?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              {selectedOrder.remarks && (
                <div className="bg-stone-50 p-3 rounded-lg border border-gray-150">
                  <span className="block text-xs font-bold text-stone-600 uppercase">Remarks & Notes</span>
                  <p className="text-sm text-gray-700 mt-1">{selectedOrder.remarks}</p>
                </div>
              )}

              {/* Grand Total */}
              <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-sm font-semibold">
                <span className="text-gray-500">Total Order Amount:</span>
                <span className="text-xl font-black text-emerald-700">${selectedOrder.TotalAmount?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOrders;
