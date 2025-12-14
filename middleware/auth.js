const authService = require('../services/authService');

/**
 * Middleware - Authentication & Authorization
 * Handles token verification and role-based access control
 */

/**
 * Authentication middleware - Verify JWT token
 * Extracts and validates JWT token from Authorization header
 */
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'Access token required' 
            });
        }

        // Verify token using service
        const decoded = authService.verifyToken(token);
        req.user = decoded;
        next();

    } catch (error) {
        return res.status(403).json({ 
            success: false,
            error: 'Invalid or expired token' 
        });
    }
};

/**
 * Role-based authorization middleware
 * Restricts access based on user roles
 * @param {...string} allowedRoles - Roles that can access the route
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.get('/admin-only', authenticateToken, authorize('ADMIN'), controller.method);
 * router.get('/staff-only', authenticateToken, authorize('STAFF', 'ADMIN'), controller.method);
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                error: 'Authentication required' 
            });
        }

        const userRole = req.user.role;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ 
                success: false,
                error: 'You do not have permission to access this resource',
                required: allowedRoles,
                current: userRole
            });
        }

        next();
    };
};

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't reject request if no token
 * Useful for endpoints that work for both authenticated and guest users
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = authService.verifyToken(token);
            req.user = decoded;
        }
    } catch (error) {
        // Token invalid, but we continue anyway
        req.user = null;
    }
    next();
};

module.exports = {
    authenticateToken,
    authorize,
    optionalAuth
};
