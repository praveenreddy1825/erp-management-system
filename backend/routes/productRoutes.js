import express from 'express';
import { 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getLowStockProducts 
} from '../controllers/productController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route for low stock alerts (Must be placed BEFORE '/:id' route so it doesn't parse 'alerts' as a product ID!)
router.get('/alerts/low-stock', protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager'), getLowStockProducts);

// GET all products, POST new product
router.route('/')
  .get(protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager', 'Customer'), getProducts)
  .post(protect, authorizeRoles('Admin'), createProduct);

// GET, PUT, DELETE single product
router.route('/:id')
  .get(protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager', 'Customer'), getProductById)
  .put(protect, authorizeRoles('Admin', 'Inventory_Manager'), updateProduct)
  .delete(protect, authorizeRoles('Admin'), deleteProduct);

export default router;
