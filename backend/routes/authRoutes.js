import express from 'express';
import { registerUser, loginUser, getUsers } from '../controllers/authController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route: Register a new user
// POST /api/auth/register
router.post('/register', registerUser);

// Route: User Login
// POST /api/auth/login
router.post('/login', loginUser);

// Route: Get current user profile (example of a protected route)
// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  // req.user is attached by the 'protect' middleware
  res.status(200).json(req.user);
});

// Route: Get all users (Admin only)
// GET /api/auth/users
router.get('/users', protect, authorizeRoles('Admin'), getUsers);

export default router;
