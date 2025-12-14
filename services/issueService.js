const issueRepository = require('../repositories/issueRepository');
const departmentRepository = require('../repositories/departmentRepository');
const path = require('path');

// Map DB row to API shape
const toIssue = (row) => ({
    issueId: row.IssueId,
    citizenId: row.CitizenId,
    citizenName: row.CitizenName,
    citizenPhone: row.CitizenPhone,
    departmentId: row.DepartmentId,
    departmentName: row.DepartmentName,
    issueType: row.IssueType,
    description: row.Description,
    latitude: row.Latitude,
    longitude: row.Longitude,
    address: row.Address,
    status: row.Status,
    createdAt: row.CreatedAt,
});

class IssueService {
    // --- Keyword-based department allocation helpers ---
  normalizeText(text) {
    return (text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Department keywords (DB DepartmentName must match)
getDepartmentKeywords() {
    return [
        { deptName: 'Sanitation', keywords: ['garbage','trash','waste','dustbin','litter','cleaning','sweep','dump','overflow','sewage','drain','drainage'] },
        { deptName: 'Water', keywords: ['water','leak','pipeline','tap','no water','low pressure','sewer'] },
        { deptName: 'Electricity', keywords: ['electric','streetlight','street light','light','power','outage','transformer','wire','pole'] },
        { deptName: 'PWD', keywords: ['road','pothole','street','footpath','sidewalk','zebra','speed breaker','traffic','signage','pavement','asphalt','highway'] },
    ];
}

async mapKeywordsToDepartmentId(description, issueType) {
    const text = this.normalizeText(`${issueType || ''} ${description || ''}`);
    console.log('[Keyword Match] Input text:', text);

    if (!text) return null;

    const keywordGroups = this.getDepartmentKeywords();
    let bestDept = null;
    let bestScore = 0;

    /* ---------- STEP 1: KEYWORD SCORING ---------- */
    for (const group of keywordGroups) {
        let score = 0;

        for (const rawWord of group.keywords) {
            const word = this.normalizeText(rawWord);

            // 🔥 IMPORTANT FIX:
            // Match whole words, not partial fragile includes
            const regex = new RegExp(`\\b${word.replace(/\s+/g, '\\s+')}\\b`, 'i');

            if (regex.test(text)) {
                score += word.split(' ').length; // multi-word keywords get higher weight
                console.log(`[Keyword Match] "${rawWord}" matched → ${group.deptName}`);
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestDept = group.deptName;
        }
    }

    if (!bestDept) {
        console.log('[Keyword Match] No keyword matched');
        return null;
    }

    console.log(`[Keyword Match] Selected DepartmentName = ${bestDept}`);

    /* ---------- STEP 2: GET ALL MATCHING DEPARTMENTS ---------- */
    const departments = await departmentRepository.getAll();

    const matchedDepartments = departments.filter(
        d => this.normalizeText(d.DepartmentName) === this.normalizeText(bestDept)
    );

    if (!matchedDepartments.length) {
        console.log(`[Keyword Match] No DB department found for ${bestDept}`);
        return null;
    }

    /* ---------- STEP 3: RETURN FIRST (location logic elsewhere) ---------- */
    // Location-based nearest selection should happen OUTSIDE this function
    console.log(
        '[Keyword Match] Matched DepartmentIds:',
        matchedDepartments.map(d => d.DepartmentId)
    );

    return matchedDepartments[0].DepartmentId;
}

    /**
     * Calculate distance between two coordinates using Haversine formula
     * Returns distance in kilometers
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Find the nearest department based on issue location
     * Uses Haversine formula to calculate distance
     */
    async findNearestDepartment(issueLatitude, issueLongitude) {
        const departments = await departmentRepository.getAll();
        
        if (!departments || departments.length === 0) {
            throw new Error('No departments available');
        }

        // Calculate distance to each department
        const departmentsWithDistance = departments.map(dept => ({
            ...dept,
            distance: this.calculateDistance(
                issueLatitude,
                issueLongitude,
                dept.Latitude,
                dept.Longitude
            )
        }));

        // Sort by distance and get the nearest
        departmentsWithDistance.sort((a, b) => a.distance - b.distance);
        return departmentsWithDistance[0]; // Return nearest department
    }

    validate(issue) {
        if (!issue.description?.trim()) throw new Error('Description is required');
        if (issue.description.length > 500) throw new Error('Description max 500 chars');
        if (!Number.isFinite(issue.latitude)) throw new Error('Latitude is required');
        if (!Number.isFinite(issue.longitude)) throw new Error('Longitude is required');
        // Note: departmentId is now optional - will be auto-assigned based on location
    }

    async createIssue(data) {
        this.validate(data);

        // If departmentId is provided, use it; otherwise try keyword mapping, then nearest
        let departmentId = data.departmentId;
        let nearestDept = null;
        let allocationStrategy = null;

        if (!departmentId) {
            // 1) Try keyword-based allocation using description + issueType
            departmentId = await this.mapKeywordsToDepartmentId(data.description, data.issueType);
            allocationStrategy = departmentId ? 'keywords' : null;
        }

        if (!departmentId) {
            // 2) Fallback: auto-assign nearest department by location
            nearestDept = await this.findNearestDepartment(data.latitude, data.longitude);
            departmentId = nearestDept.DepartmentId;
            allocationStrategy = allocationStrategy || 'nearest';
        }

        const row = await issueRepository.createIssue({
            citizenId: data.citizenId,
            departmentId: departmentId,
            issueType: data.issueType || null,
            description: data.description,
            latitude: data.latitude,
            longitude: data.longitude,
            address: data.address || null,
        });

        return { 
            ...toIssue(row), 
            images: [],
            nearestDepartment: nearestDept ? {
                departmentId: nearestDept.DepartmentId,
                departmentName: nearestDept.DepartmentName,
                distance: nearestDept.distance?.toFixed(2) + ' km'
            } : null,
            allocationStrategy
        };
    }

    async addImageToIssue(issueId, imagePath, imageType = 'BEFORE') {
        const imageUrl = `/uploads/issues/${issueId}/${path.basename(imagePath)}`;
        const row = await issueRepository.addIssueImage(issueId, imageUrl, imageType);
        return {
            imageId: row.ImageId,
            issueId: row.IssueId,
            imageUrl: row.ImageUrl,
            imageType: row.ImageType,
            uploadedAt: row.UploadedAt,
        };
    }

    /**
     * Record staff attendance with location verification for an issue
     * @param {string} issueId - Issue ID (GUID)
     * @param {number} staffId - Staff user ID
     * @param {number} staffLat - Staff latitude
     * @param {number} staffLon - Staff longitude
     * @returns {Promise<Object>} Attendance record with computed distance
     */
    async addIssueAttendance(issueId, staffId, staffLat, staffLon) {
        if (!issueId || !staffId || !Number.isFinite(staffLat) || !Number.isFinite(staffLon)) {
            throw new Error('Invalid attendance payload');
        }

        // Fetch issue to compute distance
        const issue = await issueRepository.getIssueById(issueId);
        if (!issue) throw new Error('Issue not found');

        const distanceKm = this.calculateDistance(staffLat, staffLon, issue.Latitude, issue.Longitude);
        const attendance = await issueRepository.addIssueAttendance({
            issueId,
            staffId,
            staffLat,
            staffLon,
            distance: distanceKm * 1000 // store meters
        });

        return {
            attendanceId: attendance.AttendanceId,
            issueId: attendance.IssueId,
            staffId: attendance.StaffId,
            staffLatitude: attendance.StaffLatitude,
            staffLongitude: attendance.StaffLongitude,
            distanceMeters: attendance.DistanceFromIssue,
            attendanceTime: attendance.AttendanceTime,
        };
    }

    async getIssueDetails(issueId) {
        const row = await issueRepository.getIssueById(issueId);
        if (!row) throw new Error('Issue not found');

        return {
            ...toIssue(row),
            images: (row.images || []).map((img) => ({
                imageId: img.ImageId,
                imageUrl: img.ImageUrl,
                imageType: img.ImageType,
                uploadedAt: img.UploadedAt,
            })),
        };
    }

    async getCitizenIssues(citizenId) {
        const rows = await issueRepository.getIssuesByCitizen(citizenId);
        return rows.map((row) => ({
            issueId: row.IssueId,
            issueType: row.IssueType,
            description: row.Description,
            status: row.Status,
            departmentName: row.DepartmentName,
            imageCount: row.ImageCount,
            createdAt: row.CreatedAt,
            address: row.Address,
        }));
    }

    async getAllIssues(limit = 20, offset = 0) {
        const rows = await issueRepository.getAllIssues(limit, offset);
        return rows.map((row) => ({
            issueId: row.IssueId,
            citizenName: row.CitizenName,
            issueType: row.IssueType,
            description: row.Description,
            status: row.Status,
            departmentName: row.DepartmentName,
            imageCount: row.ImageCount,
            latitude: row.Latitude,
            longitude: row.Longitude,
            createdAt: row.CreatedAt,
        }));
    }

    async getDepartmentIssues(departmentId) {
        const rows = await issueRepository.getIssuesByDepartment(departmentId);
        return rows.map((row) => ({
            issueId: row.IssueId,
            citizenName: row.CitizenName,
            issueType: row.IssueType,
            description: row.Description,
            status: row.Status,
            departmentName: row.DepartmentName,
            imageCount: row.ImageCount,
            latitude: row.Latitude,
            longitude: row.Longitude,
            createdAt: row.CreatedAt,
        }));
    }

    async updateIssueStatus(issueId, status) {
        const allowed = ['REPORTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];
        if (!allowed.includes(status)) throw new Error('Invalid status');

        const row = await issueRepository.updateIssueStatus(issueId, status);
        return {
            issueId: row.IssueId,
            status: row.Status,
            updatedAt: row.CreatedAt,
        };
    }

    async getIssueStats() {
        const row = await issueRepository.getIssueStats();
        return {
            totalIssues: row.TotalIssues || 0,
            resolvedIssues: row.ResolvedIssues || 0,
            inProgressIssues: row.InProgressIssues || 0,
        };
    }

    async getRecentIssues(limit = 10) {
        const rows = await issueRepository.getRecentIssues(limit);
        return rows.map((row) => ({
            issueId: row.IssueId,
            issueType: row.IssueType,
            address: row.Address,
            status: row.Status,
            createdAt: row.CreatedAt,
            departmentName: row.DepartmentName,
        }));
    }

    async getStaffTasks(staffDepartmentId, staffLat = null, staffLon = null) {
        const rows = await issueRepository.getStaffTasks(staffDepartmentId, staffLat, staffLon);
        return rows.map((row) => ({
            id: row.IssueId,
            title: row.IssueType || 'Issue',
            type: row.IssueType?.toLowerCase() || 'issue',
            description: row.Description,
            address: row.Address,
            status: row.Status?.toLowerCase() === 'reported' ? 'validation' 
                   : row.Status?.toLowerCase() === 'assigned' ? 'assigned'
                   : row.Status?.toLowerCase() === 'in_progress' ? 'in-progress'
                   : row.Status?.toLowerCase() === 'resolved' ? 'completed'
                   : 'validation',
            departmentName: row.DepartmentName,
            citizenName: row.CitizenName,
            citizenPhone: row.CitizenPhone,
            latitude: row.Latitude,
            longitude: row.Longitude,
            distance: row.Distance ? `${row.Distance.toFixed(1)} km` : 'N/A',
            imageCount: row.ImageCount || 0,
            createdAt: row.CreatedAt,
        }));
    }
}

module.exports = new IssueService();
