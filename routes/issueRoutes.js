const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/fileUpload');

/**
 * Router Layer - Issue Routes
 * Defines all issue-related API endpoints
 */

// ==================== ISSUE MANAGEMENT ====================

/**
 * @route   POST /api/issues/create
 * @desc    Create a new issue (CITIZEN can report)
 * @access  Private (CITIZEN, STAFF, ADMIN)
 * @body    { description, issueType, latitude, longitude, address?, departmentId }
 */
router.post('/create', 
    authenticateToken,
    issueController.createIssue.bind(issueController)
);

/**
 * @route   POST /api/issues/:issueId/images
 * @desc    Add image to issue
 * @access  Private (requires authentication)
 * @param   issueId - Issue ID
 * @body    { imageType: 'BEFORE' | 'AFTER' } with image file
 */
router.post('/:issueId/images',
    authenticateToken,
    upload.single('image'),
    issueController.addImage.bind(issueController)
);

/**
 * @route   POST /api/issues/:issueId/attendance
 * @desc    Record staff attendance with GPS (STAFF/ADMIN)
 * @access  Private (STAFF, ADMIN)
 * @param   issueId - Issue ID
 * @body    { latitude, longitude }
 */
router.post('/:issueId/attendance',
    authenticateToken,
    authorize('STAFF', 'ADMIN'),
    issueController.addAttendance.bind(issueController)
);

/**
 * @route   GET /api/issues/stats
 * @desc    Get dashboard statistics (total, resolved, in-progress)
 * @access  Private (requires authentication)
 */
router.get('/stats',
    authenticateToken,
    issueController.getIssueStats.bind(issueController)
);

/**
 * @route   GET /api/issues/recent
 * @desc    Get recent issues for activity feed
 * @access  Private (requires authentication)
 * @query   limit - Number of recent issues (default: 10)
 */
router.get('/recent',
    authenticateToken,
    issueController.getRecentIssues.bind(issueController)
);

/**
 * @route   GET /api/issues/my-issues
 * @desc    Get issues reported by current user
 * @access  Private (CITIZEN)
 */
router.get('/my-issues',
    authenticateToken,
    authorize('CITIZEN'),
    issueController.getMyIssues.bind(issueController)
);

/**
 * @route   GET /api/issues/staff-tasks
 * @desc    Get tasks assigned to staff member's department
 * @access  Private (STAFF, ADMIN)
 * @query   lat - Staff latitude for distance calculation (optional)
 * @query   lon - Staff longitude for distance calculation (optional)
 */
router.get('/staff-tasks',
    authenticateToken,
    authorize('STAFF', 'ADMIN'),
    issueController.getStaffTasks.bind(issueController)
);

/**
 * @route   GET /api/issues/department/:departmentId
 * @desc    Get all issues for a department (STAFF/ADMIN only)
 * @access  Private (STAFF, ADMIN)
 * @param   departmentId - Department ID
 */
router.get('/department/:departmentId',
    authenticateToken,
    authorize('STAFF', 'ADMIN'),
    issueController.getDepartmentIssues.bind(issueController)
);

/**
 * @route   GET /api/issues
 * @desc    Get all issues (ADMIN/STAFF only)
 * @access  Private (STAFF, ADMIN)
 * @query   limit - Results per page (default: 20)
 * @query   offset - Pagination offset (default: 0)
 */
router.get('/',
    authenticateToken,
    authorize('STAFF', 'ADMIN'),
    issueController.getAllIssues.bind(issueController)
);

/**
 * @route   GET /api/issues/:issueId
 * @desc    Get issue details with images
 * @access  Private (requires authentication)
 * @param   issueId - Issue ID
 */
router.get('/:issueId',
    authenticateToken,
    issueController.getIssueDetails.bind(issueController)
);

/**
 * @route   PATCH /api/issues/:issueId/status
 * @desc    Update issue status (STAFF can mark as IN_PROGRESS, RESOLVED)
 * @access  Private (STAFF, ADMIN)
 * @param   issueId - Issue ID
 * @body    { status: 'REPORTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' }
 */
router.patch('/:issueId/status',
    authenticateToken,
    authorize('STAFF', 'ADMIN'),
    issueController.updateIssueStatus.bind(issueController)
);

module.exports = router;
