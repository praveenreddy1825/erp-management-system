import express from 'express';
import {
  getCart,
  addItemToCart,
  updateCartItemQty,
  removeCartItem,
  clearCart,
} from '../controllers/cartController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All cart endpoints require authentication and Customer/Staff role
router.use(protect, authorizeRoles('Customer', 'Admin', 'Sales_Manager'));

router.route('/')
  .get(getCart)
  .delete(clearCart);

router.route('/items')
  .post(addItemToCart);

router.route('/items/:productId')
  .put(updateCartItemQty)
  .delete(removeCartItem);

export default router;
