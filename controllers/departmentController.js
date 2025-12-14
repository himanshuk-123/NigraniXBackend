const departmentService = require('../services/departmentService');

class DepartmentController {
    async getDepartments(req, res, next) {
        try {
            const departments = await departmentService.listDepartments();
            res.json({ success: true, data: departments });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new DepartmentController();
