const issueService = require('../services/issueService');

class IssueController {
    async createIssue(req, res) {
        try {
            const { description, issueType, latitude, longitude, address, departmentId } = req.body;
            console.log('[CreateIssue] Request body:', { description, issueType, latitude, longitude, address, departmentId });
            const citizenId = req.user.userId;

            const issue = await issueService.createIssue({
                citizenId,
                departmentId,
                issueType,
                description,
                latitude,
                longitude,
                address,
            });

            res.status(201).json({ success: true, issue });
        } catch (error) {
            const status = error.message.includes('required') || error.message.includes('Invalid') ? 400 : 500;
            res.status(status).json({ success: false, error: error.message });
        }
    }

    async addImage(req, res) {
        try {
            const { issueId } = req.params;
            const { imageType = 'BEFORE' } = req.body;
            if (!req.file) return res.status(400).json({ success: false, error: 'No image file provided' });

            const imagePath = req.file.path || req.file.filename;
            const image = await issueService.addImageToIssue(issueId, imagePath, imageType);

            res.status(201).json({ success: true, image });
        } catch (error) {
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, error: error.message });
        }
    }

    async addAttendance(req, res) {
        try {
            const { issueId } = req.params;
            const staffId = req.user.userId;
            const { latitude, longitude } = req.body;

            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                return res.status(400).json({ success: false, error: 'Latitude and longitude are required' });
            }

            const attendance = await issueService.addIssueAttendance(issueId, staffId, latitude, longitude);
            res.status(201).json({ success: true, attendance });
        } catch (error) {
            const status = error.message.includes('not found') || error.message.includes('Invalid') ? 400 : 500;
            res.status(status).json({ success: false, error: error.message });
        }
    }

    async getIssueDetails(req, res) {
        try {
            const issue = await issueService.getIssueDetails(req.params.issueId);
            res.status(200).json({ success: true, issue });
        } catch (error) {
            const status = error.message.includes('not found') ? 404 : 500;
            res.status(status).json({ success: false, error: error.message });
        }
    }

    async getMyIssues(req, res) {
        try {
            const issues = await issueService.getCitizenIssues(req.user.userId);
            res.status(200).json({ success: true, issues });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getAllIssues(req, res) {
        try {
            const issues = await issueService.getAllIssues();
            res.status(200).json({ success: true, issues });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getDepartmentIssues(req, res) {
        try {
            const issues = await issueService.getDepartmentIssues(parseInt(req.params.departmentId));
            res.status(200).json({ success: true, issues });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async updateIssueStatus(req, res) {
        try {
            const { status } = req.body;
            if (!status) return res.status(400).json({ success: false, error: 'Status is required' });

            const issue = await issueService.updateIssueStatus(req.params.issueId, status);
            res.status(200).json({ success: true, issue });
        } catch (error) {
            const statusCode = error.message.includes('Invalid status') ? 400 : 500;
            res.status(statusCode).json({ success: false, error: error.message });
        }
    }

    async getIssueStats(req, res) {
        try {
            const stats = await issueService.getIssueStats();
            res.status(200).json({ success: true, stats });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getRecentIssues(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const issues = await issueService.getRecentIssues(limit);
            res.status(200).json({ success: true, issues });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getStaffTasks(req, res) {
        try {
            // Determine staff department id: prefer token, else fetch profile
            let staffDepartmentId = req.user?.departmentId || null;

            if (!staffDepartmentId) {
                // Fetch full profile to get department for STAFF users
                const authService = require('../services/authService');
                const profile = await authService.getProfile(req.user.userId);
                staffDepartmentId = profile.departmentId || null;
            }

            if (!staffDepartmentId) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Staff member must be assigned to a department' 
                });
            }

            // Optional: Get staff location from query params for distance calculation
            const staffLat = req.query.lat ? parseFloat(req.query.lat) : null;
            const staffLon = req.query.lon ? parseFloat(req.query.lon) : null;

            const tasks = await issueService.getStaffTasks(staffDepartmentId, staffLat, staffLon);
            res.status(200).json({ success: true, tasks });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new IssueController();
