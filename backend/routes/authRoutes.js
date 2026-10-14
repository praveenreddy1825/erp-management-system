import express from 'express';
import {
  registerUser,
  loginUser,
  getUsers,
  createInternalUser,
  createSupplierAccount,
  changePassword,
} from '../controllers/authController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

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
