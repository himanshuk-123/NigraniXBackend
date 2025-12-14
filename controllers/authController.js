const authService = require('../services/authService');

/**
 * Controller Layer - Request/Response Handling
 * Handles HTTP requests and responses for authentication endpoints
 */
class AuthController {
    /**
     * Signup controller
     * POST /api/auth/signup
     */
    async signup(req, res) {
        try {
            const { fullName, phoneNumber, password, email, role, departmentId } = req.body;

            const result = await authService.register({
                fullName,
                phoneNumber,
                password,
                email,
                role,
                departmentId
            });

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                token: result.token,
                user: result.user
            });

        } catch (error) {
            console.error('Signup error:', error.message);

            // Handle specific error types
            if (error.message.includes('already registered')) {
                return res.status(409).json({ 
                    success: false,
                    error: error.message 
                });
            }

            if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('must be')) {
                return res.status(400).json({ 
                    success: false,
                    error: error.message 
                });
            }

            res.status(500).json({ 
                success: false,
                error: 'Internal server error' 
            });
        }
    }

    /**
     * Login controller
     * POST /api/auth/login
     */
    async login(req, res) {
        try {
            const { phoneNumber, password } = req.body;

            const result = await authService.login(phoneNumber, password);

            res.status(200).json({
                success: true,
                message: 'Login successful',
                token: result.token,
                user: result.user
            });

        } catch (error) {
            console.error('Login error:', error.message);

            if (error.message.includes('Invalid phone number or password')) {
                return res.status(401).json({ 
                    success: false,
                    error: error.message 
                });
            }

            if (error.message.includes('required')) {
                return res.status(400).json({ 
                    success: false,
                    error: error.message 
                });
            }

            res.status(500).json({ 
                success: false,
                error: 'Internal server error' 
            });
        }
    }

    /**
     * Verify token controller
     * GET /api/auth/verify
     */
    async verifyToken(req, res) {
        try {
            const user = await authService.verifyUser(req.user.userId);

            res.status(200).json({
                success: true,
                valid: true,
                user: user
            });

        } catch (error) {
            console.error('Verify token error:', error.message);

            if (error.message.includes('not found')) {
                return res.status(404).json({ 
                    success: false,
                    error: error.message 
                });
            }

            res.status(500).json({ 
                success: false,
                error: 'Internal server error' 
            });
        }
    }

    /**
     * Get profile controller
     * GET /api/auth/profile
     */
    async getProfile(req, res) {
        try {
            const user = await authService.getProfile(req.user.userId);

            res.status(200).json({
                success: true,
                user: user
            });

        } catch (error) {
            console.error('Get profile error:', error.message);

            if (error.message.includes('not found')) {
                return res.status(404).json({ 
                    success: false,
                    error: error.message 
                });
            }

            res.status(500).json({ 
                success: false,
                error: 'Internal server error' 
            });
        }
    }
}

module.exports = new AuthController();
