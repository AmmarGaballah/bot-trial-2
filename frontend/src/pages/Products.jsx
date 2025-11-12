import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, Upload, Edit2, Trash2, Search, 
  Filter, X, DollarSign, Check, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { useProjectStore } from '../store/projectStore';

export default function Products() {
  const queryClient = useQueryClient();
  const { currentProject } = useProjectStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', currentProject?.id],
    queryFn: async () => {
      const response = await api.get(`/api/v1/products/${currentProject.id}`);
      return response.data;
    },
    enabled: !!currentProject,
  });

  const products = productsData?.products || [];

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: (productData) => api.post(`/api/v1/products/${currentProject.id}`, productData),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('Product created successfully!');
      setShowAddModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create product');
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: ({ productId, data }) => 
      api.put(`/api/v1/products/${currentProject.id}/${productId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('Product updated successfully!');
      setEditingProduct(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update product');
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: (productId) => 
      api.delete(`/api/v1/products/${currentProject.id}/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('Product deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete product');
    },
  });

  // Bulk upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/api/v1/products/${currentProject.id}/bulk-upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['products']);
      toast.success(response.data.message);
      setShowUploadModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to upload products');
    },
  });

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Project Selected</h2>
          <p className="text-gray-400">Please select a project to manage products</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Product Catalog</h1>
          <p className="text-gray-400">Manage products for AI-powered responses</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowUploadModal(true)}
            className="glass-card px-6 py-3 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Bulk Upload CSV
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="btn-neon flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </motion.button>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4 rounded-xl mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by name, SKU, or description..."
            className="w-full bg-dark-800/50 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-400">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Products Yet</h3>
          <p className="text-gray-400 mb-6">
            {searchTerm ? 'No products match your search' : 'Add products to train your AI assistant'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-neon"
            >
              Add Your First Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => setEditingProduct(product)}
              onDelete={() => {
                if (confirm('Are you sure you want to delete this product?')) {
                  deleteMutation.mutate(product.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      <ProductModal
        show={showAddModal || editingProduct}
        product={editingProduct}
        onClose={() => {
          setShowAddModal(false);
          setEditingProduct(null);
        }}
        onSave={(data) => {
          if (editingProduct) {
            updateMutation.mutate({ productId: editingProduct.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
      />

      {/* Upload CSV Modal */}
      <UploadModal
        show={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={(file) => uploadMutation.mutate(file)}
      />
    </div>
  );
}

function ProductCard({ product, onEdit, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 rounded-xl hover:bg-white/5 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-1">{product.name}</h3>
          {product.sku && (
            <p className="text-sm text-gray-400">SKU: {product.sku}</p>
          )}
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          product.in_stock ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {product.in_stock ? 'In Stock' : 'Out of Stock'}
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-4 line-clamp-3">
        {product.description || 'No description'}
      </p>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          <span className="text-2xl font-bold">
            {product.price ? `${product.price} ${product.currency}` : 'N/A'}
          </span>
        </div>
        {product.stock_quantity !== null && (
          <span className="text-sm text-gray-400">
            Qty: {product.stock_quantity}
          </span>
        )}
      </div>

      {product.tags && product.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {product.tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs"
            >
              {tag}
            </span>
          ))}
          {product.tags.length > 3 && (
            <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-lg text-xs">
              +{product.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onEdit}
          className="flex-1 glass-card px-4 py-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onDelete}
          className="glass-card px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </motion.button>
      </div>
    </motion.div>
  );
}

function ProductModal({ show, product, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    price: '',
    currency: 'USD',
    stock_quantity: 0,
    in_stock: true,
    category: '',
    tags: '',
    keywords: '',
  });

  useState(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        sku: product.sku || '',
        price: product.price || '',
        currency: product.currency || 'USD',
        stock_quantity: product.stock_quantity || 0,
        in_stock: product.in_stock,
        category: product.category || '',
        tags: (product.tags || []).join(', '),
        keywords: (product.keywords || []).join(', '),
      });
    }
  }, [product]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      price: formData.price ? parseFloat(formData.price) : null,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
    });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 max-w-2xl w-full rounded-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="glass-card p-2 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Product Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full bg-dark-800/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Premium Widget"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full bg-dark-800/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Detailed product description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full bg-dark-800/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="PROD-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-dark-800/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Electronics"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-dark-800/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="99.99"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-dark-800/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Stock</label>
              <input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                className="w-full bg-dark-800/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="100"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.in_stock}
                onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
                className="w-5 h-5 rounded bg-dark-800"
              />
              <span className="text-sm font-medium">In Stock</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full bg-dark-800/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="premium, featured, bestseller"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Keywords for AI (comma-separated)</label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              className="w-full bg-dark-800/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="widget, gadget, device, tool"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 glass-card px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-neon"
            >
              {product ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function UploadModal({ show, onClose, onUpload }) {
  const [file, setFile] = useState(null);

  const handleUpload = () => {
    if (file) {
      onUpload(file);
      setFile(null);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 max-w-lg w-full rounded-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Bulk Upload Products</h2>
          <button onClick={onClose} className="glass-card p-2 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-400 mb-4">
            Upload a CSV file with the following columns:
          </p>
          <code className="block bg-dark-800/50 p-4 rounded-lg text-sm mb-4">
            name, description, sku, price, currency, stock_quantity, in_stock, category, tags, keywords
          </code>
          <a
            href="/sample-products.csv"
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            Download sample CSV template
          </a>
        </div>

        <div className="mb-6">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full"
          />
          {file && (
            <p className="text-sm text-green-400 mt-2">
              <Check className="w-4 h-4 inline mr-1" />
              {file.name} selected
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 glass-card px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file}
            className="flex-1 btn-neon disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload Products
          </button>
        </div>
      </motion.div>
    </div>
  );
}
