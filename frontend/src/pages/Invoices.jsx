import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext.jsx';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Invoices = () => {
  const { user } = useContext(AuthContext);
  const [invoices, setInvoices] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Form Fields
  const [salesOrderId, setSalesOrderId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Invoices and Available Sales Orders
  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, soRes] = await Promise.all([
        axios.get('http://127.0.0.1:9999/api/invoices?limit=200'),
        axios.get('http://127.0.0.1:9999/api/sales-orders?limit=200'),
      ]);
      const currentInvoices = invRes.data.invoices || [];
      setInvoices(currentInvoices);

      // Find Sales Orders that do NOT yet have an invoice and are fulfilled or delivered
      const existingSoIds = currentInvoices.map((inv) => (inv.salesOrder?._id || inv.salesOrder));
      const uninvoicedOrders = (soRes.data.orders || []).filter(
        (so) => ['Fulfilled', 'Delivered'].includes(so.status) && !existingSoIds.includes(so._id)
      );
      setSalesOrders(uninvoicedOrders);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Submit Invoice Creation
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!salesOrderId) return alert('Please select a fulfilled sales order.');

    const payload = {
      salesOrder: salesOrderId,
      remarks,
    };

    try {
      setActionLoading(true);
      await axios.post('http://127.0.0.1:9999/api/invoices', payload);
      setIsCreateModalOpen(false);
      showToast('Commercial Invoice generated successfully!');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error generating invoice');
    } finally {
      setActionLoading(false);
    }
  };

  // Record Full Customer Payment against Invoice
  const handleMarkPaid = async (invoice) => {
    if (!invoice?._id) return;
    try {
      setActionLoading(true);
      await axios.post(`http://127.0.0.1:9999/api/invoices/${invoice._id}/payments`, {
        amount: invoice.totalAmount || invoice.salesOrder?.TotalAmount,
        paymentMethod: 'Bank Transfer',
        reference: `PAY-${Date.now().toString().slice(-6)}`,
      });
      showToast('Full customer payment recorded and verified!');
      await fetchData();
      if (selectedInvoice && selectedInvoice._id === invoice._id) {
        setSelectedInvoice((prev) => ({
          ...prev,
          paymentStatus: 'Paid',
          paidAmount: invoice.totalAmount,
          salesOrder: prev.salesOrder ? { ...prev.salesOrder, paymentStatus: 'Paid' } : null,
        }));
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error recording payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailModalOpen(true);
  };

  // Export PDF Invoice
  const handleExportPDF = (invoice) => {
    const doc = new jsPDF();
    const customer = invoice.salesOrder?.customer;
    const products = invoice.salesOrder?.products || [];

    // Header Banner
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 35, 'F');

    // Title text inside banner
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('COMMERCIAL INVOICE', 14, 23);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('ERP SYSTEM BILLING PORTAL', 140, 23);

    // Invoice Metadata Box
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('INVOICE DETAILS', 14, 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 14, 58);
    doc.text(`Date Issued: ${new Date(invoice.createdAt).toLocaleDateString()}`, 14, 64);
    doc.text(`Sales Order Ref: #${invoice.salesOrder?._id?.substring(invoice.salesOrder?._id?.length - 8)}`, 14, 70);
    doc.text(`Payment Status: ${invoice.salesOrder?.paymentStatus || 'unpaid'}`, 14, 76);

    // Customer Billing Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('BILL TO', 120, 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${customer?.name || '—'}`, 120, 58);
    doc.text(`Email: ${customer?.contactInfo?.email || '—'}`, 120, 64);
    doc.text(`Address: ${customer?.contactInfo?.address?.street || '—'}`, 120, 70, { maxWidth: 80 });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 82, 196, 82);

    // Products Table
    const tableHeaders = [['#', 'Product Name', 'Price', 'Qty', 'Total']];
    const tableRows = products.map((item, idx) => [
      idx + 1,
      item.product?.name || 'Item',
      `$${item.price?.toFixed(2)}`,
      item.quantity,
      `$${(item.quantity * item.price)?.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 88,
      head: tableHeaders,
      body: tableRows,
      headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 249] },
      styles: { fontSize: 9, font: 'helvetica' },
    });

    // Summary Box
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SUMMARY', 140, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Subtotal Amount:`, 140, finalY + 8);
    doc.text(`Tax Rate (VAT 0%):`, 140, finalY + 14);

    doc.setFont('helvetica', 'bold');
    doc.text(`Grand Total Amount:`, 140, finalY + 22);

    doc.setFont('helvetica', 'normal');
    doc.text(`$${invoice.salesOrder?.TotalAmount?.toFixed(2)}`, 185, finalY + 8, { align: 'right' });
    doc.text(`$0.00`, 185, finalY + 14, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`$${invoice.salesOrder?.TotalAmount?.toFixed(2)}`, 185, finalY + 22, { align: 'right' });

    if (invoice.remarks) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Notes / Remarks:', 14, finalY + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(invoice.remarks, 14, finalY + 14, { maxWidth: 110 });
    }

    doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
  };

  const canWrite = ['Admin', 'Sales_Manager'].includes(user?.role);

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch =
      !search ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.salesOrder?.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchPayment = !paymentFilter || inv.salesOrder?.paymentStatus === paymentFilter;
    return matchSearch && matchPayment;
  });

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
          <h1 className="text-2xl font-bold text-gray-800">Commercial Invoices Directory</h1>
          <p className="text-gray-500 text-sm">Issue commercial billing statements, verify payments, and export PDF reports</p>
        </div>
        {canWrite && (
          <button
            onClick={() => {
              setSalesOrderId('');
              setRemarks('');
              setIsCreateModalOpen(true);
            }}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <span>+ Generate Invoice</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-xs flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by Invoice Number or Customer Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Payment Status: All</option>
          <option value="Paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>
        {(search || paymentFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setPaymentFilter('');
            }}
            className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-100 rounded-lg cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-stone-50/80 border-b border-gray-100 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                <th className="p-4">Invoice Number</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4 font-mono">Sales Order Link</th>
                <th className="p-4">Issued Date</th>
                <th className="p-4 text-center">Payment Status</th>
                <th className="p-4 text-right">Grand Total</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">Loading billing invoices...</td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">No invoices generated yet.</td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const payment = inv.paymentStatus || inv.salesOrder?.paymentStatus || 'Unpaid';
                  const grandTotal = typeof inv.totalAmount === 'number' ? inv.totalAmount : (inv.salesOrder?.TotalAmount || 0);

                  return (
                    <tr key={inv._id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="p-4 font-bold text-gray-900 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="p-4 font-semibold text-gray-900">{inv.salesOrder?.customer?.name || inv.customer?.name || '—'}</td>
                      <td className="p-4 font-mono text-gray-500 text-xs">
                        #{inv.salesOrder?._id?.substring(inv.salesOrder?._id?.length - 8) || '—'}
                      </td>
                      <td className="p-4 text-gray-500">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              payment === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : payment === 'partial'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {payment === 'Paid' ? '✓ Paid' : payment === 'partial' ? '⏳ Partial' : '✕ Unpaid'}
                          </span>
                          {canWrite && payment !== 'Paid' && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleMarkPaid(inv)}
                              className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded cursor-pointer transition-all border border-emerald-300"
                              title="Record Full Customer Payment"
                            >
                              💳 Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right font-black text-gray-900">${grandTotal.toFixed(2)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleViewDetails(inv)}
                            className="p-1.5 hover:bg-stone-100 text-stone-700 rounded cursor-pointer"
                            title="View Details"
                          >
                            <VisibilityIcon className="!w-5 !h-5" />
                          </button>
                          <button
                            onClick={() => handleExportPDF(inv)}
                            className="p-1.5 hover:bg-amber-100 text-amber-700 rounded cursor-pointer"
                            title="Download PDF Invoice"
                          >
                            <DownloadIcon className="!w-5 !h-5" />
                          </button>
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

      {/* Create Invoice Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-stone-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Generate Commercial Invoice</h2>
                <p className="text-xs text-gray-500">Link to an active sales order to issue billing statement</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Select Sales Order
                </label>
                <select
                  required
                  value={salesOrderId}
                  onChange={(e) => setSalesOrderId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                >
                  <option value="">-- Choose Sales Order to Invoice --</option>
                  {salesOrders.map((so) => (
                    <option key={so._id} value={so._id}>
                      #{so._id.substring(so._id.length - 8)} | Customer: {so.customer?.name} | Total: ${so.TotalAmount?.toFixed(2)} | Status: {so.status}
                    </option>
                  ))}
                </select>
                {salesOrders.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">All current active sales orders already have invoices generated!</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Invoice Remarks & Payment Terms
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 h-20 resize-none"
                  placeholder="E.g., Payment received in full, wire transfer to Chase Account, Net 30..."
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
                  disabled={actionLoading || !salesOrderId}
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
                >
                  Generate & Save Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {isDetailModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-stone-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Commercial Invoice Details</h2>
                <p className="text-xs font-mono text-gray-400">Invoice: {selectedInvoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm bg-stone-50/70 p-3.5 rounded-lg border border-stone-150">
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Customer</span>
                  <span className="font-semibold text-gray-900">{selectedInvoice.salesOrder?.customer?.name || '—'}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Invoice Date</span>
                  <span className="text-gray-800">{new Date(selectedInvoice.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Payment Section */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-gray-700 block">Payment Status:</span>
                  <span className="text-gray-500 font-semibold">{selectedInvoice.paymentStatus || selectedInvoice.salesOrder?.paymentStatus || 'Unpaid'}</span>
                </div>
                {canWrite && (selectedInvoice.paymentStatus !== 'Paid' && selectedInvoice.salesOrder?.paymentStatus !== 'Paid') && (
                  <button
                    onClick={() => handleMarkPaid(selectedInvoice)}
                    className="px-3 py-1 bg-emerald-600 text-white font-bold rounded cursor-pointer hover:bg-emerald-700"
                  >
                    💳 Record Full Payment
                  </button>
                )}
              </div>

              <div>
                <span className="block text-xs font-bold text-gray-500 uppercase mb-2">Billed Line Items</span>
                <div className="space-y-2">
                  {selectedInvoice.salesOrder?.products?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2.5 rounded-lg border border-gray-150">
                      <div>
                        <span className="font-semibold text-gray-900">{item.product?.name || 'Item'}</span>
                        <span className="block text-xs text-gray-500">Qty: {item.quantity} × ${item.price?.toFixed(2)}</span>
                      </div>
                      <span className="font-black text-gray-900">${(item.quantity * item.price)?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedInvoice.remarks && (
                <div className="bg-stone-50 p-3 rounded-lg border border-gray-150">
                  <span className="block text-xs font-bold text-stone-600 uppercase">Invoice Remarks</span>
                  <p className="text-sm text-gray-700 mt-1">{selectedInvoice.remarks}</p>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500 block">Grand Total</span>
                  <span className="text-xl font-black text-emerald-700">${selectedInvoice.salesOrder?.TotalAmount?.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => handleExportPDF(selectedInvoice)}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-xs shadow-sm flex items-center space-x-1 cursor-pointer"
                >
                  <DownloadIcon className="!w-4 !h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
