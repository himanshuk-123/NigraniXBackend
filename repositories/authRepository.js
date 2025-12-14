const { sql, getPool } = require('../db');

/**
 * Repository Layer - Database Operations
 * Handles all direct database queries for authentication
 */
class AuthRepository {
    /**
     * Find user by phone number
     * @param {string} phoneNumber - User's phone number
     * @returns {Promise<Object|null>} User object or null
     */
    async findUserByPhoneNumber(phoneNumber) {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('phoneNumber', sql.NVarChar, phoneNumber)
                .query(`
                    SELECT UserId, FullName, phone_number, PasswordHash, Email, Role, DepartmentId, CreatedAt 
                    FROM Users 
                    WHERE phone_number = @phoneNumber
                `);
            
            return result.recordset.length > 0 ? result.recordset[0] : null;
        } catch (error) {
            throw new Error(`Database error in findUserByPhoneNumber: ${error.message}`);
        }
    }

    /**
     * Find user by ID
     * @param {number} userId - User's ID
     * @returns {Promise<Object|null>} User object or null
     */
    async findUserById(userId) {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT UserId, FullName, phone_number, Email, Role, DepartmentId, CreatedAt 
                    FROM Users 
                    WHERE UserId = @userId
                `);
            
            return result.recordset.length > 0 ? result.recordset[0] : null;
        } catch (error) {
            throw new Error(`Database error in findUserById: ${error.message}`);
        }
    }

    /**
     * Get user profile with department information
     * @param {number} userId - User's ID
     * @returns {Promise<Object|null>} User profile with department or null
     */
    async getUserProfile(userId) {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT u.UserId, u.FullName, u.phone_number, u.Email, u.Role, u.DepartmentId, u.CreatedAt,
                           d.DepartmentName, d.Latitude, d.Longitude
                    FROM Users u
                    LEFT JOIN Departments d ON u.DepartmentId = d.DepartmentId
                    WHERE u.UserId = @userId
                `);
            
            return result.recordset.length > 0 ? result.recordset[0] : null;
        } catch (error) {
            throw new Error(`Database error in getUserProfile: ${error.message}`);
        }
    }

    /**
     * Create new user
     * @param {Object} userData - User data object
     * @returns {Promise<Object>} Created user object
     */
    async createUser(userData) {
        try {
            const { fullName, phoneNumber, passwordHash, email, role, departmentId } = userData;
            
            const pool = await getPool();
            const result = await pool.request()
                .input('fullName', sql.NVarChar, fullName)
                .input('phoneNumber', sql.NVarChar, phoneNumber)
                .input('passwordHash', sql.NVarChar, passwordHash)
                .input('email', sql.NVarChar, email || null)
                .input('role', sql.NVarChar, role.toUpperCase())
                .input('departmentId', sql.Int, departmentId || null)
                .query(`
                    INSERT INTO Users (FullName, phone_number, PasswordHash, Email, Role, DepartmentId)
                    OUTPUT INSERTED.UserId, INSERTED.FullName, INSERTED.phone_number, INSERTED.Email, 
                           INSERTED.Role, INSERTED.DepartmentId, INSERTED.CreatedAt
                    VALUES (@fullName, @phoneNumber, @passwordHash, @email, @role, @departmentId)
                `);
            
            return result.recordset[0];
        } catch (error) {
            // Check for duplicate phone number constraint
            if (error.message.includes('duplicate') || error.message.includes('UNIQUE')) {
                throw new Error('Phone number already registered');
            }
            throw new Error(`Database error in createUser: ${error.message}`);
        }
    }

    /**
     * Check if phone number exists
     * @param {string} phoneNumber - Phone number to check
     * @returns {Promise<boolean>} True if exists, false otherwise
     */
    async phoneNumberExists(phoneNumber) {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('phoneNumber', sql.NVarChar, phoneNumber)
                .query('SELECT UserId FROM Users WHERE phone_number = @phoneNumber');
            
            return result.recordset.length > 0;
        } catch (error) {
            throw new Error(`Database error in phoneNumberExists: ${error.message}`);
        }
    }
}

module.exports = new AuthRepository();
