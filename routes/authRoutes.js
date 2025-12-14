const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authorize } = require('../middleware/auth');

/**
 * Router Layer - Route Definitions
 * Defines all authentication-related routes
 */

// ==================== PUBLIC ROUTES ====================

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 * @body    { fullName, phoneNumber, password, email?, role, departmentId? }
 */
router.post('/signup', authController.signup.bind(authController));

/**
 * @route   POST /api/auth/login
 * @desc    Login user with phone number and password
 * @access  Public
 * @body    { phoneNumber, password }
 */
router.post('/login', authController.login.bind(authController));

// ==================== PROTECTED ROUTES ====================

/**
 * @route   GET /api/auth/verify
 * @desc    Verify if token is valid and get user data
 * @access  Private (requires authentication)
 * @header  Authorization: Bearer <token>
 */
router.get('/verify', authenticateToken, authController.verifyToken.bind(authController));

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user's profile with department info
 * @access  Private (requires authentication)
 * @header  Authorization: Bearer <token>
 */
router.get('/profile', authenticateToken, authController.getProfile.bind(authController));

// ==================== ROLE-BASED PROTECTED ROUTES EXAMPLES ====================
// Uncomment and use these patterns for role-specific routes

/*
router.get('/admin-dashboard', 
    authenticateToken, 
    authorize('ADMIN'), 
    (req, res) => {
        res.json({ message: 'Admin dashboard data' });
    }
);

router.get('/staff-tasks', 
    authenticateToken, 
    authorize('STAFF', 'ADMIN'), 
    (req, res) => {
        res.json({ message: 'Staff tasks data' });
    }
);
*/

module.exports = router;
