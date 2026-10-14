import express from 'express';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrderStatus,
  recordPurchaseOrderPayment,
} from '../controllers/purchaseOrderController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router
  .route('/')
  .post(protect, authorizeRoles('Admin', 'Purchase_Manager'), createPurchaseOrder)
  .get(protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager'), getPurchaseOrders);

router
  .route('/:id')
  .get(protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager'), getPurchaseOrderById);

router
  .route('/:id/status')
  .put(protect, authorizeRoles('Admin', 'Purchase_Manager'), updatePurchaseOrderStatus);

router
  .route('/:id/payments')
  .post(protect, authorizeRoles('Admin', 'Purchase_Manager'), recordPurchaseOrderPayment);

export default router;
