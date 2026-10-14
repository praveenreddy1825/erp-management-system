import express from 'express';
import { getDashboardSummary } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/dashboard/summary (all authenticated roles)
router.get('/summary', protect, getDashboardSummary);

export default router;
