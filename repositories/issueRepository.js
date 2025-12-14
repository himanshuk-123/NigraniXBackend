const { sql, getPool } = require('../db');

/**
 * Repository Layer - Issue Operations
 * Handles all direct database queries for issues
 */
class IssueRepository {
    /**
     * Create new issue
     * @param {Object} issueData - Issue data object
     * @returns {Promise<Object>} Created issue with ID
     */
    async createIssue(issueData) {
        try {
            const { 
                citizenId, 
                departmentId, 
                issueType, 
                description, 
                latitude, 
                longitude, 
                address 
            } = issueData;

            const pool = await getPool();
            const result = await pool.request()
                .input('citizenId', sql.Int, citizenId)
                .input('departmentId', sql.Int, departmentId)
                .input('issueType', sql.NVarChar, issueType || null)
                .input('description', sql.NVarChar, description)
                .input('latitude', sql.Float, latitude)
                .input('longitude', sql.Float, longitude)
                .input('address', sql.NVarChar, address || null)
                .query(`
                    INSERT INTO Issues (CitizenId, DepartmentId, IssueType, Description, Latitude, Longitude, Address, Status)
                    OUTPUT INSERTED.IssueId, INSERTED.CitizenId, INSERTED.DepartmentId, INSERTED.IssueType, 
                           INSERTED.Description, INSERTED.Latitude, INSERTED.Longitude, INSERTED.Address, 
                           INSERTED.Status, INSERTED.CreatedAt
                    VALUES (@citizenId, @departmentId, @issueType, @description, @latitude, @longitude, @address, 'REPORTED')
                `);

            const issue = result.recordset[0];

            // Fetch department name
            const deptResult = await pool.request()
                .input('departmentId', sql.Int, issue.DepartmentId)
                .query(`SELECT DepartmentName FROM Departments WHERE DepartmentId = @departmentId`);
            
            if (deptResult.recordset.length > 0) {
                issue.DepartmentName = deptResult.recordset[0].DepartmentName;
            }

            return issue;
        } catch (error) {
            throw new Error(`Database error in createIssue: ${error.message}`);
        }
    }

