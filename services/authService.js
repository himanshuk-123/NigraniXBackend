const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/authRepository');

/**
 * Service Layer - Business Logic
 * Handles authentication business logic, validation, and token management
 */
class AuthService {
    /**
     * Validate phone number format (10-15 digits)
     * @param {string} phoneNumber - Phone number to validate
     * @returns {boolean} True if valid
     */
    validatePhoneNumber(phoneNumber) {
        const phoneRegex = /^[0-9]{10,15}$/;
        return phoneRegex.test(phoneNumber);
    }

    /**
     * Validate user role
     * @param {string} role - Role to validate
     * @returns {boolean} True if valid
     */
    validateRole(role) {
        const validRoles = ['CITIZEN', 'STAFF', 'ADMIN'];
        return validRoles.includes(role.toUpperCase());
    }

    /**
     * Hash password using bcrypt
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    /**
     * Compare password with hash
     * @param {string} password - Plain text password
     * @param {string} passwordHash - Hashed password
     * @returns {Promise<boolean>} True if password matches
     */
    async comparePassword(password, passwordHash) {
        return await bcrypt.compare(password, passwordHash);
    }

    /**
     * Generate JWT token
     * @param {Object} user - User object
     * @returns {string} JWT token
     */
    generateToken(user) {
        const payload = {
            userId: user.UserId,
            phoneNumber: user.phone_number,
            role: user.Role
        };

        return jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
    }

    /**
     * Verify JWT token
     * @param {string} token - JWT token
     * @returns {Object} Decoded token payload
     * @throws {Error} If token is invalid
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    /**
     * Format user response (remove sensitive data)
     * @param {Object} user - User object from database
     * @returns {Object} Formatted user object
     */
    formatUserResponse(user) {
        return {
            userId: user.UserId,
            fullName: user.FullName,
            phoneNumber: user.phone_number,
            email: user.Email,
            role: user.Role,
            departmentId: user.DepartmentId,
            departmentName: user.DepartmentName || null,
            departmentLocation: user.Latitude && user.Longitude ? {
                latitude: user.Latitude,
                longitude: user.Longitude
            } : null,
            createdAt: user.CreatedAt
        };
    }

    /**
     * Register new user
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} Token and user data
     * @throws {Error} If validation fails or user exists
     */
    async register(userData) {
        const { fullName, phoneNumber, password, email, role, departmentId } = userData;

        // Validation
        if (!fullName || !phoneNumber || !password || !role) {
            throw new Error('Full name, phone number, password, and role are required');
        }

        if (!this.validatePhoneNumber(phoneNumber)) {
            throw new Error('Invalid phone number format. Use 10-15 digits without spaces or special characters');
        }

        if (!this.validateRole(role)) {
            throw new Error('Invalid role. Must be CITIZEN, STAFF, or ADMIN');
        }

        // Validate password strength
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        // Check if phone number already exists
        const exists = await authRepository.phoneNumberExists(phoneNumber);
        if (exists) {
            throw new Error('Phone number already registered');
        }

        // Hash password
        const passwordHash = await this.hashPassword(password);

        // Create user
        const newUser = await authRepository.createUser({
            fullName,
            phoneNumber,
            passwordHash,
            email,
            role,
            departmentId
        });

        // Generate token
        const token = this.generateToken(newUser);

        return {
            token,
            user: this.formatUserResponse(newUser)
        };
    }

    /**
     * Login user
     * @param {string} phoneNumber - User's phone number
     * @param {string} password - User's password
     * @returns {Promise<Object>} Token and user data
     * @throws {Error} If credentials are invalid
     */
    async login(phoneNumber, password) {
        // Validation
        if (!phoneNumber || !password) {
            throw new Error('Phone number and password are required');
        }

        // Find user
        const user = await authRepository.findUserByPhoneNumber(phoneNumber);
        if (!user) {
            throw new Error('Invalid phone number or password');
        }

        // Verify password
        const isPasswordValid = await this.comparePassword(password, user.PasswordHash);
        if (!isPasswordValid) {
            throw new Error('Invalid phone number or password');
        }

        // Generate token
        const token = this.generateToken(user);

        return {
            token,
            user: this.formatUserResponse(user)
        };
    }

    /**
     * Verify user token and get user data
     * @param {number} userId - User ID from token
     * @returns {Promise<Object>} User data
     * @throws {Error} If user not found
     */
    async verifyUser(userId) {
        const user = await authRepository.findUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        return this.formatUserResponse(user);
    }

    /**
     * Get user profile with department info
     * @param {number} userId - User ID
     * @returns {Promise<Object>} User profile
     * @throws {Error} If user not found
     */
    async getProfile(userId) {
        const user = await authRepository.getUserProfile(userId);
        if (!user) {
            throw new Error('User not found');
        }

        return this.formatUserResponse(user);
    }
}

module.exports = new AuthService();
