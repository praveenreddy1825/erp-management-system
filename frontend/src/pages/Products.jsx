import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext.jsx';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

// Predefined ERP Categories (Enum) with Rich UI Metadata & SKU Prefixes
const CATEGORY_DEFINITIONS = [
  { id: 'Grocery', emoji: '🌾', label: 'Grocery & Staples', color: 'from-amber-500/15 to-emerald-500/10', border: 'border-emerald-200', text: 'text-emerald-800', bg: 'bg-emerald-50', skuPrefix: 'GROC' },
  { id: 'Dairy', emoji: '🥛', label: 'Dairy & Breakfast', color: 'from-blue-500/15 to-indigo-500/10', border: 'border-blue-200', text: 'text-blue-800', bg: 'bg-blue-50', skuPrefix: 'DAIR' },
  { id: 'Packaged Food', emoji: '🍿', label: 'Snacks & Packaged', color: 'from-orange-500/15 to-amber-500/10', border: 'border-orange-200', text: 'text-orange-800', bg: 'bg-orange-50', skuPrefix: 'PACK' },
  { id: 'Beverages', emoji: '☕', label: 'Tea, Coffee & Drinks', color: 'from-amber-600/15 to-yellow-600/10', border: 'border-amber-200', text: 'text-amber-800', bg: 'bg-amber-50', skuPrefix: 'BEV' },
  { id: 'Personal Care', emoji: '✨', label: 'Personal Care & Beauty', color: 'from-pink-500/15 to-purple-500/10', border: 'border-pink-200', text: 'text-pink-800', bg: 'bg-pink-50', skuPrefix: 'PERS' },
  { id: 'Household', emoji: '🧼', label: 'Household & Cleaning', color: 'from-cyan-500/15 to-teal-500/10', border: 'border-cyan-200', text: 'text-cyan-800', bg: 'bg-cyan-50', skuPrefix: 'HOUS' },
  { id: 'Fashion', emoji: '👕', label: 'Fashion & Apparel', color: 'from-violet-500/15 to-purple-500/10', border: 'border-violet-200', text: 'text-violet-800', bg: 'bg-violet-50', skuPrefix: 'FASH' },
  { id: 'Electronics', emoji: '⚡', label: 'Electronics & Gadgets', color: 'from-sky-500/15 to-blue-500/10', border: 'border-sky-200', text: 'text-sky-800', bg: 'bg-sky-50', skuPrefix: 'ELEC' },
  { id: 'Pharmacy', emoji: '💊', label: 'Pharmacy & Wellness', color: 'from-red-500/15 to-rose-500/10', border: 'border-red-200', text: 'text-red-800', bg: 'bg-red-50', skuPrefix: 'PHAR' },
  { id: 'Office Supplies', emoji: '📎', label: 'Office & Stationery', color: 'from-indigo-500/15 to-slate-500/10', border: 'border-indigo-200', text: 'text-indigo-800', bg: 'bg-indigo-50', skuPrefix: 'OFFC' },
  { id: 'Hardware & Tools', emoji: '🔨', label: 'Hardware & Tools', color: 'from-zinc-500/15 to-neutral-500/10', border: 'border-zinc-200', text: 'text-zinc-800', bg: 'bg-zinc-50', skuPrefix: 'TOOL' },
  { id: 'Home & Kitchen', emoji: '🍳', label: 'Home & Kitchenware', color: 'from-amber-600/15 to-orange-500/10', border: 'border-amber-200', text: 'text-amber-800', bg: 'bg-amber-50', skuPrefix: 'HOME' },
  { id: 'Industrial', emoji: '⚙️', label: 'Industrial Equipment', color: 'from-slate-600/15 to-stone-600/10', border: 'border-slate-300', text: 'text-slate-800', bg: 'bg-slate-50', skuPrefix: 'INDU' },
  { id: 'Raw Materials', emoji: '🪵', label: 'Raw Materials', color: 'from-amber-700/15 to-stone-600/10', border: 'border-amber-300', text: 'text-amber-900', bg: 'bg-amber-50', skuPrefix: 'RAWM' },
  { id: 'Valves', emoji: '🚰', label: 'Valves & Control', color: 'from-cyan-600/15 to-blue-600/10', border: 'border-cyan-300', text: 'text-cyan-900', bg: 'bg-cyan-50', skuPrefix: 'VALV' },
  { id: 'Pipes', emoji: '🔧', label: 'Pipes & Tubing', color: 'from-blue-600/15 to-indigo-600/10', border: 'border-blue-300', text: 'text-blue-900', bg: 'bg-blue-50', skuPrefix: 'PIPE' },
  { id: 'Machinery', emoji: '🚜', label: 'Heavy Machinery', color: 'from-yellow-600/15 to-amber-600/10', border: 'border-yellow-300', text: 'text-yellow-900', bg: 'bg-yellow-50', skuPrefix: 'MACH' },
  { id: 'Chemicals', emoji: '🧪', label: 'Chemicals & Solvents', color: 'from-emerald-600/15 to-teal-600/10', border: 'border-emerald-300', text: 'text-emerald-900', bg: 'bg-emerald-50', skuPrefix: 'CHEM' },
  { id: 'Automotive', emoji: '🚗', label: 'Automotive & Spares', color: 'from-red-600/15 to-rose-600/10', border: 'border-red-300', text: 'text-red-900', bg: 'bg-red-50', skuPrefix: 'AUTO' },
  { id: 'Packaging', emoji: '📦', label: 'Packaging & Shipping', color: 'from-stone-600/15 to-zinc-600/10', border: 'border-stone-300', text: 'text-stone-900', bg: 'bg-stone-50', skuPrefix: 'PACK' },
];