    /**
     * Add image to issue
     * @param {string} issueId - Issue ID (GUID)
     * @param {string} imageUrl - URL or path to image
     * @param {string} imageType - BEFORE or AFTER
     * @returns {Promise<Object>} Created image record
     */
    async addIssueImage(issueId, imageUrl, imageType = 'BEFORE') {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('issueId', sql.UniqueIdentifier, issueId)
                .input('imageUrl', sql.NVarChar, imageUrl)
                .input('imageType', sql.NVarChar, imageType)
                .query(`
                    INSERT INTO Issue_Images (IssueId, ImageUrl, ImageType)
                    OUTPUT INSERTED.ImageId, INSERTED.IssueId, INSERTED.ImageUrl, INSERTED.ImageType, INSERTED.UploadedAt
                    VALUES (@issueId, @imageUrl, @imageType)
                `);

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Database error in addIssueImage: ${error.message}`);
        }
    }

    /**
     * Record staff attendance for an issue
     * @param {Object} data - { issueId, staffId, staffLat, staffLon, distance }
     * @returns {Promise<Object>} Created attendance record
     */
    async addIssueAttendance({ issueId, staffId, staffLat, staffLon, distance }) {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('issueId', sql.UniqueIdentifier, issueId)
                .input('staffId', sql.Int, staffId)
                .input('staffLat', sql.Float, staffLat)
                .input('staffLon', sql.Float, staffLon)
                .input('distance', sql.Float, distance || null)
                .query(`
                    INSERT INTO Issue_Attendance (IssueId, StaffId, StaffLatitude, StaffLongitude, DistanceFromIssue)
                    OUTPUT INSERTED.AttendanceId, INSERTED.IssueId, INSERTED.StaffId, INSERTED.StaffLatitude, INSERTED.StaffLongitude, INSERTED.DistanceFromIssue, INSERTED.AttendanceTime
                    VALUES (@issueId, @staffId, @staffLat, @staffLon, @distance)
                `);

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Database error in addIssueAttendance: ${error.message}`);
        }
    }

    /**
     * Get issue by ID with images
     * @param {string} issueId - Issue ID (GUID)
     * @returns {Promise<Object|null>} Issue with images or null
     */
    async getIssueById(issueId) {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('issueId', sql.UniqueIdentifier, issueId)
                .query(`
                    SELECT 
                        i.IssueId, i.CitizenId, i.DepartmentId, i.IssueType, i.Description, 
                        i.Latitude, i.Longitude, i.Address, i.Status, i.CreatedAt,
                        d.DepartmentName,
                        u.FullName as CitizenName, u.phone_number as CitizenPhone
                    FROM Issues i
                    LEFT JOIN Departments d ON i.DepartmentId = d.DepartmentId
                    LEFT JOIN Users u ON i.CitizenId = u.UserId
                    WHERE i.IssueId = @issueId
                `);

            if (result.recordset.length === 0) return null;

            const issue = result.recordset[0];

            // Get images
            const imagesResult = await pool.request()
                .input('issueId', sql.UniqueIdentifier, issueId)
                .query(`
                    SELECT ImageId, ImageUrl, ImageType, UploadedAt
                    FROM Issue_Images
                    WHERE IssueId = @issueId
                    ORDER BY UploadedAt DESC
                `);

            issue.images = imagesResult.recordset;
            return issue;
        } catch (error) {
            throw new Error(`Database error in getIssueById: ${error.message}`);
        }
    }

    /**
     * Get all issues by citizen
     * @param {number} citizenId - Citizen ID
     * @returns {Promise<Array>} Array of issues
     */
    async getIssuesByCitizen(citizenId) {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('citizenId', sql.Int, citizenId)
                .query(`
                    SELECT 
                        i.IssueId, i.CitizenId, i.DepartmentId, i.IssueType, i.Description, 
                        i.Latitude, i.Longitude, i.Address, i.Status, i.CreatedAt,
                        d.DepartmentName,
                        (SELECT COUNT(*) FROM Issue_Images WHERE IssueId = i.IssueId) as ImageCount
                    FROM Issues i
                    LEFT JOIN Departments d ON i.DepartmentId = d.DepartmentId
                    WHERE i.CitizenId = @citizenId
                    ORDER BY i.CreatedAt DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Database error in getIssuesByCitizen: ${error.message}`);
        }
    }

    /**
     * Get all issues (with pagination)
     * @param {number} limit - Number of issues per page
     * @param {number} offset - Pagination offset
     * @returns {Promise<Array>} Array of issues
     */
    async getAllIssues(limit = 20, offset = 0) {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('limit', sql.Int, limit)
                .input('offset', sql.Int, offset)
                .query(`
                    SELECT 
                        i.IssueId, i.CitizenId, i.DepartmentId, i.IssueType, i.Description, 
                        i.Latitude, i.Longitude, i.Address, i.Status, i.CreatedAt,
                        d.DepartmentName,
                        u.FullName as CitizenName,
                        (SELECT COUNT(*) FROM Issue_Images WHERE IssueId = i.IssueId) as ImageCount
                    FROM Issues i
                    LEFT JOIN Departments d ON i.DepartmentId = d.DepartmentId
                    LEFT JOIN Users u ON i.CitizenId = u.UserId
                    ORDER BY i.CreatedAt DESC
                    OFFSET @offset ROWS
                    FETCH NEXT @limit ROWS ONLY
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Database error in getAllIssues: ${error.message}`);
        }
    }

    /**
     * Get issues by department
     * @param {number} departmentId - Department ID
     * @returns {Promise<Array>} Array of issues
     */
    async getIssuesByDepartment(departmentId) {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('departmentId', sql.Int, departmentId)
                .query(`
                    SELECT 
                        i.IssueId, i.CitizenId, i.DepartmentId, i.IssueType, i.Description, 
                        i.Latitude, i.Longitude, i.Address, i.Status, i.CreatedAt,
                        d.DepartmentName,
                        u.FullName as CitizenName,
                        (SELECT COUNT(*) FROM Issue_Images WHERE IssueId = i.IssueId) as ImageCount
                    FROM Issues i
                    LEFT JOIN Departments d ON i.DepartmentId = d.DepartmentId
                    LEFT JOIN Users u ON i.CitizenId = u.UserId
                    WHERE i.DepartmentId = @departmentId
                    ORDER BY i.CreatedAt DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Database error in getIssuesByDepartment: ${error.message}`);
        }
    }

    /**
     * Update issue status
     * @param {string} issueId - Issue ID
     * @param {string} status - New status (REPORTED, ASSIGNED, IN_PROGRESS, RESOLVED)
     * @returns {Promise<Object>} Updated issue
     */
    async updateIssueStatus(issueId, status) {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('issueId', sql.UniqueIdentifier, issueId)
                .input('status', sql.NVarChar, status)
                .query(`
                    UPDATE Issues
                    SET Status = @status
                    OUTPUT INSERTED.IssueId, INSERTED.Status, INSERTED.CreatedAt
                    WHERE IssueId = @issueId
                `);

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Database error in updateIssueStatus: ${error.message}`);
        }
    }

    /**
     * Get issue images
     * @param {string} issueId - Issue ID
     * @returns {Promise<Array>} Array of images
     */
    async getIssueImages(issueId) {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('issueId', sql.UniqueIdentifier, issueId)
                .query(`
                    SELECT ImageId, ImageUrl, ImageType, UploadedAt
                    FROM Issue_Images
                    WHERE IssueId = @issueId
                    ORDER BY UploadedAt DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Database error in getIssueImages: ${error.message}`);
        }
    }

    /**
     * Get dashboard statistics
     * @returns {Promise<Object>} Stats object with total, resolved, inProgress counts
     */
    async getIssueStats() {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .query(`
                    SELECT 
                        COUNT(*) as TotalIssues,
                        SUM(CASE WHEN Status = 'RESOLVED' THEN 1 ELSE 0 END) as ResolvedIssues,
                        SUM(CASE WHEN Status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as InProgressIssues
                    FROM Issues
                `);

            return result.recordset[0];
        } catch (error) {
            throw new Error(`Database error in getIssueStats: ${error.message}`);
        }
    }

    /**
     * Get recent issues for activity feed
     * @param {number} limit - Number of recent issues to fetch
     * @returns {Promise<Array>} Array of recent issues
     */
    async getRecentIssues(limit = 10) {
        try {
            const pool = await getPool();
            const result = await pool.request()
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit)
                        i.IssueId, i.IssueType, i.Address, i.Status, i.CreatedAt,
                        d.DepartmentName
                    FROM Issues i
                    LEFT JOIN Departments d ON i.DepartmentId = d.DepartmentId
                    ORDER BY i.CreatedAt DESC
                `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Database error in getRecentIssues: ${error.message}`);
        }
    }

    /**
     * Get tasks for staff member (issues in their department)
     * @param {number} staffDepartmentId - Department ID of the staff member
     * @param {number} staffLat - Staff member's current latitude (optional for distance calculation)
     * @param {number} staffLon - Staff member's current longitude (optional for distance calculation)
     * @returns {Promise<Array>} Array of tasks with distance calculated
     */
    async getStaffTasks(staffDepartmentId, staffLat = null, staffLon = null) {
        try {
            const pool = await getPool();
            const request = pool.request()
                .input('departmentId', sql.Int, staffDepartmentId);

            // If staff location provided, calculate distance using Haversine formula
            let distanceCalc = 'NULL';
            if (staffLat !== null && staffLon !== null) {
                request.input('staffLat', sql.Float, staffLat);
                request.input('staffLon', sql.Float, staffLon);
                // Distance in km using Haversine formula
                distanceCalc = `
                    (6371 * ACOS(
                        COS(RADIANS(@staffLat)) 
                        * COS(RADIANS(i.Latitude)) 
                        * COS(RADIANS(i.Longitude) - RADIANS(@staffLon)) 
                        + SIN(RADIANS(@staffLat)) 
                        * SIN(RADIANS(i.Latitude))
                    ))
                `;
            }

            const result = await request.query(`
                SELECT 
                    i.IssueId, 
                    i.IssueType, 
                    i.Description,
                    i.Address, 
                    i.Status, 
                    i.Latitude,
                    i.Longitude,
                    i.CreatedAt,
                    d.DepartmentName,
                    u.FullName as CitizenName,
                    u.phone_number as CitizenPhone,
                    ${distanceCalc} as Distance,
                    (SELECT COUNT(*) FROM Issue_Images WHERE IssueId = i.IssueId AND ImageType = 'BEFORE') as ImageCount
                FROM Issues i
                LEFT JOIN Departments d ON i.DepartmentId = d.DepartmentId
                LEFT JOIN Users u ON i.CitizenId = u.UserId
                WHERE i.DepartmentId = @departmentId
                ORDER BY 
                    CASE i.Status
                        WHEN 'ASSIGNED' THEN 1
                        WHEN 'IN_PROGRESS' THEN 2
                        WHEN 'REPORTED' THEN 3
                        WHEN 'RESOLVED' THEN 4
                    END,
                    i.CreatedAt DESC
            `);

            return result.recordset;
        } catch (error) {
            throw new Error(`Database error in getStaffTasks: ${error.message}`);
        }
    }
}

module.exports = new IssueRepository();
