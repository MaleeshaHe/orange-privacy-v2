const express = require('express');
const { body, query } = require('express-validator');
const adminController = require('../controllers/admin.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// User management
router.get(
  '/users',
  [
    query('search').optional().trim(),
    query('role').optional().isIn(['user', 'admin']),
    query('isActive').optional().isBoolean(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  adminController.getUsers
);

router.get('/users/:userId', adminController.getUserDetails);

router.put(
  '/users/:userId',
  [
    body('role').optional().isIn(['user', 'admin']),
    body('isActive').optional().isBoolean()
  ],
  validate,
  adminController.updateUser
);

// Scan job management
router.get(
  '/scans',
  [
    query('status').optional().isIn(['queued', 'processing', 'completed', 'failed', 'cancelled']),
    query('userId').optional().isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  adminController.getAllScanJobs
);

// System statistics and monitoring
router.get('/stats', adminController.getSystemStats);
router.get('/logs', adminController.getSystemLogs);

module.exports = router;