// Helper: auto-generate unique SKU code based on category prefix
const generateUniqueSKU = (catName) => {
  const match = CATEGORY_DEFINITIONS.find((c) => c.id === catName);
  const prefix = match ? match.skuPrefix : (catName ? catName.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '') : 'PROD');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${rand}`;
};

// Helper: lookup category display style & metadata
const getCategoryMeta = (cat) => {
  const match = CATEGORY_DEFINITIONS.find((c) => c.id === cat);
  if (match) return match;
  return { emoji: '📦', label: cat || 'General', color: 'from-stone-500/10 to-stone-600/10', border: 'border-stone-200', text: 'text-stone-800', bg: 'bg-stone-50', skuPrefix: 'ITEM' };
};

const Products = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const isCustomer = user?.role === 'Customer';

  // Catalog States
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt_desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(isCustomer ? 100 : 25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(false);

  // Customer Cart & Checkout States
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_customer_cart');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('Flat 402, Green Glen Apartments, Outer Ring Road');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [orderSuccessData, setOrderSuccessData] = useState(null);

  // Staff Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    SKU: '',
    category: '',
    price: '',
    stock: '',
    reorderLevel: '',
    description: '',
  });

  // Sync cart to localStorage
  useEffect(() => {
    if (isCustomer) {
      try {
        localStorage.setItem('erp_customer_cart', JSON.stringify(cart));
      } catch (err) {
        console.error('Failed to sync cart to localStorage', err);
      }
    }
  }, [cart, isCustomer]);

  // Fetch Products from Backend API
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const queryLimit = isCustomer ? 100 : limit;
      const catParam = selectedCategory && selectedCategory !== 'All' ? `&category=${encodeURIComponent(selectedCategory)}` : '';
      const sortParam = `&sortBy=${sortBy}`;
      const searchParam = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';

      const res = await axios.get(
        `http://127.0.0.1:9999/api/products?page=${page}&limit=${queryLimit}${searchParam}${catParam}${sortParam}`
      );

      setProducts(res.data.products || []);
      setTotalPages(res.data.pages || 1);
      setTotalProducts(res.data.totalProducts || 0);
      if (res.data.categories && res.data.categories.length > 0) {
        setCategories(res.data.categories);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [search, page, selectedCategory, sortBy, limit]);

  // Cart Helper Methods
  const getProductAvailable = (p) => {
    const onHand = typeof p.onHand === 'number' ? p.onHand : (p.stock || 0);
    const reserved = typeof p.reserved === 'number' ? p.reserved : 0;
    return typeof p.available === 'number' ? p.available : Math.max(0, onHand - reserved);
  };

  const addToCart = (product) => {
    const available = getProductAvailable(product);
    if (available <= 0) {
      alert(`Sorry, "${product.name}" is currently out of stock.`);
      return;
    }
    setCart((prev) => {
      const existing = prev[product._id];
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty >= available) {
        alert(`Maximum available stock reached for "${product.name}" (${available} units).`);
        return prev;
      }
      return {
        ...prev,
        [product._id]: {
          product,
          quantity: currentQty + 1,
        },
      };
    });
  };

  const updateCartQty = (productId, newQty) => {
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      const available = getProductAvailable(existing.product);
      if (newQty > available) {
        alert(`Only ${available} units available in stock.`);
        return {
          ...prev,
          [productId]: { ...existing, quantity: available },
        };
      }
      return {
        ...prev,
        [productId]: { ...existing, quantity: newQty },
      };
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  // Cart Aggregations
  const cartEntries = Object.values(cart);
  const totalCartItems = cartEntries.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartEntries.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Handle Checkout / Place Order
  const handlePlaceOrder = async () => {
    if (cartEntries.length === 0) {
      alert('Your cart is empty. Please add products before checking out.');
      return;
    }

    try {
      setOrderPlacing(true);
      const payload = {
        items: cartEntries.map((item) => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.product.price,
        })),
        remarks: `QuickStore Order. Delivery to: ${deliveryAddress}. Notes: ${deliveryNotes || 'None'}`,
        paymentStatus: 'unpaid',
      };

      const res = await axios.post('http://127.0.0.1:9999/api/sales-orders', payload);

      // Successfully placed
      setOrderSuccessData({
        soNumber: res.data.soNumber || `#SO-${res.data._id?.slice(-8)}`,
        orderId: res.data._id,
        total: res.data.TotalAmount || cartTotal,
        itemsCount: totalCartItems,
      });

      clearCart();
      setIsCartDrawerOpen(false);
      fetchProducts(); // Refresh stock immediately
    } catch (error) {
      alert(error.response?.data?.message || 'Error placing order. Please try again.');
    } finally {
      setOrderPlacing(false);
    }
  };

  // Staff Form Handlers
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddOpen = () => {
    setIsEditMode(false);
    const defaultCat = 'Grocery';
    setFormData({
      name: '',
      SKU: generateUniqueSKU(defaultCat),
      category: defaultCat,
      price: '',
      stock: 20,
      reorderLevel: 10,
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    setFormData((prev) => ({
      ...prev,
      category: newCat,
      SKU: !isEditMode ? generateUniqueSKU(newCat) : prev.SKU,
    }));
  };

  const handleEditOpen = (product) => {
    setIsEditMode(true);
    setCurrentProductId(product._id);
    setFormData({
      name: product.name,
      SKU: product.SKU,
      category: product.category,
      price: product.price,
      stock: product.stock,
      reorderLevel: product.reorderLevel,
      description: product.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        await axios.put(`http://127.0.0.1:9999/api/products/${currentProductId}`, formData);
      } else {
        await axios.post('http://127.0.0.1:9999/api/products', formData);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving product');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product from the inventory?')) {
      try {
        await axios.delete(`http://127.0.0.1:9999/api/products/${id}`);
        fetchProducts();
      } catch (error) {
        alert(error.response?.data?.message || 'Error deleting product');
      }
    }
  };

  // Staff Permissions
  const canAddProduct = user?.role === 'Admin';
  const canEditProductCatalog = user?.role === 'Admin';
  const canEditInventory = ['Admin', 'Inventory_Manager'].includes(user?.role);
  const canViewInventory = ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager'].includes(user?.role);
  const canDeleteProduct = user?.role === 'Admin';

  // Group products by category for Customer Blinkit-style categorized layout
  const groupedProducts = categories.reduce((acc, cat) => {
    const list = products.filter((p) => p.category === cat);
    if (list.length > 0) {
      acc[cat] = list;
    }
    return acc;
  }, {});

  // If there are products with uncategorized names
  const uncategorized = products.filter((p) => !categories.includes(p.category));
  if (uncategorized.length > 0) {
    groupedProducts['Other Items'] = uncategorized;
  }

  // =========================================================================
  // RENDER: CUSTOMER BLINKIT-STYLE STOREFRONT
  // =========================================================================
  if (isCustomer) {
    return (
      <div className="space-y-6 pb-24">
        {/* Top Promotional & Store Header */}
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 rounded-2xl p-6 sm:p-8 shadow-sm border border-amber-300 text-stone-900 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 -skew-x-12 pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-2 bg-stone-900 text-yellow-300 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-xs">
                <span>⚡ QuickStore</span>
                <span className="text-stone-300">|</span>
                <span>Delivery in 10-15 mins</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-950 tracking-tight">
                India's Favorite Instant Mart
              </h1>
              <p className="text-stone-800 text-xs sm:text-sm font-medium">
                Groceries, dairy, snacks, beverages, cleaning & beauty essentials delivered at your door.
              </p>
            </div>

            {/* Top Right Cart Action Pill */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsCartDrawerOpen(true)}
                className="px-5 py-3 bg-stone-950 hover:bg-stone-900 text-yellow-400 font-black rounded-xl shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
              >
                <ShoppingCartIcon className="!w-5 !h-5 text-yellow-400" />
                <span className="text-sm">My Cart ({totalCartItems})</span>
                <span className="bg-yellow-400 text-stone-950 px-2 py-0.5 rounded-lg text-xs font-black">
                  ₹{cartTotal.toFixed(2)}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Header Bar */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row gap-3 items-center sticky top-2 z-20 backdrop-blur-md bg-white/95">
          <div className="relative flex-1 w-full">
            <SearchIcon className="!w-5 !h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search for atta, rice, oil, milk, tea, soap, noodles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-auto px-3.5 py-2.5 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="updatedAt_desc">⚡ Recently Restocked</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name">Product Name (A-Z)</option>
              <option value="stock_high">Most Available Stock</option>
            </select>
          </div>
        </div>

        {/* Category Navigation Pills (Blinkit Style) */}
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <div className="flex space-x-2 min-w-max">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center space-x-2 cursor-pointer shadow-xs ${
                selectedCategory === 'All'
                  ? 'bg-amber-400 text-stone-950 ring-2 ring-amber-400 shadow-sm'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              <span>⚡</span>
              <span>All Products</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-950/10 font-bold">
                {totalProducts}
              </span>
            </button>

            {categories.map((cat) => {
              const meta = getCategoryMeta(cat);
              const isSelected = selectedCategory === cat;
              const count = products.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center space-x-2 cursor-pointer shadow-xs ${
                    isSelected
                      ? 'bg-amber-400 text-stone-950 ring-2 ring-amber-400 shadow-sm'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                  {count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-950/10 font-bold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Catalog */}
        {loading ? (
          <div className="p-16 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
            <div className="animate-spin text-3xl mb-2">⚡</div>
            <p className="text-sm font-bold text-stone-600">Loading QuickStore catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-stone-200 space-y-3">
            <div className="text-4xl">🔍</div>
            <h3 className="text-base font-bold text-stone-800">No products found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              We couldn't find items matching your search or selected category. Try searching another grocery item.
            </p>
            <button
              onClick={() => { setSearch(''); setSelectedCategory('All'); }}
              className="px-4 py-2 bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : selectedCategory === 'All' && !search ? (
          // Categorized Layout when 'All' is active (Blinkit Experience)
          <div className="space-y-10">
            {Object.entries(groupedProducts).map(([catName, itemsList]) => {
              const meta = getCategoryMeta(catName);
              return (
                <div key={catName} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{meta.emoji}</span>
                      <h2 className="text-lg font-black text-stone-900 tracking-tight">{meta.label}</h2>
                      <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                        {itemsList.length} items
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedCategory(catName)}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <span>View All</span>
                      <span>➔</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {itemsList.map((product) => renderProductCard(product))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Single Category or Search Results Grid
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-stone-900 flex items-center space-x-2">
                <span>{selectedCategory !== 'All' ? getCategoryMeta(selectedCategory).emoji : '🔍'}</span>
                <span>{selectedCategory !== 'All' ? getCategoryMeta(selectedCategory).label : `Search Results for "${search}"`}</span>
                <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                  {products.length} items
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => renderProductCard(product))}
            </div>
          </div>
        )}

        {/* Floating Cart Bar (Blinkit Style) */}
        {totalCartItems > 0 && !isCartDrawerOpen && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-xl bg-stone-950 text-white p-3.5 px-6 rounded-2xl shadow-2xl flex items-center justify-between border border-stone-800 transition-all">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold shadow-xs">
                🛒
              </div>
              <div>
                <p className="text-sm font-black text-white">{totalCartItems} {totalCartItems === 1 ? 'item' : 'items'} in cart</p>
                <p className="text-xs text-amber-300 font-bold">Total: ₹{cartTotal.toFixed(2)}</p>
              </div>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-stone-950 font-black rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>View Cart & Checkout</span>
              <ArrowForwardIcon className="!w-4 !h-4" />
            </button>
          </div>
        )}

        {/* Slide-Over Cart & Checkout Drawer */}
        {isCartDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🛒</span>
                  <div>
                    <h2 className="text-base font-black text-stone-900">My Shopping Cart</h2>
                    <p className="text-xs text-stone-500">{totalCartItems} {totalCartItems === 1 ? 'item' : 'items'} selected</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {totalCartItems > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setIsCartDrawerOpen(false)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 cursor-pointer"
                  >
                    <CloseIcon className="!w-5 !h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Body: Line Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cartEntries.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-6 text-stone-400">
                    <span className="text-5xl">🛍️</span>
                    <h3 className="text-base font-bold text-stone-800">Your cart is empty</h3>
                    <p className="text-xs text-stone-500 max-w-xs">
                      Explore our categories and add fresh groceries, snacks, and essentials to your cart!
                    </p>
                    <button
                      onClick={() => setIsCartDrawerOpen(false)}
                      className="px-4 py-2 bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-xs"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2.5">
                      {cartEntries.map(({ product, quantity }) => {
                        const available = getProductAvailable(product);
                        const meta = getCategoryMeta(product.category);
                        const lineTotal = product.price * quantity;

                        return (
                          <div
                            key={product._id}
                            className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                {meta.emoji} {product.category}
                              </span>
                              <h4 className="text-xs font-bold text-stone-900 truncate">{product.name}</h4>
                              <p className="text-xs font-black text-stone-950 mt-0.5">
                                ₹{product.price.toFixed(2)}{' '}
                                <span className="text-[10px] font-normal text-stone-500">each</span>
                              </p>
                            </div>

                            {/* Stepper Controls */}
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center bg-white border border-stone-300 rounded-lg shadow-2xs">
                                <button
                                  onClick={() => updateCartQty(product._id, quantity - 1)}
                                  className="w-7 h-7 flex items-center justify-center text-stone-700 hover:bg-stone-100 rounded-l-lg cursor-pointer"
                                  title="Decrease quantity"
                                >
                                  <RemoveIcon className="!w-3.5 !h-3.5" />
                                </button>
                                <span className="w-8 text-center text-xs font-black text-stone-900 select-none">
                                  {quantity}
                                </span>
                                <button
                                  disabled={quantity >= available}
                                  onClick={() => updateCartQty(product._id, quantity + 1)}
                                  className="w-7 h-7 flex items-center justify-center text-stone-700 hover:bg-stone-100 rounded-r-lg cursor-pointer disabled:opacity-30"
                                  title="Increase quantity"
                                >
                                  <AddIcon className="!w-3.5 !h-3.5" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeFromCart(product._id)}
                                className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                <DeleteIcon className="!w-4 !h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Delivery Details */}
                    <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2.5">
                      <div className="flex items-center space-x-2 text-xs font-black text-amber-900">
                        <LocalShippingIcon className="!w-4 !h-4 text-amber-600" />
                        <span>Delivery Address & Instructions</span>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">
                          Delivery Location
                        </label>
                        <input
                          type="text"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="House/Flat number, Street, Landmark"
                          className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">
                          Delivery Instructions (Optional)
                        </label>
                        <input
                          type="text"
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="E.g., Ring bell, leave at security desk"
                          className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {/* Bill Summary */}
                    <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs">
                      <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">Bill Details</h4>
                      <div className="flex justify-between text-stone-600">
                        <span>Items Total</span>
                        <span className="font-semibold text-stone-900">₹{cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>Delivery Fee</span>
                        <span className="font-bold text-emerald-600">FREE ⚡</span>
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>Packaging & Taxes</span>
                        <span className="font-semibold text-stone-900">Included</span>
                      </div>
                      <div className="border-t border-stone-200 pt-2 flex justify-between text-sm font-black text-stone-950">
                        <span>To Pay</span>
                        <span>₹{cartTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Instant Stock Locking Invariant Notice */}
                    <div className="text-[11px] text-stone-500 bg-stone-100 p-2.5 rounded-lg border border-stone-200 flex items-start space-x-1.5">
                      <span>⚡</span>
                      <p>
                        Stock is reserved atomically from inventory upon order placement. Invoices are generated upon warehouse delivery.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Drawer Footer Actions */}
              {cartEntries.length > 0 && (
                <div className="p-4 border-t border-stone-200 bg-white space-y-2">
                  <button
                    disabled={orderPlacing}
                    onClick={handlePlaceOrder}
                    className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-xl text-sm shadow-md shadow-yellow-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {orderPlacing ? (
                      <span>Placing Order & Reserving Stock...</span>
                    ) : (
                      <>
                        <span>Place Order (₹{cartTotal.toFixed(2)})</span>
                        <ArrowForwardIcon className="!w-4 !h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-stone-400">
                    Pay on Delivery / Commercial Invoice provided on fulfillment
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Celebration / Order Success Modal */}
        {orderSuccessData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-xs">
                🎉
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-stone-950">Order Placed Successfully!</h3>
                <p className="text-xs text-stone-500">
                  Your order has been recorded and stock is atomically reserved.
                </p>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Order ID:</span>
                  <span className="font-mono font-bold text-stone-900">{orderSuccessData.soNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Total Items:</span>
                  <span className="font-bold text-stone-900">{orderSuccessData.itemsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Order Value:</span>
                  <span className="font-black text-emerald-700">₹{orderSuccessData.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => navigate('/sales-orders')}
                  className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1"
                >
                  <span>Track in My Orders</span>
                  <span>➔</span>
                </button>
                <button
                  onClick={() => setOrderSuccessData(null)}
                  className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Helper for rendering a single Blinkit Product Card
  function renderProductCard(product) {
    const available = getProductAvailable(product);
    const inCartItem = cart[product._id];
    const currentQty = inCartItem ? inCartItem.quantity : 0;
    const meta = getCategoryMeta(product.category);
    const isLow = available > 0 && available <= product.reorderLevel;

    return (
      <div
        key={product._id}
        className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between p-3.5 group relative"
      >
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${meta.bg} ${meta.text} border ${meta.border}`}>
            {meta.emoji} {product.category}
          </span>

          {available <= 0 ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
              Out of Stock
            </span>
          ) : isLow ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              Only {available} left
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              In Stock ({available})
            </span>
          )}
        </div>

        {/* Product Visual Container */}
        <div className={`h-28 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center mb-3 group-hover:scale-[1.02] transition-transform`}>
          <span className="text-4xl drop-shadow-sm select-none">{meta.emoji}</span>
        </div>

        {/* Product Info */}
        <div className="space-y-1 mb-3">
          <p className="text-[10px] font-mono text-stone-400 tracking-wider">SKU: {product.SKU}</p>
          <h3 className="text-xs font-bold text-stone-900 line-clamp-2 leading-snug" title={product.name}>
            {product.name}
          </h3>
          {product.description && (
            <p className="text-[11px] text-stone-500 line-clamp-1">{product.description}</p>
          )}
        </div>

        {/* Bottom Price & Add/Stepper Button */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-400 block font-medium">Price</span>
            <span className="text-sm font-black text-stone-950">₹{product.price.toFixed(2)}</span>
          </div>

          {/* Stepper or + ADD button */}
          {available <= 0 ? (
            <button
              disabled
              className="px-3 py-1.5 bg-stone-100 text-stone-400 text-xs font-bold rounded-xl cursor-not-allowed"
            >
              Out of Stock
            </button>
          ) : currentQty === 0 ? (
            <button
              onClick={() => addToCart(product)}
              className="px-4 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-xl text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center space-x-1"
            >
              <AddIcon className="!w-3.5 !h-3.5" />
              <span>ADD</span>
            </button>
          ) : (
            <div className="flex items-center bg-stone-950 text-white rounded-xl shadow-xs overflow-hidden">
              <button
                onClick={() => updateCartQty(product._id, currentQty - 1)}
                className="w-7 h-7 flex items-center justify-center hover:bg-stone-800 text-yellow-400 font-bold cursor-pointer"
                title="Decrease"
              >
                <RemoveIcon className="!w-3.5 !h-3.5" />
              </button>
              <span className="w-6 text-center text-xs font-black text-white select-none">
                {currentQty}
              </span>
              <button
                disabled={currentQty >= available}
                onClick={() => updateCartQty(product._id, currentQty + 1)}
                className="w-7 h-7 flex items-center justify-center hover:bg-stone-800 text-yellow-400 font-bold cursor-pointer disabled:opacity-30"
                title="Increase"
              >
                <AddIcon className="!w-3.5 !h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: INTERNAL STAFF ERP MANAGEMENT TABLE VIEW
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventory Catalog & Stock Ledger</h1>
          <p className="text-gray-500 text-sm">
            Monitor on-hand physical stock, atomic reservations, price lists, and reorder alerts
          </p>
        </div>
        {canAddProduct && (
          <button
            onClick={handleAddOpen}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer flex items-center space-x-1"
          >
            <span>+ Add Product</span>
          </button>
        )}
      </div>

      {/* Filter, Search, and Category Ribbon */}
      <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="!w-5 !h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Product Name, SKU, or Category..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="updatedAt_desc">⚡ Recently Restocked / Updated (Default)</option>
              <option value="name">Product Name (A-Z)</option>
              <option value="stock_low">Low Stock First (Action Needed)</option>
              <option value="stock_high">High Stock First</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="price_asc">Price: Low to High</option>
            </select>

            {/* Limit Selector */}
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page (Show All)</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>

            {(search || selectedCategory !== 'All') && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                  setPage(1);
                }}
                className="px-3 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 pb-1">
          <button
            onClick={() => { setSelectedCategory('All'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-amber-400 text-stone-950 shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Categories ({totalProducts})
          </button>
          {categories.map((cat) => {
            const meta = getCategoryMeta(cat);
            return (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                  selectedCategory === cat
                    ? 'bg-amber-400 text-stone-950 shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span>{meta.emoji}</span>
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-gray-100 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                <th className="p-4">SKU</th>
                <th className="p-4">Product Name</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Price</th>
                <th className="p-4 text-center">Available to Order</th>
                {canViewInventory && <th className="p-4 text-center">On-Hand Physical</th>}
                {canViewInventory && <th className="p-4 text-center">Reserved</th>}
                {canViewInventory && <th className="p-4 text-center">Reorder Min</th>}
                <th className="p-4 text-center">Status</th>
                {(canEditProductCatalog || canEditInventory) && <th className="p-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={canViewInventory ? 10 : 7} className="p-8 text-center text-gray-400">
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={canViewInventory ? 10 : 7} className="p-8 text-center text-gray-400">
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const onHand = typeof product.onHand === 'number' ? product.onHand : (product.stock || 0);
                  const reserved = typeof product.reserved === 'number' ? product.reserved : 0;
                  const available = typeof product.available === 'number' ? product.available : Math.max(0, onHand - reserved);
                  const isLowStock = available <= product.reorderLevel;
                  const meta = getCategoryMeta(product.category);

                  return (
                    <tr key={product._id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="p-4 font-mono font-bold text-gray-900 text-xs">{product.SKU}</td>
                      <td className="p-4 font-semibold text-stone-900">
                        {product.name}
                        {product.description && (
                          <span className="block text-xs font-normal text-stone-400 line-clamp-1">
                            {product.description}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${meta.bg} ${meta.text} border ${meta.border}`}>
                          {meta.emoji} {product.category}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-stone-950">${product.price.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-black ${
                            available <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {available} units
                        </span>
                      </td>
                      {canViewInventory && (
                        <td className="p-4 text-center font-bold text-gray-800">{onHand}</td>
                      )}
                      {canViewInventory && (
                        <td className="p-4 text-center">
                          <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs">
                            {reserved}
                          </span>
                        </td>
                      )}
                      {canViewInventory && (
                        <td className="p-4 text-center text-gray-500 text-xs">{product.reorderLevel}</td>
                      )}
                      <td className="p-4 text-center">
                        {isLowStock ? (
                          <span className="inline-flex items-center space-x-1 text-xs text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                            <WarningAmberIcon className="!w-4 !h-4 text-rose-600" />
                            <span>Low Stock</span>
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            Optimal
                          </span>
                        )}
                      </td>
                      {(canEditProductCatalog || canEditInventory) && (
                        <td className="p-4 flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEditOpen(product)}
                            className="p-1.5 hover:bg-amber-50 text-amber-600 rounded transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <EditIcon className="!w-5 !h-5" />
                          </button>
                          {canDeleteProduct && (
                            <button
                              onClick={() => handleDelete(product._id)}
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors cursor-pointer"
                              title="Delete Product"
                            >
                              <DeleteIcon className="!w-5 !h-5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Panel */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages} ({totalProducts} total products)
          </span>
          <div className="flex space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50 cursor-pointer disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50 cursor-pointer disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Product Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">
                {isEditMode ? 'Edit Product Details' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Product Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    disabled={!canEditProductCatalog}
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="E.g., Steel Sheet"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-500">SKU Code</label>
                    {!isEditMode && canEditProductCatalog && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, SKU: generateUniqueSKU(prev.category) }))}
                        className="text-[10px] text-amber-700 hover:text-amber-900 font-bold flex items-center space-x-1 cursor-pointer"
                        title="Auto-generate a new unique SKU code"
                      >
                        <span>🔄 Auto-Generate</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    name="SKU"
                    required
                    disabled={isEditMode || !canEditProductCatalog}
                    value={formData.SKU}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="E.g., GROC-8492"
                  />
                  {!isEditMode && (
                    <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                      ✓ Auto-generated uniquely based on category
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Predefined ERP Category</label>
                  <select
                    name="category"
                    required
                    disabled={!canEditProductCatalog}
                    value={formData.category}
                    onChange={handleCategoryChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-gray-50 disabled:text-gray-500 cursor-pointer"
                  >
                    <option value="" disabled>Select an ERP Category</option>
                    {CATEGORY_DEFINITIONS.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.emoji} {cat.label} ({cat.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Price ($)</label>
                  <input
                    type="number"
                    name="price"
                    required
                    min="0"
                    step="0.01"
                    disabled={!canEditProductCatalog}
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Stock</label>
                  <input
                    type="number"
                    name="stock"
                    required
                    disabled={(!isEditMode && !canEditProductCatalog) || (isEditMode && !canEditInventory)}
                    value={formData.stock}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Reorder Level Threshold</label>
                  <input
                    type="number"
                    name="reorderLevel"
                    required
                    disabled={!canEditInventory}
                    value={formData.reorderLevel}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Description (Optional)</label>
                <textarea
                  name="description"
                  disabled={!canEditProductCatalog}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 h-20 resize-none disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Product specs, size, or supplier notes..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/10 transition-all cursor-pointer"
                >
                  {isEditMode ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
