import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext.jsx';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PaymentIcon from '@mui/icons-material/Payment';
import DownloadIcon from '@mui/icons-material/Download';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { exportPOInvoicePDF } from '../utils/poInvoiceGenerator.js';

const PurchaseOrders = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  // Workflow Dialogs
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [targetOrder, setTargetOrder] = useState(null);

  // Supplier Rejection Dialog
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Workflow Dialog Form Fields
  const [confirmData, setConfirmData] = useState({ expectedDeliveryDate: '', notes: '' });
  const [shipData, setShipData] = useState({ carrier: '', trackingNumber: '', notes: '' });
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'Bank Transfer',
    reference: '',
    notes: '',
  });

  // GRN Dialog Form Fields
  const [grnItems, setGrnItems] = useState([]);
  const [grnMeta, setGrnMeta] = useState({ deliveryReference: '', packingSlipNumber: '', remarks: '' });

  // Create PO Form Fields
  const [supplierId, setSupplierId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState([{ product: '', quantity: 1, price: 0 }]);

  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Fetch POs, Suppliers, and Products (Role-scoped to avoid 403 on products/suppliers for Supplier role)
  const fetchData = async () => {
    setLoading(true);
    try {
      if (user?.role === 'Supplier') {
        const poRes = await axios.get('http://127.0.0.1:9999/api/purchase-orders?limit=300');
        setOrders(poRes.data.orders || []);
      } else {
        const [poRes, suppRes, prodRes] = await Promise.all([
          axios.get('http://127.0.0.1:9999/api/purchase-orders?limit=300'),
          axios.get('http://127.0.0.1:9999/api/suppliers?all=true'),
          axios.get('http://127.0.0.1:9999/api/products?all=true'),
        ]);
        setOrders(poRes.data.orders || []);
        setSuppliers(suppRes.data.suppliers || []);
        setProducts(prodRes.data.products || []);
      }
    } catch (error) {
      console.error('Error fetching purchase data:', error);
    }
    setLoading(false);
  };

  const handleOpenCreateModal = async () => {
    setSupplierId('');
    setPaymentStatus('unpaid');
    setPaymentTerms('Net 30');
    setExpectedDeliveryDate('');
    setRemarks('');
    setItems([{ product: '', quantity: 1, price: 0 }]);
    setIsCreateModalOpen(true);
    // Refresh suppliers and products so all newly created vendors/products appear immediately
    try {
      const [sRes, pRes] = await Promise.all([
        axios.get('http://127.0.0.1:9999/api/suppliers?all=true'),
        axios.get('http://127.0.0.1:9999/api/products?all=true'),
      ]);
      if (sRes.data.suppliers) setSuppliers(sRes.data.suppliers);
      if (pRes.data.products) setProducts(pRes.data.products);
    } catch (e) {
      console.warn('Silent refresh failed:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'product') {
      const prod = products.find((p) => p._id === value);
      if (prod) newItems[index].price = prod.price;
    }
    setItems(newItems);
  };

  const addLineItem = () => {
    setItems([...items, { product: '', quantity: 1, price: 0 }]);
  };

  const removeLineItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== index));
    }
  };

  const calculateFormTotal = () => {
    return items.reduce((sum, item) => {
      const p = parseFloat(item.price) || 0;
      const q = parseInt(item.quantity, 10) || 0;
      return sum + p * q;
    }, 0);
  };

  // Submit PO Creation
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId) return alert('Please select a supplier vendor.');

    const payload = {
      supplier: supplierId,
      paymentStatus,
      paymentTerms,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      remarks,
      products: items.map((item) => ({
        product: item.product,
        quantity: parseInt(item.quantity, 10),
        price: parseFloat(item.price),
      })),
    };

    try {
      setActionLoading(true);
      await axios.post('http://127.0.0.1:9999/api/purchase-orders', payload);
      setIsCreateModalOpen(false);
      showToast('Purchase Order created successfully (status: Pending)');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  // 1. Confirm Acceptance Action
  const handleOpenConfirm = (order) => {
    setTargetOrder(order);
    setConfirmData({
      expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.slice(0, 10) : '',
      notes: 'Vendor confirmed order via communication',
    });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    if (!targetOrder) return;
    try {
      setActionLoading(true);
      await axios.put(`http://127.0.0.1:9999/api/purchase-orders/${targetOrder._id}/status`, {
        status: 'Confirmed',
        notes: confirmData.notes,
        expectedDeliveryDate: confirmData.expectedDeliveryDate || undefined,
      });
      setIsConfirmModalOpen(false);
      showToast(`PO ${targetOrder.poNumber} confirmed by vendor!`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to confirm order');
    } finally {
      setActionLoading(false);
    }
  };

  // Supplier Direct Accept & Reject Handlers
  const handleAcceptOrder = async (order) => {
    try {
      setActionLoading(true);
      await axios.put(`http://127.0.0.1:9999/api/purchase-orders/${order._id}/status`, {
        status: 'Confirmed',
        notes: 'Purchase Order accepted and confirmed by supplier vendor',
      });
      showToast(`Purchase Order #${order.poNumber || order._id.slice(-6)} Accepted!`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to accept purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (order) => {
    setRejectingOrder(order);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return alert('Please enter a rejection reason.');
    try {
      setActionLoading(true);
      await axios.put(`http://127.0.0.1:9999/api/purchase-orders/${rejectingOrder._id}/status`, {
        status: 'Rejected',
        notes: rejectionReason.trim(),
        rejectionReason: rejectionReason.trim(),
      });
      setRejectModalOpen(false);
      showToast('Purchase Order rejected with documented reason.');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Advance to Processing
  const handleAdvanceToProcessing = async (order) => {
    try {
      setActionLoading(true);
      await axios.put(`http://127.0.0.1:9999/api/purchase-orders/${order._id}/status`, {
        status: 'Processing',
        notes: 'Vendor preparing and packaging goods',
      });
      showToast(`PO ${order.poNumber} transitioned to Processing`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Mark Shipped Action
  const handleOpenShip = (order) => {
    setTargetOrder(order);
    setShipData({
      carrier: order.carrier || '',
      trackingNumber: order.trackingNumber || '',
      notes: 'Dispatched by vendor carrier',
    });
    setIsShipModalOpen(true);
  };

  const handleShipSubmit = async (e) => {
    e.preventDefault();
    if (!targetOrder) return;
    try {
      setActionLoading(true);
      await axios.put(`http://127.0.0.1:9999/api/purchase-orders/${targetOrder._id}/status`, {
        status: 'Shipped',
        carrier: shipData.carrier,
        trackingNumber: shipData.trackingNumber,
        notes: shipData.notes,
      });
      setIsShipModalOpen(false);
      showToast(`PO ${targetOrder.poNumber} marked as Shipped!`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update shipping details');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Cancel Order
  const handleCancelOrder = async (order) => {
    const reason = prompt('Please enter a cancellation reason:');
    if (!reason) return;
    try {
      setActionLoading(true);
      await axios.put(`http://127.0.0.1:9999/api/purchase-orders/${order._id}/status`, {
        status: 'Cancelled',
        notes: reason,
      });
      showToast(`PO ${order.poNumber} cancelled successfully`, 'info');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Open Payment Modal
  const handleOpenPayment = (order) => {
    setTargetOrder(order);
    const outstanding = Math.max(0, order.TotalAmount - (order.paidAmount || 0));
    setPaymentData({
      amount: outstanding > 0 ? outstanding.toFixed(2) : '',
      paymentMethod: 'Bank Transfer',
      reference: '',
      notes: 'Payment disbursement to supplier',
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!targetOrder) return;
    try {
      setActionLoading(true);
      const res = await axios.post(`http://127.0.0.1:9999/api/purchase-orders/${targetOrder._id}/payments`, paymentData);
      setIsPaymentModalOpen(false);
      showToast(`Payment of $${parseFloat(paymentData.amount).toFixed(2)} recorded! New status: ${res.data.paymentStatus}`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Open GRN Intake Modal
  const handleOpenGrnModal = async (order) => {
    setTargetOrder(order);
    try {
      const res = await axios.get(`http://127.0.0.1:9999/api/purchase-orders/${order._id}`);
      const summary = res.data.receivedSummary || {};
      const lines = order.products.map((item) => {
        const pId = (item.product?._id || item.product).toString();
        const pSummary = summary[pId] || { ordered: item.quantity, accepted: 0, remaining: item.quantity };
        return {
          product: pId,
          name: item.product?.name || 'Product',
          orderedQuantity: item.quantity,
          previouslyAccepted: pSummary.accepted || 0,
          remaining: pSummary.remaining !== undefined ? pSummary.remaining : item.quantity,
          receivedQuantity: pSummary.remaining !== undefined ? pSummary.remaining : item.quantity,
          acceptedQuantity: pSummary.remaining !== undefined ? pSummary.remaining : item.quantity,
          rejectedQuantity: 0,
          rejectionReason: '',
        };
      });
      setGrnItems(lines);
      setGrnMeta({
        deliveryReference: order.trackingNumber || '',
        packingSlipNumber: '',
        remarks: `Dock goods receipt for ${order.poNumber || order._id}`,
      });
      setIsGrnModalOpen(true);
    } catch (error) {
      alert('Failed to load order intake summary');
    }
  };

  const handleGrnSubmit = async (e) => {
    e.preventDefault();
    if (!targetOrder) return;

    const payload = {
      purchaseOrder: targetOrder._id,
      productsReceived: grnItems.map((item) => ({
        product: item.product,
        receivedQuantity: parseInt(item.receivedQuantity, 10),
        acceptedQuantity: parseInt(item.acceptedQuantity, 10),
        rejectedQuantity: parseInt(item.rejectedQuantity, 10) || 0,
        rejectionReason: item.rejectionReason,
      })),
      deliveryReference: grnMeta.deliveryReference,
      packingSlipNumber: grnMeta.packingSlipNumber,
      remarks: grnMeta.remarks,
    };

    try {
      setActionLoading(true);
      await axios.post('http://127.0.0.1:9999/api/grns', payload);
      setIsGrnModalOpen(false);
      showToast('🎉 Goods Receipt Note registered! Accepted quantities added to warehouse inventory.');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error processing Goods Receipt Note');
    } finally {
      setActionLoading(false);
    }
  };

  // 7. View Full Details
  const handleViewDetails = async (order) => {
    try {
      const res = await axios.get(`http://127.0.0.1:9999/api/purchase-orders/${order._id}`);
      setSelectedOrderDetail(res.data);
      setIsDetailModalOpen(true);
    } catch (error) {
      alert('Error fetching order details');
    }
  };

  const canWrite = ['Admin', 'Purchase_Manager'].includes(user?.role);
  const canReceiveGrn = ['Admin', 'Inventory_Manager', 'Purchase_Manager'].includes(user?.role);

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const matchSearch =
      !search ||
      (order.poNumber && order.poNumber.toLowerCase().includes(search.toLowerCase())) ||
      (order.supplier?.name && order.supplier.name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !statusFilter || order.status === statusFilter;
    const matchPayment = !paymentFilter || order.paymentStatus === paymentFilter;
    return matchSearch && matchStatus && matchPayment;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-xs transition-all ${
            notification.type === 'info'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
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
            {user?.role === 'Supplier' ? 'My Purchase Orders & Inbound Delivery' : 'Purchase Orders & Inbound Procurement'}
          </h1>
          <p className="text-gray-500 text-sm">
            {user?.role === 'Supplier'
              ? 'Review assigned purchase orders, accept or reject incoming contracts, and download official PO Billing Invoices'
              : 'Issue procurement orders, record vendor acceptance & dispatch, intake stock via GRN, and disburse payments'}
          </p>
        </div>
        {canWrite && user?.role !== 'Supplier' && (
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <span>+ Create Purchase Order</span>
          </button>
        )}
      </div>

      {/* Procurement / Supplier Workflow Guidance */}
      {user?.role === 'Supplier' ? (
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-150 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>📦 Vendor Order Processing Flow</span>
              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-mono font-bold">Supplier Portal</span>
            </div>
            <span className="text-[11px] text-gray-500 font-normal hidden sm:inline">1. Accept/Reject PO ➔ 2. Download Official PO Invoice ➔ 3. Warehouse Delivery & Disbursement</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex items-start space-x-2.5">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-200 text-stone-800 font-black flex items-center justify-center text-xs">1</span>
              <div>
                <span className="font-bold text-gray-900 block text-xs">Review & Accept</span>
                <span className="text-gray-500 text-[11px]">Inspect line items, ordered quantities, prices, and accept or reject the PO.</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-300 flex items-start space-x-2.5">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-400 text-stone-950 font-black flex items-center justify-center text-xs">2</span>
              <div>
                <span className="font-bold text-amber-950 block text-xs">Download PO Invoice</span>
                <span className="text-amber-800 text-[11px]">Click 'PO Invoice' on any order to download an official PDF billing slip.</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-300 flex items-start space-x-2.5">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center text-xs">3</span>
              <div>
                <span className="font-bold text-emerald-950 block text-xs">Delivery & Disbursement</span>
                <span className="text-emerald-800 text-[11px]">Warehouse verifies goods via GRN; finance disburses full contract payment.</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-150 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>📦 Streamlined ERP Procurement Workflow</span>
              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-mono font-bold">Direct GRN Intake</span>
            </div>
            <span className="text-[11px] text-gray-500 font-normal hidden sm:inline">1. Create PO ➔ 2. Verify Goods (GRN) ➔ 3. Stock Automatically Incremented</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex items-start space-x-2.5">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-200 text-stone-800 font-black flex items-center justify-center text-xs">1</span>
              <div>
                <span className="font-bold text-gray-900 block text-xs">Create Purchase Order</span>
                <span className="text-gray-500 text-[11px]">Select vendor, pick products, set quantities & price, and issue order.</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-300 flex items-start space-x-2.5">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-400 text-stone-950 font-black flex items-center justify-center text-xs">2</span>
              <div>
                <span className="font-bold text-amber-950 block text-xs">Verify & Intake (GRN)</span>
                <span className="text-amber-800 text-[11px]">Directly verify physical delivery, record accepted vs damaged items.</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-300 flex items-start space-x-2.5">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center text-xs">3</span>
              <div>
                <span className="font-bold text-emerald-950 block text-xs">Stock Updated & Delivered</span>
                <span className="text-emerald-800 text-[11px]">Accepted quantities credit catalog stock immediately; PO reaches Delivered.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-xs flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by PO Number (#...) or Supplier Name..."
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
            <option value="">Status: All Lifecycle States</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Partially_Received">Partially Received</option>
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
                <th className="p-4">PO Number & Date</th>
                <th className="p-4">Supplier Vendor</th>
                <th className="p-4 text-center">Fulfillment Status</th>
                <th className="p-4 text-center">Financial Status</th>
                <th className="p-4 text-right">PO Total</th>
                <th className="p-4 text-center">Warehouse Intake & Stock Update (GRN)</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">Loading purchase orders...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">No purchase orders found matching your criteria.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusColors = {
                    Pending: 'bg-stone-100 text-stone-800 border-stone-200',
                    Confirmed: 'bg-blue-50 text-blue-800 border-blue-200',
                    Processing: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                    Shipped: 'bg-purple-50 text-purple-800 border-purple-200',
                    Partially_Received: 'bg-amber-50 text-amber-800 border-amber-200',
                    Delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    Cancelled: 'bg-rose-50 text-rose-800 border-rose-200',
                  };

                  const outstanding = Math.max(0, order.TotalAmount - (order.paidAmount || 0));

                  return (
                    <tr key={order._id} className="hover:bg-amber-50/30 transition-colors">
                      {/* PO Number */}
                      <td className="p-4">
                        <span className="font-mono font-bold text-gray-900 text-xs block">
                          {order.poNumber || `#PO-${order._id.substring(order._id.length - 8)}`}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(order.createdAt || order.DateOfOrder).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Supplier */}
                      <td className="p-4 font-semibold text-gray-900">
                        <span>{order.supplier?.name || '—'}</span>
                        {order.expectedDeliveryDate && (
                          <span className="block text-[11px] text-amber-800 font-medium">
                            Due: {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusColors[order.status] || 'bg-gray-50 text-gray-600'}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Payment Status & Action */}
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

                          <span className="text-[10px] text-gray-500 font-mono">
                            Paid: ${Number(order.paidAmount || 0).toFixed(2)}
                          </span>

                          {canWrite && order.paymentStatus !== 'Paid' && order.status !== 'Cancelled' && (
                            <button
                              onClick={() => handleOpenPayment(order)}
                              className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded cursor-pointer transition-all border border-emerald-300 flex items-center space-x-1"
                              title="Record Payment Disbursement"
                            >
                              <PaymentIcon className="!w-3 !h-3" />
                              <span>Disburse</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="p-4 text-right font-black text-gray-900 text-sm">
                        ${order.TotalAmount?.toFixed(2)}
                      </td>

                      {/* Goods Receipt Intake & Stock Verification */}
                      <td className="p-4 text-center">
                        {order.status === 'Delivered' ? (
                          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 inline-flex items-center space-x-1.5 shadow-2xs">
                            <CheckCircleIcon className="!w-4 !h-4 text-emerald-600" />
                            <span>Fully Received (Stock Updated)</span>
                          </span>
                        ) : order.status === 'Cancelled' ? (
                          <span className="px-2.5 py-1 bg-stone-100 text-stone-500 text-xs font-semibold rounded border border-stone-200">
                            Cancelled
                          </span>
                        ) : ['Processing', 'Shipped', 'Partially_Received', 'Confirmed', 'Pending'].includes(order.status) && canReceiveGrn && user?.role !== 'Supplier' ? (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleOpenGrnModal(order)}
                            className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-stone-950 font-black text-xs rounded-lg shadow-sm shadow-amber-400/25 cursor-pointer transition-all flex items-center justify-center space-x-1.5 mx-auto hover:scale-105 active:scale-95"
                            title="Directly verify items received at warehouse dock and update stock in database"
                          >
                            <InventoryIcon className="!w-4 !h-4" />
                            <span>📦 Verify & Intake (GRN)</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs font-medium">
                            {order.status === 'Shipped' ? 'In-Transit to Warehouse' : 'Pending Receiving'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* If Supplier and order is Pending, provide Accept & Reject buttons */}
                          {user?.role === 'Supplier' && order.status === 'Pending' && (
                            <>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleAcceptOrder(order)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center space-x-1 text-xs transition-colors cursor-pointer"
                                title="Accept Purchase Order"
                              >
                                <ThumbUpIcon className="!w-3.5 !h-3.5" />
                                <span>Accept</span>
                              </button>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleOpenReject(order)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded flex items-center space-x-1 text-xs transition-colors cursor-pointer"
                                title="Reject Purchase Order"
                              >
                                <ThumbDownIcon className="!w-3.5 !h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* 1-Click Download PO Invoice Slip */}
                          <button
                            onClick={() => exportPOInvoicePDF(order)}
                            className="p-1.5 hover:bg-amber-100 text-amber-900 bg-amber-50 rounded-lg cursor-pointer transition-colors border border-amber-200"
                            title="Download Official PO Invoice (PDF)"
                          >
                            <DownloadIcon className="!w-4 !h-4" />
                          </button>

                          {/* Details */}
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="p-1.5 hover:bg-stone-100 text-stone-700 rounded-lg cursor-pointer transition-colors"
                            title="View Full PO & Receiving Timeline"
                          >
                            <VisibilityIcon className="!w-4 !h-4" />
                          </button>

                          {/* Cancel (Internal staff only) */}
                          {canWrite && user?.role !== 'Supplier' && ['Pending', 'Confirmed', 'Processing', 'Shipped'].includes(order.status) && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleCancelOrder(order)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer transition-colors"
                              title="Cancel Purchase Order"
                            >
                              <CancelIcon className="!w-4 !h-4" />
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

      {/* 1. Modal: Record Vendor Confirmation */}
      {isConfirmModalOpen && targetOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/60">
              <div>
                <h2 className="text-base font-bold text-blue-900">Record Vendor Confirmation</h2>
                <p className="text-xs text-blue-700">Order: {targetOrder.poNumber}</p>
              </div>
              <button onClick={() => setIsConfirmModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleConfirmSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={confirmData.expectedDeliveryDate}
                  onChange={(e) => setConfirmData({ ...confirmData, expectedDeliveryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Confirmation Notes / Vendor Reference
                </label>
                <textarea
                  required
                  value={confirmData.notes}
                  onChange={(e) => setConfirmData({ ...confirmData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 h-20 resize-none"
                  placeholder="E.g., Confirmed by vendor account manager via email; delivery scheduled for dock #2"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow-sm cursor-pointer"
                >
                  Confirm Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Record Vendor Shipment */}
      {isShipModalOpen && targetOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-purple-50/60">
              <div>
                <h2 className="text-base font-bold text-purple-900">Record Carrier Shipment</h2>
                <p className="text-xs text-purple-700">Order: {targetOrder.poNumber}</p>
              </div>
              <button onClick={() => setIsShipModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleShipSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Carrier / Transport Company
                </label>
                <input
                  type="text"
                  required
                  value={shipData.carrier}
                  onChange={(e) => setShipData({ ...shipData, carrier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="E.g., Blue Dart Freight, TCI Express"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Tracking / Consignment Number
                </label>
                <input
                  type="text"
                  required
                  value={shipData.trackingNumber}
                  onChange={(e) => setShipData({ ...shipData, trackingNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="E.g., TRK-998822-IN"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Dispatch Notes
                </label>
                <textarea
                  value={shipData.notes}
                  onChange={(e) => setShipData({ ...shipData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 h-16 resize-none"
                  placeholder="E.g., 2 refrigerated pallets on container truck #DL-01-A-489"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsShipModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-sm shadow-sm cursor-pointer"
                >
                  Mark as Shipped
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Record Vendor Payment */}
      {isPaymentModalOpen && targetOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-emerald-50/60">
              <div>
                <h2 className="text-base font-bold text-emerald-900">Record Vendor Disbursement</h2>
                <p className="text-xs text-emerald-700">Order: {targetOrder.poNumber} | Total: ${targetOrder.TotalAmount?.toFixed(2)}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div>
                  <span className="text-gray-500 block">Total Paid So Far:</span>
                  <span className="font-bold text-gray-800">${Number(targetOrder.paidAmount || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Remaining Balance:</span>
                  <span className="font-bold text-emerald-700">${Math.max(0, targetOrder.TotalAmount - (targetOrder.paidAmount || 0)).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Payment Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  max={Math.max(0, targetOrder.TotalAmount - (targetOrder.paidAmount || 0))}
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    <option value="Bank Transfer">Bank Wire / NEFT</option>
                    <option value="Corporate Card">Corporate Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Transaction Ref #
                  </label>
                  <input
                    type="text"
                    value={paymentData.reference}
                    onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="TXN-49201"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Payment Notes
                </label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 h-16 resize-none"
                  placeholder="E.g., 50% advance settlement per contract terms"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-sm cursor-pointer"
                >
                  Disburse Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: GRN Warehouse Dock Intake */}
      {isGrnModalOpen && targetOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-amber-50/70">
              <div>
                <h2 className="text-base font-bold text-stone-900 flex items-center space-x-1.5">
                  <span>📦 Goods Receipt Note (GRN) Dock Intake</span>
                </h2>
                <p className="text-xs text-stone-600">
                  Order: <strong>{targetOrder.poNumber}</strong> | Vendor: {targetOrder.supplier?.name}
                </p>
              </div>
              <button onClick={() => setIsGrnModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleGrnSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-xs text-blue-900 leading-relaxed">
                <strong>Warehouse Rule:</strong> Only <strong>Accepted Quantities</strong> increment available stock in the inventory catalog. Damaged or rejected items are recorded for credit/replacement and do NOT increase stock.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Carrier Tracking / BOL #</label>
                  <input
                    type="text"
                    value={grnMeta.deliveryReference}
                    onChange={(e) => setGrnMeta({ ...grnMeta, deliveryReference: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="TRK-9821-DEL"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Vendor Packing Slip #</label>
                  <input
                    type="text"
                    value={grnMeta.packingSlipNumber}
                    onChange={(e) => setGrnMeta({ ...grnMeta, packingSlipNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="PS-NEST-892"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Item-by-Item Physical Count Verification</label>
                <div className="space-y-3">
                  {grnItems.map((item, index) => (
                    <div key={index} className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 text-sm">{item.name}</span>
                        <span className="text-gray-500">
                          Ordered: <strong>{item.orderedQuantity}</strong> | Prev Accepted: <strong>{item.previouslyAccepted}</strong> | Remaining: <strong className="text-amber-800">{item.remaining}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600">Counted Total</label>
                          <input
                            type="number"
                            min="0"
                            max={item.remaining}
                            value={item.receivedQuantity}
                            onChange={(e) => {
                              const updated = [...grnItems];
                              const val = parseInt(e.target.value, 10) || 0;
                              updated[index].receivedQuantity = val;
                              updated[index].acceptedQuantity = val;
                              updated[index].rejectedQuantity = 0;
                              setGrnItems(updated);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded font-bold text-center bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-emerald-800">Accepted (Stock +)</label>
                          <input
                            type="number"
                            min="0"
                            max={item.remaining}
                            value={item.acceptedQuantity}
                            onChange={(e) => {
                              const updated = [...grnItems];
                              const accepted = parseInt(e.target.value, 10) || 0;
                              updated[index].acceptedQuantity = accepted;
                              updated[index].rejectedQuantity = Math.max(0, updated[index].receivedQuantity - accepted);
                              setGrnItems(updated);
                            }}
                            className="w-full px-2 py-1 border border-emerald-300 rounded font-bold text-center bg-emerald-50 text-emerald-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-rose-800">Rejected (Damaged)</label>
                          <input
                            type="number"
                            min="0"
                            value={item.rejectedQuantity}
                            onChange={(e) => {
                              const updated = [...grnItems];
                              const rejected = parseInt(e.target.value, 10) || 0;
                              updated[index].rejectedQuantity = rejected;
                              updated[index].acceptedQuantity = Math.max(0, updated[index].receivedQuantity - rejected);
                              setGrnItems(updated);
                            }}
                            className="w-full px-2 py-1 border border-rose-300 rounded font-bold text-center bg-rose-50 text-rose-900"
                          />
                        </div>
                      </div>

                      {item.rejectedQuantity > 0 && (
                        <div>
                          <input
                            type="text"
                            value={item.rejectionReason}
                            onChange={(e) => {
                              const updated = [...grnItems];
                              updated[index].rejectionReason = e.target.value;
                              setGrnItems(updated);
                            }}
                            placeholder="Reason for rejection (e.g. damaged seal, leaking carton)"
                            className="w-full px-2 py-1 border border-rose-200 rounded text-xs text-rose-900 bg-rose-50/50"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Dock Inspection Notes</label>
                <textarea
                  value={grnMeta.remarks}
                  onChange={(e) => setGrnMeta({ ...grnMeta, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 h-14 resize-none"
                  placeholder="Inspection notes, pallet seal condition, warehouse bay location"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsGrnModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer flex items-center space-x-1"
                >
                  <span>✓ Intake Goods & Update Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Create Purchase Order */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-stone-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Draft New Purchase Order</h2>
                <p className="text-xs text-gray-500">Commercial procurement commitment to supplier vendor</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Select Supplier / Vendor <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-500 font-medium">
                    {suppliers.length} vendor{suppliers.length !== 1 ? 's' : ''} available
                  </span>
                </div>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white text-gray-800 font-medium"
                >
                  <option value="">-- Choose Vendor ({suppliers.length} Available) --</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} {s.contactInfo?.email ? `(${s.contactInfo.email})` : s.contactInfo?.phone_number ? `(${s.contactInfo.phone_number})` : ''}
                    </option>
                  ))}
                </select>
                {suppliers.length === 0 && (
                  <p className="text-xs text-amber-700 mt-1">
                    No vendors found. Please add vendors in the <a href="/suppliers" className="underline font-bold">Suppliers</a> section first.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white"
                  >
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="100% Advance">100% Advance Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Line items */}
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
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} (Stock: {p.stock} | Catalog: ${p.price})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 text-center"
                          placeholder="Qty"
                        />
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="0"
                          value={item.price}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 text-right"
                          placeholder="Cost Price"
                        />
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

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Procurement Instructions / Terms</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 h-16 resize-none"
                  placeholder="Delivery terms FOB warehouse dock, Net 30, rush restocking"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-500">
                  Total Order Value: <span className="text-lg font-black text-amber-700">${calculateFormTotal().toFixed(2)}</span>
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
                    Draft Purchase Order
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: View Full PO Details, Audit Timeline, and Payments */}
      {isDetailModalOpen && selectedOrderDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-stone-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {selectedOrderDetail.order.poNumber || `#PO-${selectedOrderDetail.order._id}`}
                </h2>
                <p className="text-xs text-gray-500">Vendor: {selectedOrderDetail.order.supplier?.name}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportPOInvoicePDF(selectedOrderDetail.order)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer transition-colors shadow-xs"
                  title="Download PO Invoice Slip (PDF)"
                >
                  <DownloadIcon className="!w-4 !h-4 text-amber-400" />
                  <span>Download PO Invoice (PDF)</span>
                </button>
                <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs">
                <div>
                  <span className="text-gray-400 block font-bold">Lifecycle Status:</span>
                  <span className="font-bold text-stone-800 text-sm">{selectedOrderDetail.order.status}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold">Financial Status:</span>
                  <span className="font-bold text-emerald-800 text-sm">{selectedOrderDetail.order.paymentStatus}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold">Total Amount:</span>
                  <span className="font-bold text-gray-900">${selectedOrderDetail.order.TotalAmount?.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold">Outstanding Balance:</span>
                  <span className="font-bold text-rose-700">${selectedOrderDetail.outstandingBalance?.toFixed(2)}</span>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Item Line Details</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 font-bold text-gray-600">
                      <tr>
                        <th className="p-2.5">Product</th>
                        <th className="p-2.5 text-center">Ordered</th>
                        <th className="p-2.5 text-center">Accepted</th>
                        <th className="p-2.5 text-center">Remaining</th>
                        <th className="p-2.5 text-right">Price</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedOrderDetail.order.products?.map((item, idx) => {
                        const pId = (item.product?._id || item.product).toString();
                        const pSummary = selectedOrderDetail.receivedSummary?.[pId] || {};
                        return (
                          <tr key={idx}>
                            <td className="p-2.5 font-semibold text-gray-900">{item.product?.name || 'Product'}</td>
                            <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                            <td className="p-2.5 text-center text-emerald-800 font-bold">{pSummary.accepted || 0}</td>
                            <td className="p-2.5 text-center text-amber-800 font-bold">{pSummary.remaining !== undefined ? pSummary.remaining : item.quantity}</td>
                            <td className="p-2.5 text-right font-mono">${item.price?.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-black">${(item.quantity * item.price)?.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audit Status History */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Audit Status History</h3>
                <div className="space-y-1.5 text-xs">
                  {selectedOrderDetail.order.statusHistory?.map((entry, idx) => (
                    <div key={idx} className="p-2 bg-stone-50 rounded border border-stone-200 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-gray-800">{entry.toStatus}</span>
                        {entry.notes && <span className="text-gray-500 text-[11px] block">{entry.notes}</span>}
                      </div>
                      <span className="text-gray-400 text-[11px]">
                        {new Date(entry.changedAt).toLocaleString()} ({entry.changedBy?.name || 'Staff'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments History */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Disbursement History ({selectedOrderDetail.order.payments?.length || 0})
                </h3>
                {selectedOrderDetail.order.payments?.length === 0 ? (
                  <p className="text-xs text-gray-400 bg-gray-50 p-2.5 rounded text-center">No disbursements recorded yet.</p>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {selectedOrderDetail.order.payments?.map((pay, idx) => (
                      <div key={idx} className="p-2 bg-emerald-50/50 rounded border border-emerald-200 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-emerald-900">${pay.amount?.toFixed(2)}</span>
                          <span className="text-gray-500 text-[11px] block">{pay.paymentMethod} {pay.reference ? `(Ref: ${pay.reference})` : ''} - {pay.notes}</span>
                        </div>
                        <span className="text-gray-400 text-[11px]">
                          {new Date(pay.paidDate).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Supplier Rejection Reason */}
      {rejectModalOpen && rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-rose-50/60">
              <div>
                <h2 className="text-base font-bold text-rose-900">
                  Reject Purchase Order #{rejectingOrder.poNumber || rejectingOrder._id?.slice(-6)}
                </h2>
                <p className="text-xs text-rose-700">Vendor: {rejectingOrder.supplier?.name || 'Assigned Supplier'}</p>
              </div>
              <button onClick={() => setRejectModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 h-24 resize-none"
                  placeholder="E.g., Out of stock on requested item lines, factory capacity full, or revised price quote required..."
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-sm shadow-sm cursor-pointer"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
