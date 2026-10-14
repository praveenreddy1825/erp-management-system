import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext.jsx';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const Products = () => {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Modal / Form States
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

  // Fetch Products from Backend API
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://127.0.0.1:9999/api/products?search=${search}&page=${page}&limit=8`
      );
      setProducts(res.data.products);
      setTotalPages(res.data.pages);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [search, page]);

  // Handle Form Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Open Modal for Add
  const handleAddOpen = () => {
    setIsEditMode(false);
    setFormData({
      name: '',
      SKU: '',
      category: '',
      price: '',
      stock: 0,
      reorderLevel: 10,
      description: '',
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
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

  // Submit Add or Edit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        // PUT request to update
        await axios.put(`http://127.0.0.1:9999/api/products/${currentProductId}`, formData);
      } else {
        // POST request to create
        await axios.post('http://127.0.0.1:9999/api/products', formData);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving product');
    }
  };

  // Delete Product Handler
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

  // Detailed permission splits
  const canAddProduct = user?.role === 'Admin';
  const canEditProductCatalog = user?.role === 'Admin';
  const canEditInventory = ['Admin', 'Inventory_Manager'].includes(user?.role);
  const canViewInventory = ['Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager'].includes(user?.role);
  const canDeleteProduct = user?.role === 'Admin';

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventory Catalog</h1>
          <p className="text-gray-500 text-sm">Manage products, pricing levels, and reorder levels</p>
        </div>
        {canAddProduct && (
          <button
            onClick={handleAddOpen}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-emerald-950 font-black rounded-lg text-sm shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
          >
            + Add Product
          </button>
        )}
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-sm flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by Name or SKU..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1); // Reset page to 1 on search
          }}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold">
                <th className="p-4">SKU</th>
                <th className="p-4">Name</th>
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
                  <td colSpan={canViewInventory ? 10 : 7} className="p-8 text-center text-gray-400">Loading inventory catalog...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={canViewInventory ? 10 : 7} className="p-8 text-center text-gray-400">No products found.</td>
                </tr>
              ) : (
                products.map((product) => {
                  const onHand = typeof product.onHand === 'number' ? product.onHand : (product.stock || 0);
                  const reserved = typeof product.reserved === 'number' ? product.reserved : 0;
                  const available = typeof product.available === 'number' ? product.available : Math.max(0, onHand - reserved);
                  const isLowStock = available <= product.reorderLevel;

                  return (
                    <tr key={product._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-mono font-semibold text-gray-900">{product.SKU}</td>
                      <td className="p-4 font-medium">{product.name}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                          {product.category}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold">${product.price.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-black ${
                          available <= 0
                            ? 'bg-rose-100 text-rose-800'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {available} units
                        </span>
                      </td>
                      {canViewInventory && (
                        <td className="p-4 text-center font-bold text-gray-800">
                          {onHand}
                        </td>
                      )}
                      {canViewInventory && (
                        <td className="p-4 text-center">
                          <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs">
                            {reserved}
                          </span>
                        </td>
                      )}
                      {canViewInventory && (
                        <td className="p-4 text-center text-gray-500 text-xs">
                          {product.reorderLevel}
                        </td>
                      )}
                      <td className="p-4 text-center">
                        {isLowStock ? (
                          <span className="inline-flex items-center space-x-1 text-xs text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                            <WarningAmberIcon className="!w-4 !h-4 text-rose-600" />
                            <span>Low Stock</span>
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Optimal</span>
                        )}
                      </td>
                      {(canEditProductCatalog || canEditInventory) && (
                        <td className="p-4 flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEditOpen(product)}
                            className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded transition-colors cursor-pointer"
                          >
                            <EditIcon className="!w-5 !h-5" />
                          </button>
                          {canDeleteProduct && (
                            <button
                              onClick={() => handleDelete(product._id)}
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors cursor-pointer"
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
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
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
                  <label className="block text-xs font-bold text-gray-500 mb-1">SKU Code</label>
                  <input
                    type="text"
                    name="SKU"
                    required
                    disabled={isEditMode || !canEditProductCatalog}
                    value={formData.SKU}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="E.g., STL-SHT-01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Category</label>
                  <input
                    type="text"
                    name="category"
                    required
                    disabled={!canEditProductCatalog}
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="E.g., Metals, Plastics"
                  />
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
