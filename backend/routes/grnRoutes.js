import express from 'express';
import { 
  createGRN, 
  getGRNs, 
  getGRNById 
} from '../controllers/grnController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, authorizeRoles('Admin', 'Inventory_Manager'), createGRN)
  .get(protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager'), getGRNs);

router.route('/:id')
  .get(protect, authorizeRoles('Admin', 'Sales_Manager', 'Purchase_Manager', 'Inventory_Manager'), getGRNById);

export default router;
