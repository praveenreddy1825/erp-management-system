import express from 'express';
import {
  registerUser,
  loginUser,
  getUsers,
  createInternalUser,
  createSupplierAccount,
  changePassword,
  getSalesContact,
  getSupportContact,
  getUserProfile,
  updateUserProfile,
} from '../controllers/authController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route: Get role-specific support contact details (Customer->SalesManager, Supplier->PurchaseManager, Managers->Admin, Admin->hidden)
// GET /api/auth/support-contact
router.get('/support-contact', protect, getSupportContact);

// Legacy route maintained for backward compatibility
router.get('/sales-contact', protect, getSalesContact);

// Route: Manage current user comprehensive profile (All authenticated roles)
// GET /api/auth/profile, PUT /api/auth/profile
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);


// Route: Register a new user (Customers only)
// POST /api/auth/register
router.post('/register', registerUser);

// Route: User Login
// POST /api/auth/login
router.post('/login', loginUser);

// Route: Get current user profile
// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.status(200).json(req.user);
});

// Route: Change password (any authenticated user)
// PUT /api/auth/change-password
router.put('/change-password', protect, changePassword);

// Route: Get all users (Admin only)
// GET /api/auth/users
router.get('/users', protect, authorizeRoles('Admin'), getUsers);

// Route: Admin provisions internal manager/staff account
// POST /api/auth/users
router.post('/users', protect, authorizeRoles('Admin'), createInternalUser);

// Route: Admin provisions linked supplier portal account
// POST /api/auth/supplier-account
router.post('/supplier-account', protect, authorizeRoles('Admin'), createSupplierAccount);

export default router;
