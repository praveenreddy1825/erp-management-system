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

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Form Fields
  const [salesOrderId, setSalesOrderId] = useState('');
  const [remarks, setRemarks] = useState('');

  // Fetch Invoices and Sales Orders
  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, soRes] = await Promise.all([
        axios.get('http://127.0.0.1:9999/api/invoices'),
        axios.get('http://127.0.0.1:9999/api/sales-orders?limit=100'),
      ]);
      setInvoices(invRes.data.invoices || []);
      
      // Load sales orders that do not have an invoice generated yet
      const existingSoIds = (invRes.data.invoices || []).map((inv) => inv.salesOrder?._id);
      const uninvoicedOrders = (soRes.data.orders || []).filter(
        (so) => so.status === 'Completed' || !existingSoIds.includes(so._id)
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
    if (!salesOrderId) return alert('Please select a sales order.');

    const payload = {
      salesOrder: salesOrderId,
      remarks,
    };

    try {
      await axios.post('http://127.0.0.1:9999/api/invoices', payload);
      setIsCreateModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error generating invoice');
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

    // Header Color Blocks
    doc.setFillColor(6, 78, 59); // deep green background for banner
    doc.rect(0, 0, 210, 35, 'F');

    // Title text inside banner
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('COMMERCIAL INVOICE', 14, 23);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('ERP SYSTEM PORTAL', 155, 23);

    // Invoice Metadata Box
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('INVOICE DETAILS', 14, 50);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 14, 58);
    doc.text(`Date Issued: ${new Date(invoice.createdAt).toLocaleDateString()}`, 14, 64);
    doc.text(`Sales Order Reference: #${invoice.salesOrder?._id?.substring(invoice.salesOrder?._id?.length - 8)}`, 14, 70);

    // Customer Billing Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('BILL TO', 120, 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${customer?.name || '—'}`, 120, 58);
    doc.text(`Email: ${customer?.contactInfo?.email || '—'}`, 120, 64);
    doc.text(`Address: ${customer?.contactInfo?.address?.street || '—'}`, 120, 70, { maxWidth: 80 });

    // Dividers
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 80, 196, 80);

    // Products table headers & rows
    const tableHeaders = [['#', 'Product Name', 'Price', 'Qty', 'Total']];
    const tableRows = products.map((item, idx) => [
      idx + 1,
      item.product?.name || 'Deleted Product',
      `$${item.price?.toFixed(2)}`,
      item.quantity,
      `$${(item.quantity * item.price)?.toFixed(2)}`,
    ]);

    // Render AutoTable
    autoTable(doc, {
      startY: 85,
      head: tableHeaders,
      body: tableRows,
      headStyles: { fillOpacity: 0.9, fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
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
    
    // Value text right aligned
    doc.setFont('helvetica', 'normal');
    doc.text(`$${invoice.salesOrder?.TotalAmount?.toFixed(2)}`, 185, finalY + 8, { align: 'right' });
    doc.text(`$0.00`, 185, finalY + 14, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`$${invoice.salesOrder?.TotalAmount?.toFixed(2)}`, 185, finalY + 22, { align: 'right' });

    // Remarks note if any
    if (invoice.remarks) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Notes / Remarks:', 14, finalY + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(invoice.remarks, 14, finalY + 14, { maxWidth: 110 });
    }

    // Save document
    doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
  };

  const canWrite = ['Admin', 'Sales_Manager'].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Invoices Directory</h1>
          <p className="text-gray-500 text-sm">Issue commercial billing statements and export PDF reports</p>
        </div>
        {canWrite && (
          <button
            onClick={() => {
              setSalesOrderId('');
              setRemarks('');
              setIsCreateModalOpen(true);
            }}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-emerald-955 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
          >
            + Generate Invoice
          </button>
        )}
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                <th className="p-4">Invoice Number</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4 font-mono">Sales Order Link</th>
                <th className="p-4">Issued Date</th>
                <th className="p-4 text-right">Grand Total</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">Loading billing invoices...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">No invoices generated yet.</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-bold text-gray-900">{inv.invoiceNumber}</td>
                    <td className="p-4 font-semibold">{inv.salesOrder?.customer?.name || '—'}</td>
                    <td className="p-4 font-mono text-gray-500 text-xs">
                      #{inv.salesOrder?._id?.substring(inv.salesOrder?._id?.length - 8) || '—'}
                    </td>
                    <td className="p-4 text-gray-500">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right font-black text-gray-900">${inv.salesOrder?.TotalAmount?.toFixed(2)}</td>
                    <td className="p-4 flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(inv)}
                        className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded cursor-pointer"
                        title="View Details"
                      >
                        <VisibilityIcon className="!w-5 !h-5" />
                      </button>
                      <button
                        onClick={() => handleExportPDF(inv)}
                        className="p-1.5 hover:bg-yellow-50 text-yellow-600 rounded cursor-pointer"
                        title="Download PDF Invoice"
                      >
                        <DownloadIcon className="!w-5 !h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Invoice Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Generate Invoice</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Select Active Sales Order</label>
                <select
                  required
                  value={salesOrderId}
                  onChange={(e) => setSalesOrderId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Sales Order --</option>
                  {salesOrders.map((so) => (
                    <option key={so._id} value={so._id}>
                      #SO-{so._id.substring(so._id.length - 8)} ({so.customer?.name} | Value: ${so.TotalAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Invoice Notes (Optional)</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 h-20 resize-none"
                  placeholder="Terms, payment methods, delivery details..."
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-emerald-955 font-black rounded-lg text-sm shadow-md shadow-yellow-500/10 transition-all cursor-pointer"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {isDetailModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-emerald-900 text-white">
              <div>
                <h2 className="text-lg font-bold">Commercial Billing Statement</h2>
                <p className="text-xs opacity-75 font-mono">{selectedInvoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-white hover:text-gray-200 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm pb-4 border-b border-gray-150">
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Customer Profile</span>
                  <span className="font-semibold text-gray-800 block">{selectedInvoice.salesOrder?.customer?.name}</span>
                  <span className="text-gray-500 text-xs block">{selectedInvoice.salesOrder?.customer?.contactInfo?.email}</span>
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase">Date Issued</span>
                  <span className="text-gray-800 font-semibold block">
                    {new Date(selectedInvoice.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-gray-500 text-xs block">Reference Order: #{selectedInvoice.salesOrder?._id?.substring(selectedInvoice.salesOrder?._id?.length - 8)}</span>
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase mb-2">Itemized Invoice Details</span>
                <div className="space-y-2">
                  {selectedInvoice.salesOrder?.products?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div>
                        <span className="font-semibold text-gray-800 block">{item.product?.name || 'Deleted Product'}</span>
                        <span className="text-xs text-gray-500 block">Qty: {item.quantity} × ${item.price?.toFixed(2)}</span>
                      </div>
                      <span className="font-black text-gray-900">${(item.quantity * item.price)?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedInvoice.remarks && (
                <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100/50">
                  <span className="block text-xs font-bold text-amber-800 uppercase">Billing Notes</span>
                  <p className="text-sm text-gray-700 mt-1">{selectedInvoice.remarks}</p>
                </div>
              )}

              <div className="border-t border-gray-150 pt-4 flex justify-between items-center">
                <button
                  onClick={() => handleExportPDF(selectedInvoice)}
                  className="px-4 py-2 border border-yellow-400 text-emerald-955 bg-yellow-400 hover:bg-yellow-500 text-xs font-bold rounded flex items-center space-x-1.5 shadow-md shadow-yellow-500/10 cursor-pointer"
                >
                  <DownloadIcon className="!w-4 !h-4" />
                  <span>Download PDF Document</span>
                </button>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Grand Total Balance Due</span>
                  <span className="text-2xl font-black text-emerald-800">${selectedInvoice.salesOrder?.TotalAmount?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
