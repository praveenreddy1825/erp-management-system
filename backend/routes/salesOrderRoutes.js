import express from 'express';
import {
  createSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  updateSalesOrderStatus,
  cancelSalesOrder,
} from '../controllers/salesOrderController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, authorizeRoles('Admin', 'Sales_Manager', 'Customer'), createSalesOrder);
router.get('/', protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Customer', 'Inventory_Manager'), getSalesOrders);
router.get('/:id', protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Customer', 'Inventory_Manager'), getSalesOrderById);
router.put('/:id/status', protect, authorizeRoles('Admin', 'Sales_Manager'), updateSalesOrderStatus);
router.put('/:id/cancel', protect, authorizeRoles('Admin', 'Sales_Manager', 'Customer'), cancelSalesOrder);

export default router;