const departmentRepository = require('../repositories/departmentRepository');

class DepartmentService {
    async listDepartments() {
        const rows = await departmentRepository.getAll();
        return rows.map((row) => ({
            departmentId: row.DepartmentId,
            departmentName: row.DepartmentName,
            latitude: row.Latitude,
            longitude: row.Longitude,
        }));
    }
}

module.exports = new DepartmentService();
